import { z } from "zod";
import { phoneProtectedProcedure, anyCustomerProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { makeRequest, DistanceMatrixResult } from "../_core/map";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrdersByDriver,
  getOrdersByUser,
  getOrderWithItems,
  getPendingOrders,
  getReadyOrders,
  updateOrderStatus,
  getDriverById,
  getDriverByUserId,
  getRestaurantById,
  createNotification,
  updateDriver,
  updateOrderAssignStatus,
  getMenuItemById,
  decrementMenuItemStock,
} from "../db";
import { broadcastOrderToDrivers, autoAssignOrderToDriver } from "./driverRequests";
import { isAutoAssignEnabled } from "./settings";

export const ordersRouter = router({
  // Customer: place a new order (accepts phone auth OR OAuth)
  create: anyCustomerProcedure
    .input(z.object({
      restaurantId: z.number(),
      items: z.array(z.object({
        menuItemId: z.number(),
        name: z.string(),
        price: z.string(),
        quantity: z.number().min(1),
        notes: z.string().optional(),
      })),
      deliveryAddressText: z.string().min(1),
      deliveryLat: z.string().optional(),
      deliveryLng: z.string().optional(),
      customerNotes: z.string().optional(),
      paymentMethod: z.enum(["cash", "card", "stripe"]).default("cash"),
      deliveryFee: z.string().optional(),
      googlePlaceName: z.string().optional(),
      googlePlaceId: z.string().optional(),
      cityId: z.number().optional(),
      streetId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // ===== التحقق من المخزون قبل إنشاء الطلب =====
      for (const item of input.items) {
        if (!item.menuItemId) continue;
        const menuItem = await getMenuItemById(item.menuItemId);
        if (menuItem && menuItem.stockEnabled && menuItem.stockCount !== null && menuItem.stockCount !== undefined) {
          if (menuItem.stockCount <= 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `عذراً، الصنف "${item.name}" نفد من المخزون`,
            });
          }
          if (menuItem.stockCount < item.quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `عذراً، الكمية المتاحة من "${item.name}" هي ${menuItem.stockCount} فقط`,
            });
          }
        }
      }

      const subtotal = input.items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
      const fee = parseFloat(input.deliveryFee ?? "0") || 0;
      const total = subtotal + fee;

      const result = await createOrder(
        {
          userId: ctx.phoneUser.id,
          restaurantId: input.restaurantId,
          subtotal: subtotal.toFixed(2),
          deliveryFee: fee.toFixed(2),
          total: total.toFixed(2),
          deliveryAddressText: input.deliveryAddressText,
          deliveryLat: input.deliveryLat,
          deliveryLng: input.deliveryLng,
          customerNotes: input.customerNotes,
          paymentMethod: input.paymentMethod,
          googlePlaceName: input.googlePlaceName,
          googlePlaceId: input.googlePlaceId,
        },
        input.items.map(item => ({
          orderId: 0,
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes,
        }))
      );

      if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل إنشاء الطلب" });

      // ===== تقليل المخزون تلقائياً بعد إنشاء الطلب =====
      for (const item of input.items) {
        if (!item.menuItemId) continue;
        const menuItem = await getMenuItemById(item.menuItemId);
        if (menuItem && menuItem.stockEnabled && menuItem.stockCount !== null && menuItem.stockCount !== undefined) {
          await decrementMenuItemStock(item.menuItemId, item.quantity);
        }
      }

      // Dispatch order to driver(s) based on restaurant's driverAssignMode
      try {
        const restaurant = input.restaurantId > 0 ? await getRestaurantById(input.restaurantId) : null;
        const dispatchCityId = restaurant?.cityId ?? input.cityId;
        const dispatchStreetId = restaurant?.streetId ?? input.streetId;
        const assignMode = (restaurant as any)?.driverAssignMode ?? "manual";

        if (dispatchCityId && dispatchStreetId) {
          if (assignMode === "nearest") {
            const { assignNearestDriver } = await import("./driverRequests");
            const assignedDriverId = await assignNearestDriver(
              result.orderId,
              dispatchCityId,
              dispatchStreetId,
              input.deliveryLat ? parseFloat(input.deliveryLat) : null,
              input.deliveryLng ? parseFloat(input.deliveryLng) : null
            );
            if (assignedDriverId) {
              await updateOrderAssignStatus(result.orderId, "assigned");
              console.log(`[Orders] Nearest-assigned order ${result.orderId} to driver ${assignedDriverId}`);
            } else {
              const driverCount = await broadcastOrderToDrivers(result.orderId, dispatchCityId, dispatchStreetId);
              if (driverCount === 0) {
                await updateOrderAssignStatus(result.orderId, "no_driver",
                  `لا يوجد مناديب متاحون في المدينة/الشارع المحدد (وضع: أقرب تلقائياً)`);
              } else {
                await updateOrderAssignStatus(result.orderId, "manual_needed",
                  `لم يُعثر على مندوب قريب — تم إرسال الطلب لـ ${driverCount} مندوب للقبول اليدوي`);
              }
            }
          } else if (assignMode === "street") {
            const assignedDriverId = await autoAssignOrderToDriver(
              result.orderId,
              dispatchCityId,
              dispatchStreetId
            );
            if (assignedDriverId) {
              await updateOrderAssignStatus(result.orderId, "assigned");
              console.log(`[Orders] Street-assigned order ${result.orderId} to driver ${assignedDriverId}`);
            } else {
              const driverCount = await broadcastOrderToDrivers(result.orderId, dispatchCityId, dispatchStreetId);
              if (driverCount === 0) {
                await updateOrderAssignStatus(result.orderId, "no_driver",
                  `لا يوجد مناديب متاحون في نفس الشارع (وضع: حسب الشارع)`);
              } else {
                await updateOrderAssignStatus(result.orderId, "manual_needed",
                  `لم يُعيَّن مندوب تلقائياً — تم إرسال الطلب لـ ${driverCount} مندوب للقبول`);
              }
            }
          } else {
            // Manual mode
            const driverCount = await broadcastOrderToDrivers(result.orderId, dispatchCityId, dispatchStreetId);
            if (driverCount === 0) {
              await updateOrderAssignStatus(result.orderId, "no_driver",
                `لا يوجد مناديب متاحون في هذه المنطقة حالياً (وضع: يدوي)`);
            } else {
              await updateOrderAssignStatus(result.orderId, "manual_needed",
                `الوضع يدوي — يرجى تعيين مندوب من لوحة التحكم (${driverCount} مندوب متاح)`);
            }
          }
        } else {
          // No city/street info
          await updateOrderAssignStatus(result.orderId, "no_driver",
            `لا توجد معلومات منطقة كافية لتعيين مندوب (لا مدينة أو شارع)`);
        }
      } catch (broadcastErr) {
        console.error("[Orders] Failed to dispatch to drivers:", broadcastErr);
      }

      return result;
    }),

  // Customer: get my orders (uses phone auth)
  myOrders: phoneProtectedProcedure.query(({ ctx }) => getOrdersByUser(ctx.phoneUser.id)),

  // Customer/Driver: get order details (uses phone auth)
  getById: phoneProtectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const order = await getOrderWithItems(input.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      // Allow: order owner, assigned driver, or admin
      const isOwner = order.userId === ctx.phoneUser.id;
      const driver = await getDriverByUserId(ctx.phoneUser.id);
      const isDriver = driver && order.driverId === driver.id;
      if (!isOwner && !isDriver) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return order;
    }),

  // Driver: get available orders (uses phone auth)
  availableForDriver: phoneProtectedProcedure.query(async ({ ctx }) => {
    const driver = await getDriverByUserId(ctx.phoneUser.id);
    if (!driver) throw new TRPCError({ code: "FORBIDDEN", message: "أنت لست مندوباً مسجلاً" });
    if (driver.currentOrders >= driver.maxOrders) {
      return { orders: [], limitReached: true, maxOrders: driver.maxOrders, currentOrders: driver.currentOrders };
    }
    const pendingOrders = await getPendingOrders();
    const readyOrders = await getReadyOrders();
    const allAvailable = [...pendingOrders, ...readyOrders];
    return { orders: allAvailable, limitReached: false, maxOrders: driver.maxOrders, currentOrders: driver.currentOrders };
  }),

  // Driver: get my assigned orders (uses phone auth)
  driverOrders: phoneProtectedProcedure.query(async ({ ctx }) => {
    const driver = await getDriverByUserId(ctx.phoneUser.id);
    if (!driver) throw new TRPCError({ code: "FORBIDDEN" });
    return getOrdersByDriver(driver.id);
  }),

  // Driver: accept order (uses phone auth)
  accept: phoneProtectedProcedure
    .input(z.object({ orderId: z.number(), deliveryFee: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const driver = await getDriverByUserId(ctx.phoneUser.id);
      if (!driver) throw new TRPCError({ code: "FORBIDDEN", message: "أنت لست مندوباً مسجلاً" });
      if (driver.currentOrders >= driver.maxOrders) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لقد وصلت للحد الأقصى من الطلبات" });
      }

      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (order.status !== "pending" && order.status !== "ready") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "هذا الطلب لم يعد متاحاً" });
      }

      const newTotal = (parseFloat(order.subtotal) + parseFloat(input.deliveryFee)).toFixed(2);
      await updateOrderStatus(input.orderId, "driver_assigned", {
        driverId: driver.id,
        deliveryFee: input.deliveryFee,
        acceptedAt: new Date(),
      });

      const { getDb } = await import("../db");
      const { orders } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) await db.update(orders).set({ total: newTotal, deliveryFee: input.deliveryFee }).where(eq(orders.id, input.orderId));

      await updateDriver(driver.id, { currentOrders: driver.currentOrders + 1 });

      await createNotification({
        userId: order.userId,
        title: "تم قبول طلبك",
        message: `تم قبول طلبك من قبل المندوب وسيتم التوصيل قريباً. رسوم التوصيل: ${input.deliveryFee} ريال`,
        type: "driver_assigned",
        orderId: input.orderId,
      });

      return { success: true };
    }),

  // Driver: reject order (uses phone auth)
  reject: phoneProtectedProcedure
    .input(z.object({ orderId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const driver = await getDriverByUserId(ctx.phoneUser.id);
      if (!driver) throw new TRPCError({ code: "FORBIDDEN" });
      return { success: true };
    }),

  // Driver: update order status (uses phone auth)
  updateStatus: phoneProtectedProcedure
    .input(z.object({
      orderId: z.number(),
      status: z.enum(["preparing", "ready", "picked_up", "on_the_way", "delivered", "cancelled"]),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      const driver = await getDriverByUserId(ctx.phoneUser.id);
      const isAssignedDriver = driver && order.driverId === driver.id;

      if (!isAssignedDriver) throw new TRPCError({ code: "FORBIDDEN" });

      const extra: Record<string, any> = {};
      if (input.status === "picked_up") extra.pickedUpAt = new Date();
      if (input.status === "delivered") {
        extra.deliveredAt = new Date();
        if (driver) {
          await updateDriver(driver.id, {
            currentOrders: Math.max(0, driver.currentOrders - 1),
            totalDeliveries: driver.totalDeliveries + 1,
          });
        }
      }
      if (input.status === "cancelled") {
        extra.cancelledAt = new Date();
        extra.cancellationReason = input.reason;
        if (driver) {
          await updateDriver(driver.id, { currentOrders: Math.max(0, driver.currentOrders - 1) });
        }
      }

      await updateOrderStatus(input.orderId, input.status, extra);

      const statusMessages: Record<string, string> = {
        preparing: "يتم الآن تحضير طلبك في المطعم",
        ready: "طلبك جاهز وفي انتظار المندوب",
        picked_up: "المندوب استلم طلبك من المطعم",
        on_the_way: "المندوب في الطريق إليك",
        delivered: "تم توصيل طلبك بنجاح! نتمنى لك وجبة شهية",
        cancelled: `تم إلغاء طلبك${input.reason ? `: ${input.reason}` : ""}`,
      };

      await createNotification({
        userId: order.userId,
        title: "تحديث حالة الطلب",
        message: statusMessages[input.status] ?? "تم تحديث حالة طلبك",
        type: "order_update",
        orderId: input.orderId,
      });

      return { success: true };
    }),

  // Admin: get all orders
  adminList: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllOrders();
  }),

  // Admin: assign driver to order manually
  adminAssignDriver: protectedProcedure
    .input(z.object({ orderId: z.number(), driverId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      const driver = await getDriverById(input.driverId);
      if (!driver) throw new TRPCError({ code: "NOT_FOUND", message: "المندوب غير موجود" });

      await updateOrderStatus(input.orderId, "driver_assigned", {
        driverId: input.driverId,
        deliveryFee: driver.deliveryFee ?? "0",
        acceptedAt: new Date(),
      });
      await updateDriver(input.driverId, { currentOrders: driver.currentOrders + 1 });

      await createNotification({
        userId: order.userId,
        title: "تم تعيين مندوب لطلبك",
        message: `تم تعيين المندوب ${driver.name} لتوصيل طلبك`,
        type: "driver_assigned",
        orderId: input.orderId,
      });
      return { success: true };
    }),

  // Driver: upload delivery proof image (uses phone auth)
  uploadDeliveryProof: phoneProtectedProcedure
    .input(z.object({
      orderId: z.number(),
      imageUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      const driver = await getDriverByUserId(ctx.phoneUser.id);
      if (!driver || order.driverId !== driver.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح لك" });
      }

      const { getDb } = await import("../db");
      const { orders } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        await db.update(orders)
          .set({ deliveryProofImageUrl: input.imageUrl, status: "delivered", deliveredAt: new Date() })
          .where(eq(orders.id, input.orderId));
      }

      await updateDriver(driver.id, {
        currentOrders: Math.max(0, driver.currentOrders - 1),
        totalDeliveries: driver.totalDeliveries + 1,
      });

      await createNotification({
        userId: order.userId,
        title: "✅ تم توصيل طلبك!",
        message: `قام المندوب بتوصيل طلبك بنجاح. صورة التسليم مرفقة. يرجى تأكيد الاستلام.`,
        type: "order_update",
        orderId: input.orderId,
        imageUrl: input.imageUrl,
      });

      return { success: true };
    }),

  // Customer: confirm receipt (uses phone auth)
  confirmReceipt: phoneProtectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (order.userId !== ctx.phoneUser.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (order.status !== "delivered") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الطلب لم يُسلَّم بعد" });
      }

      const { getDb } = await import("../db");
      const { orders } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        await db.update(orders)
          .set({ confirmedByCustomerAt: new Date() })
          .where(eq(orders.id, input.orderId));
      }

      return { success: true };
    }),

  // Admin: get unassigned orders (no_driver or manual_needed)
  adminUnassignedOrders: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const { getDb } = await import("../db");
    const { orders, drivers: driversTable, restaurants } = await import("../../drizzle/schema");
    const { inArray, isNull, or, eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return [];
    const result = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        driverAssignStatus: orders.driverAssignStatus,
        driverAssignFailReason: orders.driverAssignFailReason,
        deliveryAddressText: orders.deliveryAddressText,
        total: orders.total,
        createdAt: orders.createdAt,
        restaurantName: restaurants.name,
      })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(
        inArray(orders.driverAssignStatus, ["no_driver", "manual_needed", "pending"])
      )
      .orderBy(orders.createdAt);
    return result;
  }),

  // Admin: manually assign driver and clear assign status
  adminManualAssign: protectedProcedure
    .input(z.object({ orderId: z.number(), driverId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      const driver = await getDriverById(input.driverId);
      if (!driver) throw new TRPCError({ code: "NOT_FOUND", message: "المندوب غير موجود" });

      await updateOrderStatus(input.orderId, "driver_assigned", {
        driverId: input.driverId,
        deliveryFee: driver.deliveryFee ?? "0",
        acceptedAt: new Date(),
      });
      await updateOrderAssignStatus(input.orderId, "assigned");
      await updateDriver(input.driverId, { currentOrders: driver.currentOrders + 1 });

      await createNotification({
        userId: order.userId,
        title: "تم تعيين مندوب لطلبك",
        message: `تم تعيين المندوب ${driver.name} لتوصيل طلبك`,
        type: "driver_assigned",
        orderId: input.orderId,
      });
      return { success: true, driverName: driver.name };
    }),

  // حساب المسافة والوقت عبر Google Maps Distance Matrix API (دقيق)
  calcDistance: phoneProtectedProcedure
    .input(z.object({
      originLat: z.number(),
      originLng: z.number(),
      waypointLat: z.number().optional(),
      waypointLng: z.number().optional(),
      destLat: z.number(),
      destLng: z.number(),
    }))
    .query(async ({ input }) => {
      try {
        const { originLat, originLng, waypointLat, waypointLng, destLat, destLng } = input;
        const hasWaypoint = waypointLat !== undefined && waypointLng !== undefined;
        let totalDistanceM = 0;
        let totalDurationS = 0;
        if (hasWaypoint) {
          const [res1, res2] = await Promise.all([
            makeRequest<DistanceMatrixResult>("/maps/api/distancematrix/json", {
              origins: `${originLat},${originLng}`,
              destinations: `${waypointLat},${waypointLng}`,
              mode: "driving",
              units: "metric",
            }),
            makeRequest<DistanceMatrixResult>("/maps/api/distancematrix/json", {
              origins: `${waypointLat},${waypointLng}`,
              destinations: `${destLat},${destLng}`,
              mode: "driving",
              units: "metric",
            }),
          ]);
          const el1 = res1.rows?.[0]?.elements?.[0];
          const el2 = res2.rows?.[0]?.elements?.[0];
          if (el1?.status === "OK") { totalDistanceM += el1.distance.value; totalDurationS += el1.duration.value; }
          if (el2?.status === "OK") { totalDistanceM += el2.distance.value; totalDurationS += el2.duration.value; }
        } else {
          const res = await makeRequest<DistanceMatrixResult>("/maps/api/distancematrix/json", {
            origins: `${originLat},${originLng}`,
            destinations: `${destLat},${destLng}`,
            mode: "driving",
            units: "metric",
          });
          const el = res.rows?.[0]?.elements?.[0];
          if (el?.status === "OK") { totalDistanceM = el.distance.value; totalDurationS = el.duration.value; }
        }
        if (totalDistanceM === 0) return null;
        return {
          distanceKm: parseFloat((totalDistanceM / 1000).toFixed(2)),
          durationMinutes: Math.ceil(totalDurationS / 60),
        };
      } catch {
        return null;
      }
    }),

  // Admin: cancel order
  adminCancel: protectedProcedure
    .input(z.object({ orderId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const order = await getOrderById(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      await updateOrderStatus(input.orderId, "cancelled", {
        cancelledAt: new Date(),
        cancellationReason: input.reason ?? "تم الإلغاء من قبل الإدارة",
      });
      // تحديث حالة التعيين لإخفائه من بانر التنبيه (نضعه كـ assigned حتى لا يظهر في قائمة غير المعيَّنين)
      await updateOrderAssignStatus(input.orderId, "assigned");
      await createNotification({
        userId: order.userId,
        title: "تم إلغاء طلبك",
        message: input.reason ?? "تم إلغاء طلبك من قبل الإدارة",
        type: "order_update",
        orderId: input.orderId,
      });
      return { success: true };
    }),
});
