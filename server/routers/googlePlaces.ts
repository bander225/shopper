import { z } from "zod";
import { router, adminProcedure, phoneProtectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { googlePlaceRestaurants, menuItems, menuCategories, googlePlaceHours } from "../../drizzle/schema";
import { eq, and, like, or, asc } from "drizzle-orm";

// Google Place restaurants use restaurantId = -(placeDbId) as namespace in menuItems/menuCategories

export const googlePlacesRouter = router({
  // ===== ADMIN: List all Google Place restaurants =====
  listAll: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      cityId: z.number().optional(),
      streetId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      const conditions = [];
      if (input?.cityId) conditions.push(eq(googlePlaceRestaurants.cityId, input.cityId));
      if (input?.streetId) conditions.push(eq(googlePlaceRestaurants.streetId, input.streetId));
      if (input?.search) conditions.push(
        or(
          like(googlePlaceRestaurants.name, `%${input.search}%`),
          like(googlePlaceRestaurants.address, `%${input.search}%`)
        )
      );
      const rows = conditions.length > 0
        ? await database.select().from(googlePlaceRestaurants).where(and(...conditions)).orderBy(googlePlaceRestaurants.name)
        : await database.select().from(googlePlaceRestaurants).orderBy(googlePlaceRestaurants.name);
      return rows;
    }),

  // ===== ADMIN: Upsert a Google Place restaurant =====
  upsert: adminProcedure
    .input(z.object({
      placeId: z.string(),
      name: z.string(),
      address: z.string().optional(),
      cityId: z.number().optional(),
      streetId: z.number().optional(),
      photoRef: z.string().optional(),
      rating: z.number().optional(),
      userRatingsTotal: z.number().optional(),
      types: z.array(z.string()).optional(),
      isOpen: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database unavailable");
      const existing = await database.select().from(googlePlaceRestaurants)
        .where(eq(googlePlaceRestaurants.placeId, input.placeId)).limit(1);
      const typesStr = input.types ? JSON.stringify(input.types) : null;
      if (existing.length > 0) {
        await database.update(googlePlaceRestaurants).set({
          name: input.name,
          address: input.address ?? null,
          cityId: input.cityId ?? null,
          streetId: input.streetId ?? null,
          photoRef: input.photoRef ?? null,
          rating: input.rating ? String(input.rating) : null,
          userRatingsTotal: input.userRatingsTotal ?? 0,
          types: typesStr,
          isOpen: input.isOpen ?? null,
        }).where(eq(googlePlaceRestaurants.placeId, input.placeId));
        return { id: existing[0].id };
      } else {
        const [result] = await database.insert(googlePlaceRestaurants).values({
          placeId: input.placeId,
          name: input.name,
          address: input.address ?? null,
          cityId: input.cityId ?? null,
          streetId: input.streetId ?? null,
          photoRef: input.photoRef ?? null,
          rating: input.rating ? String(input.rating) : null,
          userRatingsTotal: input.userRatingsTotal ?? 0,
          types: typesStr,
          isOpen: input.isOpen ?? null,
          isActive: false,
        });
        return { id: (result as any).insertId };
      }
    }),

  // ===== ADMIN: Toggle active status =====
  toggleActive: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database unavailable");
      await database.update(googlePlaceRestaurants)
        .set({ isActive: input.isActive })
        .where(eq(googlePlaceRestaurants.id, input.id));
      return { success: true };
    }),

  // ===== ADMIN: Delete a Google Place restaurant =====
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database unavailable");
      await database.delete(menuItems).where(eq(menuItems.restaurantId, -input.id));
      await database.delete(googlePlaceRestaurants).where(eq(googlePlaceRestaurants.id, input.id));
      return { success: true };
    }),

  // ===== PUBLIC: List active Google Place restaurants by street =====
  listActive: publicProcedure
    .input(z.object({ streetId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      const rows = await database.select().from(googlePlaceRestaurants)
        .where(and(
          eq(googlePlaceRestaurants.isActive, true),
          eq(googlePlaceRestaurants.streetId, input.streetId)
        ))
        .orderBy(googlePlaceRestaurants.name);
      return rows.map((r: typeof googlePlaceRestaurants.$inferSelect) => ({
        ...r,
        types: r.types ? JSON.parse(r.types) : [],
        rating: r.rating ? parseFloat(String(r.rating)) : null,
        restaurantId: -r.id,
      }));
    }),

  // ===== PUBLIC: Get single Google Place restaurant =====
  getById: phoneProtectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database unavailable");
      const rows = await database.select().from(googlePlaceRestaurants)
        .where(eq(googlePlaceRestaurants.id, input.id)).limit(1);
      if (!rows[0]) throw new Error("لم يتم العثور على المطعم");
      const r = rows[0];
      return {
        ...r,
        types: r.types ? JSON.parse(r.types) : [],
        rating: r.rating ? parseFloat(String(r.rating)) : null,
      };
    }),

  // ===== PUBLIC: Get menu categories for a Google Place =====
  getCategories: publicProcedure
    .input(z.object({ placeDbId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      const nsId = -input.placeDbId;
      return database.select().from(menuCategories)
        .where(eq(menuCategories.restaurantId, nsId))
        .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name));
    }),

  // ===== PUBLIC: Get menu items for a Google Place =====
  getMenuItems: publicProcedure
    .input(z.object({ placeDbId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      const nsId = -input.placeDbId;
      return database.select().from(menuItems)
        .where(and(eq(menuItems.restaurantId, nsId), eq(menuItems.isAvailable, true)))
        .orderBy(asc(menuItems.sortOrder), asc(menuItems.name));
    }),

  // ===== ADMIN: Add category for a Google Place =====
  addCategory: adminProcedure
    .input(z.object({ placeDbId: z.number(), name: z.string(), sortOrder: z.number().optional() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database unavailable");
      const nsId = -input.placeDbId;
      await database.insert(menuCategories).values({ restaurantId: nsId, name: input.name, sortOrder: input.sortOrder ?? 0 });
      return { success: true };
    }),

  // ===== ADMIN: Delete category for a Google Place =====
  deleteCategory: adminProcedure
    .input(z.object({ categoryId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database unavailable");
      await database.delete(menuCategories).where(eq(menuCategories.id, input.categoryId));
      return { success: true };
    }),

  // ===== ADMIN: Add menu item for a Google Place =====
  addMenuItem: adminProcedure
    .input(z.object({
      placeDbId: z.number(),
      name: z.string(),
      description: z.string().optional(),
      price: z.string(),
      discountPrice: z.string().optional(),
      imageUrl: z.string().optional(),
      categoryId: z.number().optional(),
      isAvailable: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database unavailable");
      const nsId = -input.placeDbId;
      await database.insert(menuItems).values({
        restaurantId: nsId,
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        discountPrice: input.discountPrice ?? null,
        imageUrl: input.imageUrl ?? null,
        categoryId: input.categoryId ?? null,
        isAvailable: input.isAvailable ?? true,
        sortOrder: input.sortOrder ?? 0,
      });
      return { success: true };
    }),

  // ===== ADMIN: Update menu item for a Google Place =====
  updateMenuItem: adminProcedure
    .input(z.object({
      itemId: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.string().optional(),
      discountPrice: z.string().nullable().optional(),
      imageUrl: z.string().optional(),
      categoryId: z.number().optional(),
      isAvailable: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database unavailable");
      const { itemId, ...rest } = input;
      await database.update(menuItems).set(rest).where(eq(menuItems.id, itemId));
      return { success: true };
    }),

  // ===== ADMIN: Delete menu item for a Google Place =====
  deleteMenuItem: adminProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database unavailable");
      await database.delete(menuItems).where(eq(menuItems.id, input.itemId));
      return { success: true };
    }),

  // ===== ADMIN: Get all menu items for a Google Place (including unavailable) =====
  getAllMenuItems: adminProcedure
    .input(z.object({ placeDbId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      const nsId = -input.placeDbId;
      return database.select().from(menuItems)
        .where(eq(menuItems.restaurantId, nsId))
        .orderBy(asc(menuItems.sortOrder), asc(menuItems.name));
    }),

  // ===== ADMIN: Get hours for a Google Place =====
  getHours: adminProcedure
    .input(z.object({ placeDbId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      return database.select().from(googlePlaceHours)
        .where(eq(googlePlaceHours.placeDbId, input.placeDbId))
        .orderBy(asc(googlePlaceHours.dayOfWeek));
    }),

  // ===== PUBLIC: Get hours for a Google Place =====
  getHoursPublic: publicProcedure
    .input(z.object({ placeDbId: z.number() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return [];
      return database.select().from(googlePlaceHours)
        .where(eq(googlePlaceHours.placeDbId, input.placeDbId))
        .orderBy(asc(googlePlaceHours.dayOfWeek));
    }),

  // ===== ADMIN: Save hours for a Google Place (upsert all 7 days) =====
  saveHours: adminProcedure
    .input(z.object({
      placeDbId: z.number(),
      hours: z.array(z.object({
        dayOfWeek: z.number().min(0).max(6),
        isClosed: z.boolean(),
        openTime: z.string().optional(),
        closeTime: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database unavailable");
      // Delete existing and re-insert
      await database.delete(googlePlaceHours).where(eq(googlePlaceHours.placeDbId, input.placeDbId));
      if (input.hours.length > 0) {
        await database.insert(googlePlaceHours).values(
          input.hours.map(h => ({
            placeDbId: input.placeDbId,
            dayOfWeek: h.dayOfWeek,
            isClosed: h.isClosed,
            openTime: h.openTime ?? null,
            closeTime: h.closeTime ?? null,
          }))
        );
      }
      return { success: true };
    }),

  // ===== ADMIN: Update Google Place restaurant details =====
  updatePlace: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      address: z.string().optional(),
      cityId: z.number().optional(),
      streetId: z.number().optional(),
      isActive: z.boolean().optional(),
      googleMapsUrl: z.string().optional(),
      coverImageUrl: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database unavailable");
      const { id, ...rest } = input;
      await database.update(googlePlaceRestaurants).set(rest).where(eq(googlePlaceRestaurants.id, id));
      return { success: true };
    }),

  // Admin: set bags (hot/cold) for Google Place restaurant
  setBags: adminProcedure
    .input(z.object({
      id: z.number(),
      hasHotBag: z.boolean(),
      hasColdBag: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database unavailable");
      await database.update(googlePlaceRestaurants)
        .set({ hasHotBag: input.hasHotBag, hasColdBag: input.hasColdBag })
        .where(eq(googlePlaceRestaurants.id, input.id));
      return { success: true };
    }),
});
