import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { otpVerifications, phoneUsers, drivers } from "../../drizzle/schema";
import { eq, and, gt, inArray } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { TRPCError } from "@trpc/server";
import { parse as parseCookies } from "cookie";
import { sendSmsOtp } from "../_core/sms";

const PHONE_JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "phone-auth-secret-key-delivery"
);
const PHONE_COOKIE = "phone_session";
const OTP_EXPIRY_MINUTES = 10;

// Generate 5-digit OTP
function generateOTP(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Normalize phone number: strip country code variants and return local format
// e.g. +966557000000 -> 0557000000, 00966557000000 -> 0557000000
function normalizePhone(raw: string): string {
  let p = raw.trim().replace(/\s/g, "");
  if (p.startsWith("+966")) p = "0" + p.slice(4);
  else if (p.startsWith("00966")) p = "0" + p.slice(5);
  p = p.replace(/^\+/, "");
  return p;
}

// Build all phone variants to search in DB (handles mismatches between stored and entered)
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

// Create JWT for phone user
async function createPhoneToken(userId: number, phone: string, role: string) {
  return new SignJWT({ userId, phone, role, type: "phone" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(PHONE_JWT_SECRET);
}

export const phoneAuthRouter = router({
  // Step 1: Send OTP to phone number
  sendOTP: publicProcedure
    .input(z.object({
      phone: z.string().min(4).max(20),
      role: z.enum(["customer", "driver"]).default("customer"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const phone = normalizePhone(input.phone);
      const variants = phoneVariants(input.phone);

      // If role is driver, verify the phone exists in the drivers table (search all variants)
      if (input.role === "driver") {
        const driverRecords = await db
          .select({ id: drivers.id, isAvailable: drivers.isAvailable })
          .from(drivers)
          .where(inArray(drivers.phone, variants))
          .limit(1);

        if (!driverRecords[0]) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `رقم الجوال ${phone} غير مسجّل كمندوب — تواصل مع الإدارة لتسجيلك`,
          });
        }
      }

      // للمناديب: رمز التحقق الثابت 000000 للتجارب (بدون إرسال SMS)
      const DRIVER_TEST_OTP = "000000";
      const isDriverRole = input.role === "driver";

      const otp = isDriverRole ? DRIVER_TEST_OTP : generateOTP();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      // Invalidate old OTPs for this phone
      await db.update(otpVerifications)
        .set({ isUsed: true })
        .where(eq(otpVerifications.phone, phone));

      // Save new OTP
      await db.insert(otpVerifications).values({
        phone,
        otp,
        expiresAt,
        isUsed: false,
      });

      // للمناديب: لا نرسل SMS — الرمز الثابت هو 000000
      if (!isDriverRole) {
        const smsResult = await sendSmsOtp(phone, otp);

        if (!smsResult.success) {
          // رمز 501 (نفذ الرصيد): يُسجَّل داخلياً فقط، لا يُكشف للعميل
          if (smsResult.internalOnly) {
            console.error(`[OTP-${smsResult.errorCode}] INTERNAL: ${smsResult.message} — phone: ${phone}`);
            // نُرجع رمز خطأ عام للعميل بدون كشف السبب الحقيقي
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "تعذّر إرسال رمز التحقق، يرجى المحاولة لاحقاً",
              cause: { errorCode: smsResult.errorCode, internalOnly: true },
            });
          }

          console.error(`[OTP-${smsResult.errorCode ?? "ERR"}] Failed to send SMS to ${phone}:`, smsResult.error);
          // رسالة للعميل تتضمن رمز الخطأ
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: smsResult.message,
            cause: { errorCode: smsResult.errorCode },
          });
        }

        console.log(`[OTP] SMS sent successfully to ${phone}`);
      } else {
        console.log(`[OTP] Driver test mode — fixed OTP 000000 for ${phone} (no SMS sent)`);
      }

      return {
        success: true,
        message: isDriverRole
          ? `استخدم الرمز الثابت 000000 للدخول`
          : `تم إرسال رمز التحقق إلى ${phone}`,
      };
    }),

  // Step 2: Verify OTP and create session
  verifyOTP: publicProcedure
    .input(z.object({
      phone: z.string().min(4).max(20),
      otp: z.string().min(5).max(6),
      name: z.string().optional(),
      role: z.enum(["customer", "driver"]).default("customer"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const phone = normalizePhone(input.phone);
      const variants = phoneVariants(input.phone);
      const now = new Date();

      // Find valid OTP — search by all phone variants
      const [record] = await db
        .select()
        .from(otpVerifications)
        .where(
          and(
            inArray(otpVerifications.phone, variants),
            eq(otpVerifications.otp, input.otp),
            eq(otpVerifications.isUsed, false),
            gt(otpVerifications.expiresAt, now)
          )
        )
        .limit(1);

      if (!record) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رمز التحقق غير صحيح أو منتهي الصلاحية",
        });
      }

      // Mark OTP as used
      await db.update(otpVerifications)
        .set({ isUsed: true })
        .where(eq(otpVerifications.id, record.id));

      // If driver role, fetch name from drivers table (search by all phone variants)
      let driverName: string | null = null;
      if (input.role === "driver") {
        const [driverRow] = await db
          .select({ name: drivers.name })
          .from(drivers)
          .where(inArray(drivers.phone, variants))
          .limit(1);
        if (driverRow?.name) driverName = driverRow.name;
      }

      // Upsert phone user — search by normalized phone
      const existing = await db
        .select()
        .from(phoneUsers)
        .where(eq(phoneUsers.phone, phone))
        .limit(1);

      let user;
      if (existing.length > 0) {
        user = existing[0];
        // Auto-fill name from drivers table if missing
        const nameToSet = input.name || driverName;
        if (nameToSet && !user.name) {
          await db.update(phoneUsers)
            .set({ name: nameToSet, updatedAt: new Date() })
            .where(eq(phoneUsers.id, user.id));
          user = { ...user, name: nameToSet };
        }
      } else {
        // Create new phone user — use driver name if available
        const nameToUse = input.name ?? driverName ?? null;
        await db.insert(phoneUsers).values({
          phone,
          name: nameToUse,
          role: input.role,
          isActive: true,
        });
        const [newUser] = await db
          .select()
          .from(phoneUsers)
          .where(eq(phoneUsers.phone, phone))
          .limit(1);
        user = newUser;
      }

      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل إنشاء الحساب" });

      // Create JWT token
      const token = await createPhoneToken(user.id, user.phone, user.role);

      // Set cookie
      const isSecure = ctx.req.protocol === "https" || ctx.req.headers["x-forwarded-proto"] === "https";
      console.log(`[PhoneAuth] isSecure=${isSecure}, protocol=${ctx.req.protocol}, x-forwarded-proto=${ctx.req.headers["x-forwarded-proto"]}`);
      ctx.res.cookie(PHONE_COOKIE, token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/",
      });

      return {
        success: true,
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          addressText: user.addressText,
          addressLat: user.addressLat,
          addressLng: user.addressLng,
          pinnedAddressText: user.pinnedAddressText,
          pinnedAddressLat: user.pinnedAddressLat,
          pinnedAddressLng: user.pinnedAddressLng,
          termsAccepted: !!(user as any).termsAccepted,
        },
      };
    }),

  // Get current phone session
  me: publicProcedure.query(async ({ ctx }) => {
    const cookieHeader = ctx.req.headers.cookie;
    const cookies = cookieHeader ? parseCookies(cookieHeader) : {};
    let token = cookies[PHONE_COOKIE];
    if (!token) {
      const authHeader = ctx.req.headers.authorization ?? "";
      if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
    }
    if (!token) return null;

    try {
      const { payload } = await jwtVerify(token, PHONE_JWT_SECRET);
      if (payload.type !== "phone") return null;

      const db = await getDb();
      if (!db) return null;

      const [user] = await db
        .select()
        .from(phoneUsers)
        .where(eq(phoneUsers.id, payload.userId as number))
        .limit(1);

      if (!user || !user.isActive) return null;

      return {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        addressText: user.addressText,
        addressLat: user.addressLat,
        addressLng: user.addressLng,
        pinnedAddressText: user.pinnedAddressText,
        pinnedAddressLat: user.pinnedAddressLat,
        pinnedAddressLng: user.pinnedAddressLng,
        pinnedAddressCityName: (user as any).pinnedAddressCityName ?? null,
        currentCityName: (user as any).currentCityName ?? null,
        currentLat: (user as any).currentLat ?? null,
        currentLng: (user as any).currentLng ?? null,
        doorImageUrl: user.doorImageUrl,
        termsAccepted: !!(user as any).termsAccepted,
        cityId: user.cityId ?? null,
        streetId: user.streetId ?? null,
      };
    } catch {
      return null;
    }
  }),

  // Update profile (name + address)
  updateProfile: publicProcedure
    .input(z.object({
      name: z.string().optional(),
      addressText: z.string().optional(),
      addressLat: z.string().optional(),
      addressLng: z.string().optional(),
      doorImageUrl: z.string().optional(),
      pinnedAddressText: z.string().optional(),
      pinnedAddressLat: z.string().optional(),
      pinnedAddressLng: z.string().optional(),
      pinnedAddressCityName: z.string().optional(), // اسم مدينة عنوان التوصيل (من Reverse Geocoding)
      currentCityName: z.string().optional(), // اسم مدينة المندوب الحالية (من GPS)
      currentLat: z.string().optional(),
      currentLng: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const cookieHeader = ctx.req.headers.cookie ?? "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies[PHONE_COOKIE];
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "غير مسجل الدخول" });

      const { payload } = await jwtVerify(token, PHONE_JWT_SECRET);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.update(phoneUsers)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.addressText !== undefined && { addressText: input.addressText }),
          ...(input.addressLat !== undefined && { addressLat: input.addressLat }),
          ...(input.addressLng !== undefined && { addressLng: input.addressLng }),
          ...(input.doorImageUrl !== undefined && { doorImageUrl: input.doorImageUrl }),
          ...(input.pinnedAddressText !== undefined && { pinnedAddressText: input.pinnedAddressText }),
          ...(input.pinnedAddressLat !== undefined && { pinnedAddressLat: input.pinnedAddressLat }),
          ...(input.pinnedAddressLng !== undefined && { pinnedAddressLng: input.pinnedAddressLng }),
          ...(input.pinnedAddressCityName !== undefined && { pinnedAddressCityName: input.pinnedAddressCityName }),
          ...(input.currentCityName !== undefined && { currentCityName: input.currentCityName }),
          ...(input.currentLat !== undefined && { currentLat: input.currentLat }),
          ...(input.currentLng !== undefined && { currentLng: input.currentLng }),
          updatedAt: new Date(),
        })
        .where(eq(phoneUsers.id, payload.userId as number));

      return { success: true };
    }),

  // Save customer city & street selection
  saveCityStreet: publicProcedure
    .input(z.object({
      cityId: z.number().nullable(),
      streetId: z.number().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const cookieHeader = ctx.req.headers.cookie ?? "";
      const cookies = parseCookies(cookieHeader);
      let token = cookies[PHONE_COOKIE];
      if (!token) {
        const authHeader = ctx.req.headers.authorization ?? "";
        if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);
      }
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED" });
      const { payload } = await jwtVerify(token, PHONE_JWT_SECRET);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(phoneUsers)
        .set({ cityId: input.cityId, streetId: input.streetId, updatedAt: new Date() })
        .where(eq(phoneUsers.id, payload.userId as number));
      return { success: true };
    }),

  // Set name by userId
  setNameById: publicProcedure
    .input(z.object({
      userId: z.number(),
      name: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.update(phoneUsers)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(phoneUsers.id, input.userId));

      return { success: true };
    }),

  // Admin: list recent OTPs for monitoring
  adminListOtps: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const { desc } = await import("drizzle-orm");
    const list = await db.select().from(otpVerifications).orderBy(desc(otpVerifications.createdAt)).limit(50);
    return list;
  }),

  // Admin: list all phone users
  adminListUsers: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { desc } = await import("drizzle-orm");
    return db.select().from(phoneUsers).orderBy(desc(phoneUsers.createdAt)).limit(200);
  }),

  // Admin: toggle phone user active
  adminToggleUser: publicProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(phoneUsers).set({ isActive: input.isActive }).where(eq(phoneUsers.id, input.id));
      return { success: true };
    }),

  // Admin login with username/password
  adminLogin: publicProcedure
    .input(z.object({
      username: z.string(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin";

      if (input.username !== ADMIN_USERNAME || input.password !== ADMIN_PASSWORD) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      const token = await new SignJWT({ role: "admin", type: "admin_session", username: ADMIN_USERNAME })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(PHONE_JWT_SECRET);

      const isSecure = ctx.req.protocol === "https" || ctx.req.headers["x-forwarded-proto"] === "https";
      ctx.res.cookie("admin_session", token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return { success: true };
    }),

  // Check admin session
  adminMe: publicProcedure.query(async ({ ctx }) => {
    const cookieHeader = ctx.req.headers.cookie;
    const cookies = cookieHeader ? parseCookies(cookieHeader) : {};
    const token = cookies["admin_session"];
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, PHONE_JWT_SECRET);
      if (payload.type !== "admin_session") return null;
      return { username: payload.username as string, role: "admin" };
    } catch {
      return null;
    }
  }),

  // Admin: update phone user info
  adminUpdateUser: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      role: z.enum(["customer", "driver"]).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.role !== undefined) updateData.role = input.role;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      await db.update(phoneUsers).set(updateData).where(eq(phoneUsers.id, input.id));
      return { success: true };
    }),

  // Admin: delete phone user
  adminDeleteUser: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(phoneUsers).where(eq(phoneUsers.id, input.id));
      return { success: true };
    }),

  // Admin: list customers only
  adminListCustomers: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { desc } = await import("drizzle-orm");
    return db.select().from(phoneUsers)
      .where(eq(phoneUsers.role, "customer"))
      .orderBy(desc(phoneUsers.createdAt))
      .limit(500);
  }),

  // Admin logout
  adminLogout: publicProcedure.mutation(({ ctx }) => {
    const isSecure = ctx.req.protocol === "https" || ctx.req.headers["x-forwarded-proto"] === "https";
    ctx.res.clearCookie("admin_session", {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? "none" : "lax",
      path: "/",
    });
    return { success: true };
  }),

  // Logout
  logout: publicProcedure.mutation(({ ctx }) => {
    const isSecure = ctx.req.protocol === "https" || ctx.req.headers["x-forwarded-proto"] === "https";
    ctx.res.clearCookie(PHONE_COOKIE, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? "none" : "lax",
      path: "/",
    });
    return { success: true };
  }),
});

// Helper to get phone user from request (for use in other routers)
export async function getPhoneUserFromRequest(req: any): Promise<{ id: number; phone: string; name: string | null; role: string } | null> {
  const token = req.cookies?.[PHONE_COOKIE];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, PHONE_JWT_SECRET);
    if (payload.type !== "phone") return null;

    const db = await getDb();
    if (!db) return null;

    const [user] = await (db as any)
      .select()
      .from(phoneUsers)
      .where(eq(phoneUsers.id, payload.userId as number))
      .limit(1);

    if (!user || !user.isActive) return null;
    return { id: user.id, phone: user.phone, name: user.name, role: user.role };
  } catch {
    return null;
  }
}
