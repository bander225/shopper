import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { parse as parseCookies } from "cookie";
import { jwtVerify } from "jose";

const ADMIN_JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "admin-secret-key");

async function isAdminRequest(req: any): Promise<boolean> {
  try {
    const cookieHeader = req.headers?.cookie ?? "";
    const cookies = parseCookies(cookieHeader);
    const token = cookies["admin_session"];
    if (!token) return false;
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);
    return (payload as any)?.role === "admin";
  } catch {
    return false;
  }
}

const PHONE_JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "phone-secret-key");
const PHONE_COOKIE = "phone_session";

async function getPhoneUserId(req: any): Promise<number | null> {
  try {
    const cookieHeader = req.headers?.cookie ?? "";
    const cookies = parseCookies(cookieHeader);
    const token = cookies[PHONE_COOKIE];
    if (!token) return null;
    const { payload } = await jwtVerify(token, PHONE_JWT_SECRET);
    return (payload as any)?.userId ?? null;
  } catch {
    return null;
  }
}

export const uploadRouter = router({
  // Upload image as base64 and return CDN URL (admin only)
  image: publicProcedure
    .input(z.object({
      base64: z.string(), // data:image/jpeg;base64,...
      folder: z.string().default("uploads"), // e.g. "restaurants", "menu-items"
      fileName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Allow admin session OR OAuth admin user
      const isAdmin = await isAdminRequest(ctx.req) || (ctx.user && ctx.user.role === "admin");
      if (!isAdmin) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول كمدير" });

      // Parse base64 data URL
      const matches = input.base64.match(/^data:(.+);base64,(.+)$/);
      if (!matches) throw new TRPCError({ code: "BAD_REQUEST", message: "صيغة الصورة غير صحيحة" });

      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // Validate size (max 5MB)
      if (buffer.length > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت" });
      }

      // Validate content type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(contentType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "نوع الملف غير مدعوم. استخدم JPEG أو PNG أو WebP" });
      }

      const ext = contentType.split("/")[1] ?? "jpg";
      const uniqueId = nanoid(10);
      const fileName = input.fileName
        ? `${input.folder}/${uniqueId}-${input.fileName}`
        : `${input.folder}/${uniqueId}.${ext}`;

      const { url } = await storagePut(fileName, buffer, contentType);

      return { url, key: fileName };
    }),

  // Upload delivery proof image for drivers
  driverImage: publicProcedure
    .input(z.object({
      base64: z.string(),
      folder: z.string().default("driver-uploads"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = await getPhoneUserId(ctx.req);
      if (!userId) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول" });

      const matches = input.base64.match(/^data:(.+);base64,(.+)$/);
      if (!matches) throw new TRPCError({ code: "BAD_REQUEST", message: "صيغة الصورة غير صحيحة" });

      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length > 10 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "حجم الصورة يجب أن يكون أقل من 10 ميجابايت" });
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(contentType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "نوع الملف غير مدعوم" });
      }

      const ext = contentType.split("/")[1] ?? "jpg";
      const uniqueId = nanoid(10);
      const fileName = `${input.folder}/driver-${userId}-${uniqueId}.${ext}`;

      const { url } = await storagePut(fileName, buffer, contentType);
      return { url, key: fileName };
    }),

  // Upload image for customers (door photo, etc.)
  customerImage: publicProcedure
    .input(z.object({
      base64: z.string(),
      folder: z.string().default("customer-uploads"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = await getPhoneUserId(ctx.req);
      if (!userId) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب تسجيل الدخول" });

      const matches = input.base64.match(/^data:(.+);base64,(.+)$/);
      if (!matches) throw new TRPCError({ code: "BAD_REQUEST", message: "صيغة الصورة غير صحيحة" });

      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت" });
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(contentType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "نوع الملف غير مدعوم" });
      }

      const ext = contentType.split("/")[1] ?? "jpg";
      const uniqueId = nanoid(10);
      const fileName = `${input.folder}/${userId}-${uniqueId}.${ext}`;

      const { url } = await storagePut(fileName, buffer, contentType);
      return { url, key: fileName };
    }),
});
