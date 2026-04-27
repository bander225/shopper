/**
 * Mobile REST API Router
 * Provides REST endpoints for Flutter mobile app
 * Works alongside existing tRPC without any changes
 */

import { Router, Request, Response } from "express";
import { jwtVerify, SignJWT } from "jose";
import { getDb } from "../db";
import {
  otpVerifications,
  phoneUsers,
  drivers,
  orders,
  orderItems,
  restaurants as restaurantsTable,
  menuItems,
  menuCategories,
  cities,
  streets,
  notifications,
  storePresence,
} from "../../drizzle/schema";
import { eq, and, gt, inArray, desc, or } from "drizzle-orm";
import { sendSmsOtp } from "../_core/sms";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import {
  getOrdersByUser,
  getOrdersByDriver,
  getOrderWithItems,
  updateOrderStatus,
  getDriverByUserId,
  updateDriver,
  createNotification,
  getOrderById,
  getPendingOrders,
  getReadyOrders,
  getRestaurantById,
  getCategoriesByRestaurant,
  getMenuItemsByRestaurant,
  isRestaurantOpenNow,
  getRestaurantHours,
} from "../db";

const PHONE_JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "phone-auth-secret-key-delivery"
);
const OTP_EXPIRY_MINUTES = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  let p = raw.trim().replace(/\s/g, "");
  if (p.startsWith("+966")) p = "0" + p.slice(4);
  else if (p.startsWith("00966")) p = "0" + p.slice(5);
  p = p.replace(/^\+/, "");
  return p;
}

function phoneVariants(phone: string): string[] {
  const norm = normalizePhone(phone);
  const raw = phone.trim().replace(/\s/g, "");
  const variants = new Set<string>();
  variants.add(norm);
  variants.add(raw);
  if (norm.startsWith("0")) {
    variants.add("+966" + norm.slice(1));
    variants.add("00966" + norm.slice(1));
  }
  return Array.from(variants);
}

function generateOTP(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

async function createPhoneToken(userId: number, phone: string, role: string) {
  return new SignJWT({ userId, phone, role, type: "phone" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(PHONE_JWT_SECRET);
}

async function getPhoneUserFromRequest(req: Request): Promise<{ id: number; phone: string; name: string | null; role: string } | null> {
  try {
    const authHeader = req.headers.authorization ?? "";
    if (!authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, PHONE_JWT_SECRET);
    if ((payload as any)?.type !== "phone") return null;
    const db = await getDb();
    if (!db) return null;
    const [user] = await db.select().from(phoneUsers).where(eq(phoneUsers.id, (payload as any).userId)).limit(1);
    if (!user || !user.isActive) return null;
    return { id: user.id, phone: user.phone, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

function ok(res: Response, data: any) {
  return res.json({ success: true, data });
}

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, error: message });
}

// ─── Router ─────────────────────────────────────────────────────────────────

export function createMobileApiRouter(): Router {
  const router = Router();

  // ── Auth ──────────────────────────────────────────────────────────────────

  // POST /api/mobile/auth/send-otp
  router.post("/auth/send-otp", async (req: Request, res: Response) => {
    try {
      const { phone, role = "customer" } = req.body;
      if (!phone) return fail(res, 400, "رقم الجوال مطلوب");

      const db = await getDb();
      if (!db) return fail(res, 500, "قاعدة البيانات غير متاحة");

      const normalizedPhone = normalizePhone(phone);
      const variants = phoneVariants(phone);

      // Verify driver exists
      if (role === "driver") {
        const [driverRecord] = await db.select({ id: drivers.id }).from(drivers).where(inArray(drivers.phone, variants)).limit(1);
        if (!driverRecord) return fail(res, 403, `رقم الجوال ${normalizedPhone} غير مسجّل كمندوب`);
      }

      const isDriver = role === "driver";
      const otp = isDriver ? "000000" : generateOTP();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      await db.update(otpVerifications).set({ isUsed: true }).where(eq(otpVerifications.phone, normalizedPhone));
      await db.insert(otpVerifications).values({ phone: normalizedPhone, otp, expiresAt, isUsed: false });

      if (!isDriver) {
        const smsResult = await sendSmsOtp(normalizedPhone, otp);
        if (!smsResult.success) return fail(res, 500, `فشل إرسال رمز التحقق: ${smsResult.message}`);
      }

      return ok(res, {
        message: isDriver ? "استخدم الرمز الثابت 000000 للدخول" : `تم إرسال رمز التحقق إلى ${normalizedPhone}`,
      });
    } catch (e: any) {
      return fail(res, 500, e.message ?? "خطأ داخلي");
    }
  });

  // POST /api/mobile/auth/verify-otp
  router.post("/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { phone, otp, name, role = "customer" } = req.body;
      if (!phone || !otp) return fail(res, 400, "رقم الجوال ورمز التحقق مطلوبان");

      const db = await getDb();
      if (!db) return fail(res, 500, "قاعدة البيانات غير متاحة");

      const normalizedPhone = normalizePhone(phone);
      const variants = phoneVariants(phone);
      const now = new Date();

      const [record] = await db.select().from(otpVerifications).where(
        and(
          inArray(otpVerifications.phone, variants),
          eq(otpVerifications.otp, otp),
          eq(otpVerifications.isUsed, false),
          gt(otpVerifications.expiresAt, now)
        )
      ).limit(1);

      if (!record) return fail(res, 400, "رمز التحقق غير صحيح أو منتهي الصلاحية");

      await db.update(otpVerifications).set({ isUsed: true }).where(eq(otpVerifications.id, record.id));

      // Get driver name if driver role
      let driverName: string | null = null;
      if (role === "driver") {
        const [driverRow] = await db.select({ name: drivers.name }).from(drivers).where(inArray(drivers.phone, variants)).limit(1);
        if (driverRow?.name) driverName = driverRow.name;
      }

      // Upsert phone user
      const existing = await db.select().from(phoneUsers).where(eq(phoneUsers.phone, normalizedPhone)).limit(1);
      let user: any;
      if (existing.length > 0) {
        user = existing[0];
        const nameToSet = name || driverName;
        if (nameToSet && !user.name) {
          await db.update(phoneUsers).set({ name: nameToSet, updatedAt: new Date() }).where(eq(phoneUsers.id, user.id));
          user = { ...user, name: nameToSet };
        }
      } else {
        const nameToUse = name ?? driverName ?? null;
        await db.insert(phoneUsers).values({ phone: normalizedPhone, name: nameToUse, role, isActive: true });
        const [newUser] = await db.select().from(phoneUsers).where(eq(phoneUsers.phone, normalizedPhone)).limit(1);
        user = newUser;
      }

      if (!user) return fail(res, 500, "فشل إنشاء الحساب");

      const token = await createPhoneToken(user.id, user.phone, user.role);

      return ok(res, {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          addressText: user.addressText,
          addressLat: user.addressLat,
          addressLng: user.addressLng,
        },
      });
    } catch (e: any) {
      return fail(res, 500, e.message ?? "خطأ داخلي");
    }
  });

  // GET /api/mobile/auth/me
  router.get("/auth/me", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    return ok(res, user);
  });

  // ── Cities & Streets ──────────────────────────────────────────────────────

  // GET /api/mobile/cities
  router.get("/cities", async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) return fail(res, 500, "قاعدة البيانات غير متاحة");
      const list = await db.select().from(cities).where(eq(cities.isActive, true));
      return ok(res, list);
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // GET /api/mobile/cities/:cityId/streets
  router.get("/cities/:cityId/streets", async (req: Request, res: Response) => {
    try {
      const cityId = parseInt(req.params.cityId);
      if (isNaN(cityId)) return fail(res, 400, "معرف المدينة غير صحيح");
      const db = await getDb();
      if (!db) return fail(res, 500, "قاعدة البيانات غير متاحة");
      const list = await db.select().from(streets).where(and(eq(streets.cityId, cityId), eq(streets.isActive, true)));
      return ok(res, list);
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // ── Restaurants ───────────────────────────────────────────────────────────

  // GET /api/mobile/restaurants?cityId=1&streetId=2
  router.get("/restaurants", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) return fail(res, 500, "قاعدة البيانات غير متاحة");
      const cityId = req.query.cityId ? parseInt(req.query.cityId as string) : undefined;
      const streetId = req.query.streetId ? parseInt(req.query.streetId as string) : undefined;

      const conditions: any[] = [eq(restaurantsTable.isOpen, true), eq(restaurantsTable.isAcceptingOrders, true)];
      if (cityId) conditions.push(eq(restaurantsTable.cityId as any, cityId));
      if (streetId) conditions.push(eq(restaurantsTable.streetId as any, streetId));

      const list = await db.select().from(restaurantsTable).where(and(...conditions));
      const withHours = await Promise.all(list.map(async (r) => {
        const hours = await getRestaurantHours(r.id);
        const openNow = isRestaurantOpenNow(hours);
        return { ...r, openNow };
      }));
      return ok(res, withHours);
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // GET /api/mobile/restaurants/:id
  router.get("/restaurants/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return fail(res, 400, "معرف المطعم غير صحيح");
      const restaurant = await getRestaurantById(id);
      if (!restaurant) return fail(res, 404, "المطعم غير موجود");
      const categories = await getCategoriesByRestaurant(id);
      const items = await getMenuItemsByRestaurant(id);
      const hours = await getRestaurantHours(id);
      const openNow = isRestaurantOpenNow(hours);
      return ok(res, { ...restaurant, categories, menuItems: items, hours, openNow });
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // ── Orders (Customer) ─────────────────────────────────────────────────────

  // GET /api/mobile/orders/my
  router.get("/orders/my", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const myOrders = await getOrdersByUser(user.id);
      return ok(res, myOrders);
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // GET /api/mobile/orders/:id
  router.get("/orders/:id", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const id = parseInt(req.params.id);
      const order = await getOrderWithItems(id);
      if (!order) return fail(res, 404, "الطلب غير موجود");
      const driver = await getDriverByUserId(user.id);
      const isOwner = order.userId === user.id;
      const isDriver = driver && order.driverId === driver.id;
      if (!isOwner && !isDriver) return fail(res, 403, "غير مصرح");
      return ok(res, order);
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // POST /api/mobile/orders
  router.post("/orders", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const { restaurantId, items, deliveryAddressText, deliveryLat, deliveryLng,
        customerNotes, paymentMethod = "cash", deliveryFee = "0",
        googlePlaceName, googlePlaceId, cityId, streetId } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) return fail(res, 400, "يجب إضافة منتجات للطلب");
      if (!deliveryAddressText) return fail(res, 400, "عنوان التوصيل مطلوب");

      const subtotal = items.reduce((sum: number, item: any) => sum + parseFloat(item.price) * item.quantity, 0);
      const fee = parseFloat(deliveryFee) || 0;
      const total = subtotal + fee;

      const db = await getDb();
      if (!db) return fail(res, 500, "قاعدة البيانات غير متاحة");

      // Create order
      const [orderResult] = await db.insert(orders).values({
        userId: user.id,
        restaurantId: restaurantId ?? 0,
        subtotal: subtotal.toFixed(2),
        deliveryFee: fee.toFixed(2),
        total: total.toFixed(2),
        status: "pending",
        deliveryAddressText,
        deliveryLat,
        deliveryLng,
        customerNotes,
        paymentMethod,
        googlePlaceName,
        googlePlaceId,
        cityId,
        streetId,
      } as any);

      const orderId = (orderResult as any).insertId;

      // Insert order items
      for (const item of items) {
        await db.insert(orderItems).values({
          orderId,
          menuItemId: item.menuItemId ?? 0,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes ?? null,
        } as any);
      }

      return ok(res, { orderId, message: "تم إنشاء الطلب بنجاح" });
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // ── Orders (Driver) ───────────────────────────────────────────────────────

  // GET /api/mobile/driver/orders/available
  router.get("/driver/orders/available", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const driver = await getDriverByUserId(user.id);
      if (!driver) return fail(res, 403, "أنت لست مندوباً مسجلاً");
      if (driver.currentOrders >= driver.maxOrders) {
        return ok(res, { orders: [], limitReached: true, maxOrders: driver.maxOrders, currentOrders: driver.currentOrders });
      }
      const pendingOrders = await getPendingOrders();
      const readyOrders = await getReadyOrders();
      return ok(res, { orders: [...pendingOrders, ...readyOrders], limitReached: false, maxOrders: driver.maxOrders, currentOrders: driver.currentOrders });
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // GET /api/mobile/driver/orders/my
  router.get("/driver/orders/my", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const driver = await getDriverByUserId(user.id);
      if (!driver) return fail(res, 403, "أنت لست مندوباً مسجلاً");
      const driverOrders = await getOrdersByDriver(driver.id);
      return ok(res, driverOrders);
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // GET /api/mobile/driver/profile
  router.get("/driver/profile", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const driver = await getDriverByUserId(user.id);
      if (!driver) return fail(res, 404, "ملف المندوب غير موجود");
      return ok(res, driver);
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // PATCH /api/mobile/driver/location
  router.patch("/driver/location", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const { lat, lng } = req.body;
      if (!lat || !lng) return fail(res, 400, "الإحداثيات مطلوبة");
      const driver = await getDriverByUserId(user.id);
      if (!driver) return fail(res, 403, "أنت لست مندوباً مسجلاً");
      const db = await getDb();
      if (!db) return fail(res, 500, "قاعدة البيانات غير متاحة");
      await db.update(drivers).set({
        currentLat: lat.toString(),
        currentLng: lng.toString(),
        lastLocationUpdate: new Date(),
      }).where(eq(drivers.id, driver.id));
      return ok(res, { updated: true });
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // PATCH /api/mobile/driver/availability
  router.patch("/driver/availability", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const { isAvailable, isOnline } = req.body;
      const driver = await getDriverByUserId(user.id);
      if (!driver) return fail(res, 403, "أنت لست مندوباً مسجلاً");
      const updates: any = {};
      if (isAvailable !== undefined) updates.isAvailable = isAvailable;
      if (isOnline !== undefined) updates.isOnline = isOnline;
      await updateDriver(driver.id, updates);
      return ok(res, { updated: true });
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // POST /api/mobile/driver/orders/:orderId/accept
  router.post("/driver/orders/:orderId/accept", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const orderId = parseInt(req.params.orderId);
      const { deliveryFee = "0" } = req.body;
      const driver = await getDriverByUserId(user.id);
      if (!driver) return fail(res, 403, "أنت لست مندوباً مسجلاً");
      if (driver.currentOrders >= driver.maxOrders) return fail(res, 400, "لقد وصلت للحد الأقصى من الطلبات");
      const order = await getOrderById(orderId);
      if (!order) return fail(res, 404, "الطلب غير موجود");
      if (order.status !== "pending" && order.status !== "ready") return fail(res, 400, "هذا الطلب لم يعد متاحاً");

      await updateOrderStatus(orderId, "driver_assigned", { driverId: driver.id, deliveryFee, acceptedAt: new Date() });
      await updateDriver(driver.id, { currentOrders: driver.currentOrders + 1 });
      await createNotification({ userId: order.userId, title: "تم قبول طلبك", message: `تم قبول طلبك من قبل المندوب. رسوم التوصيل: ${deliveryFee} ريال`, type: "driver_assigned", orderId });
      return ok(res, { success: true });
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // POST /api/mobile/driver/orders/:orderId/status
  router.post("/driver/orders/:orderId/status", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const orderId = parseInt(req.params.orderId);
      const { status, reason, deliveryProofUrl } = req.body;
      const validStatuses = ["preparing", "ready", "picked_up", "on_the_way", "delivered", "cancelled"];
      if (!validStatuses.includes(status)) return fail(res, 400, "حالة غير صحيحة");

      const order = await getOrderById(orderId);
      if (!order) return fail(res, 404, "الطلب غير موجود");
      const driver = await getDriverByUserId(user.id);
      if (!driver || order.driverId !== driver.id) return fail(res, 403, "غير مصرح");

      const extra: Record<string, any> = {};
      if (status === "picked_up") extra.pickedUpAt = new Date();
      if (status === "delivered") {
        extra.deliveredAt = new Date();
        if (deliveryProofUrl) extra.deliveryProofUrl = deliveryProofUrl;
        await updateDriver(driver.id, { currentOrders: Math.max(0, driver.currentOrders - 1), totalDeliveries: driver.totalDeliveries + 1 });
      }
      if (status === "cancelled") {
        extra.cancelledAt = new Date();
        extra.cancellationReason = reason;
        await updateDriver(driver.id, { currentOrders: Math.max(0, driver.currentOrders - 1) });
      }

      await updateOrderStatus(orderId, status, extra);

      const statusMessages: Record<string, string> = {
        preparing: "يتم الآن تحضير طلبك في المطعم",
        ready: "طلبك جاهز وفي انتظار المندوب",
        picked_up: "المندوب استلم طلبك من المطعم",
        on_the_way: "المندوب في الطريق إليك",
        delivered: "تم توصيل طلبك بنجاح!",
        cancelled: `تم إلغاء طلبك${reason ? `: ${reason}` : ""}`,
      };

      await createNotification({ userId: order.userId, title: "تحديث حالة الطلب", message: statusMessages[status] ?? "تم تحديث حالة طلبك", type: "order_update", orderId });
      return ok(res, { success: true });
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // ── Upload ────────────────────────────────────────────────────────────────

  // POST /api/mobile/upload/image
  router.post("/upload/image", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const { base64, folder = "mobile-uploads" } = req.body;
      if (!base64) return fail(res, 400, "الصورة مطلوبة");

      const matches = base64.match(/^data:(.+);base64,(.+)$/);
      if (!matches) return fail(res, 400, "صيغة الصورة غير صحيحة");

      const contentType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");

      if (buffer.length > 10 * 1024 * 1024) return fail(res, 400, "حجم الصورة يجب أن يكون أقل من 10 ميجابايت");

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(contentType)) return fail(res, 400, "نوع الملف غير مدعوم");

      const ext = contentType.split("/")[1] ?? "jpg";
      const uniqueId = nanoid(10);
      const fileName = `${folder}/${user.id}-${uniqueId}.${ext}`;
      const { url } = await storagePut(fileName, buffer, contentType);

      return ok(res, { url, key: fileName });
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // ── Notifications ─────────────────────────────────────────────────────────

  // GET /api/mobile/notifications
  router.get("/notifications", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const db = await getDb();
      if (!db) return fail(res, 500, "قاعدة البيانات غير متاحة");
      const list = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(50);
      return ok(res, list);
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // PATCH /api/mobile/notifications/:id/read
  router.patch("/notifications/:id/read", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const id = parseInt(req.params.id);
      const db = await getDb();
      if (!db) return fail(res, 500, "قاعدة البيانات غير متاحة");
      await db.update(notifications).set({ isRead: true } as any).where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
      return ok(res, { updated: true });
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // ── FCM Token ─────────────────────────────────────────────────────────────

  // POST /api/mobile/fcm-token
  router.post("/fcm-token", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const { token } = req.body;
      if (!token) return fail(res, 400, "رمز FCM مطلوب");
      const db = await getDb();
      if (!db) return fail(res, 500, "قاعدة البيانات غير متاحة");
      await db.update(phoneUsers).set({ fcmToken: token } as any).where(eq(phoneUsers.id, user.id));
      return ok(res, { saved: true });
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  // ── Driver Live Location for Customer ────────────────────────────────────

  // GET /api/mobile/orders/:orderId/driver-location
  router.get("/orders/:orderId/driver-location", async (req: Request, res: Response) => {
    const user = await getPhoneUserFromRequest(req);
    if (!user) return fail(res, 401, "غير مصرح");
    try {
      const orderId = parseInt(req.params.orderId);
      const order = await getOrderById(orderId);
      if (!order) return fail(res, 404, "الطلب غير موجود");
      if (order.userId !== user.id) return fail(res, 403, "غير مصرح");
      if (!order.driverId) return ok(res, null);

      const db = await getDb();
      if (!db) return fail(res, 500, "قاعدة البيانات غير متاحة");
      const [driver] = await db.select({
        id: drivers.id,
        name: drivers.name,
        phone: drivers.phone,
        currentLat: drivers.currentLat,
        currentLng: drivers.currentLng,
        lastLocationUpdate: drivers.lastLocationUpdate,
      }).from(drivers).where(eq(drivers.id, order.driverId)).limit(1);

      return ok(res, driver ?? null);
    } catch (e: any) {
      return fail(res, 500, e.message);
    }
  });

  return router;
}
