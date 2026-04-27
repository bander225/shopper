import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { parse as parseCookies } from "cookie";
import { jwtVerify } from "jose";
import { getDb } from "../db";
import { phoneUsers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type PhoneUser = {
  id: number;
  phone: string;
  name: string | null;
  role: string;
  addressText: string | null;
  addressLat: string | null;
  addressLng: string | null;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  phoneUser: PhoneUser | null;
};

const ADMIN_JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "admin-secret-key");
const PHONE_JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "phone-auth-secret-key-delivery");
const PHONE_COOKIE = "phone_session";

async function getAdminUser(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const cookieHeader = req.headers?.cookie ?? "";
    const cookies = parseCookies(cookieHeader);
    const token = cookies["admin_session"];
    if (!token) return null;
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);
    if ((payload as any)?.role !== "admin") return null;
    return {
      id: 0,
      openId: "admin",
      name: "Admin",
      email: null,
      phone: null,
      role: "admin",
      loginMethod: null,
      lastSignedIn: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as User;
  } catch {
    return null;
  }
}

async function getPhoneUser(req: CreateExpressContextOptions["req"]): Promise<PhoneUser | null> {
  try {
    // Try cookie first, then Authorization header (for mobile browsers that block cookies)
    const cookieHeader = req.headers?.cookie ?? "";
    const cookies = parseCookies(cookieHeader);
    let token = cookies[PHONE_COOKIE];
    if (!token) {
      const authHeader = req.headers?.authorization ?? "";
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }
    if (!token) return null;
    const { payload } = await jwtVerify(token, PHONE_JWT_SECRET);
    if ((payload as any)?.type !== "phone") return null;
    const db = await getDb();
    if (!db) return null;
    const [user] = await db
      .select()
      .from(phoneUsers)
      .where(eq(phoneUsers.id, (payload as any).userId as number))
      .limit(1);
    if (!user || !user.isActive) return null;
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      addressText: user.addressText ?? null,
      addressLat: user.addressLat ?? null,
      addressLng: user.addressLng ?? null,
    };
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let phoneUser: PhoneUser | null = null;

  // First check admin session cookie
  user = await getAdminUser(opts.req);

  // If admin session is active, skip phone user entirely to avoid Bearer token conflicts
  // (phone_session_token in localStorage would override admin cookie otherwise)
  if (user) {
    return {
      req: opts.req,
      res: opts.res,
      user,
      phoneUser: null,
    };
  }

  // If not admin, try OAuth session
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  // Only try phone user when no admin session is present
  phoneUser = await getPhoneUser(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
    phoneUser,
  };
}
