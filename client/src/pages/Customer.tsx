import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import { trpc } from "@/lib/trpc";
import { OrderStatusBadge, WhatsAppButton } from "@/components/OrderStatusBadge";
import { MapView } from "@/components/Map";
import {
  Clock, MapPin, Minus, Package, Plus, ShoppingCart, Star, Truck,
  Search, Loader2, ChevronRight, X, CheckCircle2, Image as ImageIcon,
  Phone, ArrowRight, DoorClosed, User, UserPlus, ChevronLeft, Info,
  Home, ClipboardList, UserCircle, Camera, Pin, LogOut, Edit2, CheckCircle, PlusCircle, Store, Locate, Users,
  Shield, FileText
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { PhoneLoginModal } from "@/components/PhoneLoginModal";
import ShopperChat from "./ShopperChat";

type CartItem = { id: number; name: string; price: string; quantity: number; restaurantId: number };

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/115452271/NK9L9naBDDKkTQDnwgY78j/shopper-logo-transparent-final_911dcdb1.png";

// ─── WelcomeScreen ────────────────────────────────────────────────────────────
function WelcomeScreen({ userName, onStart, onBrowse }: { userName: string; onStart: () => void; onBrowse: () => void }) {
  const [phase, setPhase] = useState<"logo" | "content">("logo");

  useEffect(() => {
    const t = setTimeout(() => setPhase("content"), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#f8f5ff" }}
    >
      {/* دوائر ضوئية خفيفة */}

      <div className="absolute top-[-120px] right-[-80px] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)" }} />
      <div className="absolute bottom-[-100px] left-[-80px] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)" }} />

      {/* المحتوى */}
      <div className="relative flex flex-col items-center gap-8 px-8 text-center w-full max-w-sm">

        {/* شعار كبير مع انيميشن */}
        <div
          style={{
            animation: phase === "logo" ? "logoZoom 2.8s cubic-bezier(0.22,1,0.36,1) forwards" : "logoShrink 0.6s cubic-bezier(0.22,1,0.36,1) forwards",
            filter: "drop-shadow(0 0 50px rgba(139,92,246,0.7)) drop-shadow(0 0 100px rgba(124,58,237,0.4))",
          }}
        >
          <img src={LOGO_URL} alt="Shopper" style={{ width: "380px", maxWidth: "88vw", objectFit: "contain" }} />
        </div>

        {/* محتوى ما بعد الانيميشن */}
        {phase === "content" && (
          <div
            className="flex flex-col items-center gap-6 w-full"
            style={{ animation: "fadeSlideUp 0.7s cubic-bezier(0.22,1,0.36,1) forwards", opacity: 0 }}
          >
            {/* رسالة الترحيب */}
            <div className="space-y-2">
              <h1 className="font-black text-3xl leading-tight" style={{ color: "#111827" }}>
                أهلاً{" "}
                <span
                  style={{
                  color: "#7c3aed",
                  }}
                >
                  {userName}
                </span>
                {" "}👋
              </h1>
              <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
                اطلب من أفضل المطاعم والمتاجر
              </p>
            </div>

            {/* الأزرار */}
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={onStart}
                className="w-full h-14 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                style={{
                  background: "#7c3aed",
                  boxShadow: "0 8px 32px rgba(124,58,237,0.35)",
                }}
              >
                🛒 ابدأ طلبي الآن
              </button>

            </div>

            <p style={{ color: "rgba(124,58,237,0.4)", fontSize: "0.75rem" }}>
              shopper.to
            </p>
          </div>
        )}

        {/* نقاط تحميل أثناء الانيميشن */}
        {phase === "logo" && (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#7c3aed",
                  animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes logoZoom {
          0% { opacity: 0; transform: scale(0.5) translateY(40px); }
          20% { opacity: 1; }
          80% { transform: scale(1.05) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes logoShrink {
          from { transform: scale(1) translateY(0); }
          to { transform: scale(0.7) translateY(-60px); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.4); }
        }

      `}</style>
    </div>
  );
}

export default function Customer() {
  const [phoneUser, setPhoneUser] = useState<{ id: number; phone: string; name: string | null; role: string; pinnedAddressText?: string | null; pinnedAddressLat?: string | null; pinnedAddressLng?: string | null } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [phoneAuthLoading, setPhoneAuthLoading] = useState(true);

  const phoneMe = trpc.phoneAuth.me.useQuery(undefined, { refetchOnWindowFocus: false });
  const saveCityStreetMutation = trpc.phoneAuth.saveCityStreet.useMutation();

  // Fetch cities & streets for auto-selection
  const { data: allCitiesData } = trpc.cities.listActive.useQuery();
  const [autoStreetCityId, setAutoStreetCityId] = useState<number | null>(null);
  const { data: autoStreetsData } = trpc.cities.getStreets.useQuery(
    { cityId: autoStreetCityId ?? 0 },
    { enabled: !!autoStreetCityId }
  );

  useEffect(() => {
    if (!phoneMe.isLoading) {
      if (phoneMe.data) {
        const userData = phoneMe.data as any;
        // لا تُعِد تعيين phoneUser إذا كان المستخدم قد وافق على الشروط بالفعل في الـ state الحالية
        // هذا يمنع إعادة ظهور شاشة الشروط عند إعادة جلب البيانات
        setPhoneUser(prev => {
          if (prev && (prev as any).termsAccepted) {
            // حافظ على termsAccepted=true حتى لو جاءت البيانات الجديدة بقيمة false مؤقتاً
            return { ...userData, termsAccepted: true };
          }
          return userData;
        });
        setCitySelectionStep("done");
        if (userData.pinnedAddressText && userData.pinnedAddressText.trim()) {
          setAddressForm({
            text: userData.pinnedAddressText,
            lat: userData.pinnedAddressLat ?? "",
            lng: userData.pinnedAddressLng ?? "",
          });
        }
        // Auto-set city from saved cityId
        if (userData.cityId && allCitiesData) {
          const savedCity = (allCitiesData as any[]).find((c: any) => c.id === userData.cityId);
          if (savedCity) {
            setSelectedFromCity({ id: savedCity.id, name: savedCity.name });
            if (savedCity.deliveryFee && savedCity.deliveryFee !== "0") setCoverageDeliveryFee(savedCity.deliveryFee);
            setAutoStreetCityId(savedCity.id);
          }
        }
      }
      setPhoneAuthLoading(false);
    }
  }, [phoneMe.isLoading, phoneMe.data, allCitiesData]);

  // Auto-set street once streets are loaded
  useEffect(() => {
    if (!autoStreetsData || !phoneMe.data) return;
    const userData = phoneMe.data as any;
    if (userData.streetId && !selectedStreet) {
      const savedStreet = (autoStreetsData as any[]).find((s: any) => s.id === userData.streetId);
      if (savedStreet) {
        setSelectedStreet({ id: savedStreet.id, name: savedStreet.name });
      }
    }
  }, [autoStreetsData, phoneMe.data]);

  const acceptTermsMutation = trpc.government.acceptTerms.useMutation({
    onSuccess: () => {
      const updatedUser = { ...(phoneUser as any), termsAccepted: true };
      setPhoneUser(updatedUser as any);
      // إعادة جلب بيانات المستخدم لتحديث الـ cache بالقيمة الصحيحة
      phoneMe.refetch();
    }
  });
  const logoutMutation = trpc.phoneAuth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("phone_session_token");
      setPhoneUser(null);
    }
  });

  // Welcome screen state (shown once after login)
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  // Location permission prompt state
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  // City, street & neighborhood selection
  const [selectedFromCity, setSelectedFromCity] = useState<{ id: number; name: string } | null>(null);
  const [selectedStreet, setSelectedStreet] = useState<{ id: number; name: string } | null>(null);
  const [selectedToNeighborhood, setSelectedToNeighborhood] = useState<{ id: number; name: string; cityId: number } | null>(null);
  const [citySelectionStep, setCitySelectionStep] = useState<"from" | "street" | "location" | "done">("done");
  // Location picked on map for delivery
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [coverageDeliveryFee, setCoverageDeliveryFee] = useState<string>("0");

  const [activeTab, setActiveTab] = useState<"home" | "orders" | "explore" | "shopper" | "profile">("home");
  const [showShopperView, setShowShopperView] = useState(false);
  const [view, setView] = useState<"restaurants" | "menu" | "cart" | "track" | "google-order" | "covered-stores">("restaurants");
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [trackOrderId, setTrackOrderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addressForm, setAddressForm] = useState({ text: "", lat: "", lng: "" });
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [cartSource, setCartSource] = useState<"menu" | "streets">("menu"); // menu = skip steps, streets = show steps
  const [selectedGooglePlace, setSelectedGooglePlace] = useState<any>(null); // Google Maps place for ordering

  // Terms acceptance checkboxes state
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);

  if (phoneAuthLoading) return (
    <div className="min-h-screen flex items-center justify-center customer-bg customer-theme">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!phoneUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 customer-bg customer-theme p-6" dir="rtl">
        <div className="flex items-center justify-center">
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/115452271/NK9L9naBDDKkTQDnwgY78j/shopper-logo-transparent-final_911dcdb1.png" alt="Shopper" style={{ width: '240px', objectFit: 'contain', filter: 'drop-shadow(0 4px 20px rgba(124,58,237,0.4))' }} />
        </div>
        <div className="text-center">
          <p className="text-muted-foreground text-sm">سجّل دخولك برقم جوالك لتتمكن من الطلب</p>
        </div>
        <Button size="lg" className="bg-primary text-white rounded-2xl px-10 h-12 font-bold" onClick={() => setShowLoginModal(true)}>
          <Phone className="w-5 h-5 ml-2" />
          تسجيل الدخول برقم الجوال
        </Button>
        <PhoneLoginModal
          open={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={(u: any) => {
            setPhoneUser(u);
            setShowLoginModal(false);
            // Always skip city selection - address is set once during registration
            setCitySelectionStep("done");
            if (u.pinnedAddressText && u.pinnedAddressText.trim()) {
              setAddressForm({
                text: u.pinnedAddressText,
                lat: u.pinnedAddressLat ?? "",
                lng: u.pinnedAddressLng ?? "",
              });
            }
            // Check if first time login (no pinned address)
            const isFirstLogin = !u.pinnedAddressText || !u.pinnedAddressText.trim();
            if (isFirstLogin) {
              setShowLocationPrompt(true);
            } else {
              setShowWelcomeScreen(true);
            }
          }}
          role="customer"
          title="دخول العملاء"
        />
      </div>
    );
  }

  // Show location permission prompt (first time only)
  if (showLocationPrompt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center customer-bg customer-theme p-6" dir="rtl">
        <div className="w-full max-w-sm">
          {/* Animated location icon */}
          <div className="relative flex items-center justify-center mb-8">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <MapPin className="w-10 h-10 text-primary" />
              </div>
            </div>
            {/* Ripple rings */}
            <div className="absolute w-32 h-32 rounded-full border-2 border-primary/20 animate-ping" />
          </div>

          <div className="text-center mb-8 space-y-3">
            <h1 className="text-2xl font-black text-foreground">
              أهلاً {phoneUser?.name ? phoneUser.name.split(" ")[0] : "بك"} 🎉
            </h1>
            <p className="text-lg font-bold text-foreground">
              نريد توصيلك بدقة
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              اسمح لنا بالوصول إلى موقعك لنتمكن من تحديد أقرب المتاجر إليك وتوصيل طلبك بأسرع وقت ممكن 🚀
            </p>
          </div>

          {/* Benefits */}
          <div className="bg-card rounded-2xl p-4 mb-6 space-y-3 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground">توصيل أسرع لموقعك الحقيقي</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Locate className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground">لا حاجة لكتابة العنوان يدوياً</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground">تجربة طلب أسهل وأسرع</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                if (!navigator.geolocation) {
                  toast.error("متصفحك لا يدعم تحديد الموقع");
                  setShowLocationPrompt(false);
                  setShowWelcomeScreen(true);
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setLocationPermissionGranted(true);
                    setAddressForm(prev => ({
                      ...prev,
                      lat: String(pos.coords.latitude),
                      lng: String(pos.coords.longitude),
                    }));
                    toast.success("✅ تم تفعيل الموقع بنجاح!");
                    setShowLocationPrompt(false);
                    setShowWelcomeScreen(true);
                  },
                  () => {
                    toast("يمكنك تحديد موقعك لاحقاً من خريطة الطلب", { icon: "📍" });
                    setShowLocationPrompt(false);
                    setShowWelcomeScreen(true);
                  },
                  { enableHighAccuracy: true, timeout: 10000 }
                );
              }}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 active:scale-95">
              <MapPin className="w-5 h-5" />
              تفعيل الموقع الآن
            </button>
            <button
              onClick={() => {
                toast("يمكنك تفعيل الموقع لاحقاً من إعدادات الطلب", { icon: "💡" });
                setShowLocationPrompt(false);
                setShowWelcomeScreen(true);
              }}
              className="w-full py-3 rounded-2xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted/30 transition-colors">
              ليس الآن
            </button>
          </div>
          <p className="text-xs text-muted-foreground/50 text-center mt-4">
            موقعك محمي ولن يُشارك مع أي طرف ثالث
          </p>
        </div>
      </div>
    );
  }


  if (phoneUser && !(phoneUser as any).termsAccepted) {
    return (
      <div className="min-h-screen flex flex-col customer-theme" dir="rtl"
        style={{ background: 'linear-gradient(160deg, #f5f0ff 0%, #ede9fe 40%, #e0e7ff 100%)' }}>
        <div className="flex-1 overflow-y-auto pb-36">
          <div className="max-w-sm mx-auto px-5">

            {/* الهيدر: اللوغو والترحيب */}
            <div className="text-center pt-16 pb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', boxShadow: '0 8px 32px rgba(124,58,237,0.35)' }}>
                <img src={LOGO_URL} alt="Shopper" style={{ width: '52px', height: '52px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
              </div>
              <h1 className="text-3xl font-black mb-2" style={{ color: '#1e1b4b' }}>مرحباً بك!</h1>
              <p className="text-base" style={{ color: '#6b7280' }}>خطوة واحدة للبدء مع شوبر</p>
            </div>

            {/* بطاقة تأكيد الموافقة */}
            <div className="rounded-3xl p-6 mb-6"
              style={{ background: 'white', boxShadow: '0 4px 24px rgba(124,58,237,0.10)' }}>
              <h2 className="font-bold text-xl mb-6 text-right" style={{ color: '#1e1b4b' }}>تأكيد الموافقة</h2>

              {/* Checkbox 1: الشروط */}
              <label className="flex items-start gap-4 cursor-pointer mb-5" onClick={() => setTermsChecked(v => !v)}>
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  termsChecked
                    ? 'border-transparent'
                    : 'border-gray-300'
                }`}
                  style={termsChecked ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 2px 8px rgba(124,58,237,0.4)' } : {}}>
                  {termsChecked && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                  أوافق على{' '}
                  <a href="/government" target="_blank" className="font-semibold underline" style={{ color: '#7c3aed' }} onClick={e => e.stopPropagation()}>الشروط والأحكام</a>
                  {' '}وأقر بأنني قرأتها وفهمتها
                </span>
              </label>

              {/* فاصل */}
              <div className="border-t mb-5" style={{ borderColor: '#f3f4f6' }} />

              {/* Checkbox 2: الخصوصية */}
              <label className="flex items-start gap-4 cursor-pointer" onClick={() => setPrivacyChecked(v => !v)}>
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  privacyChecked
                    ? 'border-transparent'
                    : 'border-gray-300'
                }`}
                  style={privacyChecked ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 2px 8px rgba(124,58,237,0.4)' } : {}}>
                  {privacyChecked && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                  أوافق على{' '}
                  <a href="/privacy" target="_blank" className="font-semibold underline" style={{ color: '#7c3aed' }} onClick={e => e.stopPropagation()}>سياسة الخصوصية</a>
                  {' '}وأقر بأنني اطلعت عليها
                </span>
              </label>
            </div>

          </div>
        </div>

        {/* زر التوقيع الثابت */}
        <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
          style={{ background: 'linear-gradient(to top, rgba(245,240,255,1) 70%, rgba(245,240,255,0))' }}>
          <div className="max-w-sm mx-auto">
            {(!termsChecked || !privacyChecked) && (
              <p className="text-xs text-center mb-3 font-medium" style={{ color: '#9ca3af' }}>
                يرجى الموافقة على الشروط وسياسة الخصوصية للمتابعة
              </p>
            )}
            <button
              className="w-full h-14 rounded-2xl font-bold text-base text-white transition-all"
              style={{
                background: termsChecked && privacyChecked
                  ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
                  : '#d1d5db',
                boxShadow: termsChecked && privacyChecked ? '0 8px 24px rgba(124,58,237,0.4)' : 'none',
                cursor: termsChecked && privacyChecked ? 'pointer' : 'not-allowed',
              }}
              onClick={() => {
                if (!termsChecked || !privacyChecked) {
                  toast.error('يجب الموافقة على الشروط وسياسة الخصوصية أولاً');
                  return;
                }
                acceptTermsMutation.mutate({ userId: phoneUser.id });
              }}
              disabled={acceptTermsMutation.isPending || !termsChecked || !privacyChecked}>
              {acceptTermsMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الحفظ...
                </span>
              ) : 'أوافق وأبدأ الاستخدام'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome screen after first login
  if (showWelcomeScreen) {
    return (
      <WelcomeScreen
        userName={phoneUser?.name ? phoneUser.name.split(" ")[0] : "بك"}
        onStart={() => { setShowWelcomeScreen(false); }}
        onBrowse={() => { setShowWelcomeScreen(false); setCitySelectionStep("done"); }}
      />
    );
  }

  // Show city/location selection screen if not done
  if (citySelectionStep !== "done") {
    return (
      <CitySelectionScreen
        step={citySelectionStep as "from" | "street" | "location"}
        selectedFromCity={selectedFromCity}
        selectedStreet={selectedStreet}
        onSelectFromCity={(city) => {
          setSelectedFromCity({ id: city.id, name: city.name });
          // Set delivery fee from city data immediately
          if (city.deliveryFee && city.deliveryFee !== "0") setCoverageDeliveryFee(city.deliveryFee);
          setCitySelectionStep("street");
          // Save city selection to profile
          if (phoneUser) saveCityStreetMutation.mutate({ cityId: city.id, streetId: null });
        }}
        onSelectStreet={(street) => {
          setSelectedStreet(street);
          // After street selection, go directly to restaurants view (skip location step)
          setCitySelectionStep("done");
          // Save city+street selection to profile
          if (phoneUser && selectedFromCity) saveCityStreetMutation.mutate({ cityId: selectedFromCity.id, streetId: street.id });
        }}
        onSelectDeliveryLocation={(loc) => {
          setDeliveryLocation(loc);
          // pre-fill address form
          setAddressForm({ text: loc.address, lat: String(loc.lat), lng: String(loc.lng) });
          if (loc.deliveryFee) setCoverageDeliveryFee(loc.deliveryFee);
          setCitySelectionStep("done");
        }}
        onBack={() => {
          if (citySelectionStep === "street") setCitySelectionStep("from");
          else if (citySelectionStep === "location") setCitySelectionStep("street");
          else setCitySelectionStep("done"); // back to restaurants from "from" step
        }}
        onSkip={() => {
          // Skip city/location selection and browse all restaurants
          setCitySelectionStep("done");
        }}
        activeTab={(activeTab === "explore" || activeTab === "shopper") ? "home" : activeTab as "home" | "orders" | "profile"}
        onTabChange={(tab) => {
          setCitySelectionStep("done");
          setActiveTab(tab as any);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen customer-bg customer-theme pb-24" dir="rtl">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-40 customer-header">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {activeTab === "home" && view !== "restaurants" && (
              <button
                onClick={() => {
                  if (view === "menu") setView("restaurants");
                  else if (view === "cart") setView("menu");
                  else if (view === "google-order") { setSelectedGooglePlace(null); setView("restaurants"); }
                  else if (view === "track") setView("restaurants");
                  else if (view === "covered-stores") setView("restaurants");
                }}
                className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-foreground leading-tight">
                  {activeTab === "home"
                    ? (view === "restaurants" ? "المتاجر" : view === "menu" ? selectedRestaurant?.name : view === "cart" ? "سلة الطلبات" : view === "google-order" ? (selectedGooglePlace?.name ?? "طلب خارجي") : view === "covered-stores" ? "يوصل لك الآن" : "تتبع الطلب")
                    : activeTab === "orders" ? "طلباتي"
                    : "ملفي الشخصي"}
                </span>
                {activeTab === "home" && view === "restaurants" && (selectedFromCity || selectedStreet) && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span>{selectedFromCity?.name}{selectedStreet ? ` · ${selectedStreet.name}` : ""}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cart button - only on home tab */}
            {activeTab === "home" && (view === "restaurants" || view === "menu") && cart.length > 0 && (
              <button
                onClick={() => { setCartSource("menu"); setView("cart"); }}
                className="flex items-center gap-2 bg-primary text-white rounded-2xl px-4 py-2 text-sm font-bold"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">{cart.reduce((s, i) => s + Number(i.price) * i.quantity, 0)} ريال</span>
              </button>
            )}

          </div>
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <main className="container py-6">
        {/* HOME TAB */}
        {activeTab === "home" && (
          <>
            {view === "restaurants" && (
              <RestaurantsView
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelect={(r: any) => { setSelectedRestaurant(r); setView("menu"); }}
                onTrack={(id: number) => { setTrackOrderId(id); setView("track"); }}
                userId={phoneUser?.id}
                onStreets={() => { setCartSource("streets"); setView("cart"); }}
                selectedStreet={selectedStreet}
                selectedFromCity={selectedFromCity}
                onChangeCityStreet={() => {
                  setSelectedFromCity(null);
                  setSelectedStreet(null);
                  setCitySelectionStep("from");
                }}
                onOrderFromGooglePlace={(place: any) => {
                  setSelectedGooglePlace(place);
                  setView("google-order");
                }}
                onCoveredStores={() => setView("covered-stores")}
                onShopperClick={() => setShowShopperView(true)}
              />
            )}
            {view === "menu" && selectedRestaurant && (
              <MenuView
                restaurant={selectedRestaurant}
                cart={cart}
                setCart={setCart}
                onCheckout={() => { setCartSource("menu"); setView("cart"); }}
              />
            )}
            {view === "cart" && (
              <CartViewWrapper
                cart={cart}
                setCart={setCart}
                restaurant={selectedRestaurant}
                addressForm={addressForm}
                setAddressForm={setAddressForm}
                showAddressDialog={showAddressDialog}
                setShowAddressDialog={setShowAddressDialog}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                userId={phoneUser?.id}
                phoneUser={phoneUser}
                coverageDeliveryFee={coverageDeliveryFee}
                cartSource={cartSource}
                deliveryLocation={deliveryLocation}
                parentCity={selectedFromCity}
                parentStreet={selectedStreet}
                onSetDeliveryFee={(fee: string) => setCoverageDeliveryFee(fee)}
                onRestaurantSelected={(restaurant: any, city: any, street: any, loc: any) => {
                  // User picked a restaurant from the streets stepper
                  setSelectedRestaurant(restaurant);
                  setCart([]);
                  setView("menu");
                  setCartSource("streets");
                  if (loc && !addressForm.text) {
                    setAddressForm({ text: loc.address, lat: String(loc.lat), lng: String(loc.lng) });
                  }
                }}
                onSuccess={(orderId: number) => {
                  setCart([]);
                  setCartSource("menu"); // reset so next cart open goes to CartView directly
                  setTrackOrderId(orderId);
                  setView("track");
                }}
              />
            )}
            {view === "track" && trackOrderId && (
              <TrackView orderId={trackOrderId} />
            )}
            {view === "covered-stores" && (
              <CoveredStoresView
                onSelect={(r: any) => { setSelectedRestaurant(r); setView("menu"); }}
                onOrderFromGooglePlace={(place: any) => { setSelectedGooglePlace(place); setView("google-order"); }}
                selectedStreet={selectedStreet}
                selectedFromCity={selectedFromCity}
              />
            )}
            {view === "google-order" && selectedGooglePlace && (
              <GooglePlaceOrderView
                place={selectedGooglePlace}
                addressForm={addressForm}
                setAddressForm={setAddressForm}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                phoneUser={phoneUser}
                coverageDeliveryFee={coverageDeliveryFee}
                selectedFromCity={selectedFromCity}
                selectedStreet={selectedStreet}
                onSuccess={(orderId: number) => {
                  setSelectedGooglePlace(null);
                  setTrackOrderId(orderId);
                  setView("track");
                }}
                onBack={() => { setSelectedGooglePlace(null); setView("restaurants"); }}
              />
            )}
          </>
        )}

        {/* SHOPPER OVERLAY */}
        {showShopperView && (
          <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "#f8f5ff" }}>
            <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3" style={{ background: "#f8f5ff", borderBottom: "1px solid rgba(124,58,237,0.1)" }}>
              <button
                onClick={() => setShowShopperView(false)}
                className="flex items-center gap-1.5 text-sm font-bold"
                style={{ color: "#7c3aed" }}
              >
                <ChevronRight className="w-4 h-4" />
                رجوع
              </button>
            </div>
            <ShopperCustomerView phoneUser={phoneUser} />
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <MyOrdersView
            onTrack={(id: number) => {
              setTrackOrderId(id);
              setView("track");
              setActiveTab("home");
            }}
          />
        )}

        {/* EXPLORE TAB */}
        {activeTab === "explore" && (
          <ExploreTab
            cityName={selectedFromCity?.name}
            onOrderFromPlace={(place) => {
              setSelectedGooglePlace(place);
              setActiveTab("home");
              setView("google-order");
            }}
          />
        )}

        {/* SHOPPER CHAT TAB */}
        {activeTab === "shopper" && (
          <div className="flex-1 overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>
            <ShopperChat />
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <ProfileView
            phoneUser={phoneUser}
            onLogout={() => logoutMutation.mutate()}
            onUpdate={(updated: any) => setPhoneUser({ ...phoneUser!, ...updated })}
          />
        )}
      </main>

      {/* ===== BOTTOM NAV ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom customer-nav">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {/* الرئيسية */}
          <button
            onClick={() => { setActiveTab("home"); setView("restaurants"); }}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
              activeTab === "home" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className={`w-5 h-5 ${activeTab === "home" ? "fill-primary" : ""}`} />
            <span className="text-xs font-semibold">المتاجر</span>
          </button>

          {/* طلباتي */}
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
              activeTab === "orders" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList className={`w-5 h-5 ${activeTab === "orders" ? "fill-primary" : ""}`} />
            <span className="text-xs font-semibold">طلباتي</span>
          </button>

          {/* استكشف */}
          <button
            onClick={() => setActiveTab("explore")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
              activeTab === "explore" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className={`w-5 h-5 ${activeTab === "explore" ? "fill-primary" : ""}`} />
            <span className="text-xs font-semibold">استكشف</span>
          </button>

          {/* الشوبرز الذكي */}
          <button
            onClick={() => setActiveTab("shopper")}
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-all relative ${
              activeTab === "shopper" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-lg leading-none">🛍️</span>
            <span className="text-xs font-semibold">الشوبرز</span>
            {activeTab !== "shopper" && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-500" />
            )}
          </button>

          {/* ملفي */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
              activeTab === "profile" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCircle className={`w-5 h-5 ${activeTab === "profile" ? "fill-primary" : ""}`} />
            <span className="text-xs font-semibold">ملفي</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// ===== CITY SELECTION SCREEN =====
function CitySelectionScreen({ step, selectedFromCity, selectedStreet, onSelectFromCity, onSelectStreet, onSelectDeliveryLocation, onBack, onSkip, onTabChange, activeTab }: {
  step: "from" | "street" | "location";
  selectedFromCity: { id: number; name: string } | null;
  selectedStreet: { id: number; name: string } | null;
  onSelectFromCity: (city: { id: number; name: string; deliveryFee?: string }) => void;
  onSelectStreet: (street: { id: number; name: string }) => void;
  onSelectDeliveryLocation: (loc: { lat: number; lng: number; address: string; deliveryFee?: string }) => void;
  onBack: () => void;
  onTabChange?: (tab: "home" | "orders" | "profile") => void;
  activeTab?: "home" | "orders" | "profile";
  onSkip?: () => void;
}) {
  const { data: cities, isLoading: citiesLoading } = trpc.cities.listActive.useQuery();
  const { data: streetsData, isLoading: streetsLoading } = trpc.cities.getStreets.useQuery(
    { cityId: selectedFromCity?.id ?? 0 },
    { enabled: step === "street" && !!selectedFromCity }
  );
  // Active driver counts
  const { data: cityDriverCounts } = trpc.drivers.activeCountByCity.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );
  const { data: streetDriverCounts } = trpc.drivers.activeCountByStreet.useQuery(
    { cityId: selectedFromCity?.id ?? 0 },
    { enabled: step === "street" && !!selectedFromCity, refetchInterval: 30000 }
  );
  const cityCountMap = Object.fromEntries((cityDriverCounts ?? []).map(r => [r.cityId, r.count]));
  const streetCountMap = Object.fromEntries((streetDriverCounts ?? []).map(r => [r.streetId, r.count]));
  // Visitor counts (from storePresence)
  const { data: cityVisitorCounts } = trpc.restaurants.visitorsByCity.useQuery(undefined, { refetchInterval: 30000 });
  const { data: streetVisitorCounts } = trpc.restaurants.visitorsByStreet.useQuery(
    { cityId: selectedFromCity?.id ?? 0 },
    { enabled: step === "street" && !!selectedFromCity, refetchInterval: 30000 }
  );
  const cityVisitorMap = Object.fromEntries((cityVisitorCounts ?? []).map(r => [r.cityId, r.count]));
  const streetVisitorMap = Object.fromEntries((streetVisitorCounts ?? []).map(r => [r.streetId, r.count]));
  // Drivers in restaurants per street
  const { data: streetDriversInRest } = trpc.drivers.bulkDriversInRestaurantByStreet.useQuery(undefined, { refetchInterval: 30000 });
  const streetDriversInRestMap = Object.fromEntries((streetDriversInRest ?? []).map(r => [r.streetId, r.count]));
  // For location step: map pin state and coverage check
  const [mapPin, setMapPin] = useState<{ lat: number; lng: number } | null>(null);
  const [mapAddress, setMapAddress] = useState("");
  const [checkingCoverage, setCheckingCoverage] = useState(false);
  const [coverageResult, setCoverageResult] = useState<{ covered: boolean; city: { id: number; name: string; deliveryFee: string } | null } | null>(null);
  const checkCoverage = trpc.cities.checkCoverage.useQuery(
    { lat: mapPin?.lat ?? 0, lng: mapPin?.lng ?? 0 },
    { enabled: !!mapPin, refetchOnWindowFocus: false }
  );

  return (
    <div className="min-h-screen customer-bg customer-theme flex flex-col pb-20" dir="rtl">
      {/* Header */}
      <div className="customer-header px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/115452271/NK9L9naBDDKkTQDnwgY78j/shopper-logo-transparent-final_911dcdb1.png" alt="Shopper" style={{ height: '32px', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(124,58,237,0.45))' }} />
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            رجوع
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6">
        {/* Step indicator - hidden, moved to bottom bar */}

        {step === "from" && (
          <>
            <h2 className="text-2xl font-black text-foreground mb-2 text-center">من وين حاب تتسوق؟</h2>
            <p className="text-muted-foreground text-sm mb-8 text-center">اختر مدينة المتاجر</p>
            {citiesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /><span>جاري التحميل...</span>
              </div>
            ) : (
              <div className="w-full max-w-sm space-y-3">
                {cities?.map(city => {
                  const activeCount = cityCountMap[city.id] ?? 0;
                  return (
                    <button
                      key={city.id}
                      onClick={() => onSelectFromCity({ id: city.id, name: city.name, deliveryFee: String(city.deliveryFee ?? "0") })}
                      className="w-full customer-card border-2 hover:border-primary/60 hover:bg-primary/5 rounded-2xl p-4 flex items-center gap-4 transition-all group"
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex flex-col items-start flex-1">
                        <span className="font-bold text-foreground text-lg">{city.name}</span>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={`flex items-center gap-1 text-xs ${
                            (cityVisitorMap[city.id] ?? 0) > 0 ? 'text-primary' : 'text-muted-foreground/40'
                          }`}>
                            <Users className="w-3 h-3" />
                            <span className="font-bold">{cityVisitorMap[city.id] ?? 0}</span> زائر
                          </span>
                          <span className="text-gray-300 opacity-60">|</span>
                          <span className={`flex items-center gap-1 text-xs ${
                            activeCount > 0 ? 'text-primary' : 'text-muted-foreground/40'
                          }`}>
                            {activeCount > 0
                              ? <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                              : <Truck className="w-3 h-3" />}
                            <span className="font-bold">{activeCount}</span> مندوب
                          </span>
                        </div>
                        {Number(city.deliveryFee ?? 0) > 0 && (
                          <span className="text-xs font-bold text-primary mt-1">
                            🚚 رسوم التوصيل: {Number(city.deliveryFee).toFixed(2)} ﷼
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground rotate-180" />
                    </button>
                  );
                })}
                {(!cities || cities.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">لا توجد مدن متاحة حالياً</p>
                )}
              </div>
            )}
            {/* Skip button */}
            {onSkip && (
              <div className="mt-6 text-center">
                <button
                  onClick={onSkip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                >
                  تخطي — تصفح جميع المتاجر
                </button>
              </div>
            )}
          </>
        )}

        {step === "street" && (
          <>
            <h2 className="text-2xl font-black text-foreground mb-2 text-center">اختر الشارع</h2>
            <p className="text-muted-foreground text-sm mb-8 text-center">شوارع {selectedFromCity?.name}</p>
            {streetsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /><span>جاري التحميل...</span>
              </div>
            ) : (
              <div className="w-full max-w-sm space-y-3">
                {streetsData?.map(street => {
                  const activeCount = streetCountMap[street.id] ?? 0;
                  return (
                    <button
                      key={street.id}
                      onClick={() => onSelectStreet({ id: street.id, name: street.name })}
                      className="w-full customer-card border-2 hover:border-primary/60 hover:bg-primary/5 rounded-2xl p-4 flex items-center gap-4 transition-all group"
                    >
                      <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex flex-col items-center justify-center group-hover:from-primary/20 group-hover:to-primary/30 transition-all">
                        <span className="text-xl">🏪</span>
                      </div>
                      <div className="flex flex-col items-start flex-1">
                        <span className="font-bold text-foreground text-base">{street.name}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {Number(street.restaurantCount) > 0
                            ? `${street.restaurantCount} متجر / مطعم`
                            : "لا توجد متاجر بعد"}
                        </span>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={`flex items-center gap-1 text-xs ${
                            (streetVisitorMap[street.id] ?? 0) > 0 ? 'text-primary' : 'text-muted-foreground/40'
                          }`}>
                            <Users className="w-3 h-3" />
                            <span className="font-bold">{streetVisitorMap[street.id] ?? 0}</span> زائر
                          </span>
                          <span className="text-gray-300 opacity-60">|</span>
                          <span className={`flex items-center gap-1 text-xs ${
                            (streetDriversInRestMap[street.id] ?? 0) > 0 ? 'text-primary' : 'text-muted-foreground/40'
                          }`}>
                            {(streetDriversInRestMap[street.id] ?? 0) > 0
                              ? <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                              : <Truck className="w-3 h-3" />}
                            <span className="font-bold">{streetDriversInRestMap[street.id] ?? 0}</span> مندوب
                          </span>
                          {activeCount > 0 && (
                            <>
                              <span className="text-gray-300 opacity-60">|</span>
                              <span className="flex items-center gap-1 text-xs text-primary">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse inline-block" />
                                <span className="font-bold">{activeCount}</span> متاح
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground rotate-180" />
                    </button>
                  );
                })}
                {(!streetsData || streetsData.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">لا توجد شوارع متاحة في هذه المدينة</p>
                )}
              </div>
            )}
          </>
        )}

        {step === "location" && (
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-black text-foreground mb-1 text-center">حدد موقع التوصيل</h2>
            <p className="text-muted-foreground text-sm mb-3 text-center">اضغط على الخريطة أو استخدم التحديد التلقائي</p>

            {/* GPS Button */}
            <button
              id="gps-btn"
              className="w-full mb-3 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all text-primary font-bold text-sm"
              onClick={() => {
                const btn = document.getElementById("gps-btn");
                if (btn) btn.textContent = "جاري تحديد موقعك...";
                if (!navigator.geolocation) {
                  alert("متصفحك لا يدعم تحديد الموقع");
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    setMapPin({ lat, lng });
                    setCoverageResult(null);
                    const google = (window as any).google;
                    // Helper: reverse geocode via Manus proxy
                    const reverseViaProxy = async () => {
                      try {
                        const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
                        const BASE = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
                        const r = await fetch(`${BASE}/v1/maps/proxy/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}&language=ar`);
                        const d = await r.json();
                        return d.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                      } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
                    };
                    if (google) {
                      const geocoder = new (window as any).google.maps.Geocoder();
                      geocoder.geocode({ location: { lat, lng } }, async (results: any, status: any) => {
                        if (status === "OK" && results[0]) setMapAddress(results[0].formatted_address);
                        else setMapAddress(await reverseViaProxy());
                      });
                      if ((window as any).__customerMap) {
                        (window as any).__customerMap.setCenter({ lat, lng });
                        (window as any).__customerMap.setZoom(16);
                        if ((window as any).__customerMarker) (window as any).__customerMarker.setMap(null);
                        (window as any).__customerMarker = new (window as any).google.maps.Marker({
                          position: { lat, lng }, map: (window as any).__customerMap,
                          title: "موقعك الحالي",
                          icon: { url: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png" },
                        });
                      }
                    } else {
                      // Google not loaded yet — use proxy directly
                      setMapAddress(await reverseViaProxy());
                    }
                    if (btn) btn.innerHTML = '✅ تم تحديد موقعك تلقائياً';
                  },
                  (err) => {
                    if (btn) btn.innerHTML = '📍 تحديد موقعي تلقائياً';
                    alert("تعذّر تحديد الموقع. يرجى السماح بالوصول إلى موقعك أو حدده يدوياً على الخريطة");
                  },
                  { enableHighAccuracy: true, timeout: 10000 }
                );
              }}
            >
              <span>📍</span>
              <span>تحديد موقعي تلقائياً</span>
            </button>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 mb-4" style={{ height: 280 }}>
              <MapView
                onMapReady={(map: any) => {
                  const google = (window as any).google;
                  if (!google) return;
                  (window as any).__customerMap = map;
                  // Default center: Riyadh
                  const defaultCenter = { lat: 24.7136, lng: 46.6753 };
                  map.setCenter(defaultCenter);
                  map.setZoom(12);
                  let marker: any = null;
                  (window as any).__customerMarker = null;
                  const geocoder = new (window as any).google.maps.Geocoder();
                  map.addListener("click", (e: any) => {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    if (marker) marker.setMap(null);
                    marker = new (window as any).google.maps.Marker({
                      position: { lat, lng },
                      map,
                      title: "موقع التوصيل",
                      icon: { url: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png" },
                    });
                    (window as any).__customerMarker = marker;
                    setMapPin({ lat, lng });
                    setCoverageResult(null);
                    // Reverse geocode (with Manus proxy fallback)
                    geocoder.geocode({ location: { lat, lng } }, async (results: any, status: any) => {
                      if (status === "OK" && results[0]) {
                        setMapAddress(results[0].formatted_address);
                      } else {
                        try {
                          const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
                          const BASE = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
                          const r = await fetch(`${BASE}/v1/maps/proxy/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}&language=ar`);
                          const d = await r.json();
                          setMapAddress(d.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                        } catch { setMapAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); }
                      }
                    });
                  });
                  // Try to get user location on load
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      const userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                      map.setCenter(userLoc);
                      map.setZoom(15);
                    });
                  }
                }}
              />
            </div>

            {/* Address display */}
            {mapPin && (
              <div className="mb-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
                <p className="text-xs text-muted-foreground mb-1">العنوان المحدد</p>
                <p className="text-sm text-foreground font-medium">{mapAddress || `${mapPin.lat.toFixed(5)}, ${mapPin.lng.toFixed(5)}`}</p>
              </div>
            )}

            {/* Coverage result */}
            {mapPin && checkCoverage.data && (
              <div className={`mb-4 p-3 rounded-xl border ${
                checkCoverage.data.covered
                  ? "border-primary/40 bg-primary/5"
                  : "border-red-500/40 bg-red-50"
              }`}>
                {checkCoverage.data.covered ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-bold text-primary">منطقة التوصيل متاحة ✅</p>
                        <p className="text-xs text-primary/70">{checkCoverage.data.city?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-primary/60">رسوم التوصيل</p>
                      <p className="text-sm font-black text-primary">
                        {Number(checkCoverage.data.city?.deliveryFee ?? 0) > 0
                          ? `${Number(checkCoverage.data.city?.deliveryFee).toFixed(2)} ﷼`
                          : "مجاني"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <X className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm font-bold text-red-700">عذراً، هذه المنطقة غير مغطّاة حالياً</p>
                      <p className="text-xs text-red-500">سنصل إليك قريباً ✨ جرّب موقعاً آخر</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mapPin && checkCoverage.isLoading && (
              <div className="mb-4 flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التحقق من التغطية...</span>
              </div>
            )}

            <Button
              className="w-full bg-primary text-white rounded-2xl h-12 font-bold"
              disabled={!mapPin || !checkCoverage.data?.covered}
              onClick={() => {
                if (mapPin && checkCoverage.data?.covered) {
                  onSelectDeliveryLocation({
                    lat: mapPin.lat,
                    lng: mapPin.lng,
                    address: mapAddress || `${mapPin.lat.toFixed(5)}, ${mapPin.lng.toFixed(5)}`,
                    deliveryFee: checkCoverage.data.city?.deliveryFee ?? "0",
                  });
                }
              }}
            >
              {!mapPin ? "اضغط على الخريطة لتحديد الموقع" : checkCoverage.data?.covered ? "تأكيد موقع التوصيل →" : "اختر موقعاً آخر"}
            </Button>
          </div>
        )}
      </div>

      {/* ===== BOTTOM NAV (ثابت في كل الخطوات) ===== */}
      {onTabChange && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom customer-nav">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
            <button
              onClick={() => onTabChange("home")}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                activeTab === "home" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Home className={`w-5 h-5 ${activeTab === "home" ? "fill-primary" : ""}`} />
              <span className="text-xs font-semibold">المتاجر</span>
            </button>
            <button
              onClick={() => onTabChange("orders")}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                activeTab === "orders" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ClipboardList className={`w-5 h-5 ${activeTab === "orders" ? "fill-primary" : ""}`} />
              <span className="text-xs font-semibold">طلباتي</span>
            </button>
            <button
              onClick={() => onTabChange("profile")}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                activeTab === "profile" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCircle className={`w-5 h-5 ${activeTab === "profile" ? "fill-primary" : ""}`} />
              <span className="text-xs font-semibold">ملفي</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

// ===== COVERED STORES VIEW (full page) =====
function CoveredStoresView({ onSelect, onOrderFromGooglePlace, selectedStreet, selectedFromCity }: any) {
  const { data: activeGooglePlaces } = trpc.googlePlaces.listActive.useQuery(
    { streetId: selectedStreet?.id ?? 0 },
    { enabled: !!selectedStreet?.id }
  );
  const { data: restaurants } = trpc.restaurants.listActive.useQuery(
    selectedFromCity?.id
      ? { cityId: selectedFromCity.id, streetId: selectedStreet?.id }
      : undefined
  );
  const { data: presenceData } = trpc.restaurants.bulkPresence.useQuery(undefined, { refetchInterval: 30000 });
  const { data: driversData } = trpc.drivers.bulkDriversInRestaurant.useQuery(undefined, { refetchInterval: 30000 });
  const presenceMap = useMemo(() => {
    const map: Record<number, { visitors: number; activeOrders: number }> = {};
    if (presenceData) for (const p of presenceData as any[]) map[p.restaurantId] = { visitors: p.visitors, activeOrders: p.activeOrders };
    return map;
  }, [presenceData]);
  const driversMap = useMemo(() => {
    const map: Record<number, number> = {};
    if (driversData) for (const d of driversData as any[]) map[d.restaurantId] = d.count;
    return map;
  }, [driversData]);

  const totalCount = (restaurants?.length ?? 0) + (activeGooglePlaces?.length ?? 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Store className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-black text-foreground text-lg leading-tight">يوصل لك الآن</h2>
          <p className="text-xs text-muted-foreground">
            {selectedStreet ? `شارع ${selectedStreet.name}` : selectedFromCity ? selectedFromCity.name : 'جميع المناطق'}
            {' · '}{totalCount} متجر
          </p>
        </div>
      </div>

      {/* Grid */}
      {!restaurants && !activeGooglePlaces ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="customer-card">
              <div className="customer-skeleton h-36 w-full" />
              <div className="p-4 space-y-2">
                <div className="customer-skeleton h-5 w-2/3" />
                <div className="customer-skeleton h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UtensilsCrossedIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">لا توجد متاجر متاحة حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants?.map((r: any) => (
            <RestaurantCard key={r.id} restaurant={r} presence={presenceMap[r.id]} driversCount={driversMap[r.id] ?? 0} onClick={() => onSelect(r)} />
          ))}
          {activeGooglePlaces?.map((place: any) => (
            <ActiveGooglePlaceCard
              key={`gp-${place.id}`}
              place={place}
              onSelect={onOrderFromGooglePlace}
              presence={presenceMap[-place.id]}
              driversCount={driversMap[-place.id] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ===== RESTAURANTS VIEW =====
function CoveredAreasDialog({ open, onClose, restaurants }: { open: boolean; onClose: () => void; restaurants: any[] }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl customer-theme" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-foreground flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            المتاجر المتاحة للتوصيل
            <span className="text-sm font-normal text-muted-foreground mr-1">({restaurants.length})</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {restaurants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">لا توجد متاجر متاحة حالياً</p>
          ) : (
            restaurants.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:bg-primary/5 transition-colors">
                {r.imageUrl ? (
                  <img src={r.imageUrl} alt={r.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Store className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{r.name}</p>
                  {r.cuisine && <p className="text-xs text-muted-foreground truncate">{r.cuisine}</p>}
                  {r.cityName && <p className="text-xs text-primary/70 truncate">{r.cityName}{r.streetName ? ` · ${r.streetName}` : ''}</p>}
                </div>
                {r.isOpen !== false && (
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full shrink-0">مفتوح</span>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RestaurantsView({ searchQuery, setSearchQuery, onSelect, onTrack, userId, onStreets, selectedStreet, selectedFromCity, onChangeCityStreet, onOrderFromGooglePlace, onCoveredStores, onShopperClick }: any) {
  // Fetch active banners
  const { data: activeBanners } = trpc.banners.list.useQuery();
  const [currentBanner, setCurrentBanner] = useState(0);

  // Fetch restaurants header image from admin settings
  const { data: restaurantsHeaderData } = trpc.settings.getRestaurantsHeaderImage.useQuery(undefined, { refetchOnWindowFocus: false });

  // Auto-rotate banners
  useEffect(() => {
    if (!activeBanners || activeBanners.length <= 1) return;
    const t = setInterval(() => setCurrentBanner(p => (p + 1) % activeBanners.length), 4000);
    return () => clearInterval(t);
  }, [activeBanners]);

  // Fetch active Google Place restaurants for the selected street
  const { data: activeGooglePlaces } = trpc.googlePlaces.listActive.useQuery(
    { streetId: selectedStreet?.id ?? 0 },
    { enabled: !!selectedStreet?.id }
  );

  // Fetch restaurants filtered by city/street if available, otherwise fetch all
  const { data: restaurants } = trpc.restaurants.listActive.useQuery(
    selectedFromCity?.id
      ? { cityId: selectedFromCity.id, streetId: selectedStreet?.id }
      : undefined
  );

  // nearbyPlaces query disabled - admin must approve restaurants from dashboard
  const nearbyPlaces: any[] = [];

  const { data: myOrders } = trpc.orders.myOrders.useQuery();
  const { data: presenceData } = trpc.restaurants.bulkPresence.useQuery(undefined, { refetchInterval: 30000 });
  const { data: driversData } = trpc.drivers.bulkDriversInRestaurant.useQuery(undefined, { refetchInterval: 30000 });
  const presenceMap = useMemo(() => {
    const map: Record<number, { visitors: number; activeOrders: number }> = {};
    if (presenceData) {
      for (const p of presenceData as any[]) {
        map[p.restaurantId] = { visitors: p.visitors, activeOrders: p.activeOrders };
      }
    }
    return map;
  }, [presenceData]);
  const driversMap = useMemo(() => {
    const map: Record<number, number> = {};
    if (driversData) {
      for (const d of driversData as any[]) {
        map[d.restaurantId] = d.count;
      }
    }
    return map;
  }, [driversData]);

  // Registered restaurants names (to avoid duplicating in Google results)
  const registeredNames = useMemo(() => {
    if (!restaurants) return new Set<string>();
    return new Set((restaurants as any[]).map((r: any) => r.name.trim().toLowerCase()));
  }, [restaurants]);

  // Filter Google places that are NOT already registered
  const filteredNearby = useMemo(() => {
    if (!nearbyPlaces.length) return [];
    const q = searchQuery.toLowerCase().trim();
    return nearbyPlaces.filter((p: any) => {
      const notRegistered = !registeredNames.has(p.name.trim().toLowerCase());
      if (!q) return notRegistered;
      return notRegistered && (p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
    });
  }, [nearbyPlaces, registeredNames, searchQuery]);

  const filtered = useMemo(() => {
    if (!restaurants) return [];
    if (!searchQuery.trim()) return restaurants;
    const q = searchQuery.toLowerCase();
    return (restaurants as any[]).filter((r: any) =>
      r.name.toLowerCase().includes(q) || r.cuisine?.toLowerCase().includes(q)
    );
  }, [restaurants, searchQuery]);

  const activeOrder = myOrders?.find((o: any) =>
    !["delivered", "cancelled"].includes(o.status)
  );

  return (
    <div className="space-y-5">
      {/* === Header Image / Promotional Banner === */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height: '160px' }}>
        {/* صورة الهيدر من لوحة التحكم */}
        {restaurantsHeaderData?.url ? (
          <img src={restaurantsHeaderData.url} alt="هيدر المتاجر" className="w-full h-full object-cover" />
        ) : activeBanners && activeBanners.length > 0 ? (
          /* السلايدر إذا لم توجد صورة هيدر */
          <>
            {activeBanners.map((b: any, i: number) => (
              <div
                key={b.id}
                className="absolute inset-0 transition-opacity duration-700"
                style={{ opacity: i === currentBanner ? 1 : 0 }}
              >
                {b.imageUrl ? (
                  <img src={b.imageUrl} alt={b.title ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Store className="w-16 h-16 text-gray-300/60" />
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          /* التدرج الافتراضي */
          <div className="w-full h-full bg-gradient-to-br from-violet-900/30 via-indigo-900/20 to-primary/10 flex items-center justify-center">
            <Store className="w-16 h-16 text-primary/20" />
          </div>
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* عنوان البانر من السلايدر إذا لم توجد صورة هيدر */}
        {!restaurantsHeaderData?.url && activeBanners && activeBanners.length > 0 && (() => {
          const b = activeBanners[currentBanner];
          return (b?.title || b?.subtitle) ? (
            <div className="absolute bottom-4 right-4 text-right">
              {b.title && <p className="text-white font-black text-xl leading-tight drop-shadow-lg">{b.title}</p>}
              {b.subtitle && <p className="text-white/90 text-sm mt-0.5 drop-shadow">{b.subtitle}</p>}
            </div>
          ) : null;
        })()}
        {/* Dots indicator للسلايدر */}
        {!restaurantsHeaderData?.url && activeBanners && activeBanners.length > 1 && (
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {activeBanners.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setCurrentBanner(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === currentBanner ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* City/Street selector banner */}
      <div className="flex gap-2">
      <button
        onClick={onChangeCityStreet}
        className="flex-1 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/15 rounded-xl flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div className="text-right">
            {selectedFromCity || selectedStreet ? (
              <>
                <p className="text-sm font-bold text-foreground leading-tight">
                  {selectedFromCity?.name ?? ""}
                  {selectedStreet ? <span className="text-primary"> · {selectedStreet.name}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">اضغط لتغيير المدينة أو الشارع</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-foreground leading-tight">اختر مدينتك والشارع</p>
                <p className="text-xs text-muted-foreground mt-0.5">لعرض مطاعم منطقتك</p>
              </>
            )}
          </div>
        </div>
        <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {/* Covered areas button */}
      <button
        onClick={() => onCoveredStores?.()}
        className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors px-3 py-2 shrink-0 min-w-[72px]"
      >
        <span className="text-xl font-black text-primary leading-none">{((filtered as any[])?.length ?? 0) + ((activeGooglePlaces as any[])?.length ?? 0)}</span>
        <span className="text-[10px] text-muted-foreground leading-tight text-center">يوصل<br/>لك الآن</span>
      </button>
      </div>

      {/* Active order banner */}
      {activeOrder && (
        <div
          className="bg-primary/8 border border-primary/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-primary/12 transition-colors"
          onClick={() => onTrack(activeOrder.id)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">لديك طلب نشط</p>
              <p className="text-xs text-muted-foreground">رقم الطلب #{activeOrder.orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={activeOrder.status} />
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* زر شوبر */}
      {onShopperClick && (
        <button
          onClick={onShopperClick}
          className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #9333ea 60%, #a855f7 100%)",
            boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="text-right">
              <p className="font-black text-white text-sm leading-tight">شوبر — توصيل مشترياتك</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.8)" }}>احجز مع مندوب يمر بمنطقتك</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.25)", color: "white" }}>جديد</span>
            <ChevronLeft className="w-4 h-4 text-white/80" />
          </div>
        </button>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ابحث عن مطعم أو نوع طعام..."
          className="pr-10 rounded-2xl h-12 bg-gray-50 border-gray-100 text-foreground placeholder:text-muted-foreground focus:border-primary/50"
        />
      </div>

      {/* All Restaurants - Registered + Google Place combined */}
      <div>
        {/* Header - show total count */}
        <h2 className="text-lg font-black text-foreground mb-4">
          {selectedStreet ? (
            <span>متاجر شارع <span className="text-primary">{selectedStreet.name}</span></span>
          ) : (
            "المتاجر المتاحة"
          )}
          <span className="text-muted-foreground font-normal text-sm mr-2">
            ({(filtered?.length ?? 0) + (activeGooglePlaces?.length ?? 0)})
          </span>
        </h2>

        {/* Loading customer-skeleton */}
        {!restaurants && !activeGooglePlaces ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="customer-card">
                <div className="customer-skeleton h-36 w-full" />
                <div className="p-4 space-y-2">
                  <div className="customer-skeleton h-5 w-2/3" />
                  <div className="customer-skeleton h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (filtered?.length ?? 0) === 0 && (activeGooglePlaces?.length ?? 0) === 0 ? (
          /* Empty state - only show when BOTH lists are empty */
          <div className="text-center py-8 text-muted-foreground">
            <UtensilsCrossedIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{selectedStreet ? `لا توجد متاجر مسجلة في شارع ${selectedStreet.name}` : "لا توجد متاجر متاحة حالياً"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Registered restaurants */}
            {filtered?.map((r: any) => (
              <RestaurantCard key={r.id} restaurant={r} presence={presenceMap[r.id]} driversCount={driversMap[r.id] ?? 0} onClick={() => onSelect(r)} />
            ))}
            {/* Google Place restaurants */}
            {activeGooglePlaces?.map((place: any) => (
              <ActiveGooglePlaceCard
                key={`gp-${place.id}`}
                place={place}
                onSelect={onSelect}
                presence={presenceMap[-place.id]}
                driversCount={driversMap[-place.id] ?? 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Google Maps nearby places section - HIDDEN (admin must approve from dashboard) */}
    </div>
  );
}

// ===== GOOGLE PLACE CARD (from Maps) =====
function GooglePlaceCard({ place, onOrder }: { place: any; onOrder?: (place: any) => void }) {
  const isRestaurant = place.types?.includes("restaurant");
  const isCafe = place.types?.includes("cafe") || place.types?.includes("coffee");
  const isBakery = place.types?.includes("bakery");
  const typeLabel = isCafe ? "كافيه" : isBakery ? "مخبز" : isRestaurant ? "مطعم" : "مطعم / كافيه";
  const typeColor = isCafe ? "text-primary/80 bg-primary/10" : isBakery ? "text-primary/80 bg-primary/10" : "text-primary bg-primary/15";
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.placeId}`;

  // Build Google Place Photo URL via Manus proxy
  const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
  const BASE = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
  const googlePhotoUrl = place.photoRef
    ? `${BASE}/v1/maps/proxy/maps/api/place/photo?maxwidth=400&photo_reference=${place.photoRef}&key=${API_KEY}`
    : null;
  // Use custom cover image if set, otherwise fallback to Google Maps photo
  const photoUrl = place.coverImageUrl || googlePhotoUrl;

  return (
    <div className="customer-card overflow-hidden group">
      {/* Cover */}
      <div className="h-36 bg-gray-50 flex items-center justify-center relative overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={place.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <UtensilsCrossedIcon className="w-10 h-10 text-gray-200" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Top badges */}
        <div className="absolute top-2 right-2 flex gap-1">
          {place.onStreet && (
            <span className="text-xs bg-primary/80 text-white px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">على الشارع</span>
          )}
          <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">خرائط جوجل</span>
        </div>
        {/* Open/Closed badge */}
        {place.isOpen === true && (
          <div className="absolute top-2 left-2">
            <span className="text-xs bg-primary/80 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">مفتوح</span>
          </div>
        )}
        {place.isOpen === false && (
          <div className="absolute top-2 left-2">
            <span className="text-xs bg-red-500/80 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">مغلق</span>
          </div>
        )}
        {/* Rating bottom-left */}
        {place.rating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-300 text-xs font-bold">{place.rating.toFixed(1)}</span>
            {place.userRatingsTotal > 0 && (
              <span className="text-gray-400 text-xs">({place.userRatingsTotal.toLocaleString()})</span>
            )}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-foreground text-sm leading-tight flex-1">{place.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${typeColor}`}>{typeLabel}</span>
        </div>
        {place.address && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{place.address}</p>
        )}
        <div className="flex gap-2">
          {onOrder && (
            <button
              onClick={() => onOrder(place)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              اطلب الآن
            </button>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gray-50 hover:bg-primary/20 hover:text-primary transition-colors text-xs text-muted-foreground border border-gray-100"
          >
            <MapPin className="w-3 h-3" />
            {onOrder ? "" : "عرض على الخريطة"}
          </a>
        </div>
      </div>
    </div>
  );
}

function UtensilsCrossedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

function RestaurantCard({ restaurant: r, presence, driversCount = 0, onClick }: { restaurant: any; presence?: { visitors: number; activeOrders: number }; driversCount?: number; onClick: () => void }) {
  const visitors = presence?.visitors ?? 0;
  const activeOrders = presence?.activeOrders ?? 0;
  const hasActivity = visitors > 0 || driversCount > 0 || activeOrders > 0;

  return (
    <div
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20"
      
      onClick={onClick}
    >
      {/* Cover image */}
      <div className="h-40 relative overflow-hidden bg-gray-100">
        {r.imageUrl ? (
          <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Store className="w-12 h-12 text-primary/20" />
          </div>
        )}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Logo bottom-right */}
        {r.logoUrl && (
          <div className="absolute bottom-3 right-3 w-12 h-12 rounded-2xl bg-white shadow-lg border-2 border-white/90 overflow-hidden z-10">
            <img src={r.logoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
          {r.discountEnabled && (
            <span className="text-xs bg-red-500 text-white font-bold px-2.5 py-1 rounded-full shadow-lg">
              خصم {r.discountPercent}%
            </span>
          )}
          {/* Bag icons */}
          <div className="flex gap-1">
            {r.hasHotBag && (
              <span title="حافظ حرارة" className="flex items-center gap-0.5 bg-primary/90 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                🔥 حار
              </span>
            )}
            {r.hasColdBag && (
              <span title="حافظ برودة" className="flex items-center gap-0.5 bg-sky-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                ❄️ بارد
              </span>
            )}
          </div>
        </div>

        {/* Rating top-left */}
        {r.rating && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-300 text-xs font-bold">{r.rating}</span>
          </div>
        )}

        {/* Bottom-left: name + type */}
            <div className="absolute bottom-3 left-3 right-16">
          <h3 className="font-black text-white text-base leading-tight drop-shadow-lg line-clamp-1">{r.name}</h3>
          {r.cuisine && <p className="text-white/80 text-xs mt-0.5">{r.cuisine}</p>}
        </div>
      </div>

      {/* Info row */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary/60" />
            {r.estimatedDeliveryTime ?? 30} دقيقة
          </span>
          {r.addressText && (
            <span className="flex items-center gap-1 truncate max-w-[120px]">
              <MapPin className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              {r.addressText.split("،")[0]}
            </span>
          )}
          {r.minOrderAmount && Number(r.minOrderAmount) > 0 && (
            <span className="text-muted-foreground">حد أدنى {r.minOrderAmount} ر</span>
          )}
        </div>

        {/* Live activity bar - always visible as numbers */}
        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-gray-100">
          <span className={`flex items-center gap-1 text-[11px] ${
            visitors > 0 ? 'text-primary' : 'text-gray-400'
          }`}>
            <Users className="w-3 h-3" />
            <span className="font-bold">{visitors}</span> زائر
          </span>
          <span className="text-gray-300 opacity-60">|</span>
          <span className={`flex items-center gap-1 text-[11px] ${
            driversCount > 0 ? 'text-primary' : 'text-gray-400'
          }`}>
            {driversCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
            {driversCount === 0 && <Truck className="w-3 h-3" />}
            <span className="font-bold">{driversCount}</span> مندوب
          </span>
          {activeOrders > 0 && (
            <>
              <span className="text-gray-300 opacity-60">|</span>
              <span className="flex items-center gap-1 text-[11px] text-primary/70">
                <Package className="w-3 h-3" />
                <span className="font-bold">{activeOrders}</span> طلب
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== ACTIVE GOOGLE PLACE CARD (admin-approved, from DB) =====
function ActiveGooglePlaceCard({ place, onSelect, presence, driversCount = 0 }: { place: any; onSelect: (r: any) => void; presence?: { visitors: number; activeOrders: number }; driversCount?: number }) {
  const visitors = presence?.visitors ?? 0;
  const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
  const BASE = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
  const googlePhotoUrl = place.photoRef
    ? `${BASE}/v1/maps/proxy/maps/api/place/photo?maxwidth=400&photo_reference=${place.photoRef}&key=${API_KEY}`
    : null;
  // Use custom cover image if set, otherwise fallback to Google Maps photo
  const photoUrl = place.coverImageUrl || googlePhotoUrl;

  const types = (() => { try { return JSON.parse(place.types || "[]"); } catch { return []; } })();
  const isCafe = types.includes("cafe") || types.includes("coffee");
  const isBakery = types.includes("bakery");
  const typeLabel = isCafe ? "كافيه" : isBakery ? "مخبز" : "مطعم";

  const restaurantObj = {
    id: `gp_${place.id}`,
    name: place.name,
    cuisine: typeLabel,
    imageUrl: photoUrl,
    logoUrl: null,
    rating: place.rating ? parseFloat(place.rating) : null,
    estimatedDeliveryTime: 30,
    isAcceptingOrders: true,
    addressText: place.address,
    minOrderAmount: null,
    discountEnabled: false,
    isGooglePlace: true,
    googlePlaceId: place.placeId,
    googlePlaceDbId: place.id,
    isOpen: place.isOpen,
  };

  return (
    <div
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20"
      
      onClick={() => onSelect(restaurantObj)}
    >
      {/* Cover image */}
          <div className="h-40 relative overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
        {photoUrl ? (
          <img src={photoUrl} alt={place.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Store className="w-12 h-12 text-gray-200" />
          </div>
        )}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Rating top-left */}
        {place.rating && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-300 text-xs font-bold">{parseFloat(place.rating).toFixed(1)}</span>
          </div>
        )}

        {/* Bag icons top-right */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1">
          {place.discountEnabled && (
            <span className="text-xs bg-red-500 text-white font-bold px-2.5 py-1 rounded-full shadow-lg">
              خصم {place.discountPercent}%
            </span>
          )}
          <div className="flex gap-1">
            {place.hasHotBag && (
              <span title="حافظ حرارة" className="flex items-center gap-0.5 bg-primary/90 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                🔥 حار
              </span>
            )}
            {place.hasColdBag && (
              <span title="حافظ برودة" className="flex items-center gap-0.5 bg-sky-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                ❄️ بارد
              </span>
            )}
          </div>
        </div>

        {/* Bottom-left: name + type */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-black text-white text-base leading-tight drop-shadow-lg line-clamp-1">{place.name}</h3>
          <p className="text-white/80 text-xs mt-0.5">{typeLabel}</p>
        </div>
      </div>

      {/* Info row */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary/60" />
            30 دقيقة
          </span>
          {place.address && (
            <span className="flex items-center gap-1 truncate max-w-[150px]">
              <MapPin className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              {place.address.split("،")[0]}
            </span>
          )}
        </div>

        {/* Live activity bar - always visible as numbers */}
        <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-gray-100">
          <span className={`flex items-center gap-1 text-[11px] ${
            visitors > 0 ? 'text-primary' : 'text-gray-400'
          }`}>
            <Users className="w-3 h-3" />
            <span className="font-bold">{visitors}</span> زائر
          </span>
          <span className="text-gray-300 opacity-60">|</span>
          <span className={`flex items-center gap-1 text-[11px] ${
            driversCount > 0 ? 'text-primary' : 'text-gray-400'
          }`}>
            {driversCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
            {driversCount === 0 && <Truck className="w-3 h-3" />}
            <span className="font-bold">{driversCount}</span> مندوب
          </span>
        </div>
      </div>
    </div>
  );
}

// ===== MENU VIEW =====
function MenuView({ restaurant, cart, setCart, onCheckout }: any) {
  const isGooglePlace = !!restaurant.isGooglePlace;
  const googlePlaceDbId = restaurant.googlePlaceDbId ?? 0;

  // For regular restaurants
  const { data: regCategories } = trpc.restaurants.getCategories.useQuery(
    { restaurantId: restaurant.id },
    { enabled: !isGooglePlace }
  );
  const { data: regMenuItems } = trpc.restaurants.getMenuItems.useQuery(
    { restaurantId: restaurant.id },
    { enabled: !isGooglePlace }
  );

  // For Google Place restaurants
  const { data: gpCategories } = trpc.googlePlaces.getCategories.useQuery(
    { placeDbId: googlePlaceDbId },
    { enabled: isGooglePlace }
  );
  const { data: gpMenuItems } = trpc.googlePlaces.getMenuItems.useQuery(
    { placeDbId: googlePlaceDbId },
    { enabled: isGooglePlace }
  );

  const categories = isGooglePlace ? gpCategories : regCategories;
  const menuItems = isGooglePlace ? gpMenuItems : regMenuItems;

  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  // Presence heartbeat: only for regular restaurants
  const heartbeatMutation = trpc.restaurants.heartbeat.useMutation();
  useEffect(() => {
    if (isGooglePlace) return;
    let sid = sessionStorage.getItem("presence_sid");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("presence_sid", sid);
    }
    const sendHeartbeat = () => heartbeatMutation.mutate({ restaurantId: restaurant.id, sessionId: sid! });
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [restaurant.id, isGooglePlace]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showMenuImage, setShowMenuImage] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemQtyInDialog, setItemQtyInDialog] = useState(1);
  const [itemNoteInDialog, setItemNoteInDialog] = useState("");

  const addToCart = (item: any, qty = 1) => {
    // التحقق من المخزون قبل الإضافة
    if (item.stockEnabled && item.stockCount !== null && item.stockCount !== undefined) {
      const currentQtyInCart = cart.find((i: CartItem) => i.id === item.id)?.quantity ?? 0;
      if (item.stockCount <= 0) {
        toast.error(`عذراً، "${item.name}" نفد من المخزون`);
        return;
      }
      if (currentQtyInCart + qty > item.stockCount) {
        toast.error(`الكمية المتاحة من "${item.name}" هي ${item.stockCount} فقط`);
        return;
      }
    }
    setCart((prev: CartItem[]) => {
      const existing = prev.find((i: CartItem) => i.id === item.id);
      if (existing) return prev.map((i: CartItem) => i.id === item.id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: qty, restaurantId: restaurant.id }];
    });
    toast.success(`تمت إضافة ${item.name} للسلة`);
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev: CartItem[]) => {
      const existing = prev.find((i: CartItem) => i.id === itemId);
      if (existing?.quantity === 1) return prev.filter((i: CartItem) => i.id !== itemId);
      return prev.map((i: CartItem) => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const openItemDetail = (item: any) => {
    setSelectedItem(item);
    const currentQty = cart.find((i: CartItem) => i.id === item.id)?.quantity ?? 0;
    setItemQtyInDialog(currentQty > 0 ? currentQty : 1);
    setItemNoteInDialog("");
  };

  const getQty = (itemId: number) => cart.find((i: CartItem) => i.id === itemId)?.quantity ?? 0;
  const cartTotal = cart.reduce((s: number, i: CartItem) => s + Number(i.price) * i.quantity, 0);
  const cartCount = cart.reduce((s: number, i: CartItem) => s + i.quantity, 0);

  const filteredItems = useMemo(() =>
    menuItems?.filter((i: any) => (activeCategory === null ? true : i.categoryId === activeCategory) && i.isAvailable),
    [menuItems, activeCategory]
  );

  return (
    <div className="space-y-4">
      {/* Restaurant header */}
      <div className="customer-card">
        {restaurant.coverImageUrl && (
          <div className="relative h-36 overflow-hidden">
            <img src={restaurant.coverImageUrl} alt={restaurant.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center gap-4">
            {restaurant.logoUrl && (
              <img src={restaurant.logoUrl} alt={restaurant.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-foreground">{restaurant.name}</h2>
              {restaurant.cuisine && <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{restaurant.estimatedDeliveryTime ?? 30} دقيقة</span>
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{restaurant.rating ?? "4.5"}</span>
                {restaurant.minOrderAmount && Number(restaurant.minOrderAmount) > 0 && (
                  <span className="flex items-center gap-1">حد أدنى: {restaurant.minOrderAmount} ريال</span>
                )}
              </div>
            </div>
            {restaurant.menuImageUrl && (
              <button
                onClick={() => setShowMenuImage(true)}
                className="flex flex-col items-center gap-1 bg-muted hover:bg-border transition-colors rounded-xl p-3 shrink-0"
              >
                <ImageIcon className="w-5 h-5 text-foreground" />
                <span className="text-xs text-muted-foreground">المنيو</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Menu image dialog */}
      {restaurant.menuImageUrl && (
        <Dialog open={showMenuImage} onOpenChange={setShowMenuImage}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader><DialogTitle>قائمة طعام {restaurant.name}</DialogTitle></DialogHeader>
            <img src={restaurant.menuImageUrl} alt="قائمة الطعام" className="w-full rounded-xl object-contain max-h-[70vh]" />
          </DialogContent>
        </Dialog>
      )}

      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(v) => { if (!v) setSelectedItem(null); }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden" dir="rtl">
          {selectedItem && (
            <>
              {selectedItem.imageUrl ? (
                <div className="relative h-52 overflow-hidden">
                  <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="absolute top-3 left-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="h-32 bg-gray-100 flex items-center justify-center">
                  <Package className="w-14 h-14 text-primary" />
                </div>
              )}
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-xl font-black text-foreground">{selectedItem.name}</h3>
                  {selectedItem.description && (
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{selectedItem.description}</p>
                  )}
                  <div className="text-2xl font-black text-primary mt-2">{selectedItem.price} ريال</div>
                </div>

                {/* Quantity selector */}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">الكمية</span>
                  <div className="flex items-center gap-3 bg-muted rounded-2xl p-1">
                    <button
                      className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-border transition-colors"
                      onClick={() => setItemQtyInDialog(q => Math.max(1, q - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-black text-lg w-8 text-center">{itemQtyInDialog}</span>
                    <button
                      className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-border transition-colors disabled:opacity-40"
                      disabled={!!(selectedItem?.stockEnabled && selectedItem?.stockCount !== null && itemQtyInDialog >= selectedItem?.stockCount)}
                      onClick={() => {
                        if (selectedItem?.stockEnabled && selectedItem?.stockCount !== null && itemQtyInDialog >= selectedItem.stockCount) {
                          toast.error(`الكمية المتاحة من "${selectedItem.name}" هي ${selectedItem.stockCount} فقط`);
                          return;
                        }
                        setItemQtyInDialog(q => q + 1);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Button
                  className="w-full bg-primary text-white rounded-2xl h-12 text-base font-bold"
                  onClick={() => {
                    // التحقق من المخزون قبل الإضافة
                    if (selectedItem.stockEnabled && selectedItem.stockCount !== null && selectedItem.stockCount !== undefined) {
                      if (selectedItem.stockCount <= 0) {
                        toast.error(`عذراً، "${selectedItem.name}" نفد من المخزون`);
                        return;
                      }
                      if (itemQtyInDialog > selectedItem.stockCount) {
                        toast.error(`الكمية المتاحة من "${selectedItem.name}" هي ${selectedItem.stockCount} فقط`);
                        return;
                      }
                    }
                    // Remove existing qty then add new qty
                    setCart((prev: CartItem[]) => {
                      const filtered = prev.filter((i: CartItem) => i.id !== selectedItem.id);
                      return [...filtered, { id: selectedItem.id, name: selectedItem.name, price: selectedItem.price, quantity: itemQtyInDialog, restaurantId: restaurant.id }];
                    });
                    toast.success(`تمت إضافة ${selectedItem.name} للسلة`);
                    setSelectedItem(null);
                  }}
                >
                  <ShoppingCart className="w-5 h-5 ml-2" />
                  إضافة للسلة · {(Number(selectedItem.price) * itemQtyInDialog).toFixed(2)} ريال
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`customer-pill ${activeCategory === null ? "customer-pill-active" : "customer-pill-inactive"}`}
          >الكل</button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`customer-pill ${activeCategory === c.id ? "customer-pill-active" : "customer-pill-inactive"}`}
            >{c.name}</button>
          ))}
        </div>
      )}

      {/* Items Grid - Card Style */}
      {(!filteredItems || filteredItems.length === 0) ? (
        <div className="text-center py-16 text-muted-foreground customer-card">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا توجد أصناف في هذه الفئة</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredItems?.map((item: any) => {
            const qty = getQty(item.id);
            const isOutOfStock = item.stockEnabled && item.stockCount === 0;
            const isLowStock = item.stockEnabled && item.stockCount > 0 && item.stockCount <= 3;
            return (
              <div
                key={item.id}
                className={`customer-card overflow-hidden transition-all ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary/30 hover:shadow-md cursor-pointer group'}`}
                onClick={() => !isOutOfStock && openItemDetail(item)}
              >
                {/* Image */}
                <div className="relative">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className={`w-full h-32 object-cover transition-transform duration-300 ${!isOutOfStock ? 'group-hover:scale-105' : 'grayscale'}`} />
                  ) : (
                    <div className="h-32 bg-gray-100 flex items-center justify-center">
                      <Package className="w-10 h-10 text-primary" />
                    </div>
                  )}
                  {qty > 0 && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-black shadow">
                      {qty}
                    </div>
                  )}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">نافد</span>
                    </div>
                  )}
                  {isLowStock && !isOutOfStock && (
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-lg">متبقي {item.stockCount}</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3">
                  <h4 className="font-bold text-foreground text-sm leading-tight mb-1 line-clamp-2">{item.name}</h4>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      {item.discountPrice && parseFloat(item.discountPrice) > 0 ? (
                        <>
                          <span className="font-black text-primary text-sm">{item.discountPrice} ريال</span>
                          <span className="text-xs text-muted-foreground line-through">{item.price} ريال</span>
                        </>
                      ) : (
                        <span className="font-black text-primary text-sm">{item.price} ريال</span>
                      )}
                    </div>
                    {isOutOfStock ? (
                      <span className="text-xs text-red-500 font-bold">غير متاح</span>
                    ) : (
                      <button
                        className="w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
                        onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky cart button */}
      {cartCount > 0 && (
        <div className="sticky bottom-4 pt-4">
          <Button
            className="w-full bg-primary text-white rounded-2xl h-14 text-base font-bold shadow-lg shadow-primary/30"
            onClick={onCheckout}
          >
            <ShoppingCart className="w-5 h-5 ml-2" />
            عرض السلة ({cartCount} صنف) · {cartTotal.toFixed(2)} ريال
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== CART VIEW WRAPPER (fetches menuItems for images) =====
// ===== COVERAGE BADGE =====
function CoverageBadge({ cityId }: { cityId: number }) {
  const { data: cities } = trpc.cities.listActive.useQuery();
  const city = cities?.find((c: any) => c.id === cityId);
  if (!city) return null;
  const isCovered = city.isCovered;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
        isCovered
          ? "bg-primary/15 text-primary"
          : "bg-red-500/15 text-red-500"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isCovered ? "bg-primary" : "bg-red-500"}`} />
      {isCovered ? "مغطى" : "خارج التغطية"}
    </span>
  );
}

function CartViewWrapper(props: any) {
  const { data: menuItems } = trpc.restaurants.getMenuItems.useQuery(
    { restaurantId: props.restaurant?.id },
    { enabled: !!props.restaurant?.id }
  );
  return <CartViewStepper {...props} menuItems={menuItems} phoneUser={props.phoneUser} onSetDeliveryFee={props.onSetDeliveryFee} />;
}

// ===== CART VIEW STEPPER (city → street → [location if needed] → restaurants) =====
function CartViewStepper(props: any) {
  const isFromMenu = props.cartSource === "menu";
  // deliveryLocation passed from parent (set during initial city selection)
  const existingLocation = props.deliveryLocation as { lat: number; lng: number; address: string } | null;

  const [step, setStep] = useState<"city" | "street" | "location" | "restaurants">("city");
  const [cartCity, setCartCity] = useState<{ id: number; name: string } | null>(null);
  const [cartStreet, setCartStreet] = useState<{ id: number; name: string } | null>(null);
  const [cartLocation, setCartLocation] = useState<{ lat: number; lng: number; address: string; deliveryFee?: string } | null>(
    existingLocation ? { ...existingLocation } : null
  );

  // If from menu, show CartView directly (use parentCity/parentStreet from main component)
  if (isFromMenu) {
    return (
      <CartView
        {...props}
        cartCity={props.parentCity ?? cartCity}
        cartStreet={props.parentStreet ?? cartStreet}
        cartLocation={cartLocation}
      />
    );
  }

  // Steps depend on whether location is already known
  const hasLocation = !!existingLocation || !!cartLocation;
  const steps = hasLocation
    ? ["city", "street", "restaurants"]
    : ["city", "street", "location", "restaurants"];

  const isCompleted = (s: string) => steps.indexOf(s) < steps.indexOf(step);
  const isCurrent = (s: string) => step === s;

  const circleClass = (s: string) =>
    isCompleted(s)
      ? "bg-primary text-white"
      : isCurrent(s)
      ? "bg-primary text-white shadow-lg shadow-primary/40"
      : "bg-gray-100 text-gray-400 border-2 border-gray-200";

  const labelClass = (s: string) =>
    isCompleted(s) ? "text-green-600" : isCurrent(s) ? "text-primary" : "text-gray-400";

  const lineClass = (after: string) => {
    const afterIdx = steps.indexOf(after);
    const currentIdx = steps.indexOf(step);
    return currentIdx > afterIdx ? "bg-primary" : "bg-gray-200";
  };

  const stepLabel: Record<string, string> = {
    city: "المدينة",
    street: "الشارع",
    location: "الموقع",
    restaurants: "المتاجر",
  };

  return (
    <div className="min-h-screen customer-bg customer-theme flex flex-col" dir="rtl">
      {/* ===== TOP STEPS INDICATOR ===== */}
      <div className="sticky top-0 z-40 px-4 pt-4 pb-3 customer-header">
        <div className="flex items-center justify-center gap-1 max-w-sm mx-auto" dir="rtl">
          {steps.map((s, idx) => (
            <>
              <button key={s} onClick={() => isCompleted(s) && setStep(s as any)} className="flex flex-col items-center gap-1 min-w-[52px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${circleClass(s)}`}>
                  {isCompleted(s) ? "✓" : idx + 1}
                </div>
                <span className={`text-xs font-semibold ${labelClass(s)}`}>{stepLabel[s]}</span>
              </button>
              {idx < steps.length - 1 && (
                <div key={`line-${s}`} className={`h-0.5 flex-1 rounded-full mb-4 ${lineClass(s)}`} />
              )}
            </>
          ))}
        </div>
      </div>

      {/* ===== STEP CONTENT ===== */}
      <div className="flex-1 overflow-y-auto pb-20">
        {step === "city" && (
          <CartCityStep
            onSelect={(city) => { setCartCity({ id: city.id, name: city.name }); if (city.deliveryFee && city.deliveryFee !== "0") props.onSetDeliveryFee?.(city.deliveryFee); setStep("street"); }}
          />
        )}
        {step === "street" && cartCity && (
          <CartStreetStep
            city={cartCity}
            onSelect={(street) => {
              setCartStreet(street);
              // If location already known, skip to restaurants; otherwise ask for location
              if (hasLocation) {
                setStep("restaurants");
              } else {
                setStep("location");
              }
            }}
          />
        )}
        {step === "location" && (
          <CartLocationStep
            onSelect={(loc) => {
              setCartLocation(loc);
              setStep("restaurants");
            }}
            onBack={() => setStep("street")}
          />
        )}
        {step === "restaurants" && cartCity && cartStreet && (
          <CartRestaurantsStep
            city={cartCity}
            street={cartStreet}
            cartLocation={cartLocation || existingLocation}
            onSelectRestaurant={(restaurant: any) => {
              // Pass selected restaurant up and show CartView
              props.onRestaurantSelected?.(restaurant, cartCity, cartStreet, cartLocation || existingLocation);
            }}
            onBack={() => setStep("street")}
          />
        )}
      </div>
    </div>
  );
}

// ===== CART CITY STEP =====
function CartCityStep({ onSelect }: { onSelect: (city: { id: number; name: string; deliveryFee?: string }) => void }) {
  const { data: cities, isLoading } = trpc.cities.listActive.useQuery();
  return (
    <div className="flex flex-col items-center px-6 py-8">
      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
        <MapPin className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-2xl font-black text-foreground mb-2 text-center">من وين حاب تتسوق؟</h2>
      <p className="text-muted-foreground text-sm mb-8 text-center">اختر مدينة المتاجر</p>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /><span>جاري التحميل...</span>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-3">
          {cities?.map(city => (
            <button
              key={city.id}
              onClick={() => onSelect({ id: city.id, name: city.name, deliveryFee: String(city.deliveryFee ?? "0") })}
              className="w-full customer-card border-2 hover:border-primary/60 hover:bg-primary/5 rounded-2xl p-4 flex items-center gap-4 transition-all group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col items-start flex-1">
                <span className="font-bold text-foreground text-lg">{city.name}</span>
                {Number(city.deliveryFee ?? 0) > 0 && (
                  <span className="text-xs font-semibold text-primary mt-0.5">
                    🚚 رسوم التوصيل: {Number(city.deliveryFee).toFixed(2)} ﷼
                  </span>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground rotate-180" />
            </button>
          ))}
          {(!cities || cities.length === 0) && (
            <p className="text-center text-muted-foreground py-8">لا توجد مدن متاحة حالياً</p>
          )}
        </div>
      )}
    </div>
  );
}

// ===== CART STREET STEP =====
function CartStreetStep({ city, onSelect }: { city: { id: number; name: string }; onSelect: (street: { id: number; name: string }) => void }) {
  const { data: streetsData, isLoading } = trpc.cities.getStreets.useQuery({ cityId: city.id });
  return (
    <div className="flex flex-col items-center px-6 py-8">
      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-2xl">🏪</span>
      </div>
      <h2 className="text-2xl font-black text-foreground mb-2 text-center">اختر الشارع</h2>
      <p className="text-muted-foreground text-sm mb-8 text-center">شوارع {city.name}</p>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" /><span>جاري التحميل...</span>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-3">
          {streetsData?.map(street => (
            <button
              key={street.id}
              onClick={() => onSelect({ id: street.id, name: street.name })}
              className="w-full customer-card border-2 hover:border-primary/60 hover:bg-primary/5 rounded-2xl p-4 flex items-center gap-4 transition-all group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex flex-col items-center justify-center group-hover:from-primary/20 group-hover:to-primary/30 transition-all">
                <span className="text-xl">🏪</span>
              </div>
              <div className="flex flex-col items-start flex-1">
                <span className="font-bold text-foreground text-base">{street.name}</span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {Number(street.restaurantCount) > 0
                    ? `${street.restaurantCount} متجر / مطعم`
                    : "لا توجد متاجر بعد"}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground rotate-180" />
            </button>
          ))}
          {(!streetsData || streetsData.length === 0) && (
            <p className="text-center text-muted-foreground py-8">لا توجد شوارع متاحة في هذه المدينة</p>
          )}
        </div>
      )}
    </div>
  );
}

// ===== CART LOCATION STEP (same as CitySelectionScreen location step) =====
function CartLocationStep({
  onSelect,
  onBack,
}: {
  onSelect: (loc: { lat: number; lng: number; address: string; deliveryFee?: string }) => void;
  onBack: () => void;
}) {
  const [mapPin, setMapPin] = useState<{ lat: number; lng: number } | null>(null);
  const [mapAddress, setMapAddress] = useState("");
  const checkCoverage = trpc.cities.checkCoverage.useQuery(
    { lat: mapPin?.lat ?? 0, lng: mapPin?.lng ?? 0 },
    { enabled: !!mapPin, refetchOnWindowFocus: false }
  );

  return (
    <div className="flex flex-col px-6 py-6" dir="rtl">
      {/* Back button + title */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h2 className="text-xl font-black text-foreground">حدد موقع التوصيل</h2>
          <p className="text-muted-foreground text-xs">اضغط على الخريطة أو استخدم التحديد التلقائي</p>
        </div>
      </div>

      {/* GPS Button */}
      <button
        id="gps-btn-cart"
        className="w-full mb-3 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all text-primary font-bold text-sm"
        onClick={() => {
          const btn = document.getElementById("gps-btn-cart");
          if (btn) btn.textContent = "جاري تحديد موقعك...";
          if (!navigator.geolocation) { alert("متصفحك لا يدعم تحديد الموقع"); return; }
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              setMapPin({ lat, lng });
              const google = (window as any).google;
              if (google) {
                const geocoder = new (window as any).google.maps.Geocoder();
                geocoder.geocode({ location: { lat, lng } }, async (results: any, status: any) => {
                  if (status === "OK" && results[0]) setMapAddress(results[0].formatted_address);
                  else {
                    try {
                      const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
                      const BASE = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
                      const r = await fetch(`${BASE}/v1/maps/proxy/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}&language=ar`);
                      const d = await r.json();
                      setMapAddress(d.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                    } catch { setMapAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); }
                  }
                });
                if ((window as any).__customerMap) {
                  (window as any).__customerMap.setCenter({ lat, lng });
                  (window as any).__customerMap.setZoom(16);
                  if ((window as any).__customerMarkerCart) (window as any).__customerMarkerCart.setMap(null);
                  (window as any).__customerMarkerCart = new (window as any).google.maps.Marker({
                    position: { lat, lng }, map: (window as any).__customerMap,
                    title: "موقعك الحالي",
                    icon: { url: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png" },
                  });
                }
              }
              if (btn) btn.innerHTML = '✅ تم تحديد موقعك تلقائياً';
            },
            () => {
              if (btn) btn.innerHTML = '📍 تحديد موقعي تلقائياً';
              alert("تعذّر تحديد الموقع. يرجى السماح بالوصول إلى موقعك أو حدده يدوياً على الخريطة");
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }}
      >
        <span>📍</span>
        <span>تحديد موقعي تلقائياً</span>
      </button>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 mb-4" style={{ height: 280 }}>
        <MapView
          onMapReady={(map: any) => {
            const google = (window as any).google;
            if (!google) return;
            (window as any).__customerMap = map;
            map.setCenter({ lat: 24.7136, lng: 46.6753 });
            map.setZoom(12);
            let marker: any = null;
            (window as any).__customerMarkerCart = null;
            const geocoder = new (window as any).google.maps.Geocoder();
            map.addListener("click", (e: any) => {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              if (marker) marker.setMap(null);
              marker = new (window as any).google.maps.Marker({
                position: { lat, lng }, map,
                title: "موقع التوصيل",
                icon: { url: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png" },
              });
              (window as any).__customerMarkerCart = marker;
              setMapPin({ lat, lng });
              geocoder.geocode({ location: { lat, lng } }, async (results: any, status: any) => {
                if (status === "OK" && results[0]) setMapAddress(results[0].formatted_address);
                else {
                  try {
                    const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
                    const BASE = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
                    const r = await fetch(`${BASE}/v1/maps/proxy/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}&language=ar`);
                    const d = await r.json();
                    setMapAddress(d.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                  } catch { setMapAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); }
                }
              });
            });
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                map.setZoom(15);
              });
            }
          }}
        />
      </div>

      {/* Address display */}
      {mapPin && (
        <div className="mb-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
          <p className="text-xs text-muted-foreground mb-1">العنوان المحدد</p>
          <p className="text-sm text-foreground font-medium">{mapAddress || `${mapPin.lat.toFixed(5)}, ${mapPin.lng.toFixed(5)}`}</p>
        </div>
      )}

      {/* Coverage result */}
      {mapPin && checkCoverage.data && (
        <div className={`mb-4 p-3 rounded-xl border ${
          checkCoverage.data.covered
            ? "border-primary/40 bg-primary/5"
            : "border-red-500/40 bg-red-50"
        }`}>
          {checkCoverage.data.covered ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-bold text-primary">منطقة التوصيل متاحة ✅</p>
                  <p className="text-xs text-primary/70">{checkCoverage.data.city?.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-primary/60">رسوم التوصيل</p>
                <p className="text-sm font-black text-primary">
                  {Number(checkCoverage.data.city?.deliveryFee ?? 0) > 0
                    ? `${Number(checkCoverage.data.city?.deliveryFee).toFixed(2)} ﷼`
                    : "مجاني"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-bold text-red-700">عذراً، هذه المنطقة غير مغطّاة حالياً</p>
                <p className="text-xs text-red-500">سنصل إليك قريباً ✨ جرّب موقعاً آخر</p>
              </div>
            </div>
          )}
        </div>
      )}

      {mapPin && checkCoverage.isLoading && (
        <div className="mb-4 flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>جاري التحقق من التغطية...</span>
        </div>
      )}

      <button
        className="w-full bg-primary text-white rounded-2xl h-12 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        disabled={!mapPin || !checkCoverage.data?.covered}
        onClick={() => {
          if (mapPin && checkCoverage.data?.covered) {
            onSelect({
              lat: mapPin.lat,
              lng: mapPin.lng,
              address: mapAddress || `${mapPin.lat.toFixed(5)}, ${mapPin.lng.toFixed(5)}`,
              deliveryFee: checkCoverage.data.city?.deliveryFee ?? "0",
            });
          }
        }}
      >
        {!mapPin ? "اضغط على الخريطة لتحديد الموقع" : checkCoverage.data?.covered ? "تأكيد موقع التوصيل ←" : "اختر موقعاً آخر"}
      </button>
    </div>
  );
}

// ===== CART RESTAURANTS STEP =====
function CartRestaurantsStep({
  city,
  street,
  cartLocation,
  onSelectRestaurant,
  onBack,
}: {
  city: { id: number; name: string };
  street: { id: number; name: string };
  cartLocation: { lat: number; lng: number; address: string } | null;
  onSelectRestaurant: (restaurant: any) => void;
  onBack: () => void;
}) {
  const { data: restaurantList, isLoading } = trpc.restaurants.listByStreet.useQuery(
    { cityId: city.id, streetId: street.id },
    { refetchOnWindowFocus: false }
  );

  return (
    <div className="flex flex-col px-4 py-6" dir="rtl">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h2 className="text-xl font-black text-foreground">{street.name}</h2>
          <p className="text-muted-foreground text-xs">{city.name}{cartLocation ? " • سيتم التوصيل إلى موقعك" : ""}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-16">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>جاري تحميل المتاجر...</span>
        </div>
      ) : !restaurantList || restaurantList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">&#x1F374;</span>
          </div>
          <p className="text-muted-foreground text-center">لا توجد متاجر متاحة في هذا الشارع حالياً</p>
          <button onClick={onBack} className="text-primary text-sm font-semibold">← جرب شارعاً آخر</button>
        </div>
      ) : (
        <div className="space-y-3">
          {restaurantList.map((r: any) => (
            <button
              key={r.id}
              onClick={() => onSelectRestaurant(r)}
              className="w-full customer-card rounded-2xl overflow-hidden border-2 hover:border-primary/60 transition-all text-right"
            >
              {r.coverImageUrl && (
                <img src={r.coverImageUrl} alt={r.name} className="w-full h-28 object-cover" />
              )}
              <div className="p-4 flex items-start gap-3">
                {r.logoUrl ? (
                  <img src={r.logoUrl} alt={r.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">&#x1F374;</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-foreground text-base truncate">{r.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                      r.openNow ? "bg-primary/15 text-primary" : "bg-red-100 text-red-700"
                    }`}>{r.openNow ? "مفتوح" : "مغلق"}</span>
                  </div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {r.estimatedDeliveryTime && (
                      <span>&#x23F1; {r.estimatedDeliveryTime} دقيقة</span>
                    )}
                    {r.minOrderAmount && (
                      <span>أدنى طلب {r.minOrderAmount} ريال</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== CART VIEW =====
function CartView({ cart, setCart, restaurant, addressForm, setAddressForm, showAddressDialog, setShowAddressDialog, paymentMethod, setPaymentMethod, userId, onSuccess, menuItems, phoneUser, coverageDeliveryFee, cartCity, cartStreet, cartLocation }: any) {
  const utils = trpc.useUtils();
  const updateProfileMutation = trpc.phoneAuth.updateProfile.useMutation();

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("تم إرسال طلبك بنجاح!");
      // Auto-save delivery address after successful order
      if (addressForm.text && !isRawCoords(addressForm.text)) {
        updateProfileMutation.mutate({
          pinnedAddressText: addressForm.text,
          pinnedAddressLat: addressForm.lat || undefined,
          pinnedAddressLng: addressForm.lng || undefined,
        }, {
          onSuccess: () => utils.phoneAuth.me.invalidate(),
        });
      }
      onSuccess(data.orderId);
    },
    onError: (e: any) => toast.error(e.message || "حدث خطأ"),
  });

  // Helper: detect if a string is raw coordinates (e.g. "24.89646, 46.49656")
  const isRawCoords = (s: string) => /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(s?.trim() ?? "");

  // Reverse-geocode via tRPC server procedure (uses BUILT_IN_FORGE_API_KEY server-side)
  const reverseGeocodeQuery = trpc.cities.reverseGeocode.useQuery(
    { lat: Number(addressForm.lat), lng: Number(addressForm.lng) },
    {
      enabled: !!(addressForm.lat && addressForm.lng && isRawCoords(addressForm.text ?? "")),
      staleTime: 1000 * 60 * 10,
    }
  );

  // When reverseGeocodeQuery resolves, update addressForm with human-readable address
  useEffect(() => {
    if (reverseGeocodeQuery.data?.address && isRawCoords(addressForm.text ?? "")) {
      setAddressForm((prev: any) => ({ ...prev, text: reverseGeocodeQuery.data!.address }));
    }
  }, [reverseGeocodeQuery.data]);

  // Fallback reverseGeocode function for GPS button (still uses server)
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
      const FORGE_BASE_URL = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
      const res = await fetch(
        `${FORGE_BASE_URL}/v1/maps/proxy/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}&language=ar`
      );
      const data = await res.json();
      if (data.results?.[0]?.formatted_address) return data.results[0].formatted_address;
      // Fallback: try server-side tRPC
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  // Use cartLocation from stepper if available (pre-fill address), with auto reverse-geocoding
  useEffect(() => {
    if (!cartLocation) return;
    const lat = Number(cartLocation.lat);
    const lng = Number(cartLocation.lng);
    const currentText = addressForm.text?.trim() ?? "";
    // If address is empty OR still raw coordinates → reverse-geocode
    if (!currentText || isRawCoords(currentText)) {
      if (lat && lng) {
        reverseGeocode(lat, lng).then((address) => {
          setAddressForm({ text: address, lat: String(lat), lng: String(lng) });
        });
      } else {
        setAddressForm({ text: cartLocation.address, lat: cartLocation.lat, lng: cartLocation.lng });
      }
    }
  }, [cartLocation]);

  const [customerNotes, setCustomerNotes] = useState("");
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const [receiverType, setReceiverType] = useState<"self" | "other">("self");
  const [otherPhone, setOtherPhone] = useState("");
  const [isLocatingCart, setIsLocatingCart] = useState(false);

  // Auto reverse-geocode if addressForm.text is raw coordinates on mount
  useEffect(() => {
    const text = addressForm.text?.trim() ?? "";
    if (isRawCoords(text) && addressForm.lat && addressForm.lng) {
      reverseGeocode(Number(addressForm.lat), Number(addressForm.lng)).then((address) => {
        setAddressForm((prev: any) => ({ ...prev, text: address }));
      });
    }
  }, []); // run once on mount

  // Auto-fill saved address if no address is set yet
  const [savedAddressShown, setSavedAddressShown] = useState(false);
  const hasPinnedAddress = !!(phoneUser?.pinnedAddressText && !isRawCoords(phoneUser.pinnedAddressText));
  useEffect(() => {
    const currentText = addressForm.text?.trim() ?? "";
    if (!currentText && hasPinnedAddress && !savedAddressShown) {
      setAddressForm({
        text: phoneUser.pinnedAddressText,
        lat: phoneUser.pinnedAddressLat ?? "",
        lng: phoneUser.pinnedAddressLng ?? "",
      });
      setSavedAddressShown(true);
    }
  }, [hasPinnedAddress, phoneUser]);

  // Resolve city & street from address text when cartCity/cartStreet not provided (isFromMenu path)
  const { data: allCities } = trpc.cities.listActive.useQuery();
  const resolvedCity = useMemo(() => {
    if (cartCity) return cartCity;
    if (!addressForm.text || !allCities) return null;
    const text = addressForm.text;
    return allCities.find((c: any) => text.includes(c.name)) ?? null;
  }, [cartCity, addressForm.text, allCities]);
  // Check if the selected/resolved city is covered (delivery allowed)
  const activeCity = cartCity ?? resolvedCity;
  const isCityDeliveryCovered = useMemo(() => {
    if (!activeCity || !allCities) return false;
    const cityData = allCities.find((c: any) => c.id === activeCity.id);
    return cityData?.isCovered === true;
  }, [activeCity, allCities]);

  const { data: allStreets } = trpc.cities.getStreets.useQuery(
    { cityId: resolvedCity?.id ?? 0 },
    { enabled: !!resolvedCity }
  );
  const resolvedStreet = useMemo(() => {
    if (cartStreet) return cartStreet;
    if (!addressForm.text || !allStreets) return null;
    const text = addressForm.text;
    return allStreets.find((s: any) => text.includes(s.name)) ?? null;
  }, [cartStreet, addressForm.text, allStreets]);

  const handleLocateCurrentPosition = () => {
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setIsLocatingCart(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
          const FORGE_BASE_URL = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
          const res = await fetch(`${FORGE_BASE_URL}/v1/maps/proxy/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}&language=ar`);
          const data = await res.json();
          const address = data.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setAddressForm({ text: address, lat: String(lat), lng: String(lng) });
          toast.success("تم تحديد موقعك الحالي بنجاح");
        } catch {
          setAddressForm({ text: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat: String(lat), lng: String(lng) });
          toast.success("تم تحديد موقعك الحالي");
        }
        setIsLocatingCart(false);
      },
      () => {
        setIsLocatingCart(false);
        toast.error("تعذّر تحديد موقعك، يرجى السماح بالوصول للموقع");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const subtotal = cart.reduce((s: number, i: CartItem) => s + Number(i.price) * i.quantity, 0);
  // Use cartLocation deliveryFee if available
  const deliveryFeeNum = parseFloat(cartLocation?.deliveryFee ?? coverageDeliveryFee ?? "0") || 0;
  const total = subtotal + deliveryFeeNum;
  const itemCount = cart.reduce((s: number, i: CartItem) => s + i.quantity, 0);

  const handleOrder = () => {
    if (!addressForm.text) { setShowAddressDialog(true); return; }
    const notes = [
      leaveAtDoor ? "اتركها عند الباب" : "",
      receiverType === "other" && otherPhone ? `المستلم: ${otherPhone}` : "",
      customerNotes,
    ].filter(Boolean).join(" | ");
    createOrder.mutate({
      restaurantId: restaurant.isGooglePlace ? 0 : restaurant.id,
      items: cart.map((i: CartItem) => ({ menuItemId: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      deliveryAddressText: addressForm.text,
      deliveryLat: addressForm.lat ? String(addressForm.lat) : undefined,
      deliveryLng: addressForm.lng ? String(addressForm.lng) : undefined,
      paymentMethod,
      customerNotes: notes || undefined,
      deliveryFee: coverageDeliveryFee ?? "0",
      ...(restaurant.isGooglePlace ? {
        googlePlaceName: restaurant.name,
        googlePlaceId: restaurant.googlePlaceId,
        cityId: cartCity?.id,
        streetId: cartStreet?.id,
      } : {}),
    });
  };

  return (
    <div className="max-w-lg mx-auto pb-44" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-black text-foreground">تأكيد الطلب</h2>
        <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full mr-auto">{itemCount} صنف</span>
      </div>

      {/* ─── بطاقة العنوان ─── */}
      <div className="customer-card mb-3 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-sm font-black text-foreground">العنوان</span>
          <button
            onClick={() => setShowAddressDialog(true)}
            className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
          >
            <ChevronLeft className="w-3 h-3" />
            {addressForm.text ? "التغيير" : "إضافة عنوان"}
          </button>
        </div>
        {/* Current address display + city/street/coverage */}
        {addressForm.text && (
          <div className="flex items-start gap-3 px-4 py-3 border-t border-border">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs text-muted-foreground">تسليم إلى</p>
                {hasPinnedAddress && addressForm.text === phoneUser?.pinnedAddressText && (
                  <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium border border-primary/20">★ عنوانك المحفوظ</span>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground truncate mb-1.5">{addressForm.text}</p>
              {/* Coverage badge only - based on selected city */}
              <div className="flex flex-wrap items-center gap-1.5">
                {cartCity ? (
                  <CoverageBadge cityId={cartCity.id} />
                ) : resolvedCity ? (
                  <CoverageBadge cityId={resolvedCity.id} />
                ) : null}
              </div>
            </div>
          </div>
        )}
        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={handleLocateCurrentPosition}
            disabled={isLocatingCart}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors text-primary font-semibold text-xs border border-primary/20 disabled:opacity-60"
          >
            {isLocatingCart ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Locate className="w-4 h-4" />
            )}
            جلب موقعي الحالي
          </button>
          <button
            onClick={() => setShowAddressDialog(true)}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/60 hover:bg-muted transition-colors text-foreground font-semibold text-xs border border-border"
          >
            <MapPin className="w-4 h-4 text-primary" />
            اختر من الخريطة
          </button>
        </div>
      </div>

      {/* ─── تعليمات التوصيل ─── */}
      <div className="customer-card mb-3 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-black text-foreground">تعليمات التوصيل</span>
          <Info className="w-4 h-4 text-muted-foreground" />
        </div>
        <button
          onClick={() => setLeaveAtDoor(!leaveAtDoor)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
            leaveAtDoor ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <DoorClosed className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">اتركها عند الباب</span>
          </div>
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            leaveAtDoor ? "border-primary bg-primary" : "border-border"
          }`}>
            {leaveAtDoor && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
        </button>
      </div>

      {/* ─── من يستلم الطلب؟ ─── */}
      <div className="customer-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
          <span className="text-sm font-black text-gray-900">مين بيستلم هذا الطلب؟</span>
          <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">جديد</span>
        </div>
        <div className="grid grid-cols-2 gap-0">
          {/* أنا */}
          <button
            onClick={() => setReceiverType("self")}
            className={`flex flex-col items-center gap-2 p-4 border-l border-border transition-all ${
              receiverType === "self" ? "bg-primary/5" : "hover:bg-muted/40"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
              receiverType === "self" ? "border-primary bg-primary/10" : "border-border bg-muted"
            }`}>
              {receiverType === "self" ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{phoneUser?.name || "أنا"}</p>
              <p className="text-xs text-muted-foreground">{phoneUser?.phone || ""}</p>
            </div>
          </button>
          {/* شخص آخر */}
          <button
            onClick={() => setReceiverType("other")}
            className={`flex flex-col items-center gap-2 p-4 transition-all ${
              receiverType === "other" ? "bg-primary/5" : "hover:bg-muted/40"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
              receiverType === "other" ? "border-primary bg-primary/10" : "border-border bg-muted"
            }`}>
              <Phone className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">شخص آخر يستلم الطلب</p>
            </div>
          </button>
        </div>
        {receiverType === "other" && (
          <div className="px-4 pb-4 border-t border-border pt-3">
            <Input
              value={otherPhone}
              onChange={e => setOtherPhone(e.target.value)}
              placeholder="رقم هاتف المستلم"
              className="rounded-xl text-right"
              dir="ltr"
            />
          </div>
        )}
      </div>

      {/* ─── ملخص المنتجات ─── */}
      <div className="customer-card mb-3 overflow-hidden">
        {cart.map((item: CartItem, idx: number) => {
          const menuItem = menuItems?.find((m: any) => m.id === item.id);
          return (
            <div key={item.id} className={`flex items-center gap-3 p-4 ${idx < cart.length - 1 ? "border-b border-border" : ""}`}>
              {menuItem?.imageUrl ? (
                <img src={menuItem.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm leading-tight">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.quantity} قطعة</p>
                <p className="font-black text-foreground text-sm mt-1">{(Number(item.price) * item.quantity).toFixed(2)} ﷼</p>
              </div>
              {/* Qty controls */}
              <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                <button
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-border transition-colors"
                  onClick={() => setCart((prev: CartItem[]) => {
                    if (prev.find(i => i.id === item.id)?.quantity === 1) return prev.filter(i => i.id !== item.id);
                    return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i);
                  })}
                ><Minus className="w-3 h-3" /></button>
                <span className="font-black text-sm w-5 text-center">{item.quantity}</span>
                <button
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-border transition-colors disabled:opacity-40"
                  onClick={() => {
                    // التحقق من المخزون عند زيادة الكمية في السلة
                    const menuItem = menuItems?.find((m: any) => m.id === item.id);
                    if (menuItem?.stockEnabled && menuItem?.stockCount !== null && menuItem?.stockCount !== undefined) {
                      if (item.quantity >= menuItem.stockCount) {
                        toast.error(`الكمية المتاحة من "${item.name}" هي ${menuItem.stockCount} فقط`);
                        return;
                      }
                    }
                    setCart((prev: CartItem[]) => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                  }}
                ><Plus className="w-3 h-3" /></button>
              </div>
            </div>
          );
        })}
        {/* وقت التوصيل المتوقع */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border">
          <span className="text-sm font-bold text-foreground">احصل عليها <span className="text-primary">اليوم</span></span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>30 - 60 دقيقة</span>
          </div>
        </div>
      </div>

      {/* ─── طريقة الدفع ─── */}
      <div className="customer-card mb-3 p-4">
        <h3 className="text-sm font-black text-foreground mb-3">طريقة الدفع</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "cash", label: "نقداً عند الاستلام", icon: "💵", desc: "ادفع عند استلام طلبك" },
            { value: "card", label: "بطاقة بنكية", icon: "💳", desc: "دفع إلكتروني آمن" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setPaymentMethod(opt.value)}
              className={`py-3 px-3 rounded-xl text-sm font-semibold border-2 transition-all text-right ${
                paymentMethod === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{opt.icon}</span>
                <span className="text-sm font-bold">{opt.label}</span>
              </div>
              <div className="text-xs font-normal text-muted-foreground">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── ملاحظات ─── */}
      <div className="customer-card mb-3 p-4">
        <h3 className="text-sm font-black text-foreground mb-2 flex items-center gap-2">
          📝 ملاحظات للطلب <span className="text-xs font-normal text-muted-foreground">(اختياري)</span>
        </h3>
        <textarea
          value={customerNotes}
          onChange={e => setCustomerNotes(e.target.value)}
          placeholder="مثال: بدون بصل، إضافة صلصة حارة..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-gray-400"
          rows={2}
        />
      </div>

      {/* ─── شريط الدفع السفلي الثابت ─── */}
      <div className="fixed bottom-16 right-0 left-0 px-4 py-3 z-40 shadow-2xl customer-nav">
        <div className="max-w-lg mx-auto">
          {/* تفاصيل السعر */}
          <div className="space-y-1 mb-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>المجموع الفرعي ({itemCount} صنف)</span>
              <span className="font-semibold text-foreground">{subtotal.toFixed(2)} ﷼</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>رسوم التوصيل</span>
              <span className={deliveryFeeNum > 0 ? "font-semibold text-foreground" : "font-semibold text-primary"}>
                {deliveryFeeNum > 0 ? `${deliveryFeeNum.toFixed(2)} ﷼` : "مجاني"}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-1">
              <span className="font-black text-foreground">الإجمالي</span>
              <span className="font-black text-primary text-sm">{total.toFixed(2)} ﷼</span>
            </div>
          </div>
          <Button
            className="w-full bg-primary text-white rounded-2xl h-13 text-base font-bold shadow-lg shadow-primary/20 flex items-center justify-between px-5 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleOrder}
            disabled={createOrder.isPending || cart.length === 0 || !addressForm.text || (!!addressForm.text && !!activeCity && !isCityDeliveryCovered)}
          >
            {createOrder.isPending ? (
              <div className="flex items-center gap-2 mx-auto">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري إرسال الطلب...</span>
              </div>
            ) : (
              <>
                <span className="text-sm opacity-90">{paymentMethod === "cash" ? "💵 نقداً" : "💳 بطاقة"}</span>
                <span>تأكيد الطلب</span>
                <span className="font-black">{total.toFixed(2)} ﷼</span>
              </>
            )}
          </Button>
          {!addressForm.text && (
            <p className="text-center text-xs text-red-500 mt-1">❗ يرجى إضافة عنوان التوصيل أولاً</p>
          )}
          {!!addressForm.text && !!activeCity && !isCityDeliveryCovered && (
            <p className="text-center text-xs text-red-500 mt-1">❌ عذراً، هذه المنطقة خارج نطاق التغطية. يرجى تغيير عنوان التوصيل</p>
          )}
        </div>
      </div>

      {/* Location Picker Modal */}
      <LocationPickerModal
        open={showAddressDialog}
        onOpenChange={setShowAddressDialog}
        onConfirm={(result) => {
          setAddressForm({ text: result.text, lat: result.lat, lng: result.lng });
        }}
        initialLat={addressForm.lat}
        initialLng={addressForm.lng}
      />
    </div>
  );
}

// ===== DRIVER RATING DIALOG =====
function DriverRatingDialog({ orderId, driverId, onClose }: { orderId: number; driverId: number; onClose: () => void }) {
  const [serviceRating, setServiceRating] = useState(0);
  const [speedRating, setSpeedRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredService, setHoveredService] = useState(0);
  const [hoveredSpeed, setHoveredSpeed] = useState(0);

  const submitMutation = trpc.ratings.submitRating.useMutation({
    onSuccess: () => {
      toast.success("شكراً لتقييمك! سيساعدنا في تحسين الخدمة");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const StarRow = ({
    value, hovered, onHover, onLeave, onSelect, label
  }: {
    value: number; hovered: number; onHover: (n: number) => void;
    onLeave: () => void; onSelect: (n: number) => void; label: string;
  }) => (
    <div className="mb-4">
      <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onSelect(n)}
            onMouseEnter={() => onHover(n)}
            onMouseLeave={onLeave}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={`w-9 h-9 transition-colors ${
                n <= (hovered || value)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-1">
          {value === 1 ? "سيء" : value === 2 ? "مقبول" : value === 3 ? "جيد" : value === 4 ? "ممتاز" : "رائع جداً"}
        </p>
      )}
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-black">قيّم المندوب</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Truck className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">كيف كانت تجربتك مع المندوب؟</p>
          </div>

          <StarRow
            label="جودة التعامل"
            value={serviceRating}
            hovered={hoveredService}
            onHover={setHoveredService}
            onLeave={() => setHoveredService(0)}
            onSelect={setServiceRating}
          />
          <StarRow
            label="سرعة التوصيل"
            value={speedRating}
            hovered={hoveredSpeed}
            onHover={setHoveredSpeed}
            onLeave={() => setHoveredSpeed(0)}
            onSelect={setSpeedRating}
          />

          <div className="mb-4">
            <Label className="text-sm font-semibold">تعليق (اختياري)</Label>
            <textarea
              className="w-full mt-1.5 p-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              rows={3}
              placeholder="شاركنا رأيك..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={onClose}
            >
              تخطي
            </Button>
            <Button
              className="flex-1 rounded-xl bg-primary text-white font-bold"
              disabled={serviceRating === 0 || speedRating === 0 || submitMutation.isPending}
              onClick={() =>
                submitMutation.mutate({
                  orderId,
                  driverId,
                  serviceRating,
                  speedRating,
                  comment: comment.trim() || undefined,
                })
              }
            >
              {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إرسال التقييم"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== TRACK VIEW =====
function TrackView({ orderId }: { orderId: number }) {
  const { data: order, refetch } = trpc.orders.getById.useQuery({ id: orderId });
  const { data: roundInfo } = trpc.rounds.getForOrder.useQuery(
    { orderId },
    { enabled: !!orderId, refetchInterval: 10000 }
  );
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const { data: ratingStatus } = trpc.ratings.hasRated.useQuery(
    { orderId },
    { enabled: !!orderId }
  );
  const confirmReceiptMutation = trpc.orders.confirmReceipt.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("تم تأكيد استلام طلبك بنجاح!");
      // فتح نافذة التقييم بعد تأكيد الاستلام
      setTimeout(() => setShowRatingDialog(true), 800);
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    const interval = setInterval(() => refetch(), 8000);
    return () => clearInterval(interval);
  }, [refetch]);

  const steps = [
    { key: "pending", label: "في انتظار المندوب", icon: Clock },
    { key: "driver_assigned", label: "تم تعيين مندوب", icon: Truck },
    { key: "picked_up", label: "المندوب استلم طلبك", icon: Package },
    { key: "on_the_way", label: "المندوب في الطريق إليك", icon: Truck },
    { key: "delivered", label: "تم التوصيل", icon: CheckCircle2 },
  ];

  const statusOrder = ["pending", "driver_assigned", "picked_up", "on_the_way", "delivered"];
  const currentIdx = statusOrder.indexOf(order?.status ?? "pending");

  if (!order) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const isConfirmed = !!(order as any).confirmedByCustomerAt;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Status card */}
      <div className="customer-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">رقم الطلب</p>
            <p className="font-black text-foreground text-lg">#{order.orderNumber}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {isCancelled ? (
          <div className="bg-red-50 border border-red-500/40 rounded-xl p-4 text-center">
            <X className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <div className="font-bold text-red-700">تم إلغاء الطلب</div>
            {(order as any).cancellationReason && (
              <div className="text-sm text-red-600 mt-1">{(order as any).cancellationReason}</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              const StepIcon = step.icon;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${done ? (active ? "bg-primary ring-4 ring-primary/20" : "bg-primary") : "bg-muted"}`}>
                    {done ? <StepIcon className="w-4 h-4 text-white" /> : <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${active ? "text-primary font-bold" : done ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                    {active && !isDelivered && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs text-primary">جاري الآن</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Round info: متبقى X طلب ويغادر المندوب */}
      {roundInfo && roundInfo.status === "collecting" && (
        <div className="customer-card p-4 border border-primary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">الدورة الجماعية</p>
              <p className="font-bold text-foreground text-sm">
                {roundInfo.maxOrders - roundInfo.currentCount > 0
                  ? `متبقى ${roundInfo.maxOrders - roundInfo.currentCount} طلب ويغادر المندوب`
                  : "المندوب على وشك المغادرة!"}
              </p>
              {roundInfo.scheduledDepartAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  موعد المغادرة: {new Date(roundInfo.scheduledDepartAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            <div className="text-left">
              <p className="text-2xl font-black text-primary">{roundInfo.currentCount}</p>
              <p className="text-xs text-muted-foreground">من {roundInfo.maxOrders}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (roundInfo.currentCount / roundInfo.maxOrders) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Driver info */}
      {(order as any).driverName && (
        <div className="customer-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">المندوب في الطريق إليك</p>
                <p className="font-bold text-foreground text-base">{(order as any).driverName}</p>
                {(order as any).driverPhone && (
                  <p className="text-xs text-muted-foreground mt-0.5">{(order as any).driverPhone}</p>
                )}
              </div>
            </div>
            {(order as any).driverPhone && (
              <a
                href={`tel:${(order as any).driverPhone}`}
                className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center hover:bg-primary/80 transition-colors"
              >
                <Phone className="w-5 h-5 text-white" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Delivery Address (text only, no map) */}
      {order.deliveryAddressText && (
        <div className="customer-card p-3 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span>{order.deliveryAddressText}</span>
        </div>
      )}

      {/* Delivery Proof Image */}
      {isDelivered && (order as any).deliveryProofImageUrl && (
        <div className="customer-card p-4">
          <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            صورة تأكيد التسليم
          </h3>
          <img
            src={(order as any).deliveryProofImageUrl}
            alt="صورة التسليم"
            className="w-full h-48 object-cover rounded-xl"
          />
        </div>
      )}

      {/* Confirm Receipt */}
      {isDelivered && !isConfirmed && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <div className="text-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
            <h3 className="font-bold text-primary">وصل طلبك!</h3>
            <p className="text-sm text-primary/70 mt-1">قام المندوب بتوصيل طلبك. هل استلمته بنجاح؟</p>
          </div>
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold mb-3"
            onClick={() => confirmReceiptMutation.mutate({ orderId: order.id })}
            disabled={confirmReceiptMutation.isPending}
          >
            {confirmReceiptMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <CheckCircle2 className="w-4 h-4 ml-2" />}
            تأكيد استلام الطلب
          </Button>
          {/* أيقونة تقييم المندوب تظهر مباشرة بعد التسليم */}
          {order.driverId && !ratingStatus?.hasRated && (
            <Button
              variant="outline"
              className="w-full rounded-xl border-primary text-primary hover:bg-primary/5 bg-white"
              onClick={() => setShowRatingDialog(true)}
            >
              <Star className="w-4 h-4 ml-1 fill-yellow-400 text-yellow-400" />
              قيّم المندوب
            </Button>
          )}
          {ratingStatus?.hasRated && (
            <div className="flex items-center justify-center gap-1 mt-1 text-sm text-primary">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span>شكراً على تقييمك!</span>
            </div>
          )}
        </div>
      )}

      {isDelivered && isConfirmed && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
          <h3 className="font-bold text-primary">تم تأكيد الاستلام</h3>
          <p className="text-sm text-primary/70 mt-1">شكراً لاستخدامك منصة شوبر!</p>
          {/* زر تقييم المندوب إذا لم يقيّم بعد */}
          {order.driverId && !ratingStatus?.hasRated && (
            <Button
              variant="outline"
              className="mt-3 rounded-xl border-primary text-primary hover:bg-primary/5"
              onClick={() => setShowRatingDialog(true)}
            >
              <Star className="w-4 h-4 ml-1 fill-yellow-400 text-yellow-400" />
              قيّم المندوب
            </Button>
          )}
          {ratingStatus?.hasRated && (
            <div className="flex items-center justify-center gap-1 mt-2 text-sm text-primary">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span>شكراً على تقييمك!</span>
            </div>
          )}
        </div>
      )}

      {/* نافذة تقييم المندوب */}
      {showRatingDialog && order.driverId && (
        <DriverRatingDialog
          orderId={order.id}
          driverId={order.driverId}
          onClose={() => setShowRatingDialog(false)}
        />
      )}

      {/* Order summary */}
      <div className="customer-card p-4">
        <h3 className="font-bold text-foreground text-sm mb-3">تفاصيل الطلب</h3>
        {(order as any).restaurantName && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-primary/5 rounded-xl">
            <Store className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground">{(order as any).restaurantName}</span>
          </div>
        )}
        <div className="space-y-2 text-sm">
          {order.items?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-muted-foreground">
              <span>{item.name} × {item.quantity}</span>
              <span>{(Number(item.price) * item.quantity).toFixed(2)} ريال</span>
            </div>
          ))}
          <div className="flex justify-between text-muted-foreground border-t border-border pt-2">
            <span>المجموع الفرعي</span>
            <span>{order.items?.reduce((s: number, i: any) => s + Number(i.price) * i.quantity, 0).toFixed(2)} ريال</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>رسوم التوصيل</span>
            <span>{Number(order.deliveryFee ?? 0) > 0 ? `${Number(order.deliveryFee).toFixed(2)} ريال` : "مجاني"}</span>
          </div>
          <div className="flex justify-between font-black border-t border-border pt-2">
            <span>الإجمالي</span>
            <span className="text-primary">{Number(order.total).toFixed(2)} ريال</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MY ORDERS VIEW =====
function MyOrdersView({ onTrack }: { onTrack: (id: number) => void }) {
  const { data: orders, isLoading } = trpc.orders.myOrders.useQuery();
  const { data: unratedData, refetch: refetchUnrated } = trpc.ratings.getUnratedDeliveredOrderIds.useQuery();
  const [ratingOrderId, setRatingOrderId] = useState<number | null>(null);
  const [ratingDriverId, setRatingDriverId] = useState<number | null>(null);

  const unratedSet = new Set((unratedData?.unratedOrderIds ?? []).map((x: any) => x.orderId));
  const driverIdMap = Object.fromEntries((unratedData?.unratedOrderIds ?? []).map((x: any) => [x.orderId, x.driverId]));

  const ORDER_STATUS_LABELS: Record<string, string> = {
    pending: "قيد الانتظار", preparing: "يُحضَّر", driver_assigned: "تم تعيين مندوب",
    picked_up: "تم الاستلام", on_the_way: "في الطريق", delivered: "تم التوصيل", cancelled: "ملغي",
  };
  const ORDER_STATUS_COLORS: Record<string, string> = {
    pending: "bg-primary/5 text-primary border border-primary/20", preparing: "bg-primary/10 text-primary border border-primary/30",
    driver_assigned: "bg-primary/10 text-primary border border-primary/30", picked_up: "bg-primary/15 text-primary border border-primary/30",
    on_the_way: "bg-primary/20 text-primary border border-primary/40", delivered: "bg-primary/25 text-primary border border-primary/40",
    cancelled: "bg-red-50 text-red-700 border border-red-200",
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!orders || orders.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
        <ClipboardList className="w-10 h-10 text-primary/40" />
      </div>
      <p className="text-muted-foreground text-center">لا توجد طلبات بعد</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {orders.map((order: any) => {
        const isActive = !["delivered", "cancelled"].includes(order.status);
        return (
          <div
            key={order.id}
            className={`customer-card p-4 cursor-pointer transition-all ${isActive ? "border-primary/40" : ""}`}
            onClick={() => isActive && onTrack(order.id)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">طلب #{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("ar-SA")}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                {ORDER_STATUS_LABELS[order.status] ?? order.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{order.restaurantName ?? "مطعم"}</span>
              <span className="font-bold text-primary">{Number(order.total)} ريال</span>
            </div>
            {isActive && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-primary">
                <Truck className="w-3.5 h-3.5" />
                <span>اضغط لتتبع الطلب</span>
                <ArrowRight className="w-3.5 h-3.5 mr-auto" />
              </div>
            )}
            {/* تذكير بالتقييم للطلبات المسلّمة غير المقيّمة */}
            {order.status === "delivered" && unratedSet.has(order.id) && (
              <div className="mt-3 pt-3 border-t border-primary/10">
                <button
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-primary/5 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRatingOrderId(order.id);
                    setRatingDriverId(driverIdMap[order.id]);
                  }}
                >
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  قيّم المندوب — لم تقيّم بعد
                </button>
              </div>
            )}
          </div>
        );
      })}
      {/* نافذة التقييم من صفحة طلباتي */}
      {ratingOrderId !== null && ratingDriverId !== null && (
        <DriverRatingDialog
          orderId={ratingOrderId}
          driverId={ratingDriverId}
          onClose={() => {
            setRatingOrderId(null);
            setRatingDriverId(null);
            refetchUnrated();
          }}
        />
      )}
    </div>
  );
}

// ===== PROFILE VIEW =====
function ProfileView({ phoneUser, onLogout, onUpdate }: {
  phoneUser: any;
  onLogout: () => void;
  onUpdate: (updated: any) => void;
}) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState(phoneUser?.addressText ?? "");
  const [doorImagePreview, setDoorImagePreview] = useState<string | null>(phoneUser?.doorImageUrl ?? null);
  const [uploadingDoor, setUploadingDoor] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Helper: detect raw coordinates
  const isRawCoordsProfile = (s: string) => /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(s?.trim() ?? "");

  // Determine which address to display (pinnedAddressText takes priority)
  const displayedAddress = phoneUser?.pinnedAddressText || phoneUser?.addressText;
  const displayedLat = phoneUser?.pinnedAddressLat || phoneUser?.addressLat;
  const displayedLng = phoneUser?.pinnedAddressLng || phoneUser?.addressLng;

  // Reverse geocode if displayed address is raw coordinates
  const needsGeocode = !!(displayedAddress && isRawCoordsProfile(displayedAddress) && displayedLat && displayedLng);
  const geocodeQuery = trpc.cities.reverseGeocode.useQuery(
    { lat: Number(displayedLat), lng: Number(displayedLng) },
    { enabled: needsGeocode, staleTime: 1000 * 60 * 10 }
  );
  const resolvedDisplayAddress = needsGeocode && geocodeQuery.data?.address
    ? geocodeQuery.data.address
    : displayedAddress;

  const utils = trpc.useUtils();

  const updateProfileMutation = trpc.phoneAuth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("تم الحفظ بنجاح");
      utils.phoneAuth.me.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadDoorMutation = trpc.upload.customerImage.useMutation({
    onSuccess: async (data) => {
      await updateProfileMutation.mutateAsync({ doorImageUrl: data.url });
      setDoorImagePreview(data.url);
      onUpdate({ doorImageUrl: data.url });
      toast.success("تم رفع صورة الباب");
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setUploadingDoor(false),
  });

  const handleDoorImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoor(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      uploadDoorMutation.mutate({ base64, folder: "door-images" });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAddress = async () => {
    await updateProfileMutation.mutateAsync({ addressText: newAddress });
    onUpdate({ addressText: newAddress });
    setEditingAddress(false);
  };

  const handleLocationConfirm = async (result: { text: string; lat: number; lng: number }) => {
    // استخراج اسم المدينة من الإحداثيات عبر Reverse Geocoding
    let cityName = "";
    try {
      const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
      const FORGE_BASE_URL = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
      const res = await fetch(
        `${FORGE_BASE_URL}/v1/maps/proxy/maps/api/geocode/json?latlng=${result.lat},${result.lng}&key=${API_KEY}&language=ar`
      );
      const data = await res.json();
      if (data.results?.[0]?.address_components) {
        const comps = data.results[0].address_components;
        const cityComp = comps.find((c: any) =>
          c.types.includes("locality") ||
          c.types.includes("administrative_area_level_2") ||
          c.types.includes("administrative_area_level_1")
        );
        cityName = cityComp?.long_name ?? "";
      }
    } catch { /* تجاهل الخطأ */ }

    // Save to both addressText and pinnedAddressText so it's used in cart automatically
    await updateProfileMutation.mutateAsync({
      addressText: result.text,
      addressLat: String(result.lat),
      addressLng: String(result.lng),
      pinnedAddressText: result.text,
      pinnedAddressLat: String(result.lat),
      pinnedAddressLng: String(result.lng),
      ...(cityName && { pinnedAddressCityName: cityName }),
    });
    onUpdate({
      addressText: result.text,
      addressLat: String(result.lat),
      addressLng: String(result.lng),
      pinnedAddressText: result.text,
      pinnedAddressLat: String(result.lat),
      pinnedAddressLng: String(result.lng),
      ...(cityName && { pinnedAddressCityName: cityName }),
    });
    setShowLocationPicker(false);
    toast.success("تم تحديث عنوان التوصيل");
  };

  const handlePinAddress = async () => {
    if (!phoneUser?.addressText) {
      toast.error("لا يوجد عنوان محفوظ لتثبيته");
      return;
    }
    await updateProfileMutation.mutateAsync({
      pinnedAddressText: phoneUser.addressText,
      pinnedAddressLat: phoneUser.addressLat ?? undefined,
      pinnedAddressLng: phoneUser.addressLng ?? undefined,
    });
    onUpdate({ pinnedAddressText: phoneUser.addressText });
    toast.success("تم تثبيت العنوان");
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* User Info Card */}
      <div className="customer-card p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
            <UserCircle className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-black text-foreground text-lg">{phoneUser?.name ?? "مستخدم"}</p>
            <p className="text-sm text-muted-foreground font-mono">{phoneUser?.phone}</p>
          </div>
        </div>
      </div>

      {/* Address Card */}
      <div className="customer-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-foreground text-sm">عنوان التوصيل</h3>
          </div>
          <button
            onClick={() => setShowLocationPicker(true)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            تغيير
          </button>
        </div>

        {editingAddress ? (
          <div className="space-y-2">
            <textarea
              value={newAddress}
              onChange={e => setNewAddress(e.target.value)}
              placeholder="أدخل عنوانك التفصيلي..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-gray-400"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveAddress}
                disabled={updateProfileMutation.isPending}
                className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-bold flex items-center justify-center gap-2"
              >
                {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                حفظ
              </button>
              <button onClick={() => setEditingAddress(false)} className="px-4 rounded-xl bg-gray-50 text-muted-foreground text-sm">
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {geocodeQuery.isLoading && needsGeocode ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري تحديد العنوان...</span>
              </div>
            ) : (
              <p className="text-sm text-foreground font-medium">
                {resolvedDisplayAddress ?? "لم يتم تحديد عنوان بعد"}
              </p>
            )}
          </div>
        )}


      </div>

      {/* Door Image Card */}
      <div className="customer-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground text-sm">صورة الباب</h3>
          <span className="text-xs text-muted-foreground">(لتسهيل التوصيل)</span>
        </div>

        {doorImagePreview ? (
          <div className="relative">
            <img src={doorImagePreview} alt="صورة الباب" className="w-full h-40 object-cover rounded-xl" />
            <label className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-gray-800/70 text-white text-xs px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-800/90 transition-colors">
              <Camera className="w-3.5 h-3.5" />
              تغيير الصورة
              <input type="file" accept="image/*" className="hidden" onChange={handleDoorImageChange} />
            </label>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-3 h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
            {uploadingDoor ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : (
              <>
                <Camera className="w-8 h-8 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">اضغط لرفع صورة الباب</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleDoorImageChange} disabled={uploadingDoor} />
          </label>
        )}
      </div>

      {/* ===== دعم العملاء ===== */}
      <SupportSection phoneUser={phoneUser} />
      {/* ===== سياسات الاستخدام ===== */}
      <div className="space-y-2">
        <a
          href="/privacy"
          target="_blank"
          className="w-full flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground text-sm">سياسة الخصوصية</p>
              <p className="text-muted-foreground text-xs">اطلع على حقوقك وبياناتك</p>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </a>
        <a
          href="/terms"
          target="_blank"
          className="w-full flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="text-right">
              <p className="font-bold text-foreground text-sm">شروط الاستخدام</p>
              <p className="text-muted-foreground text-xs">اطلع على شروط وأحكام المنصة</p>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </a>
      </div>
      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-2xl py-4 font-bold transition-all"
      >
        <LogOut className="w-5 h-5" />
        تسجيل الخروج
      </button>

      {/* Location Picker Modal */}
      <LocationPickerModal
        open={showLocationPicker}
        onOpenChange={setShowLocationPicker}
        onConfirm={handleLocationConfirm}
        initialLat={phoneUser?.addressLat ? Number(phoneUser.addressLat) : undefined}
        initialLng={phoneUser?.addressLng ? Number(phoneUser.addressLng) : undefined}
      />
    </div>
  );
}

// ===== GOOGLE PLACE ORDER VIEW =====
// صفحة طلب كاملة من مطعم Google Maps
function GooglePlaceOrderView({
  place,
  addressForm,
  setAddressForm,
  paymentMethod,
  setPaymentMethod,
  phoneUser,
  coverageDeliveryFee,
  selectedFromCity,
  selectedStreet,
  onSuccess,
  onBack,
}: {
  place: any;
  addressForm: { text: string; lat: string; lng: string };
  setAddressForm: (v: any) => void;
  paymentMethod: "cash" | "card";
  setPaymentMethod: (v: "cash" | "card") => void;
  phoneUser: any;
  coverageDeliveryFee: string;
  selectedFromCity: { id: number; name: string } | null;
  selectedStreet: { id: number; name: string } | null;
  onSuccess: (orderId: number) => void;
  onBack: () => void;
}) {
  const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
  const BASE = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
  const photoUrl = place.photoRef
    ? `${BASE}/v1/maps/proxy/maps/api/place/photo?maxwidth=600&photo_reference=${place.photoRef}&key=${API_KEY}`
    : null;

  // Menu from admin (Google Place menu)
  const [activeCatTab, setActiveCatTab] = useState<number | null>(null);
  const { data: gpCats } = trpc.googlePlaces.getCategories.useQuery(
    { placeDbId: place.id ?? 0 },
    { enabled: !!place.id }
  );
  const { data: gpItems } = trpc.googlePlaces.getMenuItems.useQuery(
    { placeDbId: place.id ?? 0 },
    { enabled: !!place.id }
  );
  const hasMenu = gpItems && gpItems.length > 0;
  const filteredGpItems = activeCatTab
    ? gpItems?.filter((i: any) => i.categoryId === activeCatTab)
    : gpItems;
  // Custom cart items (name + price + quantity)
  const [customItems, setCustomItems] = useState<{ id: string; name: string; price: string; quantity: number }[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // إدخال تلقائي للأصناف المختارة من ExploreTab
  useEffect(() => {
    if (place.prefilledItems && place.prefilledItems.length > 0) {
      const items = place.prefilledItems.map((item: any) => ({
        id: Date.now().toString() + Math.random(),
        name: item.name,
        price: item.price || "0",
        quantity: item.quantity || 1,
      }));
      setCustomItems(items);
      toast.success(`تم إدخال ${items.length} صنف تلقائياً من المنيو ✅`);
    }
  }, [place.placeId]);

  const utils = trpc.useUtils();
  const updateProfileMutation = trpc.phoneAuth.updateProfile.useMutation();
  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("تم إرسال طلبك بنجاح!");
      // Auto-save delivery address
      if (addressForm.text && !/^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(addressForm.text.trim())) {
        updateProfileMutation.mutate({
          pinnedAddressText: addressForm.text,
          pinnedAddressLat: addressForm.lat || undefined,
          pinnedAddressLng: addressForm.lng || undefined,
        }, { onSuccess: () => utils.phoneAuth.me.invalidate() });
      }
      onSuccess(data.orderId);
    },
    onError: (e: any) => toast.error(e.message || "حدث خطأ"),
  });

  // Auto-fill saved address
  useEffect(() => {
    if (!addressForm.text && phoneUser?.pinnedAddressText) {
      setAddressForm({
        text: phoneUser.pinnedAddressText,
        lat: phoneUser.pinnedAddressLat ?? "",
        lng: phoneUser.pinnedAddressLng ?? "",
      });
    }
  }, [phoneUser]);

  const addItem = () => {
    if (!newItemName.trim()) { toast.error("أدخل اسم الصنف"); return; }
    const price = parseFloat(newItemPrice) || 0;
    setCustomItems(prev => [...prev, { id: Date.now().toString(), name: newItemName.trim(), price: price.toFixed(2), quantity: 1 }]);
    setNewItemName("");
    setNewItemPrice("");
  };

  const removeItem = (id: string) => setCustomItems(prev => prev.filter(i => i.id !== id));
  const updateQty = (id: string, delta: number) => {
    setCustomItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const subtotal = customItems.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
  const deliveryFeeNum = parseFloat(coverageDeliveryFee ?? "0") || 0;
  const total = subtotal + deliveryFeeNum;

  const handleLocate = () => {
    if (!navigator.geolocation) { toast.error("المتصفح لا يدعم تحديد الموقع"); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(`${BASE}/v1/maps/proxy/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}&language=ar`);
          const data = await res.json();
          const address = data.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setAddressForm({ text: address, lat: String(lat), lng: String(lng) });
          toast.success("تم تحديد موقعك");
        } catch {
          setAddressForm({ text: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat: String(lat), lng: String(lng) });
        }
        setIsLocating(false);
      },
      () => { setIsLocating(false); toast.error("تعذّر تحديد موقعك"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOrder = () => {
    if (customItems.length === 0) { toast.error("أضف صنفاً واحداً على الأقل"); return; }
    if (!addressForm.text) { setShowAddressDialog(true); return; }
    createOrder.mutate({
      restaurantId: 0,
      items: customItems.map(i => ({ menuItemId: 0, name: i.name, price: i.price, quantity: i.quantity })),
      deliveryAddressText: addressForm.text,
      deliveryLat: addressForm.lat || undefined,
      deliveryLng: addressForm.lng || undefined,
      paymentMethod,
      customerNotes: customerNotes || undefined,
      deliveryFee: coverageDeliveryFee ?? "0",
      googlePlaceName: place.name,
      googlePlaceId: place.placeId,
      cityId: selectedFromCity?.id,
      streetId: selectedStreet?.id,
    });
  };

  const isRestaurant = place.types?.includes("restaurant");
  const isCafe = place.types?.includes("cafe") || place.types?.includes("coffee");
  const typeLabel = isCafe ? "كافيه" : isRestaurant ? "مطعم" : "مطعم / كافيه";

  return (
    <div className="max-w-lg mx-auto pb-44" dir="rtl">
      {/* Restaurant Header Card */}
      <div className="customer-card overflow-hidden mb-4">
        {photoUrl && (
          <div className="h-44 relative overflow-hidden">
            <img src={photoUrl} alt={place.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-3 right-3">
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">خرائط جوجل</span>
            </div>
            {place.isOpen === true && (
              <div className="absolute top-3 left-3">
                <span className="text-xs bg-primary/80 text-white px-2 py-0.5 rounded-full">مفتوح</span>
              </div>
            )}
            {place.isOpen === false && (
              <div className="absolute top-3 left-3">
                <span className="text-xs bg-red-500/80 text-white px-2 py-0.5 rounded-full">مغلق</span>
              </div>
            )}
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-xl">🍽️</span>
            </div>
            <div className="flex-1">
              <h2 className="font-black text-foreground text-lg leading-tight">{place.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{typeLabel}</span>
                {place.rating && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    {place.rating.toFixed(1)}
                    {place.userRatingsTotal > 0 && ` (${place.userRatingsTotal.toLocaleString()})`}
                  </span>
                )}
              </div>
              {place.address && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{place.address}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ADMIN MENU SECTION (if menu items exist) ── */}
      {hasMenu && (
        <div className="customer-card p-4 mb-4">
          <h3 className="font-black text-foreground mb-3 flex items-center gap-2">
            <span className="text-lg">🍴</span>
            قائمة المطعم
          </h3>
          {/* Category Tabs */}
          {gpCats && gpCats.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
              <button
                onClick={() => setActiveCatTab(null)}
                className={`shrink-0 px-4 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                  !activeCatTab ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40'
                }`}
              >
                الكل
              </button>
              {gpCats.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCatTab(activeCatTab === c.id ? null : c.id)}
                  className={`shrink-0 px-4 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                    activeCatTab === c.id ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-primary/40'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {/* Items Grid */}
          <div className="grid grid-cols-2 gap-3">
            {filteredGpItems?.map((item: any) => {
              const inCart = customItems.find(ci => ci.name === item.name);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border-2 overflow-hidden transition-all cursor-pointer ${
                    inCart ? 'border-primary/60 shadow-lg shadow-primary/10' : 'border-gray-100 hover:border-primary/30'
                  }`}
                  onClick={() => {
                    if (inCart) {
                      setCustomItems(prev => prev.map(ci =>
                        ci.name === item.name ? { ...ci, quantity: ci.quantity + 1 } : ci
                      ));
                    } else {
                      setCustomItems(prev => [...prev, {
                        id: `menu-${item.id}`,
                        name: item.name,
                        price: item.price,
                        quantity: 1,
                      }]);
                    }
                    toast.success(`تمت إضافة ${item.name}`);
                  }}
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 bg-gray-100 flex items-center justify-center">
                      <span className="text-3xl">🍴</span>
                    </div>
                  )}
                  <div className="p-2.5">
                    <div className="font-bold text-xs text-foreground truncate">{item.name}</div>
                    {item.description && <div className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</div>}
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex flex-col">
                        {item.discountPrice && parseFloat(item.discountPrice) > 0 ? (
                          <>
                            <span className="font-black text-primary text-sm">{item.discountPrice} ريال</span>
                            <span className="text-xs text-muted-foreground line-through">{item.price} ريال</span>
                          </>
                        ) : (
                          <span className="font-black text-primary text-sm">{item.price} ريال</span>
                        )}
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); setCustomItems(prev => prev.map(ci => ci.name === item.name ? { ...ci, quantity: Math.max(1, ci.quantity - 1) } : ci)); }}
                            className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{inCart.quantity}</span>
                          <button
                            onClick={e => { e.stopPropagation(); setCustomItems(prev => prev.map(ci => ci.name === item.name ? { ...ci, quantity: ci.quantity + 1 } : ci)); }}
                            className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-xs"
                          >
                            <Plus className="w-3 h-3 text-primary" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">إضافة +</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Add Items Section */}
      <div className="customer-card p-4 mb-4">
        <h3 className="font-black text-foreground mb-3 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          {hasMenu ? 'إضافة صنف آخر' : 'أضف الأصناف التي تريدها'}
        </h3>
        {!hasMenu && <p className="text-xs text-muted-foreground mb-4">اكتب اسم الصنف والسعر التقريبي، وسيقوم المندوب بشرائه لك</p>}

        {/* Add item form */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addItem()}
            placeholder="اسم الصنف (مثال: كوب قهوة)"
            className="flex-1 rounded-xl border border-gray-100 bg-gray-50 text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
          <input
            type="number"
            value={newItemPrice}
            onChange={e => setNewItemPrice(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addItem()}
            placeholder="السعر"
            min="0"
            className="w-20 rounded-xl border border-gray-100 bg-gray-50 text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
          <button
            onClick={addItem}
            className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Items list */}
        {customItems.length === 0 ? (
          <div className="flex flex-col items-center py-6 gap-2 text-muted-foreground">
            <span className="text-3xl">🛒</span>
            <p className="text-sm">لم تضف أي أصناف بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{parseFloat(item.price) > 0 ? `${item.price} ريال` : "السعر غير محدد"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-foreground text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors">
                    <Plus className="w-3.5 h-3.5 text-primary" />
                  </button>
                  <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors mr-1">
                    <X className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subtotal */}
        {customItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">المجموع التقريبي</span>
            <span className="font-black text-foreground">{subtotal.toFixed(2)} ريال</span>
          </div>
        )}
      </div>

      {/* Address Section */}
      <div className="customer-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-foreground flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            عنوان التوصيل
          </h3>
          <button
            onClick={() => setShowAddressDialog(true)}
            className="text-xs text-primary font-bold hover:underline"
          >
            {addressForm.text ? "تغيير" : "إضافة عنوان"}
          </button>
        </div>
        {addressForm.text ? (
          <div className="flex items-start gap-2 bg-primary/10 rounded-xl px-3 py-2.5">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">{addressForm.text}</p>
          </div>
        ) : (
          <button
            onClick={() => setShowAddressDialog(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 text-sm hover:border-primary/40 hover:text-primary transition-colors"
          >
            اضغط لإضافة عنوان التوصيل
          </button>
        )}
      </div>

      {/* Notes */}
      <div className="customer-card p-4 mb-4">
        <h3 className="font-black text-foreground mb-2 text-sm flex items-center gap-2">
          <span>📝</span> ملاحظات إضافية
        </h3>
        <textarea
          value={customerNotes}
          onChange={e => setCustomerNotes(e.target.value)}
          placeholder="أي تعليمات خاصة للمندوب... (اختياري)"
          rows={2}
          className="w-full rounded-xl border border-gray-100 bg-gray-50 text-foreground px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
        />
      </div>

      {/* Payment Method */}
      <div className="customer-card p-4 mb-4">
        <h3 className="font-black text-foreground mb-3 text-sm">طريقة الدفع</h3>
        <div className="grid grid-cols-2 gap-2">
          {(["cash", "card"] as const).map(m => (
            <button
              key={m}
              onClick={() => setPaymentMethod(m)}
              className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${paymentMethod === m ? "border-primary bg-primary/10 text-primary" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-primary/30"}`}
            >
              {m === "cash" ? "💵 نقداً" : "💳 بطاقة"}
            </button>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      {customItems.length > 0 && (
        <div className="customer-card p-4 mb-4">
          <h3 className="font-black text-foreground mb-3 text-sm">ملخص الطلب</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>المجموع الفرعي</span>
              <span>{subtotal.toFixed(2)} ريال</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>رسوم التوصيل</span>
              <span>{deliveryFeeNum > 0 ? `${deliveryFeeNum.toFixed(2)} ريال` : "مجاني"}</span>
            </div>
            <div className="flex justify-between font-black text-foreground text-base pt-2 border-t border-gray-100">
              <span>الإجمالي التقريبي</span>
              <span className="text-primary">{total.toFixed(2)} ريال</span>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Button */}
        <div className="fixed bottom-0 right-0 left-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-100 z-20">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleOrder}
            disabled={createOrder.isPending || customItems.length === 0 || !addressForm.text}
            className="w-full py-4 rounded-2xl bg-primary text-white font-black text-base flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createOrder.isPending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> جاري الإرسال...</>
            ) : (
              <><ShoppingCart className="w-5 h-5" /> تأكيد الطلب من {place.name}</>
            )}
          </button>
          {!addressForm.text && (
            <p className="text-xs text-center text-primary mt-2">⚠️ يجب إضافة عنوان التوصيل أولاً</p>
          )}
          {customItems.length === 0 && (
            <p className="text-xs text-center text-muted-foreground mt-2">أضف صنفاً واحداً على الأقل للمتابعة</p>
          )}
        </div>
      </div>

      {/* Address Dialog */}
      {showAddressDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end" dir="rtl">
          <div className="w-full bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="font-black text-gray-900 text-lg mb-4">عنوان التوصيل</h3>
            <button
              onClick={handleLocate}
              disabled={isLocating}
              className="w-full mb-3 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm transition-all"
            >
              {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              {isLocating ? "جاري تحديد موقعك..." : "استخدم موقعي الحالي"}
            </button>
            <textarea
              value={addressForm.text}
              onChange={e => setAddressForm((p: any) => ({ ...p, text: e.target.value }))}
              placeholder="أو اكتب عنوانك التفصيلي..."
              rows={3}
              className="w-full rounded-xl border border-gray-100 bg-gray-50 text-foreground px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddressDialog(false)}
                disabled={!addressForm.text}
                className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm disabled:opacity-50"
              >
                تأكيد العنوان
              </button>
              <button
                onClick={() => setShowAddressDialog(false)}
                className="px-5 rounded-2xl bg-gray-50 text-muted-foreground text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== SUPPORT SECTION =====
const COMPLAINT_STATUS_LABELS_C: Record<string, string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  resolved: "محلولة",
  closed: "مغلقة",
};
const COMPLAINT_STATUS_COLORS_C: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  in_progress: "bg-primary/15 text-primary",
  resolved: "bg-primary/10 text-primary",
  closed: "bg-gray-500/10 text-gray-400",
};

function SupportSection({ phoneUser }: { phoneUser: any }) {
  const [supportTab, setSupportTab] = useState<"new" | "mine">("new");
  const [showSupport, setShowSupport] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"delivery" | "driver" | "restaurant" | "payment" | "other">("other");
  const [orderNumber, setOrderNumber] = useState("");

  const myComplaintsQuery = trpc.government.listMyComplaints.useQuery(
    { userId: phoneUser?.id ?? 0 },
    { enabled: !!phoneUser?.id && showSupport && supportTab === "mine", refetchInterval: showSupport && supportTab === "mine" ? 30000 : false }
  );

  const submitComplaint = trpc.government.submitComplaint.useMutation({
    onSuccess: () => {
      toast.success("تم استلام شكواك وسيتم الرد خلال 24 ساعة");
      setSupportTab("mine");
      setSubject("");
      setDescription("");
      setOrderNumber("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!subject.trim()) { toast.error("أدخل موضوع الشكوى"); return; }
    if (!description.trim() || description.length < 10) { toast.error("الوصف يجب أن يكون 10 أحرف على الأقل"); return; }
    submitComplaint.mutate({
      userId: phoneUser?.id,
      userPhone: phoneUser?.phone,
      userName: phoneUser?.name ?? undefined,
      orderNumber: orderNumber || undefined,
      category,
      subject,
      description,
    });
  };

  return (
    <div className="mb-4" dir="rtl">
      {/* زر فتح الدعم */}
      <button
        onClick={() => setShowSupport(true)}
        className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border text-right transition-all hover:bg-muted/30"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Phone className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-foreground text-sm">دعم العملاء</p>
          <p className="text-xs text-muted-foreground">تقديم شكوى أو متابعة شكاواك</p>
        </div>
        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Bottom Sheet */}
      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-end" dir="rtl">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSupport(false)} />
          <div className="relative w-full bg-background rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                دعم العملاء
              </h3>
              <button onClick={() => setShowSupport(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setSupportTab("new")}
            className={`flex-1 py-3 text-sm font-bold transition-all ${
              supportTab === "new"
                ? "bg-primary/5 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            تقديم شكوى
          </button>
          <button
            onClick={() => setSupportTab("mine")}
            className={`flex-1 py-3 text-sm font-bold transition-all ${
              supportTab === "mine"
                ? "bg-primary/5 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            شكاواي
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {supportTab === "new" ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">نوع المشكلة</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: "delivery", l: "التوصيل" },
                    { v: "driver", l: "المندوب" },
                    { v: "restaurant", l: "المطعم" },
                    { v: "payment", l: "الدفع" },
                    { v: "other", l: "أخرى" },
                  ] as const).map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => setCategory(v)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${category === v ? "bg-primary text-white border-primary" : "bg-background text-foreground border-border"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">رقم الطلب (اختياري)</label>
                <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="مثال: 1234" className="h-9 text-sm" style={{ color: '#000', backgroundColor: '#fff' }} />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">موضوع الشكوى *</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="اكتب موضوع الشكوى..." className="h-9 text-sm" style={{ color: '#000', backgroundColor: '#fff' }} />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">تفاصيل المشكلة *</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اشرح المشكلة بالتفصيل..." rows={3} className="w-full rounded-lg border border-border p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" style={{ color: '#000', backgroundColor: '#fff' }} />
              </div>
              <Button size="sm" className="w-full bg-primary text-white" onClick={handleSubmit} disabled={submitComplaint.isPending}>
                {submitComplaint.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <CheckCircle className="w-4 h-4 ml-1" />}
                إرسال الشكوى
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {myComplaintsQuery.isLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : !myComplaintsQuery.data?.length ? (
                <div className="text-center py-4 text-sm text-muted-foreground">لا توجد شكاوى مسجلة</div>
              ) : (
                myComplaintsQuery.data.map((c: any) => (
                  <div key={c.id} className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-bold text-sm text-foreground">{c.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(c.createdAt).toLocaleDateString("ar-SA")}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${COMPLAINT_STATUS_COLORS_C[c.status] ?? "bg-gray-500/10 text-gray-400"}`}>
                        {COMPLAINT_STATUS_LABELS_C[c.status] ?? c.status}
                      </span>
                    </div>
                    {c.adminReply && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5">
                        <p className="text-xs font-bold text-primary mb-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          رد الإدارة
                        </p>
                        <p className="text-xs text-primary/80">{c.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== SHOPPER CUSTOMER VIEW =====
function ShopperCustomerView({ phoneUser }: { phoneUser: any }) {
  const trpcUtils = trpc.useUtils();
  const [subView, setSubView] = useState<"trips" | "my-bookings" | "book">("trips");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingBookingId, setRatingBookingId] = useState<number | null>(null);
  const [ratingDriverId, setRatingDriverId] = useState<number | null>(null);
  const [ratingForm, setRatingForm] = useState({ accuracy: 5, speed: 5, cooperation: 5, comment: "" });
  const submitRatingMutation = trpc.shopper.submitRating.useMutation({
    onSuccess: () => { toast.success("شكراً على تقييمك!"); setShowRatingModal(false); refetchBookings(); },
    onError: (e) => toast.error(e.message),
  });
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showPickupPicker, setShowPickupPicker] = useState(false);
  const [showConfirmInvoice, setShowConfirmInvoice] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<{ text: string; lat: number; lng: number } | null>(null);
  // Places picker state
  const [showPlacesPicker, setShowPlacesPicker] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesList, setPlacesList] = useState<Array<{ name: string; address: string; placeId: string; lat: number; lng: number; rating?: number; photoUrl?: string }>>([]); 
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [placesMapRef, setPlacesMapRef] = useState<any>(null);
  const [placesOutOfRange, setPlacesOutOfRange] = useState(false);
  const [placesPin, setPlacesPin] = useState<{ lat: number; lng: number } | null>(null);
  const [placesAddress, setPlacesAddress] = useState<string>("");
  const [placesSearchQuery, setPlacesSearchQuery] = useState("");
  const [placesStep, setPlacesStep] = useState<"map" | "list">("map");
  const [placesLocating, setPlacesLocating] = useState(false);
  const [placesSelectedType, setPlacesSelectedType] = useState<string>(""); // نوع المكان المختار في الشريط

  // ─── استخراج مدينة العميل من إحداثيات عنوانه المثبت ───
  const pinnedLat = phoneUser?.pinnedAddressLat ? parseFloat(phoneUser.pinnedAddressLat) : null;
  const pinnedLng = phoneUser?.pinnedAddressLng ? parseFloat(phoneUser.pinnedAddressLng) : null;
  const hasPinnedCoords = !!(pinnedLat && pinnedLng && !isNaN(pinnedLat) && !isNaN(pinnedLng));

  // Reverse geocode لاستخراج اسم المدينة
  const customerCityGeocode = trpc.cities.reverseGeocode.useQuery(
    { lat: pinnedLat ?? 0, lng: pinnedLng ?? 0 },
    { enabled: hasPinnedCoords, staleTime: 1000 * 60 * 30 }
  );

  // مدينة العميل: من pinnedAddressCityName أولاً ثم من reverseGeocode
  const customerCityName: string = (
    (phoneUser as any)?.pinnedAddressCityName ||
    customerCityGeocode.data?.city ||
    ""
  );

  const { data: availableTrips, isLoading: tripsLoading, refetch: refetchTrips } = trpc.shopper.getAvailableTrips.useQuery(
    {
      toCityName: customerCityName || undefined,
      // إرسال إحداثيات العميل للفلترة الدقيقة بالمسافة (إذا توفرت)
      customerLat: hasPinnedCoords ? (pinnedLat ?? undefined) : undefined,
      customerLng: hasPinnedCoords ? (pinnedLng ?? undefined) : undefined,
    },
    { enabled: true }
  );
  const { data: allCitiesForMap } = trpc.cities.listActive.useQuery();
  const { data: myBookings, isLoading: bookingsLoading, refetch: refetchBookings } = trpc.shopper.getMyBookings.useQuery();

  const createBookingMutation = trpc.shopper.createBooking.useMutation({
    onSuccess: () => {
      toast.success("تم إرسال طلب الحجز للمندوب");
      setShowBookingForm(false);
      setSelectedTrip(null);
      refetchBookings();
      refetchTrips();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelBookingMutation = trpc.shopper.cancelBooking.useMutation({
    onSuccess: () => { toast.success("تم إلغاء الحجز"); refetchBookings(); },
    onError: (e) => toast.error(e.message),
  });

  const confirmDeliveryMutation = trpc.shopper.confirmDelivery.useMutation({
    onSuccess: () => { toast.success("تم تأكيد الاستلام"); refetchBookings(); },
    onError: (e) => toast.error(e.message),
  });

  // Booking form state
  const [bookForm, setBookForm] = useState({
    itemDescription: "",
    pickupLocationText: "",
    pickupStoreName: "",
    customerNotes: "",
    paymentMethod: "cash" as "cash" | "card",
    // طريقة التسليم
    deliveryMethod: "person" as "person" | "door",
    recipientType: "self" as "self" | "other",  // self = لي شخصياً, other = لشخص آخر
    recipientName: "",
    recipientPhone: "",
    // نوع الطلب
    orderType: "food" as "food" | "coffee" | "grocery" | "pharmacy" | "other",
    // حالة الدفع
    isPaid: false as boolean,       // هل الطلب مدفوع مسبقاً؟
    invoiceBase64: "" as string,   // صورة الفاتورة (base64) إذا كان مدفوعاً
  });
  // خريطة Google Maps حسب نوع الطلب
  const orderTypeSearchMap: Record<string, string[]> = {
    food: ["restaurant"],
    coffee: ["cafe"],
    grocery: ["supermarket"],
    pharmacy: ["pharmacy"],
    clothing: ["clothing_store"],
    other: ["store"],
  };
  const orderTypeLabels: Record<string, { icon: string; label: string }> = {
    food: { icon: "🍔", label: "طعام" },
    coffee: { icon: "☕", label: "مشروبات" },
    grocery: { icon: "🛒", label: "بقالة" },
    pharmacy: { icon: "💊", label: "صيدلية" },
    other: { icon: "📦", label: "أغراض" },
  };
  // سورتينج بطاقات المناديب
  const [tripSortBy, setTripSortBy] = useState<"all" | "express" | "departure" | "price">("all");
  // صورة هيدر شوبر
  const { data: shopperHeaderData } = trpc.settings.getShopperHeaderImage.useQuery();
  const shopperHeaderImage = shopperHeaderData?.url ?? null;
  // عداد تنازلي حي — يتحدّث كل ثانية
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  // دالة تنسيق العداد التنازلي
  function formatCountdown(ms: number): string {
    if (ms <= 0) return "";
    const totalSecs = Math.floor(ms / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (days > 0) return `${days}ي ${hours}س ${mins}د`;
    if (hours > 0) return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  // موقع التسليم من بيانات العميل المحفوظة
  const savedDeliveryText = phoneUser?.pinnedAddressText ?? "";
  const savedDeliveryLat = phoneUser?.pinnedAddressLat ? parseFloat(phoneUser.pinnedAddressLat) : undefined;
  const savedDeliveryLng = phoneUser?.pinnedAddressLng ? parseFloat(phoneUser.pinnedAddressLng) : undefined;

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending: { label: "بانتظار الموافقة", color: "#f59e0b" },
    accepted: { label: "مقبول", color: "#10b981" },
    rejected: { label: "مرفوض", color: "#ef4444" },
    picked_up: { label: "تم الاستلام من المتجر", color: "#3b82f6" },
    delivered: { label: "تم التوصيل", color: "#8b5cf6" },
    confirmed: { label: "مكتمل", color: "#6b7280" },
    cancelled: { label: "ملغي", color: "#9ca3af" },
  };

  const tripStatusLabel: Record<string, string> = {
    upcoming: "قادمة",
    collecting: "تقبل حجوزات",
    departed: "انطلقت",
    arrived: "وصلت",
    completed: "مكتملة",
    cancelled: "ملغية",
  };

  return (
    <div dir="rtl" className="fixed inset-0 flex flex-col" style={{ background: "#f8f5ff" }}>
      {/* === Shopper Header Banner (مثل بانر المتاجر) === */}
      <div className="relative overflow-hidden shrink-0" style={{ height: '180px' }}>
        {shopperHeaderImage ? (
          <img src={shopperHeaderImage} alt="شوبر" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 40%, #a855f7 80%, #7c3aed 100%)" }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 15% 50%, rgba(255,255,255,0.12) 0%, transparent 45%), radial-gradient(circle at 85% 20%, rgba(255,255,255,0.08) 0%, transparent 35%)",
              }}
            />
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        {/* Logo + Subtitle */}
        <div className="absolute bottom-4 right-4 text-right">
          <img
            src={LOGO_URL}
            alt="Shopper"
            style={{ height: "38px", objectFit: "contain", filter: "brightness(0) invert(1)" }}
          />
          <p className="text-white/80 text-xs mt-1">توصيل مشترياتك بدون زيادة</p>
        </div>
      </div>
      {/* Header Tabs + Filters - ثابتة */}
      <div className="shrink-0 z-30" style={{ background: "#f8f5ff", borderBottom: "1px solid rgba(124,58,237,0.1)" }}>
        {/* التبويبات */}
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex gap-2 mr-auto">
            <button
              onClick={() => setSubView("trips")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${subView === "trips" ? "text-white" : "text-[#7c3aed] bg-[#7c3aed]/10"}`}
              style={subView === "trips" ? { background: "#7c3aed" } : {}}
            >
              الرحلات
            </button>
            <button
              onClick={() => setSubView("my-bookings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${subView === "my-bookings" ? "text-white" : "text-[#7c3aed] bg-[#7c3aed]/10"}`}
              style={subView === "my-bookings" ? { background: "#7c3aed" } : {}}
            >
              حجوزاتي
            </button>
          </div>
        </div>
        {/* فلاتر التصفية - تظهر فقط في تبويب الرحلات */}
        {subView === "trips" && (
          <div className="px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {([
                { key: "all", label: "الكل", icon: "🗂️" },
                { key: "express", label: "⚡ سريع", icon: "" },
                { key: "departure", label: "أقرب مغادرة", icon: "🕐" },
                { key: "price", label: "الأرخص", icon: "💰" },
              ] as { key: "all" | "express" | "departure" | "price"; label: string; icon: string }[]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setTripSortBy(f.key)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: tripSortBy === f.key ? "#7c3aed" : "white",
                    color: tripSortBy === f.key ? "white" : "#7c3aed",
                    border: `1.5px solid ${tripSortBy === f.key ? "#7c3aed" : "rgba(124,58,237,0.25)"}`,
                    boxShadow: tripSortBy === f.key ? "0 2px 8px rgba(124,58,237,0.3)" : "none",
                  }}
                >
                  {f.icon && f.icon !== "" ? `${f.icon} ` : ""}{f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* منطقة التمرير */}
      <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-4 pb-24 space-y-4">

        {/* ─── قائمة الرحلات ─── */}
        {subView === "trips" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: "#374151" }}>الرحلات المتاحة للحجز</p>
              {customerCityName && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                  توصيل الى: {customerCityName}
                </span>
              )}
            </div>
            {(tripsLoading || customerCityGeocode.isLoading) && (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#7c3aed" }} /></div>
            )}
            {!tripsLoading && !customerCityGeocode.isLoading && (!availableTrips || availableTrips.length === 0) && (
              <div className="text-center py-12">
                <Truck className="w-12 h-12 mx-auto mb-3" style={{ color: "#d1d5db" }} />
                {customerCityName ? (
                  <>
                    <p className="text-sm font-semibold" style={{ color: "#6b7280" }}>نعتذر عن عدم التغطية</p>
                    <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>لا توجد رحلات تصل إلى <strong>{customerCityName}</strong> حالياً</p>
                    <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>تحقق لاحقاً أو تواصل مع المناديب</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold" style={{ color: "#6b7280" }}>لا توجد رحلات متاحة حالياً</p>
                    <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>حدد عنوان التوصيل لعرض الرحلات المتاحة في منطقتك</p>
                  </>
                )}
              </div>
            )}
            {(availableTrips ?? []).filter((item: any) => {
              // إخفاء البطاقة إذا انتهى وقت استقبال الطلبات
              const trip = item.trip;
              // إخفاء البطاقة إذا قام العميل بالحجز فيها مسبقاً
              const alreadyBooked = (myBookings ?? []).some((b: any) => b.booking?.tripId === trip.id || b.trip?.id === trip.id);
              if (alreadyBooked) return false;
              // إخفاء الرحلات الممتلئة (لا توجد مقاعد متاحة)
              if (trip.maxBookings > 0 && trip.currentBookings >= trip.maxBookings) return false;
              if (trip.tripType === "express") return true;
              const targetTime = trip.bookingDeadline
                ? new Date(trip.bookingDeadline).getTime()
                : new Date(trip.departureTime).getTime();
              return (targetTime - nowMs) > 0;
            }).filter((item: any) => {
              // فلتر حسب التصفية المختارة
              if (tripSortBy === "express") return item.trip.tripType === "express";
              return true;
            }).sort((a: any, b: any) => {
              // ترتيب حسب التصفية
              if (tripSortBy === "departure") {
                const aTime = new Date(a.trip.departureTime).getTime();
                const bTime = new Date(b.trip.departureTime).getTime();
                return aTime - bTime;
              }
              if (tripSortBy === "price") {
                return parseFloat(a.trip.deliveryFee ?? "0") - parseFloat(b.trip.deliveryFee ?? "0");
              }
              // default: express first
              if (a.trip.tripType === "express" && b.trip.tripType !== "express") return -1;
              if (b.trip.tripType === "express" && a.trip.tripType !== "express") return 1;
              return new Date(a.trip.departureTime).getTime() - new Date(b.trip.departureTime).getTime();
            }).map((item: any) => {
              const trip = item.trip;
              const driver = item.driver;
              const settings = item.settings;
              const spotsLeft = trip.maxBookings - trip.currentBookings;
              const depTime = new Date(trip.departureTime);

              // أنواع ما يقبله المندوب
              const accepts = [
                settings?.allowsFood && "🍔 طعام",
                settings?.allowsCoffee && "☕ قهوة",
                settings?.allowsGroceries && "🛒 بقالة",
                settings?.allowsPharmacy && "💊 صيدلية",
                settings?.allowsDocuments && "📄 وثائق",
                settings?.allowsElectronics && "📱 إلكترونيات",
                settings?.allowsClothes && "👕 ملابس",
                settings?.allowsOther && "📦 أخرى",
              ].filter(Boolean);

              return (
                <div
                  key={trip.id}
                  className="rounded-2xl overflow-hidden"
                  style={trip.tripType === "express" ? {
                    background: "white",
                    boxShadow: "0 4px 24px rgba(217,119,6,0.25), 0 0 0 2px rgba(245,158,11,0.4)",
                    border: "2px solid #f59e0b",
                    position: "relative",
                  } : {
                    background: "white",
                    boxShadow: "0 2px 16px rgba(124,58,237,0.08)",
                    border: "1px solid rgba(124,58,237,0.1)",
                  }}
                >
                  {/* شارة ⚡ سريع للبطاقات السريعة */}
                  {trip.tripType === "express" && (
                    <div
                      className="absolute top-0 left-0 z-10 px-2 py-0.5 text-[10px] font-black"
                      style={{
                        background: "linear-gradient(90deg, #d97706, #f59e0b)",
                        color: "white",
                        borderBottomRightRadius: "10px",
                        letterSpacing: "0.03em",
                      }}
                    >
                      ⚡ توصيل فوري
                    </div>
                  )}
                  {/* رأس البطاقة */}
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: trip.tripType === "express" ? "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" : "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)" }}>
                    <div className="flex items-center gap-2">
                      {trip.tripType === "express" ? <span className="text-white text-base">⚡</span> : <Truck className="w-5 h-5 text-white" />}
                      <div>
                        <span className="font-bold text-white text-sm">{trip.fromCityName} → {trip.toCityName}</span>
                        {trip.tripType === "express" && (
                          <span className="block text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>⚡ توصيل سريع • طلب واحد فوري</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
                      {tripStatusLabel[trip.status] ?? trip.status}
                    </span>
                  </div>

                  {/* تفاصيل */}
                  <div className="px-4 py-3 space-y-2">
                    {/* عداد تنازلي أحمر لموعد المغادرة أو إغلاق الحجز */}
                    {trip.tripType !== "express" && (() => {
                      // إذا حدد المندوب bookingDeadline نستخدمه، وإلا نستخدم departureTime
                      const targetTime = trip.bookingDeadline
                        ? new Date(trip.bookingDeadline).getTime()
                        : depTime.getTime();
                      const msLeft = targetTime - nowMs;
                      const label = trip.bookingDeadline ? "إغلاق الحجز" : "المغادرة";
                      if (msLeft <= 0) {
                        return (
                          <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl" style={{ background: "#fee2e2" }}>
                            <span className="text-base">🚫</span>
                            <span className="text-xs font-bold" style={{ color: "#dc2626" }}>انتهى وقت استقبال الطلبات</span>
                          </div>
                        );
                      }
                      const totalSecs = Math.floor(msLeft / 1000);
                      const days = Math.floor(totalSecs / 86400);
                      const hours = Math.floor((totalSecs % 86400) / 3600);
                      const mins = Math.floor((totalSecs % 3600) / 60);
                      const secs = totalSecs % 60;
                      const isUrgent = msLeft < 3600000; // أقل من ساعة
                      const isCritical = msLeft < 600000; // أقل من 10 دقائق
                      return (
                        <div
                          className="flex items-center justify-between py-2 px-3 rounded-xl"
                          style={{ background: isCritical ? "#fee2e2" : isUrgent ? "#fff7ed" : "#f3f0ff" }}
                        >
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" style={{ color: isCritical ? "#dc2626" : isUrgent ? "#d97706" : "#7c3aed" }} />
                            <span className="text-xs font-medium" style={{ color: isCritical ? "#dc2626" : isUrgent ? "#d97706" : "#7c3aed" }}>
                              {label} خلال
                            </span>
                          </div>
                          <div
                            className="font-mono font-black text-sm tracking-wider"
                            style={{ color: isCritical ? "#dc2626" : isUrgent ? "#d97706" : "#7c3aed", direction: "ltr" }}
                          >
                            {days > 0
                              ? `${days}ي ${String(hours).padStart(2,"0")}:${String(mins).padStart(2,"0")}`
                              : `${String(hours).padStart(2,"0")}:${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`
                            }
                          </div>
                        </div>
                      );
                    })()}
                    {/* وقت الوصول المتوقع */}
                    {(() => {
                      const arrivalMs = new Date(trip.estimatedArrivalTime).getTime() - nowMs;
                      const arrivalStr = formatCountdown(arrivalMs);
                      const arrivalDate = new Date(trip.estimatedArrivalTime);
                      const arrivalFormatted = arrivalDate.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
                      const arrivalDateFormatted = arrivalDate.toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" });
                      if (arrivalMs > 0) {
                        // الرحلة لم تصل بعد - عرض الوقت المتوقع مع عداد
                        const isArrivalUrgent = arrivalMs < 3600000;
                        return (
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: isArrivalUrgent ? "#f59e0b" : "#6b7280" }}>
                            <span>⌛</span>
                            <span>الوصول المتوقع: {arrivalDateFormatted} الساعة {arrivalFormatted}</span>
                            {isArrivalUrgent && <span className="font-bold" style={{ color: "#f59e0b" }}>({arrivalStr})</span>}
                          </div>
                        );
                      } else {
                        // الرحلة تجاوزت وقت الوصول - عرض وقت الوصول المتوقع فقط
                        return (
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6b7280" }}>
                            <span>⌛</span>
                            <span>الوصول المتوقع: {arrivalDateFormatted} الساعة {arrivalFormatted}</span>
                          </div>
                        );
                      }
                    })()}

                    <div className="flex items-center gap-2 text-xs" style={{ color: "#374151" }}>
                      <User className="w-3.5 h-3.5" style={{ color: "#7c3aed" }} />
                      <span className="font-semibold">{driver?.name ?? "مندوب"}</span>
                      <span style={{ color: "#9ca3af" }}>•</span>
                      <span className="font-bold" style={{ color: "#7c3aed" }}>{trip.deliveryFee} ر.س</span>
                    </div>

                    {accepts.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {accepts.map((a: any, i: number) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f3f0ff", color: "#7c3aed" }}>{a}</span>
                        ))}
                      </div>
                    )}

                    {settings?.driverNote && (
                      <p className="text-xs italic" style={{ color: "#6b7280" }}>"{settings.driverNote}"</p>
                    )}

                    {trip.notes && (
                      <p className="text-xs" style={{ color: "#6b7280" }}>ملاحظة: {trip.notes}</p>
                    )}
                  </div>

                  {/* زر الحجز */}
                  <div className="px-4 pb-4">
                    {!phoneUser ? (
                      <p className="text-xs text-center" style={{ color: "#9ca3af" }}>سجّل دخولك للحجز</p>
                    ) : spotsLeft <= 0 ? (
                      <p className="text-xs text-center font-bold" style={{ color: "#ef4444" }}>الرحلة ممتلئة</p>
                    ) : (
                      <button
                        onClick={() => { setSelectedTrip(item); setShowBookingForm(true); }}
                        className="w-full py-2.5 rounded-xl text-white font-bold text-sm transition-transform active:scale-95"
                        style={{ background: "#7c3aed", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
                      >
                        احجز مكانك
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ─── حجوزاتي ─── */}
        {subView === "my-bookings" && (
          <>
            <p className="text-sm font-semibold" style={{ color: "#374151" }}>حجوزاتي في شوبر</p>
            {bookingsLoading && (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#7c3aed" }} /></div>
            )}
            {!bookingsLoading && (!myBookings || myBookings.length === 0) && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-3" style={{ color: "#d1d5db" }} />
                <p className="text-sm font-semibold" style={{ color: "#6b7280" }}>لا توجد حجوزات</p>
                <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>احجز في رحلة من قسم الرحلات</p>
              </div>
            )}
            {(myBookings ?? []).map((item: any) => {
              const booking = item.booking;
              const trip = item.trip;
              const driver = item.driver;
              const st = statusLabel[booking.status] ?? { label: booking.status, color: "#6b7280" };

              return (
                <div
                  key={booking.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #f3f4f6" }}
                >
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "#111827" }}>{booking.itemDescription}</p>
                      {trip && <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{trip.fromCityName} → {trip.toCityName}</p>}
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${st.color}20`, color: st.color }}>
                      {st.label}
                    </span>
                  </div>

                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-3 text-xs" style={{ color: "#6b7280" }}>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{booking.pickupLocationText}</span>
                    </div>
                    {booking.pickupStoreName && (
                      <p className="text-xs" style={{ color: "#374151" }}>المتجر: {booking.pickupStoreName}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold" style={{ color: "#7c3aed" }}>رسوم التوصيل: {booking.deliveryFee} ر.س</span>
                      {driver?.name && <span style={{ color: "#6b7280" }}>المندوب: {driver.name}</span>}
                    </div>

                    {/* صورة الاستلام */}
                    {booking.pickupProofImageUrl && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold" style={{ color: "#374151" }}>صورة الاستلام من المتجر:</p>
                        <img src={booking.pickupProofImageUrl} alt="استلام" className="w-full rounded-xl object-cover" style={{ maxHeight: "160px" }} />
                      </div>
                    )}

                    {/* صورة التسليم */}
                    {booking.deliveryProofImageUrl && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold" style={{ color: "#374151" }}>صورة التسليم:</p>
                        <img src={booking.deliveryProofImageUrl} alt="تسليم" className="w-full rounded-xl object-cover" style={{ maxHeight: "160px" }} />
                      </div>
                    )}

                    {/* أزرار الإجراءات */}
                    <div className="flex gap-2 pt-1">
                      {booking.status === "delivered" && (
                        <button
                          onClick={() => confirmDeliveryMutation.mutate({ bookingId: booking.id })}
                          disabled={confirmDeliveryMutation.isPending}
                          className="flex-1 py-2 rounded-xl text-white text-xs font-bold"
                          style={{ background: "#10b981" }}
                        >
                          {confirmDeliveryMutation.isPending ? "جاري..." : "تأكيد الاستلام"}
                        </button>
                      )}
                      {booking.status === "confirmed" && !booking.hasRating && (
                        <button
                          onClick={() => { setRatingBookingId(booking.id); setRatingDriverId(item.driver?.id ?? null); setRatingForm({ accuracy: 5, speed: 5, cooperation: 5, comment: "" }); setShowRatingModal(true); }}
                          className="flex-1 py-2 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1"
                          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                        >
                          <Star className="w-3.5 h-3.5" />
                          قيّم المندوب
                        </button>
                      )}
                      {(booking.status === "pending" || booking.status === "accepted") && (
                        <button
                          onClick={() => cancelBookingMutation.mutate({ bookingId: booking.id })}
                          disabled={cancelBookingMutation.isPending}
                          className="flex-1 py-2 rounded-xl text-xs font-bold"
                          style={{ background: "#fee2e2", color: "#ef4444" }}
                        >
                          إلغاء الحجز
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      </div>{/* end overflow-y-auto */}

      {/* ─── نموذج الحجز ─── */}
      {showBookingForm && selectedTrip && (
        <div className="fixed inset-0 z-[200] flex items-end" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full rounded-t-3xl flex flex-col" style={{ background: "white", maxHeight: "calc(100vh - 64px)", marginBottom: "64px" }}>
            <div className="px-4 pt-5 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <h3 className="font-bold text-base" style={{ color: "#111827" }}>تفاصيل الحجز</h3>
              <button onClick={() => setShowBookingForm(false)}>
                <X className="w-5 h-5" style={{ color: "#6b7280" }} />
              </button>
            </div>

            {/* معلومات الرحلة */}
            <div className="px-4 py-3 mx-4 mt-3 rounded-xl" style={{ background: "#f3f0ff" }}>
              <p className="text-sm font-bold" style={{ color: "#7c3aed" }}>
                {selectedTrip.trip.fromCityName} → {selectedTrip.trip.toCityName}
              </p>
              <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
                المندوب: {selectedTrip.driver?.name ?? "غير محدد"} • رسوم التوصيل: {selectedTrip.trip.deliveryFee} ر.س
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: "0" }}>
              {/* حالة الدفع */}
              <div>
                <label className="text-xs font-bold block mb-2" style={{ color: "#374151" }}>حالة الدفع</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: false, icon: "💳", label: "غير مدفوع", sub: "المندوب يصدر فاتورة" },
                    { v: true, icon: "✅", label: "مدفوع مسبقاً", sub: "ارفق صورة الفاتورة" },
                  ].map((opt) => (
                    <button
                      key={String(opt.v)}
                      type="button"
                      onClick={() => setBookForm(f => ({ ...f, isPaid: opt.v }))}
                      className="flex flex-col items-center gap-0.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all"
                      style={{
                        borderColor: bookForm.isPaid === opt.v ? "#7c3aed" : "#e5e7eb",
                        background: bookForm.isPaid === opt.v ? "#f3f0ff" : "white",
                        color: bookForm.isPaid === opt.v ? "#7c3aed" : "#6b7280",
                      }}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <span>{opt.label}</span>
                      <span className="text-[10px] font-normal" style={{ color: "#9ca3af" }}>{opt.sub}</span>
                    </button>
                  ))}
                </div>
                {/* رفع صورة الفاتورة إذا كان مدفوعاً */}
                {bookForm.isPaid && (
                  <div className="mt-3">
                    <label className="text-xs font-bold block mb-1.5" style={{ color: "#374151" }}>صورة الفاتورة (اختياري)</label>
                    {bookForm.invoiceBase64 ? (
                      <div className="relative rounded-xl overflow-hidden" style={{ border: "2px solid #7c3aed" }}>
                        <img src={bookForm.invoiceBase64} alt="فاتورة" className="w-full max-h-40 object-contain" style={{ background: "#f9fafb" }} />
                        <button
                          type="button"
                          onClick={() => setBookForm(f => ({ ...f, invoiceBase64: "" }))}
                          className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(0,0,0,0.5)" }}
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all"
                        style={{ borderColor: "#d1d5db", background: "#f9fafb" }}
                      >
                        <Camera className="w-6 h-6" style={{ color: "#9ca3af" }} />
                        <span className="text-xs" style={{ color: "#6b7280" }}>اضغط لرفع صورة الفاتورة</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => setBookForm(f => ({ ...f, invoiceBase64: ev.target?.result as string }));
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
              {/* اختيار نوع الطلب */}
              <div>
                <label className="text-xs font-bold block mb-2" style={{ color: "#374151" }}>نوع الطلب</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.entries(orderTypeLabels).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBookForm(f => ({ ...f, orderType: key as any }))}
                      className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-bold transition-all"
                      style={{
                        borderColor: bookForm.orderType === key ? "#7c3aed" : "#e5e7eb",
                        background: bookForm.orderType === key ? "#f3f0ff" : "white",
                        color: bookForm.orderType === key ? "#7c3aed" : "#6b7280",
                      }}
                    >
                      <span className="text-lg">{val.icon}</span>
                      <span>{val.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* اسم المتجر مع زر جلب الأماكن */}
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "#374151" }}>المتجر / المطعم</label>
                <div className="flex gap-2">
                  <Input
                    value={bookForm.pickupStoreName}
                    onChange={(e) => setBookForm(f => ({ ...f, pickupStoreName: e.target.value }))}
                    placeholder={bookForm.orderType === "food" ? "مثال: مطعم الريم..." : bookForm.orderType === "pharmacy" ? "مثال: صيدلية النهدي..." : "اسم المحل..."}
                    className="rounded-xl flex-1"
                  />
                  {orderTypeSearchMap[bookForm.orderType]?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlacesPicker(true);
                        setPlacesOutOfRange(false);
                        setPlacesList([]);
                        setPlacesError(null);
                      }}
                      className="flex items-center gap-1 px-3 rounded-xl border text-xs font-bold whitespace-nowrap"
                      style={{ borderColor: "#7c3aed", color: "#7c3aed", background: "#f3f0ff" }}
                    >
                      <Search className="w-3.5 h-3.5" />
                      جلب الأماكن
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "#374151" }}>وصف الطلب *</label>
                <textarea
                  value={bookForm.itemDescription}
                  onChange={(e) => setBookForm(f => ({ ...f, itemDescription: e.target.value }))}
                  placeholder={bookForm.orderType === "food" ? "مثال: وجبة دجاج + عصير برتقال" : bookForm.orderType === "pharmacy" ? "مثال: باراسيتامول 500mg" : "اكتب تفاصيل طلبك..."}
                  className="w-full rounded-xl border p-3 text-sm resize-none"
                  style={{ borderColor: "#e5e7eb", minHeight: "80px" }}
                />
              </div>

              {/* موقع الاستلام - خريطة */}
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "#374151" }}>موقع الاستلام (من الخريطة) *</label>
                <button
                  type="button"
                  onClick={() => setShowPickupPicker(true)}
                  className="w-full flex items-center gap-2 rounded-xl border p-3 text-sm text-right transition-colors"
                  style={{ borderColor: pickupLocation ? "#7c3aed" : "#e5e7eb", background: pickupLocation ? "#f3f0ff" : "white" }}
                >
                  <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: pickupLocation ? "#7c3aed" : "#9ca3af" }} />
                  <span style={{ color: pickupLocation ? "#374151" : "#9ca3af" }} className="flex-1 text-right truncate">
                    {pickupLocation ? pickupLocation.text : "اضغط لتحديد الموقع على الخريطة..."}
                  </span>
                  {pickupLocation ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> : <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#9ca3af" }} />}
                </button>
              </div>

              {/* موقع التسليم - من بيانات العميل */}
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "#374151" }}>موقع التسليم (عنوانك المحفوظ)</label>
                <div
                  className="w-full flex items-center gap-2 rounded-xl border p-3 text-sm"
                  style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}
                >
                  <MapPin className="w-4 h-4 flex-shrink-0 text-green-500" />
                  <span style={{ color: savedDeliveryText ? "#374151" : "#9ca3af" }} className="flex-1 text-right truncate">
                    {savedDeliveryText || "لم يتم تحديد عنوان التوصيل بعد"}
                  </span>
                  {!savedDeliveryText && <span className="text-xs text-orange-500 flex-shrink-0">أضف عنوانك من الملف الشخصي</span>}
                </div>
              </div>

              {/* من يستلم الطلب؟ */}
              <div>
                <label className="text-xs font-bold block mb-2" style={{ color: "#374151" }}>من يستلم الطلب؟ *</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: "self", icon: "👤", label: "أنا شخصياً" },
                    { v: "other", icon: "👥", label: "شخص آخر" },
                    { v: "door", icon: "🚪", label: "أمام الباب" },
                  ] as const).map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setBookForm(f => ({ ...f, recipientType: opt.v === "door" ? "self" : opt.v, deliveryMethod: opt.v === "door" ? "door" : "person" }))}
                      className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-bold transition-all"
                      style={{
                        borderColor: (opt.v === "door" ? bookForm.deliveryMethod === "door" : bookForm.recipientType === opt.v && bookForm.deliveryMethod === "person") ? "#7c3aed" : "#e5e7eb",
                        background: (opt.v === "door" ? bookForm.deliveryMethod === "door" : bookForm.recipientType === opt.v && bookForm.deliveryMethod === "person") ? "#f3f0ff" : "white",
                        color: (opt.v === "door" ? bookForm.deliveryMethod === "door" : bookForm.recipientType === opt.v && bookForm.deliveryMethod === "person") ? "#7c3aed" : "#6b7280",
                      }}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
                {/* إذا اختار شخص آخر - حقول المستلم */}
                {bookForm.recipientType === "other" && bookForm.deliveryMethod === "person" && (
                  <div className="mt-3 space-y-2 p-3 rounded-xl" style={{ background: "#f3f0ff", border: "1px solid rgba(124,58,237,0.2)" }}>
                    <p className="text-xs font-bold" style={{ color: "#7c3aed" }}>بيانات المستلم</p>
                    <Input
                      value={bookForm.recipientName}
                      onChange={(e) => setBookForm(f => ({ ...f, recipientName: e.target.value }))}
                      placeholder="اسم المستلم"
                      className="rounded-xl text-sm"
                    />
                    <Input
                      value={bookForm.recipientPhone}
                      onChange={(e) => setBookForm(f => ({ ...f, recipientPhone: e.target.value }))}
                      placeholder="رقم هاتف المستلم *"
                      type="tel"
                      className="rounded-xl text-sm"
                    />
                  </div>
                )}
                {/* إذا اختار أمام الباب */}
                {bookForm.deliveryMethod === "door" && (
                  <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl" style={{ background: "#fef3c7", border: "1px solid #fbbf24" }}>
                    <span className="text-sm">ℹ️</span>
                    <p className="text-xs" style={{ color: "#92400e" }}>سيترك المندوب الطلب أمام باب منزلك</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: "#374151" }}>ملاحظات إضافية</label>
                <Input
                  value={bookForm.customerNotes}
                  onChange={(e) => setBookForm(f => ({ ...f, customerNotes: e.target.value }))}
                  placeholder="أي تعليمات خاصة..."
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-2" style={{ color: "#374151" }}>طريقة الدفع</label>
                <div className="flex gap-3">
                  {(["cash", "card"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setBookForm(f => ({ ...f, paymentMethod: m }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${bookForm.paymentMethod === m ? "border-[#7c3aed] text-[#7c3aed] bg-[#f3f0ff]" : "border-gray-200 text-gray-500"}`}
                    >
                      {m === "cash" ? "💵 كاش" : "💳 بطاقة"}
                    </button>
                  ))}
                </div>
              </div>

            </div>
            {/* زر مثبت في أسفل النافذة */}
            <div className="px-4 pt-3 pb-4 shrink-0" style={{ borderTop: "2px solid #f3f4f6", background: "white" }}>
              <button
                onClick={() => {
                  if (!bookForm.itemDescription.trim()) { toast.error("أدخل وصف الطلب"); return; }
                  if (!pickupLocation) { toast.error("حدد موقع الاستلام على الخريطة"); return; }
                  if (bookForm.recipientType === "other" && bookForm.deliveryMethod === "person" && !bookForm.recipientPhone.trim()) {
                    toast.error("أدخل رقم هاتف المستلم"); return;
                  }
                  setShowConfirmInvoice(true);
                }}
                disabled={createBookingMutation.isPending}
                className="w-full py-4 rounded-2xl text-white font-bold text-base transition-transform active:scale-95"
                style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", boxShadow: "0 6px 20px rgba(124,58,237,0.4)", fontSize: "16px" }}
              >
                ✅ مراجعة الفاتورة وتأكيد الحجز
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة جلب الأماكن من Google Maps */}
      {showPlacesPicker && (
        <div className="fixed inset-0 z-[300] flex flex-col" style={{ background: "white" }} dir="rtl">
          {/* Header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-bold text-base" style={{ color: "#111827" }}>
                من وين حاب تطلب ؟
              </h3>
            </div>
            <button onClick={() => { setShowPlacesPicker(false); setPlacesStep("map"); setPlacesList([]); setPlacesSelectedType(""); }} className="p-1.5 rounded-full" style={{ background: "#f3f4f6" }}>
              <X className="w-5 h-5" style={{ color: "#374151" }} />
            </button>
          </div>

          {/* ===== الخريطة مع overlay ===== */}
          <div className="relative overflow-hidden" style={{ height: "45vh" }}>
            {/* صندوق البحث - فوق الخريطة */}
            <div className="absolute top-2 left-3 right-3 z-20">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9ca3af" }} />
                <input
                  type="text"
                  placeholder="ابحث في الخريطة"
                  value={placesSearchQuery}
                  onChange={(e) => setPlacesSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && placesSearchQuery.trim() && placesMapRef) {
                      const google = (window as any).google;
                      if (!google) return;
                      const geocoder = new (window as any).google.maps.Geocoder();
                      geocoder.geocode({ address: placesSearchQuery }, (results: any, status: any) => {
                        if (status === "OK" && results[0]) {
                          const loc = results[0].geometry.location;
                          placesMapRef.setCenter({ lat: loc.lat(), lng: loc.lng() });
                          placesMapRef.setZoom(15);
                        }
                      });
                    }
                  }}
                  className="w-full pr-9 pl-12 py-3 rounded-2xl text-sm shadow-md"
                  style={{ background: "white", border: "none", outline: "none" }}
                />
                {placesSearchQuery && (
                  <button
                    onClick={() => {
                      if (!placesMapRef || !placesSearchQuery.trim()) return;
                      const google = (window as any).google;
                      if (!google) return;
                      const geocoder = new (window as any).google.maps.Geocoder();
                      geocoder.geocode({ address: placesSearchQuery }, (results: any, status: any) => {
                        if (status === "OK" && results[0]) {
                          const loc = results[0].geometry.location;
                          placesMapRef.setCenter({ lat: loc.lat(), lng: loc.lng() });
                          placesMapRef.setZoom(15);
                        }
                      });
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl text-xs font-bold"
                    style={{ background: "#111827", color: "white" }}
                  >
                    بحث
                  </button>
                )}
              </div>
            </div>

            {/* الخريطة كاملة */}
            <MapView
              initialCenter={(() => {
                if (selectedTrip?.driver?.currentLat && selectedTrip?.driver?.currentLng) {
                  return { lat: Number(selectedTrip.driver.currentLat), lng: Number(selectedTrip.driver.currentLng) };
                }
                return undefined;
              })()}
              initialZoom={12}
              onMapReady={(map) => {
                setPlacesMapRef(map);
                const google = (window as any).google;
                if (!google) return;
                // استخدام مناطق التغطية المرسومة للمندوب (من driverCoverageZones)
                const driverUserId = selectedTrip?.driver?.id ?? null;
                map.addListener("idle", () => {
                  const center = map.getCenter();
                  if (!center) return;
                  const lat = center.lat();
                  const lng = center.lng();
                  setPlacesPin({ lat, lng });
                  // التحقق من التغطية عبر tRPC checkCoverage
                  if (driverUserId) {
                    trpcUtils.coverageZones.checkCoverage.fetch({ lat, lng, driverUserId })
                      .then(result => {
                        // إذا لم تكن هناك مناطق محددة (covered=false ولا zones) → لا تقييد
                        setPlacesOutOfRange(result.covered === false && result.zoneId === null
                          ? false  // لا توجد مناطق محددة → مسموح بالكل
                          : !result.covered  // توجد مناطق → تحقق من التغطية
                        );
                      })
                      .catch(() => setPlacesOutOfRange(false));
                  } else {
                    setPlacesOutOfRange(false);
                  }
                  // جلب العنوان
                  const geocoder = new (window as any).google.maps.Geocoder();
                  geocoder.geocode({ location: { lat, lng } }, async (results: any, status: any) => {
                    if (status === "OK" && results[0]) {
                      setPlacesAddress(results[0].formatted_address);
                    } else {
                      try {
                        const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
                        const BASE = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
                        const r = await fetch(`${BASE}/v1/maps/proxy/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}&language=ar`);
                        const d = await r.json();
                        setPlacesAddress(d.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                      } catch { setPlacesAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`); }
                    }
                  });
                });
              }}
            />

            {/* تحذير خارج التغطية */}
            {placesOutOfRange && (
              <div className="absolute top-14 left-0 right-0 flex justify-center px-4" style={{ zIndex: 25 }}>
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold shadow-lg" style={{ background: "#dc2626", color: "white" }}>
                  ⚠️ خارج التغطية
                </div>
              </div>
            )}
            {/* دبوس مركزي ثابت - يتغير لونه حسب التغطية */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
              <div className="flex flex-col items-center" style={{ transform: "translateY(-50%)" }}>
                <div className="w-10 h-10 rounded-full border-4 border-white shadow-xl flex items-center justify-center" style={{ background: placesOutOfRange ? "#6b7280" : "#dc2626" }}>
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="w-2 h-5" style={{ background: `linear-gradient(to bottom, ${placesOutOfRange ? "#6b7280" : "#dc2626"}, transparent)` }} />
              </div>
            </div>

            {/* زر موقعي الحالي - يسار أسفل */}
            <button
              onClick={() => {
                if (!navigator.geolocation) return;
                setPlacesLocating(true);
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setPlacesLocating(false);
                    if (placesMapRef) {
                      placesMapRef.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      placesMapRef.setZoom(16);
                    }
                  },
                  () => setPlacesLocating(false),
                  { enableHighAccuracy: true, timeout: 8000 }
                );
              }}
              className="absolute bottom-4 left-3 w-11 h-11 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: "white", border: "1.5px solid #e5e7eb", zIndex: 20 }}
            >
              {placesLocating ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#374151" }} /> : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                  <circle cx="12" cy="12" r="9" strokeDasharray="2 2"/>
                </svg>
              )}
            </button>
          </div>

          {/* ===== الجزء السفلي: شريط الأماكن + زر التأكيد ===== */}
          <div className="flex-shrink-0" style={{ background: "white", borderTop: "1px solid #f3f4f6" }}>
            {/* شريط العنوان الحالي */}
            {placesPin && (
              <div className="px-4 pt-2.5 pb-1 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: placesOutOfRange ? "#dc2626" : "#22c55e" }} />
                <p className="text-xs flex-1 truncate" style={{ color: placesOutOfRange ? "#dc2626" : "#374151" }}>
                  {placesOutOfRange ? "⚠️ خارج حدود مدينة المندوب" : (placesAddress || "جاري تحديد العنوان...")}
                </p>
              </div>
            )}

            {/* شريط أفقي لأنواع الأماكن - معطّل عند خارج التغطية */}
            <div className="px-3 py-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-2 w-max">
                {([
                  { key: "food", icon: "🍔", label: "طعام", type: "restaurant" },
                  { key: "coffee", icon: "☕", label: "مشروبات", type: "cafe" },
                  { key: "grocery", icon: "🛒", label: "بقالة", type: "supermarket" },
                  { key: "pharmacy", icon: "💊", label: "صيدلية", type: "pharmacy" },
                  { key: "bakery", icon: "🥐", label: "مخبز", type: "bakery" },
                  { key: "other", icon: "📦", label: "أغراض", type: "store" },
                ] as const).map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    disabled={placesOutOfRange}
                    onClick={() => {
                      if (!placesPin || !placesMapRef || placesOutOfRange) return;
                      const isActive = placesSelectedType === cat.key;
                      if (isActive) { setPlacesSelectedType(""); setPlacesList([]); return; }
                      setPlacesSelectedType(cat.key);
                      setPlacesLoading(true);
                      setPlacesError(null);
                      setPlacesList([]);
                      const google = (window as any).google;
                      const service = new (window as any).google.maps.places.PlacesService(placesMapRef);
                      service.nearbySearch(
                        { location: { lat: placesPin.lat, lng: placesPin.lng }, radius: 5000, type: cat.type },
                        (results: any, status: any) => {
                          setPlacesLoading(false);
                          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && results) {
                            setPlacesList(results.slice(0, 20).map((p: any) => {
                              const photoUrl = p.photos && p.photos.length > 0
                                ? p.photos[0].getUrl({ maxWidth: 120, maxHeight: 120 })
                                : undefined;
                              return {
                                name: p.name ?? "",
                                address: p.vicinity ?? "",
                                placeId: p.place_id ?? "",
                                lat: p.geometry?.location?.lat() ?? 0,
                                lng: p.geometry?.location?.lng() ?? 0,
                                rating: p.rating,
                                photoUrl,
                              };
                            }));
                          } else {
                            setPlacesError("لم يتم العثور على أماكن في هذه المنطقة.");
                          }
                        }
                      );
                    }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: placesSelectedType === cat.key ? "#111827" : "#f3f4f6",
                      color: placesSelectedType === cat.key ? "white" : "#374151",
                      border: "none"
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* شريط أفقي للنتائج */}
            {(placesLoading || placesList.length > 0 || placesError) && (
              <div className="overflow-x-auto pb-2 px-3" style={{ scrollbarWidth: "none" }}>
                {placesLoading && (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#7c3aed" }} />
                    <span className="text-xs" style={{ color: "#6b7280" }}>جاري البحث...</span>
                  </div>
                )}
                {placesError && !placesLoading && (
                  <p className="text-xs py-2" style={{ color: "#ef4444" }}>{placesError}</p>
                )}
                {!placesLoading && placesList.length > 0 && (
                  <div className="flex gap-3 w-max py-1">
                    {placesList.map((place) => (
                      <button
                        key={place.placeId}
                        type="button"
                        onClick={() => {
                          setBookForm(f => ({ ...f, pickupStoreName: place.name, pickupLocationText: `${place.name}، ${place.address}` }));
                          setPickupLocation({ text: `${place.name}، ${place.address}`, lat: place.lat, lng: place.lng });
                          setShowPlacesPicker(false);
                          setPlacesSelectedType("");
                          setPlacesList([]);
                          toast.success(`تم اختيار: ${place.name}`);
                        }}
                        className="flex-shrink-0 flex flex-col rounded-2xl overflow-hidden text-right"
                        style={{ width: "130px", background: "white", border: "1.5px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                      >
                        <div className="w-full h-20 overflow-hidden" style={{ background: "#f3f4f6" }}>
                          {place.photoUrl ? (
                            <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Store className="w-7 h-7" style={{ color: "#d1d5db" }} />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="font-bold text-xs leading-tight" style={{ color: "#111827" }}>{place.name}</p>
                          {place.rating && (
                            <div className="flex items-center gap-0.5 mt-1">
                              <span className="text-yellow-400 text-xs">★</span>
                              <span className="text-xs" style={{ color: "#6b7280" }}>{place.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* زر تأكيد موقع التوصيل والاستلام */}
            <div className="px-4 pb-5 pt-2">
              <button
                type="button"
                disabled={!placesPin || placesOutOfRange}
                onClick={() => {
                  if (!placesPin || placesOutOfRange) return;
                  setBookForm(f => ({ ...f, pickupLocationText: placesAddress || `${placesPin.lat.toFixed(5)}, ${placesPin.lng.toFixed(5)}` }));
                  setPickupLocation({ text: placesAddress || `${placesPin.lat.toFixed(5)}, ${placesPin.lng.toFixed(5)}`, lat: placesPin.lat, lng: placesPin.lng });
                  setShowPlacesPicker(false);
                  setPlacesSelectedType("");
                  setPlacesList([]);
                  toast.success("تم تحديد موقع الاستلام");
                }}
                className="w-full py-3.5 rounded-2xl font-bold text-base"
                style={{
                  background: (!placesPin || placesOutOfRange) ? "#e5e7eb" : "#22c55e",
                  color: (!placesPin || placesOutOfRange) ? "#9ca3af" : "white",
                  cursor: (!placesPin || placesOutOfRange) ? "not-allowed" : "pointer",
                }}
              >
                {placesOutOfRange ? "⚠️ خارج التغطية" : "أكد موقع التوصيل والاستلام"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تحديد موقع الاستلام */}
      <LocationPickerModal
        open={showPickupPicker}
        onOpenChange={setShowPickupPicker}
        onConfirm={(loc) => {
          setPickupLocation(loc);
          setBookForm(f => ({ ...f, pickupLocationText: loc.text }));
          setShowPickupPicker(false);
        }}
      />

      {/* نافذة تأكيد الفاتورة */}
      {showConfirmInvoice && selectedTrip && (
        <div className="fixed inset-0 z-[250] flex items-end" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full rounded-t-3xl flex flex-col" style={{ background: "white", height: "90vh" }}>
            <div className="px-4 pt-5 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <h3 className="font-bold text-base" style={{ color: "#111827" }}>تأكيد الحجز - الفاتورة</h3>
              <button onClick={() => setShowConfirmInvoice(false)}><X className="w-5 h-5" style={{ color: "#6b7280" }} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ paddingBottom: "0" }}>
              {/* بطاقة الرحلة */}
              <div className="rounded-xl p-3" style={{ background: "#f3f0ff", border: "1px solid #e9d5ff" }}>
                <p className="text-xs font-bold" style={{ color: "#6b21a8" }}>تفاصيل الرحلة</p>
                <p className="text-sm font-bold mt-1" style={{ color: "#374151" }}>{selectedTrip.trip.fromCityName} → {selectedTrip.trip.toCityName}</p>
                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>المندوب: {selectedTrip.driver?.name ?? "غير محدد"}</p>
              </div>
              {/* تفاصيل الطلب */}
              <div className="rounded-xl p-3 space-y-2" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                <p className="text-xs font-bold" style={{ color: "#374151" }}>تفاصيل الطلب</p>
                <div className="flex justify-between text-sm gap-2">
                  <span style={{ color: "#6b7280", flexShrink: 0 }}>الطلب:</span>
                  <span className="font-medium text-right" style={{ color: "#111827" }}>{bookForm.itemDescription}</span>
                </div>
                {bookForm.pickupStoreName && (
                  <div className="flex justify-between text-sm gap-2">
                    <span style={{ color: "#6b7280", flexShrink: 0 }}>المتجر:</span>
                    <span className="font-medium text-right" style={{ color: "#111827" }}>{bookForm.pickupStoreName}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm gap-2">
                  <span style={{ color: "#6b7280", flexShrink: 0 }}>موقع الاستلام:</span>
                  <span className="font-medium text-right" style={{ color: "#111827" }}>{pickupLocation?.text}</span>
                </div>
                <div className="flex justify-between text-sm gap-2">
                  <span style={{ color: "#6b7280", flexShrink: 0 }}>موقع التسليم:</span>
                  <span className="font-medium text-right" style={{ color: "#111827" }}>{savedDeliveryText || "غير محدد"}</span>
                </div>
                {/* طريقة التسليم */}
                <div className="flex justify-between text-sm gap-2">
                  <span style={{ color: "#6b7280", flexShrink: 0 }}>التسليم:</span>
                  <span className="font-medium text-right" style={{ color: "#111827" }}>
                    {bookForm.deliveryMethod === "door" ? "🚪 أمام الباب" : bookForm.recipientType === "other" ? "👥 شخص آخر" : "👤 أنا شخصياً"}
                  </span>
                </div>
                {/* بيانات المستلم إذا كان شخص آخر */}
                {bookForm.recipientType === "other" && bookForm.deliveryMethod === "person" && (
                  <>
                    {bookForm.recipientName && (
                      <div className="flex justify-between text-sm gap-2">
                        <span style={{ color: "#6b7280", flexShrink: 0 }}>اسم المستلم:</span>
                        <span className="font-medium text-right" style={{ color: "#111827" }}>{bookForm.recipientName}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm gap-2">
                      <span style={{ color: "#6b7280", flexShrink: 0 }}>هاتف المستلم:</span>
                      <span className="font-medium text-right" style={{ color: "#111827" }}>{bookForm.recipientPhone}</span>
                    </div>
                  </>
                )}
                {bookForm.customerNotes && (
                  <div className="flex justify-between text-sm gap-2">
                    <span style={{ color: "#6b7280", flexShrink: 0 }}>ملاحظات:</span>
                    <span className="font-medium text-right" style={{ color: "#111827" }}>{bookForm.customerNotes}</span>
                  </div>
                )}
              </div>
              {/* الفاتورة المالية */}
              <div className="rounded-xl p-3 space-y-2" style={{ background: "#fff", border: "2px solid #7c3aed" }}>
                <p className="text-xs font-bold" style={{ color: "#6b21a8" }}>الفاتورة</p>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#6b7280" }}>رسوم التوصيل:</span>
                  <span className="font-bold" style={{ color: "#111827" }}>{selectedTrip.trip.deliveryFee} ر.س</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#6b7280" }}>طريقة الدفع:</span>
                  <span className="font-bold" style={{ color: "#111827" }}>{bookForm.paymentMethod === "cash" ? "💵 كاش" : "💳 بطاقة"}</span>
                </div>
                <div className="h-px" style={{ background: "#e9d5ff" }} />
                <div className="flex justify-between">
                  <span className="font-bold" style={{ color: "#374151" }}>الإجمالي:</span>
                  <span className="font-bold text-lg" style={{ color: "#7c3aed" }}>{selectedTrip.trip.deliveryFee} ر.س</span>
                </div>
              </div>
            </div>
            {/* ─── زر التأكيد ثابت في الأسفل ─── */}
            <div className="px-4 pb-6 pt-3 border-t" style={{ borderColor: "#f3f4f6", background: "white" }}>
              <p className="text-xs text-center mb-3" style={{ color: "#9ca3af" }}>
                بالضغط على تأكيد الحجز، أقر بأن محتويات الطلب غير ممنوعة وأتحمل كامل المسؤولية القانونية
              </p>
              <button
                onClick={() => {
                  createBookingMutation.mutate({
                    tripId: selectedTrip.trip.id,
                    itemDescription: bookForm.itemDescription,
                    pickupLocationText: pickupLocation!.text,
                    pickupLocationLat: pickupLocation!.lat,
                    pickupLocationLng: pickupLocation!.lng,
                    pickupStoreName: bookForm.pickupStoreName || undefined,
                    deliveryLocationText: savedDeliveryText || undefined,
                    deliveryLocationLat: savedDeliveryLat,
                    deliveryLocationLng: savedDeliveryLng,
                    customerNotes: bookForm.customerNotes || undefined,
                    paymentMethod: bookForm.paymentMethod,
                    deliveryMethod: bookForm.deliveryMethod,
                    recipientName: bookForm.recipientType === "other" ? bookForm.recipientName || undefined : undefined,
                    recipientPhone: bookForm.recipientType === "other" ? bookForm.recipientPhone || undefined : undefined,
                    invoiceImageBase64: bookForm.isPaid && bookForm.invoiceBase64 ? bookForm.invoiceBase64 : undefined,
                    needsInvoice: !bookForm.isPaid,
                  });
                  setShowConfirmInvoice(false);
                }}
                disabled={createBookingMutation.isPending}
                className="w-full py-4 rounded-2xl text-white font-bold text-base transition-transform active:scale-95"
                style={{ background: "#7c3aed", boxShadow: "0 6px 20px rgba(124,58,237,0.35)", fontSize: "1.05rem" }}
              >
                {createBookingMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">⏳ جاري الإرسال...</span>
                ) : (
                  <span className="flex items-center justify-center gap-2">✅ تأكيد الحجز</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة التقييم ─── */}
      {showRatingModal && ratingBookingId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-[92%] max-w-sm rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            {/* رأس النافذة */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
              <div>
                <h3 className="font-bold text-sm text-white">⭐ قيّم المندوب</h3>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.75)" }}>ساعدنا في تحسين الخدمة</p>
              </div>
              <button onClick={() => setShowRatingModal(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-3">
              {/* الدقة */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold" style={{ color: "#374151" }}>⭐ الدقة</p>
                  <span className="text-[10px] font-bold" style={{ color: "#f59e0b" }}>{["","ضعيف","مقبول","جيد","جيد جداً","ممتاز"][ratingForm.accuracy]}</span>
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setRatingForm(f => ({ ...f, accuracy: n }))}
                      className="w-9 h-9 rounded-full text-sm font-bold transition-all"
                      style={{ background: n <= ratingForm.accuracy ? "#f59e0b" : "#f3f4f6", color: n <= ratingForm.accuracy ? "white" : "#9ca3af" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* السرعة */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold" style={{ color: "#374151" }}>⚡ السرعة</p>
                  <span className="text-[10px] font-bold" style={{ color: "#3b82f6" }}>{["","بطيء","مقبول","جيد","سريع","سريع جداً"][ratingForm.speed]}</span>
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setRatingForm(f => ({ ...f, speed: n }))}
                      className="w-9 h-9 rounded-full text-sm font-bold transition-all"
                      style={{ background: n <= ratingForm.speed ? "#3b82f6" : "#f3f4f6", color: n <= ratingForm.speed ? "white" : "#9ca3af" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* التعاون */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold" style={{ color: "#374151" }}>🤝 التعاون</p>
                  <span className="text-[10px] font-bold" style={{ color: "#10b981" }}>{["","غير متعاون","مقبول","جيد","متعاون","متعاون جداً"][ratingForm.cooperation]}</span>
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setRatingForm(f => ({ ...f, cooperation: n }))}
                      className="w-9 h-9 rounded-full text-sm font-bold transition-all"
                      style={{ background: n <= ratingForm.cooperation ? "#10b981" : "#f3f4f6", color: n <= ratingForm.cooperation ? "white" : "#9ca3af" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* تعليق اختياري */}
              <textarea
                value={ratingForm.comment}
                onChange={e => setRatingForm(f => ({ ...f, comment: e.target.value }))}
                placeholder="💬 تعليق اختياري..."
                rows={2}
                className="w-full rounded-xl px-3 py-2 text-xs resize-none"
                style={{ border: "1px solid #e5e7eb", color: "#111827", background: "#f9fafb" }}
              />

              {/* ملخص + زر الإرسال */}
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl p-2 flex justify-around" style={{ background: "#f3f0ff", border: "1px solid #e9d5ff" }}>
                  {[{v:ratingForm.accuracy,l:"دقة",c:"#f59e0b"},{v:ratingForm.speed,l:"سرعة",c:"#3b82f6"},{v:ratingForm.cooperation,l:"تعاون",c:"#10b981"},{v:+((ratingForm.accuracy+ratingForm.speed+ratingForm.cooperation)/3).toFixed(1),l:"إجمالي",c:"#7c3aed"}].map(({v,l,c}) => (
                    <div key={l} className="text-center">
                      <p className="text-sm font-black" style={{ color: c }}>{v}</p>
                      <p className="text-[9px]" style={{ color: "#6b7280" }}>{l}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => submitRatingMutation.mutate({ bookingId: ratingBookingId!, accuracyRating: ratingForm.accuracy, speedRating: ratingForm.speed, cooperationRating: ratingForm.cooperation, comment: ratingForm.comment || undefined })}
                  disabled={submitRatingMutation.isPending}
                  className="px-4 py-3 rounded-xl text-white font-bold text-xs transition-transform active:scale-95"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", minWidth: "80px" }}
                >
                  {submitRatingMutation.isPending ? "..." : "إرسال ⭐"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== EXPLORE TAB =====
// أنواع الأماكن المتاحة
const PLACE_TYPES = [
  { id: "restaurant", label: "مطاعم", emoji: "🍽️", keyword: "restaurant", color: "#ef4444", bg: "#fef2f2" },
  { id: "cafe", label: "كافيهات", emoji: "☕", keyword: "cafe coffee", color: "#92400e", bg: "#fef3c7" },
  { id: "dessert", label: "حلويات", emoji: "🍰", keyword: "dessert sweets حلا", color: "#db2777", bg: "#fdf2f8" },
  { id: "bakery", label: "مخابز", emoji: "🥐", keyword: "bakery bread", color: "#d97706", bg: "#fffbeb" },
  { id: "juice", label: "عصائر", emoji: "🥤", keyword: "juice smoothie", color: "#16a34a", bg: "#f0fdf4" },
  { id: "fast_food", label: "وجبات سريعة", emoji: "🍔", keyword: "fast food burger", color: "#ea580c", bg: "#fff7ed" },
];

function ExploreTab({ cityName, onOrderFromPlace }: { cityName?: string; onOrderFromPlace?: (place: any) => void }) {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(null);
  // نوع المكان المختار (null = لم يختر بعد)
  const [selectedType, setSelectedType] = useState<string | null>(null);
  // موقع العميل الجغرافي
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  // صور المنيو
  const [showMenuPhotos, setShowMenuPhotos] = useState(false);
  // الأصناف المختارة للإدخال التلقائي
  const [selectedItems, setSelectedItems] = useState<Array<{ name: string; price: string; quantity: number; emoji: string }>>([]); 

  // ميزة لصق رابط Google Maps
  const [mapsUrl, setMapsUrl] = useState("");
  const [showMapsUrlInput, setShowMapsUrlInput] = useState(false);
  const [resolvingUrl, setResolvingUrl] = useState(false);

  const resolveUrlMutation = trpc.placeExplore.resolveGoogleMapsUrl.useMutation({
    onSuccess: (data) => {
      setResolvingUrl(false);
      setShowMapsUrlInput(false);
      setMapsUrl("");
      // عرض النتيجة مباشرة
      const placeData = {
        placeId: data.placeId,
        name: data.name,
        address: data.address,
        rating: data.rating,
        totalRatings: data.totalRatings,
        menuPhotoUrls: data.menuPhotoUrls,
        hasMenuPhotos: data.hasMenuPhotos,
        menuPhotosCount: data.menuPhotosCount,
        distance: null,
        isOpen: null,
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${data.placeId}`,
      };
      setSelectedPlace(placeData);
      setAnalysis({ menuItems: data.menuItems, menuPhotoUrls: data.menuPhotoUrls });
      setAnalyzing(false);
      setSelectedItems([]);
      const cats = Array.from(new Set((data.menuItems || []).map((i: any) => i.category as string)));
      if (cats.length > 0) setActiveMenuCategory(cats[0] as string);
      if (data.hasMenuPhotos) {
        toast.success(`✅ تم استخراج ${data.menuPhotosCount} صورة منيو من ${data.name}`);
      } else {
        toast.error("لم يتم العثور على صور قائمة طعام مؤكدة في هذا المكان");
      }
    },
    onError: (err) => {
      setResolvingUrl(false);
      toast.error(err.message || "تعذّر استخراج بيانات المكان");
    },
  });

  function handleResolveUrl() {
    if (!mapsUrl.trim()) return;
    setResolvingUrl(true);
    resolveUrlMutation.mutate({ url: mapsUrl.trim() });
  }

  const utils = trpc.useUtils();

  // keyword حسب النوع المختار
  const typeKeyword = selectedType ? PLACE_TYPES.find((t) => t.id === selectedType)?.keyword : undefined;

  // جلب الأماكن القريبة حسب موقع العميل
  const nearbyResult = trpc.placeExplore.nearbySearch.useQuery(
    {
      lat: userLocation?.lat ?? 0,
      lng: userLocation?.lng ?? 0,
      radius: 5000,
      keyword: searchQuery || undefined,
      placeType: (selectedType && selectedType !== "search" ? selectedType : "all") as any,
      minRating: 3.5,
      minReviews: 50,
      maxResults: 20,
    },
    { enabled: !!userLocation && !!selectedType && selectedType !== "search" && !searchQuery }
  );

  // بحث نصي عند كتابة اسم محدد
  const searchResult = trpc.placeExplore.search.useQuery(
    {
      query: searchQuery,
      lat: userLocation?.lat,
      lng: userLocation?.lng,
      cityName,
      minRating: 3.5,
      minReviews: 50,
      maxResults: 15,
    },
    { enabled: !!searchQuery }
  );

  // النتائج المعروضة: بحث نصي أو قريبة
  const displayedPlaces = searchQuery
    ? (searchResult.data?.places ?? [])
    : (nearbyResult.data?.places ?? []);
  const isLoadingPlaces = searchQuery ? searchResult.isFetching : nearbyResult.isFetching;

  const analyzeMutation = trpc.placeExplore.analyze.useMutation({
    onSuccess: (data) => {
      setAnalysis(data);
      setAnalyzing(false);
      setSelectedItems([]);
      const cats = Array.from(new Set((data.menuItems || []).map((i: any) => i.category as string)));
      if (cats.length > 0) setActiveMenuCategory(cats[0] as string);
    },
    onError: () => {
      setAnalyzing(false);
      toast.error("تعذّر تحليل المكان، حاول مرة أخرى");
    },
  });

  // طلب موقع العميل
  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError("متصفحك لا يدعم تحديد الموقع");
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        setLocationError("تعذّر تحديد موقعك. اضغط 'سمح' للوصول للموقع");
        console.warn("Geolocation error:", err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // طلب الموقع تلقائياً عند فتح التبويب
  useEffect(() => {
    if (!userLocation) requestLocation();
  }, []);

  function handleSearch() {
    if (!query.trim()) return;
    setSearchQuery(query.trim());
    setSelectedPlace(null);
    setAnalysis(null);
  }

  async function handleSelectPlace(place: any) {
    setSelectedPlace(place);
    setAnalysis(null);
    setAnalyzing(true);
    setShowMenuPhotos(false);
    setSelectedItems([]);
    analyzeMutation.mutate({ placeId: place.placeId });
  }

  // إضافة / حذف صنف من السلة
  function toggleItem(item: { name: string; price?: string; emoji?: string }) {
    const priceStr = item.price ? item.price.replace(/[^\d.]/g, "") : "0";
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.name === item.name);
      if (exists) return prev.filter((i) => i.name !== item.name);
      return [...prev, { name: item.name, price: priceStr || "0", quantity: 1, emoji: item.emoji || "🍽" }];
    });
  }

  function updateQty(name: string, delta: number) {
    setSelectedItems((prev) =>
      prev.map((i) => i.name === name ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
    );
  }

  // إدخال الأصناف في صفحة الطلب
  function handleOrderWithItems() {
    if (!onOrderFromPlace) return;
    const placeForOrder = {
      ...selectedPlace,
      prefilledItems: selectedItems.length > 0 ? selectedItems : undefined,
    };
    onOrderFromPlace(placeForOrder);
  }


  function openGoogleMaps(url: string) {
    window.open(url, "_blank");
  }

  const priceLevelText = (level: number | null) => {
    if (!level) return "";
    return "💰".repeat(level);
  };

  const menuCategories = analysis?.menuItems
    ? Array.from(new Set(analysis.menuItems.map((i: any) => i.category as string))) as string[]
    : [];

  const filteredMenuItems = analysis?.menuItems?.filter(
    (i: any) => !activeMenuCategory || i.category === activeMenuCategory
  ) || [];

  return (
    <div dir="rtl" className="flex flex-col h-full overflow-y-auto pb-24" style={{ background: "#f8f5ff" }}>

      {/* ===== شاشة اختيار النوع (تظهر أولاً قبل النتائج) ===== */}
      {!selectedPlace && !selectedType && (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
          <div className="text-5xl mb-4">🗺️</div>
          <h1 className="text-2xl font-black mb-2" style={{ color: "#1a1a2e" }}>وش تحب تطلب؟</h1>
          <p className="text-sm mb-8" style={{ color: "#6b7280" }}>اختر النوع وسنعرض لك أقرب الأماكن مع صور المنيو</p>

          {/* بطاقات الأنواع */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            {PLACE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type.id);
                  setSearchQuery("");
                  setQuery("");
                  setSelectedPlace(null);
                  setAnalysis(null);
                  setSelectedItems([]);
                }}
                className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl transition-all active:scale-95 shadow-sm"
                style={{ background: type.bg, border: `2px solid ${type.color}20` }}
              >
                <span className="text-4xl">{type.emoji}</span>
                <span className="font-black text-base" style={{ color: type.color }}>{type.label}</span>
              </button>
            ))}
          </div>

          {/* زر لصق رابط Google Maps */}
          <div className="w-full max-w-sm mt-6">
            <button
              onClick={() => setShowMapsUrlInput((v) => !v)}
              className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95"
              style={{ background: "#fff", border: "2px dashed #7c3aed", color: "#7c3aed" }}
            >
              <span className="text-lg">📌</span>
              الصق رابط Google Maps مباشرة
            </button>

            {showMapsUrlInput && (
              <div className="mt-3 p-4 rounded-2xl" style={{ background: "#fff", border: "2px solid #7c3aed30" }}>
                <p className="text-xs mb-2 font-medium" style={{ color: "#6b7280" }}>
                  الصق رابط المطعم أو الكافيه من Google Maps
                </p>
                <textarea
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-sm border-2 outline-none resize-none font-mono"
                  style={{ background: "#f8f5ff", borderColor: "#e5e7eb", color: "#1a1a2e" }}
                  dir="ltr"
                />
                <button
                  onClick={handleResolveUrl}
                  disabled={!mapsUrl.trim() || resolvingUrl}
                  className="w-full h-11 mt-2 rounded-xl text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: "#7c3aed" }}
                >
                  {resolvingUrl ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      يفحص صور المنيو...
                    </>
                  ) : (
                    <>استخراج صور المنيو</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* أو ابحث بالاسم */}
          <div className="w-full max-w-sm mt-4">
            <p className="text-xs mb-2" style={{ color: "#9ca3af" }}>أو ابحث مباشرة باسم المكان</p>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    setSelectedType("search");
                    setSearchQuery(query.trim());
                  }
                }}
                placeholder="مثال: ستاربكس، هاف مليون..."
                className="flex-1 h-12 px-4 rounded-2xl text-sm font-medium border-2 outline-none"
                style={{ background: "#fff", borderColor: "#e5e7eb", color: "#1a1a2e" }}
              />
              <button
                onClick={() => {
                  if (query.trim()) {
                    setSelectedType("search");
                    setSearchQuery(query.trim());
                  }
                }}
                disabled={!query.trim()}
                className="h-12 px-5 rounded-2xl text-white font-bold text-sm disabled:opacity-40"
                style={{ background: "#7c3aed" }}
              >
                بحث
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Header (يظهر بعد اختيار النوع) ===== */}
      {!selectedPlace && selectedType && (
        <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: "#f8f5ff" }}>
          {/* شريط العودة + اسم النوع */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => {
                setSelectedType(null);
                setSearchQuery("");
                setQuery("");
                setSelectedPlace(null);
                setAnalysis(null);
                setSelectedItems([]);
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#f0ebff" }}
            >
              <ChevronRight className="w-5 h-5" style={{ color: "#7c3aed" }} />
            </button>
            {(() => {
              const t = PLACE_TYPES.find((t) => t.id === selectedType);
              return (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{t?.emoji ?? "🔍"}</span>
                  <h1 className="text-xl font-black" style={{ color: "#1a1a2e" }}>
                    {selectedType === "search" ? `نتائج: ${searchQuery}` : t?.label ?? ""}
                  </h1>
                </div>
              );
            })()}
          </div>

          {/* حقل البحث */}
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="ابحث بالاسم (اختياري)..."
              className="flex-1 h-11 px-4 rounded-2xl text-sm font-medium border-2 outline-none"
              style={{ background: "#fff", borderColor: "#e5e7eb", color: "#1a1a2e" }}
            />
            <button
              onClick={handleSearch}
              disabled={!query.trim() || isLoadingPlaces}
              className="h-11 px-4 rounded-2xl text-white font-bold text-sm disabled:opacity-50"
              style={{ background: "#7c3aed" }}
            >
              {isLoadingPlaces ? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث"}
            </button>
          </div>

          {/* حالة الموقع */}
          {locationLoading && (
            <div className="flex items-center gap-2 mt-2 px-1">
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#7c3aed" }} />
              <p className="text-xs" style={{ color: "#7c3aed" }}>جاري تحديد موقعك...</p>
            </div>
          )}
          {locationError && (
            <div className="flex items-center justify-between mt-2 px-3 py-2 rounded-xl" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <p className="text-xs" style={{ color: "#dc2626" }}>{locationError}</p>
              <button onClick={requestLocation} className="text-xs font-bold" style={{ color: "#7c3aed" }}>إعادة المحاولة</button>
            </div>
          )}
          {userLocation && !searchQuery && (
            <p className="text-xs mt-1.5 px-1" style={{ color: "#9ca3af" }}>📍 أقرب الأماكن منك (5 كم)</p>
          )}
          {searchQuery && (
            <div className="flex items-center gap-2 mt-1.5 px-1">
              <p className="text-xs flex-1" style={{ color: "#9ca3af" }}>نتائج: {searchQuery}</p>
              <button
                onClick={() => { setSearchQuery(""); setQuery(""); }}
                className="text-xs font-bold"
                style={{ color: "#7c3aed" }}
              >✕ مسح</button>
            </div>
          )}
        </div>
      )}

      {/* ===== قائمة الأماكن ===== */}
      {!selectedPlace && selectedType && (
        <div className="px-4 space-y-3">
          {isLoadingPlaces && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#7c3aed" }} />
              <p className="text-sm font-bold" style={{ color: "#7c3aed" }}>
                {searchQuery ? "يبحث..." : "يجلب الأماكن القريبة..."}
              </p>
            </div>
          )}

          {!isLoadingPlaces && displayedPlaces.length === 0 && (userLocation || searchQuery) && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-bold" style={{ color: "#6b7280" }}>لا توجد نتائج قريبة</p>
              <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>جرّب بحثاً مختلفاً</p>
            </div>
          )}

          {!isLoadingPlaces && !userLocation && !locationError && !searchQuery && (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="text-6xl mb-4">📍</div>
              <h2 className="font-black text-lg mb-2" style={{ color: "#1a1a2e" }}>تحديد الموقع</h2>
              <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
                اسمح بالوصول لموقعك لعرض الأماكن القريبة منك
              </p>
              <button
                onClick={requestLocation}
                className="mt-4 px-6 py-3 rounded-2xl text-white font-bold text-sm"
                style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
              >
                📍 تحديد موقعي
              </button>
            </div>
          )}

          {/* عداد الفحص */}
          {nearbyResult.data && nearbyResult.data.checkedCount > 0 && (
            <div className="text-xs text-center py-1 px-3 rounded-xl mx-2" style={{ color: "#6b7280", background: "#f9fafb" }}>
              🤖 فحص الذكاء الاصطناعي {nearbyResult.data.checkedCount} مكاناً — يظهر فقط من لديه صور منيو بأسعار وأصناف مكتوبة
            </div>
          )}

          {displayedPlaces.map((place: any) => (
            <button
              key={place.placeId}
              onClick={() => handleSelectPlace(place)}
              className="w-full text-right rounded-2xl overflow-hidden transition-transform active:scale-98 shadow-sm"
              style={{ background: "#fff", border: "1.5px solid #f0ebff" }}
            >
              {/* صورة المكان */}
              {place.photoUrl && (
                <div className="w-full h-44 overflow-hidden relative">
                  <img
                    src={place.photoUrl}
                    alt={place.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  {/* شارة منيو مؤكد بالذكاء الاصطناعي */}
                  <div
                    className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
                    style={{ background: "rgba(22,163,74,0.92)", color: "#fff" }}
                  >
                    🤖✅ منيو مؤكد • {place.menuPhotoCount} صورة بأسعار
                  </div>
                  {/* حالة الفتح */}
                  {place.isOpen === true && (
                    <div
                      className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-bold"
                      style={{ background: "#16a34a", color: "#fff" }}
                    >
                      مفتوح الآن
                    </div>
                  )}
                  {place.isOpen === false && (
                    <div
                      className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-bold"
                      style={{ background: "#dc2626", color: "#fff" }}
                    >
                      مغلق
                    </div>
                  )}
                </div>
              )}

              {/* معاينة صور المنيو المصغّرة */}
              {place.menuPreviewUrls?.length > 0 && (
                <div className="flex gap-1 px-3 pt-2">
                  {place.menuPreviewUrls.map((url: string, idx: number) => (
                    <div key={idx} className="flex-1 h-16 rounded-lg overflow-hidden" style={{ maxWidth: "33%" }}>
                      <img
                        src={url}
                        alt={`منيو ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <h3 className="font-black text-base leading-tight" style={{ color: "#1a1a2e" }}>{place.name}</h3>
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "#6b7280" }}>📍 {place.address}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ background: "#fef3c7", color: "#d97706" }}>
                      ⭐ {place.rating?.toFixed(1)}
                    </span>
                    {place.totalRatings > 0 && (
                      <span className="text-xs" style={{ color: "#9ca3af" }}>{place.totalRatings.toLocaleString("ar")} تقييم</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {place.distanceKm !== null && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                      📏 {place.distanceKm} كم
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f0ebff", color: "#7c3aed" }}>
                    🤖 اضغط لاستخراج المنيو بالذكاء
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ===== تفاصيل المكان المختار ===== */}
      {selectedPlace && (
        <div className="px-4 space-y-4">
          {/* زر العودة */}
          <button
            onClick={() => { setSelectedPlace(null); setAnalysis(null); setSelectedItems([]); }}
            className="flex items-center gap-2 text-sm font-bold py-2"
            style={{ color: "#7c3aed" }}
          >
            <ChevronRight className="w-4 h-4" />
            العودة للنتائج
          </button>

          {/* رأس المكان */}
          <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "#fff", border: "1.5px solid #f0ebff" }}>
            {selectedPlace.photoUrl && (
              <div className="w-full h-52 overflow-hidden">
                <img
                  src={selectedPlace.photoUrl}
                  alt={selectedPlace.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h2 className="font-black text-xl" style={{ color: "#1a1a2e" }}>{selectedPlace.name}</h2>
                  <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>📍 {selectedPlace.address}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-black" style={{ background: "#fef3c7", color: "#d97706" }}>
                    ⭐ {selectedPlace.rating?.toFixed(1)}
                  </span>
                  <span className="text-xs" style={{ color: "#9ca3af" }}>{selectedPlace.totalRatings?.toLocaleString("ar")} تقييم</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(selectedPlace.googleMapsUrl, "_blank")}
                  className="flex-1 h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
                  style={{ background: "linear-gradient(135deg, #4285f4, #1a73e8)" }}
                >
                  <MapPin className="w-4 h-4" />
                  خرائط Google
                </button>
                {onOrderFromPlace && (
                  <button
                    onClick={handleOrderWithItems}
                    className="flex-1 h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                  >
                    🛒 {selectedItems.length > 0 ? `اطلب (${selectedItems.length})` : "اطلب الآن"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* تحليل AI - جاري */}
          {analyzing && (
            <div className="rounded-2xl p-6 flex flex-col items-center gap-3" style={{ background: "#fff", border: "1.5px solid #f0ebff" }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#7c3aed" }} />
              <p className="font-bold text-sm" style={{ color: "#7c3aed" }}>🤖 يجلب صور المنيو ويحللها...</p>
              <p className="text-xs text-center" style={{ color: "#9ca3af" }}>يستخرج الأصناف والأسعار من الصور الحقيقية</p>
            </div>
          )}

          {/* نتائج التحليل */}
          {analysis && !analyzing && (
            <>
              {/* ملخص */}
              <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #7c3aed15, #6d28d910)", border: "1.5px solid #e9d5ff" }}>
                <h3 className="font-black text-sm mb-2" style={{ color: "#7c3aed" }}>✨ عن المكان</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>{analysis.aiSummary || analysis.summary}</p>
              </div>

              {/* ===== صور قائمة الطعام الحقيقية - مؤكدة بالذكاء الاصطناعي ===== */}
              {analysis.menuPhotoUrls?.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "2px solid #16a34a" }}>
                  <div className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-black text-sm flex items-center gap-2" style={{ color: "#15803d" }}>
                          <span>🤖✅ صور قائمة الطعام الحقيقية</span>
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                          مؤكدة بالذكاء الاصطناعي • تحتوي أسعار وأصناف مكتوبة • اضغط لتكبير
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: "#dcfce7", color: "#15803d" }}>
                        {analysis.menuPhotoUrls.length} صورة
                      </span>
                    </div>
                  </div>
                  {/* عرض الصور أفقياً بحجم كبير مع إمكانية التكبير */}
                  <div className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-hide">
                    {analysis.menuPhotoUrls.map((url: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => window.open(url, "_blank")}
                        className="shrink-0 rounded-2xl overflow-hidden shadow-md relative group"
                        style={{ border: "2px solid #16a34a" }}
                        title="اضغط لتكبير الصورة"
                      >
                        <img
                          src={url}
                          alt={`صورة قائمة الطعام ${i + 1}`}
                          className="h-64 w-auto object-cover"
                          style={{ minWidth: "200px", maxWidth: "300px" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        {/* طبقة تكبير عند التحويم */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.3)" }}>
                          <span className="text-white font-bold text-sm bg-black bg-opacity-60 px-3 py-1 rounded-full">اضغط للتكبير 🔍</span>
                        </div>
                        {/* رقم الصورة */}
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#16a34a", color: "#fff" }}>
                          {i + 1}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== المنيو المستخرج بـ AI مع إمكانية الاختيار ===== */}
              {analysis.menuItems?.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1.5px solid #f0ebff" }}>
                  <div className="p-4 pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-black text-sm" style={{ color: "#1a1a2e" }}>
                        📋 الأصناف والأسعار
                        {analysis.menuPhotoUrls?.length > 0 && (
                          <span className="text-xs font-normal mr-1" style={{ color: "#9ca3af" }}>(مستخرجة من الصور)</span>
                        )}
                      </h3>
                      {selectedItems.length > 0 && onOrderFromPlace && (
                        <button
                          onClick={handleOrderWithItems}
                          className="px-3 py-1.5 rounded-xl text-white text-xs font-bold"
                          style={{ background: "#7c3aed" }}
                        >
                          🛒 اطلب ({selectedItems.length})
                        </button>
                      )}
                    </div>
                    {/* تبويبات الفئات */}
                    <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
                      <button
                        onClick={() => setActiveMenuCategory(null)}
                        className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                        style={!activeMenuCategory ? { background: "#7c3aed", color: "#fff" } : { background: "#f3f4f6", color: "#6b7280" }}
                      >
                        الكل
                      </button>
                      {menuCategories.map((cat: string) => (
                        <button
                          key={cat}
                          onClick={() => setActiveMenuCategory(cat)}
                          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                          style={activeMenuCategory === cat ? { background: "#7c3aed", color: "#fff" } : { background: "#f3f4f6", color: "#6b7280" }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 pb-4 space-y-2">
                    {filteredMenuItems.map((item: any, i: number) => {
                      const isSelected = selectedItems.some((s) => s.name === item.name);
                      const selItem = selectedItems.find((s) => s.name === item.name);
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl transition-all"
                          style={{
                            background: isSelected ? "#f0ebff" : "#f8f5ff",
                            border: isSelected ? "1.5px solid #7c3aed" : "1.5px solid transparent",
                          }}
                        >
                          <span className="text-2xl shrink-0">{item.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm" style={{ color: "#1a1a2e" }}>{item.name}</p>
                            {item.description && (
                              <p className="text-xs line-clamp-1" style={{ color: "#6b7280" }}>{item.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.price && (
                              <span className="font-black text-sm" style={{ color: "#7c3aed" }}>{item.price} ر.س</span>
                            )}
                            {onOrderFromPlace && (
                              isSelected ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => updateQty(item.name, -1)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
                                    style={{ background: "#e9d5ff", color: "#7c3aed" }}
                                  >−</button>
                                  <span className="w-5 text-center text-sm font-bold" style={{ color: "#1a1a2e" }}>
                                    {selItem?.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQty(item.name, 1)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
                                    style={{ background: "#7c3aed", color: "#fff" }}
                                  >+</button>
                                  <button
                                    onClick={() => toggleItem(item)}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                                    style={{ background: "#fee2e2", color: "#dc2626" }}
                                  >✕</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => toggleItem(item)}
                                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg"
                                  style={{ background: "#f0ebff", color: "#7c3aed" }}
                                >+</button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* يشتهر بـ */}
              {analysis.famousFor?.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1.5px solid #f0ebff" }}>
                  <h3 className="font-black text-sm mb-3" style={{ color: "#1a1a2e" }}>🏆 يشتهر بـ</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.famousFor.map((item: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "#fef3c7", color: "#d97706" }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* الأصناف الترند */}
              {analysis.trendingItems?.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1.5px solid #f0ebff" }}>
                  <h3 className="font-black text-sm mb-3" style={{ color: "#1a1a2e" }}>🔥 الأكثر طلباً الآن</h3>
                  <div className="space-y-2">
                    {analysis.trendingItems.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
                        <span className="text-2xl">{item.emoji}</span>
                        <div className="flex-1">
                          <p className="font-bold text-sm" style={{ color: "#1a1a2e" }}>{item.name}</p>
                          <p className="text-xs" style={{ color: "#6b7280" }}>{item.description}</p>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "#fee2e2", color: "#dc2626" }}>🔥 ترند</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* سلة الطلب المختارة */}
              {selectedItems.length > 0 && onOrderFromPlace && (
                <div className="rounded-2xl p-4 sticky bottom-4" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: "0 8px 24px #7c3aed40" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-sm text-white">🛒 الأصناف المختارة</h3>
                    <span className="text-xs text-white/70">{selectedItems.length} صنف</span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {selectedItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-white/90">{item.emoji} {item.name}</span>
                        <span className="text-xs text-white/70">×{item.quantity}{item.price !== "0" ? ` — ${(parseFloat(item.price) * item.quantity).toFixed(2)} ر.س` : ""}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleOrderWithItems}
                    className="w-full h-12 rounded-xl bg-white font-black text-sm transition-transform active:scale-95"
                    style={{ color: "#7c3aed" }}
                  >
                    تأكيد ← إدخال في صفحة الطلب
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}


