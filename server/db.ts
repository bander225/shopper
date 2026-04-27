import { and, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Driver,
  InsertDriver,
  InsertMenuItem,
  InsertMenuCategory,
  InsertNotification,
  InsertOrder,
  InsertOrderItem,
  InsertRestaurant,
  InsertRestaurantHours,
  InsertUser,
  MenuItem,
  MenuCategory,
  Notification,
  Order,
  OrderItem,
  Restaurant,
  RestaurantHours,
  drivers,
  menuCategories,
  menuItems,
  notifications,
  orderItems,
  orders,
  otpVerifications,
  restaurantHours,
  restaurants,
  users,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== USER HELPERS =====
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const fields = ["name", "email", "loginMethod", "phone"] as const;
  for (const field of fields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }

  values.lastSignedIn = new Date();
  updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserProfile(userId: number, data: {
  name?: string;
  phone?: string;
  addressText?: string;
  addressLat?: string;
  addressLng?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ===== OTP HELPERS =====
export async function createOtp(phone: string, otp: string) {
  const db = await getDb();
  if (!db) return;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await db.insert(otpVerifications).values({ phone, otp, expiresAt });
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(otpVerifications)
    .where(
      and(
        eq(otpVerifications.phone, phone),
        eq(otpVerifications.otp, otp),
        eq(otpVerifications.isUsed, false),
        gte(otpVerifications.expiresAt, new Date())
      )
    )
    .limit(1);

  if (result.length === 0) return false;
  await db.update(otpVerifications).set({ isUsed: true }).where(eq(otpVerifications.id, result[0].id));
  return true;
}

// ===== RESTAURANT HELPERS =====
export async function getAllRestaurants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(restaurants).orderBy(desc(restaurants.createdAt));
}

export async function getActiveRestaurants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(restaurants).where(and(eq(restaurants.isOpen, true), eq(restaurants.isAcceptingOrders, true)));
}

export async function getRestaurantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
  return result[0];
}

export async function createRestaurant(data: InsertRestaurant) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(restaurants).values(data);
  return result;
}

export async function updateRestaurant(id: number, data: Partial<InsertRestaurant>) {
  const db = await getDb();
  if (!db) return;
  await db.update(restaurants).set(data).where(eq(restaurants.id, id));
}

export async function deleteRestaurant(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(restaurants).where(eq(restaurants.id, id));
}

export async function toggleRestaurantOrders(id: number, isAcceptingOrders: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(restaurants).set({ isAcceptingOrders }).where(eq(restaurants.id, id));
}

// ===== MENU CATEGORY HELPERS =====
export async function getCategoriesByRestaurant(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuCategories).where(eq(menuCategories.restaurantId, restaurantId)).orderBy(menuCategories.sortOrder);
}

export async function createCategory(data: InsertMenuCategory) {
  const db = await getDb();
  if (!db) return;
  await db.insert(menuCategories).values(data);
}

export async function updateCategory(id: number, data: Partial<InsertMenuCategory>) {
  const db = await getDb();
  if (!db) return;
  await db.update(menuCategories).set(data).where(eq(menuCategories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(menuCategories).where(eq(menuCategories.id, id));
}

// ===== MENU ITEM HELPERS =====
export async function getMenuItemsByRestaurant(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId)).orderBy(menuItems.sortOrder);
}

export async function getMenuItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(menuItems).where(eq(menuItems.id, id)).limit(1);
  return result[0];
}

export async function createMenuItem(data: InsertMenuItem) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(menuItems).values(data);
  return { id: Number(result[0].insertId) };
}

export async function updateMenuItem(id: number, data: Partial<InsertMenuItem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(menuItems).set(data).where(eq(menuItems.id, id));
}

export async function deleteMenuItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(menuItems).where(eq(menuItems.id, id));
}

export async function setMenuItemStock(id: number, stockEnabled: boolean, stockCount: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(menuItems).set({ stockEnabled, stockCount }).where(eq(menuItems.id, id));
}

export async function decrementMenuItemStock(id: number, quantity: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(menuItems)
    .set({ stockCount: sql`GREATEST(0, stockCount - ${quantity})` })
    .where(eq(menuItems.id, id));
}

// ===== ORDER HELPERS =====
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export async function createOrder(data: InsertOrder, items: InsertOrderItem[]) {
  const db = await getDb();
  if (!db) return undefined;

  const orderNumber = generateOrderNumber();
  const result = await db.insert(orders).values({ ...data, orderNumber });
  const insertId = (result as any)[0]?.insertId;

  if (insertId && items.length > 0) {
    const orderItemsData = items.map(item => ({ ...item, orderId: insertId }));
    await db.insert(orderItems).values(orderItemsData);
  }

  return { orderId: insertId, orderNumber };
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function getOrderWithItems(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const order = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order[0]) return undefined;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  // Fetch driver info if assigned
  let driverName: string | null = null;
  let driverPhone: string | null = null;
  let driverCurrentLat: string | null = null;
  let driverCurrentLng: string | null = null;
  if (order[0].driverId) {
    const { phoneUsers } = await import("../drizzle/schema");
    const driverRow = await db.select({ name: drivers.name, userId: drivers.userId, currentLat: drivers.currentLat, currentLng: drivers.currentLng }).from(drivers).where(eq(drivers.id, order[0].driverId)).limit(1);
    if (driverRow[0]) {
      driverName = driverRow[0].name;
      driverCurrentLat = driverRow[0].currentLat;
      driverCurrentLng = driverRow[0].currentLng;
      const userRow = await db.select({ phone: phoneUsers.phone }).from(phoneUsers).where(eq(phoneUsers.id, driverRow[0].userId)).limit(1);
      if (userRow[0]) driverPhone = userRow[0].phone;
    }
  }
  // Fetch batch info if order belongs to a batch
  let batchInfo: { currentCount: number; maxOrders: number; status: string } | null = null;
  if (order[0].batchId) {
    const { driverBatches } = await import("../drizzle/schema");
    const batchRow = await db
      .select({ currentCount: driverBatches.currentCount, maxOrders: driverBatches.maxOrders, status: driverBatches.status })
      .from(driverBatches)
      .where(eq(driverBatches.id, order[0].batchId))
      .limit(1);
    if (batchRow[0]) batchInfo = batchRow[0];
  }
  // Fetch restaurant name
  let restaurantName: string | null = null;
  if (order[0].googlePlaceName) {
    restaurantName = order[0].googlePlaceName;
  } else if (order[0].restaurantId) {
    const { restaurants } = await import("../drizzle/schema");
    const restRow = await db.select({ name: restaurants.name }).from(restaurants).where(eq(restaurants.id, order[0].restaurantId)).limit(1);
    if (restRow[0]) restaurantName = restRow[0].name;
  }
  return { ...order[0], items, driverName, driverPhone, driverCurrentLat, driverCurrentLng, batchInfo, restaurantName };
}

export async function getOrdersByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { restaurants, googlePlaceRestaurants } = await import("../drizzle/schema");
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      deliveryFee: orders.deliveryFee,
      paymentMethod: orders.paymentMethod,
      deliveryAddressText: orders.deliveryAddressText,
      deliveryLat: orders.deliveryLat,
      deliveryLng: orders.deliveryLng,
      customerNotes: orders.customerNotes,
      deliveryProofImageUrl: orders.deliveryProofImageUrl,
      confirmedByCustomerAt: orders.confirmedByCustomerAt,
      driverAssignedAt: orders.driverAssignedAt,
      pickedUpAt: orders.pickedUpAt,
      onTheWayAt: orders.onTheWayAt,
      deliveredAt: orders.deliveredAt,
      createdAt: orders.createdAt,
      googlePlaceName: orders.googlePlaceName,
      googlePlaceId: orders.googlePlaceId,
      restaurantId: orders.restaurantId,
      driverId: orders.driverId,
      userId: orders.userId,
      restaurantName: restaurants.name,
    })
    .from(orders)
    .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
  // Use googlePlaceName as restaurantName when applicable
  return rows.map(row => ({
    ...row,
    restaurantName: row.googlePlaceName ?? row.restaurantName ?? null,
  }));
}

export async function getOrdersByDriver(driverId: number) {
  const db = await getDb();
  if (!db) return [];
  const { phoneUsers, restaurants, googlePlaceRestaurants } = await import("../drizzle/schema");
  const rows = await db
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
      deliveryProofImageUrl: orders.deliveryProofImageUrl,
      confirmedByCustomerAt: orders.confirmedByCustomerAt,
      driverAssignedAt: orders.driverAssignedAt,
      pickedUpAt: orders.pickedUpAt,
      onTheWayAt: orders.onTheWayAt,
      deliveredAt: orders.deliveredAt,
      createdAt: orders.createdAt,
      googlePlaceName: orders.googlePlaceName,
      googlePlaceId: orders.googlePlaceId,
      customerName: phoneUsers.name,
      customerPhone: phoneUsers.phone,
      restaurantName: restaurants.name,
      restaurantAddress: restaurants.addressText,
    })
    .from(orders)
    .leftJoin(phoneUsers, eq(orders.userId, phoneUsers.id))
    .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(eq(orders.driverId, driverId))
    .orderBy(desc(orders.createdAt));

  // Enrich with Google Place Maps URL if applicable
  const enriched = await Promise.all(rows.map(async (row) => {
    if (row.googlePlaceName && row.googlePlaceId) {
      const placeRow = await db.select({ googleMapsUrl: googlePlaceRestaurants.googleMapsUrl, address: googlePlaceRestaurants.address })
        .from(googlePlaceRestaurants)
        .where(eq(googlePlaceRestaurants.placeId, row.googlePlaceId))
        .limit(1);
      return {
        ...row,
        restaurantMapsUrl: placeRow[0]?.googleMapsUrl ?? null,
        restaurantAddress: placeRow[0]?.address ?? row.restaurantAddress,
      };
    }
    return { ...row, restaurantMapsUrl: null };
  }));
  return enriched;
}

export async function getPendingOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.status, "pending")).orderBy(desc(orders.createdAt));
}

export async function getReadyOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.status, "ready")).orderBy(desc(orders.createdAt));
}

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  const { phoneUsers, restaurants, drivers: driversTable } = await import("../drizzle/schema");
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      subtotal: orders.subtotal,
      deliveryFee: orders.deliveryFee,
      total: orders.total,
      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,
      deliveryAddressText: orders.deliveryAddressText,
      deliveryLat: orders.deliveryLat,
      deliveryLng: orders.deliveryLng,
      customerNotes: orders.customerNotes,
      deliveryProofImageUrl: orders.deliveryProofImageUrl,
      confirmedByCustomerAt: orders.confirmedByCustomerAt,
      driverAssignedAt: orders.driverAssignedAt,
      pickedUpAt: orders.pickedUpAt,
      onTheWayAt: orders.onTheWayAt,
      deliveredAt: orders.deliveredAt,
      cancelledAt: orders.cancelledAt,
      cancellationReason: orders.cancellationReason,
      createdAt: orders.createdAt,
      googlePlaceName: orders.googlePlaceName,
      googlePlaceId: orders.googlePlaceId,
      restaurantId: orders.restaurantId,
      driverId: orders.driverId,
      userId: orders.userId,
      restaurantName: restaurants.name,
      customerName: phoneUsers.name,
      customerPhone: phoneUsers.phone,
      driverName: driversTable.name,
    })
    .from(orders)
    .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .leftJoin(phoneUsers, eq(orders.userId, phoneUsers.id))
    .leftJoin(driversTable, eq(orders.driverId, driversTable.id))
    .orderBy(desc(orders.createdAt));
  // Use googlePlaceName as restaurantName when applicable
  return rows.map(row => ({
    ...row,
    restaurantName: row.googlePlaceName ?? row.restaurantName ?? null,
  }));
}

export async function updateOrderStatus(
  id: number,
  status: Order["status"],
  extra?: {
    driverId?: number;
    deliveryFee?: string;
    acceptedAt?: Date;
    pickedUpAt?: Date;
    deliveredAt?: Date;
    cancelledAt?: Date;
    cancellationReason?: string;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ status, ...extra }).where(eq(orders.id, id));
}

export async function updateOrderAssignStatus(
  id: number,
  status: "pending" | "assigned" | "no_driver" | "manual_needed",
  failReason?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ driverAssignStatus: status, driverAssignFailReason: failReason ?? null }).where(eq(orders.id, id));
}

export async function updateOrderPayment(id: number, data: {
  paymentStatus: Order["paymentStatus"];
  stripePaymentIntentId?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set(data).where(eq(orders.id, id));
}

// ===== DRIVER HELPERS =====
export async function getDriverByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(drivers).where(eq(drivers.userId, userId)).limit(1);
  return result[0];
}

export async function getDriverById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
  return result[0];
}

export async function getAllDrivers() {
  const db = await getDb();
  if (!db) return [];
  // Join with phoneUsers to get the real isOnline status (source of truth)
  const { phoneUsers, cities, streets } = await import("../drizzle/schema");
  const rows = await db.select({
    id: drivers.id,
    userId: drivers.userId,
    name: drivers.name,
    phone: drivers.phone,
    whatsappNumber: drivers.whatsappNumber,
    deliveryFee: drivers.deliveryFee,
    maxOrders: drivers.maxOrders,
    currentOrders: drivers.currentOrders,
    isAvailable: drivers.isAvailable,
    // isOnline from phoneUsers is the source of truth
    isOnline: phoneUsers.isOnline,
    currentLat: drivers.currentLat,
    currentLng: drivers.currentLng,
    lastLocationUpdate: drivers.lastLocationUpdate,
    rating: drivers.rating,
    totalDeliveries: drivers.totalDeliveries,
    cityId: drivers.cityId,
    streetId: drivers.streetId,
    inRestaurantId: drivers.inRestaurantId,
    inRestaurantSince: drivers.inRestaurantSince,
    createdAt: drivers.createdAt,
    updatedAt: drivers.updatedAt,
    // City and street names from phoneUsers location
    currentCityName: phoneUsers.currentCityName,
    cityName: cities.name,
    streetName: streets.name,
  })
    .from(drivers)
    .leftJoin(phoneUsers, eq(drivers.userId, phoneUsers.id))
    .leftJoin(cities, eq(phoneUsers.cityId, cities.id))
    .leftJoin(streets, eq(phoneUsers.streetId, streets.id))
    .orderBy(desc(drivers.createdAt));
  // Map null isOnline to false (for drivers without phoneUsers link)
  return rows.map(r => ({ ...r, isOnline: r.isOnline ?? false }));
}
export async function getAvailableDrivers() {
  const db = await getDb();
  if (!db) return [];
  // Join with phoneUsers to check real isOnline status
  const { phoneUsers } = await import("../drizzle/schema");
  const rows = await db.select({
    id: drivers.id,
    userId: drivers.userId,
    name: drivers.name,
    phone: drivers.phone,
    isAvailable: drivers.isAvailable,
    isOnline: phoneUsers.isOnline,
    cityId: phoneUsers.cityId,
    streetId: phoneUsers.streetId,
    maxOrders: drivers.maxOrders,
    currentOrders: drivers.currentOrders,
  })
    .from(drivers)
    .leftJoin(phoneUsers, eq(drivers.userId, phoneUsers.id))
    .where(and(eq(drivers.isAvailable, true), eq(phoneUsers.isOnline, true)));
  return rows;
}

export async function createDriver(data: InsertDriver) {
  const db = await getDb();
  if (!db) return;
  await db.insert(drivers).values(data);
}

export async function updateDriver(id: number, data: Partial<InsertDriver>) {
  const db = await getDb();
  if (!db) return;
  await db.update(drivers).set(data).where(eq(drivers.id, id));
}

export async function updateDriverLocation(driverId: number, lat: string, lng: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(drivers).set({
    currentLat: lat,
    currentLng: lng,
    lastLocationUpdate: new Date(),
  }).where(eq(drivers.id, driverId));
}

export async function updateDriverAvailability(driverId: number, isAvailable: boolean, isOnline: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(drivers).set({ isAvailable, isOnline }).where(eq(drivers.id, driverId));
}

// ===== NOTIFICATION HELPERS =====
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}

// ===== RESTAURANT HOURS HELPERS =====
export async function getRestaurantHours(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(restaurantHours).where(eq(restaurantHours.restaurantId, restaurantId)).orderBy(restaurantHours.dayOfWeek);
}

export async function upsertRestaurantHours(restaurantId: number, hours: { dayOfWeek: number; isClosed: boolean; openTime?: string; closeTime?: string }[]) {
  const db = await getDb();
  if (!db) return;
  // Delete existing and re-insert
  await db.delete(restaurantHours).where(eq(restaurantHours.restaurantId, restaurantId));
  if (hours.length > 0) {
    await db.insert(restaurantHours).values(
      hours.map(h => ({ restaurantId, ...h }))
    );
  }
}

export function isRestaurantOpenNow(hours: RestaurantHours[]): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayHours = hours.find(h => h.dayOfWeek === dayOfWeek);
  if (!todayHours) return true; // No hours set = always open
  if (todayHours.isClosed) return false;
  if (!todayHours.openTime || !todayHours.closeTime) return true;
  return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
}
