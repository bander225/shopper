/**
 * settings router
 * Manages platform-wide settings (e.g. autoAssignDrivers toggle)
 */
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { systemSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── helpers ────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(systemSettings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
}

/** Returns true if auto-assign is enabled (default: true) */
export async function isAutoAssignEnabled(): Promise<boolean> {
  const val = await getSetting("autoAssignDrivers");
  if (val === null) return true; // default on
  return val === "true";
}

// ─── router ─────────────────────────────────────────────────────────────────

export const settingsRouter = router({
  /** Public: get all settings as key-value map */
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return {};
    const rows = await db.select().from(systemSettings);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }),

  /** Admin: toggle autoAssignDrivers on/off */
  setAutoAssign: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await setSetting("autoAssignDrivers", input.enabled ? "true" : "false");
      return { success: true, autoAssignDrivers: input.enabled };
    }),

  /** Admin: get autoAssign status */
  getAutoAssign: publicProcedure.query(async () => {
    const enabled = await isAutoAssignEnabled();
    return { autoAssignDrivers: enabled };
  }),

  /** Public: get shopper header image URL */
  getShopperHeaderImage: publicProcedure.query(async () => {
    const url = await getSetting("shopperHeaderImage");
    return { url: url ?? null };
  }),

  /** Admin: set shopper header image URL */
  setShopperHeaderImage: protectedProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await setSetting("shopperHeaderImage", input.url);
      return { success: true };
    }),

  /** Public: get restaurants header image URL */
  getRestaurantsHeaderImage: publicProcedure.query(async () => {
    const url = await getSetting("restaurantsHeaderImage");
    return { url: url ?? null };
  }),

  /** Admin: set restaurants header image URL */
  setRestaurantsHeaderImage: protectedProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await setSetting("restaurantsHeaderImage", input.url);
      return { success: true };
    }),
});
