import { z } from "zod";
import { router, publicProcedure, protectedProcedure, phoneProtectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { cityPolygons } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * تصحيح تلقائي لترتيب إحداثيات المضلع
 * في السعودية: lat بين 16-32، lng بين 36-56
 * إذا كانت القيمة الأولى > 35 فهي lng وليس lat → نبدّل الترتيب تلقائياً
 */
function normalizePolygon(polygon: Array<[number, number]>): Array<[number, number]> {
  if (!polygon || polygon.length < 3) return polygon;
  const firstPoint = polygon[0];
  const isSwapped = firstPoint[0] > 35; // القيمة الأولى تبدو كـ lng
  if (isSwapped) {
    console.log(`[cityPolygons] Auto-fixing swapped lat/lng (${polygon.length} points): [${firstPoint[0].toFixed(4)}, ${firstPoint[1].toFixed(4)}] → [${firstPoint[1].toFixed(4)}, ${firstPoint[0].toFixed(4)}]`);
    return polygon.map(p => [p[1], p[0]]);
  }
  return polygon;
}

export const cityPolygonsRouter = router({
  // جلب جميع المناطق النشطة (للمناديب لاختيار منطقة جاهزة)
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select()
      .from(cityPolygons)
      .where(eq(cityPolygons.isActive, true))
      .orderBy(desc(cityPolygons.usageCount));
    return rows;
  }),

  // جلب مناطق المندوب فقط (للإعدادات) - يستخدم phoneUser
  listMine: phoneProtectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select()
      .from(cityPolygons)
      .where(eq(cityPolygons.createdByUserId, ctx.phoneUser.id))
      .orderBy(desc(cityPolygons.usageCount));
    return rows;
  }),

  // جلب جميع المناطق (للإدارة)
  listAll: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select()
      .from(cityPolygons)
      .orderBy(desc(cityPolygons.usageCount));
    return rows;
  }),

  // حفظ منطقة جديدة - يستخدم phoneUser (المندوب)
  save: phoneProtectedProcedure
    .input(
      z.object({
        cityName: z.string().min(1),
        polygon: z.array(z.tuple([z.number(), z.number()])), // [[lat, lng], ...]
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      // تصحيح تلقائي للترتيب قبل الحفظ
      const fixedPolygon = normalizePolygon(input.polygon);
      const [result] = await db.insert(cityPolygons).values({
        cityName: input.cityName,
        polygon: fixedPolygon,
        createdByUserId: ctx.phoneUser.id,
        isActive: true,
        usageCount: 0,
      });
      return { id: (result as any).insertId };
    }),

  // تحديث منطقة موجودة
  update: phoneProtectedProcedure
    .input(
      z.object({
        id: z.number(),
        cityName: z.string().min(1).optional(),
        polygon: z.array(z.tuple([z.number(), z.number()])).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const { id, ...updates } = input;
      // تصحيح تلقائي للترتيب إذا كان المضلع موجوداً
      if (updates.polygon) {
        updates.polygon = normalizePolygon(updates.polygon);
      }
      await db
        .update(cityPolygons)
        .set(updates)
        .where(eq(cityPolygons.id, id));
      return { success: true };
    }),

  // تفعيل/إيقاف منطقة (للإدارة)
  toggle: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db
        .update(cityPolygons)
        .set({ isActive: input.isActive })
        .where(eq(cityPolygons.id, input.id));
      return { success: true };
    }),

  // زيادة عداد الاستخدام عند اختيار منطقة من قبل المندوب
  incrementUsage: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .update(cityPolygons)
        .set({ usageCount: sql`${cityPolygons.usageCount} + 1` })
        .where(eq(cityPolygons.id, input.id));
      return { success: true };
    }),

  // حذف منطقة - المندوب يحذف مناطقه فقط
  delete: phoneProtectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.delete(cityPolygons).where(eq(cityPolygons.id, input.id));
      return { success: true };
    }),
});
