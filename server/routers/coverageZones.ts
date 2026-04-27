import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

// Helper: check if a point is inside a polygon using ray-casting algorithm
// polygon: array of [lng, lat] pairs (GeoJSON order)
function pointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pLng = polygon[i][0]; // lng of vertex i
    const pLat = polygon[i][1]; // lat of vertex i
    const qLng = polygon[j][0]; // lng of vertex j
    const qLat = polygon[j][1]; // lat of vertex j
    // Ray casting: horizontal ray from (lat, lng) going right
    const intersect =
      pLat > lat !== qLat > lat &&
      lng < ((qLng - pLng) * (lat - pLat)) / (qLat - pLat) + pLng;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const coverageZonesRouter = router({
  // Get all coverage zones for a specific driver
  getByDriver: publicProcedure
    .input(z.object({ driverUserId: z.number() }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { driverCoverageZones } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      const zones = await db
        .select()
        .from(driverCoverageZones)
        .where(eq(driverCoverageZones.driverUserId, input.driverUserId));
      return zones.map((zone) => ({
        ...zone,
        polygon: JSON.parse(zone.polygon) as [number, number][],
      }));
    }),

  // Get all active coverage zones
  getAllActive: publicProcedure.query(async () => {
    const { getDb } = await import("../db");
    const { driverCoverageZones } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      const zones = await db
        .select()
        .from(driverCoverageZones)
        .where(eq(driverCoverageZones.isActive, true));
    return zones.map((zone) => ({
      ...zone,
      polygon: JSON.parse(zone.polygon) as [number, number][],
    }));
  }),

  // Check if a point is covered by a specific driver's zone
  checkCoverage: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lng: z.number(),
        driverUserId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { driverCoverageZones } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return { covered: false, zoneId: null, zoneName: null, driverUserId: null };

      const whereClause =
        input.driverUserId !== undefined
          ? and(
              eq(driverCoverageZones.isActive, true),
              eq(driverCoverageZones.driverUserId, input.driverUserId)
            )
          : eq(driverCoverageZones.isActive, true);

      const zones = await db
        .select()
        .from(driverCoverageZones)
        .where(whereClause);

      for (const zone of zones) {
        const polygon = JSON.parse(zone.polygon) as [number, number][];
        if (pointInPolygon(input.lat, input.lng, polygon)) {
          return {
            covered: true,
            zoneId: zone.id,
            zoneName: zone.name,
            driverUserId: zone.driverUserId,
          };
        }
      }
      return { covered: false, zoneId: null, zoneName: null, driverUserId: null };
    }),

  // Save/update a coverage zone (admin only)
  save: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        driverUserId: z.number(),
        name: z.string().default("منطقة التغطية"),
        polygon: z.array(z.tuple([z.number(), z.number()])), // [[lng, lat], ...]
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { driverCoverageZones } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      const polygonStr = JSON.stringify(input.polygon);

      if (input.id) {
        if (db) await db
          .update(driverCoverageZones)
          .set({ name: input.name, polygon: polygonStr, isActive: input.isActive })
          .where(eq(driverCoverageZones.id, input.id));
        return { success: true, id: input.id };
      } else {
        if (!db) return { success: false, id: null };
        const result = await db.insert(driverCoverageZones).values({
          driverUserId: input.driverUserId,
          name: input.name,
          polygon: polygonStr,
          isActive: input.isActive,
        });
        return { success: true, id: (result as any)?.[0]?.insertId ?? null };
      }
    }),

  // Delete a coverage zone (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { driverCoverageZones } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) await db.delete(driverCoverageZones).where(eq(driverCoverageZones.id, input.id));
      return { success: true };
    }),

  // Toggle active status (admin only)
  toggleActive: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { driverCoverageZones } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (db) await db
        .update(driverCoverageZones)
        .set({ isActive: input.isActive })
        .where(eq(driverCoverageZones.id, input.id));
      return { success: true };
    }),
});
