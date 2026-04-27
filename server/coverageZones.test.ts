import { describe, it, expect } from "vitest";

// Replicated from coverageZones.ts for testing
// polygon: array of [lng, lat] pairs (GeoJSON order)
function pointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pLng = polygon[i][0];
    const pLat = polygon[i][1];
    const qLng = polygon[j][0];
    const qLat = polygon[j][1];
    const intersect =
      pLat > lat !== qLat > lat &&
      lng < ((qLng - pLng) * (lat - pLat)) / (qLat - pLat) + pLng;
    if (intersect) inside = !inside;
  }
  return inside;
}

describe("pointInPolygon", () => {
  // مربع بسيط: [lng, lat] = [46.5, 24.5], [46.7, 24.5], [46.7, 24.7], [46.5, 24.7]
  const square: [number, number][] = [
    [46.5, 24.5],
    [46.7, 24.5],
    [46.7, 24.7],
    [46.5, 24.7],
    [46.5, 24.5], // إغلاق المضلع
  ];

  it("نقطة داخل المضلع", () => {
    expect(pointInPolygon(24.6, 46.6, square)).toBe(true);
  });

  it("نقطة خارج المضلع (شمال)", () => {
    expect(pointInPolygon(24.8, 46.6, square)).toBe(false);
  });

  it("نقطة خارج المضلع (جنوب)", () => {
    expect(pointInPolygon(24.4, 46.6, square)).toBe(false);
  });

  it("نقطة خارج المضلع (شرق)", () => {
    expect(pointInPolygon(24.6, 46.8, square)).toBe(false);
  });

  it("نقطة خارج المضلع (غرب)", () => {
    expect(pointInPolygon(24.6, 46.4, square)).toBe(false);
  });

  it("نقطة في مركز المضلع تماماً", () => {
    expect(pointInPolygon(24.6, 46.6, square)).toBe(true);
  });
});
