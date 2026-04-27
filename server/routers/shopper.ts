import { z } from "zod";
import { router, publicProcedure, phoneProtectedProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  shopperDriverSettings,
  shopperTrips,
  shopperBookings,
  shopperRatings,
  phoneUsers,
  cities,
  drivers,
  driverRatings,
} from "../../drizzle/schema";
import { eq, and, desc, inArray, avg, count, sql, ne } from "drizzle-orm";
import { storagePut } from "../storage";

// ===== SHOPPER ROUTER =====
export const shopperRouter = router({

  // ─── إعدادات المندوب في شوبر ───────────────────────────────────────────────

  /** جلب إعدادات المندوب في شوبر */
  getDriverSettings: phoneProtectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [settings] = await db
      .select()
      .from(shopperDriverSettings)
      .where(eq(shopperDriverSettings.driverUserId, ctx.phoneUser.id))
      .limit(1);
    return settings ?? null;
  }),

  /** حفظ/تحديث إعدادات المندوب في شوبر */
  saveDriverSettings: phoneProtectedProcedure
    .input(
      z.object({
        isActive: z.boolean(),
        allowsFood: z.boolean().default(true),
        allowsCoffee: z.boolean().default(true),
        allowsGroceries: z.boolean().default(true),
        allowsPharmacy: z.boolean().default(true),
        allowsDocuments: z.boolean().default(false),
        allowsElectronics: z.boolean().default(false),
        allowsClothes: z.boolean().default(false),
        allowsOther: z.boolean().default(false),
        customTerms: z.string().optional(),
        minBookingsToDepart: z.number().min(1).max(20).default(3),
        maxBookingsPerTrip: z.number().min(1).max(50).default(10),
        defaultDeliveryFee: z.number().min(0).default(15),
        driverNote: z.string().optional(),
        maxDeliveryKm: z.number().min(0).max(500).default(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const existing = await db
        .select({ id: shopperDriverSettings.id })
        .from(shopperDriverSettings)
        .where(eq(shopperDriverSettings.driverUserId, ctx.phoneUser.id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(shopperDriverSettings)
          .set({
            isActive: input.isActive,
            allowsFood: input.allowsFood,
            allowsCoffee: input.allowsCoffee,
            allowsGroceries: input.allowsGroceries,
            allowsPharmacy: input.allowsPharmacy,
            allowsDocuments: input.allowsDocuments,
            allowsElectronics: input.allowsElectronics,
            allowsClothes: input.allowsClothes,
            allowsOther: input.allowsOther,
            customTerms: input.customTerms ?? null,
            minBookingsToDepart: input.minBookingsToDepart,
            maxBookingsPerTrip: input.maxBookingsPerTrip,
            defaultDeliveryFee: String(input.defaultDeliveryFee),
            driverNote: input.driverNote ?? null,
            maxDeliveryKm: input.maxDeliveryKm,
          })
          .where(eq(shopperDriverSettings.driverUserId, ctx.phoneUser.id));
      } else {
        await db.insert(shopperDriverSettings).values({
          driverUserId: ctx.phoneUser.id,
          isActive: input.isActive,
          allowsFood: input.allowsFood,
          allowsCoffee: input.allowsCoffee,
          allowsGroceries: input.allowsGroceries,
          allowsPharmacy: input.allowsPharmacy,
          allowsDocuments: input.allowsDocuments,
          allowsElectronics: input.allowsElectronics,
          allowsClothes: input.allowsClothes,
          allowsOther: input.allowsOther,
          customTerms: input.customTerms ?? null,
          minBookingsToDepart: input.minBookingsToDepart,
          maxBookingsPerTrip: input.maxBookingsPerTrip,
          defaultDeliveryFee: String(input.defaultDeliveryFee),
          driverNote: input.driverNote ?? null,
          maxDeliveryKm: input.maxDeliveryKm,
        });
      }
      return { success: true };
    }),

  // ─── رحلات المندوب ──────────────────────────────────────────────────────────

  /** جلب رحلات المندوب */
  getMyTrips: phoneProtectedProcedure
    .input(z.object({ includeCompleted: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const trips = await db
        .select()
        .from(shopperTrips)
        .where(
          and(
            eq(shopperTrips.driverUserId, ctx.phoneUser.id),
            input.includeCompleted
              ? undefined
              : inArray(shopperTrips.status, ["upcoming", "collecting", "departed", "arrived"])
          )
        )
        .orderBy(desc(shopperTrips.departureTime));
      return trips;
    }),

  /** إنشاء رحلة جديدة */
  createTrip: phoneProtectedProcedure
    .input(
      z.object({
        fromCityId: z.number().default(0),
        fromCityName: z.string(),
        fromLat: z.number().optional(), // إحداثيات GPS المندوب
        fromLng: z.number().optional(),
        toCityId: z.number().default(0),
        toCityName: z.string(),
        toCityLat: z.number().optional(), // إحداثيات مدينة التوصيل من الخريطة
        toCityLng: z.number().optional(),
        toCityRadiusKm: z.number().min(1).max(500).default(10), // قطر التغطية بالكيلومتر
        departureTime: z.string(),
        estimatedArrivalTime: z.string(),
        bookingDeadline: z.string().optional(),
        minBookings: z.number().min(1).default(1),
        maxBookings: z.number().min(1).max(50).default(10),
        deliveryFee: z.number().min(0).default(15),
        notes: z.string().optional(),
        tripType: z.enum(["group", "express"]).default("group"),
        coveragePolygon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // ─── التحقق من الحقول المطلوبة للرحلة الجماعية ───
      if (input.tripType === "group") {
        if (!input.fromCityName?.trim()) throw new Error("يجب تحديد مدينة الانطلاق");
        if (!input.toCityName?.trim()) throw new Error("يجب تحديد مدينة التوصيل");
        if (!input.departureTime) throw new Error("يجب تحديد وقت المغادرة");
        if (!input.estimatedArrivalTime) throw new Error("يجب تحديد وقت الوصول المتوقع");
        if (!input.deliveryFee || input.deliveryFee <= 0) throw new Error("يجب تحديد رسوم التوصيل");

        // ─── التحقق من أن وقت المغادرة في المستقبل ───
        const depTimeCheck = new Date(input.departureTime);
        const nowCheck = new Date();
        if (depTimeCheck <= nowCheck) {
          throw new Error("وقت المغادرة يجب أن يكون في المستقبل (الوقت المحدد قد مضى)");
        }

        // ─── التحقق من أن وقت الوصول بعد وقت المغادرة ───
        const arrTimeCheck = new Date(input.estimatedArrivalTime);
        if (arrTimeCheck <= depTimeCheck) {
          throw new Error("وقت الوصول يجب أن يكون بعد وقت المغادرة");
        }
      }

      const depTime = input.tripType === "express" ? new Date() : new Date(input.departureTime);
      const arrTime = input.tripType === "express" ? new Date(Date.now() + 2 * 60 * 60 * 1000) : new Date(input.estimatedArrivalTime);
      const [trip] = await db
        .insert(shopperTrips)
        .values({
          driverUserId: ctx.phoneUser.id,
          fromCityId: input.fromCityId,
          fromCityName: input.fromCityName,
          fromLat: input.fromLat != null ? String(input.fromLat) : null,
          fromLng: input.fromLng != null ? String(input.fromLng) : null,
          toCityId: input.toCityId,
          toCityName: input.toCityName,
          toCityLat: input.toCityLat != null ? String(input.toCityLat) : null,
          toCityLng: input.toCityLng != null ? String(input.toCityLng) : null,
          toCityRadiusKm: String(input.toCityRadiusKm ?? 10),
          departureTime: depTime,
          estimatedArrivalTime: arrTime,
          bookingDeadline: input.bookingDeadline ? new Date(input.bookingDeadline) : null,
          minBookings: input.tripType === "express" ? 1 : input.minBookings,
          maxBookings: input.tripType === "express" ? 1 : input.maxBookings,
          deliveryFee: String(input.deliveryFee),
          coveragePolygon: (() => {
            if (!input.coveragePolygon) return null;
            try {
              const poly = JSON.parse(input.coveragePolygon) as Array<[number, number]>;
              if (!Array.isArray(poly) || poly.length < 3) return input.coveragePolygon;
              // تصحيح تلقائي: في السعودية lat بين 16-32، lng بين 36-56
              const isSwapped = poly[0][0] > 35;
              if (isSwapped) {
                console.log(`[shopper] Auto-fixing swapped lat/lng in coveragePolygon (${poly.length} points)`);
                return JSON.stringify(poly.map((p: [number,number]) => [p[1], p[0]] as [number,number]));
              }
              return input.coveragePolygon;
            } catch { return input.coveragePolygon; }
          })(),
          notes: input.notes ?? null,
          tripType: input.tripType,
          status: input.tripType === "express" ? "collecting" : "upcoming",
        })
        .$returningId();
      return { id: trip.id };
    }),

  /** تحديث حالة الرحلة */
  updateTripStatus: phoneProtectedProcedure
    .input(
      z.object({
        tripId: z.number(),
        status: z.enum(["upcoming", "collecting", "departed", "arrived", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .update(shopperTrips)
        .set({ status: input.status })
        .where(
          and(
            eq(shopperTrips.id, input.tripId),
            eq(shopperTrips.driverUserId, ctx.phoneUser.id)
          )
        );
      return { success: true };
    }),

  /** حذف رحلة (فقط إذا لم تبدأ بعد) */
  deleteTrip: phoneProtectedProcedure
    .input(z.object({ tripId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .delete(shopperTrips)
        .where(
          and(
            eq(shopperTrips.id, input.tripId),
            eq(shopperTrips.driverUserId, ctx.phoneUser.id),
            eq(shopperTrips.status, "upcoming")
          )
        );
      return { success: true };
    }),

  // ─── الحجوزات للمندوب ───────────────────────────────────────────────────────

  /** جلب حجوزات رحلة معينة (للمندوب) */
  getTripBookings: phoneProtectedProcedure
    .input(z.object({ tripId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const [trip] = await db
        .select()
        .from(shopperTrips)
        .where(
          and(
            eq(shopperTrips.id, input.tripId),
            eq(shopperTrips.driverUserId, ctx.phoneUser.id)
          )
        )
        .limit(1);
      if (!trip) throw new Error("رحلة غير موجودة");

      const bookings = await db
        .select({
          booking: shopperBookings,
          customer: {
            id: phoneUsers.id,
            name: phoneUsers.name,
            phone: phoneUsers.phone,
          },
        })
        .from(shopperBookings)
        .leftJoin(phoneUsers, eq(shopperBookings.customerUserId, phoneUsers.id))
        .where(eq(shopperBookings.tripId, input.tripId))
        .orderBy(desc(shopperBookings.createdAt));

      return bookings;
    }),

  /** قبول حجز واحد */
  acceptBooking: phoneProtectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [booking] = await db
        .select({ tripId: shopperBookings.tripId })
        .from(shopperBookings)
        .where(eq(shopperBookings.id, input.bookingId))
        .limit(1);
      if (!booking) throw new Error("حجز غير موجود");

      const [trip] = await db
        .select()
        .from(shopperTrips)
        .where(
          and(
            eq(shopperTrips.id, booking.tripId),
            eq(shopperTrips.driverUserId, ctx.phoneUser.id)
          )
        )
        .limit(1);
      if (!trip) throw new Error("غير مصرح");

      await db
        .update(shopperBookings)
        .set({ status: "accepted" })
        .where(eq(shopperBookings.id, input.bookingId));

      return { success: true };
    }),

  /** رفض حجز */
  rejectBooking: phoneProtectedProcedure
    .input(z.object({ bookingId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [booking] = await db
        .select({ tripId: shopperBookings.tripId })
        .from(shopperBookings)
        .where(eq(shopperBookings.id, input.bookingId))
        .limit(1);
      if (!booking) throw new Error("حجز غير موجود");

      const [trip] = await db
        .select()
        .from(shopperTrips)
        .where(
          and(
            eq(shopperTrips.id, booking.tripId),
            eq(shopperTrips.driverUserId, ctx.phoneUser.id)
          )
        )
        .limit(1);
      if (!trip) throw new Error("غير مصرح");

      await db
        .update(shopperBookings)
        .set({ status: "rejected", rejectionReason: input.reason ?? null })
        .where(eq(shopperBookings.id, input.bookingId));

      await db
        .update(shopperTrips)
        .set({ currentBookings: Math.max(0, (trip.currentBookings ?? 1) - 1) })
        .where(eq(shopperTrips.id, booking.tripId));

      return { success: true };
    }),

  /** قبول جميع الحجوزات المعلقة دفعة واحدة */
  acceptAllPendingBookings: phoneProtectedProcedure
    .input(z.object({ tripId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [trip] = await db
        .select()
        .from(shopperTrips)
        .where(
          and(
            eq(shopperTrips.id, input.tripId),
            eq(shopperTrips.driverUserId, ctx.phoneUser.id)
          )
        )
        .limit(1);
      if (!trip) throw new Error("رحلة غير موجودة");

      await db
        .update(shopperBookings)
        .set({ status: "accepted" })
        .where(
          and(
            eq(shopperBookings.tripId, input.tripId),
            eq(shopperBookings.status, "pending")
          )
        );

      return { success: true };
    }),

  /** تحديث حالة الحجز (استلام/تسليم) مع رفع صورة */
  updateBookingStatus: phoneProtectedProcedure
    .input(
      z.object({
        bookingId: z.number(),
        status: z.enum(["picked_up", "delivered"]),
        proofImageBase64: z.string().optional(),
        driverNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [booking] = await db
        .select({ tripId: shopperBookings.tripId })
        .from(shopperBookings)
        .where(eq(shopperBookings.id, input.bookingId))
        .limit(1);
      if (!booking) throw new Error("حجز غير موجود");

      const [trip] = await db
        .select()
        .from(shopperTrips)
        .where(
          and(
            eq(shopperTrips.id, booking.tripId),
            eq(shopperTrips.driverUserId, ctx.phoneUser.id)
          )
        )
        .limit(1);
      if (!trip) throw new Error("غير مصرح");

      let proofUrl: string | undefined;
      if (input.proofImageBase64) {
        const base64Data = input.proofImageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const key = `shopper-proof/${input.bookingId}-${input.status}-${Date.now()}.jpg`;
        const { url } = await storagePut(key, buffer, "image/jpeg");
        proofUrl = url;
      }

      const updateData: Record<string, unknown> = {
        status: input.status,
        driverNotes: input.driverNotes ?? null,
      };

      if (input.status === "picked_up" && proofUrl) {
        updateData.pickupProofImageUrl = proofUrl;
        updateData.pickupProofAt = new Date();
      } else if (input.status === "delivered" && proofUrl) {
        updateData.deliveryProofImageUrl = proofUrl;
        updateData.deliveryProofAt = new Date();
      }

      await db
        .update(shopperBookings)
        .set(updateData)
        .where(eq(shopperBookings.id, input.bookingId));

      return { success: true, proofUrl };
    }),

  // ─── للعميل ─────────────────────────────────────────────────────────────────

  /** جلب الرحلات المتاحة للعملاء */
  getAvailableTrips: publicProcedure
    .input(
      z.object({
        toCityId: z.number().optional(),
        fromCityId: z.number().optional(),
        toCityName: z.string().optional(), // فلترة نصية بمدينة التوصيل (من Reverse Geocoding)
        customerLat: z.number().optional(), // إحداثيات موقع العميل (للفلترة بالمسافة)
        customerLng: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const allTrips = await db
        .select({
          trip: shopperTrips,
          driver: {
            id: phoneUsers.id,
            name: phoneUsers.name,
            phone: phoneUsers.phone,
            currentLat: phoneUsers.currentLat,
            currentLng: phoneUsers.currentLng,
          },
          settings: {
            allowsFood: shopperDriverSettings.allowsFood,
            allowsCoffee: shopperDriverSettings.allowsCoffee,
            allowsGroceries: shopperDriverSettings.allowsGroceries,
            allowsPharmacy: shopperDriverSettings.allowsPharmacy,
            allowsDocuments: shopperDriverSettings.allowsDocuments,
            allowsElectronics: shopperDriverSettings.allowsElectronics,
            allowsClothes: shopperDriverSettings.allowsClothes,
            allowsOther: shopperDriverSettings.allowsOther,
            customTerms: shopperDriverSettings.customTerms,
            driverNote: shopperDriverSettings.driverNote,
            maxDeliveryKm: shopperDriverSettings.maxDeliveryKm,
          },
        })
        .from(shopperTrips)
        .leftJoin(phoneUsers, eq(shopperTrips.driverUserId, phoneUsers.id))
        .leftJoin(
          shopperDriverSettings,
          eq(shopperTrips.driverUserId, shopperDriverSettings.driverUserId)
        )
        .where(
          and(
            inArray(shopperTrips.status, ["upcoming", "collecting"]),
            input.toCityId ? eq(shopperTrips.toCityId, input.toCityId) : undefined,
            input.fromCityId ? eq(shopperTrips.fromCityId, input.fromCityId) : undefined
          )
        )
        .orderBy(shopperTrips.departureTime);

      // تصحيح تلقائي لترتيب إحداثيات المضلع عند القراءة
      // في السعودية: lat بين 16-32، lng بين 36-56
      // إذا كانت القيمة الأولى > 35 فهي lng وليس lat → نبدّل الترتيب تلقائياً
      const normalizePolygonRead = (polygon: Array<[number, number]>): Array<[number, number]> => {
        if (!polygon || polygon.length < 3) return polygon;
        const isSwapped = polygon[0][0] > 35;
        if (isSwapped) {
          return polygon.map(p => [p[1], p[0]] as [number, number]);
        }
        return polygon;
      };
      // خوارزمية point-in-polygon (Ray Casting)
      const isPointInPolygon = (lat: number, lng: number, rawPolygon: Array<[number, number]>): boolean => {
        // تصحيح تلقائي للترتيب قبل المقارنة
        const polygon = normalizePolygonRead(rawPolygon);
        let inside = false;
        const n = polygon.length;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const xi = polygon[i][1], yi = polygon[i][0]; // lng, lat
          const xj = polygon[j][1], yj = polygon[j][0];
          const intersect = ((yi > lat) !== (yj > lat)) &&
            (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      };

      // حساب المسافة بين نقطتين بصيغة Haversine (بالكيلومتر)
      const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      };

      // فلترة بالإحداثيات: إذا كان للرحلة مضلع تغطية أو إحداثيات وموقع العميل متاح
      if (input.customerLat != null && input.customerLng != null) {
        const filtered = allTrips.filter(t => {
          // أولاً: إذا كان للرحلة مضلع تغطية — استخدم point-in-polygon
          if (t.trip.coveragePolygon) {
            try {
              const polygon = JSON.parse(t.trip.coveragePolygon) as Array<[number, number]>;
              if (Array.isArray(polygon) && polygon.length >= 3) {
                return isPointInPolygon(input.customerLat!, input.customerLng!, polygon);
              }
            } catch {
              // تجاهل أخطاء JSON وانتقل للفلترة بالمسافة
            }
          }
          // ثانياً: إذا كان للرحلة إحداثيات مركز — استخدم الفلترة بالمسافة
          const tripLat = t.trip.toCityLat ? Number(t.trip.toCityLat) : null;
          const tripLng = t.trip.toCityLng ? Number(t.trip.toCityLng) : null;
          const radius = t.trip.toCityRadiusKm ? Number(t.trip.toCityRadiusKm) : 10;
          if (tripLat != null && tripLng != null) {
            const dist = haversineKm(input.customerLat!, input.customerLng!, tripLat, tripLng);
            return dist <= radius;
          }
          // ثالثاً: لا إحداثيات — استخدم الفلترة النصية كبديل
          if (input.toCityName && input.toCityName.trim()) {
            const searchCity = input.toCityName.trim().toLowerCase();
            const tripCity = (t.trip.toCityName ?? "").toLowerCase();
            return tripCity.includes(searchCity) || searchCity.includes(tripCity);
          }
          return true; // أظهر الرحلات القديمة بدون إحداثيات
        });
        return filtered;
      }

      // فلترة نصية بالمدينة إذا تم تمريرها (مطابقة جزئية غير حساسة لحالة الأحرف)
      if (input.toCityName && input.toCityName.trim()) {
        const searchCity = input.toCityName.trim().toLowerCase();
        return allTrips.filter(t => {
          const tripCity = (t.trip.toCityName ?? "").toLowerCase();
          return tripCity.includes(searchCity) || searchCity.includes(tripCity);
        });
      }

      return allTrips;
    }),

  /** جلب تفاصيل رحلة واحدة */
  getTripDetails: publicProcedure
    .input(z.object({ tripId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [result] = await db
        .select({
          trip: shopperTrips,
          driver: {
            id: phoneUsers.id,
            name: phoneUsers.name,
            phone: phoneUsers.phone,
          },
          settings: shopperDriverSettings,
        })
        .from(shopperTrips)
        .leftJoin(phoneUsers, eq(shopperTrips.driverUserId, phoneUsers.id))
        .leftJoin(
          shopperDriverSettings,
          eq(shopperTrips.driverUserId, shopperDriverSettings.driverUserId)
        )
        .where(eq(shopperTrips.id, input.tripId))
        .limit(1);

      return result ?? null;
    }),

  /** إنشاء حجز على رحلة */
  createBooking: phoneProtectedProcedure
    .input(
      z.object({
        tripId: z.number(),
        itemDescription: z.string().min(1),
        pickupLocationText: z.string().min(1),
        pickupLocationLat: z.number().optional(),
        pickupLocationLng: z.number().optional(),
        pickupStoreName: z.string().optional(),
        deliveryLocationText: z.string().optional(),
        deliveryLocationLat: z.number().optional(),
        deliveryLocationLng: z.number().optional(),
        invoiceImageBase64: z.string().optional(),
        paymentMethod: z.enum(["cash", "card"]).default("cash"),
        customerNotes: z.string().optional(),
        deliveryMethod: z.enum(["person", "door"]).default("person"),
        recipientName: z.string().optional(),
        recipientPhone: z.string().optional(),
        needsInvoice: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [trip] = await db
        .select()
        .from(shopperTrips)
        .where(
          and(
            eq(shopperTrips.id, input.tripId),
            inArray(shopperTrips.status, ["upcoming", "collecting"])
          )
        )
        .limit(1);
      if (!trip) throw new Error("الرحلة غير متاحة");
      if (trip.currentBookings >= trip.maxBookings) throw new Error("الرحلة ممتلئة");

      let invoiceUrl: string | undefined;
      if (input.invoiceImageBase64) {
        const base64Data = input.invoiceImageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const key = `shopper-invoices/${ctx.phoneUser.id}-${Date.now()}.jpg`;
        const { url } = await storagePut(key, buffer, "image/jpeg");
        invoiceUrl = url;
      }

      const [booking] = await db
        .insert(shopperBookings)
        .values({
          tripId: input.tripId,
          customerUserId: ctx.phoneUser.id,
          itemDescription: input.itemDescription,
          pickupLocationText: input.pickupLocationText,
          pickupLocationLat: input.pickupLocationLat ? String(input.pickupLocationLat) : null,
          pickupLocationLng: input.pickupLocationLng ? String(input.pickupLocationLng) : null,
          pickupStoreName: input.pickupStoreName ?? null,
          deliveryLocationText: input.deliveryLocationText ?? null,
          deliveryLocationLat: input.deliveryLocationLat ? String(input.deliveryLocationLat) : null,
          deliveryLocationLng: input.deliveryLocationLng ? String(input.deliveryLocationLng) : null,
          invoiceImageUrl: invoiceUrl ?? null,
          deliveryFee: trip.deliveryFee,
          paymentMethod: input.paymentMethod,
          customerNotes: input.customerNotes ?? null,
          deliveryMethod: input.deliveryMethod,
          recipientName: input.recipientName ?? null,
          recipientPhone: input.recipientPhone ?? null,
          needsInvoice: input.needsInvoice,
          status: "pending",
        })
        .$returningId();

      await db
        .update(shopperTrips)
        .set({
          currentBookings: (trip.currentBookings ?? 0) + 1,
          status: "collecting",
        })
        .where(eq(shopperTrips.id, input.tripId));

      return { id: booking.id };
    }),

  /** جلب حجوزات العميل */
  getMyBookings: phoneProtectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const bookings = await db
      .select({
        booking: shopperBookings,
        trip: shopperTrips,
        driver: {
          name: phoneUsers.name,
          phone: phoneUsers.phone,
        },
      })
      .from(shopperBookings)
      .leftJoin(shopperTrips, eq(shopperBookings.tripId, shopperTrips.id))
      .leftJoin(phoneUsers, eq(shopperTrips.driverUserId, phoneUsers.id))
      .where(eq(shopperBookings.customerUserId, ctx.phoneUser.id))
      .orderBy(desc(shopperBookings.createdAt));

    // إضافة hasRating لكل حجز بناءً على وجود تقييم فعلي في قاعدة البيانات
    const bookingIds = bookings.map(b => b.booking.id);
    let ratedBookingIds = new Set<number>();
    if (bookingIds.length > 0) {
      const ratings = await db
        .select({ bookingId: shopperRatings.bookingId })
        .from(shopperRatings)
        .where(inArray(shopperRatings.bookingId, bookingIds));
      ratedBookingIds = new Set(ratings.map(r => r.bookingId));
    }
    return bookings.map(b => ({ ...b, hasRating: ratedBookingIds.has(b.booking.id) }));
  }),

  /** تأكيد استلام الطلب من العميل */
  confirmDelivery: phoneProtectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [booking] = await db
        .select()
        .from(shopperBookings)
        .where(
          and(
            eq(shopperBookings.id, input.bookingId),
            eq(shopperBookings.customerUserId, ctx.phoneUser.id)
          )
        )
        .limit(1);
      if (!booking) throw new Error("حجز غير موجود");

      await db
        .update(shopperBookings)
        .set({
          status: "confirmed",
          confirmedByCustomerAt: new Date(),
        })
        .where(eq(shopperBookings.id, input.bookingId));

      return { success: true };
    }),

  /** إلغاء حجز من العميل */
  cancelBooking: phoneProtectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [booking] = await db
        .select()
        .from(shopperBookings)
        .where(
          and(
            eq(shopperBookings.id, input.bookingId),
            eq(shopperBookings.customerUserId, ctx.phoneUser.id),
            inArray(shopperBookings.status, ["pending", "accepted"])
          )
        )
        .limit(1);
      if (!booking) throw new Error("لا يمكن إلغاء هذا الحجز");

      await db
        .update(shopperBookings)
        .set({ status: "cancelled" })
        .where(eq(shopperBookings.id, input.bookingId));

      const [trip] = await db
        .select({ currentBookings: shopperTrips.currentBookings })
        .from(shopperTrips)
        .where(eq(shopperTrips.id, booking.tripId))
        .limit(1);
      if (trip) {
        await db
          .update(shopperTrips)
          .set({ currentBookings: Math.max(0, (trip.currentBookings ?? 1) - 1) })
          .where(eq(shopperTrips.id, booking.tripId));
      }

      return { success: true };
    }),

  /** جلب قائمة المدن المتاحة */
  getCities: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(cities).where(eq(cities.isActive, true));
  }),

  // ─── نظام التقييمات ─────────────────────────────────────────────────────────

  /** تقديم تقييم للمندوب بعد اكتمال الطلب */
  submitRating: phoneProtectedProcedure
    .input(z.object({
      bookingId: z.number(),
      accuracyRating: z.number().min(1).max(5),
      speedRating: z.number().min(1).max(5),
      cooperationRating: z.number().min(1).max(5),
      comment: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // التحقق من أن الحجز مكتمل وينتمي للعميل
      const [booking] = await db
        .select()
        .from(shopperBookings)
        .where(
          and(
            eq(shopperBookings.id, input.bookingId),
            eq(shopperBookings.customerUserId, ctx.phoneUser.id),
            inArray(shopperBookings.status, ["delivered", "confirmed"])
          )
        )
        .limit(1);
      if (!booking) throw new Error("لا يمكن تقييم هذا الطلب");

      // التحقق من عدم وجود تقييم سابق
      const [existing] = await db
        .select({ id: shopperRatings.id })
        .from(shopperRatings)
        .where(eq(shopperRatings.bookingId, input.bookingId))
        .limit(1);
      if (existing) throw new Error("تم تقديم التقييم مسبقاً");

      // جلب driverUserId من الرحلة
      const [trip] = await db
        .select({ driverUserId: shopperTrips.driverUserId })
        .from(shopperTrips)
        .where(eq(shopperTrips.id, booking.tripId))
        .limit(1);
      if (!trip) throw new Error("لم يتم العثور على الرحلة");

      const overall = ((input.accuracyRating + input.speedRating + input.cooperationRating) / 3).toFixed(2);

      await db.insert(shopperRatings).values({
        bookingId: input.bookingId,
        tripId: booking.tripId,
        driverUserId: trip.driverUserId,
        customerUserId: ctx.phoneUser.id,
        accuracyRating: input.accuracyRating,
        speedRating: input.speedRating,
        cooperationRating: input.cooperationRating,
        overallRating: overall,
        comment: input.comment,
      });

      // تحديث متوسط تقييم المندوب في جدول drivers
      const [driverRecord] = await db
        .select({ id: drivers.id })
        .from(drivers)
        .where(eq(drivers.userId, trip.driverUserId))
        .limit(1);
      if (driverRecord) {
        // جلب جميع تقييمات الشوبر لهذا المندوب
        const allShopperRatings = await db
          .select({ overallRating: shopperRatings.overallRating })
          .from(shopperRatings)
          .where(eq(shopperRatings.driverUserId, trip.driverUserId));
        // جلب تقييمات التوصيل العادي
        const deliveryStats = await db
          .select({ avgService: avg(driverRatings.serviceRating), avgSpeed: avg(driverRatings.speedRating), total: count(driverRatings.id) })
          .from(driverRatings)
          .where(eq(driverRatings.driverId, driverRecord.id));
        const shopperTotal = allShopperRatings.length;
        const shopperAvg = shopperTotal > 0
          ? allShopperRatings.reduce((s, r) => s + parseFloat(r.overallRating as string), 0) / shopperTotal
          : 0;
        const deliveryTotal = Number(deliveryStats[0]?.total ?? 0);
        const deliveryAvg = deliveryTotal > 0
          ? (parseFloat(deliveryStats[0]?.avgService ?? "0") + parseFloat(deliveryStats[0]?.avgSpeed ?? "0")) / 2
          : 0;
        const totalRatings = shopperTotal + deliveryTotal;
        const combinedAvg = totalRatings > 0
          ? (shopperAvg * shopperTotal + deliveryAvg * deliveryTotal) / totalRatings
          : 5;
        await db.update(drivers).set({ rating: combinedAvg.toFixed(2) }).where(eq(drivers.id, driverRecord.id));
      }

      return { success: true };
    }),

  /** التحقق من وجود تقييم لحجز معين */
  getBookingRating: phoneProtectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const [rating] = await db
        .select()
        .from(shopperRatings)
        .where(
          and(
            eq(shopperRatings.bookingId, input.bookingId),
            eq(shopperRatings.customerUserId, ctx.phoneUser.id)
          )
        )
        .limit(1);
      return rating ?? null;
    }),

  // ─── procedures للأدمن ─────────────────────────────────────────────────────

  /** جلب جميع حجوزات الشوبر للأدمن */
  adminGetAllBookings: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const bookings = await db
      .select({
        booking: shopperBookings,
        trip: shopperTrips,
        driverUser: { name: phoneUsers.name, phone: phoneUsers.phone },
      })
      .from(shopperBookings)
      .leftJoin(shopperTrips, eq(shopperBookings.tripId, shopperTrips.id))
      .leftJoin(phoneUsers, eq(shopperTrips.driverUserId, phoneUsers.id))
      .orderBy(desc(shopperBookings.createdAt))
      .limit(200);
    // جلب بيانات العملاء
    const customerIds = Array.from(new Set(bookings.map(b => b.booking.customerUserId)));
    let customerMap: Record<number, { name: string | null; phone: string }> = {};
    if (customerIds.length > 0) {
      const customers = await db
        .select({ id: phoneUsers.id, name: phoneUsers.name, phone: phoneUsers.phone })
        .from(phoneUsers)
        .where(inArray(phoneUsers.id, customerIds));
      customerMap = Object.fromEntries(customers.map(c => [c.id, { name: c.name, phone: c.phone }]));
    }
    // إضافة hasRating
    const bookingIds = bookings.map(b => b.booking.id);
    let ratedBookingIds = new Set<number>();
    if (bookingIds.length > 0) {
      const ratings = await db
        .select({ bookingId: shopperRatings.bookingId })
        .from(shopperRatings)
        .where(inArray(shopperRatings.bookingId, bookingIds));
      ratedBookingIds = new Set(ratings.map(r => r.bookingId));
    }
    return bookings.map(b => ({
      ...b,
      customerInfo: customerMap[b.booking.customerUserId] ?? null,
      hasRating: ratedBookingIds.has(b.booking.id),
    }));
  }),

  /** تعيين مندوب يدوياً لحجز شوبر معلق */
  adminAssignDriver: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      driverUserId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { TRPCError } = await import("@trpc/server");
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Get booking
      const [booking] = await db.select().from(shopperBookings).where(eq(shopperBookings.id, input.bookingId)).limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "الحجز غير موجود" });
      if (booking.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تعيين مندوب إلا للحجوزات المعلقة" });
      // Find or create a trip for this driver
      let tripId = booking.tripId;
      const [existingTrip] = await db
        .select({ id: shopperTrips.id })
        .from(shopperTrips)
        .where(eq(shopperTrips.driverUserId, input.driverUserId))
        .orderBy(desc(shopperTrips.createdAt))
        .limit(1);
      if (existingTrip) {
        tripId = existingTrip.id;
      }
      // Update booking: assign to this trip and accept
      await db.update(shopperBookings)
        .set({ tripId, status: "accepted", updatedAt: new Date() })
        .where(eq(shopperBookings.id, input.bookingId));
      // Get driver name
      const [driverUser] = await db
        .select({ name: phoneUsers.name })
        .from(phoneUsers)
        .where(eq(phoneUsers.id, input.driverUserId))
        .limit(1);
      return { success: true, driverName: driverUser?.name ?? "المندوب" };
    }),

  /** جلب جميع تقييمات الشوبر للأدمن */
  adminGetAllRatings: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const ratings = await db
      .select({
        rating: shopperRatings,
        driverUser: { name: phoneUsers.name, phone: phoneUsers.phone },
      })
      .from(shopperRatings)
      .leftJoin(phoneUsers, eq(shopperRatings.driverUserId, phoneUsers.id))
      .orderBy(desc(shopperRatings.createdAt))
      .limit(500);
    // جلب بيانات العملاء
    const customerIds = Array.from(new Set(ratings.map(r => r.rating.customerUserId)));
    let customerMap: Record<number, { name: string | null; phone: string }> = {};
    if (customerIds.length > 0) {
      const customers = await db
        .select({ id: phoneUsers.id, name: phoneUsers.name, phone: phoneUsers.phone })
        .from(phoneUsers)
        .where(inArray(phoneUsers.id, customerIds));
      customerMap = Object.fromEntries(customers.map(c => [c.id, { name: c.name, phone: c.phone }]));
    }
    return ratings.map(r => ({ ...r, customerInfo: customerMap[r.rating.customerUserId] ?? null }));
  }),

  /** إحصائيات تقييمات الشوبر لكل مندوب للأدمن */
  adminGetShopperRatingStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const allDriverUsers = await db
      .select({ id: phoneUsers.id, name: phoneUsers.name, phone: phoneUsers.phone })
      .from(phoneUsers)
      .where(eq(phoneUsers.role, "driver"));
    const statsPerDriver = await Promise.all(
      allDriverUsers.map(async (driver) => {
        const driverRatingsList = await db
          .select()
          .from(shopperRatings)
          .where(eq(shopperRatings.driverUserId, driver.id));
        if (driverRatingsList.length === 0) return null;
        const n = driverRatingsList.length;
        const avgAccuracy = driverRatingsList.reduce((s, r) => s + r.accuracyRating, 0) / n;
        const avgSpeed = driverRatingsList.reduce((s, r) => s + r.speedRating, 0) / n;
        const avgCooperation = driverRatingsList.reduce((s, r) => s + r.cooperationRating, 0) / n;
        const avgOverall = driverRatingsList.reduce((s, r) => s + parseFloat(r.overallRating as string), 0) / n;
        return { ...driver, totalRatings: n, avgAccuracy: +avgAccuracy.toFixed(2), avgSpeed: +avgSpeed.toFixed(2), avgCooperation: +avgCooperation.toFixed(2), avgOverall: +avgOverall.toFixed(2) };
      })
    );
    return statsPerDriver.filter(Boolean);
  }),

  /** جلب متوسط تقييمات مندوب */
  getDriverRatingSummary: publicProcedure
    .input(z.object({ driverUserId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const ratings = await db
        .select()
        .from(shopperRatings)
        .where(eq(shopperRatings.driverUserId, input.driverUserId));
      if (ratings.length === 0) return { count: 0, overall: 0, accuracy: 0, speed: 0, cooperation: 0 };
      const count = ratings.length;
      const overall = ratings.reduce((s, r) => s + parseFloat(r.overallRating as string), 0) / count;
      const accuracy = ratings.reduce((s, r) => s + r.accuracyRating, 0) / count;
      const speed = ratings.reduce((s, r) => s + r.speedRating, 0) / count;
      const cooperation = ratings.reduce((s, r) => s + r.cooperationRating, 0) / count;
      return { count, overall: +overall.toFixed(2), accuracy: +accuracy.toFixed(2), speed: +speed.toFixed(2), cooperation: +cooperation.toFixed(2) };
    }),

  /** جلب الموقع الحالي الحي للمندوب (يُستخدم لتحديث المسافة في الوقت الفعلي) */
  getDriverLiveLocation: publicProcedure
    .input(z.object({ driverUserId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db
        .select({
          currentLat: phoneUsers.currentLat,
          currentLng: phoneUsers.currentLng,
          updatedAt: phoneUsers.updatedAt,
        })
        .from(phoneUsers)
        .where(eq(phoneUsers.id, input.driverUserId))
        .limit(1);
      if (!row) return null;
      return {
        lat: row.currentLat ? Number(row.currentLat) : null,
        lng: row.currentLng ? Number(row.currentLng) : null,
        updatedAt: row.updatedAt,
      };
    }),
});
