import { z } from "zod";
import { phoneProtectedProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllDrivers,
  getDriverById,
  getDriverByUserId,
  createDriver,
  updateDriver,
  updateDriverLocation,
  updateDriverAvailability,
  getDb,
} from "../db";

export const driversRouter = router({
  // Get my driver profile (phone auth)
  myProfile: phoneProtectedProcedure.query(async ({ ctx }) => {
    // First try by userId
    let driver = await getDriverByUserId(ctx.phoneUser.id);
    if (driver) return driver;

    // Fallback: search by phone number and link userId automatically
    const db = await getDb();
    if (!db) return null;
    const { drivers: driversTable } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const phone = ctx.phoneUser.phone;
    const [byPhone] = await db.select().from(driversTable).where(eq(driversTable.phone, phone)).limit(1);
    if (byPhone) {
      // Link this phoneUser to the driver record so future lookups use userId
      await db.update(driversTable).set({ userId: ctx.phoneUser.id }).where(eq(driversTable.id, byPhone.id));
      return { ...byPhone, userId: ctx.phoneUser.id };
    }
    return null;
  }),

  // Register as driver or update profile (phone auth)
  upsertProfile: phoneProtectedProcedure
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      whatsappNumber: z.string().optional(),
      deliveryFee: z.string().optional(),
      maxOrders: z.number().min(1).max(50).default(5),
      cityId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getDriverByUserId(ctx.phoneUser.id);
      if (existing) {
        await updateDriver(existing.id, {
          name: input.name,
          phone: input.phone,
          whatsappNumber: input.whatsappNumber ?? input.phone,
          deliveryFee: input.deliveryFee,
          maxOrders: input.maxOrders,
          cityId: input.cityId,
        });
      } else {
        await createDriver({
          userId: ctx.phoneUser.id,
          name: input.name,
          phone: input.phone,
          whatsappNumber: input.whatsappNumber ?? input.phone,
          deliveryFee: input.deliveryFee,
          maxOrders: input.maxOrders,
          cityId: input.cityId,
        });
        // Update phone user role to driver
        const { getDb } = await import("../db");
        const { phoneUsers } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (db) await db.update(phoneUsers).set({ role: "driver" }).where(eq(phoneUsers.id, ctx.phoneUser.id));
        // Notify admin of new driver registration
        try {
          const { notifyOwner } = await import("../_core/notification");
          await notifyOwner({
            title: "✅ مندوب جديد ينتظر المراجعة",
            content: `سجّل المندوب الجديد “${input.name}” (جوال: ${input.phone}) حسابه وينتظر مراجعة بياناته والتحقق منها في لوحة التحكم تبويب المناديب.`,
          });
        } catch (e) {
          console.error("[Notify] Failed to notify owner of new driver:", e);
        }
      }
      return { success: true };
    }),

  // Update delivery fee (phone auth)
  updateDeliveryFee: phoneProtectedProcedure
    .input(z.object({ deliveryFee: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const driver = await getDriverByUserId(ctx.phoneUser.id);
      if (!driver) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على ملف المندوب" });
      await updateDriver(driver.id, { deliveryFee: input.deliveryFee });
      return { success: true };
    }),

  // Update max orders (phone auth)
  updateMaxOrders: phoneProtectedProcedure
    .input(z.object({ maxOrders: z.number().min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const driver = await getDriverByUserId(ctx.phoneUser.id);
      if (!driver) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على ملف المندوب" });
      await updateDriver(driver.id, { maxOrders: input.maxOrders });
      return { success: true };
    }),

  // Toggle online/availability status (phone auth)
  toggleOnline: phoneProtectedProcedure
    .input(z.object({ isOnline: z.boolean(), isAvailable: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const driver = await getDriverByUserId(ctx.phoneUser.id);
      if (!driver) throw new TRPCError({ code: "NOT_FOUND" });
      await updateDriverAvailability(driver.id, input.isAvailable, input.isOnline);
      return { success: true };
    }),

  // Update live location (phone auth)
  updateLocation: phoneProtectedProcedure
    .input(z.object({ lat: z.string(), lng: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const driver = await getDriverByUserId(ctx.phoneUser.id);
      if (!driver) throw new TRPCError({ code: "NOT_FOUND" });
      await updateDriverLocation(driver.id, input.lat, input.lng);
      return { success: true };
    }),

  // Get driver location for tracking (public - customer can see driver location)
  getLocation: phoneProtectedProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input }) => {
      const driver = await getDriverById(input.driverId);
      if (!driver) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        lat: driver.currentLat,
        lng: driver.currentLng,
        lastUpdate: driver.lastLocationUpdate,
        isOnline: driver.isOnline,
      };
    }),

  // Driver stats: deliveries count, earnings, ratings
  myStats: phoneProtectedProcedure.query(async ({ ctx }) => {
    const driver = await getDriverByUserId(ctx.phoneUser.id);
    if (!driver) return null;
    const db = await getDb();
    if (!db) return null;
    const { orders, shopperBookings, shopperTrips, shopperRatings, driverRatings } = await import("../../drizzle/schema");
    const { eq, and, gte, ne, or, desc } = await import("drizzle-orm");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // جلب جميع الطلبات المرتبطة بهذا المندوب
    type OrderRow = { deliveryFee: string | null; createdAt: Date; status: string; cancellationReason: string | null };
    const allDriverOrders: OrderRow[] = await db
      .select({ deliveryFee: orders.deliveryFee, createdAt: orders.createdAt, status: orders.status, cancellationReason: orders.cancellationReason })
      .from(orders)
      .where(eq(orders.driverId, driver.id));

    const allDelivered = allDriverOrders.filter(o => o.status === "delivered");
    const allCancelled = allDriverOrders.filter(o => o.status === "cancelled");

    const todayOrders = allDelivered.filter(o => o.createdAt >= startOfToday);
    const weekOrders = allDelivered.filter(o => o.createdAt >= startOfWeek);
    const monthOrders = allDelivered.filter(o => o.createdAt >= startOfMonth);

    const sumFees = (arr: OrderRow[]) =>
      arr.reduce((acc: number, o: OrderRow) => acc + parseFloat(o.deliveryFee ?? "0"), 0);

    // جلب حجوزات الشوبر المرتبطة بهذا المندوب
    type BookingRow = { deliveryFee: string | null; createdAt: Date; status: string; rejectionReason: string | null };
    const allBookings: BookingRow[] = await db
      .select({ deliveryFee: shopperBookings.deliveryFee, createdAt: shopperBookings.createdAt, status: shopperBookings.status, rejectionReason: shopperBookings.rejectionReason })
      .from(shopperBookings)
      .innerJoin(shopperTrips, eq(shopperBookings.tripId, shopperTrips.id))
      .where(eq(shopperTrips.driverUserId, ctx.phoneUser.id));

    const deliveredBookings = allBookings.filter(b => b.status === "delivered" || b.status === "confirmed");
    const rejectedBookings = allBookings.filter(b => b.status === "rejected");
    const cancelledBookings = allBookings.filter(b => b.status === "cancelled");

    // إحصائيات الشوبر حسب الفترة
    const todayBookings = deliveredBookings.filter(b => b.createdAt >= startOfToday);
    const weekBookings = deliveredBookings.filter(b => b.createdAt >= startOfWeek);
    const monthBookings = deliveredBookings.filter(b => b.createdAt >= startOfMonth);
    const sumBookingFees = (arr: BookingRow[]) =>
      arr.reduce((acc: number, b: BookingRow) => acc + parseFloat(b.deliveryFee ?? "0"), 0);

    // تقييمات الشوبر
    const shopperRatingRows = await db
      .select()
      .from(shopperRatings)
      .where(eq(shopperRatings.driverUserId, ctx.phoneUser.id))
      .orderBy(desc(shopperRatings.createdAt))
      .limit(20);

    // تقييمات التوصيل العادي
    const driverRatingRows = await db
      .select()
      .from(driverRatings)
      .where(eq(driverRatings.driverId, driver.id))
      .orderBy(desc(driverRatings.createdAt))
      .limit(20);

    // حساب متوسط التقييم الشامل
    const allRatings = [
      ...shopperRatingRows.map(r => parseFloat(String(r.overallRating))),
      ...driverRatingRows.map(r => (r.serviceRating + r.speedRating) / 2),
    ];
    const avgRating = allRatings.length > 0
      ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2)
      : driver.rating;

    // أسباب الإلغاء
    const cancelReasons: { reason: string; count: number }[] = [];
    const reasonMap = new Map<string, number>();
    [...allCancelled, ...cancelledBookings].forEach(o => {
      const r = (o as any).cancellationReason || (o as any).rejectionReason || "غير محدد";
      reasonMap.set(r, (reasonMap.get(r) ?? 0) + 1);
    });
    reasonMap.forEach((count, reason) => cancelReasons.push({ reason, count }));
    cancelReasons.sort((a, b) => b.count - a.count);

    // تعليقات العملاء الأخيرة
    const recentComments = [
      ...shopperRatingRows.filter(r => r.comment).map(r => ({ comment: r.comment!, rating: parseFloat(String(r.overallRating)), date: r.createdAt })),
      ...driverRatingRows.filter(r => r.comment).map(r => ({ comment: r.comment!, rating: (r.serviceRating + r.speedRating) / 2, date: r.createdAt })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    return {
      totalDeliveries: allDelivered.length + deliveredBookings.length,
      rating: avgRating,
      todayCount: todayOrders.length + todayBookings.length,
      todayEarnings: (sumFees(todayOrders) + sumBookingFees(todayBookings)).toFixed(2),
      weekCount: weekOrders.length + weekBookings.length,
      weekEarnings: (sumFees(weekOrders) + sumBookingFees(weekBookings)).toFixed(2),
      monthCount: monthOrders.length + monthBookings.length,
      monthEarnings: (sumFees(monthOrders) + sumBookingFees(monthBookings)).toFixed(2),
      allTimeEarnings: (sumFees(allDelivered) + deliveredBookings.reduce((a, b) => a + parseFloat(b.deliveryFee ?? "0"), 0)).toFixed(2),
      // إحصائيات إضافية
      cancelledByCustomer: allCancelled.length + cancelledBookings.length,
      rejectedByDriver: rejectedBookings.length,
      totalBookings: deliveredBookings.length,
      totalOrders: allDelivered.length,
      cancelReasons,
      recentComments,
      shopperAvgAccuracy: shopperRatingRows.length > 0 ? (shopperRatingRows.reduce((a, b) => a + b.accuracyRating, 0) / shopperRatingRows.length).toFixed(1) : null,
      shopperAvgSpeed: shopperRatingRows.length > 0 ? (shopperRatingRows.reduce((a, b) => a + b.speedRating, 0) / shopperRatingRows.length).toFixed(1) : null,
      shopperAvgCooperation: shopperRatingRows.length > 0 ? (shopperRatingRows.reduce((a, b) => a + b.cooperationRating, 0) / shopperRatingRows.length).toFixed(1) : null,
    };
  }),

  // Driver: update city
  updateCity: phoneProtectedProcedure
    .input(z.object({ cityId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const driver = await getDriverByUserId(ctx.phoneUser.id);
      if (!driver) throw new TRPCError({ code: "NOT_FOUND" });
      await updateDriver(driver.id, { cityId: input.cityId });
      return { success: true };
    }),

  // Admin: list all drivers
  adminList: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllDrivers();
  }),

  // Admin: delete driver
  adminDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { getDb } = await import("../db");
      const { drivers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(drivers).where(eq(drivers.id, input.id));
      return { success: true };
    }),

  // Admin: toggle driver active status
  adminToggleActive: protectedProcedure
    .input(z.object({ id: z.number(), isAvailable: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await updateDriverAvailability(input.id, input.isAvailable, false);
      return { success: true };
    }),

  // Admin: create driver manually
  adminCreate: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      whatsappNumber: z.string().optional(),
      deliveryFee: z.string().optional(),
      maxOrders: z.number().min(1).max(50).default(5),
      nationalId: z.string().optional(),
      licenseNumber: z.string().optional(),
      licenseExpiry: z.string().optional(),
      vehiclePlate: z.string().optional(),
      vehicleModel: z.string().optional(),
      vehicleYear: z.string().optional(),
      vehicleColor: z.string().optional(),
      verificationStatus: z.enum(["pending", "verified", "rejected"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await createDriver({
        userId: 0,
        name: input.name,
        phone: input.phone,
        whatsappNumber: input.whatsappNumber ?? input.phone,
        deliveryFee: input.deliveryFee,
        maxOrders: input.maxOrders,
        nationalId: input.nationalId,
        licenseNumber: input.licenseNumber,
        licenseExpiry: input.licenseExpiry,
        vehiclePlate: input.vehiclePlate,
        vehicleModel: input.vehicleModel,
        vehicleYear: input.vehicleYear,
        vehicleColor: input.vehicleColor,
        verificationStatus: input.verificationStatus ?? "pending",
      });
      return { success: true };
    }),

  // Admin: update driver
  adminUpdate: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      whatsappNumber: z.string().optional(),
      deliveryFee: z.string().optional(),
      maxOrders: z.number().optional(),
      isAvailable: z.boolean().optional(),
      nationalId: z.string().optional(),
      licenseNumber: z.string().optional(),
      licenseExpiry: z.string().optional(),
      vehiclePlate: z.string().optional(),
      vehicleModel: z.string().optional(),
      vehicleYear: z.string().optional(),
      vehicleColor: z.string().optional(),
      verificationStatus: z.enum(["pending", "verified", "rejected"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await updateDriver(id, data);
      return { success: true };
    }),

  // ─── COVERAGE PROCEDURES ───

  // Admin: get coverage zones for a driver
  adminGetCoverage: protectedProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      const { driverCoverage } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return db.select().from(driverCoverage).where(eq(driverCoverage.driverId, input.driverId));
    }),

  // Admin: set coverage zones for a driver (replaces all existing)
  adminSetCoverage: protectedProcedure
    .input(z.object({
      driverId: z.number(),
      zones: z.array(z.object({
        cityId: z.number(),
        streetId: z.number().nullable().optional(),
        isCurrentLocation: z.boolean().default(false),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { driverCoverage, drivers: driversTable } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      // Delete existing coverage
      await db.delete(driverCoverage).where(eq(driverCoverage.driverId, input.driverId));
      // Insert new zones
      if (input.zones.length > 0) {
        await db.insert(driverCoverage).values(
          input.zones.map(z => ({
            driverId: input.driverId,
            cityId: z.cityId,
            streetId: z.streetId ?? null,
            isCurrentLocation: z.isCurrentLocation,
          }))
        );
      }
      // Update driver's current city/street from the "current location" zone
      const currentZone = input.zones.find(z => z.isCurrentLocation);
      if (currentZone) {
        await db.update(driversTable)
          .set({ cityId: currentZone.cityId, streetId: currentZone.streetId ?? null })
          .where(eq(driversTable.id, input.driverId));
      }
      return { success: true };
    }),

  // Admin: add single coverage zone
  adminAddCoverageZone: protectedProcedure
    .input(z.object({
      driverId: z.number(),
      cityId: z.number(),
      streetId: z.number().nullable().optional(),
      isCurrentLocation: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { driverCoverage, drivers: driversTable } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      // Check if zone already exists
      const existing = await db.select().from(driverCoverage)
        .where(and(
          eq(driverCoverage.driverId, input.driverId),
          eq(driverCoverage.cityId, input.cityId),
          input.streetId ? eq(driverCoverage.streetId, input.streetId) : eq(driverCoverage.streetId, 0)
        )).limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "هذه المنطقة مضافة مسبقاً" });
      // If marking as current location, clear other current locations
      if (input.isCurrentLocation) {
        await db.update(driverCoverage)
          .set({ isCurrentLocation: false })
          .where(eq(driverCoverage.driverId, input.driverId));
      }
      await db.insert(driverCoverage).values({
        driverId: input.driverId,
        cityId: input.cityId,
        streetId: input.streetId ?? null,
        isCurrentLocation: input.isCurrentLocation,
      });
      // Update driver's current city/street if this is current location
      if (input.isCurrentLocation) {
        await db.update(driversTable)
          .set({ cityId: input.cityId, streetId: input.streetId ?? null })
          .where(eq(driversTable.id, input.driverId));
      }
      return { success: true };
    }),

  // Admin: remove coverage zone
  adminRemoveCoverageZone: protectedProcedure
    .input(z.object({ zoneId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { driverCoverage } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.delete(driverCoverage).where(eq(driverCoverage.id, input.zoneId));
      return { success: true };
    }),

  // Admin: set current location zone for driver
  adminSetCurrentLocation: protectedProcedure
    .input(z.object({ driverId: z.number(), zoneId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { driverCoverage, drivers: driversTable } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      // Clear all current locations
      await db.update(driverCoverage)
        .set({ isCurrentLocation: false })
        .where(eq(driverCoverage.driverId, input.driverId));
      // Set the selected zone as current
      await db.update(driverCoverage)
        .set({ isCurrentLocation: true })
        .where(eq(driverCoverage.id, input.zoneId));
      // Get zone details and update driver
      const [zone] = await db.select().from(driverCoverage).where(eq(driverCoverage.id, input.zoneId)).limit(1);
      if (zone) {
        await db.update(driversTable)
          .set({ cityId: zone.cityId, streetId: zone.streetId })
          .where(eq(driversTable.id, input.driverId));
      }
      return { success: true };
    }),

  // Admin: get all drivers with their coverage summary (for order assignment)
  adminListWithCoverage: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      const { drivers: driversTable, driverCoverage, cities, streets } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const allDrivers = await db.select().from(driversTable);
      const allCoverage = await db.select({
        id: driverCoverage.id,
        driverId: driverCoverage.driverId,
        cityId: driverCoverage.cityId,
        streetId: driverCoverage.streetId,
        isCurrentLocation: driverCoverage.isCurrentLocation,
        cityName: cities.name,
        streetName: streets.name,
      })
        .from(driverCoverage)
        .leftJoin(cities, eq(driverCoverage.cityId, cities.id))
        .leftJoin(streets, eq(driverCoverage.streetId, streets.id));
      return allDrivers.map(d => ({
        ...d,
        coverageZones: allCoverage.filter(c => c.driverId === d.id),
      }));
    }),

  // ─── IN-RESTAURANT PRESENCE ───

  // Driver: set/clear in-restaurant status
  setInRestaurant: phoneProtectedProcedure
    .input(z.object({
      restaurantId: z.number().nullable(), // null = leaving restaurant
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { drivers: driversTable } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      // Find driver by userId
      const [driver] = await db.select().from(driversTable)
        .where(eq(driversTable.userId, ctx.phoneUser.id)).limit(1);
      if (!driver) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على بيانات المندوب" });
      await db.update(driversTable)
        .set({
          inRestaurantId: input.restaurantId,
          inRestaurantSince: input.restaurantId ? new Date() : null,
        })
        .where(eq(driversTable.id, driver.id));
      return { success: true, inRestaurantId: input.restaurantId };
    }),

  // Public: get drivers currently inside a specific restaurant
  getDriversInRestaurant: publicProcedure
    .input(z.object({ restaurantId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { drivers: driversTable } = await import("../../drizzle/schema");
      const { eq, and, isNotNull } = await import("drizzle-orm");
      return db.select({
        id: driversTable.id,
        name: driversTable.name,
        isOnline: driversTable.isOnline,
        inRestaurantSince: driversTable.inRestaurantSince,
      })
        .from(driversTable)
        .where(and(
          eq(driversTable.inRestaurantId, input.restaurantId),
          isNotNull(driversTable.inRestaurantId)
        ));
    }),

  // Public: get active driver counts per city (isAvailable=true OR isOnline=true)
  activeCountByCity: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { drivers: driversTable } = await import("../../drizzle/schema");
      const { or, eq, and, isNotNull, sql } = await import("drizzle-orm");
      const rows = await db.select({
        cityId: driversTable.cityId,
        count: sql<number>`COUNT(*)`,
      })
        .from(driversTable)
        .where(and(
          or(eq(driversTable.isAvailable, true), eq(driversTable.isOnline, true)),
          isNotNull(driversTable.cityId)
        ))
        .groupBy(driversTable.cityId);
      return rows.map(r => ({ cityId: r.cityId!, count: Number(r.count) }));
    }),
  // Public: get active driver counts per street in a city
  activeCountByStreet: publicProcedure
    .input(z.object({ cityId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { drivers: driversTable } = await import("../../drizzle/schema");
      const { or, eq, and, isNotNull, sql } = await import("drizzle-orm");
      const rows = await db.select({
        streetId: driversTable.streetId,
        count: sql<number>`COUNT(*)`,
      })
        .from(driversTable)
        .where(and(
          or(eq(driversTable.isAvailable, true), eq(driversTable.isOnline, true)),
          eq(driversTable.cityId, input.cityId),
          isNotNull(driversTable.streetId)
        ))
        .groupBy(driversTable.streetId);
      return rows.map(r => ({ streetId: r.streetId!, count: Number(r.count) }));
    }),

  // Public: bulk driver counts per restaurant grouped by streetId (for street selection screen)
  bulkDriversInRestaurantByStreet: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { drivers: driversTable, restaurants: restTable } = await import("../../drizzle/schema");
    const { isNotNull, sql: sqlExpr, eq } = await import("drizzle-orm");
    const rows = await db.select({
      streetId: restTable.streetId,
      count: sqlExpr<number>`COUNT(*)`,
    })
      .from(driversTable)
      .innerJoin(restTable, eq(driversTable.inRestaurantId, restTable.id))
      .where(isNotNull(driversTable.inRestaurantId))
      .groupBy(restTable.streetId);
    return rows.filter(r => r.streetId !== null).map(r => ({ streetId: r.streetId!, count: Number(r.count) }));
  }),

  // Public: bulk driver counts per restaurant (for home page cards)
  bulkDriversInRestaurant: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { drivers: driversTable } = await import("../../drizzle/schema");
    const { isNotNull, sql } = await import("drizzle-orm");
    const rows = await db.select({
      restaurantId: driversTable.inRestaurantId,
      count: sql<number>`COUNT(*)`,
    })
      .from(driversTable)
      .where(isNotNull(driversTable.inRestaurantId))
      .groupBy(driversTable.inRestaurantId);
    return rows.map(r => ({ restaurantId: r.restaurantId!, count: Number(r.count) }));
  }),

  // Admin: get all drivers with full stats (online, location, orders, remaining)
  adminListFull: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      const { drivers: driversTable, cities, streets, restaurants, phoneUsers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db.select({
        id: driversTable.id,
        userId: driversTable.userId,
        name: driversTable.name,
        phone: driversTable.phone,
        whatsappNumber: driversTable.whatsappNumber,
        isAvailable: driversTable.isAvailable,
        // isOnline is the source of truth from phoneUsers (updated by setOnlineStatus)
        isOnline: phoneUsers.isOnline,
        maxOrders: driversTable.maxOrders,
        currentOrders: driversTable.currentOrders,
        totalDeliveries: driversTable.totalDeliveries,
        rating: driversTable.rating,
        // cityId/streetId from phoneUsers (set when driver goes online with location)
        cityId: phoneUsers.cityId,
        streetId: phoneUsers.streetId,
        inRestaurantId: driversTable.inRestaurantId,
        inRestaurantSince: driversTable.inRestaurantSince,
        cityName: cities.name,
        cityCenterLat: cities.centerLat,
        cityCenterLng: cities.centerLng,
        streetName: streets.name,
        inRestaurantName: restaurants.name,
        // GPS location from phoneUsers (real-time position)
        currentLat: phoneUsers.currentLat,
        currentLng: phoneUsers.currentLng,
        currentCityName: phoneUsers.currentCityName,
        lastOnlineAt: phoneUsers.lastOnlineAt,
        // Verification fields from drivers table
        verificationStatus: driversTable.verificationStatus,
        vehiclePlate: driversTable.vehiclePlate,
        vehicleModel: driversTable.vehicleModel,
        vehicleColor: driversTable.vehicleColor,
        nationalId: driversTable.nationalId,
        licenseNumber: driversTable.licenseNumber,
        licenseExpiry: driversTable.licenseExpiry,
        deliveryFee: driversTable.deliveryFee,
        lastLocationUpdate: driversTable.lastLocationUpdate,
      })
        .from(driversTable)
        .leftJoin(phoneUsers, eq(driversTable.userId, phoneUsers.id))
        .leftJoin(cities, eq(phoneUsers.cityId, cities.id))
        .leftJoin(streets, eq(phoneUsers.streetId, streets.id))
        .leftJoin(restaurants, eq(driversTable.inRestaurantId, restaurants.id));
      return rows;
    }),
});
