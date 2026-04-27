import { z } from "zod";
import { router, publicProcedure, phoneProtectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { makeRequest } from "../_core/map";
import { createOrder, getOrderById } from "../db";
import { broadcastOrderToDrivers, autoAssignOrderToDriver } from "./driverRequests";
import { isAutoAssignEnabled } from "./settings";

// ===== SHOPPER CHAT ROUTER =====
// شات ذكي يتصرف كمندوب شخصي للعميل

const SHOPPER_SYSTEM_PROMPT = `أنت "الشوبرز" — مساعد توصيل ذكي وودود يتحدث بالعامية السعودية بشكل طبيعي ومريح.
مهمتك: مساعدة العميل في الطلب من أي مكان قريب منه خطوة بخطوة.

**مهم جداً:** أنت لست مجرد مساعد نصي. أنت تطبيق توصيل حقيقي متصل بخرائط جوجل. عندما تضع action = "show_places" في JSON، يقوم التطبيق تلقائياً بجلب الأماكن القريبة من خرائط جوجل وعرضها للعميل. لا تقل للعميل أنك مساعد نصي أو أنك لا تستطيع عرض أماكن — هذا خطأ كبير.

**أسلوبك:**
- استخدم العامية السعودية الخليجية (مثل: ابشر، وش، شويات، تمام، حسابك)
- كن ودوداً ومرحاً لكن احترافياً
- ردودك قصيرة ومباشرة (2-3 جمل كحد أقصى)
- لا تستخدم emoji كثيراً

**مراحل المحادثة (اتبعها بالترتيب):**
1. **GREETING**: رحّب وسأل "وين حاب تتسوق؟" (المدينة)
2. **STREET**: اسأل عن الشارع أو الحي
3. **CATEGORY**: اسأل "وش بغيت؟ قهوة، أكل، أغراض، حلا؟" — اعرض خيارات
4. **PLACES**: بعد معرفة الفئة، ضع action = "show_places" في JSON وقل "ثانية أجيب لك الأماكن القريبة". سيظهر التطبيق قائمة الأماكن تلقائياً.
5. **PLACE_SELECTED**: بعد اختيار المكان، قل "ابشر بتوجه له شويات" ثم اسأل: "وصلت — وش أطلب لك؟ ولا أتصل بك؟"
   - إذا أرسل العميل رابط Google Maps للمحل → اشكره وقل "تمام، شفت المحل على الخريطة — وش أطلب لك؟"
   - إذا لم تظهر أماكن قريبة أو لم يجد العميل ما يبغي → اطلب منه رابط Google Maps للمحل ("عطني رابط قوجل ماب للمحل")
6. **ORDER_METHOD**: إذا قال "اتصل" → قل "ابشر" وانهِ. إذا قال "سجّل طلبي" → اسأل عن التفاصيل
7. **ORDER_DETAILS**: استمع للطلب، استخرج الأصناف والأسعار من المنيو المتاح
8. **INVOICE**: احسب الإجمالي واعرض الفاتورة بشكل واضح
9. **CONFIRM**: اسأل "اكد طلبك؟"
10. **CONFIRMED**: قل "تم استلام الطلب وفي الطريق لموقعك"

**طلب رقم المحل:**
- إذا طلب العميل رقم المحل أو رقم الجوال أو كيف يتواصل بهم → ضع action = "get_phone" في الـ JSON
- قل للعميل "ثانية أجيب لك برقمهم"

**طلب ساعات العمل:**
- إذا سأل العميل "متى يفتح؟" أو "ساعات العمل" أو "هل مفتوح؟" → ضع action = "get_hours" في الـ JSON
- قل للعميل "ثانية أشوف لك أوقاتهم"

**طلب رابط المتجر أو موقعه:**
- إذا طلب العميل "رابط المتجر" أو "رابط قوقل ماب" أو "وين هو" أو "موقعه" أو "إحداثياته" → ضع action = "get_place_link"
- قل للعميل "ثانية أجيب لك رابطهم"

**أي سؤال عن المتجر:**
- إذا سأل العميل عن أي معلومة عن المتجر (تقييمه، وصفه، عنوانه، موقعه، موقع ويبسايته، إلخ) → ضع action = "get_place_info"
- ضع في JSON حقل infoQuery = "نص سؤال العميل بالضبط"
- قل للعميل "ثانية أجيب عليك"

**قواعد مهمة:**
- في كل رد، أضف في نهايته JSON مخفي بين علامات |||JSON_START||| و |||JSON_END|||
- JSON يحتوي: { "stage": "GREETING|STREET|CATEGORY|PLACES|PLACE_SELECTED|ORDER_METHOD|ORDER_DETAILS|INVOICE|CONFIRM|CONFIRMED", "city": "...", "street": "...", "category": "coffee|food|groceries|pharmacy|sweets|other", "placeId": "...", "placeName": "...", "orderItems": [...], "total": 0, "action": "show_places|call_customer|show_invoice|confirm_order|get_phone|get_hours|get_place_link|get_place_info|null", "infoQuery": "..." }
- لا تذكر الـ JSON في ردك المرئي
`;

export const shopperChatRouter = router({

  /**
   * إرسال رسالة في شات الشوبرز الذكي
   */
  sendMessage: publicProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
        userLat: z.number().optional(),
        userLng: z.number().optional(),
        selectedPlaceId: z.string().optional(),
        selectedPlaceName: z.string().optional(),
        menuItems: z.array(z.object({
          name: z.string(),
          price: z.string(),
          category: z.string().optional(),
          emoji: z.string().optional(),
        })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // بناء رسائل السياق
      const contextMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: SHOPPER_SYSTEM_PROMPT },
      ];

      // إضافة سياق المكان المختار إذا وُجد
      if (input.selectedPlaceName) {
        contextMessages.push({
          role: "system",
          content: `المكان المختار حالياً: ${input.selectedPlaceName} (Place ID: ${input.selectedPlaceId ?? "غير محدد"})`,
        });
      }

      // إضافة المنيو المتاح إذا وُجد
      if (input.menuItems && input.menuItems.length > 0) {
        const menuText = input.menuItems
          .map((item) => `- ${item.name}: ${item.price} ريال`)
          .join("\n");
        contextMessages.push({
          role: "system",
          content: `المنيو المتاح:\n${menuText}\n\nعند حساب الفاتورة، استخدم هذه الأسعار فقط.`,
        });
      }

      // إضافة تاريخ المحادثة
      for (const msg of input.messages) {
        contextMessages.push({ role: msg.role, content: msg.content });
      }

      const response = await invokeLLM({ messages: contextMessages });
      const rawContent = typeof response.choices?.[0]?.message?.content === "string"
        ? response.choices[0].message.content
        : "";

      // استخراج JSON المخفي
      let stage = "GREETING";
      let city = "";
      let street = "";
      let category = "";
      let placeId = "";
      let placeName = "";
      let orderItems: Array<{ name: string; price: string; quantity: number }> = [];
      let total = 0;
      let action: string | null = null;
      let infoQuery = "";

      const jsonMatch = rawContent.match(/\|\|\|JSON_START\|\|\|([\s\S]*?)\|\|\|JSON_END\|\|\|/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim());
          stage = parsed.stage ?? stage;
          city = parsed.city ?? city;
          street = parsed.street ?? street;
          category = parsed.category ?? category;
          placeId = parsed.placeId ?? placeId;
          placeName = parsed.placeName ?? placeName;
          orderItems = parsed.orderItems ?? orderItems;
          total = parsed.total ?? total;
          action = parsed.action ?? null;
          infoQuery = parsed.infoQuery ?? "";
        } catch {
          // ignore parse errors
        }
      }

      // تنظيف الرد من JSON المخفي
      const visibleContent = rawContent
        .replace(/\|\|\|JSON_START\|\|\|[\s\S]*?\|\|\|JSON_END\|\|\|/g, "")
        .trim();

      // إذا كانت المرحلة PLACES وعندنا موقع، نجلب الأماكن القريبة
      let nearbyPlaces: Array<{
        placeId: string;
        name: string;
        address: string;
        rating: number | null;
        distance: number | null;
        isOpen: boolean | null;
        menuPhotoUrls: string[];
        hasMenuPhotos: boolean;
      }> = [];

      console.log("[shopperChat] action:", action, "userLat:", input.userLat, "userLng:", input.userLng, "category:", category);
      if (action === "show_places" && input.userLat && input.userLng) {
        try {
          // تحديد نوع البحث حسب الفئة
          const typeMap: Record<string, string> = {
            coffee: "cafe",
            food: "restaurant",
            groceries: "supermarket",
            pharmacy: "pharmacy",
            sweets: "bakery",
          };
          const placeType = typeMap[category] ?? "restaurant";

          const nearbyResult = await makeRequest<any>("/maps/api/place/nearbysearch/json", {
            location: `${input.userLat},${input.userLng}`,
            radius: "3000",
            type: placeType,
            language: "ar",
          });

          if (nearbyResult.results) {
            nearbyPlaces = nearbyResult.results.slice(0, 8).map((p: any) => ({
              placeId: p.place_id,
              name: p.name,
              address: p.vicinity ?? "",
              rating: p.rating ?? null,
              distance: null,
              isOpen: p.opening_hours?.open_now ?? null,
              menuPhotoUrls: p.photos?.slice(0, 2).map((ph: any) =>
                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${ph.photo_reference}&key=PROXY`
              ) ?? [],
              hasMenuPhotos: false,
            }));
          }
        } catch (err) {
          console.error("[shopperChat] nearbySearch error:", err);
        }
      }

      // إذا طلب العميل رقم المحل، نجلبه تلقائياً
      let placePhone: string | null = null;
      let placeHours: string[] | null = null;
      let placeIsOpenNow: boolean | null = null;
      const targetPlaceId = placeId || input.selectedPlaceId;
      if (action === "get_phone" && targetPlaceId) {
        try {
          const details = await makeRequest<any>("/maps/api/place/details/json", {
            place_id: targetPlaceId,
            fields: "name,formatted_phone_number,international_phone_number",
            language: "ar",
          });
          placePhone =
            details.result?.international_phone_number ??
            details.result?.formatted_phone_number ??
            null;
        } catch (err) {
          console.error("[shopperChat] getPhone error:", err);
        }
      }

      // إذا طلب العميل ساعات العمل
      if (action === "get_hours" && targetPlaceId) {
        try {
          const details = await makeRequest<any>("/maps/api/place/details/json", {
            place_id: targetPlaceId,
            fields: "name,opening_hours,current_opening_hours",
            language: "ar",
          });
          const openingHours = details.result?.current_opening_hours ?? details.result?.opening_hours;
          placeHours = openingHours?.weekday_text ?? null;
          placeIsOpenNow = openingHours?.open_now ?? null;
        } catch (err) {
          console.error("[shopperChat] getHours error:", err);
        }
      }

      // رابط المتجر وإحداثياته
      let placeLinkUrl: string | null = null;
      let placeCoords: { lat: number; lng: number } | null = null;
      let placeAddress: string | null = null;
      if (action === "get_place_link" && targetPlaceId) {
        try {
          const details = await makeRequest<any>("/maps/api/place/details/json", {
            place_id: targetPlaceId,
            fields: "name,geometry,formatted_address,url",
            language: "ar",
          });
          const result = details.result;
          if (result?.geometry?.location) {
            const { lat, lng } = result.geometry.location;
            placeCoords = { lat, lng };
            // رابط Google Maps مباشر للمتجر
            placeLinkUrl = result.url ?? `https://www.google.com/maps/place/?q=place_id:${targetPlaceId}`;
            placeAddress = result.formatted_address ?? null;
          }
        } catch (err) {
          console.error("[shopperChat] getPlaceLink error:", err);
        }
      }

      // أي معلومة عن المتجر
      let placeInfoAnswer: string | null = null;
      if (action === "get_place_info" && targetPlaceId) {
        try {
          // جلب كل التفاصيل المتاحة
          const details = await makeRequest<any>("/maps/api/place/details/json", {
            place_id: targetPlaceId,
            fields: "name,rating,user_ratings_total,formatted_address,website,editorial_summary,types,price_level,geometry,url",
            language: "ar",
          });
          const r = details.result;
          if (r) {
            // بناء سياق شامل للمتجر
            const infoLines: string[] = [];
            if (r.name) infoLines.push(`اسم المتجر: ${r.name}`);
            if (r.rating) infoLines.push(`التقييم: ${r.rating} ★ (${r.user_ratings_total ?? 0} تقييم)`);
            if (r.formatted_address) infoLines.push(`العنوان: ${r.formatted_address}`);
            if (r.website) infoLines.push(`الموقع: ${r.website}`);
            if (r.editorial_summary?.overview) infoLines.push(`وصف: ${r.editorial_summary.overview}`);
            if (r.url) infoLines.push(`رابط قوقل ماب: ${r.url}`);

            // استخدم AI للإجابة على سؤال العميل بشكل طبيعي
            const infoContext = infoLines.join("\n");
            const infoResponse = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `أنت الشوبرز. أجب على سؤال العميل بالعامية السعودية باختصار بناءً على هذه المعلومات:
${infoContext}`,
                },
                {
                  role: "user",
                  content: infoQuery || `أخبرني عن هذا المتجر`,
                },
              ],
            });
            placeInfoAnswer =
              typeof infoResponse.choices?.[0]?.message?.content === "string"
                ? infoResponse.choices[0].message.content
                : infoLines.join(" | ");
          }
        } catch (err) {
          console.error("[shopperChat] getPlaceInfo error:", err);
        }
      }

      return {
        reply: visibleContent,
        stage,
        city,
        street,
        category,
        placeId,
        placeName,
        orderItems,
        total,
        action,
        nearbyPlaces,
        placePhone,
        placeHours,
        placeIsOpenNow,
        placeLinkUrl,
        placeCoords,
        placeAddress,
        placeInfoAnswer,
      };
    }),

  /**
   * تأكيد الطلب وإنشاؤه في النظام
   */
  confirmOrder: phoneProtectedProcedure
    .input(
      z.object({
        placeName: z.string(),
        placeId: z.string().optional(),
        orderItems: z.array(z.object({
          name: z.string(),
          price: z.string(),
          quantity: z.number().min(1),
        })),
        total: z.number(),
        deliveryAddressText: z.string().optional(),
        deliveryLat: z.string().optional(),
        deliveryLng: z.string().optional(),
        cityId: z.number().optional(),
        streetId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subtotal = input.orderItems.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity,
        0
      );
      const deliveryFee = Math.max(0, input.total - subtotal);

      const result = await createOrder(
        {
          userId: ctx.phoneUser.id,
          restaurantId: 0, // طلب شوبرز — لا مطعم محدد في النظام
          subtotal: subtotal.toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          total: input.total.toFixed(2),
          deliveryAddressText: input.deliveryAddressText ?? "موقع العميل",
          deliveryLat: input.deliveryLat,
          deliveryLng: input.deliveryLng,
          customerNotes: `طلب شوبرز من: ${input.placeName}`,
          paymentMethod: "cash",
          googlePlaceName: input.placeName,
          googlePlaceId: input.placeId,
        },
        input.orderItems.map((item) => ({
          orderId: 0,
          menuItemId: 0,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }))
      );

      if (!result) {
        throw new Error("فشل إنشاء الطلب");
      }

      // إرسال الطلب للمناديب
      if (input.cityId && input.streetId) {
        try {
          const autoAssign = await isAutoAssignEnabled();
          if (autoAssign) {
            const assignedDriverId = await autoAssignOrderToDriver(
              result.orderId,
              input.cityId,
              input.streetId
            );
            if (!assignedDriverId) {
              await broadcastOrderToDrivers(result.orderId, input.cityId, input.streetId);
            }
          } else {
            await broadcastOrderToDrivers(result.orderId, input.cityId, input.streetId);
          }
        } catch (err) {
          console.error("[shopperChat] dispatch error:", err);
        }
      }

      return {
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        success: true,
      };
    }),

  /**
   * جلب حالة الطلب للتحديث التلقائي في الشات
   */
  getOrderStatus: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const order = await getOrderById(input.orderId);
      if (!order) return null;

      // خريطة الحالات إلى رسائل عربية للشات
      const statusMessages: Record<string, { text: string; emoji: string; done: boolean }> = {
        pending:       { text: "طلبك وصل لنا وبنبحث لك عن مندوب", emoji: "⏳", done: false },
        accepted:      { text: "مندوب قبل طلبك وهو في الطريق للمتجر", emoji: "🏃", done: false },
        preparing:     { text: "المندوب وصل للمتجر وعم يجهز طلبك", emoji: "🛍️", done: false },
        ready:         { text: "طلبك جاهز والمندوب راح يستلمه الحين", emoji: "✅", done: false },
        picked_up:     { text: "المندوب استلم طلبك من المتجر وفي الطريق إليك", emoji: "🚗", done: false },
        on_the_way:    { text: "المندوب في الطريق إليك — قريباً يوصل", emoji: "🚀", done: false },
        delivered:     { text: "وصل طلبك! نتمنى تستمتع فيه. شكراً لاستخدامك الشوبرز", emoji: "🎉", done: true },
        cancelled:     { text: "تم إلغاء الطلب. إذا تبي تعيد الطلب قولي", emoji: "❌", done: true },
      };

      const info = statusMessages[order.status] ?? { text: `حالة الطلب: ${order.status}`, emoji: "📦", done: false };

      return {
        orderId: order.id,
        status: order.status,
        message: info.text,
        emoji: info.emoji,
        isDone: info.done,
        driverName: (order as any).driverName ?? null,
        driverPhone: (order as any).driverPhone ?? null,
      };
    }),

  /**
   * جلب رقم هاتف المحل من Google Places
   */
  getPlacePhone: publicProcedure
    .input(z.object({ placeId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const details = await makeRequest<any>("/maps/api/place/details/json", {
          place_id: input.placeId,
          fields: "name,formatted_phone_number,international_phone_number",
          language: "ar",
        });

        const phone =
          details.result?.international_phone_number ??
          details.result?.formatted_phone_number ??
          null;

        return {
          phone,
          name: details.result?.name ?? "",
        };
      } catch (err) {
        console.error("[shopperChat] getPlacePhone error:", err);
        return { phone: null, name: "" };
      }
    }),

  /**
   * بدء محادثة جديدة - يعيد رسالة الترحيب
   */
  startChat: publicProcedure.mutation(async () => {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SHOPPER_SYSTEM_PROMPT },
        { role: "user", content: "ابدأ المحادثة" },
      ],
    });

    const rawContent = typeof response.choices?.[0]?.message?.content === "string"
      ? response.choices[0].message.content
      : "أهلاً! أنا الشوبرز. وين حاب تتسوق؟";
    const visibleContent = rawContent
      .replace(/\|\|\|JSON_START\|\|\|[\s\S]*?\|\|\|JSON_END\|\|\|/g, "")
      .trim();

    return {
      reply: visibleContent,
      stage: "GREETING",
    };
  }),
});
