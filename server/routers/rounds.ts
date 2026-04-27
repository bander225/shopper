/**
 * Delivery Rounds Router
 * Manages collective delivery rounds: driver creates a round, collects orders,
 * then departs when minOrders is reached or waitMinutes expires.
 */
import { z } from "zod";
import { router, phoneProtectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { deliveryRounds, orders } from "../../drizzle/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const roundsRouter = router({
  // ---- Driver: create a new round ----
  create: phoneProtectedProcedure
    .input(z.object({
      maxOrders: z.number().min(1).max(50),
      minOrders: z.number().min(1).max(50).optional(),
      waitMinutes: z.number().min(5).max(480).optional(), // 5 min to 8 hours
      cityId: z.number(),
      streetId: z.number(),
      scheduledDepartAt: z.string().optional(), // ISO string
    }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      const phoneUserId = ctx.phoneUser.id;
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Cancel any existing collecting round for this driver
      await d.update(deliveryRounds)
        .set({ status: "cancelled" } as any)
        .where(and(
          eq(deliveryRounds.driverUserId, phoneUserId),
          eq(deliveryRounds.status, "collecting")
        ));

      const scheduledAt = input.scheduledDepartAt ? new Date(input.scheduledDepartAt) : null;

      const [result] = await d.insert(deliveryRounds).values({
        driverUserId: phoneUserId,
        cityId: input.cityId,
        streetId: input.streetId,
        maxOrders: input.maxOrders,
        minOrders: input.minOrders ?? 1,
        waitMinutes: input.waitMinutes ?? 60,
        currentCount: 0,
        status: "collecting",
        scheduledDepartAt: scheduledAt ?? undefined,
      } as any);

      return { roundId: (result as any).insertId };
    }),

  // ---- Driver: get their active (collecting or departed) round ----
  myActiveRound: phoneProtectedProcedure
    .query(async ({ ctx }) => {
      const d = await getDb();
      const phoneUserId = ctx.phoneUser.id;
      if (!d) return null;

      const [round] = await d.select().from(deliveryRounds)
        .where(and(
          eq(deliveryRounds.driverUserId, phoneUserId),
          inArray(deliveryRounds.status, ["collecting", "departed"])
        ))
        .orderBy(sql`${deliveryRounds.createdAt} DESC`)
        .limit(1);

      if (!round) return null;

      // Fetch orders in this round
      const roundOrders = await d.select().from(orders)
        .where(eq(orders.roundId, round.id));

      return { ...round, orders: roundOrders };
    }),

  // ---- Driver: depart (start delivery trip) ----
  depart: phoneProtectedProcedure
    .input(z.object({ roundId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      const phoneUserId = ctx.phoneUser.id;
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [round] = await d.select().from(deliveryRounds)
        .where(and(eq(deliveryRounds.id, input.roundId), eq(deliveryRounds.driverUserId, phoneUserId)));

      if (!round) throw new TRPCError({ code: "NOT_FOUND" });
      if (round.status !== "collecting") throw new TRPCError({ code: "BAD_REQUEST", message: "الدورة ليست في مرحلة الجمع" });

      await d.update(deliveryRounds)
        .set({ status: "departed", departedAt: new Date() } as any)
        .where(eq(deliveryRounds.id, input.roundId));

      // Update all orders in this round to on_the_way
      await d.update(orders)
        .set({ status: "on_the_way", onTheWayAt: new Date() })
        .where(and(eq(orders.roundId, input.roundId), inArray(orders.status, ["pending", "confirmed", "preparing", "ready", "driver_assigned"])));

      return { success: true };
    }),

  // ---- Driver: return (back from delivery) ----
  returnFromDelivery: phoneProtectedProcedure
    .input(z.object({ roundId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      const phoneUserId = ctx.phoneUser.id;
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await d.update(deliveryRounds)
        .set({ status: "returned", returnedAt: new Date() } as any)
        .where(and(eq(deliveryRounds.id, input.roundId), eq(deliveryRounds.driverUserId, phoneUserId)));

      return { success: true };
    }),

  // ---- Driver: complete the round ----
  complete: phoneProtectedProcedure
    .input(z.object({ roundId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      const phoneUserId = ctx.phoneUser.id;
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await d.update(deliveryRounds)
        .set({ status: "completed", completedAt: new Date() } as any)
        .where(and(eq(deliveryRounds.id, input.roundId), eq(deliveryRounds.driverUserId, phoneUserId)));

      return { success: true };
    }),

  // ---- Driver: cancel the round ----
  cancel: phoneProtectedProcedure
    .input(z.object({ roundId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      const phoneUserId = ctx.phoneUser.id;
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await d.update(deliveryRounds)
        .set({ status: "cancelled" } as any)
        .where(and(eq(deliveryRounds.id, input.roundId), eq(deliveryRounds.driverUserId, phoneUserId)));

      return { success: true };
    }),

  // ---- Driver: update round settings ----
  update: phoneProtectedProcedure
    .input(z.object({
      roundId: z.number(),
      maxOrders: z.number().min(1).max(50).optional(),
      minOrders: z.number().min(1).max(50).optional(),
      waitMinutes: z.number().min(5).max(480).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const d = await getDb();
      const phoneUserId = ctx.phoneUser.id;
      if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updates: any = {};
      if (input.maxOrders !== undefined) updates.maxOrders = input.maxOrders;
      if (input.minOrders !== undefined) updates.minOrders = input.minOrders;
      if (input.waitMinutes !== undefined) updates.waitMinutes = input.waitMinutes;

      await d.update(deliveryRounds)
        .set(updates)
        .where(and(eq(deliveryRounds.id, input.roundId), eq(deliveryRounds.driverUserId, phoneUserId)));

      return { success: true };
    }),

  // ---- Driver: history of past rounds ----
  myHistory: phoneProtectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const d = await getDb();
      const phoneUserId = ctx.phoneUser.id;
      if (!d) return [];

      const roundsList = await d.select().from(deliveryRounds)
        .where(eq(deliveryRounds.driverUserId, phoneUserId))
        .orderBy(sql`${deliveryRounds.createdAt} DESC`)
        .limit(input.limit);

      return roundsList;
    }),

  // ---- Public: get active round for a city+street (for customer display) ----
  getActiveForStreet: publicProcedure
    .input(z.object({ cityId: z.number(), streetId: z.number() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;

      const [round] = await d.select({
        id: deliveryRounds.id,
        maxOrders: deliveryRounds.maxOrders,
        minOrders: (deliveryRounds as any).minOrders,
        waitMinutes: (deliveryRounds as any).waitMinutes,
        currentCount: deliveryRounds.currentCount,
        status: deliveryRounds.status,
        scheduledDepartAt: deliveryRounds.scheduledDepartAt,
        createdAt: deliveryRounds.createdAt,
      }).from(deliveryRounds)
        .where(and(
          eq(deliveryRounds.cityId, input.cityId),
          eq(deliveryRounds.streetId, input.streetId),
          eq(deliveryRounds.status, "collecting")
        ))
        .orderBy(sql`${deliveryRounds.createdAt} DESC`)
        .limit(1);

      return round ?? null;
    }),

  // ---- Customer: get round info for a specific order ----
  getForOrder: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const d = await getDb();
      if (!d) return null;

      const [order] = await d.select({ roundId: orders.roundId }).from(orders).where(eq(orders.id, input.orderId));
      if (!order?.roundId) return null;

      const [round] = await d.select().from(deliveryRounds).where(eq(deliveryRounds.id, order.roundId));
      return round ?? null;
    }),
});
