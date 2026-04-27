import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, desc, count } from "drizzle-orm";

export const governmentRouter = router({
  // استعلام عن طلب بالرقم (متاح للعموم)
  trackOrder: publicProcedure
    .input(z.object({ orderNumber: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { orders } = await import("../../drizzle/schema");

      const orderId = parseInt(input.orderNumber);
      if (isNaN(orderId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "رقم الطلب غير صحيح" });
      }

      const [order] = await (db as any)
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على الطلب" });
      }

      // جلب بيانات المندوب إذا كان مُعيناً
      let driverName = null;
      let driverNationalId = null;
      let vehiclePlate = null;
      let vehicleModel = null;

      if (order.driverUserId) {
        const { drivers } = await import("../../drizzle/schema");
        const [driver] = await (db as any)
          .select()
          .from(drivers)
          .where(eq(drivers.id, order.driverUserId))
          .limit(1);
        if (driver) {
          driverName = driver.name;
          driverNationalId = driver.nationalId;
          vehiclePlate = driver.vehiclePlate;
          vehicleModel = driver.vehicleModel;
        }
      }

      // جلب اسم المطعم
      let restaurantName = null;
      if (order.restaurantId) {
        const { restaurants } = await import("../../drizzle/schema");
        const [restaurant] = await (db as any)
          .select()
          .from(restaurants)
          .where(eq(restaurants.id, order.restaurantId))
          .limit(1);
        if (restaurant) restaurantName = restaurant.name;
      }

      const statusLabels: Record<string, string> = {
        pending: "في الانتظار",
        accepted: "تم القبول",
        preparing: "قيد التحضير",
        ready: "جاهز للاستلام",
        picked_up: "تم الاستلام",
        on_the_way: "في الطريق",
        delivered: "تم التوصيل",
        cancelled: "ملغي",
      };

      return {
        orderNumber: String(order.id),
        status: order.status,
        statusLabel: statusLabels[order.status] || order.status,
        driverName,
        driverNationalId: driverNationalId ? `${driverNationalId.substring(0, 3)}*****` : null,
        vehiclePlate,
        vehicleModel,
        restaurantName,
        city: null,
        createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString("ar-SA") : null,
        deliveredAt: order.deliveredAt ? new Date(order.deliveredAt).toLocaleString("ar-SA") : null,
      };
    }),

  // تقديم شكوى
  submitComplaint: publicProcedure
    .input(z.object({
      userId: z.number().optional(),
      userPhone: z.string().optional(),
      userName: z.string().optional(),
      orderId: z.number().optional(),
      orderNumber: z.string().optional(),
      category: z.enum(["delivery", "driver", "restaurant", "payment", "other"]).default("other"),
      subject: z.string().min(3).max(255),
      description: z.string().min(10),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { complaints } = await import("../../drizzle/schema");

      await (db as any).insert(complaints).values({
        userId: input.userId ?? null,
        userPhone: input.userPhone ?? null,
        userName: input.userName ?? null,
        orderId: input.orderId ?? null,
        orderNumber: input.orderNumber ?? null,
        category: input.category,
        subject: input.subject,
        description: input.description,
        status: "open",
      });

      return { success: true, message: "تم استلام شكواك وسيتم الرد عليها خلال 24 ساعة" };
    }),

  // قبول الشروط وسياسة الخصوصية
  acceptTerms: publicProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { phoneUsers } = await import("../../drizzle/schema");

      await (db as any)
        .update(phoneUsers)
        .set({ termsAccepted: true, termsAcceptedAt: new Date() })
        .where(eq(phoneUsers.id, input.userId));

      return { success: true };
    }),

  // للإدارة: عدد الشكاوى المفتوحة (للـ badge في القائمة الجانبية)
  adminCountOpenComplaints: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { count: 0 };

      const { complaints } = await import("../../drizzle/schema");

      const [result] = await (db as any)
        .select({ count: count() })
        .from(complaints)
        .where(eq(complaints.status, "open"));

      return { count: result?.count ?? 0 };
    }),

  // للإدارة: قائمة الشكاوى
  adminListComplaints: publicProcedure
    .input(z.object({
      status: z.enum(["open", "in_progress", "resolved", "closed", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const { complaints } = await import("../../drizzle/schema");

      if (input.status === "all") {
        return await (db as any)
          .select()
          .from(complaints)
          .orderBy(desc(complaints.createdAt))
          .limit(200);
      } else {
        return await (db as any)
          .select()
          .from(complaints)
          .where(eq(complaints.status, input.status as any))
          .orderBy(desc(complaints.createdAt))
          .limit(200);
      }
    }),

  // للعميل: جلب شكاواه مع ردود الإدارة
  listMyComplaints: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const { complaints } = await import("../../drizzle/schema");

      return await (db as any)
        .select()
        .from(complaints)
        .where(eq(complaints.userId, input.userId))
        .orderBy(desc(complaints.createdAt))
        .limit(50);
    }),

  // للإدارة: الرد على شكوى وتحديث حالتها
  adminReplyComplaint: publicProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["open", "in_progress", "resolved", "closed"]),
      adminReply: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { complaints } = await import("../../drizzle/schema");

      await (db as any)
        .update(complaints)
        .set({
          status: input.status,
          adminReply: input.adminReply ?? null,
          repliedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(complaints.id, input.id));

      return { success: true };
    }),
});
