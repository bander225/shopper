import { z } from "zod";
import { phoneProtectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { driverRatings, drivers, orders, shopperRatings, phoneUsers } from "../../drizzle/schema";
import { eq, avg, count, and, inArray, notInArray } from "drizzle-orm";

export const ratingsRouter = router({
  // العميل: إرسال تقييم للمندوب بعد استلام الطلب
  submitRating: phoneProtectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        driverId: z.number(),
        serviceRating: z.number().min(1).max(5),
        speedRating: z.number().min(1).max(5),
        comment: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const customerId = ctx.phoneUser.id;

      // التحقق من عدم وجود تقييم سابق لنفس الطلب
      const existing = await db
        .select()
        .from(driverRatings)
        .where(and(eq(driverRatings.orderId, input.orderId), eq(driverRatings.customerId, customerId)))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لقد قيّمت هذا الطلب مسبقاً",
        });
      }

      // إدراج التقييم
      await db.insert(driverRatings).values({
        orderId: input.orderId,
        driverId: input.driverId,
        customerId,
        serviceRating: input.serviceRating,
        speedRating: input.speedRating,
        comment: input.comment ?? null,
      });

      // تحديث متوسط تقييم المندوب في جدول drivers
      const stats = await db
        .select({
          avgService: avg(driverRatings.serviceRating),
          avgSpeed: avg(driverRatings.speedRating),
          total: count(driverRatings.id),
        })
        .from(driverRatings)
        .where(eq(driverRatings.driverId, input.driverId));

      if (stats[0]) {
        const avgService = parseFloat(stats[0].avgService ?? "0");
        const avgSpeed = parseFloat(stats[0].avgSpeed ?? "0");
        const overallAvg = ((avgService + avgSpeed) / 2).toFixed(2);
        await db
          .update(drivers)
          .set({ rating: overallAvg })
          .where(eq(drivers.id, input.driverId));
      }

      return { success: true };
    }),

  // جلب قائمة orderIds للطلبات المسلّمة التي لم يُقيَّم فيها المندوب بعد
  getUnratedDeliveredOrderIds: phoneProtectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { unratedOrderIds: [] };

      const customerId = ctx.phoneUser.id;

      // جلب الطلبات المسلّمة التي لها مندوب
      const deliveredOrders = await db
        .select({ id: orders.id, driverId: orders.driverId })
        .from(orders)
        .where(and(eq(orders.userId, customerId), eq(orders.status, "delivered")))
        .limit(50);

      const withDriver = deliveredOrders.filter((o: { id: number; driverId: number | null }) => !!o.driverId);
      if (withDriver.length === 0) return { unratedOrderIds: [] };

      // جلب الطلبات التي قُيِّمت بالفعل
      const ratedOrderIds = await db
        .select({ orderId: driverRatings.orderId })
        .from(driverRatings)
        .where(and(
          eq(driverRatings.customerId, customerId),
          inArray(driverRatings.orderId, withDriver.map((o: { id: number }) => o.id))
        ));

      const ratedSet = new Set(ratedOrderIds.map((r: { orderId: number }) => r.orderId));
      const unratedOrderIds = withDriver
        .filter((o: { id: number }) => !ratedSet.has(o.id))
        .map((o: { id: number; driverId: number | null }) => ({ orderId: o.id, driverId: o.driverId! }));

      return { unratedOrderIds };
    }),

  // التحقق من وجود تقييم لطلب معين
  hasRated: phoneProtectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { hasRated: false };

      const customerId = ctx.phoneUser.id;
      const existing = await db
        .select()
        .from(driverRatings)
        .where(and(eq(driverRatings.orderId, input.orderId), eq(driverRatings.customerId, customerId)))
        .limit(1);
      return { hasRated: existing.length > 0 };
    }),

  // الإدارة: جلب إحصائيات تقييمات مندوب معين
  getDriverStats: publicProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { avgService: 0, avgSpeed: 0, total: 0, recentRatings: [] };

      const stats = await db
        .select({
          avgService: avg(driverRatings.serviceRating),
          avgSpeed: avg(driverRatings.speedRating),
          total: count(driverRatings.id),
        })
        .from(driverRatings)
        .where(eq(driverRatings.driverId, input.driverId));

      const recentRatings = await db
        .select()
        .from(driverRatings)
        .where(eq(driverRatings.driverId, input.driverId))
        .orderBy(driverRatings.createdAt)
        .limit(10);

      return {
        avgService: parseFloat(stats[0]?.avgService ?? "0"),
        avgSpeed: parseFloat(stats[0]?.avgSpeed ?? "0"),
        total: Number(stats[0]?.total ?? 0),
        recentRatings,
      };
    }),

  // الإدارة: جلب إحصائيات جميع المناديب مع تقييمات الشوبر مدمجة
  getAllDriversWithBothRatings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const allDrivers = await db
      .select({
        id: drivers.id,
        name: drivers.name,
        phone: drivers.phone,
        rating: drivers.rating,
        totalDeliveries: drivers.totalDeliveries,
        userId: drivers.userId,
      })
      .from(drivers);

    const statsPerDriver = await Promise.all(
      allDrivers.map(async (driver) => {
        // تقييمات التوصيل العادي
        const deliveryStats = await db
          .select({
            avgService: avg(driverRatings.serviceRating),
            avgSpeed: avg(driverRatings.speedRating),
            total: count(driverRatings.id),
          })
          .from(driverRatings)
          .where(eq(driverRatings.driverId, driver.id));

        // تقييمات الشوبر (عبر userId)
        let shopperStats = { avgAccuracy: 0, avgSpeed: 0, avgCooperation: 0, avgOverall: 0, totalShopperRatings: 0 };
        if (driver.userId) {
          const shopperRatingsList = await db
            .select()
            .from(shopperRatings)
            .where(eq(shopperRatings.driverUserId, driver.userId));
          if (shopperRatingsList.length > 0) {
            const n = shopperRatingsList.length;
            shopperStats = {
              avgAccuracy: +(shopperRatingsList.reduce((s, r) => s + r.accuracyRating, 0) / n).toFixed(2),
              avgSpeed: +(shopperRatingsList.reduce((s, r) => s + r.speedRating, 0) / n).toFixed(2),
              avgCooperation: +(shopperRatingsList.reduce((s, r) => s + r.cooperationRating, 0) / n).toFixed(2),
              avgOverall: +(shopperRatingsList.reduce((s, r) => s + parseFloat(r.overallRating as string), 0) / n).toFixed(2),
              totalShopperRatings: n,
            };
          }
        }

        return {
          ...driver,
          avgService: parseFloat(deliveryStats[0]?.avgService ?? "0"),
          avgDeliverySpeed: parseFloat(deliveryStats[0]?.avgSpeed ?? "0"),
          totalRatings: Number(deliveryStats[0]?.total ?? 0),
          ...shopperStats,
        };
      })
    );

    return statsPerDriver;
  }),

  // الإدارة: جلب إحصائيات جميع المناديب
  getAllDriversStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const allDrivers = await db
      .select({
        id: drivers.id,
        name: drivers.name,
        phone: drivers.phone,
        rating: drivers.rating,
        totalDeliveries: drivers.totalDeliveries,
      })
      .from(drivers);

    const statsPerDriver = await Promise.all(
      allDrivers.map(async (driver: { id: number; name: string; phone: string; rating: string | null; totalDeliveries: number }) => {
        const stats = await db
          .select({
            avgService: avg(driverRatings.serviceRating),
            avgSpeed: avg(driverRatings.speedRating),
            total: count(driverRatings.id),
          })
          .from(driverRatings)
          .where(eq(driverRatings.driverId, driver.id));

        return {
          ...driver,
          avgService: parseFloat(stats[0]?.avgService ?? "0"),
          avgSpeed: parseFloat(stats[0]?.avgSpeed ?? "0"),
          totalRatings: Number(stats[0]?.total ?? 0),
        };
      })
    );

    return statsPerDriver;
  }),
});
