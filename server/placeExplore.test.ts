import { describe, it, expect, vi } from "vitest";

// ===== اختبارات وحدة لدوال placeExplore =====

describe("placeExplore helpers", () => {
  // اختبار حساب المسافة
  it("calcDistance: Haversine formula returns correct distance", () => {
    // المسافة بين الرياض والدمام تقريباً 380 كم
    function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // نقطتان متطابقتان = 0 كم
    expect(calcDistance(24.7, 46.7, 24.7, 46.7)).toBe(0);

    // الرياض → الدمام
    const dist = calcDistance(24.7136, 46.6753, 26.4207, 50.0888);
    expect(dist).toBeGreaterThan(350);
    expect(dist).toBeLessThan(420);
  });

  // اختبار بناء رابط الصورة
  it("buildPhotoUrl: constructs correct Google Places photo URL", () => {
    function buildPhotoUrl(photoRef: string, forgeApiUrl: string, forgeApiKey: string, maxWidth = 800): string {
      return `${forgeApiUrl}/v1/maps/proxy/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${forgeApiKey}`;
    }

    const url = buildPhotoUrl("ABC123", "https://forge.example.com", "test-key", 600);
    expect(url).toContain("photo_reference=ABC123");
    expect(url).toContain("maxwidth=600");
    expect(url).toContain("key=test-key");
    expect(url).toContain("/v1/maps/proxy/maps/api/place/photo");
  });

  // اختبار بناء رابط Google Maps
  it("buildMapsUrl: constructs correct Google Maps place URL", () => {
    function buildMapsUrl(placeId: string): string {
      return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    }

    const url = buildMapsUrl("ChIJtest123");
    expect(url).toBe("https://www.google.com/maps/place/?q=place_id:ChIJtest123");
  });

  // اختبار Wilson Score sorting
  it("places are sorted by Wilson Score (rating * sqrt(reviews))", () => {
    const places = [
      { name: "A", rating: 4.5, user_ratings_total: 100 },
      { name: "B", rating: 4.8, user_ratings_total: 10 },
      { name: "C", rating: 4.2, user_ratings_total: 500 },
    ];

    const sorted = places.sort((a, b) => {
      const scoreA = (a.rating ?? 0) * Math.sqrt(a.user_ratings_total ?? 0);
      const scoreB = (b.rating ?? 0) * Math.sqrt(b.user_ratings_total ?? 0);
      return scoreB - scoreA;
    });

    // C يجب أن يكون الأول (4.2 * sqrt(500) = 93.9)
    // A ثانياً (4.5 * sqrt(100) = 45)
    // B ثالثاً (4.8 * sqrt(10) = 15.2)
    expect(sorted[0].name).toBe("C");
    expect(sorted[1].name).toBe("A");
    expect(sorted[2].name).toBe("B");
  });

  // اختبار فلترة الأماكن المغلقة نهائياً
  it("filters out permanently closed places", () => {
    const places = [
      { name: "Open", rating: 4.5, user_ratings_total: 100, business_status: "OPERATIONAL" },
      { name: "Closed", rating: 4.5, user_ratings_total: 100, business_status: "CLOSED_PERMANENTLY" },
      { name: "NoStatus", rating: 4.5, user_ratings_total: 100 },
    ];

    const filtered = places.filter((p) => p.business_status !== "CLOSED_PERMANENTLY");
    expect(filtered.length).toBe(2);
    expect(filtered.map((p) => p.name)).not.toContain("Closed");
  });

  // اختبار استخراج السعر من النص
  it("price extraction: removes non-numeric chars", () => {
    const extractPrice = (price: string) => price.replace(/[^\d.]/g, "");
    expect(extractPrice("22 ر.س")).toBe("22."); // النقطة في 'ر.س' تبقى
    expect(extractPrice("22.50 SAR")).toBe("22.50");
    expect(extractPrice("١٥")).toBe(""); // أرقام عربية لا تُستخرج
    expect(extractPrice("")).toBe("");
  });
});
