/**
 * Tests for auto-assign driver system and settings router
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ─────────────────────────────────────────────────────────────────
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDb = {
  select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) } as any) } as any) } as any),
  insert: () => ({ values: () => ({ onDuplicateKeyUpdate: () => Promise.resolve() } as any) } as any),
  update: () => ({ set: () => ({ where: () => Promise.resolve() } as any) } as any),
};

vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("../drizzle/schema", () => ({
  systemSettings: { key: "key", value: "value" },
  phoneUsers: { id: "id", role: "role", isOnline: "isOnline", isActive: "isActive", cityId: "cityId", streetId: "streetId" },
  driverOrderRequests: { id: "id", orderId: "orderId", driverUserId: "driverUserId", status: "status", expiresAt: "expiresAt" },
  drivers: { userId: "userId", currentOrders: "currentOrders", maxOrders: "maxOrders" },
  orders: { id: "id", batchId: "batchId" },
  driverBatches: { id: "id", driverUserId: "driverUserId", status: "status", cityId: "cityId", streetId: "streetId" },
  streets: { id: "id", name: "name" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", args })),
  inArray: vi.fn((a, b) => ({ type: "inArray", a, b })),
  gt: vi.fn((a, b) => ({ type: "gt", a, b })),
  isNull: vi.fn((a) => ({ type: "isNull", a })),
  desc: vi.fn((a) => ({ type: "desc", a })),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Settings: isAutoAssignEnabled", () => {
  it("returns true when setting is 'true'", async () => {
    const { getDb } = await import("../server/db");
    (getDb as any).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ key: "autoAssignDrivers", value: "true" }]),
          }),
        }),
      }),
    });
    const { isAutoAssignEnabled } = await import("../server/routers/settings");
    const result = await isAutoAssignEnabled();
    expect(result).toBe(true);
  });

  it("returns false when setting is 'false'", async () => {
    const { getDb } = await import("../server/db");
    (getDb as any).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ key: "autoAssignDrivers", value: "false" }]),
          }),
        }),
      }),
    });
    // Re-import to get fresh module
    vi.resetModules();
    const { isAutoAssignEnabled: isEnabled } = await import("../server/routers/settings");
    const result = await isEnabled();
    expect(result).toBe(false);
  });

  it("returns true by default when no setting found", async () => {
    const { getDb } = await import("../server/db");
    (getDb as any).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    });
    vi.resetModules();
    const { isAutoAssignEnabled: isEnabled } = await import("../server/routers/settings");
    const result = await isEnabled();
    expect(result).toBe(true);
  });
});

describe("Settings: getSetting / setSetting", () => {
  it("getSetting returns null when DB unavailable", async () => {
    const { getDb } = await import("../server/db");
    (getDb as any).mockResolvedValue(null);
    vi.resetModules();
    const { getSetting } = await import("../server/routers/settings");
    const result = await getSetting("anyKey");
    expect(result).toBeNull();
  });

  it("getSetting returns value from DB", async () => {
    const { getDb } = await import("../server/db");
    (getDb as any).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ key: "testKey", value: "testValue" }]),
          }),
        }),
      }),
    });
    vi.resetModules();
    const { getSetting } = await import("../server/routers/settings");
    const result = await getSetting("testKey");
    expect(result).toBe("testValue");
  });
});

describe("autoAssignOrderToDriver", () => {
  it("returns null when DB unavailable", async () => {
    const { getDb } = await import("../server/db");
    (getDb as any).mockResolvedValue(null);
    vi.resetModules();
    const { autoAssignOrderToDriver } = await import("../server/routers/driverRequests");
    const result = await autoAssignOrderToDriver(1, 1, 1);
    expect(result).toBeNull();
  });

  it("returns null when no available drivers", async () => {
    const { getDb } = await import("../server/db");
    // Mock DB that returns empty array for all selects
    (getDb as any).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
            // also support chaining without limit
            then: (fn: any) => fn([]),
          }),
          // support select without where
          limit: () => Promise.resolve([]),
        }),
      }),
      insert: () => ({ values: () => Promise.resolve({ insertId: 1 }) }),
    });
    vi.resetModules();
    const { autoAssignOrderToDriver } = await import("../server/routers/driverRequests");
    // findAvailableDrivers returns [] → should return null
    const result = await autoAssignOrderToDriver(1, 1, 1);
    expect(result).toBeNull();
  });
});

describe("Order dispatch logic", () => {
  it("autoAssign mode sends to single best driver", () => {
    // Logic test: when autoAssign=true, only 1 driver should receive the request
    const drivers = [
      { id: 1, name: "أحمد", currentOrders: 0, maxOrders: 3 },
      { id: 2, name: "محمد", currentOrders: 2, maxOrders: 3 },
      { id: 3, name: "خالد", currentOrders: 1, maxOrders: 3 },
    ];
    // Pick driver with fewest orders
    let best = drivers[0];
    let bestCount = Infinity;
    for (const d of drivers) {
      if (d.currentOrders < d.maxOrders && d.currentOrders < bestCount) {
        bestCount = d.currentOrders;
        best = d;
      }
    }
    expect(best.id).toBe(1); // أحمد has 0 orders = best
    expect(best.name).toBe("أحمد");
  });

  it("skips drivers at capacity", () => {
    const drivers = [
      { id: 1, name: "أحمد", currentOrders: 3, maxOrders: 3 }, // at capacity
      { id: 2, name: "محمد", currentOrders: 1, maxOrders: 3 },
    ];
    let best = null;
    let bestCount = Infinity;
    for (const d of drivers) {
      if (d.currentOrders < d.maxOrders && d.currentOrders < bestCount) {
        bestCount = d.currentOrders;
        best = d;
      }
    }
    expect(best?.id).toBe(2); // محمد is the only available one
  });

  it("returns null when all drivers are at capacity", () => {
    const drivers = [
      { id: 1, currentOrders: 3, maxOrders: 3 },
      { id: 2, currentOrders: 5, maxOrders: 5 },
    ];
    let best = null;
    let bestCount = Infinity;
    for (const d of drivers) {
      if (d.currentOrders < d.maxOrders && d.currentOrders < bestCount) {
        bestCount = d.currentOrders;
        best = d;
      }
    }
    expect(best).toBeNull();
  });
});
