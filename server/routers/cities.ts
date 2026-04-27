import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { cities, neighborhoods, streets } from "../../drizzle/schema";
import { sql, eq, asc } from "drizzle-orm";

export const citiesRouter = router({
  // List all active/covered cities (public) - returns cities that are active OR covered
  listActive: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { or } = await import("drizzle-orm");
    return db
      .select()
      .from(cities)
      .where(or(eq(cities.isActive, true), eq(cities.isCovered, true)))
      .orderBy(asc(cities.sortOrder), asc(cities.name));
  }),

  // List all cities including inactive (admin)
  listAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(cities).orderBy(asc(cities.sortOrder), asc(cities.name));
  }),

  // List active neighborhoods for a city (public)
  getNeighborhoods: publicProcedure
    .input(z.object({ cityId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(neighborhoods)
        .where(eq(neighborhoods.cityId, input.cityId))
        .orderBy(asc(neighborhoods.sortOrder), asc(neighborhoods.name));
    }),

  // List all neighborhoods for a city including inactive (admin)
  getAllNeighborhoods: publicProcedure
    .input(z.object({ cityId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(neighborhoods)
        .where(eq(neighborhoods.cityId, input.cityId))
        .orderBy(asc(neighborhoods.sortOrder), asc(neighborhoods.name));
    }),

  // Admin: add city
  addCity: publicProcedure
    .input(z.object({ name: z.string().min(1), sortOrder: z.number().default(0) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(cities).values({ name: input.name, sortOrder: input.sortOrder });
      return { success: true };
    }),

  // Admin: toggle city active
  toggleCity: publicProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(cities).set({ isActive: input.isActive }).where(eq(cities.id, input.id));
      return { success: true };
    }),

  // Admin: delete city
  deleteCity: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(neighborhoods).where(eq(neighborhoods.cityId, input.id));
      await db.delete(cities).where(eq(cities.id, input.id));
      return { success: true };
    }),

  // Admin: add neighborhood
  addNeighborhood: publicProcedure
    .input(z.object({ cityId: z.number(), name: z.string().min(1), sortOrder: z.number().default(0) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(neighborhoods).values({ cityId: input.cityId, name: input.name, sortOrder: input.sortOrder });
      return { success: true };
    }),

  // Admin: toggle neighborhood active
  toggleNeighborhood: publicProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(neighborhoods).set({ isActive: input.isActive }).where(eq(neighborhoods.id, input.id));
      return { success: true };
    }),

  // Admin: delete neighborhood
  deleteNeighborhood: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(neighborhoods).where(eq(neighborhoods.id, input.id));
      return { success: true };
    }),

  // List active streets for a city with restaurant count (public)
  getStreets: publicProcedure
    .input(z.object({ cityId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { restaurants, googlePlaceRestaurants } = await import("../../drizzle/schema");
      // Fetch streets first
      const streetRows = await db
        .select({ id: streets.id, name: streets.name, sortOrder: streets.sortOrder })
        .from(streets)
        .where(eq(streets.cityId, input.cityId))
        .orderBy(asc(streets.sortOrder), asc(streets.name));

      if (streetRows.length === 0) return [];

      const streetIds = streetRows.map(s => s.id);

      // Count manual restaurants per street
      const manualCounts = await db
        .select({ streetId: restaurants.streetId, count: sql<number>`COUNT(*)` })
        .from(restaurants)
        .where(sql`${restaurants.streetId} IN (${sql.join(streetIds.map(id => sql`${id}`), sql`, `)}) AND ${restaurants.isAcceptingOrders} = 1`)
        .groupBy(restaurants.streetId);

      // Count google place restaurants per street
      const googleCounts = await db
        .select({ streetId: googlePlaceRestaurants.streetId, count: sql<number>`COUNT(*)` })
        .from(googlePlaceRestaurants)
        .where(sql`${googlePlaceRestaurants.streetId} IN (${sql.join(streetIds.map(id => sql`${id}`), sql`, `)}) AND ${googlePlaceRestaurants.isActive} = 1`)
        .groupBy(googlePlaceRestaurants.streetId);

      const manualMap: Record<number, number> = {};
      for (const r of manualCounts) manualMap[Number(r.streetId)] = Number(r.count);
      const googleMap: Record<number, number> = {};
      for (const r of googleCounts) googleMap[Number(r.streetId)] = Number(r.count);

      return streetRows.map(s => ({
        ...s,
        restaurantCount: (manualMap[s.id] ?? 0) + (googleMap[s.id] ?? 0),
      }));
    }),

  // Admin: add street
  addStreet: publicProcedure
    .input(z.object({ cityId: z.number(), name: z.string().min(1), sortOrder: z.number().default(0) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(streets).values({ cityId: input.cityId, name: input.name, sortOrder: input.sortOrder });
      return { success: true };
    }),

  // Admin: toggle street active
  toggleStreet: publicProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(streets).set({ isActive: input.isActive }).where(eq(streets.id, input.id));
      return { success: true };
    }),

  // Admin: delete street
  deleteStreet: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(streets).where(eq(streets.id, input.id));
      return { success: true };
    }),

  // Admin: list all streets for a city
  getAllStreets: publicProcedure
    .input(z.object({ cityId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(streets).where(eq(streets.cityId, input.cityId)).orderBy(asc(streets.sortOrder), asc(streets.name));
    }),

  // Admin: update city coverage settings
  updateCityCoverage: publicProcedure
    .input(z.object({
      id: z.number(),
      isCovered: z.boolean(),
      centerLat: z.string().optional(),
      centerLng: z.string().optional(),
      radiusKm: z.string().optional(),
      deliveryFee: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(cities).set({
        isCovered: input.isCovered,
        // Auto-activate city when coverage is enabled so it appears in listActive
        ...(input.isCovered && { isActive: true }),
        ...(input.centerLat !== undefined && { centerLat: input.centerLat }),
        ...(input.centerLng !== undefined && { centerLng: input.centerLng }),
        ...(input.radiusKm !== undefined && { radiusKm: input.radiusKm }),
        ...(input.deliveryFee !== undefined && { deliveryFee: input.deliveryFee }),
      }).where(eq(cities.id, input.id));
      return { success: true };
    }),

  // Public: check if coordinates are within a covered city
  checkCoverage: publicProcedure
    .input(z.object({ lat: z.number(), lng: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { covered: false, city: null };
      const coveredCities = await db.select().from(cities)
        .where(eq(cities.isCovered, true));
      // Haversine formula to check distance
      function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      }
      for (const city of coveredCities) {
        if (!city.centerLat || !city.centerLng) continue;
        const dist = haversineKm(input.lat, input.lng, Number(city.centerLat), Number(city.centerLng));
        const radius = Number(city.radiusKm ?? 10);
        if (dist <= radius) {
          return { covered: true, city: { id: city.id, name: city.name, deliveryFee: city.deliveryFee } };
        }
      }
      return { covered: false, city: null };
    }),

  // Public: list covered cities (for display)
  listCovered: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(cities).where(eq(cities.isCovered, true)).orderBy(asc(cities.sortOrder));
  }),

  // Public: reverse geocode coordinates to human-readable address (server-side, uses BUILT_IN key)
  reverseGeocode: publicProcedure
    .input(z.object({ lat: z.number(), lng: z.number() }))
    .query(async ({ input }) => {
      try {
        const { makeRequest } = await import("../_core/map");
        const data = await makeRequest<{ results: Array<{ formatted_address: string; address_components: Array<{ long_name: string; types: string[] }> }>; status: string }>(
          "/maps/api/geocode/json",
          { latlng: `${input.lat},${input.lng}`, language: "ar" }
        );
        if (data.status === "OK" && data.results?.[0]) {
          const r = data.results[0];
          // Extract city/district/street from components
          const get = (type: string) =>
            r.address_components.find((c) => c.types.includes(type))?.long_name ?? "";
          const city = get("locality") || get("administrative_area_level_2") || get("administrative_area_level_1");
          const district = get("sublocality_level_1") || get("sublocality") || get("neighborhood");
          const route = get("route");
          const parts = [city, district, route].filter(Boolean);
          const label = parts.length > 0 ? parts.join(" - ") : r.formatted_address;
          return { address: label, fullAddress: r.formatted_address, city, district, route };
        }
        return { address: `${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}`, fullAddress: "", city: "", district: "", route: "" };
      } catch (e: any) {
        return { address: `${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}`, fullAddress: "", city: "", district: "", route: "" };
      }
    }),

  // Public: search nearby restaurants & cafes on a street via Google Places API
  nearbyPlaces: publicProcedure
    .input(z.object({
      streetName: z.string(),
      cityName: z.string().optional(),
      cityLat: z.number().optional(),
      cityLng: z.number().optional(),
      cityId: z.number().optional(),
      streetId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const { makeRequest } = await import("../_core/map");
        const query = input.cityName
          ? `${input.streetName} ${input.cityName}`
          : input.streetName;

        // Use Text Search to find restaurants & cafes on the street
        const locationParams = input.cityLat && input.cityLng
          ? { location: `${input.cityLat},${input.cityLng}`, radius: 8000 }
          : {};

        const [restaurantsData, cafesData, foodData] = await Promise.all([
          makeRequest<{ results: any[]; status: string }>(
            "/maps/api/place/textsearch/json",
            {
              query: `مطعم ${query}`,
              type: "restaurant",
              language: "ar",
              ...locationParams,
            }
          ),
          makeRequest<{ results: any[]; status: string }>(
            "/maps/api/place/textsearch/json",
            {
              query: `كافيه كوفي ${query}`,
              type: "cafe",
              language: "ar",
              ...locationParams,
            }
          ),
          makeRequest<{ results: any[]; status: string }>(
            "/maps/api/place/textsearch/json",
            {
              query: `مطاعم وكافيهات ${query}`,
              language: "ar",
              ...locationParams,
            }
          ),
        ]);

        const seen = new Set<string>();
        const streetLower = input.streetName.toLowerCase()
          .replace("شارع ", "")
          .replace("طريق ", "")
          .replace("جادة ", "");

        const places = [
          ...(restaurantsData.results || []),
          ...(cafesData.results || []),
          ...(foodData.results || []),
        ]
          .filter((p: any) => {
            if (seen.has(p.place_id)) return false;
            seen.add(p.place_id);
            // Include if address contains street name OR if it's a food/cafe place near the city
            const addr: string = (p.formatted_address || p.vicinity || "").toLowerCase();
            const name: string = (p.name || "").toLowerCase();
            const types: string[] = p.types || [];
            const isFoodPlace = types.some((t: string) =>
              ["restaurant", "cafe", "food", "meal_takeaway", "meal_delivery", "bakery", "bar"].includes(t)
            );
            const streetInAddr = addr.includes(streetLower) || addr.includes(input.streetName.toLowerCase());
            // Accept if: address has street name, OR it's a food place with city in address
            const cityLower = (input.cityName || "").toLowerCase();
            const cityInAddr = cityLower ? addr.includes(cityLower) : true;
            return streetInAddr || (isFoodPlace && cityInAddr);
          })
          .sort((a: any, b: any) => {
            // Prioritize places whose address contains the street name
            const aAddr = (a.formatted_address || a.vicinity || "").toLowerCase();
            const bAddr = (b.formatted_address || b.vicinity || "").toLowerCase();
            const aHasStreet = aAddr.includes(streetLower) ? 1 : 0;
            const bHasStreet = bAddr.includes(streetLower) ? 1 : 0;
            if (bHasStreet !== aHasStreet) return bHasStreet - aHasStreet;
            return (b.rating ?? 0) - (a.rating ?? 0);
          })
          .slice(0, 30)
          .map((p: any) => {
            const addr = (p.formatted_address || p.vicinity || "").toLowerCase();
            const onStreet = addr.includes(streetLower) || addr.includes(input.streetName.toLowerCase());
            return {
              placeId: p.place_id,
              name: p.name,
              address: p.formatted_address || p.vicinity || "",
              rating: p.rating ?? null,
              userRatingsTotal: p.user_ratings_total ?? 0,
              types: p.types ?? [],
              lat: p.geometry?.location?.lat ?? null,
              lng: p.geometry?.location?.lng ?? null,
              photoRef: p.photos?.[0]?.photo_reference ?? null,
              isOpen: p.opening_hours?.open_now ?? null,
              priceLevel: p.price_level ?? null,
              onStreet,
            };
          });

        // Auto-save places to googlePlaceRestaurants table
        try {
          const db = await getDb();
          if (db && input.cityId && input.streetId) {
            const { googlePlaceRestaurants } = await import("../../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            for (const place of places) {
              const existing = await db.select({ id: googlePlaceRestaurants.id })
                .from(googlePlaceRestaurants)
                .where(eq(googlePlaceRestaurants.placeId, place.placeId))
                .limit(1);
              if (existing.length === 0) {
                await db.insert(googlePlaceRestaurants).values({
                  placeId: place.placeId,
                  name: place.name,
                  address: place.address,
                  cityId: input.cityId,
                  streetId: input.streetId,
                  photoRef: place.photoRef,
                  rating: place.rating ? String(place.rating) : null,
                  userRatingsTotal: place.userRatingsTotal ?? 0,
                  types: JSON.stringify(place.types),
                  isOpen: place.isOpen,
                  isActive: false,
                });
              }
            }
          }
        } catch (_) {}

        return { places, status: "OK" };
      } catch (e: any) {
        console.error("[nearbyPlaces] error:", e.message);
        return { places: [], status: "ERROR" };
      }
    }),
});
