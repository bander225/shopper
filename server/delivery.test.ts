import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext, PhoneUser } from "./_core/context";

function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@test.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    phoneUser: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createUserCtx(id = 2): TrpcContext {
  return {
    user: {
      id,
      openId: `user-${id}`,
      email: `user${id}@test.com`,
      name: `User ${id}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    phoneUser: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createPhoneUserCtx(id = 2, role: "user" | "driver" = "user"): TrpcContext {
  const phoneUser: PhoneUser = {
    id,
    phone: `0500000${id.toString().padStart(3, "0")}`,
    name: `Phone User ${id}`,
    role,
    addressText: null,
    addressLat: null,
    addressLng: null,
  };
  return {
    user: null,
    phoneUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      ...createUserCtx(),
      res: { clearCookie: (name: string) => cleared.push(name) } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared.length).toBe(1);
  });
});

describe("auth.me", () => {
  it("returns current user when authenticated", async () => {
    const ctx = createUserCtx();
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me?.id).toBe(2);
    expect(me?.role).toBe("user");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      phoneUser: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toBeNull();
  });
});

describe("restaurants.listActive", () => {
  it("returns array of active restaurants", async () => {
    const ctx: TrpcContext = {
      user: null,
      phoneUser: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.restaurants.listActive();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("restaurants.listAll (admin only)", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const ctx = createUserCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.restaurants.listAll()).rejects.toThrow();
  });

  it("returns restaurants for admin", async () => {
    const ctx = createAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.restaurants.listAll();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("orders.myOrders", () => {
  it("returns orders for authenticated phone user", async () => {
    const ctx = createPhoneUserCtx(2);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.orders.myOrders();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("drivers.myProfile", () => {
  it("returns null when user has no driver profile", async () => {
    const ctx = createPhoneUserCtx(999, "driver");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.drivers.myProfile();
    expect(result).toBeNull();
  });
});

describe("notifications.list", () => {
  it("returns notifications for user", async () => {
    const ctx = createPhoneUserCtx(2);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
