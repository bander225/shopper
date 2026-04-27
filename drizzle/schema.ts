import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
} from "drizzle-orm/mysql-core";

// ===== CITIES TABLE =====
export const cities = mysqlTable("cities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isCovered: boolean("isCovered").default(false).notNull(), // هل المدينة مغطاة بالتوصيل
  sortOrder: int("sortOrder").default(0).notNull(),
  deliveryFee: decimal("deliveryFee", { precision: 8, scale: 2 }).default("0").notNull(),
  // إحداثيات مركز المدينة (للتحقق من التغطية بناءً على المسافة)
  centerLat: decimal("centerLat", { precision: 10, scale: 7 }),
  centerLng: decimal("centerLng", { precision: 10, scale: 7 }),
  radiusKm: decimal("radiusKm", { precision: 6, scale: 2 }).default("10"), // نطاق التغطية بالكيلومتر
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type City = typeof cities.$inferSelect;
export type InsertCity = typeof cities.$inferInsert;

// ===== NEIGHBORHOODS TABLE =====
export const neighborhoods = mysqlTable("neighborhoods", {
  id: int("id").autoincrement().primaryKey(),
  cityId: int("cityId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Neighborhood = typeof neighborhoods.$inferSelect;
export type InsertNeighborhood = typeof neighborhoods.$inferInsert;

// ===== USERS TABLE =====
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "driver"]).default("user").notNull(),
  // Address info
  addressText: text("addressText"),
  addressLat: decimal("addressLat", { precision: 10, scale: 7 }),
  addressLng: decimal("addressLng", { precision: 10, scale: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ===== DRIVERS TABLE =====
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  deliveryFee: decimal("deliveryFee", { precision: 8, scale: 2 }).default("0"),
  // Max orders driver wants to handle at once
  maxOrders: int("maxOrders").default(5).notNull(),
  currentOrders: int("currentOrders").default(0).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  isOnline: boolean("isOnline").default(false).notNull(),
  // Current location
  currentLat: decimal("currentLat", { precision: 10, scale: 7 }),
  currentLng: decimal("currentLng", { precision: 10, scale: 7 }),
  lastLocationUpdate: timestamp("lastLocationUpdate"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00"),
  totalDeliveries: int("totalDeliveries").default(0).notNull(),
  // WhatsApp number for customer contact (can differ from main phone)
  whatsappNumber: varchar("whatsappNumber", { length: 20 }),
  // City & street the driver works in
  cityId: int("cityId"),
  streetId: int("streetId"),
  // Which restaurant the driver is currently inside (null = not in any restaurant)
  inRestaurantId: int("inRestaurantId"),
  inRestaurantSince: timestamp("inRestaurantSince"),
  // بيانات التحقق الرسمية (هوية ، رخصة ، سيارة)
  nationalId: varchar("nationalId", { length: 20 }),
  licenseNumber: varchar("licenseNumber", { length: 50 }),
  licenseExpiry: varchar("licenseExpiry", { length: 20 }),
  vehiclePlate: varchar("vehiclePlate", { length: 20 }),
  vehicleModel: varchar("vehicleModel", { length: 100 }),
  vehicleYear: varchar("vehicleYear", { length: 10 }),
  vehicleColor: varchar("vehicleColor", { length: 50 }),
  verificationStatus: varchar("verificationStatus", { length: 20 }).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Driver = typeof drivers.$inferSelect;;
export type InsertDriver = typeof drivers.$inferInsert;

// ===== STREETS TABLE =====
export const streets = mysqlTable("streets", {
  id: int("id").autoincrement().primaryKey(),
  cityId: int("cityId").notNull(),
  name: varchar("name", { length: 150 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Street = typeof streets.$inferSelect;
export type InsertStreet = typeof streets.$inferInsert;

// ===== RESTAURANTS TABLE =====
export const restaurants = mysqlTable("restaurants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  coverImageUrl: text("coverImageUrl"),
  logoUrl: text("logoUrl"),
  menuImageUrl: text("menuImageUrl"),
  phone: varchar("phone", { length: 20 }),
  addressText: text("addressText"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  googleMapsUrl: text("googleMapsUrl"),
  cityId: int("cityId"),
  streetId: int("streetId"),
  cuisine: varchar("cuisine", { length: 100 }),
  openingHours: varchar("openingHours", { length: 100 }),
  isOpen: boolean("isOpen").default(true).notNull(),
  isAcceptingOrders: boolean("isAcceptingOrders").default(true).notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00"),
  totalOrders: int("totalOrders").default(0).notNull(),
  minOrderAmount: decimal("minOrderAmount", { precision: 8, scale: 2 }).default("0"),
  estimatedDeliveryTime: int("estimatedDeliveryTime").default(30),
  // حقول الخصم
  discountEnabled: boolean("discountEnabled").default(false).notNull(),
  discountPercent: int("discountPercent").default(0),
  discountLabel: varchar("discountLabel", { length: 100 }),
  discountExpiresAt: timestamp("discountExpiresAt"),
  // وضع تعيين المندوب: manual=يدوي، street=أول متاح في الشارع، nearest=أقرب موقعاً
  driverAssignMode: mysqlEnum("driverAssignMode", ["manual", "street", "nearest"]).default("manual").notNull(),
  // حافظات الطعام والمشروبات
  hasHotBag: boolean("hasHotBag").default(false).notNull(),
  hasColdBag: boolean("hasColdBag").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = typeof restaurants.$inferInsert;

// ===== MENU CATEGORIES TABLE =====
export const menuCategories = mysqlTable("menuCategories", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MenuCategory = typeof menuCategories.$inferSelect;
export type InsertMenuCategory = typeof menuCategories.$inferInsert;

// ===== MENU ITEMS TABLE =====
export const menuItems = mysqlTable("menuItems", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull(),
  categoryId: int("categoryId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 8, scale: 2 }).notNull(),
  discountPrice: decimal("discountPrice", { precision: 8, scale: 2 }),
  imageUrl: text("imageUrl"),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  // نظام المخزون
  stockEnabled: boolean("stockEnabled").default(false).notNull(), // هل المخزون مفعّل لهذا الصنف
  stockCount: int("stockCount").default(0).notNull(), // الكمية المتاحة في المخزون
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MenuItem = typeof menuItems.$inferSelect;;
export type InsertMenuItem = typeof menuItems.$inferInsert;

// ===== ORDERS TABLE =====
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 20 }).notNull().default("").unique(),
  userId: int("userId").notNull(),
  restaurantId: int("restaurantId").notNull(),
  driverId: int("driverId"),
  status: mysqlEnum("status", [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "driver_assigned",
    "picked_up",
    "on_the_way",
    "delivered",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  // Pricing
  subtotal: decimal("subtotal", { precision: 8, scale: 2 }).notNull(),
  deliveryFee: decimal("deliveryFee", { precision: 8, scale: 2 }).default("0"),
  total: decimal("total", { precision: 8, scale: 2 }).notNull(),
  // Payment
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "stripe"]).default("cash").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "failed", "refunded"]).default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  // City & neighborhood
  fromCityId: int("fromCityId"),
  toNeighborhoodId: int("toNeighborhoodId"),
  // Delivery address
  deliveryAddressText: text("deliveryAddressText").notNull(),
  deliveryLat: decimal("deliveryLat", { precision: 10, scale: 7 }),
  deliveryLng: decimal("deliveryLng", { precision: 10, scale: 7 }),
  // Notes
  customerNotes: text("customerNotes"),
  // Delivery proof
  deliveryProofImageUrl: text("deliveryProofImageUrl"),
  confirmedByCustomerAt: timestamp("confirmedByCustomerAt"),
  // Timestamps
  estimatedDeliveryTime: timestamp("estimatedDeliveryTime"),
  acceptedAt: timestamp("acceptedAt"),
  preparingAt: timestamp("preparingAt"),
  readyAt: timestamp("readyAt"),
  driverAssignedAt: timestamp("driverAssignedAt"),
  pickedUpAt: timestamp("pickedUpAt"),
  onTheWayAt: timestamp("onTheWayAt"),
  deliveredAt: timestamp("deliveredAt"),
  cancelledAt: timestamp("cancelledAt"),
  cancellationReason: text("cancellationReason"),
  // Google Maps place (for orders from external restaurants)
  googlePlaceName: varchar("googlePlaceName", { length: 255 }),
  googlePlaceId: varchar("googlePlaceId", { length: 255 }),
  // Batch reference (for collective delivery)
  batchId: int("batchId"),
  // Round reference (for round-based collective delivery)
  roundId: int("roundId"),
  // Driver assignment result
  driverAssignStatus: mysqlEnum("driverAssignStatus", ["pending", "assigned", "no_driver", "manual_needed"]).default("pending"),
  driverAssignFailReason: text("driverAssignFailReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ===== ORDER ITEMS TABLE =====
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  menuItemId: int("menuItemId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 8, scale: 2 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ===== NOTIFICATIONS TABLE =====
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["order_update", "new_order", "driver_assigned", "delivery_update", "system"]).default("system").notNull(),
  orderId: int("orderId"),
  imageUrl: text("imageUrl"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ===== RESTAURANT WORKING HOURS TABLE =====
export const restaurantHours = mysqlTable("restaurantHours", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull(),
  // 0=Sunday, 1=Monday, ..., 6=Saturday
  dayOfWeek: int("dayOfWeek").notNull(),
  isClosed: boolean("isClosed").default(false).notNull(),
  openTime: varchar("openTime", { length: 5 }), // e.g. "09:00"
  closeTime: varchar("closeTime", { length: 5 }), // e.g. "23:00"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RestaurantHours = typeof restaurantHours.$inferSelect;
export type InsertRestaurantHours = typeof restaurantHours.$inferInsert;

// ===== OTP VERIFICATIONS TABLE =====
export const otpVerifications = mysqlTable("otpVerifications", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  otp: varchar("otp", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  isUsed: boolean("isUsed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OtpVerification = typeof otpVerifications.$inferSelect;

// ===== PHONE USERS TABLE =====
// Users who sign in with phone number only (no OAuth)
export const phoneUsers = mysqlTable("phoneUsers", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  role: mysqlEnum("role", ["customer", "driver"]).default("customer").notNull(),
  addressText: text("addressText"),
  addressLat: decimal("addressLat", { precision: 10, scale: 7 }),
  addressLng: decimal("addressLng", { precision: 10, scale: 7 }),
  // Saved door image for delivery
  doorImageUrl: text("doorImageUrl"),
  // Pinned address (saved for quick reuse)
  pinnedAddressText: text("pinnedAddressText"),
  pinnedAddressLat: decimal("pinnedAddressLat", { precision: 10, scale: 7 }),
  pinnedAddressLng: decimal("pinnedAddressLng", { precision: 10, scale: 7 }),
  // City of the pinned/delivery address (for filtering trips by city name)
  pinnedAddressCityId: int("pinnedAddressCityId"),
  pinnedAddressCityName: varchar("pinnedAddressCityName", { length: 150 }),
  // Driver's current GPS city (auto-detected on login)
  currentCityName: varchar("currentCityName", { length: 150 }),
  currentLat: varchar("currentLat", { length: 30 }),
  currentLng: varchar("currentLng", { length: 30 }),
  // City & street the driver works in (set when going online)
  cityId: int("cityId"),
  streetId: int("streetId"),
  // Driver online/availability status
  isOnline: boolean("isOnline").default(false).notNull(),
  lastOnlineAt: timestamp("lastOnlineAt"),
  isActive: boolean("isActive").default(true).notNull(),
  // موافقة العميل على الشروط وسياسة الخصوصية
  termsAccepted: boolean("termsAccepted").default(false).notNull(),
  termsAcceptedAt: timestamp("termsAcceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PhoneUser = typeof phoneUsers.$inferSelect;
export type InsertPhoneUser = typeof phoneUsers.$inferInsert;

// ===== DRIVER ORDER REQUESTS TABLE =====
// ===== STORE PRESENCE TABLE =====
// Tracks customers currently browsing a restaurant (heartbeat every 30s)
export const storePresence = mysqlTable("storePresence", {
  id: int("id").autoincrement().primaryKey(),
  restaurantId: int("restaurantId").notNull(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(), // anonymous session token
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
});
export type StorePresence = typeof storePresence.$inferSelect;

// ===== DRIVER BATCHES TABLE =====
// A batch groups multiple orders for a single driver trip (collective delivery)
export const driverBatches = mysqlTable("driverBatches", {
  id: int("id").autoincrement().primaryKey(),
  driverUserId: int("driverUserId").notNull(), // phoneUsers.id of the driver
  maxOrders: int("maxOrders").notNull(),        // how many orders this batch expects
  currentCount: int("currentCount").default(0).notNull(), // orders added so far
  status: mysqlEnum("status", ["collecting", "full", "dispatched", "completed", "cancelled"])
    .default("collecting")
    .notNull(),
  cityId: int("cityId").notNull(),
  streetId: int("streetId").notNull(),
  dispatchedAt: timestamp("dispatchedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DriverBatch = typeof driverBatches.$inferSelect;
export type InsertDriverBatch = typeof driverBatches.$inferInsert;

// ===== DELIVERY ROUNDS TABLE =====
// A round is a collection cycle: driver collects N orders then departs for delivery
export const deliveryRounds = mysqlTable("deliveryRounds", {
  id: int("id").autoincrement().primaryKey(),
  driverUserId: int("driverUserId").notNull(),   // phoneUsers.id of the driver
  cityId: int("cityId").notNull(),
  streetId: int("streetId").notNull(),
  maxOrders: int("maxOrders").notNull(),           // target order count for this round
  minOrders: int("minOrders").default(1).notNull(),  // minimum orders before driver can depart
  waitMinutes: int("waitMinutes").default(60).notNull(), // max wait time in minutes before driver decides
  currentCount: int("currentCount").default(0).notNull(), // orders collected so far
  status: mysqlEnum("roundStatus", ["collecting", "departed", "returned", "completed", "cancelled"])
    .default("collecting")
    .notNull(),
  // Scheduled departure time (optional — driver can also depart manually)
  scheduledDepartAt: timestamp("scheduledDepartAt"),
  departedAt: timestamp("departedAt"),
  returnedAt: timestamp("returnedAt"),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DeliveryRound = typeof deliveryRounds.$inferSelect;
export type InsertDeliveryRound = typeof deliveryRounds.$inferInsert;

// ===== DRIVER COVERAGE TABLE =====
// Each row = one city+street the driver is willing to serve
// A driver can have multiple rows (multiple cities/streets)
export const driverCoverage = mysqlTable("driverCoverage", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),        // drivers.id
  cityId: int("cityId").notNull(),
  streetId: int("streetId"),                  // null = covers entire city
  isCurrentLocation: boolean("isCurrentLocation").default(false).notNull(), // الشارع الذي يتواجد به الآن
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DriverCoverage = typeof driverCoverage.$inferSelect;
export type InsertDriverCoverage = typeof driverCoverage.$inferInsert;

// Polygon-based coverage zones for each driver (drawn by admin on map)
export const driverCoverageZones = mysqlTable("driverCoverageZones", {
  id: int("id").autoincrement().primaryKey(),
  driverUserId: int("driverUserId").notNull(), // phoneUsers.id of the driver
  name: varchar("name", { length: 255 }).default("منطقة التغطية").notNull(),
  // GeoJSON polygon stored as JSON string: [[lng,lat],[lng,lat],...] (ring of coordinates)
  polygon: text("polygon").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DriverCoverageZone = typeof driverCoverageZones.$inferSelect;
export type InsertDriverCoverageZone = typeof driverCoverageZones.$inferInsert;

// When a new order is created, a request is sent to all available drivers in the same city+street
export const driverOrderRequests = mysqlTable("driverOrderRequests", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  driverUserId: int("driverUserId").notNull(), // phoneUsers.id of the driver
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "expired", "cancelled"])
    .default("pending")
    .notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
  expiresAt: timestamp("expiresAt").notNull(), // request expires after 60 seconds
});

export type DriverOrderRequest = typeof driverOrderRequests.$inferSelect;
export type InsertDriverOrderRequest = typeof driverOrderRequests.$inferInsert;

// ===== GOOGLE PLACE RESTAURANTS TABLE =====
// Restaurants discovered from Google Maps and managed by admin
export const googlePlaceRestaurants = mysqlTable("googlePlaceRestaurants", {
  id: int("id").autoincrement().primaryKey(),
  placeId: varchar("placeId", { length: 255 }).notNull().unique(), // Google Place ID
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  cityId: int("cityId"),
  streetId: int("streetId"),
  photoRef: text("photoRef"), // Google photo reference
  rating: decimal("rating", { precision: 3, scale: 2 }),
  userRatingsTotal: int("userRatingsTotal").default(0),
  types: text("types"), // JSON array of place types
  isActive: boolean("isActive").default(false).notNull(), // Admin toggles this
  isOpen: boolean("isOpen"),
  googleMapsUrl: text("googleMapsUrl"), // Custom Google Maps URL for drivers
  coverImageUrl: text("coverImageUrl"), // Custom cover image uploaded by admin
  // Discount (same as restaurants)
  discountEnabled: boolean("discountEnabled").default(false).notNull(),
  discountPercent: int("discountPercent").default(0),
  discountLabel: varchar("discountLabel", { length: 100 }),
  discountExpiresAt: timestamp("discountExpiresAt"),
  // وضع تعيين المندوب: manual=يدوي، street=أول متاح في الشارع، nearest=أقرب موقعاً
  driverAssignMode: mysqlEnum("driverAssignMode", ["manual", "street", "nearest"]).default("manual").notNull(),
  // حافظات الطعام والمشروبات
  hasHotBag: boolean("hasHotBag").default(false).notNull(),
  hasColdBag: boolean("hasColdBag").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GooglePlaceRestaurant = typeof googlePlaceRestaurants.$inferSelect;
export type InsertGooglePlaceRestaurant = typeof googlePlaceRestaurants.$inferInsert;

// ===== GOOGLE PLACE HOURS TABLE =====
export const googlePlaceHours = mysqlTable("googlePlaceHours", {
  id: int("id").autoincrement().primaryKey(),
  placeDbId: int("placeDbId").notNull(), // FK to googlePlaceRestaurants.id
  dayOfWeek: int("dayOfWeek").notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  isClosed: boolean("isClosed").default(false).notNull(),
  openTime: varchar("openTime", { length: 5 }), // e.g. "09:00"
  closeTime: varchar("closeTime", { length: 5 }), // e.g. "23:00"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GooglePlaceHours = typeof googlePlaceHours.$inferSelect;
export type InsertGooglePlaceHours = typeof googlePlaceHours.$inferInsert;

// ===== SYSTEM SETTINGS TABLE =====
// Key-value store for platform-wide settings (e.g. autoAssignDrivers)
export const systemSettings = mysqlTable("systemSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

// ===== BANNERS TABLE =====
// بانرات الصفحة الرئيسية للعميل - قابلة للتغيير من لوحة التحكم
export const banners = mysqlTable("banners", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }),
  subtitle: varchar("subtitle", { length: 300 }),
  imageUrl: text("imageUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Banner = typeof banners.$inferSelect;
export type InsertBanner = typeof banners.$inferInsert;

// ===== DRIVER RATINGS TABLE =====
// تقييمات المناديب من العملاء بعد اكتمال التوصيل
export const driverRatings = mysqlTable("driverRatings", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  driverId: int("driverId").notNull(),
  customerId: int("customerId").notNull(),
  serviceRating: int("serviceRating").notNull(), // 1-5 تقييم التعامل
  speedRating: int("speedRating").notNull(),     // 1-5 تقييم السرعة
  comment: text("comment"),                       // تعليق اختياري
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DriverRating = typeof driverRatings.$inferSelect;
export type InsertDriverRating = typeof driverRatings.$inferInsert;

// ===== COMPLAINTS TABLE =====
// شكاوى العملاء - مرتبطة بالطلبات والمستخدمين
export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  userPhone: varchar("userPhone", { length: 20 }),
  userName: varchar("userName", { length: 255 }),
  orderId: int("orderId"),
  orderNumber: varchar("orderNumber", { length: 50 }),
  category: mysqlEnum("category", ["delivery", "driver", "restaurant", "payment", "other"]).default("other").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  adminReply: text("adminReply"),
  repliedAt: timestamp("repliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = typeof complaints.$inferInsert;

// ===== SHOPPER DRIVER SETTINGS TABLE =====
// إعدادات المندوب في قسم شوبر (تفعيل، شروط، حد أدنى، أوقات عمل)
export const shopperDriverSettings = mysqlTable("shopperDriverSettings", {
  id: int("id").autoincrement().primaryKey(),
  driverUserId: int("driverUserId").notNull().unique(), // phoneUsers.id
  isActive: boolean("isActive").default(false).notNull(), // تفعيل/إيقاف شوبر
  // الشروط والقيود
  allowsFood: boolean("allowsFood").default(true).notNull(),
  allowsCoffee: boolean("allowsCoffee").default(true).notNull(),
  allowsGroceries: boolean("allowsGroceries").default(true).notNull(),
  allowsPharmacy: boolean("allowsPharmacy").default(true).notNull(),
  allowsDocuments: boolean("allowsDocuments").default(false).notNull(),
  allowsElectronics: boolean("allowsElectronics").default(false).notNull(),
  allowsClothes: boolean("allowsClothes").default(false).notNull(),
  allowsOther: boolean("allowsOther").default(false).notNull(),
  customTerms: text("customTerms"), // شروط مخصصة يكتبها المندوب
  // الحد الأدنى للطلبات
  minBookingsToDepart: int("minBookingsToDepart").default(3).notNull(),
  maxBookingsPerTrip: int("maxBookingsPerTrip").default(10).notNull(),
  // سعر التوصيل الافتراضي
  defaultDeliveryFee: decimal("defaultDeliveryFee", { precision: 8, scale: 2 }).default("15").notNull(),
  // ملاحظات للعملاء
  driverNote: text("driverNote"),
  // أقصى مسافة توصيل يقبلها المندوب (بالكيلومتر) - 0 = بدون حد
  maxDeliveryKm: int("maxDeliveryKm").default(50).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShopperDriverSettings = typeof shopperDriverSettings.$inferSelect;
export type InsertShopperDriverSettings = typeof shopperDriverSettings.$inferInsert;

// ===== SHOPPER TRIPS TABLE =====
// رحلات المندوب في قسم شوبر (جدول الرحلات القادمة)
export const shopperTrips = mysqlTable("shopperTrips", {
  id: int("id").autoincrement().primaryKey(),
  driverUserId: int("driverUserId").notNull(), // phoneUsers.id
  // من أين إلى أين
  fromCityId: int("fromCityId").notNull(),
  fromCityName: varchar("fromCityName", { length: 100 }).notNull(),
  toCityId: int("toCityId").notNull(),
  toCityName: varchar("toCityName", { length: 100 }).notNull(),
  // وقت الإقلاع والوصول المتوقع وإغلاق الحجز
  departureTime: timestamp("departureTime").notNull(),
  estimatedArrivalTime: timestamp("estimatedArrivalTime").notNull(),
  bookingDeadline: timestamp("bookingDeadline"), // آخر موعد لقبول الحجوزات (اختياري)
  // نوع الرحلة: جماعي (عدة طلبات) أو سريع (طلب واحد فقط)
  tripType: mysqlEnum("shopperTripType", ["group", "express"]).default("group").notNull(),
  // حالة الرحلة
  status: mysqlEnum("shopperTripStatus", ["upcoming", "collecting", "departed", "arrived", "completed", "cancelled"])
    .default("upcoming").notNull(),
  // الحد الأدنى والأقصى للحجوزات (للجماعي فقط، السريع = 1 دائماً)
  minBookings: int("minBookings").default(1).notNull(),
  maxBookings: int("maxBookings").default(10).notNull(),
  currentBookings: int("currentBookings").default(0).notNull(),
  // سعر التوصيل لهذه الرحلة
  deliveryFee: decimal("deliveryFee", { precision: 8, scale: 2 }).default("15").notNull(),
  // إحداثيات مدينة التوصيل وقطر التغطية (من الخريطة)
  toCityLat: decimal("toCityLat", { precision: 10, scale: 7 }),
  toCityLng: decimal("toCityLng", { precision: 10, scale: 7 }),
  toCityRadiusKm: decimal("toCityRadiusKm", { precision: 6, scale: 2 }).default("10"),
  // إحداثيات موقع المندوب (من GPS)
  fromLat: decimal("fromLat", { precision: 10, scale: 7 }),
  fromLng: decimal("fromLng", { precision: 10, scale: 7 }),
  // مضلع منطقة التغطية (GeoJSON ring: [[lng,lat],...]) - اختياري
  coveragePolygon: text("coveragePolygon"),
  // ملاحظات
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShopperTrip = typeof shopperTrips.$inferSelect;
export type InsertShopperTrip = typeof shopperTrips.$inferInsert;

// ===== SHOPPER BOOKINGS TABLE =====
// حجوزات العملاء على رحلات شوبر
export const shopperBookings = mysqlTable("shopperBookings", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  customerUserId: int("customerUserId").notNull(), // phoneUsers.id
  // تفاصيل الطلب
  itemDescription: text("itemDescription").notNull(), // وصف الطلب/الغرض
  pickupLocationText: text("pickupLocationText").notNull(), // موقع الاستلام نصاً
  pickupLocationLat: decimal("pickupLocationLat", { precision: 10, scale: 7 }),
  pickupLocationLng: decimal("pickupLocationLng", { precision: 10, scale: 7 }),
  pickupStoreName: varchar("pickupStoreName", { length: 255 }), // اسم المتجر
  // صورة الفاتورة
  invoiceImageUrl: text("invoiceImageUrl"),
  // سعر التوصيل المتفق عليه
  deliveryFee: decimal("deliveryFee", { precision: 8, scale: 2 }).notNull(),
  // طريقة الدفع
  paymentMethod: mysqlEnum("shopperPaymentMethod", ["cash", "card"]).default("cash").notNull(),
  paymentStatus: mysqlEnum("shopperPaymentStatus", ["pending", "paid", "refunded"]).default("pending").notNull(),
  // حالة الحجز
  status: mysqlEnum("shopperBookingStatus", [
    "pending",      // بانتظار موافقة المندوب
    "accepted",     // قبل المندوب
    "rejected",     // رفض المندوب
    "picked_up",    // استلم المندوب الطلب (مع صورة)
    "delivered",    // تم التوصيل (مع صورة)
    "confirmed",    // أكد العميل الاستلام
    "cancelled",    // ملغي
  ]).default("pending").notNull(),
  // صور الاستلام والتسليم
  pickupProofImageUrl: text("pickupProofImageUrl"),   // صورة عند الاستلام من المتجر
  deliveryProofImageUrl: text("deliveryProofImageUrl"), // صورة عند التسليم للعميل
  pickupProofAt: timestamp("pickupProofAt"),
  deliveryProofAt: timestamp("deliveryProofAt"),
  confirmedByCustomerAt: timestamp("confirmedByCustomerAt"),
  // موقع التسليم
  deliveryLocationText: text("deliveryLocationText"),
  deliveryLocationLat: decimal("deliveryLocationLat", { precision: 10, scale: 7 }),
  deliveryLocationLng: decimal("deliveryLocationLng", { precision: 10, scale: 7 }),
  // طريقة التسليم
  deliveryMethod: mysqlEnum("shopperDeliveryMethod", ["person", "door"]).default("person").notNull(),
  // person = تسليم لشخص محدد (owner أو recipient)
  // door = ترك أمام الباب بدون حضور أحد
  recipientName: varchar("recipientName", { length: 255 }),   // اسم المستلم (إذا كان شخص آخر)
  recipientPhone: varchar("recipientPhone", { length: 30 }),  // رقم هاتف المستلم
  // هل الطلب يحتاج فاتورة من المندوب (غير مدفوع مسبقاً)
  needsInvoice: boolean("needsInvoice").default(false).notNull(),
  // ملاحظات
  customerNotes: text("customerNotes"),
  driverNotes: text("driverNotes"),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShopperBooking = typeof shopperBookings.$inferSelect;
export type InsertShopperBooking = typeof shopperBookings.$inferInsert;

// ===== SHOPPER RATINGS TABLE =====
// تقييمات العملاء للمناديب بعد اكتمال الطلب
export const shopperRatings = mysqlTable("shopperRatings", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull().unique(), // كل حجز له تقييم واحد فقط
  tripId: int("tripId").notNull(),
  driverUserId: int("driverUserId").notNull(),
  customerUserId: int("customerUserId").notNull(),
  // معايير التقييم (1-5 نجوم)
  accuracyRating: int("accuracyRating").notNull(),    // الدقة
  speedRating: int("speedRating").notNull(),           // السرعة
  cooperationRating: int("cooperationRating").notNull(), // التعاون
  // المتوسط المحسوب
  overallRating: decimal("overallRating", { precision: 3, scale: 2 }).notNull(),
  // تعليق اختياري
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ShopperRating = typeof shopperRatings.$inferSelect;
export type InsertShopperRating = typeof shopperRatings.$inferInsert;

// ===== CITY POLYGONS TABLE =====
// مضلعات التغطية المحفوظة لكل مدينة (يرسمها الإدارة أو المناديب وتُحفظ للاستخدام المشترك)
export const cityPolygons = mysqlTable("cityPolygons", {
  id: int("id").autoincrement().primaryKey(),
  cityName: varchar("cityName", { length: 100 }).notNull(), // اسم المدينة أو المنطقة
  polygon: json("polygon").notNull(), // مصفوفة نقاط [[lng, lat], ...]
  createdByUserId: int("createdByUserId"), // معرف المندوب أو الإدارة الذي أنشأ المنطقة
  isActive: boolean("isActive").default(true).notNull(),
  usageCount: int("usageCount").default(0).notNull(), // عدد مرات استخدام المنطقة من قبل المناديب
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CityPolygon = typeof cityPolygons.$inferSelect;
export type InsertCityPolygon = typeof cityPolygons.$inferInsert;

// ===== PLACE ANALYSIS TABLE =====
// تحليل AI للمطاعم والكافيهات المجلوبة من Google Places
export const placeAnalysis = mysqlTable("placeAnalysis", {
  id: int("id").autoincrement().primaryKey(),
  placeId: varchar("placeId", { length: 255 }).notNull().unique(), // Google Place ID
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  totalRatings: int("totalRatings").default(0),
  priceLevel: int("priceLevel"), // 0-4 من Google
  types: text("types"), // JSON array of place types
  photoUrl: text("photoUrl"), // أول صورة من Google
  googleMapsUrl: text("googleMapsUrl"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  // تحليل AI
  aiSummary: text("aiSummary"), // ملخص عن المكان وما يشتهر به
  aiFamousFor: text("aiFamousFor"), // ما يشتهر به (JSON array)
  aiTopItems: text("aiTopItems"), // الأكثر طلباً (JSON array: [{name, price, description}])
  aiTrendingItems: text("aiTrendingItems"), // الترند الحالي (JSON array)
  aiMenuItems: text("aiMenuItems"), // المنيو المستخرج (JSON array: [{category, name, price, description}])
  menuPhotoUrls: text("menuPhotoUrls"), // روابط صور المنيو من Google Places (JSON array)
  aiAnalyzedAt: timestamp("aiAnalyzedAt"), // آخر تحليل
  // حالة التفعيل
  isActive: boolean("isActive").default(true).notNull(),
  cityId: int("cityId"), // ربط بالمدينة
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PlaceAnalysis = typeof placeAnalysis.$inferSelect;
export type InsertPlaceAnalysis = typeof placeAnalysis.$inferInsert;
