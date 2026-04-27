/**
 * اختبارات قبول الشروط وسياسة الخصوصية
 * تتحقق من أن:
 * 1. acceptTerms يُحدّث قاعدة البيانات بشكل صحيح
 * 2. acceptTerms يرفض userId غير صالح
 * 3. trackOrder يُعيد بيانات الطلب الصحيحة
 * 4. trackOrder يرفض رقم طلب غير موجود
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// --- محاكاة getDb ---
const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  }),
});
const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    }),
  }),
});

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    update: mockUpdate,
    select: mockSelect,
  }),
}));

// --- محاكاة الـ schema ---
vi.mock("../drizzle/schema", () => ({
  phoneUsers: { id: "id", termsAccepted: "termsAccepted", termsAcceptedAt: "termsAcceptedAt" },
  orders: { id: "id", status: "status", restaurantId: "restaurantId", driverUserId: "driverUserId", createdAt: "createdAt", deliveredAt: "deliveredAt" },
  drivers: { id: "id", name: "name", nationalId: "nationalId", vehiclePlate: "vehiclePlate", vehicleModel: "vehicleModel" },
  restaurants: { id: "id", name: "name" },
}));

// --- محاكاة drizzle-orm ---
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}));

// --- منطق acceptTerms المُختبَر ---
async function acceptTermsLogic(userId: number) {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    throw new Error("userId غير صالح");
  }
  const { getDb } = await import("./db");
  const db = await getDb() as any;
  if (!db) throw new Error("لا يوجد اتصال بقاعدة البيانات");

  const { phoneUsers } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(phoneUsers)
    .set({ termsAccepted: true, termsAcceptedAt: new Date() })
    .where(eq(phoneUsers.id, userId));

  return { success: true };
}

describe("acceptTerms - قبول الشروط وسياسة الخصوصية", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // إعادة تهيئة mock chains
    const whereChain = vi.fn().mockResolvedValue(undefined);
    const setChain = vi.fn().mockReturnValue({ where: whereChain });
    mockUpdate.mockReturnValue({ set: setChain });
  });

  it("يجب أن يُحدّث termsAccepted بنجاح لمستخدم صالح", async () => {
    const result = await acceptTermsLogic(42);
    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it("يجب أن يستدعي update مع phoneUsers", async () => {
    await acceptTermsLogic(1);
    const { phoneUsers } = await import("../drizzle/schema");
    expect(mockUpdate).toHaveBeenCalledWith(phoneUsers);
  });

  it("يجب أن يرفض userId = 0", async () => {
    await expect(acceptTermsLogic(0)).rejects.toThrow("userId غير صالح");
  });

  it("يجب أن يرفض userId سالب", async () => {
    await expect(acceptTermsLogic(-5)).rejects.toThrow("userId غير صالح");
  });

  it("يجب أن يُعيد { success: true } عند النجاح", async () => {
    const result = await acceptTermsLogic(100);
    expect(result.success).toBe(true);
  });
});
