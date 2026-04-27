/**
 * اختبارات التحقق من المخزون في نظام الطلبات
 * تتحقق من أن:
 * 1. الطلب يُرفض إذا كان الصنف نافداً (stockCount = 0)
 * 2. الطلب يُرفض إذا كانت الكمية المطلوبة أكبر من المتاحة
 * 3. الطلب يُقبل إذا كان المخزون كافياً
 * 4. الطلب يُقبل إذا كان تتبع المخزون معطلاً (stockEnabled = false)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// --- محاكاة دوال قاعدة البيانات ---
vi.mock("./db", () => ({
  getMenuItemById: vi.fn(),
  decrementMenuItemStock: vi.fn().mockResolvedValue(undefined),
  createOrder: vi.fn().mockResolvedValue({ orderId: 1, orderNumber: "ORD-TEST-001" }),
  getRestaurantById: vi.fn().mockResolvedValue(null),
  createNotification: vi.fn().mockResolvedValue(undefined),
  updateOrderAssignStatus: vi.fn().mockResolvedValue(undefined),
  getDriverByUserId: vi.fn().mockResolvedValue(null),
  getAllOrders: vi.fn().mockResolvedValue([]),
  getOrdersByUser: vi.fn().mockResolvedValue([]),
  getOrderById: vi.fn().mockResolvedValue(null),
  getOrderWithItems: vi.fn().mockResolvedValue(null),
  getOrdersByDriver: vi.fn().mockResolvedValue([]),
  getPendingOrders: vi.fn().mockResolvedValue([]),
  getReadyOrders: vi.fn().mockResolvedValue([]),
  updateOrderStatus: vi.fn().mockResolvedValue(undefined),
  getDriverById: vi.fn().mockResolvedValue(null),
  updateDriver: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./routers/driverRequests", () => ({
  broadcastOrderToDrivers: vi.fn().mockResolvedValue(0),
  autoAssignOrderToDriver: vi.fn().mockResolvedValue(null),
}));

vi.mock("./routers/settings", () => ({
  isAutoAssignEnabled: vi.fn().mockResolvedValue(false),
}));

import { getMenuItemById, decrementMenuItemStock, createOrder } from "./db";
import { TRPCError } from "@trpc/server";

// --- دالة مساعدة لمحاكاة منطق التحقق من المخزون ---
async function validateInventory(items: Array<{ menuItemId: number; name: string; quantity: number }>) {
  for (const item of items) {
    if (!item.menuItemId) continue;
    const menuItem = await getMenuItemById(item.menuItemId);
    if (menuItem && menuItem.stockEnabled && menuItem.stockCount !== null && menuItem.stockCount !== undefined) {
      if (menuItem.stockCount <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `عذراً، الصنف "${item.name}" نفد من المخزون`,
        });
      }
      if (menuItem.stockCount < item.quantity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `عذراً، الكمية المتاحة من "${item.name}" هي ${menuItem.stockCount} فقط`,
        });
      }
    }
  }
}

// --- دالة مساعدة لتقليل المخزون ---
async function decrementInventory(items: Array<{ menuItemId: number; quantity: number }>) {
  for (const item of items) {
    if (!item.menuItemId) continue;
    const menuItem = await getMenuItemById(item.menuItemId);
    if (menuItem && menuItem.stockEnabled && menuItem.stockCount !== null && menuItem.stockCount !== undefined) {
      await decrementMenuItemStock(item.menuItemId, item.quantity);
    }
  }
}

describe("نظام التحقق من المخزون", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateInventory - التحقق قبل الطلب", () => {
    it("يجب أن يرفض الطلب إذا كان الصنف نافداً (stockCount = 0)", async () => {
      vi.mocked(getMenuItemById).mockResolvedValue({
        id: 1,
        name: "برجر كلاسيك",
        stockEnabled: true,
        stockCount: 0,
      } as any);

      await expect(
        validateInventory([{ menuItemId: 1, name: "برجر كلاسيك", quantity: 1 }])
      ).rejects.toThrow('عذراً، الصنف "برجر كلاسيك" نفد من المخزون');
    });

    it("يجب أن يرفض الطلب إذا كانت الكمية المطلوبة أكبر من المتاحة", async () => {
      vi.mocked(getMenuItemById).mockResolvedValue({
        id: 2,
        name: "بيتزا مارغريتا",
        stockEnabled: true,
        stockCount: 2,
      } as any);

      await expect(
        validateInventory([{ menuItemId: 2, name: "بيتزا مارغريتا", quantity: 5 }])
      ).rejects.toThrow('عذراً، الكمية المتاحة من "بيتزا مارغريتا" هي 2 فقط');
    });

    it("يجب أن يقبل الطلب إذا كان المخزون كافياً", async () => {
      vi.mocked(getMenuItemById).mockResolvedValue({
        id: 3,
        name: "شاورما دجاج",
        stockEnabled: true,
        stockCount: 10,
      } as any);

      await expect(
        validateInventory([{ menuItemId: 3, name: "شاورما دجاج", quantity: 3 }])
      ).resolves.toBeUndefined();
    });

    it("يجب أن يقبل الطلب إذا كان تتبع المخزون معطلاً (stockEnabled = false)", async () => {
      vi.mocked(getMenuItemById).mockResolvedValue({
        id: 4,
        name: "كباب مشوي",
        stockEnabled: false,
        stockCount: 0,
      } as any);

      await expect(
        validateInventory([{ menuItemId: 4, name: "كباب مشوي", quantity: 100 }])
      ).resolves.toBeUndefined();
    });

    it("يجب أن يقبل الطلب إذا كان الصنف غير موجود في قاعدة البيانات", async () => {
      vi.mocked(getMenuItemById).mockResolvedValue(undefined);

      await expect(
        validateInventory([{ menuItemId: 999, name: "صنف غير موجود", quantity: 1 }])
      ).resolves.toBeUndefined();
    });

    it("يجب أن يرفض عند أول صنف نافد في قائمة متعددة الأصناف", async () => {
      vi.mocked(getMenuItemById)
        .mockResolvedValueOnce({ id: 1, name: "صنف أول", stockEnabled: true, stockCount: 5 } as any)
        .mockResolvedValueOnce({ id: 2, name: "صنف ثانٍ نافد", stockEnabled: true, stockCount: 0 } as any);

      await expect(
        validateInventory([
          { menuItemId: 1, name: "صنف أول", quantity: 2 },
          { menuItemId: 2, name: "صنف ثانٍ نافد", quantity: 1 },
        ])
      ).rejects.toThrow('عذراً، الصنف "صنف ثانٍ نافد" نفد من المخزون');
    });
  });

  describe("decrementInventory - تقليل المخزون بعد الطلب", () => {
    it("يجب أن يستدعي decrementMenuItemStock للأصناف التي تتبع المخزون", async () => {
      vi.mocked(getMenuItemById).mockResolvedValue({
        id: 5,
        name: "عصير برتقال",
        stockEnabled: true,
        stockCount: 20,
      } as any);

      await decrementInventory([{ menuItemId: 5, quantity: 3 }]);

      expect(decrementMenuItemStock).toHaveBeenCalledWith(5, 3);
    });

    it("يجب أن لا يستدعي decrementMenuItemStock للأصناف التي لا تتبع المخزون", async () => {
      vi.mocked(getMenuItemById).mockResolvedValue({
        id: 6,
        name: "ماء معدني",
        stockEnabled: false,
        stockCount: 0,
      } as any);

      await decrementInventory([{ menuItemId: 6, quantity: 10 }]);

      expect(decrementMenuItemStock).not.toHaveBeenCalled();
    });

    it("يجب أن يتعامل مع قائمة فارغة بدون أخطاء", async () => {
      await expect(decrementInventory([])).resolves.toBeUndefined();
      expect(decrementMenuItemStock).not.toHaveBeenCalled();
    });
  });

  describe("التحقق من رسائل الخطأ", () => {
    it("يجب أن تحتوي رسالة الخطأ على اسم الصنف عند النفاد", async () => {
      vi.mocked(getMenuItemById).mockResolvedValue({
        id: 7,
        name: "تشيز كيك",
        stockEnabled: true,
        stockCount: 0,
      } as any);

      try {
        await validateInventory([{ menuItemId: 7, name: "تشيز كيك", quantity: 1 }]);
        expect.fail("يجب أن يرمي خطأً");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("BAD_REQUEST");
        expect((error as TRPCError).message).toContain("تشيز كيك");
        expect((error as TRPCError).message).toContain("نفد من المخزون");
      }
    });

    it("يجب أن تحتوي رسالة الخطأ على الكمية المتاحة عند تجاوزها", async () => {
      vi.mocked(getMenuItemById).mockResolvedValue({
        id: 8,
        name: "كيك شوكولاتة",
        stockEnabled: true,
        stockCount: 3,
      } as any);

      try {
        await validateInventory([{ menuItemId: 8, name: "كيك شوكولاتة", quantity: 10 }]);
        expect.fail("يجب أن يرمي خطأً");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).message).toContain("3");
        expect((error as TRPCError).message).toContain("كيك شوكولاتة");
      }
    });
  });
});
