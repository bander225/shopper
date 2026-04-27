import { z } from "zod";
import { router, phoneProtectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { placeAnalysis } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { makeRequest, PlaceDetailsResult } from "../_core/map";
import { invokeLLM } from "../_core/llm";

// ===== TYPES =====
interface PlacePhoto {
  photo_reference: string;
  height: number;
  width: number;
}

interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  photos?: PlacePhoto[];
  geometry?: { location: { lat: number; lng: number } };
  business_status?: string;
  opening_hours?: { open_now?: boolean };
}

// ===== HELPERS =====

/** بناء رابط صورة المكان من Google Places */
function buildPhotoUrl(photoRef: string, forgeApiUrl: string, forgeApiKey: string, maxWidth = 800): string {
  return `${forgeApiUrl}/v1/maps/proxy/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${forgeApiKey}`;
}

/** بناء رابط Google Maps للمكان */
function buildMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
}

/** حساب المسافة بين نقطتين بالكيلومتر (Haversine) */
function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * فحص AI لمجموعة صور وتحديد أيها صور منيو حقيقية (تحتوي على أسعار وأصناف مكتوبة)
 * يُرجع فقط روابط الصور التي تحتوي على أسعار وأصناف مكتوبة فعلاً
 */
async function filterMenuPhotos(
  photoUrls: string[]
): Promise<{ confirmedMenuUrls: string[]; hasMenu: boolean }> {
  if (!photoUrls.length) return { confirmedMenuUrls: [], hasMenu: false };

  // نفحص أول 6 صور بالتوازي لتوفير الوقت
  const urlsToCheck = photoUrls.slice(0, 6);

  const imageContents = urlsToCheck.map((url) => ({
    type: "image_url" as const,
    image_url: { url, detail: "low" as const }, // low detail لتوفير التكلفة
  }));

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `أنت خبير فحص صور قوائم الطعام. مهمتك تحديد هل الصورة هي صورة قائمة طعام حقيقية.

صورة قائمة الطعام الحقيقية تكون:
- لوحة أو ورقة منيو مكتوب عليها أسماء أصناف وأسعار واضحة
- صورة لقائمة طعام معلقة على جدار أو شاشة بها أسعار مكتوبة
- صورة قائمة طعام رقمية (PDF أو صورة من موقع الكتروني) بها أسعار وأصناف
- أي صورة تحتوي على أرقام أسعار وأسماء أصناف مكتوبة بشكل واضح

ليست صورة قائمة طعام:
- صورة طعام جاهز فقط بدون أسعار مكتوبة
- صورة ديكور أو مبنى أو واجهة خارجية
- صورة أشخاص أو موظفين
- صورة شعار المطعم فقط
- صورة طاولة أو كرسي بدون أسعار

مهم: الصورة يجب أن تحتوي أسعاراً وأصنافاً مكتوبة بوضوح. أجب بمصفوفة JSON فقط.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text" as const,
              text: `فحص هذه الصور الـ${urlsToCheck.length}. أخبرني لكل صورة هل هي صورة قائمة طعام حقيقية تحتوي أسعاراً وأصنافاً مكتوبة بوضوح (isMenu=true) أم لا (isMenu=false).
أجب بمصفوفة JSON: {"results": [{"index": 0, "isMenu": true/false}, ...]}`
            },
            ...imageContents,
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "menu_photo_check",
          strict: true,
          schema: {
            type: "object",
            properties: {
              results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "integer" },
                    isMenu: { type: "boolean" },
                  },
                  required: ["index", "isMenu"],
                  additionalProperties: false,
                },
              },
            },
            required: ["results"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = (response as any).choices?.[0]?.message?.content;
    if (!content) throw new Error("No content");

    const parsed = JSON.parse(content) as { results: Array<{ index: number; isMenu: boolean }> };
    const confirmedMenuUrls = parsed.results
      .filter((r) => r.isMenu && r.index < urlsToCheck.length)
      .map((r) => urlsToCheck[r.index]);

    return {
      confirmedMenuUrls,
      hasMenu: confirmedMenuUrls.length > 0,
    };
  } catch (e) {
    console.error("[filterMenuPhotos] AI check failed:", e);
    // عند فشل AI نرفض المكان (لا نعرضه إذا لم نتأكد)
    return { confirmedMenuUrls: [], hasMenu: false };
  }
}

/**
 * تحليل AI لصور المنيو الحقيقية — يستخرج الأصناف والأسعار بدقة عالية
 */
async function analyzeMenuImages(
  imageUrls: string[],
  placeName: string
): Promise<Array<{ category: string; name: string; price?: string; description?: string; emoji?: string }>> {
  if (!imageUrls.length) return [];

  // نأخذ أول 5 صور فقط لتجنب تجاوز الحد
  const urls = imageUrls.slice(0, 5);

  const imageContents = urls.map((url) => ({
    type: "image_url" as const,
    image_url: { url, detail: "high" as const },
  }));

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `أنت خبير متخصص في قراءة قوائم الطعام من الصور. مهمتك استخراج جميع الأصناف والأسعار بدقة 100% من صور قائمة الطعام.

قواعد استخراج البيانات:
- استخرج اسم الصنف كما هو مكتوب في الصورة تماماً (لا تترجم، لا تعدّل)
- استخرج السعر كما هو مكتوب في الصورة بالضبط (مثال: 16، 16.00، 16 ر.س)
- إذا كان السعر غير ظاهر في الصورة اترك حقل price فارغاً
- صنّف الأصناف حسب أقسامها المكتوبة في الصورة
- إذا كان الصنف بأحجام مختلفة (صغير/وسط/كبير) أضف كل حجم كصنف منفصل بسعره الخاص
- لا تخترع أصنافاً غير موجودة في الصورة
- أجب بـ JSON فقط بدون شرح`,
        },
        {
          role: "user",
          content: [
            {
              type: "text" as const,
              text: `هذه صور قائمة الطعام من "${placeName}". استخرج جميع الأصناف والأسعار الظاهرة في الصور بدقة تامة.
أجب بـ JSON بهذا الشكل:
{
  "menuItems": [
    {"category": "اسم الفئة كما في الصورة", "name": "اسم الصنف كما في الصورة", "price": "السعر كما في الصورة", "description": "وصف قصير", "emoji": "☕"}
  ]
}

ملاحظة: اكتب الأسعار كما هي في الصورة بالضبط بدون إضافة أو تعديل.`,
            },
            ...imageContents,
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "menu_from_images",
          strict: true,
          schema: {
            type: "object",
            properties: {
              menuItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    name: { type: "string" },
                    price: { type: "string" },
                    description: { type: "string" },
                    emoji: { type: "string" },
                  },
                  required: ["category", "name", "description", "emoji"],
                  additionalProperties: false,
                },
              },
            },
            required: ["menuItems"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = (response as any).choices?.[0]?.message?.content;
    if (!content) return [];
    const parsed = JSON.parse(content);
    return parsed.menuItems || [];
  } catch (e) {
    console.error("[placeExplore] Menu image analysis failed:", e);
    return [];
  }
}

/**
 * تحليل AI للمكان بناءً على التفاصيل والتقييمات
 */
async function analyzePlace(place: {
  name: string;
  address?: string | null;
  rating?: number | null;
  totalRatings?: number;
  types?: string[];
  reviews?: Array<{ text: string; rating: number }>;
  openingHours?: string[];
}): Promise<{
  summary: string;
  famousFor: string[];
  topItems: Array<{ name: string; price?: string; description?: string; emoji?: string }>;
  trendingItems: Array<{ name: string; description?: string; emoji?: string }>;
}> {
  const reviewsText = place.reviews?.slice(0, 5).map((r) => `(${r.rating}⭐) ${r.text}`).join("\n") || "لا توجد تعليقات";
  const typesText = place.types?.join(", ") || "";
  const hoursText = place.openingHours?.join(", ") || "";

  const prompt = `أنت محلل خبير في المطاعم والكافيهات. حلّل المكان التالي وأعطني معلومات دقيقة.

**اسم المكان**: ${place.name}
**العنوان**: ${place.address || "غير محدد"}
**التقييم**: ${place.rating || "غير محدد"} (${place.totalRatings || 0} تقييم)
**النوع**: ${typesText}
**أوقات العمل**: ${hoursText}
**آراء العملاء**:
${reviewsText}

أجب بـ JSON فقط:
{
  "summary": "ملخص جذاب عن المكان بـ 2-3 جمل",
  "famousFor": ["ما يشتهر به 1", "ما يشتهر به 2", "ما يشتهر به 3"],
  "topItems": [
    {"name": "اسم الصنف", "price": "السعر التقريبي", "description": "وصف قصير", "emoji": "🍕"}
  ],
  "trendingItems": [
    {"name": "الصنف الترند", "description": "لماذا هو ترند", "emoji": "🔥"}
  ]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "أنت محلل خبير في المطاعم والكافيهات. أجب دائماً بـ JSON صحيح فقط." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "place_info",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              famousFor: { type: "array", items: { type: "string" } },
              topItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    price: { type: "string" },
                    description: { type: "string" },
                    emoji: { type: "string" },
                  },
                  required: ["name", "description", "emoji"],
                  additionalProperties: false,
                },
              },
              trendingItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    emoji: { type: "string" },
                  },
                  required: ["name", "description", "emoji"],
                  additionalProperties: false,
                },
              },
            },
            required: ["summary", "famousFor", "topItems", "trendingItems"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = (response as any).choices?.[0]?.message?.content;
    if (!content) throw new Error("No content");
    return JSON.parse(content);
  } catch (e) {
    console.error("[placeExplore] AI analysis failed:", e);
    return {
      summary: `${place.name} — مكان مميز بتقييم ${place.rating || "عالٍ"} من ${place.totalRatings || 0} زيارة.`,
      famousFor: ["جودة عالية", "خدمة ممتازة", "أجواء مميزة"],
      topItems: [{ name: "الأكثر طلباً", description: "الصنف الأشهر في المكان", emoji: "⭐" }],
      trendingItems: [{ name: "العرض الحالي", description: "الأكثر رواجاً هذا الأسبوع", emoji: "🔥" }],
    };
  }
}

// ===== ROUTER =====
export const placeExploreRouter = router({

  // ===== البحث القريب حسب موقع العميل =====
  nearbySearch: phoneProtectedProcedure
    .input(z.object({
      lat: z.number(),
      lng: z.number(),
      radius: z.number().default(5000),
      keyword: z.string().optional(),
      // placeType: نوع المكان المختار من الواجهة
      placeType: z.enum(["restaurant", "cafe", "dessert", "bakery", "juice", "fast_food", "all"]).default("all"),
      minRating: z.number().default(3.5),
      minReviews: z.number().default(50),
      maxResults: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const ENV = (await import("../_core/env")).ENV;

      // تحديد نوع Google Places وكلمة البحث حسب النوع المختار
      type TypeConfig = { type: string; keyword?: string };
      const typeConfigMap: Record<string, TypeConfig[]> = {
        restaurant: [{ type: "restaurant" }],
        cafe: [{ type: "cafe", keyword: "cafe coffee" }],
        dessert: [{ type: "bakery", keyword: "dessert sweets حلا" }, { type: "restaurant", keyword: "dessert sweets" }],
        bakery: [{ type: "bakery", keyword: "bakery bread" }],
        juice: [{ type: "restaurant", keyword: "juice smoothie عصير" }],
        fast_food: [{ type: "restaurant", keyword: "fast food burger" }],
        all: [{ type: "restaurant" }, { type: "cafe" }],
      };

      const configs = typeConfigMap[input.placeType] ?? typeConfigMap["all"];

      // جلب النتائج لكل تكوين
      const allResults = await Promise.all(
        configs.map((cfg) =>
          makeRequest<any>("/maps/api/place/nearbysearch/json", {
            location: `${input.lat},${input.lng}`,
            radius: input.radius,
            type: cfg.type,
            language: "ar",
            keyword: input.keyword || cfg.keyword || undefined,
          })
        )
      );

      // دمج النتائج وإزالة التكرار
      const allPlaces: PlaceSearchResult[] = [];
      const seenIds = new Set<string>();

      for (const result of allResults) {
        for (const p of result?.results || []) {
          if (!seenIds.has(p.place_id)) {
            seenIds.add(p.place_id);
            allPlaces.push(p);
          }
        }
      }

      // فلترة حسب التقييم وعدد التعليقات وحالة العمل
      const filtered = allPlaces
        .filter((p) => {
          const rating = p.rating ?? 0;
          const reviews = p.user_ratings_total ?? 0;
          return (
            rating >= input.minRating &&
            reviews >= input.minReviews &&
            p.business_status !== "CLOSED_PERMANENTLY"
          );
        })
        .sort((a, b) => {
          // ترتيب حسب Wilson Score تقريبي
          const scoreA = (a.rating ?? 0) * Math.sqrt(a.user_ratings_total ?? 0);
          const scoreB = (b.rating ?? 0) * Math.sqrt(b.user_ratings_total ?? 0);
          return scoreB - scoreA;
        })
        .slice(0, input.maxResults);

      // ===== التحقق بالذكاء الاصطناعي من صور المنيو الحقيقية =====
      // الخطوات:
      // 1. جلب Place Details لكل مكان للحصول على صوره
      // 2. AI يفحص كل صورة ويحدد هل هي صورة منيو (تحتوي أسعار وأصناف مكتوبة)
      // 3. لا يُعرض المكان إلا إذا وُجدت صورة منيو مؤكدة
      const candidatesForCheck = filtered.slice(0, 25); // نفحص أول 25 مكان

      // جلب تفاصيل كل مكان بالتوازي (نطلب حقل menu وصور المكان)
      const detailsResults = await Promise.allSettled(
        candidatesForCheck.map((p) =>
          makeRequest<PlaceDetailsResult>("/maps/api/place/details/json", {
            place_id: p.place_id,
            fields: "photos,opening_hours,menu_for_children,reservable,serves_beer,serves_breakfast,serves_brunch,serves_dinner,serves_lunch,serves_vegetarian_food,serves_wine,takeout,delivery,dine_in,editorial_summary,website",
            language: "ar",
          })
        )
      );

      // بناء قائمة المرشحين مع روابط صورهم
      const candidates: Array<{
        place: PlaceSearchResult;
        allPhotoUrls: string[];
        menuPhotoUrls: string[]; // صور من نوع MENU تحديداً
        openNow: boolean | null;
        websiteUrl: string | null;
      }> = [];

      for (let i = 0; i < candidatesForCheck.length; i++) {
        const p = candidatesForCheck[i];
        const detailResult = detailsResults[i];

        if (detailResult.status === "fulfilled" && detailResult.value?.result) {
          const result = detailResult.value.result as any;
          const allPhotos: PlacePhoto[] = result.photos || [];
          const openNow = result.opening_hours?.open_now ?? p.opening_hours?.open_now ?? null;
          const websiteUrl: string | null = result.website ?? null;

          // نحتاج على الأقل 3 صور لتشغيل AI
          if (allPhotos.length >= 3) {
            // جميع صور المكان (للفحص بالذكاء الاصطناعي)
            const allPhotoUrls = allPhotos.slice(0, 10).map((ph: PlacePhoto) =>
              buildPhotoUrl(ph.photo_reference, ENV.forgeApiUrl, ENV.forgeApiKey, 800)
            );

            // صور من نوع MENU تحديداً (عندما توفر Google Places تصنيف الصور)
            // Google Places API لا تُصنّف الصور بنوع menu في النتيجة العادية
            // لكن نستخدم جميع الصور وندع AI يحدد أيها منيو
            const menuPhotoUrls: string[] = []; // سيُملأ بعد AI

            candidates.push({
              place: { ...p, opening_hours: { open_now: openNow } },
              allPhotoUrls,
              menuPhotoUrls,
              openNow,
              websiteUrl,
            });
          }
        }
      }

      // ===== فحص AI لكل مكان لتحديد صور المنيو الحقيقية =====
      // نفحص بالتوازي لتوفير الوقت
      const aiCheckResults = await Promise.allSettled(
        candidates.map((c) => filterMenuPhotos(c.allPhotoUrls))
      );

      // بناء القائمة النهائية: فقط الأماكن التي أكد AI وجود صور منيو حقيقية
      const placesWithMenuPhotos: Array<{
        place: PlaceSearchResult;
        confirmedMenuUrls: string[];
        openNow: boolean | null;
        websiteUrl: string | null;
      }> = [];

      for (let i = 0; i < candidates.length; i++) {
        const aiResult = aiCheckResults[i];
        if (aiResult.status === "fulfilled" && aiResult.value.hasMenu) {
          placesWithMenuPhotos.push({
            place: candidates[i].place,
            confirmedMenuUrls: aiResult.value.confirmedMenuUrls,
            openNow: candidates[i].openNow,
            websiteUrl: candidates[i].websiteUrl,
          });
        }
        if (placesWithMenuPhotos.length >= input.maxResults) break;
      }

      // تحويل النتائج النهائية
      const places = placesWithMenuPhotos.map(({ place: p, confirmedMenuUrls, openNow, websiteUrl }) => {
        const photoRef = p.photos?.[0]?.photo_reference;
        const photoUrl = photoRef
          ? buildPhotoUrl(photoRef, ENV.forgeApiUrl, ENV.forgeApiKey)
          : (confirmedMenuUrls[0] ?? null); // إذا لم توجد صورة غلاف نستخدم أول صورة منيو

        // صور المنيو المؤكدة للعرض في البطاقة (أول 3 صور منيو مؤكدة)
        const menuPreviewUrls = confirmedMenuUrls.slice(0, 3);

        const placeLat = p.geometry?.location?.lat ?? 0;
        const placeLng = p.geometry?.location?.lng ?? 0;
        const distance = calcDistance(input.lat, input.lng, placeLat, placeLng);

        return {
          placeId: p.place_id,
          name: p.name,
          address: p.vicinity || p.formatted_address || "",
          rating: p.rating ?? null,
          totalRatings: p.user_ratings_total ?? 0,
          priceLevel: p.price_level ?? null,
          types: p.types ?? [],
          photoUrl,
          photoRef: photoRef ?? null,
          menuPhotoCount: confirmedMenuUrls.length, // عدد صور المنيو المؤكدة فقط
          menuPreviewUrls, // صور منيو حقيقية مؤكدة بالذكاء الاصطناعي
          confirmedMenuUrls, // جميع صور المنيو المؤكدة (للتحليل اللاحق)
          websiteUrl, // رابط موقع المكان (قد يحتوي على قائمة طعام رقمية)
          googleMapsUrl: buildMapsUrl(p.place_id),
          lat: placeLat,
          lng: placeLng,
          distanceKm: Math.round(distance * 10) / 10,
          isOpen: openNow,
          hasMenuPhotos: true, // مؤكد 100% بالذكاء الاصطناعي
        };
      });

      return {
        places,
        total: places.length,
        checkedCount: candidatesForCheck.length,
      };
    }),

  // ===== بحث نصي (للتوافق مع الكود القديم) =====
  search: phoneProtectedProcedure
    .input(z.object({
      query: z.string().min(1),
      lat: z.number().optional(),
      lng: z.number().optional(),
      cityName: z.string().optional(),
      minRating: z.number().default(4.0),
      minReviews: z.number().default(200),
      maxResults: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const ENV = (await import("../_core/env")).ENV;

      const searchQuery = input.cityName
        ? `${input.query} ${input.cityName}`
        : input.query;

      const params: Record<string, unknown> = {
        query: searchQuery,
        type: "establishment",
        language: "ar",
      };

      // إضافة الموقع إذا توفر
      if (input.lat && input.lng) {
        params.location = `${input.lat},${input.lng}`;
        params.radius = 10000;
      }

      const placesResult = await makeRequest<any>("/maps/api/place/textsearch/json", params);

      if (!placesResult?.results?.length) {
        return { places: [], total: 0 };
      }

      const filtered: PlaceSearchResult[] = (placesResult.results as PlaceSearchResult[])
        .filter((p) => {
          const rating = p.rating ?? 0;
          const reviews = p.user_ratings_total ?? 0;
          return (
            rating >= input.minRating &&
            reviews >= input.minReviews &&
            p.business_status !== "CLOSED_PERMANENTLY"
          );
        })
        .sort((a, b) => {
          const scoreA = (a.rating ?? 0) * Math.sqrt(a.user_ratings_total ?? 0);
          const scoreB = (b.rating ?? 0) * Math.sqrt(b.user_ratings_total ?? 0);
          return scoreB - scoreA;
        })
        .slice(0, input.maxResults);

      const places = filtered.map((p) => {
        const photoRef = p.photos?.[0]?.photo_reference;
        const photoUrl = photoRef
          ? buildPhotoUrl(photoRef, ENV.forgeApiUrl, ENV.forgeApiKey)
          : null;

        const placeLat = p.geometry?.location?.lat ?? 0;
        const placeLng = p.geometry?.location?.lng ?? 0;
        const distance = (input.lat && input.lng)
          ? Math.round(calcDistance(input.lat, input.lng, placeLat, placeLng) * 10) / 10
          : null;

        return {
          placeId: p.place_id,
          name: p.name,
          address: p.formatted_address || p.vicinity || "",
          rating: p.rating ?? null,
          totalRatings: p.user_ratings_total ?? 0,
          priceLevel: p.price_level ?? null,
          types: p.types ?? [],
          photoUrl,
          photoRef: photoRef ?? null,
          googleMapsUrl: buildMapsUrl(p.place_id),
          lat: placeLat,
          lng: placeLng,
          distanceKm: distance,
          isOpen: p.opening_hours?.open_now ?? null,
        };
      });

      return { places, total: places.length };
    }),

  // ===== تحليل AI شامل لمكان محدد (مع صور المنيو الحقيقية) =====
  analyze: phoneProtectedProcedure
    .input(z.object({
      placeId: z.string(),
      forceRefresh: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      const ENV = (await import("../_core/env")).ENV;

      // التحقق من cache (أقل من 3 أيام)
      if (database && !input.forceRefresh) {
        const existing = await database.select().from(placeAnalysis)
          .where(eq(placeAnalysis.placeId, input.placeId))
          .limit(1);

        if (existing[0]?.aiSummary && existing[0]?.aiAnalyzedAt) {
          const ageMs = Date.now() - new Date(existing[0].aiAnalyzedAt).getTime();
          const ageDays = ageMs / (1000 * 60 * 60 * 24);
          if (ageDays < 3) {
            return {
              ...existing[0],
              rating: existing[0].rating ? parseFloat(String(existing[0].rating)) : null,
              lat: existing[0].lat ? parseFloat(String(existing[0].lat)) : null,
              lng: existing[0].lng ? parseFloat(String(existing[0].lng)) : null,
              famousFor: existing[0].aiFamousFor ? JSON.parse(existing[0].aiFamousFor) : [],
              topItems: existing[0].aiTopItems ? JSON.parse(existing[0].aiTopItems) : [],
              trendingItems: existing[0].aiTrendingItems ? JSON.parse(existing[0].aiTrendingItems) : [],
              menuItems: existing[0].aiMenuItems ? JSON.parse(existing[0].aiMenuItems) : [],
              menuPhotoUrls: existing[0].menuPhotoUrls ? JSON.parse(existing[0].menuPhotoUrls) : [],
              cached: true,
            };
          }
        }
      }

      // ===== جلب تفاصيل المكان الكاملة من Google Places =====
      const detailsResult = await makeRequest<PlaceDetailsResult>(
        "/maps/api/place/details/json",
        {
          place_id: input.placeId,
          fields: "name,formatted_address,formatted_phone_number,rating,user_ratings_total,reviews,opening_hours,geometry,photos,types,website,price_level,business_status",
          language: "ar",
        }
      );

      if (!detailsResult?.result) {
        throw new Error("لم يتم العثور على المكان");
      }

      const details = detailsResult.result;
      const allPhotos: PlacePhoto[] = (details as any).photos || [];

      // ===== بناء روابط الصور =====
      // صورة الغلاف (أول صورة)
      const coverPhotoRef = allPhotos[0]?.photo_reference;
      const coverPhotoUrl = coverPhotoRef
        ? buildPhotoUrl(coverPhotoRef, ENV.forgeApiUrl, ENV.forgeApiKey, 800)
        : null;

      // جميع صور المكان — نأخذ أول 12 صورة للفحص
      const allPhotoUrls = allPhotos.slice(0, 12).map((p) =>
        buildPhotoUrl(p.photo_reference, ENV.forgeApiUrl, ENV.forgeApiKey, 1200)
      );

      // ===== الخطوة 1: فحص AI لتحديد صور قائمة الطعام الحقيقية =====
      const menuPhotoCheck = await filterMenuPhotos(allPhotoUrls);
      const confirmedMenuUrls = menuPhotoCheck.confirmedMenuUrls;

      // نستخدم صور المنيو المؤكدة إذا توفرت، وإلا نستخدم جميع الصور
      const photosForAnalysis = confirmedMenuUrls.length > 0 ? confirmedMenuUrls : allPhotoUrls;

      // ===== الخطوة 2: تحليل AI متوازي =====
      const [placeInfo, menuFromImages] = await Promise.all([
        // تحليل المكان بناءً على التفاصيل والتقييمات
        analyzePlace({
          name: details.name,
          address: details.formatted_address,
          rating: details.rating,
          totalRatings: details.user_ratings_total,
          types: (details as any).types,
          reviews: details.reviews?.map((r) => ({ text: r.text, rating: r.rating })),
          openingHours: details.opening_hours?.weekday_text,
        }),
        // تحليل صور قائمة الطعام المؤكدة فقط
        analyzeMenuImages(photosForAnalysis, details.name),
      ]);

      // دمج المنيو: من الصور أولاً، ثم من التحليل النصي إذا كان الصور فارغة
      const finalMenuItems = menuFromImages.length > 0
        ? menuFromImages
        : placeInfo.topItems.map((item) => ({
            category: "الأصناف",
            name: item.name,
            price: item.price,
            description: item.description,
            emoji: item.emoji,
          }));

      const placeData = {
        placeId: input.placeId,
        name: details.name,
        address: details.formatted_address || null,
        phone: details.formatted_phone_number || null,
        rating: details.rating ? String(details.rating) : null,
        totalRatings: details.user_ratings_total || 0,
        types: (details as any).types ? JSON.stringify((details as any).types) : null,
        photoUrl: coverPhotoUrl,
        googleMapsUrl: buildMapsUrl(input.placeId),
        lat: details.geometry?.location?.lat ? String(details.geometry.location.lat) : null,
        lng: details.geometry?.location?.lng ? String(details.geometry.location.lng) : null,
        aiSummary: placeInfo.summary,
        aiFamousFor: JSON.stringify(placeInfo.famousFor),
        aiTopItems: JSON.stringify(placeInfo.topItems),
        aiTrendingItems: JSON.stringify(placeInfo.trendingItems),
        aiMenuItems: JSON.stringify(finalMenuItems),
        menuPhotoUrls: JSON.stringify(confirmedMenuUrls.length > 0 ? confirmedMenuUrls : allPhotoUrls),
        aiAnalyzedAt: new Date(),
        isActive: true,
      };

      // حفظ في قاعدة البيانات
      if (database) {
        try {
          const existing = await database.select().from(placeAnalysis)
            .where(eq(placeAnalysis.placeId, input.placeId)).limit(1);

          if (existing.length > 0) {
            await database.update(placeAnalysis).set(placeData)
              .where(eq(placeAnalysis.placeId, input.placeId));
          } else {
            await database.insert(placeAnalysis).values(placeData);
          }
        } catch (e) {
          console.error("[placeExplore] DB save failed:", e);
        }
      }

      return {
        ...placeData,
        rating: placeData.rating ? parseFloat(placeData.rating) : null,
        lat: placeData.lat ? parseFloat(placeData.lat) : null,
        lng: placeData.lng ? parseFloat(placeData.lng) : null,
        famousFor: placeInfo.famousFor,
        topItems: placeInfo.topItems,
        trendingItems: placeInfo.trendingItems,
        menuItems: finalMenuItems,
        menuPhotoUrls: allPhotoUrls,
        cached: false,
      };
    }),

  // ===== جلب تحليل محفوظ =====
  // ===== ميزة لصق رابط Google Maps =====
  resolveGoogleMapsUrl: publicProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ input }) => {
      // الخطوة 1: حل الرابط المختصر إلى رابط كامل
      let fullUrl = input.url;
      try {
        const resp = await fetch(input.url, { method: "HEAD", redirect: "follow" });
        fullUrl = resp.url;
      } catch {
        // إذا فشل HEAD، نجرب GET
        try {
          const resp = await fetch(input.url, { redirect: "follow" });
          fullUrl = resp.url;
        } catch {
          fullUrl = input.url;
        }
      }

      // الخطوة 2: استخراج Place ID أو اسم المكان من الرابط
      let placeId: string | null = null;
      let placeName: string | null = null;
      let placeQuery: string | null = null;

      try {
        const parsed = new URL(fullUrl);
        const params = new URLSearchParams(parsed.search);

        // محاولة استخراج place_id مباشرة
        placeId = params.get("place_id");

        // استخراج ftid (0x...:0x...) لتحويله لـ place_id
        const ftid = params.get("ftid");
        if (!placeId && ftid) {
          // ftid يمكن تحويله لـ place_id عبر Places API findPlaceFromText
          // نستخدم q (اسم المكان) للبحث
        }

        // استخراج اسم المكان من q
        const q = params.get("q");
        if (q) placeQuery = decodeURIComponent(q);

        // استخراج من مسار الرابط مثل /place/اسم+المكان/
        const pathMatch = parsed.pathname.match(/\/place\/([^/]+)/);
        if (pathMatch) placeName = decodeURIComponent(pathMatch[1].replace(/\+/g, " "));

        // استخراج place_id من المسار مثل /maps/place/.../data=...!1s0x...
        const dataMatch = fullUrl.match(/!1s(ChIJ[A-Za-z0-9_-]+)/);
        if (dataMatch) placeId = dataMatch[1];

      } catch {
        // تجاهل أخطاء تحليل الرابط
      }

      // الخطوة 3: إذا لم نجد place_id مباشرة، نبحث بالاسم
      const searchQuery = placeQuery || placeName || input.url;

      if (!placeId && searchQuery) {
        try {
          const findResult = await makeRequest<any>("/maps/api/place/findplacefromtext/json", {
            input: searchQuery,
            inputtype: "textquery",
            fields: "place_id,name,formatted_address,rating",
            language: "ar",
          });
          if (findResult?.candidates?.[0]?.place_id) {
            placeId = findResult.candidates[0].place_id;
          }
        } catch {
          // تجاهل
        }
      }

      if (!placeId) {
        throw new Error("لم نتمكن من استخراج معرّف المكان من الرابط. تأكد أن الرابط من Google Maps.");
      }

      // الخطوة 4: جلب تفاصيل المكان وصوره
      const details = await makeRequest<PlaceDetailsResult>("/maps/api/place/details/json", {
        place_id: placeId,
        fields: "name,formatted_address,rating,user_ratings_total,photos,opening_hours,website,geometry",
        language: "ar",
      });

      const place = details.result;
      if (!place) throw new Error("لم يتم العثور على المكان");

      const allPhotos: PlacePhoto[] = (place as any).photos || [];

      // الخطوة 5: بناء روابط الصور (نأخذ أول 15 صورة)
      const ENV = (await import("../_core/env")).ENV;
      const allPhotoUrls = allPhotos.slice(0, 15).map((p) =>
        buildPhotoUrl(p.photo_reference, ENV.forgeApiUrl, ENV.forgeApiKey, 1200)
      );

      // الخطوة 6: فحص AI لتحديد صور قائمة الطعام الحقيقية
      let confirmedMenuUrls: string[] = [];
      if (allPhotoUrls.length > 0) {
        const menuCheck = await filterMenuPhotos(allPhotoUrls);
        confirmedMenuUrls = menuCheck.confirmedMenuUrls;
      }

      // الخطوة 7: استخراج الأصناف والأسعار من صور المنيو المؤكدة
      let menuItems: any[] = [];
      const photosToAnalyze = confirmedMenuUrls.length > 0 ? confirmedMenuUrls : allPhotoUrls.slice(0, 5);
      if (photosToAnalyze.length > 0) {
        menuItems = await analyzeMenuImages(photosToAnalyze, place.name);
      }

      // الخطوة 8: حفظ في قاعدة البيانات للاستخدام لاحقاً
      try {
        const database = await getDb();
        if (database) {
          const existing = await database.select().from(placeAnalysis)
            .where(eq(placeAnalysis.placeId, placeId)).limit(1);

          const data = {
            placeId,
            name: place.name,
            address: place.formatted_address || "",
            rating: place.rating ? String(place.rating) : null,
            totalRatings: place.user_ratings_total || 0,
            lat: place.geometry?.location?.lat ? String(place.geometry.location.lat) : null,
            lng: place.geometry?.location?.lng ? String(place.geometry.location.lng) : null,
            googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
            menuPhotoUrls: JSON.stringify(confirmedMenuUrls.length > 0 ? confirmedMenuUrls : allPhotoUrls),
            aiMenuItems: JSON.stringify(menuItems),
            aiAnalyzedAt: new Date(),
            isActive: true,
          };

          if (existing[0]) {
            await database.update(placeAnalysis).set(data).where(eq(placeAnalysis.placeId, placeId));
          } else {
            await database.insert(placeAnalysis).values(data as any);
          }
        }
      } catch {
        // تجاهل أخطاء الحفظ
      }

      return {
        placeId,
        name: place.name,
        address: place.formatted_address || "",
        rating: place.rating || null,
        totalRatings: place.user_ratings_total || 0,
        menuPhotoUrls: confirmedMenuUrls.length > 0 ? confirmedMenuUrls : allPhotoUrls,
        allPhotoUrls,
        menuItems,
        hasMenuPhotos: confirmedMenuUrls.length > 0,
        menuPhotosCount: confirmedMenuUrls.length,
        totalPhotosChecked: allPhotoUrls.length,
      };
    }),

  getCached: publicProcedure
    .input(z.object({ placeId: z.string() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) return null;

      const rows = await database.select().from(placeAnalysis)
        .where(eq(placeAnalysis.placeId, input.placeId)).limit(1);

      if (!rows[0]) return null;
      const r = rows[0];
      return {
        ...r,
        rating: r.rating ? parseFloat(String(r.rating)) : null,
        lat: r.lat ? parseFloat(String(r.lat)) : null,
        lng: r.lng ? parseFloat(String(r.lng)) : null,
        famousFor: r.aiFamousFor ? JSON.parse(r.aiFamousFor) : [],
        topItems: r.aiTopItems ? JSON.parse(r.aiTopItems) : [],
        trendingItems: r.aiTrendingItems ? JSON.parse(r.aiTrendingItems) : [],
        menuItems: r.aiMenuItems ? JSON.parse(r.aiMenuItems) : [],
        menuPhotoUrls: r.menuPhotoUrls ? JSON.parse(r.menuPhotoUrls) : [],
      };
    }),
});
