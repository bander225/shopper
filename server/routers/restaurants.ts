import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllRestaurants,
  getActiveRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  toggleRestaurantOrders,
  getCategoriesByRestaurant,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItemsByRestaurant,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  setMenuItemStock,
  getRestaurantHours,
  upsertRestaurantHours,
  isRestaurantOpenNow,
  getDb,
} from "../db";
import { restaurants as restaurantsTable, storePresence, orders } from "../../drizzle/schema";
import { and as andFn, eq as eqFn, eq, and, gt, gte, count, countDistinct, sql } from "drizzle-orm";

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export const restaurantsRouter = router({
  // Public: get active restaurants for customers (optionally filtered by city/street)
  listActive: publicProcedure
    .input(z.object({
      cityId: z.number().optional(),
      streetId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: ReturnType<typeof eqFn>[] = [
        eqFn(restaurantsTable.isOpen, true),
        eqFn(restaurantsTable.isAcceptingOrders, true),
      ];
      if (input?.cityId) conditions.push(eqFn(restaurantsTable.cityId as any, input.cityId));
      if (input?.streetId) conditions.push(eqFn(restaurantsTable.streetId as any, input.streetId));
      const list = await db.select().from(restaurantsTable).where(andFn(...conditions));
      // Attach hours and open status
      const withHours = await Promise.all(list.map(async (r) => {
        const hours = await getRestaurantHours(r.id);
        const openNow = isRestaurantOpenNow(hours);
        return { ...r, hours, openNow };
      }));
      return withHours;
    }),

  // Public: get restaurant details with menu
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const restaurant = await getRestaurantById(input.id);
    if (!restaurant) throw new TRPCError({ code: "NOT_FOUND", message: "المطعم غير موجود" });
    const categories = await getCategoriesByRestaurant(input.id);
    const items = await getMenuItemsByRestaurant(input.id);
    const hours = await getRestaurantHours(input.id);
    const openNow = isRestaurantOpenNow(hours);
    return { ...restaurant, categories, items, hours, openNow };
  }),

  // Public: get restaurants filtered by city and/or street
  listByStreet: publicProcedure
    .input(z.object({ cityId: z.number().optional(), streetId: z.number().optional() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      const conditions: ReturnType<typeof eqFn>[] = [
        eqFn(restaurantsTable.isOpen, true),
        eqFn(restaurantsTable.isAcceptingOrders, true),
      ];
      if (input.cityId) conditions.push(eqFn(restaurantsTable.cityId as any, input.cityId));
      if (input.streetId) conditions.push(eqFn(restaurantsTable.streetId as any, input.streetId));
      const list = await database.select().from(restaurantsTable).where(andFn(...conditions));
      const withHours = await Promise.all(list.map(async (r: typeof list[number]) => {
        const hours = await getRestaurantHours(r.id);
        const openNow = isRestaurantOpenNow(hours);
        return { ...r, hours, openNow };
      }));
      return withHours;
    }),

  // Admin: get all restaurants
  listAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const list = await getAllRestaurants();
    const withHours = await Promise.all(list.map(async (r) => {
      const hours = await getRestaurantHours(r.id);
      const openNow = isRestaurantOpenNow(hours);
      return { ...r, hours, openNow };
    }));
    return withHours;
  }),

  // Admin: create restaurant
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      coverImageUrl: z.string().optional(),
      logoUrl: z.string().optional(),
      menuImageUrl: z.string().optional(),
      phone: z.string().optional(),
      addressText: z.string().optional(),
      lat: z.string().optional(),
      lng: z.string().optional(),
      googleMapsUrl: z.string().optional(),
      cuisine: z.string().optional(),
      openingHours: z.string().optional(),
      minOrderAmount: z.string().optional(),
      estimatedDeliveryTime: z.number().optional(),
      cityId: z.number().optional(),
      streetId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await createRestaurant(input);
      return { success: true };
    }),

  // Admin: update restaurant
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      coverImageUrl: z.string().optional(),
      logoUrl: z.string().optional(),
      menuImageUrl: z.string().optional(),
      phone: z.string().optional(),
      addressText: z.string().optional(),
      lat: z.string().optional(),
      lng: z.string().optional(),
      googleMapsUrl: z.string().optional(),
      cuisine: z.string().optional(),
      openingHours: z.string().optional(),
      isOpen: z.boolean().optional(),
      isAcceptingOrders: z.boolean().optional(),
      minOrderAmount: z.string().optional(),
      estimatedDeliveryTime: z.number().optional(),
      cityId: z.number().optional(),
      streetId: z.number().optional(),
      discountEnabled: z.boolean().optional(),
      discountPercent: z.number().min(0).max(100).optional(),
      discountLabel: z.string().optional(),
      discountExpiresAt: z.date().nullable().optional(),
      driverAssignMode: z.enum(["manual", "street", "nearest"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateRestaurant(id, data as any);
      return { success: true };
    }),

  // Admin: set/toggle discount on a restaurant
  setDiscount: protectedProcedure
    .input(z.object({
      id: z.number(),
      discountEnabled: z.boolean(),
      discountPercent: z.number().min(0).max(100).optional(),
      discountLabel: z.string().optional(),
      discountExpiresAt: z.date().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateRestaurant(id, {
        discountEnabled: data.discountEnabled,
        discountPercent: data.discountPercent ?? 0,
        discountLabel: data.discountLabel ?? null,
        discountExpiresAt: data.discountExpiresAt ?? null,
      } as any);
      return { success: true };
    }),

  // Admin: set bags (hot/cold)
  setBags: protectedProcedure
    .input(z.object({
      id: z.number(),
      hasHotBag: z.boolean(),
      hasColdBag: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, hasHotBag, hasColdBag } = input;
      await updateRestaurant(id, { hasHotBag, hasColdBag } as any);
      return { success: true };
    }),

  // Admin: delete restaurant
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteRestaurant(input.id);
      return { success: true };
    }),

  // Admin/Restaurant: toggle order acceptance
  toggleOrders: protectedProcedure
    .input(z.object({ id: z.number(), isAcceptingOrders: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await toggleRestaurantOrders(input.id, input.isAcceptingOrders);
      return { success: true };
    }),

  // ===== HOURS =====
  getHours: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input }) => {
      const hours = await getRestaurantHours(input.restaurantId);
      // Fill missing days with defaults
      const fullWeek = Array.from({ length: 7 }, (_, i) => {
        const existing = hours.find(h => h.dayOfWeek === i);
        return existing ?? {
          id: 0,
          restaurantId: input.restaurantId,
          dayOfWeek: i,
          isClosed: false,
          openTime: "09:00",
          closeTime: "23:00",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
      return fullWeek.map(h => ({ ...h, dayName: DAY_NAMES[h.dayOfWeek] }));
    }),

  setHours: protectedProcedure
    .input(z.object({
      restaurantId: z.number(),
      hours: z.array(z.object({
        dayOfWeek: z.number().min(0).max(6),
        isClosed: z.boolean(),
        openTime: z.string().optional(),
        closeTime: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await upsertRestaurantHours(input.restaurantId, input.hours);
      return { success: true };
    }),

  // ===== CATEGORIES =====
  getCategories: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(({ input }) => getCategoriesByRestaurant(input.restaurantId)),

  createCategory: protectedProcedure
    .input(z.object({
      restaurantId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await createCategory(input);
      return { success: true };
    }),

  updateCategory: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateCategory(id, data);
      return { success: true };
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteCategory(input.id);
      return { success: true };
    }),

  // ===== MENU ITEMS =====
  getMenuItems: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(({ input }) => getMenuItemsByRestaurant(input.restaurantId)),

  createMenuItem: protectedProcedure
    .input(z.object({
      restaurantId: z.number(),
      categoryId: z.number().optional(),
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.string(),
      discountPrice: z.string().optional(),
      imageUrl: z.string().optional(),
      isAvailable: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const created = await createMenuItem(input);
      return { success: true, id: created?.id };
    }),

  updateMenuItem: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.string().optional(),
      discountPrice: z.string().nullable().optional(),
      imageUrl: z.string().optional(),
      isAvailable: z.boolean().optional(),
      categoryId: z.number().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateMenuItem(id, data);
      return { success: true };
    }),

  deleteMenuItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteMenuItem(input.id);
      return { success: true };
    }),

  setMenuItemStock: protectedProcedure
    .input(z.object({
      id: z.number(),
      stockEnabled: z.boolean(),
      stockCount: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      console.log('[setMenuItemStock] called with:', JSON.stringify(input));
      await setMenuItemStock(input.id, input.stockEnabled, input.stockCount);
      console.log('[setMenuItemStock] done for id:', input.id);
      return { success: true };
    }),

  /**
   * Public: heartbeat — called every 30s while customer is browsing a restaurant page
   * Upserts a presence record keyed by sessionId+restaurantId
   */
  heartbeat: publicProcedure
    .input(z.object({ restaurantId: z.number(), sessionId: z.string().max(64) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false };
      const existing = await db
        .select({ id: storePresence.id })
        .from(storePresence)
        .where(
          and(
            eq(storePresence.restaurantId, input.restaurantId),
            eq(storePresence.sessionId, input.sessionId)
          )
        )
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(storePresence)
          .set({ lastSeenAt: new Date() })
          .where(eq(storePresence.id, existing[0].id));
      } else {
        await db.insert(storePresence).values({
          restaurantId: input.restaurantId,
          sessionId: input.sessionId,
          lastSeenAt: new Date(),
        });
      }
      // Clean up stale sessions older than 90 seconds
      const staleThreshold = new Date(Date.now() - 90 * 1000);
      await db.delete(storePresence).where(sql`${storePresence.lastSeenAt} < ${staleThreshold}`);
      return { ok: true };
    }),

  /**
   * Public: visitor counts grouped by city (for city selection screen)
   */
  visitorsByCity: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { restaurants: restTable } = await import("../../drizzle/schema");
    const { eq: eqOp, gte: gteOp, isNotNull: isNotNullOp } = await import("drizzle-orm");
    const threshold = new Date(Date.now() - 90 * 1000);
    // Join storePresence -> restaurants to get cityId
    const rows = await db
      .select({ cityId: restTable.cityId, cnt: count() })
      .from(storePresence)
      .innerJoin(restTable, eqOp(storePresence.restaurantId, restTable.id))
      .where(gteOp(storePresence.lastSeenAt, threshold))
      .groupBy(restTable.cityId);
    return rows.filter(r => r.cityId !== null).map(r => ({ cityId: r.cityId!, count: r.cnt }));
  }),

  /**
   * Public: visitor counts grouped by street (for street selection screen)
   */
  visitorsByStreet: publicProcedure
    .input(z.object({ cityId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { restaurants: restTable } = await import("../../drizzle/schema");
      const { eq: eqOp, gte: gteOp } = await import("drizzle-orm");
      const threshold = new Date(Date.now() - 90 * 1000);
      const rows = await db
        .select({ streetId: restTable.streetId, cnt: count() })
        .from(storePresence)
        .innerJoin(restTable, eqOp(storePresence.restaurantId, restTable.id))
        .where(sql`${storePresence.lastSeenAt} >= ${threshold} AND ${restTable.cityId} = ${input.cityId}`)
        .groupBy(restTable.streetId);
      return rows.filter(r => r.streetId !== null).map(r => ({ streetId: r.streetId!, count: r.cnt }));
    }),

  /**
   * Public: bulk presence for all restaurants (for home page cards)
   * Returns visitors (active in last 90s) and active orders per restaurant
   */
  bulkPresence: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const threshold = new Date(Date.now() - 90 * 1000);
    const visitors = await db
      .select({ restaurantId: storePresence.restaurantId, cnt: count() })
      .from(storePresence)
      .where(gte(storePresence.lastSeenAt, threshold))
      .groupBy(storePresence.restaurantId);
    const activeOrders = await db
      .select({ restaurantId: orders.restaurantId, cnt: count() })
      .from(orders)
      .where(sql`${orders.status} IN ('pending','confirmed','preparing','driver_assigned','picked_up')`)
      .groupBy(orders.restaurantId);
    const map: Record<number, { visitors: number; activeOrders: number }> = {};
    for (const v of visitors) {
      if (!map[v.restaurantId]) map[v.restaurantId] = { visitors: 0, activeOrders: 0 };
      map[v.restaurantId].visitors = v.cnt;
    }
    for (const o of activeOrders) {
      if (!map[o.restaurantId]) map[o.restaurantId] = { visitors: 0, activeOrders: 0 };
      map[o.restaurantId].activeOrders = o.cnt;
    }
    return Object.entries(map).map(([id, data]) => ({ restaurantId: Number(id), ...data }));
  }),

  /**
   * Admin: total active visitors now + breakdown by city
   */
  adminGetVisitors: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, byCityId: [] as { cityId: number; cityName: string; count: number }[] };
    const { restaurants: restTable, cities } = await import("../../drizzle/schema");
    const threshold = new Date(Date.now() - 90 * 1000);

    // Total unique sessions active in last 90s
    const totalRows = await db
      .select({ cnt: countDistinct(storePresence.sessionId) })
      .from(storePresence)
      .where(gte(storePresence.lastSeenAt, threshold));
    const total = totalRows[0]?.cnt ?? 0;

    // Group by city via restaurant join
    const cityRows = await db
      .select({ cityId: restTable.cityId, cityName: cities.name, cnt: countDistinct(storePresence.sessionId) })
      .from(storePresence)
      .innerJoin(restTable, eq(storePresence.restaurantId, restTable.id))
      .innerJoin(cities, eq(restTable.cityId as any, cities.id))
      .where(gte(storePresence.lastSeenAt, threshold))
      .groupBy(restTable.cityId, cities.name);

    const byCityId = cityRows
      .filter(r => r.cityId !== null)
      .map(r => ({ cityId: r.cityId!, cityName: r.cityName, count: r.cnt }))
      .sort((a, b) => b.count - a.count);

    return { total, byCityId };
  }),
});
