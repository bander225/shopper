import { z } from "zod";
import { phoneProtectedProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  getNotificationsByUser,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
  updateUserProfile,
  getAllUsers,
} from "../db";
import { TRPCError } from "@trpc/server";

export const notificationsRouter = router({
  // Phone users (customers/drivers) get their notifications
  list: phoneProtectedProcedure.query(({ ctx }) => getNotificationsByUser(ctx.phoneUser.id)),

  unreadCount: phoneProtectedProcedure.query(({ ctx }) => getUnreadNotificationCount(ctx.phoneUser.id)),

  markRead: phoneProtectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => markNotificationRead(input.id)),

  markAllRead: phoneProtectedProcedure
    .mutation(({ ctx }) => markAllNotificationsRead(ctx.phoneUser.id)),
});

export const usersRouter = router({
  // Update profile (name, phone, address) - OAuth users
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      addressText: z.string().optional(),
      addressLat: z.string().optional(),
      addressLng: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),

  // Admin: list all users
  adminList: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllUsers();
  }),

  // Admin: promote user to admin
  adminSetRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["user", "admin", "driver"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { getDb } = await import("../db");
      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),
});
