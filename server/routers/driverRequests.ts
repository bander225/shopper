/**
 * driverRequests router
 * Handles the flow of broadcasting a new order to available drivers
 * in the same city+street, and letting drivers accept/reject.
 */
import { z } from "zod";
import { publicProcedure, phoneProtectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  driverOrderRequests,
  driverBatches,
  phoneUsers,
  orders,
  streets,
  restaurants,
} from "../../drizzle/schema";
import { eq, and, inArray, gt, isNull, desc } from "drizzle-orm";
import { getPhoneUserFromRequest } from "./phoneAuth";
import { TRPCError } from "@trpc/server";
import { isAutoAssignEnabled } from "./settings";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Find all online drivers in the given city+street */
async function findAvailableDrivers(cityId: number, streetId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(phoneUsers)
    .where(
      and(
        eq(phoneUsers.role, "driver"),
        eq(phoneUsers.isOnline, true),
        eq(phoneUsers.isActive, true),
        eq(phoneUsers.cityId, cityId),
        eq(phoneUsers.streetId, streetId)
      )
    );
}

/**
 * Auto-assign order to the single best available driver in same city+street.
 * "Best" = online, active, fewest currentOrders, most recently active.
 * Returns the driverUserId if assigned, null otherwise.
 */
export async function autoAssignOrderToDriver(
  orderId: number,
  cityId: number,
  streetId: number
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const { drivers } = await import("../../drizzle/schema");

  // Find all online drivers in same city+street
  const available = await findAvailableDrivers(cityId, streetId);
  if (available.length === 0) return null;

  // Pick the one with fewest current orders (join with drivers table for currentOrders)
  let bestDriver = available[0];
  let bestOrders = Infinity;
  for (const d of available) {
    const [driverRecord] = await db
      .select({ currentOrders: drivers.currentOrders, maxOrders: drivers.maxOrders })
      .from(drivers)
      .where(eq(drivers.userId, d.id))
      .limit(1);
    const current = driverRecord?.currentOrders ?? 0;
    const max = driverRecord?.maxOrders ?? 1;
    // Skip if driver is at capacity
    if (current >= max) continue;
    if (current < bestOrders) {
      bestOrders = current;
      bestDriver = d;
    }
  }
  if (bestOrders === Infinity) return null; // all at capacity

  // Assign order directly to this driver
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 120 * 1000);
  await db.insert(driverOrderRequests).values({
    orderId,
    driverUserId: bestDriver.id,
    status: "pending",
    expiresAt,
  });
  console.log(`[AutoAssign] Order ${orderId} → driver ${bestDriver.id} (${bestDriver.name})`);
  return bestDriver.id;
}

/**
 * Haversine distance formula (returns km)
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Assign order to the nearest available driver (by GPS coordinates).
 * Falls back to fewest-orders if no GPS data available.
 */
export async function assignNearestDriver(
  orderId: number,
  cityId: number,
  streetId: number,
  deliveryLat: number | null,
  deliveryLng: number | null
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const { drivers } = await import("../../drizzle/schema");

  const available = await findAvailableDrivers(cityId, streetId);
  if (available.length === 0) return null;

  let bestDriver = null as (typeof available)[0] | null;
  let bestScore = Infinity;

  for (const d of available) {
    const [driverRecord] = await db
      .select({ currentOrders: drivers.currentOrders, maxOrders: drivers.maxOrders, lat: drivers.currentLat, lng: drivers.currentLng })
      .from(drivers)
      .where(eq(drivers.userId, d.id))
      .limit(1);
    if (!driverRecord) continue;
    const current = driverRecord.currentOrders ?? 0;
    const max = driverRecord.maxOrders ?? 1;
    if (current >= max) continue;

    let score: number;
    if (deliveryLat && deliveryLng && driverRecord.lat && driverRecord.lng) {
      score = haversineKm(
        parseFloat(driverRecord.lat),
        parseFloat(driverRecord.lng),
        deliveryLat,
        deliveryLng
      );
    } else {
      // Fallback: use currentOrders as score
      score = current;
    }

    if (score < bestScore) {
      bestScore = score;
      bestDriver = d;
    }
  }

  if (!bestDriver) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 120 * 1000);
  await db.insert(driverOrderRequests).values({
    orderId,
    driverUserId: bestDriver.id,
    status: "pending",
    expiresAt,
  });
  console.log(`[NearestAssign] Order ${orderId} → driver ${bestDriver.id} (${bestDriver.name}) score=${bestScore.toFixed(2)}km`);
  return bestDriver.id;
}

/**
 * Broadcast a new order to available drivers in same city+street.
 * Uses batch logic: if a driver has an open "collecting" batch, add the order to it.
 * When the batch reaches maxOrders, dispatch it (send all orders as one request).
 * If no open batch exists, create one and add this order.
 */
export async function broadcastOrderToDrivers(
  orderId: number,
  cityId: number,
  streetId: number
) {
  const db = await getDb();
  if (!db) return 0;

  const availableDrivers = await findAvailableDrivers(cityId, streetId);
  if (availableDrivers.length === 0) return 0;

  let assignedCount = 0;

  for (const driver of availableDrivers) {
    // Check if driver has an open collecting batch in same city+street
    const [openBatch] = await db
      .select()
      .from(driverBatches)
      .where(
        and(
          eq(driverBatches.driverUserId, driver.id),
          eq(driverBatches.status, "collecting"),
          eq(driverBatches.cityId, cityId),
          eq(driverBatches.streetId, streetId)
        )
      )
      .limit(1);

    if (openBatch) {
      // Add this order to the existing batch
      const newCount = openBatch.currentCount + 1;
      await db
        .update(driverBatches)
        .set({
          currentCount: newCount,
          status: newCount >= openBatch.maxOrders ? "full" : "collecting",
          updatedAt: new Date(),
        })
        .where(eq(driverBatches.id, openBatch.id));

      // Link order to this batch
      await db
        .update(orders)
        .set({ batchId: openBatch.id })
        .where(eq(orders.id, orderId));

      // If batch is now full, dispatch: send all batch orders to driver
      if (newCount >= openBatch.maxOrders) {
        await dispatchBatch(openBatch.id, driver.id);
      }
    } else {
      // Get driver's maxOrders preference
      const { drivers } = await import("../../drizzle/schema");
      const [driverRecord] = await db
        .select({ maxOrders: drivers.maxOrders })
        .from(drivers)
        .where(eq(drivers.userId, driver.id))
        .limit(1);
      const maxOrders = driverRecord?.maxOrders ?? 1;

      // Create a new batch for this driver
      const insertResult = await db.insert(driverBatches).values({
        driverUserId: driver.id,
        maxOrders,
        currentCount: 1,
        status: maxOrders <= 1 ? "full" : "collecting",
        cityId,
        streetId,
      });
      const batchId = (insertResult as any).insertId as number;

      // Link order to batch
      await db
        .update(orders)
        .set({ batchId })
        .where(eq(orders.id, orderId));

      // If maxOrders is 1, dispatch immediately
      if (maxOrders <= 1) {
        await dispatchBatch(batchId, driver.id);
      }
    }
    assignedCount++;
  }

  return assignedCount;
}

/**
 * Dispatch a full batch: send a single pending request to the driver
 * containing all orders in the batch.
 */
async function dispatchBatch(batchId: number, driverUserId: number) {
  const db = await getDb();
  if (!db) return;

  // Get all orders in this batch
  const batchOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.batchId, batchId));

  if (batchOrders.length === 0) return;

  const expiresAt = new Date(Date.now() + 120 * 1000); // 2 minutes to respond

  // Create one request per order in the batch
  await db.insert(driverOrderRequests).values(
    batchOrders.map((o) => ({
      orderId: o.id,
      driverUserId,
      status: "pending" as const,
      expiresAt,
    }))
  );

  // Mark batch as dispatched
  await db
    .update(driverBatches)
    .set({ status: "dispatched", dispatchedAt: new Date(), updatedAt: new Date() })
    .where(eq(driverBatches.id, batchId));
}

// ─── router ─────────────────────────────────────────────────────────────────

export const driverRequestsRouter = router({
  /**
   * Driver: get my pending order requests (poll every few seconds)
   * Returns requests that are still pending and not expired
   */
  myPendingRequests: phoneProtectedProcedure.query(async ({ ctx }) => {
    const phoneUser = ctx.phoneUser;
    if (!phoneUser || phoneUser.role !== "driver") return [];

    const db = await getDb();
    if (!db) return [];

    const now = new Date();

    // Get pending, non-expired requests for this driver
    const requests = await db
      .select()
      .from(driverOrderRequests)
      .where(
        and(
          eq(driverOrderRequests.driverUserId, phoneUser.id),
          eq(driverOrderRequests.status, "pending"),
          gt(driverOrderRequests.expiresAt, now)
        )
      );

    if (requests.length === 0) return [];

    // Fetch order details for each request with customer info
    const orderIds = requests.map((r) => r.orderId);
    const orderList = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        subtotal: orders.subtotal,
        deliveryFee: orders.deliveryFee,
        total: orders.total,
        paymentMethod: orders.paymentMethod,
        deliveryAddressText: orders.deliveryAddressText,
        deliveryLat: orders.deliveryLat,
        deliveryLng: orders.deliveryLng,
        customerNotes: orders.customerNotes,
        createdAt: orders.createdAt,
        customerName: phoneUsers.name,
        customerPhone: phoneUsers.phone,
        googlePlaceName: orders.googlePlaceName,
        googlePlaceId: orders.googlePlaceId,
        restaurantLat: restaurants.lat,
        restaurantLng: restaurants.lng,
        restaurantName: restaurants.name,
      })
      .from(orders)
      .leftJoin(phoneUsers, eq(orders.userId, phoneUsers.id))
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(inArray(orders.id, orderIds));

    return requests.map((req) => ({
      requestId: req.id,
      orderId: req.orderId,
      expiresAt: req.expiresAt,
      sentAt: req.sentAt,
      order: orderList.find((o) => o.id === req.orderId) ?? null,
    }));
  }),

  /**
   * Driver: accept an order request
   * - Marks this request as accepted
   * - Cancels all other pending requests for the same order
   * - Assigns the driver to the order
   */
  acceptRequest: phoneProtectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        deliveryFee: z.string().default("0"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const phoneUser = ctx.phoneUser;
      if (!phoneUser || phoneUser.role !== "driver") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول كمندوب" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify request belongs to this driver and is still pending
      const [request] = await db
        .select()
        .from(driverOrderRequests)
        .where(
          and(
            eq(driverOrderRequests.id, input.requestId),
            eq(driverOrderRequests.driverUserId, phoneUser.id),
            eq(driverOrderRequests.status, "pending")
          )
        )
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود أو انتهت مهلته" });
      }

      // Check if order is still available (not already taken)
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, request.orderId))
        .limit(1);

      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      if (order.status !== "pending") {
        // Order already taken by another driver
        await db
          .update(driverOrderRequests)
          .set({ status: "cancelled", respondedAt: new Date() })
          .where(eq(driverOrderRequests.id, input.requestId));
        throw new TRPCError({ code: "BAD_REQUEST", message: "تم قبول هذا الطلب من قبل مندوب آخر" });
      }

      const now = new Date();
      const newTotal = (
        parseFloat(order.subtotal) + parseFloat(input.deliveryFee)
      ).toFixed(2);

      // 1. Mark this request as accepted
      await db
        .update(driverOrderRequests)
        .set({ status: "accepted", respondedAt: now })
        .where(eq(driverOrderRequests.id, input.requestId));

      // 2. Cancel all other pending requests for this order
      await db
        .update(driverOrderRequests)
        .set({ status: "cancelled", respondedAt: now })
        .where(
          and(
            eq(driverOrderRequests.orderId, request.orderId),
            eq(driverOrderRequests.status, "pending")
          )
        );

      // 3. Assign driver to order
      await db
        .update(orders)
        .set({
          status: "driver_assigned",
          driverId: phoneUser.id, // using phoneUser.id as driverId reference
          deliveryFee: input.deliveryFee,
          total: newTotal,
          driverAssignedAt: now,
          acceptedAt: now,
        })
        .where(eq(orders.id, request.orderId));

      return { success: true, orderId: request.orderId };
    }),

  /**
   * Driver: reject an order request
   */
  rejectRequest: phoneProtectedProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const phoneUser = ctx.phoneUser;
      if (!phoneUser || phoneUser.role !== "driver") {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(driverOrderRequests)
        .set({ status: "rejected", respondedAt: new Date() })
        .where(
          and(
            eq(driverOrderRequests.id, input.requestId),
            eq(driverOrderRequests.driverUserId, phoneUser.id)
          )
        );

      return { success: true };
    }),

  /**
   * Driver: update city+street only (without changing online status)
   */
  updateLocation: phoneProtectedProcedure
    .input(
      z.object({
        cityId: z.number(),
        streetId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const phoneUser = ctx.phoneUser;
      if (!phoneUser || phoneUser.role !== "driver") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول كمندوب" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get street name for response
      const [street] = await db
        .select()
        .from(streets)
        .where(eq(streets.id, input.streetId))
        .limit(1);

      await db
        .update(phoneUsers)
        .set({
          cityId: input.cityId,
          streetId: input.streetId,
          updatedAt: new Date(),
        })
        .where(eq(phoneUsers.id, phoneUser.id));

      return { success: true, streetName: street?.name ?? null };
    }),

  /**
   * Driver: set online status + city + street
   * Call this when driver goes online/offline
   */
  setOnlineStatus: phoneProtectedProcedure
    .input(
      z.object({
        isOnline: z.boolean(),
        cityId: z.number().optional(),
        streetId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const phoneUser = ctx.phoneUser;
      if (!phoneUser || phoneUser.role !== "driver") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول كمندوب" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(phoneUsers)
        .set({
          isOnline: input.isOnline,
          ...(input.cityId !== undefined && { cityId: input.cityId }),
          ...(input.streetId !== undefined && { streetId: input.streetId }),
          lastOnlineAt: input.isOnline ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(phoneUsers.id, phoneUser.id));

      return { success: true };
    }),

  /**
   * Driver: get my current online status + location
   */
  myStatus: phoneProtectedProcedure.query(async ({ ctx }) => {
    const phoneUser = ctx.phoneUser;
    if (!phoneUser || phoneUser.role !== "driver") return null;

    const db = await getDb();
    if (!db) return null;

    const [user] = await db
      .select()
      .from(phoneUsers)
      .where(eq(phoneUsers.id, phoneUser.id))
      .limit(1);

    if (!user) return null;

    // Get street name if available
    let streetName: string | null = null;
    if (user.streetId) {
      const [street] = await db
        .select()
        .from(streets)
        .where(eq(streets.id, user.streetId))
        .limit(1);
      streetName = street?.name ?? null;
    }

    return {
      isOnline: user.isOnline,
      cityId: user.cityId,
      streetId: user.streetId,
      streetName,
      lastOnlineAt: user.lastOnlineAt,
    };
  }),

  /**
   * Admin: get available drivers count per city+street
   */
  adminOnlineDrivers: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select({
        id: phoneUsers.id,
        name: phoneUsers.name,
        phone: phoneUsers.phone,
        cityId: phoneUsers.cityId,
        streetId: phoneUsers.streetId,
        isOnline: phoneUsers.isOnline,
        lastOnlineAt: phoneUsers.lastOnlineAt,
      })
      .from(phoneUsers)
      .where(
        and(
          eq(phoneUsers.role, "driver"),
          eq(phoneUsers.isOnline, true),
          eq(phoneUsers.isActive, true)
        )
      );
  }),
});
