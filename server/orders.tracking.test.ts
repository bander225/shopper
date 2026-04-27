import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext, PhoneUser } from "./_core/context";

// Helper to create a mock context for a phone user (customer/driver)
function createPhoneUserContext(userId: number, role: "user" | "admin" | "driver" = "user"): TrpcContext {
  const phoneUser: PhoneUser = {
    id: userId,
    phone: `0500000${userId.toString().padStart(3, "0")}`,
    name: "Test User",
    role,
    addressText: null,
    addressLat: null,
    addressLng: null,
  };
  return {
    user: null,
    phoneUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 9999,
      openId: "admin-user",
      email: "admin@admin.com",
      name: "Admin",
      loginMethod: "admin" as any,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    phoneUser: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("orders.confirmReceipt", () => {
  it("throws NOT_FOUND for non-existent order", async () => {
    const ctx = createPhoneUserContext(1);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.orders.confirmReceipt({ orderId: 999999 })
    ).rejects.toThrow();
  });
});

describe("orders.uploadDeliveryProof", () => {
  it("throws NOT_FOUND for non-existent order", async () => {
    const ctx = createPhoneUserContext(1, "driver");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.orders.uploadDeliveryProof({ orderId: 999999, imageUrl: "https://example.com/img.jpg" })
    ).rejects.toThrow();
  });
});

describe("orders.adminList", () => {
  it("returns list for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.orders.adminList();
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const ctx = createPhoneUserContext(1);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.orders.adminList()).rejects.toThrow();
  });
});

describe("orders.myOrders", () => {
  it("returns array for any authenticated phone user", async () => {
    const ctx = createPhoneUserContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.orders.myOrders();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("orders.driverOrders", () => {
  it("throws FORBIDDEN when user has no driver profile", async () => {
    const ctx = createPhoneUserContext(999999, "driver");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.orders.driverOrders()).rejects.toThrow();
  });
});
