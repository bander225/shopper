import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import type { PhoneUser } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// Phone-based auth procedure (for customers and drivers using phone login)
const requirePhoneUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.phoneUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول برقم الجوال" });
  }

  return next({
    ctx: {
      ...ctx,
      phoneUser: ctx.phoneUser,
    },
  });
});

export const phoneProtectedProcedure = t.procedure.use(requirePhoneUser);

// Any authenticated customer: accepts phoneUser OR OAuth user (creates a virtual phoneUser for OAuth users)
const requireAnyCustomer = t.middleware(async opts => {
  const { ctx, next } = opts;

  // If phoneUser is present, use it directly
  if (ctx.phoneUser) {
    return next({ ctx: { ...ctx, phoneUser: ctx.phoneUser } });
  }

  // If OAuth user is present, find or create a phoneUser record for them
  if (ctx.user) {
    try {
      const { getDb } = await import("../db");
      const { phoneUsers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Use a unique identifier as phone placeholder: oauth:{openId}
      const phonePlaceholder = `oauth:${ctx.user.openId}`;
      let [existing] = await db.select().from(phoneUsers).where(eq(phoneUsers.phone, phonePlaceholder)).limit(1);

      if (!existing) {
        await db.insert(phoneUsers).values({
          phone: phonePlaceholder,
          name: ctx.user.name ?? null,
          role: "customer",
          isActive: true,
        });
        const [created] = await db.select().from(phoneUsers).where(eq(phoneUsers.phone, phonePlaceholder)).limit(1);
        existing = created;
      }

      if (!existing) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل إنشاء حساب العميل" });

      const virtualPhoneUser: PhoneUser = {
        id: existing.id,
        phone: existing.phone,
        name: existing.name,
        role: existing.role,
        addressText: existing.addressText ?? null,
        addressLat: existing.addressLat ?? null,
        addressLng: existing.addressLng ?? null,
      };

      return next({ ctx: { ...ctx, phoneUser: virtualPhoneUser } });
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل التحقق من الهوية" });
    }
  }

  throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول" });
});

export const anyCustomerProcedure = t.procedure.use(requireAnyCustomer);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
