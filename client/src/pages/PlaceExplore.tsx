import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ===== TYPES =====
interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  totalRatings: number;
  priceLevel: number | null;
  types: string[];
  photoUrl: string | null;
  googleMapsUrl: string;
  lat: number | null;
  lng: number | null;
}

interface AnalysisResult {
  placeId: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  rating: number | null;
  totalRatings?: number | null;
  photoUrl?: string | null;
  googleMapsUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  aiSummary?: string | null;
  famousFor: string[];
  topItems: Array<{ name: string; price?: string; description: string; emoji: string }>;
  trendingItems: Array<{ name: string; description: string; emoji: string }>;
  menuItems: Array<{ category: string; name: string; price?: string; description: string; emoji: string }>;
  cached?: boolean;
}

// ===== HELPERS =====
function getPriceLevelText(level: number | null): string {
  if (level === null) return "";
  return ["مجاني", "اقتصادي", "متوسط", "مرتفع", "فاخر"][level] || "";
}

function getPriceLevelEmoji(level: number | null): string {
  if (level === null) return "";
  return ["", "💚", "💛", "🟠", "💎"][level] || "";
}

function getTypeLabel(types: string[]): string {
  const map: Record<string, string> = {
    cafe: "كافيه",
    restaurant: "مطعم",
    bakery: "مخبز",
    bar: "بار",
    meal_takeaway: "وجبات سريعة",
    meal_delivery: "توصيل",
    food: "طعام",
    coffee_shop: "قهوة",
  };
  for (const t of types) {
    if (map[t]) return map[t];
  }
  return "مكان";
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-yellow-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-sm ${i < full ? "text-yellow-400" : i === full && half ? "text-yellow-300" : "text-gray-600"}`}>★</span>
      ))}
      <span className="text-white text-xs font-bold mr-1">{rating.toFixed(1)}</span>
    </span>
  );
}

// ===== PLACE CARD =====
function PlaceCard({ place, onAnalyze, isAnalyzing }: {
  place: PlaceResult;
  onAnalyze: (placeId: string) => void;
  isAnalyzing: boolean;
}) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", border: "1px solid rgba(139,92,246,0.3)" }}
      onClick={() => onAnalyze(place.placeId)}
    >
      {/* صورة المكان */}
      {place.photoUrl ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={place.photoUrl}
            alt={place.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e1b4b] via-transparent to-transparent" />
          {/* نوع المكان */}
          <div className="absolute top-3 right-3">
            <Badge className="text-xs font-bold px-2 py-1" style={{ background: "rgba(139,92,246,0.9)", color: "white" }}>
              {getTypeLabel(place.types)}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="h-40 flex items-center justify-center text-6xl" style={{ background: "linear-gradient(135deg, #312e81, #4c1d95)" }}>
          {place.types.includes("cafe") || place.types.includes("coffee_shop") ? "☕" : "🍽️"}
        </div>
      )}

      {/* معلومات المكان */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-white font-bold text-base leading-tight">{place.name}</h3>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StarRating rating={place.rating} />
            <span className="text-gray-400 text-xs">({place.totalRatings.toLocaleString("ar")} تقييم)</span>
          </div>
        </div>

        {/* العنوان */}
        <p className="text-gray-400 text-xs mb-3 line-clamp-2 text-right">{place.address}</p>

        {/* مستوى السعر */}
        {place.priceLevel !== null && (
          <div className="flex items-center gap-1 mb-3">
            <span className="text-xs">{getPriceLevelEmoji(place.priceLevel)}</span>
            <span className="text-gray-300 text-xs">{getPriceLevelText(place.priceLevel)}</span>
          </div>
        )}

        {/* زر التحليل */}
        <Button
          className="w-full text-sm font-bold py-2 rounded-xl transition-all"
          style={{ background: isAnalyzing ? "#4c1d95" : "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "white" }}
          onClick={(e) => { e.stopPropagation(); onAnalyze(place.placeId); }}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> جاري التحليل...
            </span>
          ) : (
            <span className="flex items-center gap-2">🤖 تحليل AI وعرض المنيو</span>
          )}
        </Button>
      </div>
    </div>
  );
}

// ===== ANALYSIS MODAL =====
function AnalysisModal({ analysis, onClose, onOrder }: {
  analysis: AnalysisResult;
  onClose: () => void;
  onOrder: (items: Array<{ name: string; price?: string }>) => void;
}) {
  const [cart, setCart] = useState<Array<{ name: string; price?: string; qty: number }>>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "menu" | "trending">("overview");

  // تجميع عناصر المنيو حسب الفئة
  const menuByCategory = analysis.menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof analysis.menuItems>);

  const addToCart = (item: { name: string; price?: string }) => {
    setCart(prev => {
      const existing = prev.find(c => c.name === item.name);
      if (existing) return prev.map(c => c.name === item.name ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
    toast.success(`✅ ${item.name} أُضيف للسلة`);
  };

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const totalPrice = cart.reduce((s, c) => s + (parseFloat(c.price || "0") * c.qty), 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="flex-1 overflow-y-auto" style={{ background: "linear-gradient(180deg, #0f0a1e 0%, #1a0f3e 100%)" }}>
        {/* Header */}
        <div className="relative">
          {analysis.photoUrl ? (
            <div className="h-52 relative overflow-hidden">
              <img src={analysis.photoUrl} alt={analysis.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a1e] via-[#0f0a1e]/60 to-transparent" />
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-8xl" style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)" }}>
              ☕
            </div>
          )}

          {/* زر الإغلاق */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ background: "rgba(0,0,0,0.6)" }}
          >
            ✕
          </button>

          {/* معلومات المكان */}
          <div className="absolute bottom-0 right-0 left-0 p-4">
            <h2 className="text-white font-bold text-2xl mb-1">{analysis.name}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <StarRating rating={analysis.rating} />
              {analysis.totalRatings && (
                <span className="text-gray-300 text-xs">({Number(analysis.totalRatings).toLocaleString("ar")} تقييم)</span>
              )}
              {analysis.phone && (
                <a
                  href={`tel:${analysis.phone}`}
                  className="flex items-center gap-1 text-green-400 text-xs font-bold"
                  onClick={e => e.stopPropagation()}
                >
                  📞 {analysis.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* روابط الخريطة */}
        <div className="px-4 py-2 flex gap-2">
          {analysis.googleMapsUrl && (
            <a
              href={analysis.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-bold"
              style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}
            >
              📍 فتح في خرائط Google
            </a>
          )}
          {analysis.lat && analysis.lng && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${analysis.lat},${analysis.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-bold"
              style={{ background: "rgba(59,130,246,0.2)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}
            >
              🧭 الاتجاهات
            </a>
          )}
        </div>

        {/* التبويبات */}
        <div className="flex border-b mx-4 mb-4" style={{ borderColor: "rgba(139,92,246,0.3)" }}>
          {(["overview", "menu", "trending"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 text-sm font-bold transition-all"
              style={{
                color: activeTab === tab ? "#a78bfa" : "#6b7280",
                borderBottom: activeTab === tab ? "2px solid #a78bfa" : "2px solid transparent",
              }}
            >
              {tab === "overview" ? "🏠 نظرة عامة" : tab === "menu" ? "📋 المنيو" : "🔥 الترند"}
            </button>
          ))}
        </div>

        <div className="px-4 pb-32">
          {/* نظرة عامة */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* ملخص AI */}
              {analysis.aiSummary && (
                <div className="rounded-2xl p-4" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🤖</span>
                    <span className="text-purple-300 font-bold text-sm">تحليل AI</span>
                  </div>
                  <p className="text-gray-200 text-sm leading-relaxed text-right">{analysis.aiSummary}</p>
                </div>
              )}

              {/* ما يشتهر به */}
              {analysis.famousFor.length > 0 && (
                <div>
                  <h3 className="text-white font-bold mb-2 text-sm">⭐ يشتهر بـ</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.famousFor.map((item, i) => (
                      <span key={i} className="text-xs px-3 py-1.5 rounded-full font-medium"
                        style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* الأكثر طلباً */}
              {analysis.topItems.length > 0 && (
                <div>
                  <h3 className="text-white font-bold mb-3 text-sm">🏆 الأكثر طلباً</h3>
                  <div className="space-y-2">
                    {analysis.topItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <button
                          onClick={() => addToCart({ name: item.name, price: item.price })}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "white" }}
                        >
                          + أضف
                        </button>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-white font-bold text-sm">{item.name}</span>
                            <span className="text-xl">{item.emoji}</span>
                          </div>
                          <p className="text-gray-400 text-xs">{item.description}</p>
                          {item.price && <span className="text-green-400 text-xs font-bold">{item.price} ر.س</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* المنيو الكامل */}
          {activeTab === "menu" && (
            <div className="space-y-5">
              {Object.entries(menuByCategory).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-purple-300 font-bold text-sm mb-2 flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-purple-500 inline-block" />
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <button
                          onClick={() => addToCart({ name: item.name, price: item.price })}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "white" }}
                        >
                          + أضف
                        </button>
                        <div className="text-right flex-1 mr-3">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-white font-bold text-sm">{item.name}</span>
                            <span className="text-lg">{item.emoji}</span>
                          </div>
                          <p className="text-gray-400 text-xs">{item.description}</p>
                          {item.price && <span className="text-green-400 text-xs font-bold">{item.price} ر.س</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {analysis.menuItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>لا توجد عناصر منيو متاحة</p>
                </div>
              )}
            </div>
          )}

          {/* الترند */}
          {activeTab === "trending" && (
            <div className="space-y-3">
              {analysis.trendingItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(251,146,60,0.1))", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <span className="text-3xl">{item.emoji}</span>
                  <div className="flex-1 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <h4 className="text-white font-bold text-sm">{item.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "rgba(239,68,68,0.3)", color: "#f87171" }}>
                        🔥 ترند
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">{item.description}</p>
                  </div>
                  <button
                    onClick={() => addToCart({ name: item.name })}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "white" }}
                  >
                    + أضف
                  </button>
                </div>
              ))}
              {analysis.trendingItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🔥</div>
                  <p>لا توجد عناصر ترند حالياً</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* شريط السلة */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: "linear-gradient(to top, #0f0a1e, transparent)" }}>
          <button
            onClick={() => onOrder(cart.map(c => ({ name: c.name, price: c.price })))}
            className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-between px-5"
            style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", boxShadow: "0 8px 30px rgba(124,58,237,0.5)" }}
          >
            <span className="text-purple-200 text-sm">{totalPrice > 0 ? `${totalPrice.toFixed(0)} ر.س` : ""}</span>
            <span>🛒 اطلب الآن ({totalItems})</span>
            <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">{totalItems}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ===== MAIN PAGE =====
export default function PlaceExplore() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [cityName, setCityName] = useState("");
  const [searchQuery, setSearchQuery] = useState<{ query: string; cityName?: string } | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // بحث عن الأماكن
  const searchResult = trpc.placeExplore.search.useQuery(
    { query: searchQuery?.query || "", cityName: searchQuery?.cityName, minRating: 4.0, minReviews: 200 },
    { enabled: !!searchQuery?.query, retry: false }
  );

  // تحليل AI
  const analyzeMutation = trpc.placeExplore.analyze.useMutation({
    onSuccess: (data) => {
      setAnalysis(data as AnalysisResult);
      setAnalyzingId(null);
    },
    onError: (err) => {
      toast.error(`❌ ${err.message}`);
      setAnalyzingId(null);
    },
  });

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearchQuery({ query: query.trim(), cityName: cityName.trim() || undefined });
  };

  const handleAnalyze = (placeId: string) => {
    setAnalyzingId(placeId);
    analyzeMutation.mutate({ placeId, forceRefresh: false });
  };

  const handleOrder = (items: Array<{ name: string; price?: string }>) => {
    // TODO: ربط بنظام الطلبات
    toast.success(`🛒 تم إنشاء الطلب — ${items.length} صنف`);
    setAnalysis(null);
  };

  const popularSearches = ["كافيه", "مطعم برجر", "بيتزا", "مشاوي", "حلويات", "قهوة", "سوشي", "مندي"];

  return (
    <div className="min-h-screen pb-20" style={{ background: "linear-gradient(180deg, #0f0a1e 0%, #1a0f3e 100%)" }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)" }}>
            🔍
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">استكشف المطاعم</h1>
            <p className="text-gray-400 text-xs">ابحث وحلّل بالذكاء الاصطناعي</p>
          </div>
        </div>

        {/* حقل البحث */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="ابحث عن مطعم أو كافيه..."
              className="flex-1 text-right font-medium"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(139,92,246,0.4)", color: "white", borderRadius: "12px" }}
            />
            <Button
              onClick={handleSearch}
              disabled={!query.trim() || searchResult.isLoading}
              className="px-5 rounded-xl font-bold"
              style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "white" }}
            >
              {searchResult.isLoading ? "⏳" : "🔍"}
            </Button>
          </div>

          <Input
            value={cityName}
            onChange={e => setCityName(e.target.value)}
            placeholder="المدينة (اختياري) — مثل: الرياض، جدة..."
            className="text-right text-sm"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(139,92,246,0.2)", color: "white", borderRadius: "12px" }}
          />
        </div>

        {/* بحث سريع */}
        {!searchQuery && (
          <div className="mt-3">
            <p className="text-gray-500 text-xs mb-2">بحث سريع:</p>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); setSearchQuery({ query: s, cityName: cityName || undefined }); }}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* النتائج */}
      <div className="px-4">
        {searchResult.isLoading && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3 animate-pulse">🔍</div>
            <p className="text-gray-400 font-medium">جاري البحث عن أفضل الأماكن...</p>
            <p className="text-gray-600 text-sm mt-1">نفلتر فقط الأماكن بتقييم 4.0+ و200+ تعليق</p>
          </div>
        )}

        {searchResult.isError && (
          <div className="text-center py-8 rounded-2xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <div className="text-4xl mb-2">❌</div>
            <p className="text-red-400 font-medium">حدث خطأ في البحث</p>
            <p className="text-gray-500 text-sm mt-1">{searchResult.error?.message}</p>
          </div>
        )}

        {searchResult.data && (
          <>
            {/* إحصائيات البحث */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-xs">
                {searchResult.data.total === 0 ? "لا توجد نتائج" : `${searchResult.data.total} مكان مميز`}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>
                  ⭐ 4.0+
                </span>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>
                  💬 200+ تقييم
                </span>
              </div>
            </div>

            {searchResult.data.total === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">😔</div>
                <p className="text-gray-400 font-medium">لا توجد أماكن بمعايير الجودة المطلوبة</p>
                <p className="text-gray-600 text-sm mt-1">جرّب بحثاً مختلفاً أو مدينة أخرى</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {searchResult.data.places.map(place => (
                  <PlaceCard
                    key={place.placeId}
                    place={place}
                    onAnalyze={handleAnalyze}
                    isAnalyzing={analyzingId === place.placeId}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* الشاشة الرئيسية */}
        {!searchQuery && (
          <div className="text-center py-16">
            <div className="text-7xl mb-4">🍽️</div>
            <h2 className="text-white font-bold text-xl mb-2">اكتشف أفضل المطاعم</h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              ابحث عن أي مطعم أو كافيه وسيحلله الذكاء الاصطناعي ويعرض لك المنيو والأسعار والأكثر طلباً
            </p>
          </div>
        )}
      </div>

      {/* نافذة التحليل */}
      {analysis && (
        <AnalysisModal
          analysis={analysis}
          onClose={() => setAnalysis(null)}
          onOrder={handleOrder}
        />
      )}
    </div>
  );
}
