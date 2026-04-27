import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Send, MapPin, ShoppingBag, CheckCircle, Star, Loader2, Phone, Clock, Copy, Check, Navigation, ChevronDown, X, Mic } from "lucide-react";

// ===== أنواع البيانات =====
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "places_card" | "invoice_card" | "order_confirmed" | "phone_card" | "hours_card" | "place_link_card";
  places?: PlaceCard[];
  invoice?: InvoiceData;
  orderConfirmed?: OrderConfirmedData;
  phoneData?: { phone: string; placeName: string };
  hoursData?: { hours: string[]; isOpen: boolean | null; placeName: string };
  placeLinkData?: { url: string; coords: { lat: number; lng: number } | null; address: string | null; placeName: string };
}

interface PlaceCard {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  distance: number | null;
  isOpen: boolean | null;
  menuPhotoUrls: string[];
  hasMenuPhotos: boolean;
}

interface InvoiceData {
  items: Array<{ name: string; price: string; quantity: number }>;
  total: number;
  placeName: string;
}

interface OrderConfirmedData {
  orderNumber: string;
  orderId: number;
  placeName: string;
  total: number;
}

// ===== دالة تحويل URLs إلى روابط قابلة للنقر =====
function renderMessageText(text: string) {
  // regex يكشف روابط http/https وروابط maps.app.goo.gl وgoo.gl
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      // إعادة تعيين lastIndex بعد الاختبار
      urlRegex.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline break-all"
          style={{ color: "#7c3aed" }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    urlRegex.lastIndex = 0;
    return <span key={i}>{part}</span>;
  });
}

// ===== أزرار الاقتراحات السريعة =====
const QUICK_REPLIES: Record<string, string[]> = {
  GREETING: ["بريدة", "الرياض", "جدة", "الدمام"],
  CATEGORY: ["قهوة", "أكل", "حلا", "بقالة", "صيدلية"],
  PLACE_SELECTED: ["سجّل طلبي", "اتصل بي", "رقم المحل", "متى يفتح؟", "رابط المتجر", "تقييمه"],
  CONFIRM: ["نعم اكيد", "لا إلغاء"],
};

// ===== فئات الشاشة الرئيسية =====
const HOME_CATEGORIES = [
  { label: "أكل", emoji: "🍔", query: "أكل" },
  { label: "قهوة", emoji: "☕", query: "قهوة" },
  { label: "توصيل", emoji: "📦", query: "توصيل" },
  { label: "صيدلية", emoji: "💊", query: "صيدلية" },
  { label: "مقاضي", emoji: "🛒", query: "مقاضي" },
];

// ===== مكون بطاقة المكان =====
function PlaceCardItem({
  place,
  onSelect,
}: {
  place: PlaceCard;
  onSelect: (place: PlaceCard) => void;
}) {
  return (
    <button
      onClick={() => onSelect(place)}
      className="w-full text-right p-3 rounded-2xl transition-all active:scale-95 hover:shadow-md"
      style={{ background: "#fff", border: "2px solid #f0ebff" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#f0ebff" }}
        >
          <ShoppingBag className="w-5 h-5" style={{ color: "#7c3aed" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm truncate" style={{ color: "#1a1a2e" }}>
              {place.name}
            </span>
            {place.isOpen !== null && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: place.isOpen ? "#dcfce7" : "#fee2e2",
                  color: place.isOpen ? "#16a34a" : "#dc2626",
                }}
              >
                {place.isOpen ? "مفتوح" : "مغلق"}
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "#6b7280" }}>
            {place.address}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {place.rating && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "#f59e0b" }}>
                <Star className="w-3 h-3 fill-current" />
                {place.rating.toFixed(1)}
              </span>
            )}
            {place.distance && (
              <span className="text-xs" style={{ color: "#9ca3af" }}>
                {place.distance < 1000
                  ? `${Math.round(place.distance)} م`
                  : `${(place.distance / 1000).toFixed(1)} كم`}
              </span>
            )}
          </div>
          {/* صور المنيو المصغرة */}
          {place.menuPhotoUrls.length > 0 && (
            <div className="flex gap-1 mt-2">
              {place.menuPhotoUrls.slice(0, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="منيو"
                  className="w-12 h-10 object-cover rounded-lg"
                  style={{ border: "1px solid #e5e7eb" }}
                />
              ))}
              {place.hasMenuPhotos && (
                <span
                  className="text-xs px-1 py-0.5 rounded-md self-center font-bold"
                  style={{ background: "#dcfce7", color: "#16a34a" }}
                >
                  ✅ منيو
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ===== مكون بطاقة الفاتورة =====
function InvoiceCard({ invoice }: { invoice: InvoiceData }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#fff", border: "2px solid #7c3aed30" }}
    >
      <div className="px-4 py-3" style={{ background: "#7c3aed" }}>
        <p className="text-white font-bold text-sm">فاتورة طلبك</p>
        <p className="text-purple-200 text-xs">{invoice.placeName}</p>
      </div>
      <div className="p-4 space-y-2">
        {invoice.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "#374151" }}>
              {item.name} × {item.quantity}
            </span>
            <span className="text-sm font-bold" style={{ color: "#1a1a2e" }}>
              {(parseFloat(item.price) * item.quantity).toFixed(0)} ر.س
            </span>
          </div>
        ))}
        <div
          className="flex items-center justify-between pt-2 mt-2"
          style={{ borderTop: "1px dashed #e5e7eb" }}
        >
          <span className="font-bold" style={{ color: "#1a1a2e" }}>
            الإجمالي
          </span>
          <span className="text-lg font-black" style={{ color: "#7c3aed" }}>
            {invoice.total} ر.س
          </span>
        </div>
      </div>
    </div>
  );
}

// ===== مكون بطاقة رقم الهاتف =====
function PhoneCard({ data }: { data: { phone: string; placeName: string } }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(data.phone).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="rounded-2xl overflow-hidden w-64"
      style={{ background: "#fff", border: "2px solid #7c3aed30", boxShadow: "0 2px 12px rgba(124,58,237,0.1)" }}
    >
      <div className="px-4 py-3" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-white" />
          <p className="text-white font-bold text-sm">{data.placeName}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xl font-black text-center mb-3" style={{ color: "#1a1a2e", direction: "ltr" }}>
          {data.phone}
        </p>
        <div className="flex gap-2">
          <a
            href={`tel:${data.phone}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
          >
            <Phone className="w-4 h-4" />
            اتصال
          </a>
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold"
            style={{ background: copied ? "#f0fdf4" : "#f5f3ff", color: copied ? "#16a34a" : "#7c3aed" }}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "تم النسخ" : "نسخ"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== مكون بطاقة ساعات العمل =====
function HoursCard({ data }: { data: { hours: string[]; isOpen: boolean | null; placeName: string } }) {
  return (
    <div
      className="rounded-2xl overflow-hidden w-72"
      style={{ background: "#fff", border: "2px solid #f59e0b30", boxShadow: "0 2px 12px rgba(245,158,11,0.1)" }}
    >
      <div className="px-4 py-3" style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white" />
            <p className="text-white font-bold text-sm">أوقات العمل</p>
          </div>
          {data.isOpen !== null && (
            <span
              className="text-xs font-bold px-2 py-1 rounded-full"
              style={{
                background: data.isOpen ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)",
                color: data.isOpen ? "#bbf7d0" : "#fecaca",
              }}
            >
              {data.isOpen ? "✅ مفتوح" : "❌ مغلق"}
            </span>
          )}
        </div>
      </div>
      <div className="p-3 space-y-1">
        {data.hours.length > 0 ? (
          data.hours.map((line, i) => (
            <p key={i} className="text-xs py-1 px-2 rounded-lg" style={{ color: "#374151", background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
              {line}
            </p>
          ))
        ) : (
          <p className="text-sm text-center py-2" style={{ color: "#9ca3af" }}>ما توفرت معلومات أوقات العمل</p>
        )}
      </div>
    </div>
  );
}

// ===== مكون بطاقة رابط المتجر =====
function PlaceLinkCard({ data }: { data: { url: string; coords: { lat: number; lng: number } | null; address: string | null; placeName: string } }) {
  const [copiedCoords, setCopiedCoords] = useState(false);

  function handleCopyCoords() {
    if (!data.coords) return;
    const text = `${data.coords.lat},${data.coords.lng}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    });
  }

  return (
    <div
      className="rounded-2xl overflow-hidden w-72"
      style={{ background: "#fff", border: "2px solid #3b82f630", boxShadow: "0 2px 12px rgba(59,130,246,0.1)" }}
    >
      <div className="px-4 py-3" style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-white" />
          <p className="text-white font-bold text-sm">{data.placeName}</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {data.address && (
          <p className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>{data.address}</p>
        )}
        {data.coords && (
          <div
            className="flex items-center justify-between px-3 py-2 rounded-xl"
            style={{ background: "#eff6ff" }}
          >
            <span className="text-xs font-mono" style={{ color: "#1e40af" }}>
              {data.coords.lat.toFixed(6)}, {data.coords.lng.toFixed(6)}
            </span>
            <button
              onClick={handleCopyCoords}
              className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
              style={{ background: copiedCoords ? "#dcfce7" : "#dbeafe", color: copiedCoords ? "#16a34a" : "#2563eb" }}
            >
              {copiedCoords ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedCoords ? "تم" : "نسخ"}
            </button>
          </div>
        )}
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
        >
          <MapPin className="w-4 h-4" />
          افتح في قوقل ماب
        </a>
      </div>
    </div>
  );
}

// ===== مكون بطاقة تأكيد الطلب =====
function OrderConfirmedCard({ data }: { data: OrderConfirmedData }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#fff", border: "2px solid #16a34a40" }}
    >
      <div className="px-4 py-3" style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-white" />
          <p className="text-white font-bold text-sm">تم استلام طلبك!</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "#6b7280" }}>رقم الطلب</span>
          <span
            className="font-black text-sm px-3 py-1 rounded-full"
            style={{ background: "#f0fdf4", color: "#16a34a" }}
          >
            {data.orderNumber}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "#6b7280" }}>المكان</span>
          <span className="font-bold text-sm" style={{ color: "#1a1a2e" }}>{data.placeName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "#6b7280" }}>الإجمالي</span>
          <span className="font-black" style={{ color: "#7c3aed" }}>{data.total} ر.س</span>
        </div>
        <div
          className="text-center text-xs py-2 rounded-xl"
          style={{ background: "#f0fdf4", color: "#16a34a" }}
        >
          🚀 المندوب في الطريق إليك
        </div>
      </div>
    </div>
  );
}

// ===== الصفحة الرئيسية =====
export default function ShopperChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState("GREETING");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceCard | null>(null);
  const [menuItems, setMenuItems] = useState<Array<{ name: string; price: string; category?: string; emoji?: string }>>([]);
  const [chatStarted, setChatStarted] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<InvoiceData | null>(null);
  const [pendingOrderData, setPendingOrderData] = useState<{
    orderItems: Array<{ name: string; price: string; quantity: number }>;
    total: number;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<number | null>(null);
  const [lastKnownStatus, setLastKnownStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [locationLabel, setLocationLabel] = useState<string>("جاري تحديد موقعك...");
  const [locationLoading, setLocationLoading] = useState(true);

  // ===== polling لحالة الطلب بعد التأكيد =====
  const orderStatusQuery = trpc.shopperChat.getOrderStatus.useQuery(
    { orderId: confirmedOrderId ?? 0 },
    {
      enabled: confirmedOrderId !== null && lastKnownStatus !== "delivered" && lastKnownStatus !== "cancelled",
      refetchInterval: 10000, // كل 10 ثواني
      refetchIntervalInBackground: false,
    }
  );

  // عند تغيّر الحالة أضف رسالة جديدة في الشات
  useEffect(() => {
    const statusData = orderStatusQuery.data;
    if (!statusData) return;
    if (statusData.status === lastKnownStatus) return; // لم يتغيّر

    setLastKnownStatus(statusData.status);

    // لا تضف رسالة للحالة الأولية (pending) لأنها معروضة في بطاقة التأكيد
    if (statusData.status === "pending") return;

    const statusMsg: ChatMessage = {
      id: `status-${Date.now()}`,
      role: "assistant",
      content: `${statusData.emoji} ${statusData.message}`,
      timestamp: new Date(),
      type: "text",
    };
    setMessages((prev) => [...prev, statusMsg]);

    // إيقاف البولينج بعد التسليم أو الإلغاء
    if (statusData.isDone) {
      setConfirmedOrderId(null);
    }
  }, [orderStatusQuery.data?.status]);

  // ===== mutations =====
  const confirmOrderMutation = trpc.shopperChat.confirmOrder.useMutation({
    onSuccess: (data) => {
      setIsConfirming(false);
      const confirmedMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `تم استلام طلبك! رقم الطلب: ${data.orderNumber}`,
        timestamp: new Date(),
        type: "order_confirmed",
        orderConfirmed: {
          orderNumber: data.orderNumber ?? "",
          orderId: data.orderId,
          placeName: pendingInvoice?.placeName ?? selectedPlace?.name ?? "",
          total: pendingInvoice?.total ?? 0,
        },
      };
      setMessages((prev) => [...prev, confirmedMsg]);
      setStage("CONFIRMED");
      setPendingInvoice(null);
      setPendingOrderData(null);
      // بدء البولينج لحالة الطلب
      setConfirmedOrderId(data.orderId);
      setLastKnownStatus("pending");
    },
    onError: (err) => {
      setIsConfirming(false);
      toast.error(err.message || "فشل إنشاء الطلب، حاول مرة أخرى");
    },
  });

  const startChatMutation = trpc.shopperChat.startChat.useMutation({
    onSuccess: (data) => {
      const welcomeMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
        type: "text",
      };
      setMessages([welcomeMsg]);
      setStage(data.stage);
      setChatStarted(true);
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
      toast.error("تعذّر بدء المحادثة");
    },
  });

  const sendMessageMutation = trpc.shopperChat.sendMessage.useMutation({
    onSuccess: (data) => {
      const assistantMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
        type: "text",
      };

      setStage(data.stage);

      if (data.action === "show_places" && data.nearbyPlaces.length > 0) {
        const placesMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "شف اللي حولك واختر:",
          timestamp: new Date(),
          type: "places_card",
          places: data.nearbyPlaces,
        };
        setMessages((prev) => [...prev, assistantMsg, placesMsg]);
      } else if (data.action === "show_places" && data.nearbyPlaces.length === 0) {
        // لا يوجد موقع أو لا توجد نتائج
        const noLocationMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: !userLocation
            ? "ما قدرت أحدد موقعك. اسمح للتطبيق بالوصول لموقعك من المتصفح ، أو عطني رابط قوجل ماب للمحل اللي تبغاه."
            : "ما لقيت أماكن قريبة من موقعك. عطني رابط قوجل ماب للمحل اللي تبغاه وبكمل طلبك.",
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, assistantMsg, noLocationMsg]);
      } else if (data.action === "get_phone") {
        // عرض بطاقة رقم المحل
        if (data.placePhone) {
          const phoneMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `تفضل رقم ${data.placeName || selectedPlace?.name || "المحل"}:`,
            timestamp: new Date(),
            type: "phone_card",
            phoneData: { phone: data.placePhone, placeName: data.placeName || selectedPlace?.name || "المحل" },
          };
          setMessages((prev) => [...prev, assistantMsg, phoneMsg]);
        } else {
          const noPhoneMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `عذراً، ما لقيت رقم لهذا المحل في قوقل ماب.`,
            timestamp: new Date(),
            type: "text",
          };
          setMessages((prev) => [...prev, assistantMsg, noPhoneMsg]);
        }
      } else if (data.action === "get_hours") {
        // عرض بطاقة ساعات العمل
        const hoursMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `أوقات عمل ${data.placeName || selectedPlace?.name || "المحل"}:`,
          timestamp: new Date(),
          type: "hours_card",
          hoursData: {
            hours: data.placeHours ?? [],
            isOpen: data.placeIsOpenNow ?? null,
            placeName: data.placeName || selectedPlace?.name || "المحل",
          },
        };
        setMessages((prev) => [...prev, assistantMsg, hoursMsg]);
      } else if (data.action === "get_place_link") {
        // عرض بطاقة رابط المتجر
        if (data.placeLinkUrl) {
          const linkMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: assistantMsg.content,
            timestamp: new Date(),
            type: "place_link_card",
            placeLinkData: {
              url: data.placeLinkUrl,
              coords: data.placeCoords ?? null,
              address: data.placeAddress ?? null,
              placeName: data.placeName || selectedPlace?.name || "المتجر",
            },
          };
          setMessages((prev) => [...prev, assistantMsg, linkMsg]);
        } else {
          const noLinkMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "عذراً، ما لقيت رابط لهذا المحل في قوقل ماب.",
            timestamp: new Date(),
            type: "text",
          };
          setMessages((prev) => [...prev, assistantMsg, noLinkMsg]);
        }
      } else if (data.action === "get_place_info" && data.placeInfoAnswer) {
        // عرض رد معلومات المتجر كنص عادي
        const infoMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.placeInfoAnswer,
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, assistantMsg, infoMsg]);
      } else if (data.action === "show_invoice" && data.orderItems.length > 0) {
        const inv: InvoiceData = {
          items: data.orderItems,
          total: data.total,
          placeName: data.placeName || selectedPlace?.name || "",
        };
        setPendingInvoice(inv);
        setPendingOrderData({ orderItems: data.orderItems, total: data.total });
        const invoiceMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: assistantMsg.content,
          timestamp: new Date(),
          type: "invoice_card",
          invoice: inv,
        };
        setMessages((prev) => [...prev, invoiceMsg]);
      } else {
        setMessages((prev) => [...prev, assistantMsg]);
      }

      setIsLoading(false);
      inputRef.current?.focus();
    },
    onError: (err) => {
      setIsLoading(false);
      toast.error(err.message || "حدث خطأ في المحادثة");
    },
  });

  // طلب الموقع تلقائياً + reverse geocode
  const fetchLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationLabel("جاري تحديد موقعك...");
    if (!navigator.geolocation) {
      setLocationLabel("الموقع غير متاح");
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        // reverse geocode عبر Google Maps Geocoding API
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ar&key=AIzaSyDDI3RtbPHvnAjC6O1D6CEM_MVQOtkpjqs`
          );
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            // خذ أول مكوّن من نوع neighborhood أو sublocality أو locality
            const result = data.results[0];
            const comp = result.address_components?.find((c: { types: string[]; long_name: string }) =>
              c.types.some((t: string) => ["neighborhood", "sublocality", "sublocality_level_1", "locality"].includes(t))
            );
            setLocationLabel(comp ? comp.long_name : result.formatted_address?.split("،")[0] ?? "موقعك الحالي");
          } else {
            setLocationLabel("موقعك الحالي");
          }
        } catch {
          setLocationLabel("موقعك الحالي");
        }
        setLocationLoading(false);
      },
      () => {
        setLocationLabel("تعذّر تحديد الموقع");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => { fetchLocation(); }, []);

  // بدء المحادثة فقط عند الكتابة أو اختيار فئة (ليس تلقائياً)
  // startChatMutation يُستدعى عند أول تفاعل

  // التمرير للأسفل عند رسالة جديدة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    // إذا قال "نعم اكيد" وعندنا فاتورة معلقة → نؤكد الطلب فعلياً
    const normalizedText = text.trim().replace(/\s+/g, " ");
    if (
      (normalizedText.includes("نعم") || normalizedText.includes("اكيد") || normalizedText.includes("أكيد")) &&
      pendingOrderData &&
      stage === "CONFIRM"
    ) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsConfirming(true);

      confirmOrderMutation.mutate({
        placeName: selectedPlace?.name ?? pendingInvoice?.placeName ?? "مكان غير محدد",
        placeId: selectedPlace?.placeId,
        orderItems: pendingOrderData.orderItems,
        total: pendingOrderData.total,
        deliveryLat: userLocation?.lat?.toString(),
        deliveryLng: userLocation?.lng?.toString(),
        deliveryAddressText: "موقع العميل الحالي",
      });
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
      type: "text",
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    sendMessageMutation.mutate({
      messages: updatedMessages
        .filter((m) => m.type === "text")
        .map((m) => ({ role: m.role, content: m.content })),
      userLat: userLocation?.lat,
      userLng: userLocation?.lng,
      selectedPlaceId: selectedPlace?.placeId,
      selectedPlaceName: selectedPlace?.name,
      menuItems: menuItems.length > 0 ? menuItems : undefined,
    });
  }

  function handleSelectPlace(place: PlaceCard) {
    setSelectedPlace(place);
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: `اخترت: ${place.name}`,
      timestamp: new Date(),
      type: "text",
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    sendMessageMutation.mutate({
      messages: updatedMessages
        .filter((m) => m.type === "text")
        .map((m) => ({ role: m.role, content: m.content })),
      userLat: userLocation?.lat,
      userLng: userLocation?.lng,
      selectedPlaceId: place.placeId,
      selectedPlaceName: place.name,
    });
  }

  const quickReplies = QUICK_REPLIES[stage] ?? [];

  // دالة لبدء المحادثة عند أول تفاعل
  function startChatIfNeeded(initialText?: string) {
    if (!chatStarted) {
      setIsLoading(true);
      startChatMutation.mutate(undefined, {
        onSuccess: (data) => {
          const welcomeMsg: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: data.reply,
            timestamp: new Date(),
            type: "text",
          };
          setMessages([welcomeMsg]);
          setStage(data.stage);
          setChatStarted(true);
          setIsLoading(false);
          // إذا كان هناك نص مبدئي، أرسله بعد بدء المحادثة
          if (initialText) {
            setTimeout(() => sendMessage(initialText), 100);
          }
        },
        onError: () => {
          setIsLoading(false);
          toast.error("تعذّر بدء المحادثة");
        },
      });
    } else if (initialText) {
      sendMessage(initialText);
    }
  }

  return (
    <div
      dir="rtl"
      className="flex flex-col h-full"
      style={{ background: "#fff" }}
    >
      {/* ===== شريط موقع التوصيل ===== */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid #f0f0f0" }}
      >
        <span className="text-xs text-gray-400 flex-shrink-0">التسليم إلى</span>
        <button
          onClick={fetchLocation}
          className="flex items-center gap-1.5 flex-1 min-w-0 px-3 py-1.5 rounded-full transition-all active:scale-95"
          style={{ border: "1.5px solid #e5e7eb", background: "#fafafa" }}
        >
          {locationLoading ? (
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "#22c55e" }} />
          ) : (
            <Navigation className="w-4 h-4 flex-shrink-0" style={{ color: "#22c55e" }} />
          )}
          <span className="text-sm font-bold truncate" style={{ color: "#22c55e" }}>{locationLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#22c55e" }} />
        </button>
        {chatStarted && (
          <button
            onClick={() => {
              setMessages([]);
              setChatStarted(false);
              setStage("GREETING");
              setSelectedPlace(null);
              setMenuItems([]);
              setPendingInvoice(null);
              setPendingOrderData(null);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#f5f5f5" }}
          >
            <X className="w-4 h-4" style={{ color: "#9ca3af" }} />
          </button>
        )}
      </div>

      {/* ===== شاشة الترحيب (قبل بدء الشات) ===== */}
      {!chatStarted && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
          {/* الأيقونة */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
            style={{ background: "#1a1a2e" }}
          >
            🛍️
          </div>
          {/* العنوان */}
          <h1 className="text-3xl font-black text-center leading-tight mb-2" style={{ color: "#1a1a2e" }}>
            اطلب توصيل<br />أي شيء من أي مكان
          </h1>
          <p className="text-sm text-center mb-8" style={{ color: "#9ca3af" }}>
            مرسول يوصل أو يرسل لك أي شي من أي مكان.
          </p>
          {/* زر السماح بالموقع إذا لم يُمنح */}
          {!userLocation && !locationLoading && (
            <button
              onClick={fetchLocation}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold mb-4 transition-all active:scale-95"
              style={{ background: "#7c3aed", color: "#fff", border: "none" }}
            >
              <Navigation className="w-4 h-4" />
              <span>تحديد موقعي</span>
            </button>
          )}
          {/* أزرار الفئات */}
          <div className="flex flex-wrap justify-center gap-3">
            {HOME_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => startChatIfNeeded(cat.query)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95"
                style={{ background: "#f5f5f5", color: "#1a1a2e", border: "1.5px solid #e5e7eb" }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== منطقة الرسائل (بعد بدء الشات) ===== */}
      {chatStarted && <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mb-1"
                  style={{ background: "#7c3aed" }}
                >
                  🛍️
                </div>
                <div className="flex flex-col gap-1">
                  {msg.type === "places_card" && msg.places ? (
                    <div className="space-y-2 w-72">
                      <div
                        className="px-4 py-2 rounded-2xl rounded-br-sm text-sm font-medium"
                        style={{ background: "#fff", color: "#1a1a2e", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                      >
                        {msg.content}
                      </div>
                      {msg.places.map((place) => (
                        <PlaceCardItem key={place.placeId} place={place} onSelect={handleSelectPlace} />
                      ))}
                    </div>
                  ) : msg.type === "invoice_card" && msg.invoice ? (
                    <div className="w-72">
                      <div
                        className="px-4 py-2 rounded-2xl rounded-br-sm text-sm font-medium mb-2"
                        style={{ background: "#fff", color: "#1a1a2e", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                      >
                        {msg.content}
                      </div>
                      <InvoiceCard invoice={msg.invoice} />
                    </div>
                  ) : msg.type === "order_confirmed" && msg.orderConfirmed ? (
                    <div className="w-72">
                      <div
                        className="px-4 py-2 rounded-2xl rounded-br-sm text-sm font-medium mb-2"
                        style={{ background: "#fff", color: "#1a1a2e", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                      >
                        {msg.content}
                      </div>
                      <OrderConfirmedCard data={msg.orderConfirmed} />
                    </div>
                  ) : msg.type === "phone_card" && msg.phoneData ? (
                    <PhoneCard data={msg.phoneData} />
                  ) : msg.type === "hours_card" && msg.hoursData ? (
                    <HoursCard data={msg.hoursData} />
                  ) : msg.type === "place_link_card" && msg.placeLinkData ? (
                    <div className="space-y-2">
                      {msg.content && (
                        <div
                          className="px-4 py-2 rounded-2xl rounded-br-sm text-sm font-medium"
                          style={{ background: "#fff", color: "#1a1a2e", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                        >
                          {msg.content}
                        </div>
                      )}
                      <PlaceLinkCard data={msg.placeLinkData} />
                    </div>
                  ) : (
                    <div
                      className="px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed"
                      style={{
                        background: "#fff",
                        color: "#1a1a2e",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        maxWidth: "280px",
                      }}
                    >
                      {renderMessageText(msg.content)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {msg.role === "user" && (
              <div
                className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed max-w-[75%]"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(124,58,237,0.3)",
                }}
              >
                {renderMessageText(msg.content)}
              </div>
            )}
          </div>
        ))}

        {/* مؤشر الكتابة */}
        {(isLoading || isConfirming) && (
          <div className="flex justify-end">
            <div className="flex items-end gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: "#7c3aed" }}
              >
                🛍️
              </div>
              <div
                className="px-4 py-3 rounded-2xl rounded-br-sm"
                style={{ background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              >
                {isConfirming ? (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "#7c3aed" }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تأكيد طلبك...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#7c3aed", animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#7c3aed", animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#7c3aed", animationDelay: "300ms" }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>}

      {/* ===== أزرار الاقتراحات السريعة (فقط بعد بدء الشات) ===== */}
      {chatStarted && quickReplies.length > 0 && !isLoading && !isConfirming && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none" }}>
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => sendMessage(reply)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95"
              style={{
                background: "#f5f5f5",
                color: "#1a1a2e",
                border: "1.5px solid #e5e7eb",
              }}
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* ===== حقل الإدخال ===== */}
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ background: "#f5f5f5", borderTop: "1px solid #e5e7eb" }}
      >
        <div
          className="flex items-center gap-3 px-4 rounded-2xl"
          style={{ background: "#fff", border: "1.5px solid #e5e7eb", minHeight: "52px" }}
        >
          {/* زر الميكروفون */}
          <button
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => toast.info("ميزة الصوت قادمة قريباً")}
          >
            <Mic className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // بدء الشات عند أول كتابة إذا لم يبدأ بعد
              if (!chatStarted && e.target.value.length === 1) {
                startChatIfNeeded();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!chatStarted) startChatIfNeeded(input);
                else sendMessage(input);
              }
            }}
            placeholder="اكتب اللي بخاطرك"
            disabled={isLoading || isConfirming}
            className="flex-1 py-3 text-sm outline-none bg-transparent"
            style={{ color: "#1a1a2e" }}
          />
          {/* زر الإرسال */}
          {input.trim() && (
            <button
              onClick={() => {
                if (!chatStarted) startChatIfNeeded(input);
                else sendMessage(input);
              }}
              disabled={isLoading || isConfirming}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
              style={{ background: "#1a1a2e" }}
            >
              {isLoading || isConfirming ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" style={{ transform: "scaleX(-1)" }} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
