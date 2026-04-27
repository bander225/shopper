import { Button } from "@/components/ui/button";
import { PhoneLoginModal } from "@/components/PhoneLoginModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { MapView } from "@/components/Map";
import {
  AlertCircle, Camera, CheckCircle2, Clock, Loader2, MapPin, Package, Phone, Star,
  Truck, X, Zap, Settings, Bell, Navigation, MessageCircle, Wifi, WifiOff,
  Timer, BarChart3, History, User, TrendingUp, Calendar, DollarSign,
  ListOrdered, PlayCircle, StopCircle, RotateCcw, Plus, ChevronDown, Store, LogOut as StoreOut, ShieldCheck, Search, Trash2
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

const MAX_ORDERS_OPTIONS = [1, 2, 3, 5, 10, 20, 50];

// ─── City Select ─────────────────────────────────────────────────────────────
function CitySelectForDriver({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: cities, isLoading } = trpc.cities.listActive.useQuery();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="rounded-xl mt-1">
        <SelectValue placeholder={isLoading ? "جاري التحميل..." : "اختر مدينتك"} />
      </SelectTrigger>
      <SelectContent>
        {cities?.map(c => (
          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Street Select ────────────────────────────────────────────────────────────
function StreetSelectForDriver({ cityId, value, onChange }: { cityId: string; value: string; onChange: (v: string) => void }) {
  const { data: streets, isLoading } = trpc.cities.getStreets.useQuery(
    { cityId: Number(cityId) },
    { enabled: !!cityId }
  );
  return (
    <Select value={value} onValueChange={onChange} disabled={!cityId}>
      <SelectTrigger className="rounded-xl mt-1">
        <SelectValue placeholder={!cityId ? "اختر المدينة أولاً" : isLoading ? "جاري التحميل..." : "اختر شارعك"} />
      </SelectTrigger>
      <SelectContent>
        {streets?.map((s: any) => (
          <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Countdown Timer ─────────────────────────────────────────────────────────
function CountdownTimer({ expiresAt }: { expiresAt: Date | string }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemaining(Math.ceil(diff / 1000));
    };
    calc();
    const interval = setInterval(calc, 500);
    return () => clearInterval(interval);
  }, [expiresAt]);
  const color = remaining > 30 ? "text-green-400" : remaining > 10 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <Timer className={`w-4 h-4 ${color}`} />
      <span className={`font-mono font-bold text-sm ${color}`}>{remaining}ث</span>
      <div className="w-12 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${remaining > 30 ? "bg-green-400" : remaining > 10 ? "bg-yellow-400" : "bg-red-400"}`}
          style={{ width: `${Math.min(100, (remaining / 90) * 100)}%` }} />
      </div>
    </div>
  );
}

// ─── Go Online Modal ──────────────────────────────────────────────────────────
function GoOnlineModal({ open, onConfirm, onClose, defaultCityId, defaultStreetId }: {
  open: boolean;
  onConfirm: (cityId: number, streetId: number) => void;
  onClose: () => void;
  defaultCityId?: number | null;
  defaultStreetId?: number | null;
}) {
  const [cityId, setCityId] = useState("");
  const [streetId, setStreetId] = useState("");

  // تعبئة المدينة والشارع تلقائياً من بيانات المندوب عند فتح النافذة
  useEffect(() => {
    if (open) {
      if (defaultCityId) setCityId(String(defaultCityId));
      else setCityId("");
      if (defaultStreetId) setStreetId(String(defaultStreetId));
      else setStreetId("");
    }
  }, [open, defaultCityId, defaultStreetId]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" dir="rtl">
      <Card className="w-full max-w-sm border-0 shadow-2xl">
        <CardHeader className="bg-green-600 text-white rounded-t-xl pb-4">
          <CardTitle className="flex items-center gap-2 text-white">
            <Wifi className="w-5 h-5" />
            أين أنت الآن؟
          </CardTitle>
          <p className="text-green-100 text-sm mt-1">حدد مدينتك وشارعك لتستقبل الطلبات</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div>
            <Label className="font-bold text-sm">المدينة *</Label>
            <CitySelectForDriver value={cityId} onChange={(v) => { setCityId(v); setStreetId(""); }} />
          </div>
          <div>
            <Label className="font-bold text-sm">الشارع *</Label>
            <StreetSelectForDriver cityId={cityId} value={streetId} onChange={setStreetId} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl h-12 font-bold"
              disabled={!cityId || !streetId}
              onClick={() => onConfirm(Number(cityId), Number(streetId))}
            >
              <Wifi className="w-4 h-4 ml-2" />
              بدء الاستقبال
            </Button>
            <Button variant="outline" className="rounded-xl h-12 px-4" onClick={onClose}>إلغاء</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Haversine Distance ────────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Distance Calculator (server-side via Distance Matrix API) ──────────────
function DistanceCalculator({ driverLat, driverLng, order, onResult }: {
  driverLat: number | null;
  driverLng: number | null;
  order: any;
  onResult: (distKm: number, etaMins: number) => void;
}) {
  const destLat = order?.deliveryLat ? parseFloat(String(order.deliveryLat)) : null;
  const destLng = order?.deliveryLng ? parseFloat(String(order.deliveryLng)) : null;
  const pickLat = order?.restaurantLat ? parseFloat(String(order.restaurantLat)) : null;
  const pickLng = order?.restaurantLng ? parseFloat(String(order.restaurantLng)) : null;
  const canQuery = driverLat !== null && driverLng !== null && destLat !== null && destLng !== null;
  const { data } = trpc.orders.calcDistance.useQuery(
    {
      originLat: driverLat ?? 0,
      originLng: driverLng ?? 0,
      waypointLat: pickLat ?? undefined,
      waypointLng: pickLng ?? undefined,
      destLat: destLat ?? 0,
      destLng: destLng ?? 0,
    },
    {
      enabled: canQuery,
      staleTime: 60_000,
      retry: 1,
    }
  );
  // Haversine fallback للعرض الفوري قبل وصول نتيجة الخادم
  const haversineResult = canQuery ? (() => {
    const d2p = (pickLat && pickLng) ? haversineKm(driverLat!, driverLng!, pickLat, pickLng) : 0;
    const p2d = (pickLat && pickLng) ? haversineKm(pickLat, pickLng, destLat!, destLng!) : haversineKm(driverLat!, driverLng!, destLat!, destLng!);
    const km = d2p + p2d;
    return { distKm: km, etaMins: Math.round((km / 40) * 60) };
  })() : null;
  const result = data
    ? { distKm: data.distanceKm, etaMins: data.durationMinutes }
    : haversineResult;
  useEffect(() => {
    if (result) onResult(result.distKm, result.etaMins);
  }, [result?.distKm, result?.etaMins]);
  return null;
}

// ─── New Order Request Banner ─────────────────────────────────────────────────
function NewOrderRequestBanner({ requests, onAccept, onReject, defaultFee, driverLat, driverLng, maxDeliveryKm, driverAddress }: {
  requests: any[];
  onAccept: (requestId: number, fee: string) => void;
  onReject: (requestId: number) => void;
  defaultFee: string;
  driverLat: number | null;
  driverLng: number | null;
  maxDeliveryKm: number;
  driverAddress?: string;
}) {
  // حالة لتخزين المسافات المحسوبة عبر Google Maps
  const [gmDistances, setGmDistances] = useState<Record<number, { distKm: number; etaMins: number } | null>>({});
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (requests.length > prevCountRef.current) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);
      } catch {}
    }
    prevCountRef.current = requests.length;
  }, [requests.length]);

  // حساب المسافة: عرض Haversine فوراً، ثم تحديث بـ Google Maps إذا كان متاحاً
  useEffect(() => {
    if (requests.length === 0) return;
    requests.forEach((req) => {
      if (gmDistances[req.requestId] !== undefined) return; // محسوب مسبقاً
      const order = req.order;
      if (!order) return;

      const destLat = order.deliveryLat ? parseFloat(String(order.deliveryLat)) : null;
      const destLng = order.deliveryLng ? parseFloat(String(order.deliveryLng)) : null;
      const pickLat = order.restaurantLat ? parseFloat(String(order.restaurantLat)) : null;
      const pickLng = order.restaurantLng ? parseFloat(String(order.restaurantLng)) : null;

      // ─── خطوة 1: عرض Haversine فوراً (لا انتظار) ───
      if (driverLat !== null && driverLng !== null && destLat !== null && destLng !== null) {
        const driverToPickup = (pickLat && pickLng)
          ? haversineKm(driverLat!, driverLng!, pickLat, pickLng)
          : 0;
        const pickupToDelivery = (pickLat && pickLng)
          ? haversineKm(pickLat, pickLng, destLat, destLng)
          : haversineKm(driverLat!, driverLng!, destLat, destLng);
        const totalKm = driverToPickup + pickupToDelivery;
        const etaMins = Math.round((totalKm / 40) * 60);
        // ضبط null مبدئياً لإيقاف شريط التحميل، ثم تحديث بـ Google Maps
        setGmDistances(prev => ({ ...prev, [req.requestId]: { distKm: totalKm, etaMins } }));
      } else {
        // لا توجد إحداثيات - أوقف التحميل
        setGmDistances(prev => ({ ...prev, [req.requestId]: null }));
        return;
      }

      // ─── خطوة 2: تحسين النتيجة بـ Google Maps إذا كان متاحاً (في الخلفية) ───
      const origin = (driverLat && driverLng) ? `${driverLat},${driverLng}` : driverAddress;
      const destination = (destLat && destLng) ? `${destLat},${destLng}` : order.deliveryAddressText;
      if (!origin || !destination) return;

      let gmAttempts = 0;
      const tryGoogleMaps = () => {
        if (typeof (window as any).google === 'undefined' || !(window as any).google?.maps?.DistanceMatrixService) {
          gmAttempts++;
          if (gmAttempts < 5) setTimeout(tryGoogleMaps, 1000);
          return; // Haversine يبقى معروضاً
        }
        const service = new (window as any).google.maps.DistanceMatrixService();
        service.getDistanceMatrix(
          {
            origins: [origin],
            destinations: [destination],
            travelMode: (window as any).google.maps.TravelMode.DRIVING,
            unitSystem: (window as any).google.maps.UnitSystem.METRIC,
          },
          (response: any, status: string) => {
            if (status === 'OK' && response?.rows?.[0]?.elements?.[0]?.status === 'OK') {
              const el = response.rows[0].elements[0];
              const distKm = el.distance.value / 1000;
              const etaMins = Math.round(el.duration.value / 60);
              // تحديث بنتيجة Google Maps الأدق
              setGmDistances(prev => ({ ...prev, [req.requestId]: { distKm, etaMins } }));
            }
            // إذا فشل Google Maps، تبقى نتيجة Haversine معروضة
          }
        );
      };
      tryGoogleMaps();
    });
  }, [requests, driverLat, driverLng, driverAddress]);

  if (requests.length === 0) return null;
  return (
    <div className="space-y-4 mb-4">
      {/* حساب المسافة عبر Distance Matrix API لكل طلب */}
      {requests.map((req) => (
        <DistanceCalculator
          key={`dc-${req.requestId}`}
          driverLat={driverLat}
          driverLng={driverLng}
          order={req.order}
          onResult={(distKm, etaMins) =>
            setGmDistances(prev => ({ ...prev, [req.requestId]: { distKm, etaMins } }))
          }
        />
      ))}
      {requests.map((req) => {
        const order = req.order;
        // ─── روابط Google Maps ───
        const pickupMapsUrl = order?.googlePlaceLat && order?.googlePlaceLng
          ? `https://www.google.com/maps?q=${parseFloat(String(order.googlePlaceLat)).toFixed(7)},${parseFloat(String(order.googlePlaceLng)).toFixed(7)}`
          : order?.restaurantMapsUrl
            ? order.restaurantMapsUrl
            : order?.googlePlaceName
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.googlePlaceName)}`
              : null;
        const deliveryMapsUrl = order?.deliveryLat && order?.deliveryLng
          ? `https://www.google.com/maps?q=${parseFloat(String(order.deliveryLat)).toFixed(7)},${parseFloat(String(order.deliveryLng)).toFixed(7)}`
          : order?.deliveryAddressText
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddressText)}`
            : null;

        // ─── حساب المسافة وزمن الوصول ───
        const delivLat = order?.deliveryLat ? parseFloat(String(order.deliveryLat)) : null;
        const delivLng = order?.deliveryLng ? parseFloat(String(order.deliveryLng)) : null;
        // موقع الاستلام: إما من المتجر المسجّل أو من Google Place
        const pickupLat = order?.restaurantLat ? parseFloat(String(order.restaurantLat)) : null;
        const pickupLng = order?.restaurantLng ? parseFloat(String(order.restaurantLng)) : null;
        const hasDriverLocation = driverLat !== null && driverLng !== null && !isNaN(driverLat!) && !isNaN(driverLng!);
        const hasDeliveryLocation = delivLat !== null && delivLng !== null;
        const hasPickupLocation = pickupLat !== null && pickupLng !== null;
        // مسافة المندوب إلى موقع الاستلام (المتجر)
        const pickupDistanceKm = (hasDriverLocation && hasPickupLocation)
          ? haversineKm(driverLat!, driverLng!, pickupLat!, pickupLng!)
          : null;
        // مسافة المندوب إلى موقع التوصيل (العميل) - حساب haversine
        const distanceKm_haversine = (hasDriverLocation && hasDeliveryLocation)
          ? haversineKm(driverLat!, driverLng!, delivLat!, delivLng!)
          : null;
        // المسافة الإجمالية = من المندوب إلى المتجر ثم إلى العميل
        const pickupToDeliveryKm = (hasPickupLocation && hasDeliveryLocation)
          ? haversineKm(pickupLat!, pickupLng!, delivLat!, delivLng!)
          : null;
        const totalDistanceKm_haversine = pickupDistanceKm !== null && pickupToDeliveryKm !== null
          ? pickupDistanceKm + pickupToDeliveryKm
          : distanceKm_haversine;

        // استخدام Google Maps Distance Matrix كبديل أفضل (مسافة حقيقية بالطريق)
        const gmData = gmDistances[req.requestId];
        const distanceKm = gmData ? gmData.distKm : distanceKm_haversine;
        const totalDistanceKm = gmData ? gmData.distKm : totalDistanceKm_haversine;
        const etaMinutes = gmData ? gmData.etaMins : (totalDistanceKm !== null ? Math.round((totalDistanceKm / 40) * 60) : null);
        // لا يظهر شريط التحميل - Haversine يعرض فوراً
        const isLoadingDistance = false;

        // حد المسافة: إذا كان maxDeliveryKm = 0 فاستخدم 5 كم كحد افتراضي
        const effectiveMaxKm = maxDeliveryKm > 0 ? maxDeliveryKm : 5;
        const exceedsMax = distanceKm !== null && distanceKm > effectiveMaxKm;

        return (
          <div key={req.requestId} className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "2px solid #7c3aed", boxShadow: "0 4px 16px rgba(124,58,237,0.18)" }}>

            {/* ─── رأس البطاقة */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#7c3aed" }}>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-white animate-bounce" />
                <span className="font-bold text-white text-sm">طلب جديد!</span>
                {order && <span className="font-mono text-white/90 text-xs bg-white/20 px-2 py-0.5 rounded-full">#{order.orderNumber}</span>}
              </div>
              <CountdownTimer expiresAt={req.expiresAt} />
            </div>

            {/* ─── شريط تحميل المسافة */}
            {isLoadingDistance && (
              <div className="px-4 py-2 flex items-center gap-2" style={{ background: "#f0f9ff", borderBottom: "1.5px solid #bae6fd" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: "#0284c7" }} />
                <span className="text-xs font-bold" style={{ color: "#0369a1" }}>جاري حساب المسافة ووقت التوصيل...</span>
              </div>
            )}
            {/* ─── شريط المسافة وزمن الوصول */}
            {(totalDistanceKm !== null || distanceKm !== null) && (
              <div className="px-4 py-2 space-y-1" style={{ background: exceedsMax ? "#fef2f2" : "#f0fdf4", borderBottom: `1.5px solid ${exceedsMax ? "#fca5a5" : "#86efac"}` }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5" style={{ color: exceedsMax ? "#dc2626" : "#16a34a" }} />
                    <span className="text-xs font-bold" style={{ color: exceedsMax ? "#dc2626" : "#15803d" }}>
                      موقع تسليم العميل يبعد {(totalDistanceKm ?? distanceKm)!.toFixed(1)} كم
                    </span>
                    {exceedsMax && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#dc2626", color: "#fff" }}>
                        تجاوز الحد ({effectiveMaxKm} كم)
                      </span>
                    )}
                  </div>
                  {etaMinutes !== null && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" style={{ color: exceedsMax ? "#dc2626" : "#16a34a" }} />
                      <span className="text-xs font-bold" style={{ color: exceedsMax ? "#dc2626" : "#15803d" }}>
                        {etaMinutes < 60 ? `${etaMinutes} دقيقة` : `${Math.floor(etaMinutes / 60)} ساعة ${etaMinutes % 60 > 0 ? `${etaMinutes % 60} د` : ""}`}
                      </span>
                    </div>
                  )}
                </div>
                {/* تفصيل المسافات */}
                {pickupDistanceKm !== null && pickupToDeliveryKm !== null && (
                  <div className="flex items-center gap-3 text-xs" style={{ color: "#6b7280" }}>
                    <span>• إلى المتجر: {pickupDistanceKm.toFixed(1)} كم</span>
                    <span>• إلى العميل: {pickupToDeliveryKm.toFixed(1)} كم</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 space-y-3">
              {order && (
                <>
                  {/* ─── تنبيه تجاوز الحد الأقصى */}
                  {exceedsMax && (
                    <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "#fef2f2", border: "1.5px solid #fca5a5" }}>
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#dc2626" }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: "#dc2626" }}>⚠️ المسافة تجاوز حدك الأقصى</p>
                        <p className="text-xs mt-0.5" style={{ color: "#7f1d1d" }}>المسافة {distanceKm!.toFixed(1)} كم وحدك الأقصى {effectiveMaxKm} كم. يمكنك قبوله أو رفضه بحرية.</p>
                      </div>
                    </div>
                  )}

                  {/* ─── خطوات الطلب */}
                  <div className="flex items-center gap-0">
                    {[
                      { icon: "✅", label: "قبول" },
                      { icon: "🛒", label: "استلام من المتجر" },
                      { icon: "🚗", label: "في الطريق" },
                      { icon: "🏁", label: "تسليم" },
                    ].map((step, i, arr) => (
                      <div key={i} className="flex items-center" style={{ flex: i < arr.length - 1 ? 1 : "none" }}>
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                            style={{ background: i === 0 ? "#7c3aed" : "#e5e7eb", color: i === 0 ? "#fff" : "#9ca3af",
                              boxShadow: i === 0 ? "0 0 0 3px rgba(124,58,237,0.25)" : "none" }}>
                            {step.icon}
                          </div>
                          <span className="text-[9px] font-bold mt-1 text-center leading-tight"
                            style={{ color: i === 0 ? "#7c3aed" : "#9ca3af", maxWidth: "52px" }}>
                            {step.label}
                          </span>
                        </div>
                        {i < arr.length - 1 && <div className="h-0.5 flex-1 mx-1 mb-4" style={{ background: "#e5e7eb" }} />}
                      </div>
                    ))}
                  </div>

                  {/* ─── بيانات العميل */}
                  {(order.customerName || order.customerPhone) && (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: "#f0f9ff", border: "1.5px solid #bae6fd" }}>
                      <p className="text-xs font-bold" style={{ color: "#0369a1" }}>👤 بيانات العميل</p>
                      {order.customerName && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: "#374151" }}>الاسم</span>
                          <span className="text-xs font-bold" style={{ color: "#111827" }}>{order.customerName}</span>
                        </div>
                      )}
                      {order.customerPhone && (
                        <a href={`tel:${order.customerPhone}`} className="flex items-center justify-between w-full">
                          <span className="text-xs" style={{ color: "#374151" }}>الجوال</span>
                          <span className="text-xs font-bold flex items-center gap-1" style={{ color: "#2563eb" }}>
                            <Phone className="w-3 h-3" />{order.customerPhone}
                          </span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* ─── موقع الاستلام (المتجر) */}
                  {(order.googlePlaceName || order.restaurantName) && (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: "#fff7ed", border: "1.5px solid #fed7aa" }}>
                      <p className="text-xs font-bold" style={{ color: "#fbbf24" }}>🛒 موقع الاستلام (المتجر)</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "#374151" }}>اسم المتجر</span>
                        <span className="text-xs font-bold" style={{ color: "#111827" }}>{order.googlePlaceName || order.restaurantName}</span>
                      </div>
                      {order.restaurantAddress && (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs shrink-0" style={{ color: "#374151" }}>العنوان</span>
                          <span className="text-xs font-bold text-right" style={{ color: "#374151" }}>{order.restaurantAddress}</span>
                        </div>
                      )}
                      {pickupMapsUrl && (
                        <a href={pickupMapsUrl} target="_blank" rel="noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-bold mt-1"
                          style={{ background: "#ea4335", color: "#ffffff" }}>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                          افتح في خرائط Google — الاستلام
                        </a>
                      )}
                    </div>
                  )}

                  {/* ─── موقع التسليم */}
                  {order.deliveryAddressText && (() => {
                    const dLat = order.deliveryLat ? parseFloat(String(order.deliveryLat)) : null;
                    const dLng = order.deliveryLng ? parseFloat(String(order.deliveryLng)) : null;
                    const FORGE = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
                    const FKEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
                    // حساب المركز بين المندوب وموقع التسليم إذا كان الموقعان متاحَين
                    const hasDriver = driverLat !== null && driverLng !== null;
                    const centerLat = hasDriver ? ((driverLat! + (dLat ?? driverLat!)) / 2) : (dLat ?? 0);
                    const centerLng = hasDriver ? ((driverLng! + (dLng ?? driverLng!)) / 2) : (dLng ?? 0);
                    const driverMarker = hasDriver ? `&markers=color:blue%7Clabel:A%7C${driverLat!.toFixed(7)},${driverLng!.toFixed(7)}` : '';
                    const deliveryMarker = dLat && dLng ? `&markers=color:red%7Clabel:B%7C${dLat.toFixed(7)},${dLng.toFixed(7)}` : '';
                    const staticMapUrl = dLat && dLng
                      ? `${FORGE}/v1/maps/proxy/maps/api/staticmap?center=${centerLat.toFixed(7)},${centerLng.toFixed(7)}&zoom=${hasDriver ? 14 : 16}&size=400x160&scale=2${driverMarker}${deliveryMarker}&key=${FKEY}`
                      : null;
                    return (
                      <div className="rounded-xl overflow-hidden" style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0" }}>
                        <div className="px-3 pt-3 pb-2">
                          <p className="text-xs font-bold" style={{ color: "#15803d" }}>🏠 موقع التسليم (العميل)</p>
                          <div className="flex items-start justify-between gap-2 mt-1.5">
                            <span className="text-xs shrink-0" style={{ color: "#374151" }}>العنوان</span>
                            <span className="text-xs font-bold text-right" style={{ color: "#111827" }}>{order.deliveryAddressText}</span>
                          </div>
                        </div>
                        {staticMapUrl && (
                          <a href={deliveryMapsUrl ?? '#'} target="_blank" rel="noreferrer" className="block relative">
                            <img src={staticMapUrl} alt="موقع التسليم" className="w-full" style={{ height: 120, objectFit: "cover", display: "block" }} />
                            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-3">
                              {hasDriver && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(37,99,235,0.9)", color: "#fff" }}>A أنت هنا</span>}
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.9)", color: "#fff" }}>{hasDriver ? 'B' : '📍'} التسليم</span>
                            </div>
                          </a>
                        )}
                        {!staticMapUrl && deliveryMapsUrl && (
                          <div className="px-3 pb-3">
                            <a href={deliveryMapsUrl} target="_blank" rel="noreferrer"
                              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-bold mt-1"
                              style={{ background: "#16a34a", color: "#ffffff" }}>
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                              افتح في خرائط Google — التسليم
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ─── المبالغ */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl p-3 text-center" style={{ background: "#f5f3ff", border: "1.5px solid #ddd6fe" }}>
                      <div className="text-xs font-semibold mb-0.5" style={{ color: "#6b7280" }}>قيمة الطلب</div>
                      <div className="font-black text-base" style={{ color: "#7c3aed" }}>{order.subtotal} ريال</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0" }}>
                      <div className="text-xs font-semibold mb-0.5" style={{ color: "#6b7280" }}>رسوم التوصيل</div>
                      <div className="font-black text-base" style={{ color: "#16a34a" }}>{order.deliveryFee ?? defaultFee} ريال</div>
                    </div>
                  </div>

                  {/* ─── ملاحظات */}
                  {order.customerNotes && (
                    <div className="rounded-xl p-3" style={{ background: "#fffbeb", border: "1.5px solid #fde68a" }}>
                      <p className="text-xs font-bold mb-1" style={{ color: "#92400e" }}>📝 ملاحظات العميل</p>
                      <p className="text-xs" style={{ color: "#374151" }}>{order.customerNotes}</p>
                    </div>
                  )}
                </>
              )}

              {/* ─── أزرار القبول/الرفض */}
              <div className="flex gap-3 pt-1">
                <Button className="flex-1 rounded-xl h-12 font-bold text-white"
                  style={{ background: "#16a34a" }}
                  onClick={() => onAccept(req.requestId, order?.deliveryFee ?? defaultFee)}>
                  <CheckCircle2 className="w-5 h-5 ml-2" />قبول الطلب
                </Button>
                <Button className="flex-1 rounded-xl h-12 font-bold text-white"
                  style={{ background: "#dc2626" }}
                  onClick={() => onReject(req.requestId)}>
                  <X className="w-5 h-5 ml-2" />رفض
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Active Order Card ────────────────────────────────────────────────────────
function ActiveOrderCard({ order, onUpdateStatus, proofPreviewGlobal, setProofPreviewGlobal, showConfirmProofGlobal, setShowConfirmProofGlobal, driverLat, driverLng }: any) {
  const [proofFile, setProofFile] = useState<File | null>(null);
  // نستخدم proofPreviewGlobal بدلاً من proofPreview المحلي لمنع إعادة التركيب عند refetch
  const proofPreview = proofPreviewGlobal;
  const setProofPreview = setProofPreviewGlobal;
  const showConfirmProof = showConfirmProofGlobal;
  const setShowConfirmProof = setShowConfirmProofGlobal;
  const [uploading, setUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const uploadDeliveryProof = trpc.orders.uploadDeliveryProof.useMutation({
    onSuccess: () => toast.success("تم رفع صورة التسليم وإغلاق الطلب!"),
    onError: (e) => toast.error(e.message),
  });
  const uploadDriverImage = trpc.upload.driverImage.useMutation();
  // حساب المسافة عبر Distance Matrix API
  const delivLat_ = order?.deliveryLat ? parseFloat(String(order.deliveryLat)) : null;
  const delivLng_ = order?.deliveryLng ? parseFloat(String(order.deliveryLng)) : null;
  const pickLat_ = order?.restaurantLat ? parseFloat(String(order.restaurantLat)) : null;
  const pickLng_ = order?.restaurantLng ? parseFloat(String(order.restaurantLng)) : null;
  const hasOrigin = driverLat !== null && driverLng !== null;
  const hasDest = delivLat_ !== null && delivLng_ !== null;
  const calcDistQuery = trpc.orders.calcDistance.useQuery(
    hasOrigin && hasDest
      ? {
          originLat: driverLat!,
          originLng: driverLng!,
          waypointLat: pickLat_ ?? undefined,
          waypointLng: pickLng_ ?? undefined,
          destLat: delivLat_!,
          destLng: delivLng_!,
        }
      : {
          originLat: pickLat_ ?? 0,
          originLng: pickLng_ ?? 0,
          destLat: delivLat_ ?? 0,
          destLng: delivLng_ ?? 0,
        },
    {
      enabled: hasDest && (hasOrigin || (pickLat_ !== null && pickLng_ !== null)),
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }
  );
  // فتح الكاميرا الخلفية مباشرةة
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      }).catch(() =>
        // إذا فشلت الكاميرا الخلفية جرّب أي كاميرا متاحة
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      );
      setCameraStream(stream);
      setShowCamera(true);
      // ربط الستريم بالفيديو بعد رسم العنصر
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      toast.error("تعذّر فتح الكاميرا. تأكد من منح الصلاحية للتطبيق.");
    }
  };

  // إغلاق الكاميرا
  const closeCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setShowCamera(false);
  };

  // التقاط الصورة من الفيديو مع timestamp وwatermark
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // رسم الصورة الأصلية
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;
    const now = new Date();
    const dateStr = now.toLocaleDateString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit" });
    const timeStr = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const orderNum = order?.orderNumber ?? "";

    // شريط شفاف في الأسفل
    const barH = Math.round(H * 0.12);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, H - barH, W, barH);

    // نص التاريخ والوقت
    const fontSize = Math.round(H * 0.038);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = "middle";
    const midY = H - barH / 2;

    // الجانب الأيسر: رقم الطلب
    ctx.fillStyle = "#f97316"; // برتقالي
    ctx.textAlign = "left";
    ctx.fillText(`طلب #${orderNum}`, 16, midY);

    // الجانب الأيمن: التاريخ والوقت
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText(`${dateStr}  ${timeStr}`, W - 16, midY);

    // شعار التطبيق في الزاوية العلوية اليمنى
    const badgeH = Math.round(H * 0.07);
    ctx.fillStyle = "rgba(0,0,0,0.50)";
    const badgeW = Math.round(W * 0.28);
    ctx.beginPath();
    ctx.roundRect(W - badgeW - 10, 10, badgeW, badgeH, 8);
    ctx.fill();
    const badgeFontSize = Math.round(H * 0.032);
    ctx.font = `bold ${badgeFontSize}px Arial`;
    ctx.fillStyle = "#f97316";
    ctx.textAlign = "center";
    ctx.fillText("📦 إثبات التسليم", W - badgeW / 2 - 10, 10 + badgeH / 2);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `delivery-proof-${Date.now()}.jpg`, { type: "image/jpeg" });
      setProofFile(file);
      setProofPreview(canvas.toDataURL("image/jpeg", 0.92));
      closeCamera();
      setShowConfirmProof(true); // إظهار نافذة التأكيد
    }, "image/jpeg", 0.92);
  };

  // تنظيف الستريم عند إلغاء المكون
  useEffect(() => {
    return () => { cameraStream?.getTracks().forEach(t => t.stop()); };
  }, [cameraStream]);

  const NEXT_STATUS: Record<string, { status: string; label: string; color: string }> = {
    driver_assigned: { status: "picked_up", label: "استلمت الطلب من المطعم", color: "bg-blue-600" },
    picked_up: { status: "on_the_way", label: "أنا في الطريق للعميل", color: "bg-primary" },
  };

  const nextAction = NEXT_STATUS[order.status];
  const needsProof = order.status === "on_the_way";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadProof = async () => {
    if (!proofPreview) return;
    setUploading(true);
    try {
      // استخدام tRPC مباشرة بدلاً من /api/upload غير الموجود
      const { url } = await uploadDriverImage.mutateAsync({ base64: proofPreview, folder: "delivery-proofs" });
      await uploadDeliveryProof.mutateAsync({ orderId: order.id, imageUrl: url });
    } catch (err: any) {
      toast.error(err.message ?? "حدث خطأ أثناء الرفع");
    } finally {
      setUploading(false);
    }
  };

  // ─── روابط Google Maps ───
  const activePickupMapsUrl = order?.googlePlaceLat && order?.googlePlaceLng
    ? `https://www.google.com/maps?q=${parseFloat(String(order.googlePlaceLat)).toFixed(7)},${parseFloat(String(order.googlePlaceLng)).toFixed(7)}`
    : order?.restaurantMapsUrl
      ? order.restaurantMapsUrl
      : order?.googlePlaceName
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.googlePlaceName)}`
        : null;
  const activeDeliveryMapsUrl = order?.deliveryLat && order?.deliveryLng
    ? `https://www.google.com/maps?q=${parseFloat(String(order.deliveryLat)).toFixed(7)},${parseFloat(String(order.deliveryLng)).toFixed(7)}`
    : order?.deliveryAddressText
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddressText)}`
      : null;

  // ─── خطوات الطلب ───
  const orderSteps = [
    { key: "driver_assigned", icon: "✅", label: "تم القبول" },
    { key: "picked_up",       icon: "🛒", label: "استلام من المتجر" },
    { key: "on_the_way",      icon: "🚗", label: "في الطريق" },
    { key: "delivered",       icon: "🏁", label: "تم التسليم" },
  ];
  const orderStatusOrder: Record<string, number> = { driver_assigned: 0, picked_up: 1, on_the_way: 2, delivered: 3 };
  const activeCurrentStep = orderStatusOrder[order.status] ?? 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "2px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.10)" }}>

      {/* ─── رأس البطاقة */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#f9fafb", borderBottom: "2px solid #f3f4f6" }}>
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4" style={{ color: "#7c3aed" }} />
          <span className="font-mono font-bold text-sm" style={{ color: "#7c3aed" }}>{order.orderNumber}</span>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="p-4 space-y-3">

        {/* ─── خطوات الطلب المرتبة */}
        <div className="flex items-center gap-0">
          {orderSteps.map((step, i) => {
            const done = activeCurrentStep > i;
            const active = activeCurrentStep === i;
            return (
              <div key={step.key} className="flex items-center" style={{ flex: i < orderSteps.length - 1 ? 1 : "none" }}>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      background: done ? "#16a34a" : active ? "#7c3aed" : "#e5e7eb",
                      color: done || active ? "#fff" : "#9ca3af",
                      boxShadow: active ? "0 0 0 3px rgba(124,58,237,0.25)" : "none"
                    }}>
                    {done ? "✓" : step.icon}
                  </div>
                  <span className="text-[9px] font-bold mt-1 text-center leading-tight"
                    style={{ color: done ? "#16a34a" : active ? "#7c3aed" : "#9ca3af", maxWidth: "52px" }}>
                    {step.label}
                  </span>
                </div>
                {i < orderSteps.length - 1 && (
                  <div className="h-0.5 flex-1 mx-1 mb-4" style={{ background: done ? "#16a34a" : "#e5e7eb" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ─── بيانات العميل */}
        {(order.customerName || order.customerPhone) && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: "#f0f9ff", border: "1.5px solid #bae6fd" }}>
            <p className="text-xs font-bold" style={{ color: "#0369a1" }}>👤 بيانات العميل</p>
            {order.customerName && (
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#374151" }}>الاسم</span>
                <span className="text-xs font-bold" style={{ color: "#111827" }}>{order.customerName}</span>
              </div>
            )}
            {order.customerPhone && (
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#374151" }}>الجوال</span>
                <div className="flex items-center gap-2">
                  <a href={`tel:${order.customerPhone}`}
                    className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ background: "#2563eb", color: "#fff" }}>
                    <Phone className="w-3 h-3" />{order.customerPhone}
                  </a>
                  <a href={`https://wa.me/${order.customerPhone?.replace(/^0/, '966')}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ background: "#16a34a", color: "#fff" }}>
                    <MessageCircle className="w-3 h-3" />واتساب
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── موقع الاستلام (المتجر) */}
        {(order.googlePlaceName || order.restaurantName) && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: "#fff7ed", border: "1.5px solid #fed7aa" }}>
            <p className="text-xs font-bold" style={{ color: "#fbbf24" }}>🛒 موقع الاستلام (المتجر)</p>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "#374151" }}>اسم المتجر</span>
              <span className="text-xs font-bold" style={{ color: "#111827" }}>{order.googlePlaceName || order.restaurantName}</span>
            </div>
            {order.restaurantAddress && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs shrink-0" style={{ color: "#374151" }}>العنوان</span>
                <span className="text-xs font-bold text-right" style={{ color: "#374151" }}>{order.restaurantAddress}</span>
              </div>
            )}
            {activePickupMapsUrl && (
              <a href={activePickupMapsUrl} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-bold mt-1"
                style={{ background: "#ea4335", color: "#ffffff" }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                افتح في خرائط Google — الاستلام
              </a>
            )}
          </div>
        )}

        {/* ─── موقع التسليم */}
        {order.deliveryAddressText && (() => {
          // حساب المسافة ووقت التوصيل
          const delivLat = order.deliveryLat ? parseFloat(String(order.deliveryLat)) : null;
          const delivLng = order.deliveryLng ? parseFloat(String(order.deliveryLng)) : null;
          const pickLat = order.restaurantLat ? parseFloat(String(order.restaurantLat)) : null;
          const pickLng = order.restaurantLng ? parseFloat(String(order.restaurantLng)) : null;
          // استخدام Distance Matrix API أولاً ثم Haversine كـ fallback
          let distKm: number | null = null;
          let etaMins: number | null = null;
          if (calcDistQuery.data) {
            distKm = calcDistQuery.data.distanceKm;
            etaMins = calcDistQuery.data.durationMinutes;
          } else if (driverLat && driverLng && delivLat && delivLng) {
            const d2p = (pickLat && pickLng) ? haversineKm(driverLat, driverLng, pickLat, pickLng) : 0;
            const p2d = (pickLat && pickLng) ? haversineKm(pickLat, pickLng, delivLat, delivLng) : haversineKm(driverLat, driverLng, delivLat, delivLng);
            distKm = d2p + p2d;
            etaMins = Math.round((distKm / 40) * 60);
          } else if (pickLat && pickLng && delivLat && delivLng) {
            // إذا لم يكن موقع المندوب متاحاً، اعرض المسافة من الاستلام إلى التسليم
            distKm = haversineKm(pickLat, pickLng, delivLat, delivLng);
            etaMins = Math.round((distKm / 40) * 60);
          }
          const FORGE = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
          const FKEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
          // مؤشر المندوب (أزرق) وموقع التسليم (أحمر)
          const hasDriverPos = driverLat !== null && driverLng !== null;
          const mapCenterLat = hasDriverPos ? ((driverLat! + (delivLat ?? driverLat!)) / 2) : (delivLat ?? 0);
          const mapCenterLng = hasDriverPos ? ((driverLng! + (delivLng ?? driverLng!)) / 2) : (delivLng ?? 0);
          const driverPinMarker = hasDriverPos ? `&markers=color:blue%7Clabel:A%7C${driverLat!.toFixed(7)},${driverLng!.toFixed(7)}` : '';
          const delivPinMarker = delivLat && delivLng ? `&markers=color:red%7Clabel:B%7C${delivLat.toFixed(7)},${delivLng.toFixed(7)}` : '';
          const staticMapUrl = delivLat && delivLng
            ? `${FORGE}/v1/maps/proxy/maps/api/staticmap?center=${mapCenterLat.toFixed(7)},${mapCenterLng.toFixed(7)}&zoom=${hasDriverPos ? 14 : 16}&size=400x160&scale=2${driverPinMarker}${delivPinMarker}&key=${FKEY}`
            : null;
          return (
            <div className="rounded-xl overflow-hidden" style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0" }}>
              <div className="px-3 pt-3 pb-2 space-y-2">
                <p className="text-xs font-bold" style={{ color: "#15803d" }}>🏠 موقع التسليم</p>
                {/* شريط المسافة ووقت التوصيل */}
                {distKm !== null && etaMins !== null && (
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg" style={{ background: "#dcfce7", border: "1px solid #86efac" }}>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" style={{ color: "#16a34a" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>
                      <span className="text-xs font-bold" style={{ color: "#15803d" }}>{distKm.toFixed(1)} كم</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" style={{ color: "#16a34a" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                      <span className="text-xs font-bold" style={{ color: "#15803d" }}>
                        {etaMins < 60 ? `${etaMins} دقيقة` : `${Math.floor(etaMins / 60)} ساعة${etaMins % 60 > 0 ? ` ${etaMins % 60} د` : ''}`}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs shrink-0" style={{ color: "#374151" }}>العنوان</span>
                  <span className="text-xs font-bold text-right" style={{ color: "#111827" }}>{order.deliveryAddressText}</span>
                </div>
              </div>
              {/* خريطة مصغرة */}
              {staticMapUrl && (
                <a href={activeDeliveryMapsUrl ?? '#'} target="_blank" rel="noreferrer" className="block relative">
                  <img src={staticMapUrl} alt="موقع التسليم" className="w-full" style={{ height: 130, objectFit: "cover", display: "block" }} />
                  <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-3">
                    {hasDriverPos && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(37,99,235,0.9)", color: "#fff" }}>A أنت هنا</span>}
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.9)", color: "#fff" }}>{hasDriverPos ? 'B' : '📍'} التسليم</span>
                  </div>
                </a>
              )}
              {!staticMapUrl && activeDeliveryMapsUrl && (
                <div className="px-3 pb-3">
                  <a href={activeDeliveryMapsUrl} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-bold"
                    style={{ background: "#16a34a", color: "#ffffff" }}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    افتح في خرائط Google — التسليم
                  </a>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── المبالغ */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: "#f5f3ff", border: "1.5px solid #ddd6fe" }}>
            <div className="text-xs font-semibold mb-0.5" style={{ color: "#6b7280" }}>المبلغ الإجمالي</div>
            <div className="font-black text-base" style={{ color: "#7c3aed" }}>{order.total} ريال</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0" }}>
            <div className="text-xs font-semibold mb-0.5" style={{ color: "#6b7280" }}>رسوم التوصيل</div>
            <div className="font-black text-base" style={{ color: "#16a34a" }}>{order.deliveryFee} ريال</div>
          </div>
        </div>

        {/* ─── ملاحظات */}
        {order.customerNotes && (
          <div className="rounded-xl p-3" style={{ background: "#fffbeb", border: "1.5px solid #fde68a" }}>
            <p className="text-xs font-bold mb-1" style={{ color: "#92400e" }}>📝 ملاحظات العميل</p>
            <p className="text-xs" style={{ color: "#374151" }}>{order.customerNotes}</p>
          </div>
        )}

        {nextAction && (
          <Button className="w-full text-white rounded-xl h-12 font-bold"
            style={{ background: order.status === "driver_assigned" ? "#2563eb" : order.status === "picked_up" ? "#7c3aed" : "#16a34a" }}
            onClick={() => onUpdateStatus(nextAction.status)}>
            <CheckCircle2 className="w-4 h-4 ml-2" />{nextAction.label}
          </Button>
        )}
        {needsProof && (
          <div className="space-y-3">
            {/* شاشة الكاميرا المباشرة */}
            {showCamera && (
              <div className="fixed inset-0 z-50 bg-black flex flex-col">
                {/* هيدر الكاميرا */}
                <div className="flex items-center justify-between px-4 py-3 bg-black/80">
                  <button onClick={closeCamera} className="text-white flex items-center gap-2">
                    <X className="w-5 h-5" />
                    <span className="text-sm">إلغاء</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-orange-400" />
                    <span className="text-orange-400 text-sm font-bold">إثبات التسليم</span>
                  </div>
                  <div className="w-16" />
                </div>
                {/* عرض الفيديو */}
                <div className="flex-1 relative overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* إطار توجيهي */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-8 border-2 border-white/30 rounded-2xl" />
                    <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-orange-400 rounded-tl-lg" />
                    <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-orange-400 rounded-tr-lg" />
                    <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-orange-400 rounded-bl-lg" />
                    <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-orange-400 rounded-br-lg" />
                  </div>
                  {/* شريط المعلومات السفلي */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-2 flex justify-between text-xs">
                    <span className="text-orange-400 font-bold">طلب #{order?.orderNumber}</span>
                    <span className="text-white">{new Date().toLocaleString("ar-SA")}</span>
                  </div>
                </div>
                {/* زر التقاط */}
                <div className="flex items-center justify-center py-6 bg-black">
                  <button
                    onClick={capturePhoto}
                    className="w-20 h-20 rounded-full bg-white border-4 border-orange-400 flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                  >
                    <Camera className="w-8 h-8 text-orange-500" />
                  </button>
                </div>
              </div>
            )}
            {/* Canvas مخفي لرسم الwatermark */}
            <canvas ref={canvasRef} className="hidden" />

            <div className="rounded-xl overflow-hidden" style={{ border: "2px solid #f97316" }}>
              {/* هيدر القسم */}
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: "#fff7ed" }}>
                <ShieldCheck className="w-5 h-5" style={{ color: "#ea580c" }} />
                <div>
                  <div className="text-sm font-bold" style={{ color: "#9a3412" }}>📸 صورة إثبات التسليم</div>
                  <div className="text-xs" style={{ color: "#fbbf24" }}>التقط الصورة من الكاميرا • ستُضاف معلومات الطلب تلقائياً</div>
                </div>
              </div>

              <div className="p-4 space-y-3" style={{ background: "#ffffff" }}>
                {proofPreview ? (
                  <div className="space-y-3">
                    {/* معاينة الصورة */}
                    <div className="relative rounded-xl overflow-hidden" style={{ border: "2px solid #16a34a" }}>
                      <img src={proofPreview} alt="صورة التسليم" className="w-full object-cover" style={{ maxHeight: "220px" }} />
                      {/* شارة التوثيق */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-white" style={{ background: "#16a34a" }}>
                        <CheckCircle2 className="w-3 h-3" /> تم التوثيق
                      </div>
                      {/* زر إعادة التصوير */}
                      <button
                        onClick={() => { setProofFile(null); setProofPreview(null); }}
                        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-white"
                        style={{ background: "rgba(0,0,0,0.65)" }}
                      >
                        <Camera className="w-3 h-3" /> إعادة التصوير
                      </button>
                    </div>
                    {/* معلومات الـ watermark */}
                    <div className="rounded-lg p-3 space-y-1" style={{ background: "rgba(22,163,74,0.15)", border: "1px solid rgba(134,239,172,0.3)" }}>
                      <div className="text-xs font-bold" style={{ color: "#15803d" }}>✅ المعلومات المُضافة على الصورة:</div>
                      <div className="text-xs" style={{ color: "#374151" }}>• رقم الطلب: #{order?.orderNumber}</div>
                      <div className="text-xs" style={{ color: "#374151" }}>• التاريخ والوقت: {new Date().toLocaleString("ar-SA")}</div>
                      <div className="text-xs" style={{ color: "#374151" }}>• اسم المندوب: {order?.driverName ?? "المندوب"}</div>
                    </div>
                    {/* زر التأكيد — يفتح نافذة التأكيد */}
                    <Button
                      className="w-full text-white rounded-xl h-14 font-bold text-base"
                      style={{ background: "#16a34a" }}
                      onClick={() => setShowConfirmProof(true)}
                      disabled={uploading || uploadDeliveryProof.isPending}
                    >
                      <CheckCircle2 className="w-5 h-5 ml-2" /> إرسال إثبات التسليم
                    </Button>
                    <div className="text-center text-xs" style={{ color: "#6b7280" }}>سيطلب منك التأكيد قبل الإرسال</div>
                  </div>
                ) : (
                  <button
                    onClick={openCamera}
                    className="w-full flex flex-col items-center gap-4 rounded-xl p-6 transition-colors"
                    style={{ background: "#fff7ed", border: "2px dashed #fb923c" }}
                  >
                    <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "#fed7aa", border: "3px solid #f97316" }}>
                      <Camera className="w-9 h-9" style={{ color: "#ea580c" }} />
                    </div>
                    <div className="text-center">
                      <div className="text-base font-bold" style={{ color: "#9a3412" }}>📷 اضغط لفتح الكاميرا</div>
                      <div className="text-xs mt-1" style={{ color: "#fbbf24" }}>التقط صورة للتسليم • ستُضاف معلومات الطلب تلقائياً</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {order.status === "delivered" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="font-bold text-green-700">تم التوصيل بنجاح!</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────
function StatsTab({ profile }: { profile: any }) {
  const { data: stats, isLoading } = trpc.drivers.myStats.useQuery(undefined, { enabled: !!profile });

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!stats) return (
    <div className="text-center py-12 text-muted-foreground">لا توجد إحصائيات بعد</div>
  );

  return (
    <div className="space-y-4 pb-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="font-black text-xl text-green-700">{stats.allTimeEarnings} ريال</div>
          <div className="text-xs text-muted-foreground mt-0.5">إجمالي الأرباح</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div className="font-black text-xl text-primary">{stats.totalDeliveries}</div>
          <div className="text-xs text-muted-foreground mt-0.5">إجمالي التوصيلات</div>
        </div>
      </div>

      {/* Rating */}
      <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-yellow-900/30 rounded-xl flex items-center justify-center shrink-0">
          <Star className="w-6 h-6 text-yellow-400" />
        </div>
        <div>
          <div className="font-black text-2xl text-yellow-300">{stats.rating} ★</div>
          <div className="text-xs text-muted-foreground">متوسط تقييمك</div>
        </div>
      </div>

      {/* Period Stats */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <div className="font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            إحصائيات الفترات
          </div>
        </div>
        <div className="divide-y divide-border">
          {[
            { label: "اليوم", count: stats.todayCount, earnings: stats.todayEarnings, icon: Clock, color: "text-primary" },
            { label: "هذا الأسبوع", count: stats.weekCount, earnings: stats.weekEarnings, icon: Calendar, color: "text-primary" },
            { label: "هذا الشهر", count: stats.monthCount, earnings: stats.monthEarnings, icon: BarChart3, color: "text-green-600" },
          ].map((item) => (
            <div key={item.label} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted/30 rounded-lg flex items-center justify-center">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.count} توصيلة</div>
                </div>
              </div>
              <div className={`font-black text-base ${item.color}`}>{item.earnings} ريال</div>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ enabled = true }: { enabled?: boolean }) {
  const { data: myOrders, isLoading } = trpc.orders.driverOrders.useQuery(undefined, { enabled });
  const delivered = myOrders?.filter((o: any) => o.status === "delivered") ?? [];

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!delivered.length) return (
    <div className="text-center py-16">
      <History className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
      <h3 className="font-bold text-foreground mb-1">لا يوجد سجل توصيل بعد</h3>
      <p className="text-muted-foreground text-sm">ستظهر هنا الطلبات المُسلَّمة</p>
    </div>
  );

  return (
    <div className="space-y-3 pb-4">
      {delivered.map((order: any) => (
        <div key={order.id} className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono font-bold text-sm text-foreground">#{order.orderNumber}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString("ar-SA")}
            </span>
          </div>
          {order.customerName && (
            <div className="text-sm text-muted-foreground mb-1">
              <span className="font-medium text-foreground">{order.customerName}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground mb-2">{order.deliveryAddressText}</div>
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <span className="text-xs text-muted-foreground">قيمة: <span className="font-bold text-foreground">{order.total} ريال</span></span>
              <span className="text-xs text-muted-foreground">توصيل: <span className="font-bold text-green-400">{order.deliveryFee} ريال</span></span>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              تم التسليم
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ profile, refetchProfile, onLogout, enabled = true, driverCurrentCity = "" }: {
  profile: any;
  refetchProfile: () => void;
  onLogout: () => void;
  enabled?: boolean;
  driverCurrentCity?: string;
}) {
  const updateMaxOrdersMutation = trpc.drivers.updateMaxOrders.useMutation({
    onSuccess: () => { refetchProfile(); toast.success("تم تحديث عدد الطلبات"); }
  });

  // Location
  const { data: driverStatus, refetch: refetchStatus } = trpc.driverRequests.myStatus.useQuery(undefined, { enabled });
  const [locationCityId, setLocationCityId] = useState(driverStatus?.cityId?.toString() ?? "");
  const [locationStreetId, setLocationStreetId] = useState(driverStatus?.streetId?.toString() ?? "");
  const updateLocationMutation = trpc.driverRequests.updateLocation.useMutation({
    onSuccess: (data) => { refetchStatus(); toast.success(`تم تحديث منطقتك: ${data.streetName ?? ""}`); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (driverStatus) {
      setLocationCityId(driverStatus.cityId?.toString() ?? "");
      setLocationStreetId(driverStatus.streetId?.toString() ?? "");
    }
  }, [driverStatus?.cityId, driverStatus?.streetId]);

  return (
    <div className="space-y-4 pb-4">
      {/* Profile Info Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-primary/10 px-4 py-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <Truck className="w-7 h-7 text-primary" />
          </div>
          <div>
            <div className="font-black text-foreground text-lg">{profile.name}</div>
            <div className="text-sm text-muted-foreground">{profile.phone}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs text-yellow-300 font-bold">{profile.rating}</span>
              <span className="text-xs text-muted-foreground">• {profile.totalDeliveries} توصيلة</span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/20 rounded-xl p-3">
                <div className="text-xs text-muted-foreground">رقم واتساب</div>
                <div className="font-medium text-foreground text-sm mt-0.5">{profile.whatsappNumber ?? profile.phone}</div>
              </div>
              <div className="bg-muted/20 rounded-xl p-3">
                <div className="text-xs text-muted-foreground">مدينتي الحالية</div>
                <div className="font-medium text-foreground text-sm mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  {driverCurrentCity || "جاري التحديد..."}
                </div>
              </div>
            </div>
          </div>
      </div>

      {/* Logout */}
      <Button variant="outline" className="w-full rounded-xl text-destructive border-destructive/30 h-11"
        onClick={onLogout}>
        تسجيل الخروج
      </Button>
    </div>
  );
}

// ─── Rounds Tab ──────────────────────────────────────────────────────────────
function RoundsTab({ phoneUser, driverStatus }: { phoneUser: any; driverStatus: any }) {
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [maxOrders, setMaxOrders] = useState(5);
  const [minOrders, setMinOrders] = useState(1);
  const [waitMinutes, setWaitMinutes] = useState(60);
  const [scheduledAt, setScheduledAt] = useState("");

  const { data: activeRound, isLoading } = trpc.rounds.myActiveRound.useQuery(
    undefined,
    { enabled: !!phoneUser, refetchInterval: 10000 }
  );
  const { data: history } = trpc.rounds.myHistory.useQuery(
    { limit: 10 },
    { enabled: !!phoneUser }
  );

  const createMutation = trpc.rounds.create.useMutation({
    onSuccess: () => { utils.rounds.myActiveRound.invalidate(); utils.rounds.myHistory.invalidate(); setShowCreate(false); toast.success("تم إنشاء الدورة!"); },
    onError: (e) => toast.error(e.message),
  });
  const departMutation = trpc.rounds.depart.useMutation({
    onSuccess: () => { utils.rounds.myActiveRound.invalidate(); toast.success("تم تسجيل المغادرة!"); },
    onError: (e) => toast.error(e.message),
  });
  const returnMutation = trpc.rounds.returnFromDelivery.useMutation({
    onSuccess: () => { utils.rounds.myActiveRound.invalidate(); utils.rounds.myHistory.invalidate(); toast.success("مرحباً بعودتك! دورة جديدة جاهزة."); },
    onError: (e) => toast.error(e.message),
  });
  const cancelMutation = trpc.rounds.cancel.useMutation({
    onSuccess: () => { utils.rounds.myActiveRound.invalidate(); utils.rounds.myHistory.invalidate(); toast.info("تم إلغاء الدورة"); },
    onError: (e) => toast.error(e.message),
  });

  // حساب الوقت المتبقي — يجب أن يكون قبل أي return مشروط
  const round = activeRound as any;
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!round?.scheduledDepartAt) { setTimeLeft(""); return; }
    const calc = () => {
      const diff = new Date(round.scheduledDepartAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("حان وقت المغادرة!"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, "0")} دقيقة`);
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [round?.scheduledDepartAt]);

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const roundOrders = round?.orders ?? [];
  const filledSlots = roundOrders.length;
  const maxSlots = round?.maxOrders ?? maxOrders;
  const remaining = maxSlots - filledSlots;
  const fillPct = maxSlots > 0 ? Math.min(100, (filledSlots / maxSlots) * 100) : 0;

  return (
    <div className="space-y-4 pb-4">
      {/* Active Round Card */}
      {round && round.status !== "cancelled" && round.status !== "completed" ? (
        <div className="bg-card border-2 border-primary/30 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className={`px-4 py-3 flex items-center justify-between ${
            round.status === "collecting" ? "bg-primary/20" :
            round.status === "delivering" ? "bg-orange-50" : "bg-muted/30"
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                round.status === "collecting" ? "bg-green-400" :
                round.status === "delivering" ? "bg-orange-400" : "bg-slate-400"
              }`} />
              <span className="font-bold text-foreground text-sm">
                {round.status === "collecting" ? "جمع الطلبات" :
                 round.status === "delivering" ? "في الطريق للتوصيل" : "الدورة"}
              </span>
              <span className="text-xs text-muted-foreground">#{round.id}</span>
            </div>
            {round.status === "collecting" && (
              <button onClick={() => cancelMutation.mutate({ roundId: round.id })} className="text-xs text-destructive/70 hover:text-destructive">
                إلغاء
              </button>
            )}
          </div>

          <div className="p-4 space-y-3">
            {/* Progress */}
            {round.status === "collecting" && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">الطلبات المجمّعة</span>
                  <span className="font-black text-foreground">{filledSlots} / {maxSlots}</span>
                </div>
                <div className="w-full h-3 bg-muted/40 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${fillPct}%` }} />
                </div>
                {remaining > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                    <span className="text-amber-700 font-bold text-sm">متبقى {remaining} طلب ويغادر المندوب</span>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <span className="text-green-700 font-bold text-sm">اكتملت الطلبات! جاهز للمغادرة</span>
                  </div>
                )}
                {timeLeft && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">المغادرة بعد:</span>
                    <span className="font-bold text-foreground">{timeLeft}</span>
                  </div>
                )}
                {round.minOrders > 1 && (
                  <div className="text-xs text-muted-foreground">
                    الحد الأدنى للمغادرة: <span className="font-bold text-foreground">{round.minOrders} طلبات</span>
                  </div>
                )}
              </>
            )}

            {/* Orders List */}
            {roundOrders.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-muted-foreground">الطلبات في هذه الدورة</div>
                {roundOrders.map((o: any) => (
                  <div key={o.id} className="bg-muted/20 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">#{o.orderNumber}</div>
                      <div className="text-sm font-medium text-foreground">{o.customerName ?? "عميل"}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">{o.deliveryAddressText}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary text-sm">{o.deliveryFee} ريال</div>
                      <div className="text-xs text-muted-foreground">{o.total} ريال</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {round.status === "collecting" && (
              <Button
                className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-12 font-bold"
                disabled={departMutation.isPending || (round.minOrders > 1 && filledSlots < round.minOrders)}
                onClick={() => departMutation.mutate({ roundId: round.id })}
              >
                {departMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <StopCircle className="w-4 h-4 ml-2" />}
                {round.minOrders > 1 && filledSlots < round.minOrders
                  ? `انتظر ${round.minOrders - filledSlots} طلب إضافي`
                  : "غادرت للتوصيل"}
              </Button>
            )}
            {round.status === "delivering" && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-12 font-bold"
                disabled={returnMutation.isPending}
                onClick={() => returnMutation.mutate({ roundId: round.id })}
              >
                {returnMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <RotateCcw className="w-4 h-4 ml-2" />}
                رجعت — ابدأ دورة جديدة
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* No active round */
        <div className="text-center py-8">
          <ListOrdered className="w-14 h-14 text-muted-foreground/20 mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-1">لا توجد دورة نشطة</h3>
          <p className="text-muted-foreground text-sm mb-4">أنشئ دورة جديدة لبدء جمع الطلبات</p>
        </div>
      )}

      {/* Create Round Button */}
      {(!round || round.status === "cancelled" || round.status === "completed") && (
        <Button
          className="w-full bg-primary text-white rounded-xl h-12 font-bold"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus className="w-4 h-4 ml-2" />
          إنشاء دورة جديدة
          <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showCreate ? "rotate-180" : ""}`} />
        </Button>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="font-bold text-foreground text-sm">إعدادات الدورة الجديدة</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-muted-foreground">الحد الأقصى للطلبات</Label>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => setMaxOrders(Math.max(1, maxOrders - 1))} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold">-</button>
                <span className="flex-1 text-center font-black text-lg">{maxOrders}</span>
                <button onClick={() => setMaxOrders(Math.min(50, maxOrders + 1))} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold">+</button>
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-muted-foreground">الحد الأدنى للمغادرة</Label>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => setMinOrders(Math.max(1, minOrders - 1))} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold">-</button>
                <span className="flex-1 text-center font-black text-lg">{minOrders}</span>
                <button onClick={() => setMinOrders(Math.min(maxOrders, minOrders + 1))} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold">+</button>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground">وقت الانتظار الأقصى (دقيقة)</Label>
            <div className="flex items-center gap-2 mt-1">
              {[15, 30, 45, 60, 90, 120].map(m => (
                <button key={m} onClick={() => setWaitMinutes(m)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    waitMinutes === m ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-transparent"
                  }`}>
                  {m >= 60 ? `${m/60}س` : `${m}د`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-muted-foreground">وقت المغادرة المحدد (اختياري)</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="rounded-xl mt-1 text-sm" />
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-primary space-y-1">
            <div>• ستغادر عند اكتمال <strong>{maxOrders} طلب</strong> أو انتهاء <strong>{waitMinutes >= 60 ? `${waitMinutes/60} ساعة` : `${waitMinutes} دقيقة`}</strong></div>
            {minOrders > 1 && <div>• لن تتمكن من المغادرة قبل <strong>{minOrders} طلبات</strong> على الأقل</div>}
          </div>

          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-12 font-bold"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate({
              maxOrders,
              minOrders,
              waitMinutes,
              cityId: driverStatus?.cityId ?? 0,
              streetId: driverStatus?.streetId ?? 0,
              scheduledDepartAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
            })}
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <PlayCircle className="w-4 h-4 ml-2" />}
            ابدأ الدورة الآن
          </Button>
        </div>
      )}

      {/* History */}
      {(history as any[])?.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-muted-foreground">آخر الدورات</div>
          {(history as any[]).slice(0, 5).map((r: any) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">دورة #{r.id}</div>
                <div className="text-sm font-medium text-foreground">{r.ordersCount ?? 0} طلب</div>
              </div>
              <div className="text-right">
                <Badge variant={r.status === "completed" ? "default" : "secondary"} className="text-xs">
                  {r.status === "completed" ? "مكتملة" : r.status === "cancelled" ? "ملغاة" : r.status}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(r.createdAt).toLocaleDateString("ar-SA")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== In-Restaurant Button =====
function InRestaurantButton({
  profile,
  driverStatus,
  onSetInRestaurant,
  isPending,
}: {
  profile: any;
  driverStatus: any;
  onSetInRestaurant: (restaurantId: number | null) => void;
  isPending: boolean;
}) {
  // تصفية المطاعم حسب مدينة وشارع المندوب
  const driverCityId = driverStatus?.cityId;
  const driverStreetId = driverStatus?.streetId;
  const { data: restaurants } = trpc.restaurants.listByStreet.useQuery(
    { cityId: driverCityId, streetId: driverStreetId },
    { enabled: !!(driverCityId) }
  );
  const [showPicker, setShowPicker] = useState(false);
  const isInRestaurant = !!(profile?.inRestaurantId);

  // اسم المدينة والشارع للعرض
  const locationLabel = driverStatus?.streetName
    ? `${driverStatus.cityName ?? ""} — ${driverStatus.streetName}`
    : driverStatus?.cityName ?? "";

  if (isInRestaurant) {
    // Show "leave restaurant" button
    const restaurantName = restaurants?.find((r: any) => r.id === profile.inRestaurantId)?.name ?? `مطعم #${profile.inRestaurantId}`;
    return (
      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <div className="font-bold text-amber-700 text-sm">متواجد داخل المطعم</div>
            <div className="text-xs text-amber-600/80">{restaurantName}</div>
          </div>
        </div>
        <button
          onClick={() => onSetInRestaurant(null)}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <StoreOut className="w-3 h-3" />}
          غادرت المطعم
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {!showPicker ? (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full flex items-center justify-center gap-2 bg-muted/40 hover:bg-muted/70 border border-border rounded-2xl p-3 text-sm text-muted-foreground transition-colors"
        >
          <Store className="w-4 h-4" />
          أنا داخل مطعم — اضغط لتسجيل تواجدك
        </button>
      ) : (
        <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-foreground">اختر المطعم</span>
              {locationLabel && (
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {locationLabel}
                </div>
              )}
            </div>
            <button onClick={() => setShowPicker(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {!driverCityId ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                يرجى تحديد مدينتك وشارعك أولاً من قسم الموقع
              </div>
            ) : restaurants?.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
                لا توجد مطاعم في شارعك حالياً
              </div>
            ) : (
              restaurants?.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => { onSetInRestaurant(r.id); setShowPicker(false); }}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-background hover:bg-primary/10 hover:border-primary/30 border border-border transition-all text-right disabled:opacity-50"
                >
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Store className="w-4 h-4 text-primary" /></div>
                  )}
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">{r.name}</div>
                    {r.streetName && <div className="text-xs text-muted-foreground">{r.streetName}</div>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Main Driver Page =====
export default function Driver() {
  const [phoneUser, setPhoneUser] = useState<{ id: number; phone: string; name: string | null; role: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [phoneAuthLoading, setPhoneAuthLoading] = useState(true);
  const [profileLoadTimeout, setProfileLoadTimeout] = useState(false);

  const [activeTab, setActiveTab] = useState<"history" | "trips" | "settings" | "stats" | "profile">("history");
  const [hasNewOrders, setHasNewOrders] = useState(false);
  const prevPendingCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioUnlocked = useRef(false);
  // ─── رحلة مختارة لإدارة الحجوزات (مشتركة بين ShopperTripsTab وShopperBookingsTab) ───
  const [selectedBookingsTripId, setSelectedBookingsTripId] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", whatsappNumber: "", maxOrders: 5, cityId: "" });

  const phoneMe = trpc.phoneAuth.me.useQuery();
  const updateProfileMutation = trpc.phoneAuth.updateProfile.useMutation();
  const logoutMutation = trpc.phoneAuth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("phone_session_token");
      setPhoneUser(null);
    }
  });

  useEffect(() => {
    if (!phoneMe.isLoading) {
      if (phoneMe.data) setPhoneUser(phoneMe.data as any);
      setPhoneAuthLoading(false);
    }
  }, [phoneMe.isLoading, phoneMe.data]);

  const { data: profile, isLoading: profileIsLoading, refetch: refetchProfile } = trpc.drivers.myProfile.useQuery(
    undefined, { enabled: !!phoneUser }
  );

  // Timeout: if profile doesn't load within 5s, stop waiting
  useEffect(() => {
    if (!phoneUser || profile !== undefined || !profileIsLoading) return;
    const t = setTimeout(() => setProfileLoadTimeout(true), 5000);
    return () => clearTimeout(t);
  }, [phoneUser, profile, profileIsLoading]);
  const { data: myOrders, refetch: refetchMyOrders } = trpc.orders.driverOrders.useQuery(
    undefined, { refetchInterval: 15000, enabled: !!phoneUser && phoneUser.role === "driver" }
  );
  const { data: pendingRequests = [], refetch: refetchRequests } = trpc.driverRequests.myPendingRequests.useQuery(
    undefined, { refetchInterval: 5000, enabled: !!phoneUser && phoneUser.role === "driver" }
  );
  // حجوزات الشوبر المعلقة (للتنبيه الصوتي)
  const { data: allShopperTrips } = trpc.shopper.getMyTrips.useQuery(
    { includeCompleted: false }, { refetchInterval: 8000, enabled: !!phoneUser }
  );
  const shopperPendingCount = (allShopperTrips as any[] ?? []).reduce((sum: number, t: any) => sum + (t.pendingBookingsCount ?? 0), 0);
  const prevShopperPendingCount = useRef(0);
  const { data: driverStatus, refetch: refetchStatus } = trpc.driverRequests.myStatus.useQuery(
    undefined, { enabled: !!phoneUser && phoneUser.role === "driver" }
  );
  const { data: driverShopperSettings } = trpc.shopper.getDriverSettings.useQuery(
    undefined, { enabled: !!phoneUser && phoneUser.role === "driver" }
  );

  const setOnlineMutation = trpc.driverRequests.setOnlineStatus.useMutation({
    onSuccess: () => { refetchStatus(); refetchProfile(); },
    onError: (e) => toast.error(e.message),
  });
  const acceptRequestMutation = trpc.driverRequests.acceptRequest.useMutation({
    onSuccess: () => { refetchRequests(); refetchMyOrders(); toast.success("تم قبول الطلب!"); },
    onError: (e) => { refetchRequests(); toast.error(e.message); },
  });
  const rejectRequestMutation = trpc.driverRequests.rejectRequest.useMutation({
    onSuccess: () => { refetchRequests(); toast.info("تم رفض الطلب"); },
  });
  const upsertMutation = trpc.drivers.upsertProfile.useMutation({
    onSuccess: () => { refetchProfile(); setShowSetup(false); toast.success("تم حفظ الملف الشخصي"); }
  });
  const [driverCancelDialog, setDriverCancelDialog] = useState<any>(null);
  const [driverCancelReason, setDriverCancelReason] = useState("");
  // ستات صورة التسليم — مرفوعة للمستوى الأعلى لمنع إعادة التركيب عند refetch
  const [proofPreviewGlobal, setProofPreviewGlobal] = useState<string | null>(null);
  const [showConfirmProofGlobal, setShowConfirmProofGlobal] = useState(false);
  const [proofOrderId, setProofOrderId] = useState<number | null>(null);
  const [proofOrderNumber, setProofOrderNumber] = useState<string>("");
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { refetchMyOrders(); toast.success("تم تحديث حالة الطلب"); setDriverCancelDialog(null); setDriverCancelReason(""); }
  });
  const updateLocationMutation = trpc.drivers.updateLocation.useMutation();
  const setInRestaurantMutation = trpc.drivers.setInRestaurant.useMutation({
    onSuccess: (data) => {
      refetchProfile();
      if (data.inRestaurantId) {
        toast.success("تم تسجيل تواجدك داخل المطعم");
      } else {
        toast.info("تم إلغاء تسجيل تواجدك في المطعم");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name ?? "",
        phone: profile.phone ?? "",
        whatsappNumber: profile.whatsappNumber ?? profile.phone ?? "",
        maxOrders: profile.maxOrders ?? 5,
        cityId: profile.cityId?.toString() ?? "",
      });
    }
  }, [profile]);

  // ─── جلب موقع المندوب تلقائياً عند الدخول وحفظ المدينة ───
  const [driverCurrentCity, setDriverCurrentCity] = useState<string>("");
  const [driverCurrentLat, setDriverCurrentLat] = useState<number | null>(null);
  const [driverCurrentLng, setDriverCurrentLng] = useState<number | null>(null);

  // عند تحميل بيانات المستخدم: استخدام المدينة المحفوظة مسبقاً فوراً
  useEffect(() => {
    if (phoneMe.data) {
      if ((phoneMe.data as any).currentCityName) {
        setDriverCurrentCity((phoneMe.data as any).currentCityName);
      }
      const lat = parseFloat((phoneMe.data as any).currentLat ?? "");
      const lng = parseFloat((phoneMe.data as any).currentLng ?? "");
      if (!isNaN(lat) && !isNaN(lng)) {
        setDriverCurrentLat(lat);
        setDriverCurrentLng(lng);
      }
    }
  }, [phoneMe.data]);

  // جلب الموقع الجديد في الخلفية وتحديث قاعدة البيانات (watchPosition للتحديث المستمر)
  useEffect(() => {
    if (!phoneUser) return;
    if (!navigator.geolocation) return;
    let cityFetched = false; // نجلب اسم المدينة مرة واحدة فقط لتوفير الطلبات
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDriverCurrentLat(lat);
        setDriverCurrentLng(lng);
        // استخراج اسم المدينة مرة واحدة فقط عبر Nominatim
        if (!cityFetched) {
          cityFetched = true;
          try {
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`,
              { headers: { "User-Agent": "ShopperDeliveryApp/1.0" } }
            );
            const data = await resp.json();
            const addr = data.address || {};
            const cityName = addr.city || addr.town || addr.municipality || addr.county || addr.state || "";
            if (cityName) {
              setDriverCurrentCity(cityName);
              updateProfileMutation.mutate({
                currentLat: lat.toString(),
                currentLng: lng.toString(),
                currentCityName: cityName,
              });
            } else {
              updateProfileMutation.mutate({ currentLat: lat.toString(), currentLng: lng.toString() });
            }
          } catch {
            updateProfileMutation.mutate({ currentLat: lat.toString(), currentLng: lng.toString() });
          }
        } else {
          // تحديث الإحداثيات فقط بدون إعادة جلب اسم المدينة
          updateProfileMutation.mutate({ currentLat: lat.toString(), currentLng: lng.toString() });
        }
      },
      () => { /* تجاهل خطأ الموقع في الخلفية */ },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [phoneUser?.id]);

  // Auto-update GPS location when online
  useEffect(() => {
    if (!driverStatus?.isOnline) return;
    const updateLoc = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          updateLocationMutation.mutate({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() });
        });
      }
    };
    updateLoc();
    const interval = setInterval(updateLoc, 30000);
    return () => clearInterval(interval);
  }, [driverStatus?.isOnline]);

  const isOnline = driverStatus?.isOnline ?? false;
  const activeOrders = myOrders?.filter((o: any) => !["delivered", "cancelled"].includes(o.status)) ?? [];

  // ── تنبيه صوتي عند وصول طلبات جديدة ──
  // تفعيل AudioContext عند أول تفاعل (متطلب المتصفح)
  useEffect(() => {
    const unlock = () => {
      if (audioUnlocked.current) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          // تشغيل صوت صامت لتفعيل السياق
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.01);
          audioUnlocked.current = true;
          console.log('[Driver] AudioContext مُفعَّل');
        }
      } catch (e) {
        console.warn('[Driver] فشل تفعيل AudioContext:', e);
      }
    };
    document.addEventListener('touchstart', unlock, { once: true, passive: true });
    document.addEventListener('click', unlock, { once: true });
    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      // استخدام السياق المُفعَّل أو إنشاء سياق جديد
      const ctx = audioCtxRef.current && audioCtxRef.current.state !== 'closed'
        ? audioCtxRef.current
        : new AudioCtx();
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = ctx;
      }
      // استئناف السياق إذا كان معلقاً
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const playBeep = (freq: number, startTime: number, duration = 0.25) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.7, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const t = ctx.currentTime;
      playBeep(880,  t);
      playBeep(1100, t + 0.3);
      playBeep(880,  t + 0.6);
      playBeep(1320, t + 0.9);
      playBeep(1100, t + 1.2);
      console.log('[Driver] تشغيل التنبيه الصوتي');
    } catch (e) {
      console.warn('[Driver] تعذّر تشغيل الصوت:', e);
    }
  };

  useEffect(() => {
    const currentCount = pendingRequests.length;
    if (currentCount > prevPendingCount.current && currentCount > 0) {
      setHasNewOrders(true);
      playAlertSound();
    }
    if (currentCount === 0 && shopperPendingCount === 0) setHasNewOrders(false);
    prevPendingCount.current = currentCount;
  }, [pendingRequests.length]);

  useEffect(() => {
    if (shopperPendingCount > prevShopperPendingCount.current && shopperPendingCount > 0) {
      setHasNewOrders(true);
      playAlertSound();
    }
    if (shopperPendingCount === 0 && pendingRequests.length === 0) setHasNewOrders(false);
    prevShopperPendingCount.current = shopperPendingCount;
  }, [shopperPendingCount]);

  // ── Loading ──
  if (phoneAuthLoading || (phoneUser && profile === undefined && profileIsLoading && !profileLoadTimeout)) return (
    <div className="min-h-screen flex items-center justify-center app-bg">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground text-sm">جاري التحقق...</p>
      </div>
    </div>
  );

  // ── Not logged in ──
  if (!phoneUser) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 app-bg p-6" dir="rtl">
      <img
        src="https://d2xsxph8kpxj0f.cloudfront.net/115452271/NK9L9naBDDKkTQDnwgY78j/shopper-logo-transparent-final_911dcdb1.png"
        alt="Shopper"
        style={{ width: '200px', objectFit: 'contain', filter: 'drop-shadow(0 4px 16px rgba(124,58,237,0.4))' }}
      />
      <h1 className="text-2xl font-black text-foreground">لوحة المندوب</h1>
      <p className="text-muted-foreground text-center">سجّل دخولك برقم جوالك للوصول إلى لوحة المندوب</p>
      <Button size="lg" className="bg-primary text-white rounded-2xl px-10 h-12 font-bold" onClick={() => setShowLoginModal(true)}>
        <Phone className="w-5 h-5 ml-2" />
        تسجيل الدخول برقم الجوال
      </Button>
      <PhoneLoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(u) => { setPhoneUser(u); setShowLoginModal(false); }}
        role="driver"
        title="دخول المندوبين"
      />
    </div>
  );

  // ── Not registered as driver ──
  // المستخدم سجّل دخوله لكن ليس لديه ملف مندوب مسجّل في لوحة التحكم
  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 app-bg p-6" dir="rtl">
      <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-black text-foreground">غير مسجّل</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          رقم الجوال <span className="font-bold text-foreground">{phoneUser.phone}</span> غير مسجّل كمندوب.
          <br />تواصل مع الإدارة لتسجيلك في المنصة.
        </p>
      </div>
      <Button
        variant="outline"
        className="rounded-xl text-destructive border-destructive/30 h-11 px-6"
        onClick={() => { logoutMutation.mutate(); setPhoneUser(null); }}
      >
        تسجيل الخروج
      </Button>
    </div>
  );

  // ── Main Dashboard ──
  return (
    <div className="driver-bg driver-theme" dir="rtl">

      {/* Header */}
      <header className="driver-header">
        <div className="px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-foreground text-sm leading-none">{profile?.name ?? phoneUser?.phone}</div>
              <div className="text-xs text-muted-foreground leading-none mt-0.5">لوحة المندوب</div>
            </div>
          </div>
          {/* Online Toggle */}
          <button
            onClick={() => isOnline ? setOnlineMutation.mutate({ isOnline: false }) : setOnlineMutation.mutate({ isOnline: true })}
            disabled={setOnlineMutation.isPending}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 border-2 transition-all ${isOnline ? "bg-green-100 border-green-400" : "bg-muted border-border"}`}
          >
            {setOnlineMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
              isOnline ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-muted-foreground" />}
            <span className={`text-xs font-bold ${isOnline ? "text-green-700" : "text-muted-foreground"}`}>
              {isOnline ? "متصل" : "غير متصل"}
            </span>
            <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
          </button>
        </div>
        {/* Status Bar */}
        {isOnline ? (
          <div className="bg-green-50 border-t border-green-200 text-center text-xs py-1.5 text-green-700 flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {`متصل${driverCurrentCity ? ` — ${driverCurrentCity}` : ""}`}
          </div>
        ) : (
          <div className="bg-muted/30 border-t border-border text-center text-xs py-1.5 text-muted-foreground">
            غير متصل — اضغط على الزر للبدء
          </div>
        )}
      </header>

      {/* Content */}
      <div className="px-4 pt-4 pb-24">
        {/* New Order Requests */}
        {isOnline && pendingRequests.length > 0 && (
          <NewOrderRequestBanner
            requests={pendingRequests}
            defaultFee={profile?.deliveryFee ?? "15"}
            onAccept={(requestId, fee) => acceptRequestMutation.mutate({ requestId, deliveryFee: fee })}
            onReject={(requestId) => rejectRequestMutation.mutate({ requestId })}
            driverLat={driverCurrentLat}
            driverLng={driverCurrentLng}
            maxDeliveryKm={Number((driverShopperSettings as any)?.maxDeliveryKm) || 0}
            driverAddress={(phoneMe.data as any)?.addressText || driverCurrentCity || undefined}
          />
        )}

        {/* Tab Content */}
        {activeTab === "history" && (
          <div>
            {/* ── الطلبات الجارية ── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">الطلبات الجارية</h2>
                {(activeOrders.length + pendingRequests.length) > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeOrders.length + pendingRequests.length}</span>
                )}
              </div>
              {!isOnline && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <div className="font-bold text-yellow-300 text-sm">أنت غير متصل</div>
                    <div className="text-xs text-yellow-200/70">اضغط على "غير متصل" في الأعلى لبدء استقبال الطلبات</div>
                  </div>
                </div>
              )}

              {!activeOrders.length ? (
              <div className="text-center py-16">
                <Truck className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="font-bold text-foreground mb-1">لا توجد طلبات جارية</h3>
                <p className="text-muted-foreground text-sm">
                  {isOnline ? "ستظهر الطلبات الجديدة أعلى الشاشة عند وصولها" : "سجّل دخولك لاستقبال الطلبات"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map((order: any) => (
                  <ActiveOrderCard
                    key={order.id}
                    order={order}
                    onUpdateStatus={(status: string) => {
                      if (status === "cancelled") {
                        setDriverCancelDialog(order);
                      } else {
                        updateStatusMutation.mutate({ orderId: order.id, status: status as any });
                      }
                    }}
                    proofPreviewGlobal={proofOrderId === order.id ? proofPreviewGlobal : null}
                    setProofPreviewGlobal={(v: string | null) => { setProofPreviewGlobal(v); setProofOrderId(order.id); setProofOrderNumber(order.orderNumber ?? ""); }}
                    showConfirmProofGlobal={proofOrderId === order.id && showConfirmProofGlobal}
                    setShowConfirmProofGlobal={setShowConfirmProofGlobal}
                    driverLat={driverCurrentLat}
                    driverLng={driverCurrentLng}
                  />
                ))}
                {/* نافذة تأكيد صورة التسليم — مرفوعة للمستوى الأعلى لمنع إعادة التركيب */}
                {showConfirmProofGlobal && proofPreviewGlobal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.85)" }} dir="rtl">
                    <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#ffffff" }}>
                      <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#fff7ed", borderBottom: "2px solid #fed7aa" }}>
                        <ShieldCheck className="w-5 h-5" style={{ color: "#ea580c" }} />
                        <div>
                          <div className="text-sm font-bold" style={{ color: "#9a3412" }}>تأكيد إثبات التسليم</div>
                          <div className="text-xs" style={{ color: "#fbbf24" }}>هل أنت متأكد من إرسال هذه الصورة للعميل؟</div>
                        </div>
                      </div>
                      <div className="p-3">
                        <img src={proofPreviewGlobal} alt="صورة التسليم" className="w-full rounded-xl object-cover" style={{ maxHeight: "260px", border: "2px solid #e5e7eb" }} />
                        <div className="mt-2 rounded-lg p-2" style={{ background: "rgba(22,163,74,0.15)", border: "1px solid rgba(134,239,172,0.3)" }}>
                          <div className="text-xs font-bold" style={{ color: "#15803d" }}>✅ المعلومات المُضافة على الصورة:</div>
                          <div className="text-xs" style={{ color: "#374151" }}>• رقم الطلب: #{proofOrderNumber} • {new Date().toLocaleString("ar-SA")}</div>
                        </div>
                      </div>
                      <div className="px-3 pb-4 grid grid-cols-2 gap-3">
                        <button
                          onClick={() => { setProofPreviewGlobal(null); setShowConfirmProofGlobal(false); setProofOrderId(null); }}
                          className="rounded-xl h-12 font-bold text-sm border-2"
                          style={{ borderColor: "#d1d5db", background: "#f9fafb", color: "#374151" }}
                        >
                          📷 إعادة التصوير
                        </button>
                        <button
                          onClick={async () => {
                            if (!proofOrderId || !proofPreviewGlobal) return;
                            setShowConfirmProofGlobal(false);
                            try {
                              const res = await fetch("/api/trpc/upload.driverImage", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ json: { base64: proofPreviewGlobal, folder: "delivery-proofs" } })
                              });
                              const data = await res.json();
                              const url = data?.result?.data?.json?.url;
                              if (!url) { toast.error("تعذّر رفع الصورة"); return; }
                              await fetch("/api/trpc/orders.uploadDeliveryProof", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ json: { orderId: proofOrderId, imageUrl: url } })
                              });
                              toast.success("تم رفع صورة التسليم وإغلاق الطلب!");
                              setProofPreviewGlobal(null);
                              setProofOrderId(null);
                              refetchMyOrders();
                            } catch { toast.error("حدث خطأ أثناء الرفع"); }
                          }}
                          className="rounded-xl h-12 font-bold text-sm text-white"
                          style={{ background: "#16a34a" }}
                        >
                          ✅ نعم، إرسال
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Driver Cancel Dialog */}
                {driverCancelDialog && (
                  <div className="fixed inset-0 z-50 flex items-end justify-center p-4" dir="rtl">
                    <div className="absolute inset-0 bg-black/60" onClick={() => { setDriverCancelDialog(null); setDriverCancelReason(""); }} />
                    <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                          <X className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">إلغاء الطلب #{driverCancelDialog?.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">سيتم إشعار العميل بسبب الإلغاء</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">سبب الإلغاء (اختياري)</p>
                        <textarea
                          value={driverCancelReason}
                          onChange={e => setDriverCancelReason(e.target.value)}
                          placeholder="مثال: المطعم مغلق، لا أستطيع الوصول..."
                          rows={3}
                          className="w-full rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <div className="flex gap-2 flex-wrap">
                          {["المطعم مغلق", "لا أستطيع الوصول للعنوان", "عطل في السيارة", "العميل لا يرد"].map(r => (
                            <button key={r} onClick={() => setDriverCancelReason(r)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors">
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setDriverCancelDialog(null); setDriverCancelReason(""); }}
                          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                          تراجع
                        </button>
                        <button
                          onClick={() => updateStatusMutation.mutate({ orderId: driverCancelDialog.id, status: "cancelled", reason: driverCancelReason || undefined })}
                          disabled={updateStatusMutation.isPending}
                          className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50">
                          {updateStatusMutation.isPending ? "جاري..." : "تأكيد الإلغاء"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>{/* end mb-6 طلبات جارية */}
            {/* ── فاصل ── */}
            <div className="border-t border-white/10 my-4" />
            {/* ── قسم الحجوزات ── */}
            <ShopperBookingsTab phoneUser={phoneUser} initialTripId={selectedBookingsTripId} onTripSelected={(id: number | null) => setSelectedBookingsTripId(id)} />
          </div>
        )}

        {activeTab === "trips" && <ShopperTripsTab phoneUser={phoneUser} driverCurrentCity={driverCurrentCity} driverCurrentLat={driverCurrentLat} driverCurrentLng={driverCurrentLng} onManageBookings={(tripId: number) => { setSelectedBookingsTripId(tripId); setActiveTab("history"); }} />}
        {activeTab === "settings" && <ShopperSettingsTab phoneUser={phoneUser} driverCurrentCity={driverCurrentCity} driverCurrentLat={driverCurrentLat} driverCurrentLng={driverCurrentLng} />}
        {activeTab === "stats" && <StatsTab profile={profile} />}
        {activeTab === "profile" && (
          <ProfileTab
            profile={profile}
            refetchProfile={refetchProfile}
            onLogout={() => logoutMutation.mutate()}
            enabled={!!phoneUser}
            driverCurrentCity={driverCurrentCity}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40" style={{background:'rgba(10,8,30,0.97)',backdropFilter:'blur(24px)',borderTop:'1px solid rgba(124,58,237,0.25)'}} dir="rtl">
        <div className="flex items-stretch h-[60px]">
          {[
            { id: "history" as const, label: "طلباتي", icon: History, badge: (activeOrders.length + pendingRequests.length + shopperPendingCount), isNew: hasNewOrders },
            { id: "trips" as const, label: "رحلاتي", icon: Store, badge: 0, isNew: false },
            { id: "settings" as const, label: "إعداداتي", icon: Settings, badge: 0, isNew: false },
            { id: "stats" as const, label: "الإحصائيات", icon: BarChart3, badge: 0, isNew: false },
            { id: "profile" as const, label: "ملفي", icon: User, badge: 0, isNew: false },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id === "history") setHasNewOrders(false); }}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all relative"
                style={{ color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.45)' }}
              >
                {isActive && <div className="absolute top-0 inset-x-0 h-0.5 rounded-b-full" style={{background:'linear-gradient(90deg,#7c3aed,#a78bfa)'}} />}
                <div className="relative">
                  <tab.icon className="w-[22px] h-[22px]" style={{ strokeWidth: isActive ? 2.2 : 1.8 }} />
                  {tab.badge > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-0.5 shadow-lg" style={{boxShadow:'0 0 8px rgba(239,68,68,0.7)'}}>
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </span>
                  )}
                  {tab.isNew && tab.badge === 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" style={{boxShadow:'0 0 6px rgba(239,68,68,0.8)'}} />
                  )}
                </div>
                <span className="text-[10px] font-semibold leading-none mt-0.5" style={{ color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.4)' }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>


    </div>
  );
}

// ===== SHOPPER DRIVER TAB =====
function ShopperDriverTab({ phoneUser, driverCurrentCity = "", driverCurrentLat = null, driverCurrentLng = null }: { phoneUser: any; driverCurrentCity?: string; driverCurrentLat?: number | null; driverCurrentLng?: number | null }) {
  const utils = trpc.useUtils();
  const [subView, setSubView] = useState<"settings" | "trips">("settings");

  // ─── بيانات الإعدادات ───
  const { data: settings, isLoading: settingsLoading } = trpc.shopper.getDriverSettings.useQuery(
    undefined, { enabled: !!phoneUser }
  );
  const { data: myTrips, isLoading: tripsLoading, refetch: refetchTrips } = trpc.shopper.getMyTrips.useQuery(
    { includeCompleted: false }, { enabled: !!phoneUser }
  );
  const { data: completedTrips, isLoading: completedTripsLoading } = trpc.shopper.getMyTrips.useQuery(
    { includeCompleted: true }, { enabled: !!phoneUser }
  );
  const pastTrips = (completedTrips as any[] ?? []).filter((t: any) => t.status === "completed" || t.status === "cancelled");
  const { data: tripBookings, isLoading: bookingsLoading, refetch: refetchBookings } = trpc.shopper.getTripBookings.useQuery(
    { tripId: 0 }, // سيتم تحديثه عند اختيار رحلة
    { enabled: false }
  );

  // ─── المناطق المحفوظة ───
  const { data: cityPolygonsList } = trpc.cityPolygons.list.useQuery();
  const { data: myPolygonsList } = trpc.cityPolygons.listMine.useQuery();
  const saveCityPolygonMutation = trpc.cityPolygons.save.useMutation({
    onSuccess: () => { utils.cityPolygons.list.invalidate(); utils.cityPolygons.listMine.invalidate(); },
  });
  const incrementPolygonUsageMutation = trpc.cityPolygons.incrementUsage.useMutation();

  const upsertSettingsMutation = trpc.shopper.saveDriverSettings.useMutation({
    onSuccess: () => { utils.shopper.getDriverSettings.invalidate(); toast.success("تم حفظ الإعدادات"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createTripMutation = trpc.shopper.createTrip.useMutation({
    onSuccess: () => { utils.shopper.getMyTrips.invalidate(); setShowCreateTrip(false); toast.success("تم إنشاء الرحلة"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateTripStatusMutation = trpc.shopper.updateTripStatus.useMutation({
    onSuccess: () => { utils.shopper.getMyTrips.invalidate(); toast.success("تم تحديث حالة الرحلة"); },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── نموذج الإعدادات ───
  const [settingsForm, setSettingsForm] = useState({
    isActive: false,
    allowsFood: true,
    allowsCoffee: true,
    allowsGroceries: true,
    allowsPharmacy: false,
    allowsDocuments: false,
    allowsElectronics: false,
    allowsClothes: false,
    allowsOther: true,
    minBookingsToDepart: 3,
    maxBookingsPerTrip: 10,
    defaultDeliveryFee: 15,
    driverNote: "",
    customTerms: "",
    maxDeliveryKm: 50,
  });

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        isActive: (settings as any).isActive ?? false,
        allowsFood: (settings as any).allowsFood ?? true,
        allowsCoffee: (settings as any).allowsCoffee ?? true,
        allowsGroceries: (settings as any).allowsGroceries ?? true,
        allowsPharmacy: (settings as any).allowsPharmacy ?? false,
        allowsDocuments: (settings as any).allowsDocuments ?? false,
        allowsElectronics: (settings as any).allowsElectronics ?? false,
        allowsClothes: (settings as any).allowsClothes ?? false,
        allowsOther: (settings as any).allowsOther ?? true,
        minBookingsToDepart: (settings as any).minBookingsToDepart ?? 3,
        maxBookingsPerTrip: (settings as any).maxBookingsPerTrip ?? 10,
        defaultDeliveryFee: Number((settings as any).defaultDeliveryFee) || 15,
        driverNote: (settings as any).driverNote ?? "",
        customTerms: (settings as any).customTerms ?? "",
        maxDeliveryKm: Number((settings as any).maxDeliveryKm) || 50,
      });
    }
  }, [settings]);

  // ─── نموذج إنشاء رحلة ───
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [tripForm, setTripForm] = useState({
    fromCityId: "",
    fromCityName: "",     // اسم مدينة المندوب (من GPS تلقائياً)
    fromLat: null as number | null,
    fromLng: null as number | null,
    toCityId: "",
    toCityName: "",       // اسم مدينة التوصيل (من الخريطة)
    toCityLat: null as number | null,
    toCityLng: null as number | null,
    toCityRadiusKm: "10", // قطر التغطية بالكيلومتر
    departureTime: (() => { const d = new Date(Date.now() + 5 * 60 * 1000); return d.toISOString().slice(0, 16); })(),
    estimatedArrivalTime: "",
    bookingDeadline: "",
    maxBookings: 5,
    deliveryFee: "",
    notes: "",
    tripType: "group" as "group" | "express",
  });
  // حالة جلب الموقع من GPS
  const [fetchingLocation, setFetchingLocation] = useState(false);
  // حالة نافذة مراجعة وتأكيد الرحلة
  const [showTripReview, setShowTripReview] = useState(false);
  // حالة عرض خريطة مدينة التوصيل
  const [showToCityMap, setShowToCityMap] = useState(false);
  const toCityMapRef = useRef<any>(null);
  const toCityMarkerRef = useRef<any>(null);
  const toCityCircleRef = useRef<any>(null);
  const toCitySearchInputRef = useRef<HTMLInputElement | null>(null);
  const toCityAutocompleteRef = useRef<any>(null);
  // ─── حالة رسم المضلع ───
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const isDrawingPolygonRef = useRef(false); // ref لحل مشكلة closure في handleToCityMapReady
  const [polygonPoints, setPolygonPoints] = useState<Array<{lat: number; lng: number}>>([]);
  const polygonPointsRef = useRef<Array<{lat: number; lng: number}>>([]);
  const [savedPolygon, setSavedPolygon] = useState<Array<[number, number]> | null>(null); // [[lng,lat],...]
  const [pendingSavePolygon, setPendingSavePolygon] = useState<Array<[number, number]> | null>(null);
  const [savePolygonName, setSavePolygonName] = useState("");
  const [showSavePolygonDialog, setShowSavePolygonDialog] = useState(false);
  const polygonPolylineRef = useRef<any>(null); // خط مؤقت أثناء الرسم
  const polygonShapeRef = useRef<any>(null); // المضلع المحفوظ
  const polygonMarkersRef = useRef<any[]>([]); // نقاط الرسم

  // ─── استخراج اسم المدينة من إحداثيات عبر Reverse Geocoding ───
  const reverseGeocodeCityName = useCallback(async (lat: number, lng: number): Promise<string> => {
    if (!window.google?.maps) return "";
    return new Promise((resolve) => {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status !== "OK" || !results || results.length === 0) { resolve(""); return; }

        // البحث في نتائج نوع locality (اسم المدينة الدقيق)
        for (const result of results) {
          const localityComp = result.address_components.find((c: any) => c.types.includes("locality"));
          if (localityComp) { resolve(localityComp.long_name); return; }
        }
        // ثم administrative_area_level_2 (محافظة فرعية)
        for (const result of results) {
          const l2 = result.address_components.find((c: any) => c.types.includes("administrative_area_level_2"));
          if (l2) { resolve(l2.long_name); return; }
        }
        // ثم administrative_area_level_1 (محافظة رئيسية)
        for (const result of results) {
          const l1 = result.address_components.find((c: any) => c.types.includes("administrative_area_level_1"));
          if (l1) { resolve(l1.long_name); return; }
        }
        resolve("");
      });
    });
  }, []);

  // ─── جلب موقع المندوب من GPS (زر تغيير في نموذج الرحلة) ───
  const fetchDriverLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error("المتصفح لا يدعم تحديد الموقع"); return; }
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`,
            { headers: { "User-Agent": "ShopperDeliveryApp/1.0" } }
          );
          const data = await resp.json();
          const addr = data.address || {};
          // أخذ اسم المدينة فقط (بريدة/عنيزة) وليس المنطقة (القصيم)
          const cityName = addr.city || addr.town || addr.municipality || addr.county || addr.state || "";
          setTripForm(f => ({ ...f, fromLat: lat, fromLng: lng, fromCityName: cityName || `موقعي (${lat.toFixed(4)}, ${lng.toFixed(4)})` }));
          setFetchingLocation(false);
          if (cityName) toast.success(`تم تحديد موقعك: ${cityName}`);
          else toast.success("تم تحديد موقعك بنجاح");
        } catch {
          setTripForm(f => ({ ...f, fromLat: lat, fromLng: lng, fromCityName: `موقعي (${lat.toFixed(4)}, ${lng.toFixed(4)})` }));
          setFetchingLocation(false);
          toast.success("تم تحديد موقعك");
        }
      },
      () => {
        setFetchingLocation(false);
        toast.error("تعذر جلب الموقع. تأكد من منح صلاحية الموقع");
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  // ─── تحديث الدائرة على خريطة مدينة التوصيل ───
  const updateToCityMapCircle = useCallback((lat: number, lng: number, radiusKm: number) => {
    if (!toCityMapRef.current) return;
    const pos = { lat, lng };
    if (toCityMarkerRef.current) toCityMarkerRef.current.position = pos;
    else toCityMarkerRef.current = new (window as any).google.maps.marker.AdvancedMarkerElement({ map: toCityMapRef.current, position: pos });
    if (toCityCircleRef.current) {
      toCityCircleRef.current.setCenter(pos);
      toCityCircleRef.current.setRadius(radiusKm * 1000);
    } else {
      toCityCircleRef.current = new (window as any).google.maps.Circle({
        map: toCityMapRef.current,
        center: pos,
        radius: radiusKm * 1000,
        fillColor: "#7c3aed",
        fillOpacity: 0.18,
        strokeColor: "#7c3aed",
        strokeOpacity: 0.7,
        strokeWeight: 2,
      });
    }
    toCityMapRef.current.setCenter(pos);
    toCityMapRef.current.setZoom(10);
  }, []);

  // ─── معالجة النقر على خريطة مدينة التوصيل ───
  // ─── دوال رسم المضلع ───
  const clearPolygonDrawing = useCallback(() => {
    const g = (window as any).google?.maps;
    if (!g) return;
    polygonMarkersRef.current.forEach((m: any) => { try { m.map = null; } catch {} });
    polygonMarkersRef.current = [];
    if (polygonPolylineRef.current) { polygonPolylineRef.current.setMap(null); polygonPolylineRef.current = null; }
    if (polygonShapeRef.current) { polygonShapeRef.current.setMap(null); polygonShapeRef.current = null; }
  }, []);

  const drawPolygonOnMap = useCallback((points: Array<{lat: number; lng: number}>, closed = false) => {
    const g = (window as any).google?.maps;
    if (!g || !toCityMapRef.current) return;
    // خط مؤقت
    if (polygonPolylineRef.current) polygonPolylineRef.current.setMap(null);
    const path = closed ? [...points, points[0]] : points;
    polygonPolylineRef.current = new g.Polyline({
      path, map: toCityMapRef.current,
      strokeColor: "#7c3aed", strokeWeight: 2, strokeOpacity: 0.8,
    });
    // مضلع مغلق
    if (closed) {
      if (polygonShapeRef.current) polygonShapeRef.current.setMap(null);
      polygonShapeRef.current = new g.Polygon({
        paths: points, map: toCityMapRef.current,
        fillColor: "#7c3aed", fillOpacity: 0.2,
        strokeColor: "#7c3aed", strokeWeight: 2,
      });
    }
  }, []);

  // ─── البحث عن المدينة بـ Geocoding ───
  const [toCitySearchText, setToCitySearchText] = useState("");
  const [citySearchLoading, setCitySearchLoading] = useState(false);

  // ─── المناطق المحفوظة ───
  const [showSavedPolygons, setShowSavedPolygons] = useState(false);
  const [savedPolygonSearch, setSavedPolygonSearch] = useState("");
  // ─── حالة رسم المنطقة في تبويب الإعدادات ───
  const [showSettingsDrawMap, setShowSettingsDrawMap] = useState(false);
  const [settingsNewZoneName, setSettingsNewZoneName] = useState("");
  const [settingsDrawPoints, setSettingsDrawPoints] = useState<Array<{lat: number; lng: number}>>([]);
  const settingsDrawPointsRef = useRef<Array<{lat: number; lng: number}>>([]);
  const [isSettingsDrawing, setIsSettingsDrawing] = useState(false);
  const isSettingsDrawingRef = useRef(false);
  const settingsMapRef = useRef<any>(null);
  const settingsPolylineRef = useRef<any>(null);
  const settingsPolygonRef = useRef<any>(null);
  const settingsMarkersRef = useRef<any[]>([]);
  const [settingsDrawnPolygon, setSettingsDrawnPolygon] = useState<Array<[number, number]> | null>(null);
  const [settingsSearchText, setSettingsSearchText] = useState("");
  const [settingsSearchLoading, setSettingsSearchLoading] = useState(false);
  const [zoneListSearch, setZoneListSearch] = useState(""); // بحث في قائمة المناطق المحفوظة
  const deleteCityPolygonMutation = trpc.cityPolygons.delete.useMutation({
    onSuccess: () => { utils.cityPolygons.list.invalidate(); utils.cityPolygons.listMine.invalidate(); },
  });
  const saveSettingsPolygonMutation = trpc.cityPolygons.save.useMutation({
    onSuccess: () => { utils.cityPolygons.list.invalidate(); utils.cityPolygons.listMine.invalidate(); setShowSettingsDrawMap(false); setSettingsDrawnPolygon(null); setSettingsNewZoneName(""); setSettingsDrawPoints([]); settingsDrawPointsRef.current = []; setIsSettingsDrawing(false); isSettingsDrawingRef.current = false; toast.success("تم حفظ المنطقة بنجاح"); },
  });

  const handleCitySearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    // إذا لم تُحمَّل الخريطة بعد، انتظر حتى تُحمَّل ثم ابحث
    if (!toCityMapRef.current) {
      const waitForMap = setInterval(() => {
        if (toCityMapRef.current) {
          clearInterval(waitForMap);
          handleCitySearch(query);
        }
      }, 200);
      setTimeout(() => clearInterval(waitForMap), 5000);
      return;
    }
    setCitySearchLoading(true);
    try {
      const google = (window as any).google;
      if (!google?.maps?.Geocoder) { setCitySearchLoading(false); return; }
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: query + " السعودية", language: "ar" }, (results: any, status: any) => {
        setCitySearchLoading(false);
        if (status !== "OK" || !results?.length) {
          // جرب بدون "السعودية"
          geocoder.geocode({ address: query, language: "ar" }, (r2: any, s2: any) => {
            if (s2 !== "OK" || !r2?.length) return;
            const loc2 = r2[0].geometry.location;
            const lat2 = loc2.lat(); const lng2 = loc2.lng();
            let cityName2 = query;
            const comps2 = r2[0].address_components;
            const lc2 = comps2?.find((c: any) => c.types.includes("locality") || c.types.includes("administrative_area_level_2"));
            if (lc2) cityName2 = lc2.long_name;
            setTripForm(f => ({ ...f, toCityLat: lat2, toCityLng: lng2, toCityName: cityName2 }));
            if (toCityMapRef.current) { toCityMapRef.current.setCenter({ lat: lat2, lng: lng2 }); toCityMapRef.current.setZoom(12); }
            if (toCityMarkerRef.current) toCityMarkerRef.current.position = { lat: lat2, lng: lng2 };
            else if (toCityMapRef.current) toCityMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({ map: toCityMapRef.current, position: { lat: lat2, lng: lng2 } });
          });
          return;
        }
        const loc = results[0].geometry.location;
        const lat = loc.lat(); const lng = loc.lng();
        let cityName = query;
        const comps = results[0].address_components;
        const localityComp = comps?.find((c: any) => c.types.includes("locality") || c.types.includes("administrative_area_level_2"));
        if (localityComp) cityName = localityComp.long_name;
        setTripForm(f => ({ ...f, toCityLat: lat, toCityLng: lng, toCityName: cityName }));
        if (toCityMapRef.current) { toCityMapRef.current.setCenter({ lat, lng }); toCityMapRef.current.setZoom(12); }
        if (toCityMarkerRef.current) toCityMarkerRef.current.position = { lat, lng };
        else if (toCityMapRef.current) toCityMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({ map: toCityMapRef.current, position: { lat, lng } });
      });
    } catch { setCitySearchLoading(false); }
  }, []);

  const handleToCityMapReady = useCallback((map: any) => {
    toCityMapRef.current = map;
    // ─── النقر على الخريطة ─── (using refs to avoid stale closure)
    map.addListener("click", async (e: any) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      // وضع رسم المضلع - نستخدم ref بدلاً من state لتجنب stale closure
      if (isDrawingPolygonRef.current) {
        const newPts = [...polygonPointsRef.current, { lat, lng }];
        polygonPointsRef.current = newPts;
        // إضافة marker للنقطة
        const isFirst = newPts.length === 1;
        const el = document.createElement("div");
        el.style.cssText = `width:${isFirst?14:10}px;height:${isFirst?14:10}px;border-radius:50%;background:${isFirst?"#f59e0b":"#7c3aed"};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);`;
        const marker = new (window as any).google.maps.marker.AdvancedMarkerElement({ map, position: { lat, lng }, content: el });
        polygonMarkersRef.current.push(marker);
        drawPolygonOnMap(newPts);
        setPolygonPoints([...newPts]);
        return;
      }
      // وضع عادي: تحديد مركز المدينة
      const cityName = await reverseGeocodeCityName(lat, lng);
      setTripForm(f => ({ ...f, toCityLat: lat, toCityLng: lng, toCityName: cityName || `منطقة (${lat.toFixed(4)}, ${lng.toFixed(4)})` }));
      // تحديث marker مركز المدينة
      if (toCityMarkerRef.current) toCityMarkerRef.current.position = { lat, lng };
      else toCityMarkerRef.current = new (window as any).google.maps.marker.AdvancedMarkerElement({ map, position: { lat, lng } });
    });
  }, [drawPolygonOnMap, reverseGeocodeCityName]); // لا نضع isDrawingPolygon هنا لتجنب stale closure

  // ─── عداد تنازلي للرحلات ───
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const formatTripCountdown = useCallback((timeStr: string): string | null => {
    const dep = new Date(timeStr).getTime();
    const diff = dep - nowMs;
    if (diff <= 0) return null;
    const totalSecs = Math.floor(diff / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (days > 0) return `${days}ي ${hours}س ${mins}د`;
    if (hours > 0) return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [nowMs]);
  // ─── إدارة الحجوزات ───
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  // ─── حساب المسافة لكل حجز ───
  const [bookingDistances, setBookingDistances] = useState<Record<number, { distKm: number; etaMins: number } | null | 'loading'>>({});

  // حساب المسافة: عرض Haversine فوراً مع تحسين لاحق بـ Google Maps
  const calcBookingDistance = (bookingId: number, pickup: string, delivery: string, pickupLat?: number | null, pickupLng?: number | null, deliveryLat?: number | null, deliveryLng?: number | null) => {
    if (bookingDistances[bookingId] !== undefined) return;

    // ─── خطوة 1: عرض Haversine فوراً إذا توفرت الإحداثيات ───
    if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
      const distKm = haversineKm(pickupLat, pickupLng, deliveryLat, deliveryLng);
      const etaMins = Math.round((distKm / 40) * 60);
      setBookingDistances(prev => ({ ...prev, [bookingId]: { distKm, etaMins } }));
    } else {
      setBookingDistances(prev => ({ ...prev, [bookingId]: null }));
      return;
    }

    // ─── خطوة 2: تحسين بـ Google Maps في الخلفية ───
    if (!pickup || !delivery) return;
    let gmAttempts = 0;
    const tryCalc = () => {
      if (typeof (window as any).google === 'undefined' || !(window as any).google?.maps?.DistanceMatrixService) {
        gmAttempts++;
        if (gmAttempts < 5) setTimeout(tryCalc, 1000);
        return;
      }
      const service = new (window as any).google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        { origins: [pickup], destinations: [delivery], travelMode: (window as any).google.maps.TravelMode.DRIVING, unitSystem: (window as any).google.maps.UnitSystem.METRIC },
        (response: any, status: string) => {
          if (status === 'OK' && response?.rows?.[0]?.elements?.[0]?.status === 'OK') {
            const el = response.rows[0].elements[0];
            setBookingDistances(prev => ({ ...prev, [bookingId]: { distKm: el.distance.value / 1000, etaMins: Math.round(el.duration.value / 60) } }));
          }
          // إذا فشل، تبقى نتيجة Haversine معروضة
        }
      );
    };
    tryCalc();
  };
  const { data: selectedTripBookings, isLoading: selectedBookingsLoading, refetch: refetchSelectedBookings } = trpc.shopper.getTripBookings.useQuery(
    { tripId: selectedTripId ?? 0 },
    { enabled: !!selectedTripId }
  );

  const acceptBookingMutation = trpc.shopper.acceptBooking.useMutation({
    onSuccess: () => { refetchSelectedBookings(); toast.success("تم قبول الحجز"); },
    onError: (e: any) => toast.error(e.message),
  });
  const rejectBookingMutation = trpc.shopper.rejectBooking.useMutation({
    onSuccess: () => { refetchSelectedBookings(); toast.info("تم رفض الحجز"); },
    onError: (e: any) => toast.error(e.message),
  });
  const acceptAllMutation = trpc.shopper.acceptAllPendingBookings.useMutation({
    onSuccess: () => { refetchSelectedBookings(); toast.success("تم قبول جميع الحجوزات"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateBookingStatusMutation = trpc.shopper.updateBookingStatus.useMutation({
    onSuccess: () => { refetchSelectedBookings(); toast.success("تم تحديث حالة الحجز"); },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: cities } = trpc.cities.listActive.useQuery();

  const tripStatusLabel: Record<string, { label: string; color: string }> = {
    upcoming: { label: "قادمة", color: "#6b7280" },
    collecting: { label: "تقبل حجوزات", color: "#10b981" },
    departed: { label: "انطلقت", color: "#3b82f6" },
    arrived: { label: "وصلت", color: "#8b5cf6" },
    completed: { label: "مكتملة", color: "#6b7280" },
    cancelled: { label: "ملغية", color: "#ef4444" },
  };

  const bookingStatusLabel: Record<string, { label: string; color: string }> = {
    pending: { label: "بانتظار الرد", color: "#f59e0b" },
    accepted: { label: "مقبول", color: "#10b981" },
    rejected: { label: "مرفوض", color: "#ef4444" },
    picked_up: { label: "تم الاستلام", color: "#3b82f6" },
    delivered: { label: "تم التوصيل", color: "#8b5cf6" },
    confirmed: { label: "مكتمل", color: "#6b7280" },
    cancelled: { label: "ملغي", color: "#9ca3af" },
  };

  // تتبع الحجوزات التي رُفعت لها صورة التسليم في هذه الجلسة
  const [deliveryProofUploaded, setDeliveryProofUploaded] = useState<Set<number>>(new Set());

  // نافذة تأكيد الصورة قبل الإرسال
  const [confirmPhotoState, setConfirmPhotoState] = useState<{
    preview: string;
    bookingId: number;
    type: "pickup" | "delivery";
    base64: string;
  } | null>(null);

  const handleImageUpload = async (file: File, bookingId: number, type: "pickup" | "delivery") => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      // عرض نافذة التأكيد بدلاً من الإرسال المباشر
      setConfirmPhotoState({ preview: dataUrl, bookingId, type, base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSend = () => {
    if (!confirmPhotoState) return;
    const { bookingId, type, base64 } = confirmPhotoState;
    setConfirmPhotoState(null);
    if (type === "delivery") {
      updateBookingStatusMutation.mutate(
        { bookingId, status: "delivered", proofImageBase64: base64 },
        { onSuccess: () => setDeliveryProofUploaded(prev => new Set(prev).add(bookingId)) }
      );
    } else {
      updateBookingStatusMutation.mutate({ bookingId, status: "picked_up", proofImageBase64: base64 });
    }
  };

  return (
    <div dir="rtl" className="pb-8">
      {/* Sub-tabs */}
      <div className="sticky top-0 z-20 flex gap-1 px-4 py-3" style={{ background: "rgba(15,12,41,0.97)", borderBottom: "1px solid rgba(167,139,250,0.15)" }}>
        {[
          { id: "settings", label: "⚙️ الإعدادات" },
          { id: "trips", label: "🚗 رحلاتي" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubView(t.id as any)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${subView === t.id ? "bg-primary text-white" : "text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ─── إعدادات شوبر ─── */}
        {subView === "settings" && (
          <>
            {settingsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-4">
                {/* تفعيل/إيقاف */}
                <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-foreground">تفعيل توصيل شوبر</p>
                      <p className="text-xs text-muted-foreground mt-0.5">ظهورك في قسم شوبر للعملاء</p>
                    </div>
                    <button
                      onClick={() => setSettingsForm(f => ({ ...f, isActive: !f.isActive }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${settingsForm.isActive ? "bg-primary" : "bg-muted"}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${settingsForm.isActive ? "right-0.5" : "left-0.5"}`} />
                    </button>
                  </div>
                </div>

                {/* أنواع ما يقبله */}
                <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <p className="font-bold text-sm" style={{color:'#f0eeff'}}>ما تقبل توصيله</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "allowsFood", label: "🍔 طعام" },
                      { key: "allowsCoffee", label: "☕ قهوة وكافيه" },
                      { key: "allowsGroceries", label: "🛒 بقالة" },
                      { key: "allowsPharmacy", label: "💊 صيدلية" },
                      { key: "allowsDocuments", label: "📄 وثائق" },
                      { key: "allowsElectronics", label: "📱 إلكترونيات" },
                      { key: "allowsClothes", label: "👕 ملابس" },
                      { key: "allowsOther", label: "📦 أخرى" },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setSettingsForm(f => ({ ...f, [key]: !(f as any)[key] }))}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-right ${(settingsForm as any)[key] ? "bg-primary/20 border-primary text-primary" : "border-muted text-muted-foreground"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ما لا يقبله */}
                <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <p className="font-bold text-sm" style={{ color: "#f0eeff" }}>ما لا تقبل توصيله</p>
                  <textarea
                    value={settingsForm.customTerms}
                    onChange={(e) => setSettingsForm(f => ({ ...f, customTerms: e.target.value }))}
                    placeholder="مثال: لا أقبل الطلبات الثقيلة، لا أوصل للمناطق البعيدة..."
                    className="w-full rounded-xl border p-3 text-xs resize-none"
                    style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(167,139,250,0.4)", minHeight: "70px", color: "#f0eeff" }}
                  />
                </div>

                {/* ملاحظة للعملاء */}
                <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <p className="font-bold text-sm" style={{ color: "#f0eeff" }}>رسالة للعملاء</p>
                  <Input
                    value={settingsForm.driverNote}
                    onChange={(e) => setSettingsForm(f => ({ ...f, driverNote: e.target.value }))}
                    placeholder="مثال: أنا سريع ومنضبط، أوصل في أقل من ساعة..."
                    className="rounded-xl text-xs"
                    style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(167,139,250,0.4)", color: "#f0eeff" }}
                  />
                </div>

                {/* الحد الأدنى والأقصى */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
                    <p className="text-xs font-bold" style={{ color: "#c4b5fd" }}>الحد الأدنى للحجوزات</p>
                    <Input
                      type="number"
                      value={settingsForm.minBookingsToDepart}
                      onChange={(e) => setSettingsForm(f => ({ ...f, minBookingsToDepart: Number(e.target.value) }))}
                      min={1} max={20}
                      className="rounded-xl text-sm"
                      style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(167,139,250,0.4)", color: "#f0eeff" }}
                    />
                  </div>
                  <div className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
                    <p className="text-xs font-bold" style={{ color: "#c4b5fd" }}>الحد الأقصى للحجوزات</p>
                    <Input
                      type="number"
                      value={settingsForm.maxBookingsPerTrip}
                      onChange={(e) => setSettingsForm(f => ({ ...f, maxBookingsPerTrip: Number(e.target.value) }))}
                      min={1} max={50}
                      className="rounded-xl text-sm"
                      style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(167,139,250,0.4)", color: "#f0eeff" }}
                    />
                  </div>
                </div>

                {/* أقصى مسافة توصيل */}
                <div className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold" style={{ color: "#c4b5fd" }}>أقصى مسافة توصيل</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: settingsForm.maxDeliveryKm === 0 ? "#dcfce7" : "#fef3c7", color: settingsForm.maxDeliveryKm === 0 ? "#15803d" : "#92400e" }}>
                      {settingsForm.maxDeliveryKm === 0 ? "بدون حد" : `${settingsForm.maxDeliveryKm} كم`}
                    </span>
                  </div>
                  <Input
                    type="number"
                    value={settingsForm.maxDeliveryKm}
                    onChange={(e) => setSettingsForm(f => ({ ...f, maxDeliveryKm: Number(e.target.value) }))}
                    min={0} max={500}
                    placeholder="0 = بدون حد"
                    className="rounded-xl text-sm"
                    style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(239,68,68,0.4)", color: "#f0eeff" }}
                  />
                  <p className="text-xs" style={{ color: "#6b7280" }}>إذا تجاوز الطلب هذه المسافة ستتلقى تنبيهاً لقبوله أو رفضه. اكتب 0 لقبول أي مسافة.</p>
                </div>

                {/* ─── مناطقي المحفوظة ─── */}
                <div className="rounded-2xl p-4 space-y-3" style={{ background: "#1a1040", border: "2px solid #5b21b6" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-black" style={{ color: "#ffffff" }}>🗺️ مناطق التغطية</p>
                      <p className="text-xs mt-0.5" style={{ color: "#c4b5fd" }}>مناطق تغطيتك — يظهر طلبات العملاء داخلها فقط</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowSettingsDrawMap(v => !v); setSettingsDrawnPolygon(null); setSettingsDrawPoints([]); settingsDrawPointsRef.current = []; setIsSettingsDrawing(false); isSettingsDrawingRef.current = false; setSettingsNewZoneName(""); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black"
                      style={{ background: "#7c3aed", color: "#ffffff" }}
                    >
                      <Plus className="w-4 h-4" />
                      إضافة منطقة
                    </button>
                  </div>
                  {/* عدد المناطق + حقل البحث */}
                  {!showSettingsDrawMap && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
                        <span className="text-sm font-bold" style={{ color: "#a78bfa" }}>عدد مناطقك:</span>
                        <span className="text-sm font-black" style={{ color: "#ffffff" }}>{(myPolygonsList ?? []).length} منطقة</span>
                      </div>
                      {(myPolygonsList ?? []).length > 0 && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={zoneListSearch}
                            onChange={e => setZoneListSearch(e.target.value)}
                            placeholder="ابحث عن منطقة للتعديل أو الحذف..."
                            className="flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                            style={{ background: "#2d1b69", border: "1px solid #7c3aed", color: "#ffffff", direction: "rtl" }}
                          />
                          {zoneListSearch && (
                            <button type="button" onClick={() => setZoneListSearch("")}
                              className="px-3 py-2 rounded-xl text-sm font-bold"
                              style={{ background: "#374151", color: "#d1d5db" }}
                            ><X className="w-4 h-4" /></button>
                          )}
                        </div>
                      )}
                      {/* نتائج البحث فقط */}
                      {zoneListSearch.trim() && (
                        <div className="space-y-1.5">
                          {(myPolygonsList ?? [])
                            .filter((z: any) => z.cityName.toLowerCase().includes(zoneListSearch.toLowerCase()))
                            .map((z: any) => (
                              <div key={z.id} className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "#2d1b69", border: "1px solid #7c3aed" }}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#7c3aed" }}>
                                  <MapPin className="w-4 h-4" style={{ color: "#ffffff" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black" style={{ color: "#ffffff" }}>{z.cityName}</p>
                                  <p className="text-xs mt-0.5" style={{ color: "#a78bfa" }}>{(z.polygon as any[]).length} نقطة • استُخدمت {z.usageCount} مرة</p>
                                </div>
                                <button type="button"
                                  onClick={() => { if (confirm(`حذف منطقة "${z.cityName}"؟`)) deleteCityPolygonMutation.mutate({ id: z.id }); }}
                                  className="p-2 rounded-lg"
                                  style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}
                                ><Trash2 className="w-4 h-4" /></button>
                              </div>
                            ))}
                          {(myPolygonsList ?? []).filter((z: any) => z.cityName.toLowerCase().includes(zoneListSearch.toLowerCase())).length === 0 && (
                            <p className="text-sm text-center py-3" style={{ color: "#7c6fa0" }}>لا توجد نتائج لـ "{zoneListSearch}"</p>
                          )}
                        </div>
                      )}
                      {!zoneListSearch.trim() && (myPolygonsList ?? []).length === 0 && (
                        <p className="text-sm text-center py-3" style={{ color: "#9ca3af" }}>لا توجد مناطق — اضغط "إضافة منطقة" للبدء</p>
                      )}
                    </div>
                  )}

                  {/* نموذج رسم منطقة جديدة في الإعدادات */}
                  {showSettingsDrawMap && (
                    <div className="space-y-3 p-4 rounded-2xl" style={{ background: "#1e1b4b", border: "2px solid #7c3aed" }}>
                      <p className="text-sm font-bold" style={{ color: "#e9d5ff" }}>✨ رسم منطقة جديدة</p>

                      {/* حقل البحث - ظاهر دائماً */}
                      <div>
                        <p className="text-xs font-semibold mb-1.5" style={{ color: "#c4b5fd" }}>🔍 ابحث عن منطقة لتحديد موقعها على الخريطة</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={settingsSearchText}
                            onChange={e => setSettingsSearchText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && settingsSearchText.trim()) {
                                setSettingsSearchLoading(true);
                                const g = (window as any).google;
                                if (!g?.maps?.Geocoder || !settingsMapRef.current) { setSettingsSearchLoading(false); return; }
                                new g.maps.Geocoder().geocode({ address: settingsSearchText + " السعودية", language: "ar" }, (r: any, s: any) => {
                                  setSettingsSearchLoading(false);
                                  if (s !== "OK" || !r?.length) return;
                                  const loc = r[0].geometry.location;
                                  settingsMapRef.current.setCenter({ lat: loc.lat(), lng: loc.lng() });
                                  settingsMapRef.current.setZoom(12);
                                  const comp = r[0].address_components?.find((c: any) => c.types.includes("locality") || c.types.includes("administrative_area_level_2"));
                                  if (comp && !settingsNewZoneName) setSettingsNewZoneName(comp.long_name);
                                });
                              }
                            }}
                            placeholder="اكتب اسم مدينة أو حي..."
                            style={{ background: "#2e2a5e", border: "1px solid #7c3aed", color: "#e9d5ff", direction: "rtl" }}
                            className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
                          />
                          <button type="button"
                            disabled={settingsSearchLoading || !settingsSearchText.trim()}
                            onClick={() => {
                              if (!settingsSearchText.trim()) return;
                              setSettingsSearchLoading(true);
                              const g = (window as any).google;
                              if (!g?.maps?.Geocoder || !settingsMapRef.current) { setSettingsSearchLoading(false); return; }
                              new g.maps.Geocoder().geocode({ address: settingsSearchText + " السعودية", language: "ar" }, (r: any, s: any) => {
                                setSettingsSearchLoading(false);
                                if (s !== "OK" || !r?.length) return;
                                const loc = r[0].geometry.location;
                                settingsMapRef.current.setCenter({ lat: loc.lat(), lng: loc.lng() });
                                settingsMapRef.current.setZoom(12);
                                const comp = r[0].address_components?.find((c: any) => c.types.includes("locality") || c.types.includes("administrative_area_level_2"));
                                if (comp && !settingsNewZoneName) setSettingsNewZoneName(comp.long_name);
                              });
                            }}
                            className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-40"
                            style={{ background: "#7c3aed", color: "white" }}
                          >
                            {settingsSearchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            بحث
                          </button>
                        </div>
                      </div>

                      {/* أدوات الرسم */}
                      <div>
                        <p className="text-xs font-semibold mb-1.5" style={{ color: "#c4b5fd" }}>📌 أدوات الرسم</p>
                        <div className="flex gap-2 flex-wrap">
                          {!isSettingsDrawing && (
                            <button type="button"
                              onClick={() => { isSettingsDrawingRef.current = true; settingsDrawPointsRef.current = []; setIsSettingsDrawing(true); setSettingsDrawPoints([]); setSettingsDrawnPolygon(null); if (settingsPolylineRef.current) { settingsPolylineRef.current.setMap(null); settingsPolylineRef.current = null; } if (settingsPolygonRef.current) { settingsPolygonRef.current.setMap(null); settingsPolygonRef.current = null; } settingsMarkersRef.current.forEach((m: any) => { try { m.map = null; } catch {} }); settingsMarkersRef.current = []; }}
                              className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5"
                              style={{ background: "#7c3aed", color: "white" }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/></svg>
                              {settingsDrawnPolygon ? "إعادة رسم" : "ابدأ الرسم"}
                            </button>
                          )}
                          {isSettingsDrawing && (
                            <>
                              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#1e3a5f", border: "1px solid #3b82f6" }}>
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></div>
                                <span className="text-sm font-bold" style={{ color: "#93c5fd" }}>وضع الرسم — {settingsDrawPoints.length} نقطة</span>
                              </div>
                              {settingsDrawPoints.length >= 3 && (
                                <button type="button"
                                  onClick={() => {
                                    const pts = settingsDrawPointsRef.current;
                                    if (pts.length < 3) return;
                                    isSettingsDrawingRef.current = false;
                                    setIsSettingsDrawing(false);
                                    const poly: Array<[number, number]> = pts.map(p => [p.lat, p.lng]);
                                    setSettingsDrawnPolygon(poly);
                                    const g = (window as any).google?.maps;
                                    if (g && settingsMapRef.current) {
                                      if (settingsPolylineRef.current) { settingsPolylineRef.current.setMap(null); settingsPolylineRef.current = null; }
                                      if (settingsPolygonRef.current) { settingsPolygonRef.current.setMap(null); settingsPolygonRef.current = null; }
                                      settingsPolygonRef.current = new g.Polygon({ paths: pts, map: settingsMapRef.current, fillColor: "#7c3aed", fillOpacity: 0.2, strokeColor: "#7c3aed", strokeWeight: 2 });
                                    }
                                  }}
                                  className="px-4 py-2 rounded-xl text-sm font-bold"
                                  style={{ background: "#16a34a", color: "white" }}
                                >✓ تأكيد الرسم</button>
                              )}
                              <button type="button"
                                onClick={() => { isSettingsDrawingRef.current = false; settingsDrawPointsRef.current = []; setIsSettingsDrawing(false); setSettingsDrawPoints([]); }}
                                className="px-4 py-2 rounded-xl text-sm font-bold"
                                style={{ background: "#991b1b", color: "white" }}
                              >إلغاء</button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* خريطة الرسم */}
                      <MapView
                        className="h-56 rounded-xl overflow-hidden"
                        initialCenter={{ lat: 24.7136, lng: 46.6753 }}
                        initialZoom={6}
                        onMapReady={(map: any) => {
                          settingsMapRef.current = map;
                          map.addListener("click", (e: any) => {
                            if (!e.latLng || !isSettingsDrawingRef.current) return;
                            const lat = e.latLng.lat(); const lng = e.latLng.lng();
                            const newPts = [...settingsDrawPointsRef.current, { lat, lng }];
                            settingsDrawPointsRef.current = newPts;
                            setSettingsDrawPoints([...newPts]);
                            const g = (window as any).google?.maps;
                            if (!g) return;
                            const el = document.createElement("div");
                            const isFirst = newPts.length === 1;
                            el.style.cssText = `width:${isFirst?14:10}px;height:${isFirst?14:10}px;border-radius:50%;background:${isFirst?"#f59e0b":"#7c3aed"};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);`;
                            settingsMarkersRef.current.push(new g.marker.AdvancedMarkerElement({ map, position: { lat, lng }, content: el }));
                            if (settingsPolylineRef.current) settingsPolylineRef.current.setMap(null);
                            settingsPolylineRef.current = new g.Polyline({ path: newPts, map, strokeColor: "#7c3aed", strokeWeight: 2, strokeOpacity: 0.8 });
                          });
                        }}
                      />

                      {/* اسم المنطقة */}
                      <div>
                        <p className="text-xs font-semibold mb-1.5" style={{ color: "#c4b5fd" }}>🏷️ اسم المنطقة</p>
                        <input
                          type="text"
                          value={settingsNewZoneName}
                          onChange={e => setSettingsNewZoneName(e.target.value)}
                          placeholder="مثال: حي الملز أو منطقة القصيم"
                          style={{ background: "#2e2a5e", border: settingsNewZoneName.trim() ? "1px solid #7c3aed" : "1px solid #4c1d95", color: "#e9d5ff", direction: "rtl" }}
                          className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                        />
                        {!settingsNewZoneName.trim() && settingsDrawnPolygon && (
                          <p className="text-xs mt-1" style={{ color: "#f87171" }}>⚠️ أدخل اسم المنطقة لتفعيل زر الحفظ</p>
                        )}
                      </div>

                      {/* حالة المضلع */}
                      {settingsDrawnPolygon && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#14532d", border: "1px solid #16a34a" }}>
                          <span className="text-base">✅</span>
                          <p className="text-sm font-bold" style={{ color: "#86efac" }}>تم رسم مضلع بـ {settingsDrawnPolygon.length} نقطة</p>
                        </div>
                      )}

                      {/* أزرار الحفظ والإلغاء */}
                      <div className="flex gap-2">
                        <button type="button"
                          disabled={!settingsDrawnPolygon || !settingsNewZoneName.trim() || saveSettingsPolygonMutation.isPending}
                          onClick={() => {
                            if (!settingsDrawnPolygon || !settingsNewZoneName.trim()) return;
                            saveSettingsPolygonMutation.mutate({ cityName: settingsNewZoneName.trim(), polygon: settingsDrawnPolygon });
                          }}
                          className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                          style={{
                            background: (!settingsDrawnPolygon || !settingsNewZoneName.trim() || saveSettingsPolygonMutation.isPending) ? "#4c1d95" : "#7c3aed",
                            color: (!settingsDrawnPolygon || !settingsNewZoneName.trim()) ? "#a78bfa" : "white",
                            opacity: saveSettingsPolygonMutation.isPending ? 0.7 : 1
                          }}
                        >
                          {saveSettingsPolygonMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                          {saveSettingsPolygonMutation.isPending ? "جاري الحفظ..." : "حفظ المنطقة"}
                        </button>
                        <button type="button"
                          onClick={() => { setShowSettingsDrawMap(false); setSettingsDrawnPolygon(null); setSettingsNewZoneName(""); setSettingsDrawPoints([]); settingsDrawPointsRef.current = []; setIsSettingsDrawing(false); isSettingsDrawingRef.current = false; }}
                          className="px-5 py-3 rounded-xl text-sm font-bold"
                          style={{ background: "#374151", color: "#d1d5db" }}
                        >إلغاء</button>
                      </div>
                    </div>
                  )}

                </div>

                <Button
                  className="w-full rounded-2xl h-12 font-bold"
                  onClick={() => upsertSettingsMutation.mutate({
                    isActive: settingsForm.isActive,
                    allowsFood: settingsForm.allowsFood,
                    allowsCoffee: settingsForm.allowsCoffee,
                    allowsGroceries: settingsForm.allowsGroceries,
                    allowsPharmacy: settingsForm.allowsPharmacy,
                    allowsDocuments: settingsForm.allowsDocuments,
                    allowsElectronics: settingsForm.allowsElectronics,
                    allowsClothes: settingsForm.allowsClothes,
                    allowsOther: settingsForm.allowsOther,
                    minBookingsToDepart: settingsForm.minBookingsToDepart,
                    maxBookingsPerTrip: settingsForm.maxBookingsPerTrip,
                    defaultDeliveryFee: settingsForm.defaultDeliveryFee,
                    driverNote: settingsForm.driverNote || undefined,
                    customTerms: settingsForm.customTerms || undefined,
                    maxDeliveryKm: settingsForm.maxDeliveryKm,
                  })}
                  disabled={upsertSettingsMutation.isPending}
                >
                  {upsertSettingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <CheckCircle2 className="w-4 h-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
              </div>
            )}
          </>
        )}

        {/* ─── رحلاتي ─── */}
        {subView === "trips" && (
          <>
            <Button className="w-full rounded-2xl h-11 font-bold" onClick={() => {
              // تهيئة نموذج الرحلة بالقيم الصحيحة من البداية
              setTripForm({
                fromCityId: "",
                fromCityName: driverCurrentCity || "",
                fromLat: driverCurrentLat,
                fromLng: driverCurrentLng,
                toCityId: "",
                toCityName: "",
                toCityLat: null,
                toCityLng: null,
                toCityRadiusKm: "10",
                departureTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
                estimatedArrivalTime: "",
                bookingDeadline: "",
                maxBookings: 5,
                deliveryFee: "",
                notes: "",
                tripType: "group",
              });
              setShowCreateTrip(true);
            }}>
              <Plus className="w-4 h-4 ml-2" />
              إنشاء رحلة جديدة
            </Button>

            {tripsLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

            {/* الرحلات النشطة */}
            {(() => {
              // عرض الرحلات النشطة فقط (بدون المكتملة والملغاة)
              const activeTrips = (myTrips as any[] ?? []).filter((t: any) => t.status !== "completed" && t.status !== "cancelled");
              if (!tripsLoading && activeTrips.length === 0) return (
                <div className="text-center py-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(167,139,250,0.4)" }}>
                  <p className="text-sm" style={{ color: "#a78bfa" }}>لا توجد رحلات نشطة حالياً</p>
                </div>
              );
              return activeTrips.map((trip: any) => {
              const st = tripStatusLabel[trip.status] ?? { label: trip.status, color: "#6b7280" };
              const depTime = new Date(trip.departureTime);
              return (
                <div key={trip.id} className="rounded-2xl overflow-hidden" style={{ background: "rgba(124,58,237,0.12)", border: "1.5px solid rgba(167,139,250,0.35)", boxShadow: "0 4px 20px rgba(124,58,237,0.2)" }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(167,139,250,0.2)", background: "rgba(124,58,237,0.18)" }}>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "#f0eeff" }}>{trip.fromCityName} → {trip.toCityName}</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: "#c4b5fd" }}>
                        {depTime.toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" })} - {depTime.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${st.color}25`, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-4 text-xs font-semibold" style={{ color: "#e9d5ff" }}>
                      <span>الحجوزات: {trip.currentBookings}/{trip.maxBookings}</span>
                      <span className="font-bold text-primary">{trip.deliveryFee} ر.س</span>
                    </div>
                    {/* عداد تنازلي - إغلاق استقبال الطلبات */}
                    {(trip.status === "upcoming" || trip.status === "collecting" || trip.status === "departed" || trip.status === "arrived") && (() => {
                      // نستخدم bookingDeadline فقط إذا كان محدداً — لا نستخدم departureTime كبديل
                      // لأن departureTime قد يكون في الماضي فيظهر "انتهى الوقت" خطأً
                      const deadlineTime = trip.bookingDeadline ?? null;
                      const hasDeadline = !!deadlineTime;
                      const countdown = hasDeadline ? formatTripCountdown(deadlineTime!) : null;
                      const totalSecs = hasDeadline ? Math.floor((new Date(deadlineTime!).getTime() - nowMs) / 1000) : 0;
                      const isUrgent = totalSecs < 3600 && totalSecs > 0;
                      return (
                        <div className="space-y-1.5">
                          {/* عداد إغلاق الحجز - يظهر فقط إذا حدد المندوب bookingDeadline */}
                          {hasDeadline && (
                          <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: countdown ? (isUrgent ? "#ef4444" : "#f59e0b") : "#ef4444" }}>
                            <Timer className="w-3.5 h-3.5" />
                            {countdown
                              ? <span>إغلاق الحجز خلال: {countdown}</span>
                              : <span>انتهى وقت استقبال الحجوزات</span>
                            }
                          </div>
                          )}
                          {/* عداد الوصول المتوقع */}
                          {(() => {
                            const arrivalCountdown = formatTripCountdown(trip.estimatedArrivalTime);
                            const arrivalMs = new Date(trip.estimatedArrivalTime).getTime() - nowMs;
                            const arrivalUrgent = arrivalMs < 3600000 && arrivalMs > 0;
                            return (
                              <div className="flex items-center gap-1.5 text-xs" style={{ color: arrivalCountdown ? (arrivalUrgent ? "#f59e0b" : "#6ee7b7") : "#6ee7b7" }}>
                                <span>⌛</span>
                                {arrivalCountdown
                                  ? <span>الوصول المتوقع خلال: {arrivalCountdown}</span>
                                  : <span>وصلت / تجاوز وقت الوصول المتوقع</span>
                                }
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}
                    {/* أزرار تحديث الحالة */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {trip.status === "upcoming" && (
                        <button
                          onClick={() => updateTripStatusMutation.mutate({ tripId: trip.id, status: "collecting" })}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "#16a34a", color: "#ffffff" }}
                        >
                          فتح الحجوزات
                        </button>
                      )}
                      {trip.status === "collecting" && (
                        <>
                          <button
                            onClick={() => updateTripStatusMutation.mutate({ tripId: trip.id, status: "departed" })}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "#2563eb", color: "#ffffff" }}
                          >
                            انطلقت
                          </button>
                          <button
                            onClick={() => { setSelectedTripId(trip.id); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "#7c3aed", color: "#ffffff" }}
                          >
                            إدارة الحجوزات
                          </button>
                        </>
                      )}
                      {trip.status === "departed" && (
                        <button
                          onClick={() => updateTripStatusMutation.mutate({ tripId: trip.id, status: "arrived" })}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "#7c3aed", color: "#ffffff" }}
                        >
                          وصلت
                        </button>
                      )}
                      {trip.status === "arrived" && (
                        <button
                          onClick={() => updateTripStatusMutation.mutate({ tripId: trip.id, status: "completed" })}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "#6b7280", color: "#ffffff" }}
                        >
                          إتمام الرحلة
                        </button>
                      )}
                      {(trip.status === "collecting" || trip.status === "upcoming") && (
                        <button
                          onClick={() => { setSelectedTripId(trip.id); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "#7c3aed", color: "#ffffff" }}
                        >
                          الحجوزات ({trip.currentBookings})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
             });
            })()}

            {/* قسم الرحلات السابقة */}
            {pastTrips.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-bold mb-2" style={{ color: "#a78bfa" }}>✅ الرحلات السابقة</p>
                <div className="space-y-2">
                  {pastTrips.map((trip: any) => {
                    const depTime = new Date(trip.departureTime);
                    const tripTypeLabel = trip.tripType === "express" ? "⚡ سريع" : "🚚 جماعي";
                    const tripTypeColor = trip.tripType === "express" ? "#f59e0b" : "#7c3aed";
                    const statusLabel = trip.status === "completed" ? "مكتملة" : "ملغاة";
                    const statusColor = trip.status === "completed" ? "#16a34a" : "#ef4444";
                    return (
                      <div key={trip.id} className="rounded-xl px-3 py-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}>
                        <div>
                          <p className="font-bold text-sm" style={{ color: "#f0eeff" }}>{trip.fromCityName} → {trip.toCityName}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                            {depTime.toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" })}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${tripTypeColor}20`, color: tripTypeColor }}>{tripTypeLabel}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor}15`, color: statusColor }}>{statusLabel}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold" style={{ color: "#374151" }}>{trip.currentBookings}/{trip.maxBookings}</p>
                          <p className="text-xs" style={{ color: "#7c3aed" }}>{trip.deliveryFee} ر.س</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* نموذج إنشاء رحلة */}
            {showCreateTrip && (
              <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.7)" }}>
                <div className="w-full rounded-t-3xl overflow-y-auto" style={{ background: "#0f0c2e", maxHeight: "90vh", border: "2px solid rgba(124,58,237,0.5)" }}>
                  <div className="px-4 pt-5 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(167,139,250,0.3)", background: "rgba(124,58,237,0.2)" }}>
                    <h3 className="font-bold text-base" style={{ color: "#f0eeff" }}>إنشاء رحلة جديدة</h3>
                    <button onClick={() => setShowCreateTrip(false)}>
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="px-4 py-4 space-y-4">
                    {/* نوع الرحلة */}
                    <div>
                      <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>نوع التوصيل *</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setTripForm(f => ({ ...f, tripType: "group", maxBookings: f.tripType === "express" ? 5 : f.maxBookings }))}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all"
                          style={tripForm.tripType === "group"
                            ? { borderColor: "#7c3aed", background: "#f5f3ff", color: "#7c3aed" }
                            : { borderColor: "#d1d5db", background: "#f9fafb", color: "#374151" }}
                        >
                          <span className="text-lg">🚚</span>
                          <span className="text-xs font-bold">جماعي</span>
                          <span className="text-[10px]" style={{ color: "#6b7280" }}>عدة طلبات</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTripForm(f => ({ ...f, tripType: "express", maxBookings: 1, bookingDeadline: "", departureTime: "", estimatedArrivalTime: "" }))}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all"
                          style={tripForm.tripType === "express"
                            ? { borderColor: "#d97706", background: "#fffbeb", color: "#92400e" }
                            : { borderColor: "#d1d5db", background: "#f9fafb", color: "#374151" }}
                        >
                          <span className="text-lg">⚡</span>
                          <span className="text-xs font-bold">سريع</span>
                          <span className="text-[10px]" style={{ color: "#6b7280" }}>طلب واحد فوري</span>
                        </button>
                      </div>
                      {tripForm.tripType === "express" && (
                        <p className="text-xs mt-1.5 text-center" style={{ color: "#d97706" }}>⚡ ستظهر بطاقتك فوراً للعملاء بدون توقيت محدد</p>
                      )}
                    </div>
                    {/* من مدينة - تلقائياً من GPS */}
                    <div>
                      <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>موقعي الحالي (مدينة الانطلاق) *</Label>
                      <div className="mt-1 space-y-2">
                        {tripForm.fromCityName ? (
                          <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ background: "rgba(22,163,74,0.15)", borderColor: "rgba(134,239,172,0.4)" }}>
                            <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "#16a34a" }} />
                            <span className="text-sm font-semibold flex-1" style={{ color: "#4ade80" }}>{tripForm.fromCityName}</span>
                            <button
                              type="button"
                              onClick={() => setTripForm(f => ({ ...f, fromCityName: "", fromLat: null, fromLng: null }))}
                              className="text-xs px-2 py-1 rounded-lg"
                              style={{ background: "#dcfce7", color: "#15803d" }}
                            >تغيير</button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={fetchDriverLocation}
                            disabled={fetchingLocation}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-semibold transition-colors"
                            style={{ borderColor: "#7c3aed", color: "#a78bfa", background: "rgba(124,58,237,0.1)" }}
                          >
                            {fetchingLocation ? (
                              <><Loader2 className="w-4 h-4 animate-spin" />جاري تحديد موقعك...</>
                            ) : (
                              <><Navigation className="w-4 h-4" />اضغط لتحديد موقعك تلقائياً</>
                            )}
                          </button>
                        )}
                        {!tripForm.fromCityName && !fetchingLocation && (
                          <p className="text-xs text-red-400">يجب تحديد موقعك الحالي</p>
                        )}
                      </div>
                    </div>

                    {/* إلى مدينة - اختيار من المناطق المحفوظة */}
                    <div>
                      <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>منطقة التوصيل *</Label>
                      <p className="text-xs mt-0.5 mb-2" style={{ color: "#a78bfa" }}>اختر من مناطقك المحفوظة — أضف مناطق جديدة من الإعدادات</p>

                      {/* المنطقة المختارة */}
                      {savedPolygon && tripForm.toCityName && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl mb-2" style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(167,139,250,0.5)" }}>
                          <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "#7c3aed" }} />
                          <span className="text-sm font-semibold flex-1" style={{ color: "#c4b5fd" }}>{tripForm.toCityName}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#7c3aed", color: "white" }}>✓ محددة</span>
                          <button type="button"
                            onClick={() => { setSavedPolygon(null); setTripForm(f => ({ ...f, toCityName: "", toCityLat: null, toCityLng: null })); }}
                            className="p-1 rounded-lg hover:bg-red-100"
                            style={{ color: "#ef4444" }}
                          ><X className="w-3.5 h-3.5" /></button>
                        </div>
                      )}

                      {/* بحث */}
                      <div className="relative mb-2">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#9ca3af" }} />
                        <input
                          type="text"
                          value={savedPolygonSearch}
                          onChange={e => setSavedPolygonSearch(e.target.value)}
                          placeholder="ابحث في مناطقك المحفوظة..."
                          className="w-full rounded-xl border px-3 py-2.5 pr-9 text-sm outline-none"
                          style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(167,139,250,0.3)", color: "#f0eeff", direction: "rtl" }}
                        />
                      </div>

                      {/* قائمة المناطق - تظهر فقط عند الكتابة */}
                      {savedPolygonSearch.trim().length === 0 ? (
                        (cityPolygonsList ?? []).length === 0 ? (
                          <div className="text-center py-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(167,139,250,0.3)" }}>
                            <p className="text-sm font-semibold" style={{ color: "#a78bfa" }}>لا توجد مناطق محفوظة</p>
                            <p className="text-xs mt-1" style={{ color: "#7c6fa0" }}>اذهب إلى الإعدادات ← مناطقي المحفوظة ← إضافة منطقة</p>
                          </div>
                        ) : (
                          <p className="text-xs text-center py-2" style={{ color: "#7c6fa0" }}>ابدأ الكتابة للبحث في {(cityPolygonsList ?? []).length} منطقة محفوظة</p>
                        )
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                          {(cityPolygonsList ?? [])
                            .filter((z: any) => z.cityName.toLowerCase().includes(savedPolygonSearch.toLowerCase()))
                            .map((z: any) => (
                              <button key={z.id} type="button"
                                onClick={() => {
                                  setSavedPolygon(z.polygon as Array<[number, number]>);
                                  setTripForm(f => ({ ...f, toCityName: z.cityName }));
                                  incrementPolygonUsageMutation.mutate({ id: z.id });
                                  setSavedPolygonSearch("");
                                }}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-right transition-all"
                                style={{
                                  background: savedPolygon && tripForm.toCityName === z.cityName ? "#ede9fe" : "#f9fafb",
                                  border: "1px solid " + (savedPolygon && tripForm.toCityName === z.cityName ? "#c4b5fd" : "#e5e7eb"),
                                  color: "#111827"
                                }}
                              >
                                <span className="text-base">📍</span>
                                <div className="flex-1 text-right">
                                  <p className="text-sm font-semibold">{z.cityName}</p>
                                  <p className="text-xs" style={{ color: "#7c6fa0" }}>{(z.polygon as any[]).length} نقطة • استُخدمت {z.usageCount} مرة</p>
                                </div>
                                {savedPolygon && tripForm.toCityName === z.cityName && (
                                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#7c3aed", color: "white" }}>✓</span>
                                )}
                              </button>
                            ))}
                          {(cityPolygonsList ?? []).filter((z: any) => z.cityName.toLowerCase().includes(savedPolygonSearch.toLowerCase())).length === 0 && (
                            <p className="text-xs text-center py-3" style={{ color: "#7c6fa0" }}>لا توجد نتائج لـ "{savedPolygonSearch}"</p>
                          )}
                        </div>
                      )}

                      {!savedPolygon && <p className="text-xs text-red-400 mt-1">يجب اختيار منطقة التوصيل</p>}
                    </div>
                    {tripForm.tripType === "group" && (
                      <>
                        <div>
                          <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>وقت المغادرة *</Label>
                          <Input
                            type="datetime-local"
                            value={tripForm.departureTime}
                            min={new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16)}
                            onChange={(e) => {
                              const val = e.target.value;
                              const now = new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16);
                              if (val < now) return;
                              setTripForm(f => ({ ...f, departureTime: val }));
                            }}
                            className="rounded-xl mt-1"
                            style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(167,139,250,0.3)", color: "#f0eeff" }}
                          />
                          {tripForm.departureTime && new Date(tripForm.departureTime) < new Date() && (
                            <p className="text-xs text-red-400 mt-1">لا يمكن اختيار وقت في الماضي</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>وقت الوصول المتوقع *</Label>
                          <Input
                            type="datetime-local"
                            value={tripForm.estimatedArrivalTime}
                            min={tripForm.departureTime || new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16)}
                            onChange={(e) => {
                              const val = e.target.value;
                              const minTime = tripForm.departureTime || new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16);
                              if (val < minTime) return;
                              setTripForm(f => ({ ...f, estimatedArrivalTime: val }));
                            }}
                            className="rounded-xl mt-1"
                            style={{ background: "rgba(255,255,255,0.07)", borderColor: !tripForm.estimatedArrivalTime ? "#ef4444" : "rgba(167,139,250,0.3)", color: "#f0eeff" }}
                          />
                          {!tripForm.estimatedArrivalTime && (
                            <p className="text-xs text-red-400 mt-1">مطلوب تحديد وقت الوصول</p>
                          )}
                          {tripForm.estimatedArrivalTime && tripForm.departureTime && tripForm.estimatedArrivalTime < tripForm.departureTime && (
                            <p className="text-xs text-red-400 mt-1">يجب أن يكون وقت الوصول بعد وقت المغادرة</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>آخر موعد لقبول الحجوزات (اختياري)</Label>
                          <Input
                            type="datetime-local"
                            value={tripForm.bookingDeadline}
                            onChange={(e) => setTripForm(f => ({ ...f, bookingDeadline: e.target.value }))}
                            className="rounded-xl mt-1"
                            style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(167,139,250,0.3)", color: "#f0eeff" }}
                          />
                          <p className="text-xs mt-1" style={{ color: "#7c6fa0" }}>إذا تركته فارغاً سيغلق الحجز تلقائياً عند المغادرة</p>
                        </div>
                      </>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>الحد الأقصى للحجوزات</Label>
                        <Input
                          type="number"
                          value={tripForm.maxBookings}
                          onChange={(e) => setTripForm(f => ({ ...f, maxBookings: Number(e.target.value) }))}
                          min={1} max={100}
                          className="rounded-xl mt-1"
                          style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(167,139,250,0.3)", color: "#f0eeff" }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>رسوم التوصيل (ر.س) *</Label>
                        <Input
                          type="number"
                          value={tripForm.deliveryFee}
                          onChange={(e) => setTripForm(f => ({ ...f, deliveryFee: e.target.value }))}
                          placeholder="أدخل السعر"
                          min={1}
                          className="rounded-xl mt-1"
                          style={{ background: "rgba(255,255,255,0.07)", borderColor: !tripForm.deliveryFee || Number(tripForm.deliveryFee) <= 0 ? "#ef4444" : "rgba(167,139,250,0.3)", color: "#f0eeff" }}
                        />
                        {(!tripForm.deliveryFee || Number(tripForm.deliveryFee) <= 0) && (
                          <p className="text-xs text-red-400 mt-1">مطلوب تحديد سعر التوصيل</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>ملاحظات</Label>
                      <Input
                        value={tripForm.notes}
                        onChange={(e) => setTripForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="أي تعليمات للعملاء..."
                        className="rounded-xl mt-1"
                        style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(167,139,250,0.3)", color: "#f0eeff" }}
                      />
                    </div>
                    <Button
                      className="w-full rounded-2xl h-12 font-bold"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "#fff" }}
                      disabled={
                        !tripForm.fromCityName.trim() ||
                        (!tripForm.toCityLat && !savedPolygon) ||
                        !tripForm.toCityName.trim() ||
                        !tripForm.deliveryFee || Number(tripForm.deliveryFee) <= 0 ||
                        (tripForm.tripType === "group" && (!tripForm.departureTime || !tripForm.estimatedArrivalTime)) ||
                        createTripMutation.isPending
                      }
                      onClick={() => setShowTripReview(true)}
                    >
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                      مراجعة وتأكيد الرحلة
                    </Button>

                    {/* ─── نافذة مراجعة وتأكيد الرحلة ─── */}
                    {showTripReview && (
                      <div className="fixed inset-0 z-[300] flex items-end" style={{ background: "rgba(0,0,0,0.75)" }}>
                        <div className="w-full rounded-t-3xl overflow-y-auto" style={{ background: "#0f0c2e", maxHeight: "85vh" }}>
                          {/* هيدر */}
                          <div className="px-5 pt-5 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(167,139,250,0.3)", background: "rgba(124,58,237,0.2)" }}>
                            <div>
                              <h3 className="font-bold text-base" style={{ color: "#111827" }}>مراجعة تفاصيل الرحلة</h3>
                              <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>تحقق من المعلومات قبل التأكيد</p>
                            </div>
                            <button onClick={() => setShowTripReview(false)}>
                              <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                          </div>

                          <div className="px-5 py-4 space-y-3">
                            {/* نوع الرحلة */}
                            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: tripForm.tripType === "express" ? "#fffbeb" : "#f5f3ff", border: `1px solid ${tripForm.tripType === "express" ? "#fde68a" : "#ddd6fe"}` }}>
                              <span className="text-xs font-bold" style={{ color: "#6b7280" }}>نوع التوصيل</span>
                              <span className="text-sm font-bold" style={{ color: tripForm.tripType === "express" ? "#92400e" : "#5b21b6" }}>
                                {tripForm.tripType === "express" ? "⚡ سريع — طلب واحد فوري" : "🚚 جماعي — عدة طلبات"}
                              </span>
                            </div>

                            {/* مدينة الانطلاق */}
                            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(22,163,74,0.15)", border: "1px solid rgba(134,239,172,0.3)" }}>
                              <span className="text-xs font-bold" style={{ color: "#6b7280" }}>مدينة الانطلاق</span>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" style={{ color: "#16a34a" }} />
                                <span className="text-sm font-bold" style={{ color: "#4ade80" }}>{tripForm.fromCityName}</span>
                              </div>
                            </div>

                            {/* مدينة التوصيل */}
                            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#faf5ff", border: "1px solid #ddd6fe" }}>
                              <span className="text-xs font-bold" style={{ color: "#6b7280" }}>مدينة التوصيل</span>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" style={{ color: "#7c3aed" }} />
                                <span className="text-sm font-bold" style={{ color: "#c4b5fd" }}>{tripForm.toCityName}</span>

                              </div>
                            </div>

                            {/* الوقت — للرحلات الجماعية فقط */}
                            {tripForm.tripType === "group" && (
                              <>
                                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(147,197,253,0.3)" }}>
                                  <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>وقت المغادرة</span>
                                  <span className="text-sm font-bold" style={{ color: "#93c5fd" }}>
                                    {tripForm.departureTime ? new Date(tripForm.departureTime).toLocaleString("ar-SA", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(147,197,253,0.3)" }}>
                                  <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>وقت الوصول المتوقع</span>
                                  <span className="text-sm font-bold" style={{ color: "#93c5fd" }}>
                                    {tripForm.estimatedArrivalTime ? new Date(tripForm.estimatedArrivalTime).toLocaleString("ar-SA", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                                  </span>
                                </div>
                                {tripForm.bookingDeadline && (
                                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(217,119,6,0.15)", border: "1px solid rgba(253,211,77,0.3)" }}>
                                    <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>آخر موعد للحجز</span>
                                    <span className="text-sm font-bold" style={{ color: "#fbbf24" }}>
                                      {new Date(tripForm.bookingDeadline).toLocaleString("ar-SA", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                            {tripForm.tripType === "express" && (
                              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(217,119,6,0.15)", border: "1px solid rgba(253,211,77,0.3)" }}>
                                <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>وقت المغادرة</span>
                                <span className="text-sm font-bold" style={{ color: "#fbbf24" }}>فوري — الآن</span>
                              </div>
                            )}

                            {/* الحد الأقصى للحجوزات */}
                            {tripForm.tripType === "group" && (
                              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                                <span className="text-xs font-bold" style={{ color: "#6b7280" }}>الحد الأقصى للحجوزات</span>
                                <span className="text-sm font-bold" style={{ color: "#111827" }}>{tripForm.maxBookings} حجز</span>
                              </div>
                            )}

                            {/* رسوم التوصيل */}
                            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(22,163,74,0.15)", border: "1px solid rgba(134,239,172,0.3)" }}>
                              <span className="text-xs font-bold" style={{ color: "#6b7280" }}>رسوم التوصيل</span>
                              <span className="text-lg font-extrabold" style={{ color: "#15803d" }}>{tripForm.deliveryFee} ر.س</span>
                            </div>

                            {/* الملاحظات */}
                            {tripForm.notes && (
                              <div className="p-3 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                                <span className="text-xs font-bold block mb-1" style={{ color: "#6b7280" }}>ملاحظات</span>
                                <span className="text-sm" style={{ color: "#374151" }}>{tripForm.notes}</span>
                              </div>
                            )}

                            {/* تنبيه */}
                            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "#fef3c7", border: "1px solid #fde68a" }}>
                              <span className="text-base mt-0.5">⚠️</span>
                              <p className="text-xs" style={{ color: "#92400e" }}>بعد التأكيد ستظهر رحلتك للعملاء مباشرة. تأكد من صحة جميع المعلومات.</p>
                            </div>

                            {/* تحذير إذا كان وقت المغادرة في الماضي */}
                            {tripForm.tripType === "group" && tripForm.departureTime && new Date(tripForm.departureTime) <= new Date() && (
                              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "#fef2f2", border: "2px solid #fca5a5" }}>
                                <span className="text-base mt-0.5">❌</span>
                                <div>
                                  <p className="text-xs font-bold" style={{ color: "#dc2626" }}>وقت المغادرة قد مضى!</p>
                                  <p className="text-xs mt-0.5" style={{ color: "#7f1d1d" }}>اضغط "تعديل" وحدد وقتاً في المستقبل</p>
                                </div>
                              </div>
                            )}

                            {/* أزرار التأكيد والتعديل */}
                            <div className="flex gap-3 pt-1 pb-2">
                              <button
                                type="button"
                                onClick={() => setShowTripReview(false)}
                                className="flex-1 py-3 rounded-2xl border-2 font-bold text-sm"
                                style={{ borderColor: "#d1d5db", color: "#374151", background: "#f9fafb" }}
                              >
                                تعديل
                              </button>
                              <button
                                type="button"
                                disabled={createTripMutation.isPending || (tripForm.tripType === "group" && !!tripForm.departureTime && new Date(tripForm.departureTime) <= new Date())}
                                onClick={() => {
                                  // تحقق نهائي قبل الإرسال
                                  if (tripForm.tripType === "group") {
                                    if (!tripForm.fromCityName?.trim()) { toast.error("يجب تحديد مدينة الانطلاق"); return; }
                                    if (!tripForm.toCityName?.trim()) { toast.error("يجب تحديد مدينة التوصيل"); return; }
                                    if (!tripForm.departureTime) { toast.error("يجب تحديد وقت المغادرة"); return; }
                                    if (!tripForm.estimatedArrivalTime) { toast.error("يجب تحديد وقت الوصول المتوقع"); return; }
                                    if (!tripForm.deliveryFee || Number(tripForm.deliveryFee) <= 0) { toast.error("يجب تحديد رسوم التوصيل"); return; }
                                    const depCheck = new Date(tripForm.departureTime);
                                    if (depCheck <= new Date()) { toast.error("وقت المغادرة يجب أن يكون في المستقبل"); return; }
                                    const arrCheck = new Date(tripForm.estimatedArrivalTime);
                                    if (arrCheck <= depCheck) { toast.error("وقت الوصول يجب أن يكون بعد وقت المغادرة"); return; }
                                  }
                                  const now = new Date();
                                  const depTime = tripForm.tripType === "express" ? now : new Date(tripForm.departureTime);
                                  const arrTime = tripForm.estimatedArrivalTime
                                    ? new Date(tripForm.estimatedArrivalTime)
                                    : new Date(depTime.getTime() + 2 * 60 * 60 * 1000);
                                  createTripMutation.mutate({
                                    fromCityId: 0,
                                    fromCityName: tripForm.fromCityName.trim(),
                                    fromLat: tripForm.fromLat ?? undefined,
                                    fromLng: tripForm.fromLng ?? undefined,
                                    toCityId: 0,
                                    toCityName: tripForm.toCityName.trim(),
                                    toCityLat: tripForm.toCityLat ?? undefined,
                                    toCityLng: tripForm.toCityLng ?? undefined,
                                    toCityRadiusKm: Number(tripForm.toCityRadiusKm) || 10,
                                    departureTime: depTime.toISOString(),
                                    estimatedArrivalTime: arrTime.toISOString(),
                                    bookingDeadline: tripForm.bookingDeadline ? new Date(tripForm.bookingDeadline).toISOString() : undefined,
                                    maxBookings: tripForm.tripType === "express" ? 1 : tripForm.maxBookings,
                                    deliveryFee: Number(tripForm.deliveryFee) || 0,
                                    notes: tripForm.notes || undefined,
                                    tripType: tripForm.tripType as "group" | "express",
                                    coveragePolygon: savedPolygon ? JSON.stringify(savedPolygon) : undefined,
                                  });
                                }}
                                className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "#fff" }}
                              >
                                {createTripMutation.isPending ? (
                                  <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإنشاء...</>
                                ) : (
                                  <><CheckCircle2 className="w-4 h-4" /> تأكيد وتشغيل الرحلة</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* نافذة تأكيد الصورة قبل الإرسال */}
      {confirmPhotoState && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.88)" }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#ffffff" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: confirmPhotoState.type === "delivery" ? "#fff7ed" : "#eff6ff", borderBottom: "2px solid " + (confirmPhotoState.type === "delivery" ? "#fed7aa" : "#bfdbfe") }}>
              <div className="text-2xl">{confirmPhotoState.type === "delivery" ? "📦" : "🛒"}</div>
              <div>
                <div className="text-sm font-bold" style={{ color: confirmPhotoState.type === "delivery" ? "#9a3412" : "#1e40af" }}>
                  {confirmPhotoState.type === "delivery" ? "تأكيد صورة التسليم" : "تأكيد صورة الاستلام"}
                </div>
                <div className="text-xs" style={{ color: "#6b7280" }}>هل أنت متأكد من إرسال هذه الصورة؟</div>
              </div>
            </div>
            <div className="p-3">
              <img src={confirmPhotoState.preview} alt="معاينة الصورة" className="w-full rounded-xl object-cover" style={{ maxHeight: "280px", border: "2px solid #e5e7eb" }} />
              <div className="mt-2 rounded-lg p-2" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                <div className="text-xs font-bold" style={{ color: "#374151" }}>
                  {confirmPhotoState.type === "delivery" ? "✅ سيتم إرسال صورة التسليم للعميل وإغلاق الطلب" : "✅ سيتم تسجيل استلام الطلب من المتجر"}
                </div>
              </div>
            </div>
            <div className="px-3 pb-4 grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmPhotoState(null)} className="rounded-xl h-12 font-bold text-sm border-2" style={{ borderColor: "#d1d5db", background: "#f9fafb", color: "#374151" }}>
                📷 إعادة التصوير
              </button>
              <button onClick={handleConfirmSend} className="rounded-xl h-12 font-bold text-sm text-white" style={{ background: confirmPhotoState.type === "delivery" ? "#16a34a" : "#2563eb" }}>
                ✅ نعم، إرسال
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog حفظ المنطقة المرسومة */}
      {showSavePolygonDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl" dir="rtl">
            <h3 className="text-lg font-bold mb-1" style={{ color: "#1e293b" }}>💾 احفظ هذه المنطقة</h3>
            <p className="text-xs mb-4" style={{ color: "#64748b" }}>احفظ المنطقة المرسومة لاستخدامها مستقبلاً بسرعة دون إعادة الرسم</p>
            <input
              type="text"
              value={savePolygonName}
              onChange={e => setSavePolygonName(e.target.value)}
              placeholder="اسم المنطقة (مثال: عنيزة، حي النزهة)"
              className="w-full border rounded-xl px-3 py-2.5 text-right mb-4 text-sm"
              style={{ borderColor: "#cbd5e1", outline: "none" }}
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter" && savePolygonName.trim()) {
                  (async () => {
                    if (pendingSavePolygon) {
                      try {
                        await saveCityPolygonMutation.mutateAsync({ cityName: savePolygonName.trim(), polygon: pendingSavePolygon });
                        toast.success(`تم حفظ منطقة "${savePolygonName}" بنجاح`);
                      } catch {}
                    }
                    setShowSavePolygonDialog(false);
                  })();
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (savePolygonName.trim() && pendingSavePolygon) {
                    try {
                      await saveCityPolygonMutation.mutateAsync({ cityName: savePolygonName.trim(), polygon: pendingSavePolygon });
                      toast.success(`تم حفظ منطقة "${savePolygonName}" بنجاح`);
                    } catch {}
                  }
                  setShowSavePolygonDialog(false);
                }}
                disabled={!savePolygonName.trim()}
                className="flex-1 rounded-xl py-2.5 font-bold text-sm text-white transition-opacity"
                style={{ background: savePolygonName.trim() ? "#16a34a" : "#86efac", cursor: savePolygonName.trim() ? "pointer" : "not-allowed" }}
              >💾 حفظ</button>
              <button
                onClick={() => setShowSavePolygonDialog(false)}
                className="flex-1 rounded-xl py-2.5 font-bold text-sm"
                style={{ background: "#f1f5f9", color: "#475569" }}
              >تخطي</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== SHOPPER BOOKINGS TAB =====
function ShopperBookingsTab({ phoneUser, initialTripId, onTripSelected }: { phoneUser: any; initialTripId?: number | null; onTripSelected?: (id: number | null) => void }) {
  const utils = trpc.useUtils();
  const [selectedTripId, setSelectedTripId] = useState<number | null>(initialTripId ?? null);
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);

  // عند تغيير initialTripId من الخارج نحدّث selectedTripId
  useEffect(() => {
    if (initialTripId != null) {
      setSelectedTripId(initialTripId);
    }
  }, [initialTripId]);

  // عند تغيير selectedTripId نخبر الأب
  const handleSetSelectedTripId = (id: number | null) => {
    setSelectedTripId(id);
    onTripSelected?.(id);
  };

  const { data: myTrips, isLoading: tripsLoading, refetch: refetchTrips } = trpc.shopper.getMyTrips.useQuery(
    { includeCompleted: false },
    { enabled: !!phoneUser, refetchInterval: 10000 }
  );
  const { data: selectedTripBookings, isLoading: selectedBookingsLoading, refetch: refetchSelectedBookings } = trpc.shopper.getTripBookings.useQuery(
    { tripId: selectedTripId ?? 0 },
    { enabled: !!selectedTripId, refetchInterval: 8000 }
  );

  const acceptBookingMutation = trpc.shopper.acceptBooking.useMutation({
    onSuccess: () => {
      refetchSelectedBookings();
      refetchTrips();
      utils.shopper.getMyTrips.invalidate();
      toast.success("✅ تم قبول الحجز");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const rejectBookingMutation = trpc.shopper.rejectBooking.useMutation({
    onSuccess: () => {
      refetchSelectedBookings();
      refetchTrips();
      utils.shopper.getMyTrips.invalidate();
      toast.info("❌ تم رفض الحجز");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const acceptAllMutation = trpc.shopper.acceptAllPendingBookings.useMutation({
    onSuccess: () => {
      refetchSelectedBookings();
      refetchTrips();
      utils.shopper.getMyTrips.invalidate();
      toast.success("✅ تم قبول جميع الحجوزات");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const updateBookingStatusMutation = trpc.shopper.updateBookingStatus.useMutation({
    onSuccess: () => {
      refetchSelectedBookings();
      refetchTrips();
      utils.shopper.getMyTrips.invalidate();
      toast.success("تم تحديث حالة الحجز");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stLabel: Record<string, { label: string; bg: string; color: string; icon: string }> = {
    pending:   { label: "بانتظار القبول", bg: "rgba(217,119,6,0.18)",  color: "#fbbf24", icon: "⏳" },
    accepted:  { label: "مقبول",          bg: "rgba(37,99,235,0.18)",  color: "#60a5fa", icon: "✅" },
    picked_up: { label: "تم الاستلام",    bg: "rgba(124,58,237,0.18)", color: "#a78bfa", icon: "📦" },
    delivered: { label: "تم التسليم",     bg: "rgba(22,163,74,0.18)",  color: "#4ade80", icon: "🏁" },
    cancelled: { label: "ملغي",           bg: "rgba(220,38,38,0.18)",  color: "#f87171", icon: "🚫" },
    rejected:  { label: "مرفوض",          bg: "rgba(239,68,68,0.18)",  color: "#f87171", icon: "❌" },
  };

  const buildMapsUrl = (lat?: number | null, lng?: number | null, text?: string | null) => {
    if (lat && lng) return `https://www.google.com/maps?q=${lat.toFixed(7)},${lng.toFixed(7)}`;
    if (text) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
    return null;
  };

  const pendingBookings = (selectedTripBookings as any[] ?? []).filter((b: any) => b.booking.status === "pending");
  const activeBookings  = (selectedTripBookings as any[] ?? []).filter((b: any) => ["accepted","picked_up"].includes(b.booking.status));
  const doneBookings    = (selectedTripBookings as any[] ?? []).filter((b: any) => ["delivered","cancelled","rejected"].includes(b.booking.status));

  if (!phoneUser) return (
    <div dir="rtl" className="flex flex-col items-center justify-center py-20 px-6">
      <Package className="w-12 h-12 mb-3" style={{color:'#6b7280'}} />
      <p className="text-sm text-center" style={{color:'#9ca3af'}}>سجّل دخولك لعرض حجوزاتك</p>
    </div>
  );

  return (
    <div dir="rtl" className="pb-24 px-4 pt-4 space-y-4">
      {/* ─── اختيار الرحلة ─── */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(124,58,237,0.12)", border: "1.5px solid rgba(167,139,250,0.3)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Store className="w-4 h-4" style={{color:'#a78bfa'}} />
          <span className="text-sm font-bold" style={{color:'#f0eeff'}}>اختر رحلة لإدارة حجوزاتها</span>
        </div>
        {tripsLoading ? (
          <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin" style={{color:'#a78bfa'}} /></div>
        ) : (myTrips as any[] ?? []).length === 0 ? (
          <div className="text-center py-4">
            <Package className="w-8 h-8 mx-auto mb-2" style={{color:'#6b7280'}} />
            <p className="text-xs" style={{color:'#9ca3af'}}>لا توجد رحلات نشطة — أنشئ رحلة من تبويب "رحلاتي"</p>
          </div>
        ) : (
          <Select value={selectedTripId?.toString() ?? ""} onValueChange={(v) => handleSetSelectedTripId(Number(v))}>
            <SelectTrigger className="rounded-xl" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(167,139,250,0.5)", color: '#f0eeff' }}>
              <SelectValue placeholder="اختر رحلة..." />
            </SelectTrigger>
            <SelectContent>
              {(myTrips as any[] ?? []).map((t: any) => {
                const pending = t.pendingBookingsCount ?? 0;
                return (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.fromCityName} → {t.toCityName}
                    {pending > 0 ? ` 🔴 (${pending} بانتظار)` : ""}
                    {" — "}{new Date(t.departureTime).toLocaleDateString("ar-SA", { weekday:"short", month:"short", day:"numeric" })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ─── محتوى الرحلة المختارة ─── */}
      {selectedTripId && (
        <>
          {selectedBookingsLoading && (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{color:'#a78bfa'}} /></div>
          )}

          {!selectedBookingsLoading && (selectedTripBookings as any[] ?? []).length === 0 && (
            <div className="text-center py-12 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.15)" }}>
              <Package className="w-12 h-12 mx-auto mb-3" style={{color:'#4b5563'}} />
              <p className="font-bold text-sm" style={{color:'#9ca3af'}}>لا توجد حجوزات لهذه الرحلة بعد</p>
              <p className="text-xs mt-1" style={{color:'#6b7280'}}>ستظهر حجوزات العملاء هنا عند وصولها</p>
            </div>
          )}

          {/* ─── حجوزات بانتظار القبول ─── */}
          {pendingBookings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-sm font-bold" style={{color:'#fbbf24'}}>بانتظار القبول ({pendingBookings.length})</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptAllMutation.mutate({ tripId: selectedTripId! })}
                    disabled={acceptAllMutation.isPending}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{ background: "#16a34a", color: "#fff" }}>
                    {acceptAllMutation.isPending ? "..." : "✅ قبول الكل"}
                  </button>
                  <button
                    onClick={() => pendingBookings.forEach((b: any) => rejectBookingMutation.mutate({ bookingId: b.booking.id }))}
                    disabled={rejectBookingMutation.isPending}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{ background: "#dc2626", color: "#fff" }}>
                    {rejectBookingMutation.isPending ? "..." : "❌ رفض الكل"}
                  </button>
                </div>
              </div>
              {pendingBookings.map((item: any) => {
                const bk = item.booking; const cu = item.customer;
                const pLat = bk.pickupLocationLat ? parseFloat(String(bk.pickupLocationLat)) : null;
                const pLng = bk.pickupLocationLng ? parseFloat(String(bk.pickupLocationLng)) : null;
                const dLat = bk.deliveryLocationLat ? parseFloat(String(bk.deliveryLocationLat)) : null;
                const dLng = bk.deliveryLocationLng ? parseFloat(String(bk.deliveryLocationLng)) : null;
                const pickupUrl = buildMapsUrl(pLat, pLng, bk.pickupLocationText);
                const deliveryUrl = buildMapsUrl(dLat, dLng, bk.deliveryLocationText);
                const isExpanded = expandedBookingId === bk.id;
                return (
                  <div key={bk.id} className="rounded-2xl overflow-hidden" style={{ background: "rgba(217,119,6,0.08)", border: "2px solid rgba(251,191,36,0.4)" }}>
                    {/* رأس البطاقة */}
                    <div className="px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedBookingId(isExpanded ? null : bk.id)}
                      style={{ background: "rgba(217,119,6,0.15)", borderBottom: "1px solid rgba(251,191,36,0.2)" }}>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ background: "#7c3aed" }}>{cu?.name?.charAt(0) || "؟"}</div>
                        <div>
                          <div className="text-sm font-bold" style={{color:'#f0eeff'}}>{cu?.name || "عميل"}</div>
                          {cu?.phone && (
                            <a href={`tel:${cu.phone}`} className="text-xs flex items-center gap-1" style={{color:'#60a5fa'}} onClick={e => e.stopPropagation()}>
                              <Phone className="w-3 h-3" />{cu.phone}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {bk.deliveryFee && <span className="text-sm font-black" style={{color:'#4ade80'}}>{bk.deliveryFee} ر.س</span>}
                        <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>⏳ بانتظار</span>
                        <ChevronDown className="w-4 h-4 transition-transform" style={{color:'#9ca3af', transform: isExpanded ? 'rotate(180deg)' : 'none'}} />
                      </div>
                    </div>
                    {/* تفاصيل موسعة */}
                    {isExpanded && (
                      <div className="px-4 py-3 space-y-3">
                        {/* موقع الاستلام */}
                        {(bk.pickupLocationText || pickupUrl) && (
                          <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
                            <p className="text-xs font-bold" style={{color:'#4ade80'}}>📍 موقع الاستلام</p>
                            {bk.pickupLocationText && <p className="text-xs" style={{color:'#e9d5ff'}}>{bk.pickupLocationText}</p>}
                            {pickupUrl && (
                              <a href={pickupUrl} target="_blank" rel="noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-bold"
                                style={{ background: "#ea4335", color: "#fff" }}>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                افتح في خرائط Google
                              </a>
                            )}
                          </div>
                        )}
                        {/* موقع التسليم */}
                        {(bk.deliveryLocationText || deliveryUrl) && (
                          <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
                            <p className="text-xs font-bold" style={{color:'#f87171'}}>🏠 موقع التسليم</p>
                            {bk.deliveryLocationText && <p className="text-xs" style={{color:'#e9d5ff'}}>{bk.deliveryLocationText}</p>}
                            {deliveryUrl && (
                              <a href={deliveryUrl} target="_blank" rel="noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-bold"
                                style={{ background: "#ea4335", color: "#fff" }}>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                افتح في خرائط Google
                              </a>
                            )}
                          </div>
                        )}
                        {/* ملاحظات */}
                        {bk.notes && (
                          <div className="rounded-xl p-3" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}>
                            <p className="text-xs font-bold mb-1" style={{color:'#c4b5fd'}}>📝 ملاحظات العميل</p>
                            <p className="text-xs italic" style={{color:'#e9d5ff'}}>"{bk.notes}"</p>
                          </div>
                        )}
                        {/* واتساب */}
                        {cu?.phone && (
                          <a href={`https://wa.me/${cu.phone.replace(/^0/, '966')}`} target="_blank" rel="noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold"
                            style={{ background: "#16a34a", color: "#fff" }}>
                            <MessageCircle className="w-4 h-4" />تواصل عبر واتساب
                          </a>
                        )}
                      </div>
                    )}
                    {/* أزرار القبول/الرفض */}
                    <div className="px-4 pb-4 flex gap-3">
                      <button
                        onClick={() => acceptBookingMutation.mutate({ bookingId: bk.id })}
                        disabled={acceptBookingMutation.isPending}
                        className="flex-1 py-3 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", boxShadow: "0 4px 12px rgba(22,163,74,0.4)" }}>
                        {acceptBookingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "✅ قبول"}
                      </button>
                      <button
                        onClick={() => rejectBookingMutation.mutate({ bookingId: bk.id })}
                        disabled={rejectBookingMutation.isPending}
                        className="flex-1 py-3 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "#fff", boxShadow: "0 4px 12px rgba(220,38,38,0.4)" }}>
                        {rejectBookingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "❌ رفض"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── حجوزات نشطة ─── */}
          {activeBookings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-sm font-bold" style={{color:'#60a5fa'}}>جارية ({activeBookings.length})</span>
              </div>
              {activeBookings.map((item: any) => {
                const bk = item.booking; const cu = item.customer;
                const st = stLabel[bk.status] ?? { label: bk.status, bg: "rgba(107,114,128,0.18)", color: "#9ca3af", icon: "📦" };
                const pLat = bk.pickupLocationLat ? parseFloat(String(bk.pickupLocationLat)) : null;
                const pLng = bk.pickupLocationLng ? parseFloat(String(bk.pickupLocationLng)) : null;
                const dLat = bk.deliveryLocationLat ? parseFloat(String(bk.deliveryLocationLat)) : null;
                const dLng = bk.deliveryLocationLng ? parseFloat(String(bk.deliveryLocationLng)) : null;
                const pickupUrl = buildMapsUrl(pLat, pLng, bk.pickupLocationText);
                const deliveryUrl = buildMapsUrl(dLat, dLng, bk.deliveryLocationText);
                const isExpanded = expandedBookingId === bk.id;
                return (
                  <div key={bk.id} className="rounded-2xl overflow-hidden" style={{ background: "rgba(37,99,235,0.08)", border: "1.5px solid rgba(96,165,250,0.3)" }}>
                    <div className="px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedBookingId(isExpanded ? null : bk.id)}
                      style={{ background: "rgba(37,99,235,0.15)", borderBottom: "1px solid rgba(96,165,250,0.2)" }}>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ background: "#7c3aed" }}>{cu?.name?.charAt(0) || "؟"}</div>
                        <div>
                          <div className="text-sm font-bold" style={{color:'#f0eeff'}}>{cu?.name || "عميل"}</div>
                          {cu?.phone && (
                            <a href={`tel:${cu.phone}`} className="text-xs flex items-center gap-1" style={{color:'#60a5fa'}} onClick={e => e.stopPropagation()}>
                              <Phone className="w-3 h-3" />{cu.phone}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {bk.deliveryFee && <span className="text-sm font-black" style={{color:'#4ade80'}}>{bk.deliveryFee} ر.س</span>}
                        <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                        <ChevronDown className="w-4 h-4 transition-transform" style={{color:'#9ca3af', transform: isExpanded ? 'rotate(180deg)' : 'none'}} />
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 py-3 space-y-3">
                        {(bk.pickupLocationText || pickupUrl) && (
                          <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
                            <p className="text-xs font-bold" style={{color:'#4ade80'}}>📍 موقع الاستلام</p>
                            {bk.pickupLocationText && <p className="text-xs" style={{color:'#e9d5ff'}}>{bk.pickupLocationText}</p>}
                            {pickupUrl && (
                              <a href={pickupUrl} target="_blank" rel="noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-bold"
                                style={{ background: "#ea4335", color: "#fff" }}>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                افتح في خرائط Google
                              </a>
                            )}
                          </div>
                        )}
                        {(bk.deliveryLocationText || deliveryUrl) && (
                          <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
                            <p className="text-xs font-bold" style={{color:'#f87171'}}>🏠 موقع التسليم</p>
                            {bk.deliveryLocationText && <p className="text-xs" style={{color:'#e9d5ff'}}>{bk.deliveryLocationText}</p>}
                            {deliveryUrl && (
                              <a href={deliveryUrl} target="_blank" rel="noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-bold"
                                style={{ background: "#ea4335", color: "#fff" }}>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                افتح في خرائط Google
                              </a>
                            )}
                          </div>
                        )}
                        {bk.notes && (
                          <div className="rounded-xl p-3" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}>
                            <p className="text-xs font-bold mb-1" style={{color:'#c4b5fd'}}>📝 ملاحظات</p>
                            <p className="text-xs italic" style={{color:'#e9d5ff'}}>"{bk.notes}"</p>
                          </div>
                        )}
                        {cu?.phone && (
                          <a href={`https://wa.me/${cu.phone.replace(/^0/, '966')}`} target="_blank" rel="noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold"
                            style={{ background: "#16a34a", color: "#fff" }}>
                            <MessageCircle className="w-4 h-4" />تواصل عبر واتساب
                          </a>
                        )}
                      </div>
                    )}
                    <div className="px-4 pb-4">
                      {bk.status === "accepted" && (
                        <button
                          onClick={() => updateBookingStatusMutation.mutate({ bookingId: bk.id, status: "picked_up" })}
                          disabled={updateBookingStatusMutation.isPending}
                          className="w-full py-3 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", boxShadow: "0 4px 12px rgba(37,99,235,0.4)" }}>
                          {updateBookingStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "📦 تم الاستلام من المتجر"}
                        </button>
                      )}
                      {bk.status === "picked_up" && (
                        <button
                          onClick={() => updateBookingStatusMutation.mutate({ bookingId: bk.id, status: "delivered" })}
                          disabled={updateBookingStatusMutation.isPending}
                          className="w-full py-3 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", boxShadow: "0 4px 12px rgba(22,163,74,0.4)" }}>
                          {updateBookingStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "✅ تم التسليم للعميل"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── حجوزات مكتملة/ملغاة ─── */}
          {doneBookings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-sm font-bold" style={{color:'#9ca3af'}}>مكتملة / ملغاة ({doneBookings.length})</span>
              </div>
              {doneBookings.map((item: any) => {
                const bk = item.booking; const cu = item.customer;
                const st = stLabel[bk.status] ?? { label: bk.status, bg: "rgba(107,114,128,0.18)", color: "#9ca3af", icon: "📦" };
                return (
                  <div key={bk.id} className="rounded-xl px-4 py-3 flex items-center justify-between opacity-70"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: "#4b5563" }}>{cu?.name?.charAt(0) || "؟"}</div>
                      <div>
                        <div className="text-xs font-bold" style={{color:'#d1d5db'}}>{cu?.name || "عميل"}</div>
                        {bk.deliveryFee && <div className="text-xs" style={{color:'#6b7280'}}>{bk.deliveryFee} ر.س</div>}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===== SHOPPER SETTINGS TAB =====
function ShopperSettingsTab({ phoneUser, driverCurrentCity = "", driverCurrentLat = null, driverCurrentLng = null }: { phoneUser: any; driverCurrentCity?: string; driverCurrentLat?: number | null; driverCurrentLng?: number | null }) {
  const utils = trpc.useUtils();

  const { data: settings, isLoading: settingsLoading } = trpc.shopper.getDriverSettings.useQuery(
    undefined, { enabled: !!phoneUser }
  );
  const { data: myPolygonsList } = trpc.cityPolygons.listMine.useQuery();

  const upsertSettingsMutation = trpc.shopper.saveDriverSettings.useMutation({
    onSuccess: () => { utils.shopper.getDriverSettings.invalidate(); toast.success("تم حفظ الإعدادات"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteCityPolygonMutation = trpc.cityPolygons.delete.useMutation({
    onSuccess: () => { utils.cityPolygons.list.invalidate(); utils.cityPolygons.listMine.invalidate(); },
  });
  const saveSettingsPolygonMutation = trpc.cityPolygons.save.useMutation({
    onSuccess: () => {
      utils.cityPolygons.list.invalidate(); utils.cityPolygons.listMine.invalidate();
      setShowSettingsDrawMap(false); setSettingsDrawnPolygon(null); setSettingsNewZoneName("");
      setSettingsDrawPoints([]); settingsDrawPointsRef.current = [];
      setIsSettingsDrawing(false); isSettingsDrawingRef.current = false;
      toast.success("تم حفظ المنطقة بنجاح");
    },
  });

  const [settingsForm, setSettingsForm] = useState({
    isActive: false,
    allowsFood: true,
    allowsCoffee: true,
    allowsGroceries: true,
    allowsPharmacy: false,
    allowsDocuments: false,
    allowsElectronics: false,
    allowsClothes: false,
    allowsOther: true,
    minBookingsToDepart: 3,
    maxBookingsPerTrip: 10,
    defaultDeliveryFee: 15,
    driverNote: "",
    customTerms: "",
    maxDeliveryKm: 50,
  });

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        isActive: (settings as any).isActive ?? false,
        allowsFood: (settings as any).allowsFood ?? true,
        allowsCoffee: (settings as any).allowsCoffee ?? true,
        allowsGroceries: (settings as any).allowsGroceries ?? true,
        allowsPharmacy: (settings as any).allowsPharmacy ?? false,
        allowsDocuments: (settings as any).allowsDocuments ?? false,
        allowsElectronics: (settings as any).allowsElectronics ?? false,
        allowsClothes: (settings as any).allowsClothes ?? false,
        allowsOther: (settings as any).allowsOther ?? true,
        minBookingsToDepart: (settings as any).minBookingsToDepart ?? 3,
        maxBookingsPerTrip: (settings as any).maxBookingsPerTrip ?? 10,
        defaultDeliveryFee: Number((settings as any).defaultDeliveryFee) || 15,
        driverNote: (settings as any).driverNote ?? "",
        customTerms: (settings as any).customTerms ?? "",
        maxDeliveryKm: Number((settings as any).maxDeliveryKm) || 50,
      });
    }
  }, [settings]);

  // حالة رسم المنطقة في تبويب الإعدادات
  const [showSettingsDrawMap, setShowSettingsDrawMap] = useState(false);
  const [settingsNewZoneName, setSettingsNewZoneName] = useState("");
  const [settingsDrawPoints, setSettingsDrawPoints] = useState<Array<{lat: number; lng: number}>>([]);
  const settingsDrawPointsRef = useRef<Array<{lat: number; lng: number}>>([]);
  const [isSettingsDrawing, setIsSettingsDrawing] = useState(false);
  const isSettingsDrawingRef = useRef(false);
  const settingsMapRef = useRef<any>(null);
  const settingsPolylineRef = useRef<any>(null);
  const settingsPolygonRef = useRef<any>(null);
  const settingsMarkersRef = useRef<any[]>([]);
  const [settingsDrawnPolygon, setSettingsDrawnPolygon] = useState<Array<[number, number]> | null>(null);
  const [settingsSearchText, setSettingsSearchText] = useState("");
  const [settingsSearchLoading, setSettingsSearchLoading] = useState(false);
  const [zoneListSearch, setZoneListSearch] = useState("");

  if (!phoneUser) return (
    <div dir="rtl" className="flex flex-col items-center justify-center py-20 px-6">
      <Settings className="w-12 h-12 text-muted-foreground mb-3" />
      <p className="text-muted-foreground text-sm text-center">سجّل دخولك لعرض الإعدادات</p>
    </div>
  );

  return (
    <div dir="rtl" className="driver-theme pb-24 px-4 pt-4 space-y-4" style={{background:'linear-gradient(160deg, #0a0820 0%, #0f0c2e 50%, #0a0820 100%)', minHeight: '100%'}}>
      <div className="flex items-center gap-2 mb-2">
        <Settings className="w-5 h-5" style={{color:'#a78bfa'}} />
        <h2 className="text-base font-bold" style={{color:'#f0eeff'}}>إعداداتي</h2>
      </div>

      {settingsLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-4">
          {/* تفعيل/إيقاف */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm" style={{color:'#f0eeff'}}>تفعيل توصيل شوبر</p>
                <p className="text-xs mt-0.5" style={{color:'#a78bfa'}}>ظهورك في قسم شوبر للعملاء</p>
              </div>
              <button
                onClick={() => setSettingsForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`w-12 h-6 rounded-full transition-all relative ${settingsForm.isActive ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${settingsForm.isActive ? "right-0.5" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          {/* أنواع ما يقبله */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
            <p className="font-bold text-sm" style={{color:'#f0eeff'}}>ما تقبل توصيله</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "allowsFood", label: "🍔 طعام" },
                { key: "allowsCoffee", label: "☕ قهوة وكافيه" },
                { key: "allowsGroceries", label: "🛒 بقالة" },
                { key: "allowsPharmacy", label: "💊 صيدلية" },
                { key: "allowsDocuments", label: "📄 وثائق" },
                { key: "allowsElectronics", label: "📱 إلكترونيات" },
                { key: "allowsClothes", label: "👕 ملابس" },
                { key: "allowsOther", label: "📦 أخرى" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSettingsForm(f => ({ ...f, [key]: !(f as any)[key] }))}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-right ${(settingsForm as any)[key] ? "bg-primary/20 border-primary text-primary" : "border-muted text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ما لا يقبله */}
          <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
            <p className="font-bold text-sm" style={{ color: "#f0eeff" }}>ما لا تقبل توصيله</p>
            <textarea
              value={settingsForm.customTerms}
              onChange={(e) => setSettingsForm(f => ({ ...f, customTerms: e.target.value }))}
              placeholder="مثال: لا أقبل الطلبات الثقيلة، لا أوصل للمناطق البعيدة..."
              className="w-full rounded-xl border p-3 text-xs resize-none"
              style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(167,139,250,0.4)", minHeight: "70px", color: "#f0eeff" }}
            />
          </div>

          {/* ملاحظة للعملاء */}
          <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
            <p className="font-bold text-sm" style={{ color: "#f0eeff" }}>رسالة للعملاء</p>
            <Input
              value={settingsForm.driverNote}
              onChange={(e) => setSettingsForm(f => ({ ...f, driverNote: e.target.value }))}
              placeholder="مثال: أنا سريع ومنضبط، أوصل في أقل من ساعة..."
              className="rounded-xl text-xs"
              style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(167,139,250,0.4)", color: "#f0eeff" }}
            />
          </div>

          {/* الحد الأدنى والأقصى */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
              <p className="text-xs font-bold" style={{ color: "#c4b5fd" }}>الحد الأدنى للحجوزات</p>
              <Input
                type="number"
                value={settingsForm.minBookingsToDepart}
                onChange={(e) => setSettingsForm(f => ({ ...f, minBookingsToDepart: Number(e.target.value) }))}
                min={1} max={20}
                className="rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(167,139,250,0.4)", color: "#f0eeff" }}
              />
            </div>
            <div className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)" }}>
              <p className="text-xs font-bold" style={{ color: "#c4b5fd" }}>الحد الأقصى للحجوزات</p>
              <Input
                type="number"
                value={settingsForm.maxBookingsPerTrip}
                onChange={(e) => setSettingsForm(f => ({ ...f, maxBookingsPerTrip: Number(e.target.value) }))}
                min={1} max={50}
                className="rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(167,139,250,0.4)", color: "#f0eeff" }}
              />
            </div>
          </div>

          {/* أقصى مسافة توصيل */}
          <div className="rounded-2xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold" style={{ color: "#c4b5fd" }}>أقصى مسافة توصيل</p>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: settingsForm.maxDeliveryKm === 0 ? "#dcfce7" : "#fef3c7", color: settingsForm.maxDeliveryKm === 0 ? "#15803d" : "#92400e" }}>
                {settingsForm.maxDeliveryKm === 0 ? "بدون حد" : `${settingsForm.maxDeliveryKm} كم`}
              </span>
            </div>
            <Input
              type="number"
              value={settingsForm.maxDeliveryKm}
              onChange={(e) => setSettingsForm(f => ({ ...f, maxDeliveryKm: Number(e.target.value) }))}
              min={0} max={500}
              placeholder="0 = بدون حد"
              className="rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(239,68,68,0.4)", color: "#f0eeff" }}
            />
            <p className="text-xs" style={{ color: "#6b7280" }}>إذا تجاوز الطلب هذه المسافة ستتلقى تنبيهاً لقبوله أو رفضه. اكتب 0 لقبول أي مسافة.</p>
          </div>

          {/* ─── مناطقي المحفوظة ─── */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "#1a1040", border: "2px solid #5b21b6" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-black" style={{ color: "#ffffff" }}>🗺️ مناطق التغطية</p>
                <p className="text-xs mt-0.5" style={{ color: "#c4b5fd" }}>مناطق تغطيتك — يظهر طلبات العملاء داخلها فقط</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowSettingsDrawMap(v => !v); setSettingsDrawnPolygon(null); setSettingsDrawPoints([]); settingsDrawPointsRef.current = []; setIsSettingsDrawing(false); isSettingsDrawingRef.current = false; setSettingsNewZoneName(""); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black"
                style={{ background: "#7c3aed", color: "#ffffff" }}
              >
                <Plus className="w-4 h-4" />
                إضافة منطقة
              </button>
            </div>
            {/* عدد المناطق + حقل البحث */}
            {!showSettingsDrawMap && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
                  <span className="text-sm font-bold" style={{ color: "#a78bfa" }}>عدد مناطقك:</span>
                  <span className="text-sm font-black" style={{ color: "#ffffff" }}>{(myPolygonsList ?? []).length} منطقة</span>
                </div>
                {(myPolygonsList ?? []).length > 0 && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={zoneListSearch}
                      onChange={e => setZoneListSearch(e.target.value)}
                      placeholder="ابحث عن منطقة للتعديل أو الحذف..."
                      className="flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                      style={{ background: "#2d1b69", border: "1px solid #7c3aed", color: "#ffffff", direction: "rtl" }}
                    />
                    {zoneListSearch && (
                      <button type="button" onClick={() => setZoneListSearch("")}
                        className="px-3 py-2 rounded-xl text-sm font-bold"
                        style={{ background: "#374151", color: "#d1d5db" }}
                      ><X className="w-4 h-4" /></button>
                    )}
                  </div>
                )}
                {/* نتائج البحث فقط */}
                {zoneListSearch.trim() && (
                  <div className="space-y-1.5">
                    {(myPolygonsList ?? [])
                      .filter((z: any) => z.cityName.toLowerCase().includes(zoneListSearch.toLowerCase()))
                      .map((z: any) => (
                        <div key={z.id} className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "#2d1b69", border: "1px solid #7c3aed" }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#7c3aed" }}>
                            <MapPin className="w-4 h-4" style={{ color: "#ffffff" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black" style={{ color: "#ffffff" }}>{z.cityName}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#a78bfa" }}>{(z.polygon as any[]).length} نقطة • استُخدمت {z.usageCount} مرة</p>
                          </div>
                          <button type="button"
                            onClick={() => { if (confirm(`حذف منطقة "${z.cityName}"؟`)) deleteCityPolygonMutation.mutate({ id: z.id }); }}
                            className="p-2 rounded-lg"
                            style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}
                          ><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    {(myPolygonsList ?? []).filter((z: any) => z.cityName.toLowerCase().includes(zoneListSearch.toLowerCase())).length === 0 && (
                      <p className="text-sm text-center py-3" style={{ color: "#7c6fa0" }}>لا توجد نتائج لـ "{zoneListSearch}"</p>
                    )}
                  </div>
                )}
                {!zoneListSearch.trim() && (myPolygonsList ?? []).length === 0 && (
                  <p className="text-sm text-center py-3" style={{ color: "#9ca3af" }}>لا توجد مناطق — اضغط "إضافة منطقة" للبدء</p>
                )}
              </div>
            )}

            {/* نموذج رسم منطقة جديدة في الإعدادات */}
            {showSettingsDrawMap && (
              <div className="space-y-3 p-4 rounded-2xl" style={{ background: "#1e1b4b", border: "2px solid #7c3aed" }}>
                <p className="text-sm font-bold" style={{ color: "#e9d5ff" }}>✨ رسم منطقة جديدة</p>

                {/* حقل البحث */}
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#c4b5fd" }}>🔍 ابحث عن منطقة لتحديد موقعها على الخريطة</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settingsSearchText}
                      onChange={e => setSettingsSearchText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && settingsSearchText.trim()) {
                          setSettingsSearchLoading(true);
                          const g = (window as any).google;
                          if (!g?.maps?.Geocoder || !settingsMapRef.current) { setSettingsSearchLoading(false); return; }
                          new g.maps.Geocoder().geocode({ address: settingsSearchText + " السعودية", language: "ar" }, (r: any, s: any) => {
                            setSettingsSearchLoading(false);
                            if (s !== "OK" || !r?.length) return;
                            const loc = r[0].geometry.location;
                            settingsMapRef.current.setCenter({ lat: loc.lat(), lng: loc.lng() });
                            settingsMapRef.current.setZoom(12);
                            const comp = r[0].address_components?.find((c: any) => c.types.includes("locality") || c.types.includes("administrative_area_level_2"));
                            if (comp && !settingsNewZoneName) setSettingsNewZoneName(comp.long_name);
                          });
                        }
                      }}
                      placeholder="اكتب اسم مدينة أو حي..."
                      style={{ background: "#2e2a5e", border: "1px solid #7c3aed", color: "#e9d5ff", direction: "rtl" }}
                      className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
                    />
                    <button type="button"
                      disabled={settingsSearchLoading || !settingsSearchText.trim()}
                      onClick={() => {
                        if (!settingsSearchText.trim()) return;
                        setSettingsSearchLoading(true);
                        const g = (window as any).google;
                        if (!g?.maps?.Geocoder || !settingsMapRef.current) { setSettingsSearchLoading(false); return; }
                        new g.maps.Geocoder().geocode({ address: settingsSearchText + " السعودية", language: "ar" }, (r: any, s: any) => {
                          setSettingsSearchLoading(false);
                          if (s !== "OK" || !r?.length) return;
                          const loc = r[0].geometry.location;
                          settingsMapRef.current.setCenter({ lat: loc.lat(), lng: loc.lng() });
                          settingsMapRef.current.setZoom(12);
                          const comp = r[0].address_components?.find((c: any) => c.types.includes("locality") || c.types.includes("administrative_area_level_2"));
                          if (comp && !settingsNewZoneName) setSettingsNewZoneName(comp.long_name);
                        });
                      }}
                      className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-40"
                      style={{ background: "#7c3aed", color: "white" }}
                    >
                      {settingsSearchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      بحث
                    </button>
                  </div>
                </div>

                {/* أدوات الرسم */}
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#c4b5fd" }}>📌 أدوات الرسم</p>
                  <div className="flex gap-2 flex-wrap">
                    {!isSettingsDrawing && (
                      <button type="button"
                        onClick={() => {
                          isSettingsDrawingRef.current = true; settingsDrawPointsRef.current = [];
                          setIsSettingsDrawing(true); setSettingsDrawPoints([]); setSettingsDrawnPolygon(null);
                          if (settingsPolylineRef.current) { settingsPolylineRef.current.setMap(null); settingsPolylineRef.current = null; }
                          if (settingsPolygonRef.current) { settingsPolygonRef.current.setMap(null); settingsPolygonRef.current = null; }
                          settingsMarkersRef.current.forEach((m: any) => { try { m.map = null; } catch {} }); settingsMarkersRef.current = [];
                        }}
                        className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5"
                        style={{ background: "#7c3aed", color: "white" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/></svg>
                        {settingsDrawnPolygon ? "إعادة رسم" : "ابدأ الرسم"}
                      </button>
                    )}
                    {isSettingsDrawing && (
                      <>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#1e3a5f", border: "1px solid #3b82f6" }}>
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></div>
                          <span className="text-sm font-bold" style={{ color: "#93c5fd" }}>وضع الرسم — {settingsDrawPoints.length} نقطة</span>
                        </div>
                        {settingsDrawPoints.length >= 3 && (
                          <button type="button"
                            onClick={() => {
                              const pts = settingsDrawPointsRef.current;
                              if (pts.length < 3) return;
                              isSettingsDrawingRef.current = false;
                              setIsSettingsDrawing(false);
                              const poly: Array<[number, number]> = pts.map(p => [p.lat, p.lng]);
                              setSettingsDrawnPolygon(poly);
                              const g = (window as any).google?.maps;
                              if (g && settingsMapRef.current) {
                                if (settingsPolylineRef.current) { settingsPolylineRef.current.setMap(null); settingsPolylineRef.current = null; }
                                if (settingsPolygonRef.current) { settingsPolygonRef.current.setMap(null); settingsPolygonRef.current = null; }
                                settingsPolygonRef.current = new g.Polygon({ paths: pts, map: settingsMapRef.current, fillColor: "#7c3aed", fillOpacity: 0.2, strokeColor: "#7c3aed", strokeWeight: 2 });
                              }
                            }}
                            className="px-4 py-2 rounded-xl text-sm font-bold"
                            style={{ background: "#16a34a", color: "white" }}
                          >✓ تأكيد الرسم</button>
                        )}
                        <button type="button"
                          onClick={() => { isSettingsDrawingRef.current = false; settingsDrawPointsRef.current = []; setIsSettingsDrawing(false); setSettingsDrawPoints([]); }}
                          className="px-4 py-2 rounded-xl text-sm font-bold"
                          style={{ background: "#991b1b", color: "white" }}
                        >إلغاء</button>
                      </>
                    )}
                  </div>
                </div>

                {/* خريطة الرسم */}
                <MapView
                  className="h-56 rounded-xl overflow-hidden"
                  initialCenter={{ lat: 24.7136, lng: 46.6753 }}
                  initialZoom={6}
                  onMapReady={(map: any) => {
                    settingsMapRef.current = map;
                    map.addListener("click", (e: any) => {
                      if (!e.latLng || !isSettingsDrawingRef.current) return;
                      const lat = e.latLng.lat(); const lng = e.latLng.lng();
                      const newPts = [...settingsDrawPointsRef.current, { lat, lng }];
                      settingsDrawPointsRef.current = newPts;
                      setSettingsDrawPoints([...newPts]);
                      const g = (window as any).google?.maps;
                      if (!g) return;
                      const el = document.createElement("div");
                      const isFirst = newPts.length === 1;
                      el.style.cssText = `width:${isFirst?14:10}px;height:${isFirst?14:10}px;border-radius:50%;background:${isFirst?"#f59e0b":"#7c3aed"};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);`;
                      settingsMarkersRef.current.push(new g.marker.AdvancedMarkerElement({ map, position: { lat, lng }, content: el }));
                      if (settingsPolylineRef.current) settingsPolylineRef.current.setMap(null);
                      settingsPolylineRef.current = new g.Polyline({ path: newPts, map, strokeColor: "#7c3aed", strokeWeight: 2, strokeOpacity: 0.8 });
                    });
                  }}
                />

                {/* اسم المنطقة */}
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#c4b5fd" }}>🏷️ اسم المنطقة</p>
                  <input
                    type="text"
                    value={settingsNewZoneName}
                    onChange={e => setSettingsNewZoneName(e.target.value)}
                    placeholder="مثال: حي الملز أو منطقة القصيم"
                    style={{ background: "#2e2a5e", border: settingsNewZoneName.trim() ? "1px solid #7c3aed" : "1px solid #4c1d95", color: "#e9d5ff", direction: "rtl" }}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  />
                  {!settingsNewZoneName.trim() && settingsDrawnPolygon && (
                    <p className="text-xs mt-1" style={{ color: "#f87171" }}>⚠️ أدخل اسم المنطقة لتفعيل زر الحفظ</p>
                  )}
                </div>

                {/* حالة المضلع */}
                {settingsDrawnPolygon && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#14532d", border: "1px solid #16a34a" }}>
                    <span className="text-base">✅</span>
                    <p className="text-sm font-bold" style={{ color: "#86efac" }}>تم رسم مضلع بـ {settingsDrawnPolygon.length} نقطة</p>
                  </div>
                )}

                {/* أزرار الحفظ والإلغاء */}
                <div className="flex gap-2">
                  <button type="button"
                    disabled={!settingsDrawnPolygon || !settingsNewZoneName.trim() || saveSettingsPolygonMutation.isPending}
                    onClick={() => {
                      if (!settingsDrawnPolygon || !settingsNewZoneName.trim()) return;
                      saveSettingsPolygonMutation.mutate({ cityName: settingsNewZoneName.trim(), polygon: settingsDrawnPolygon });
                    }}
                    className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    style={{
                      background: (!settingsDrawnPolygon || !settingsNewZoneName.trim() || saveSettingsPolygonMutation.isPending) ? "#4c1d95" : "#7c3aed",
                      color: (!settingsDrawnPolygon || !settingsNewZoneName.trim()) ? "#a78bfa" : "white",
                      opacity: saveSettingsPolygonMutation.isPending ? 0.7 : 1
                    }}
                  >
                    {saveSettingsPolygonMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {saveSettingsPolygonMutation.isPending ? "جاري الحفظ..." : "حفظ المنطقة"}
                  </button>
                  <button type="button"
                    onClick={() => { setShowSettingsDrawMap(false); setSettingsDrawnPolygon(null); setSettingsNewZoneName(""); setSettingsDrawPoints([]); settingsDrawPointsRef.current = []; setIsSettingsDrawing(false); isSettingsDrawingRef.current = false; }}
                    className="px-5 py-3 rounded-xl text-sm font-bold"
                    style={{ background: "#374151", color: "#d1d5db" }}
                  >إلغاء</button>
                </div>
              </div>
            )}
          </div>

          <Button
            className="w-full rounded-2xl h-12 font-bold"
            onClick={() => upsertSettingsMutation.mutate({
              isActive: settingsForm.isActive,
              allowsFood: settingsForm.allowsFood,
              allowsCoffee: settingsForm.allowsCoffee,
              allowsGroceries: settingsForm.allowsGroceries,
              allowsPharmacy: settingsForm.allowsPharmacy,
              allowsDocuments: settingsForm.allowsDocuments,
              allowsElectronics: settingsForm.allowsElectronics,
              allowsClothes: settingsForm.allowsClothes,
              allowsOther: settingsForm.allowsOther,
              minBookingsToDepart: settingsForm.minBookingsToDepart,
              maxBookingsPerTrip: settingsForm.maxBookingsPerTrip,
              defaultDeliveryFee: settingsForm.defaultDeliveryFee,
              driverNote: settingsForm.driverNote || undefined,
              customTerms: settingsForm.customTerms || undefined,
              maxDeliveryKm: settingsForm.maxDeliveryKm,
            })}
            disabled={upsertSettingsMutation.isPending}
          >
            {upsertSettingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <CheckCircle2 className="w-4 h-4 ml-2" />}
            حفظ الإعدادات
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== SHOPPER TRIPS TAB =====
function ShopperTripsTab({ phoneUser, driverCurrentCity = "", driverCurrentLat = null, driverCurrentLng = null, onManageBookings }: { phoneUser: any; driverCurrentCity?: string; driverCurrentLat?: number | null; driverCurrentLng?: number | null; onManageBookings?: (tripId: number) => void }) {
  const utils = trpc.useUtils();

  const { data: myTrips, isLoading: tripsLoading } = trpc.shopper.getMyTrips.useQuery(
    { includeCompleted: false }, { enabled: !!phoneUser }
  );
  const { data: completedTrips } = trpc.shopper.getMyTrips.useQuery(
    { includeCompleted: true }, { enabled: !!phoneUser }
  );
  const pastTrips = (completedTrips as any[] ?? []).filter((t: any) => t.status === "completed" || t.status === "cancelled");

  const { data: cityPolygonsList } = trpc.cityPolygons.list.useQuery();
  const incrementPolygonUsageMutation = trpc.cityPolygons.incrementUsage.useMutation();
  const saveCityPolygonMutation = trpc.cityPolygons.save.useMutation({
    onSuccess: () => { utils.cityPolygons.list.invalidate(); utils.cityPolygons.listMine.invalidate(); },
  });

  const createTripMutation = trpc.shopper.createTrip.useMutation({
    onSuccess: () => { utils.shopper.getMyTrips.invalidate(); setShowCreateTrip(false); toast.success("تم إنشاء الرحلة"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateTripStatusMutation = trpc.shopper.updateTripStatus.useMutation({
    onSuccess: () => { utils.shopper.getMyTrips.invalidate(); toast.success("تم تحديث حالة الرحلة"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const { data: selectedTripBookings, isLoading: selectedBookingsLoading, refetch: refetchSelectedBookings } = trpc.shopper.getTripBookings.useQuery(
    { tripId: selectedTripId ?? 0 },
    { enabled: !!selectedTripId }
  );
  const acceptBookingMutation = trpc.shopper.acceptBooking.useMutation({
    onSuccess: () => { refetchSelectedBookings(); toast.success("تم قبول الحجز"); },
    onError: (e: any) => toast.error(e.message),
  });
  const rejectBookingMutation = trpc.shopper.rejectBooking.useMutation({
    onSuccess: () => { refetchSelectedBookings(); toast.info("تم رفض الحجز"); },
    onError: (e: any) => toast.error(e.message),
  });
  const acceptAllMutation = trpc.shopper.acceptAllPendingBookings.useMutation({
    onSuccess: () => { refetchSelectedBookings(); toast.success("تم قبول جميع الحجوزات"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateBookingStatusMutation = trpc.shopper.updateBookingStatus.useMutation({
    onSuccess: () => { refetchSelectedBookings(); toast.success("تم تحديث حالة الحجز"); },
    onError: (e: any) => toast.error(e.message),
  });

  // نموذج إنشاء رحلة
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [tripForm, setTripForm] = useState({
    fromCityId: "",
    fromCityName: "",
    fromLat: null as number | null,
    fromLng: null as number | null,
    toCityId: "",
    toCityName: "",
    toCityLat: null as number | null,
    toCityLng: null as number | null,
    toCityRadiusKm: "10",
    departureTime: (() => { const d = new Date(Date.now() + 5 * 60 * 1000); return d.toISOString().slice(0, 16); })(),
    estimatedArrivalTime: "",
    bookingDeadline: "",
    maxBookings: 5,
    deliveryFee: "",
    notes: "",
    tripType: "group" as "group" | "express",
  });
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showTripReview, setShowTripReview] = useState(false);
  const [savedPolygon, setSavedPolygon] = useState<Array<[number, number]> | null>(null);
  const [savedPolygonSearch, setSavedPolygonSearch] = useState("");
  const [pendingSavePolygon, setPendingSavePolygon] = useState<Array<[number, number]> | null>(null);
  const [savePolygonName, setSavePolygonName] = useState("");
  const [showSavePolygonDialog, setShowSavePolygonDialog] = useState(false);

  // عداد تنازلي
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const formatTripCountdown = useCallback((timeStr: string): string | null => {
    const dep = new Date(timeStr).getTime();
    const diff = dep - nowMs;
    if (diff <= 0) return null;
    const totalSecs = Math.floor(diff / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (days > 0) return `${days}ي ${hours}س ${mins}د`;
    if (hours > 0) return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [nowMs]);

  const [bookingDistances, setBookingDistances] = useState<Record<number, { distKm: number; etaMins: number } | null | 'loading'>>({});
  const calcBookingDistance = (bookingId: number, pickup: string, delivery: string, pickupLat?: number | null, pickupLng?: number | null, deliveryLat?: number | null, deliveryLng?: number | null) => {
    if (bookingDistances[bookingId] !== undefined) return;
    if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
      const distKm = haversineKm(pickupLat, pickupLng, deliveryLat, deliveryLng);
      const etaMins = Math.round((distKm / 40) * 60);
      setBookingDistances(prev => ({ ...prev, [bookingId]: { distKm, etaMins } }));
    } else {
      setBookingDistances(prev => ({ ...prev, [bookingId]: null }));
    }
  };

  const fetchDriverLocation = useCallback(() => {
    if (!navigator.geolocation) { toast.error("المتصفح لا يدعم تحديد الموقع"); return; }
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`,
            { headers: { "User-Agent": "ShopperDeliveryApp/1.0" } }
          );
          const data = await resp.json();
          const addr = data.address || {};
          const cityName = addr.city || addr.town || addr.municipality || addr.county || addr.state || "";
          setTripForm(f => ({ ...f, fromLat: lat, fromLng: lng, fromCityName: cityName || `موقعي (${lat.toFixed(4)}, ${lng.toFixed(4)})` }));
          setFetchingLocation(false);
          if (cityName) toast.success(`تم تحديد موقعك: ${cityName}`);
          else toast.success("تم تحديد موقعك بنجاح");
        } catch {
          setTripForm(f => ({ ...f, fromLat: lat, fromLng: lng, fromCityName: `موقعي (${lat.toFixed(4)}, ${lng.toFixed(4)})` }));
          setFetchingLocation(false);
          toast.success("تم تحديد موقعك");
        }
      },
      () => {
        setFetchingLocation(false);
        toast.error("تعذر جلب الموقع. تأكد من منح صلاحية الموقع");
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  const tripStatusLabel: Record<string, { label: string; color: string }> = {
    upcoming: { label: "قادمة", color: "#6b7280" },
    collecting: { label: "تقبل حجوزات", color: "#10b981" },
    departed: { label: "انطلقت", color: "#3b82f6" },
    arrived: { label: "وصلت", color: "#8b5cf6" },
    completed: { label: "مكتملة", color: "#6b7280" },
    cancelled: { label: "ملغية", color: "#ef4444" },
  };

  const bookingStatusLabel: Record<string, { label: string; color: string }> = {
    pending: { label: "بانتظار الرد", color: "#f59e0b" },
    accepted: { label: "مقبول", color: "#10b981" },
    rejected: { label: "مرفوض", color: "#ef4444" },
    picked_up: { label: "تم الاستلام", color: "#8b5cf6" },
    delivered: { label: "تم التسليم", color: "#16a34a" },
    cancelled: { label: "ملغي", color: "#9ca3af" },
  };

  const [deliveryProofUploaded, setDeliveryProofUploaded] = useState<Set<number>>(new Set());
  const [confirmPhotoState, setConfirmPhotoState] = useState<{
    preview: string; bookingId: number; type: "pickup" | "delivery"; base64: string;
  } | null>(null);

  const handleImageUpload = async (file: File, bookingId: number, type: "pickup" | "delivery") => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      setConfirmPhotoState({ preview: dataUrl, bookingId, type, base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSend = () => {
    if (!confirmPhotoState) return;
    const { bookingId, type, base64 } = confirmPhotoState;
    setConfirmPhotoState(null);
    if (type === "delivery") {
      updateBookingStatusMutation.mutate(
        { bookingId, status: "delivered", proofImageBase64: base64 },
        { onSuccess: () => setDeliveryProofUploaded(prev => new Set(prev).add(bookingId)) }
      );
    } else {
      updateBookingStatusMutation.mutate({ bookingId, status: "picked_up", proofImageBase64: base64 });
    }
  };

  if (!phoneUser) return (
    <div dir="rtl" className="flex flex-col items-center justify-center py-20 px-6">
      <Truck className="w-12 h-12 text-muted-foreground mb-3" />
      <p className="text-muted-foreground text-sm text-center">سجّل دخولك لعرض رحلاتك</p>
    </div>
  );

  return (
    <div dir="rtl" className="driver-theme pb-24 px-4 pt-4 space-y-4" style={{background:'linear-gradient(160deg, #0a0820 0%, #0f0c2e 50%, #0a0820 100%)', minHeight: '100%'}}>
      <div className="flex items-center gap-2 mb-2">
        <Truck className="w-5 h-5" style={{color:'#a78bfa'}} />
        <h2 className="text-base font-bold" style={{color:'#f0eeff'}}>رحلاتي</h2>
      </div>

      <Button className="w-full rounded-2xl h-11 font-bold" onClick={() => {
        setTripForm({
          fromCityId: "",
          fromCityName: driverCurrentCity || "",
          fromLat: driverCurrentLat,
          fromLng: driverCurrentLng,
          toCityId: "",
          toCityName: "",
          toCityLat: null,
          toCityLng: null,
          toCityRadiusKm: "10",
          departureTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
          estimatedArrivalTime: "",
          bookingDeadline: "",
          maxBookings: 5,
          deliveryFee: "",
          notes: "",
          tripType: "group",
        });
        setSavedPolygon(null);
        setSavedPolygonSearch("");
        setShowTripReview(false);
        setShowCreateTrip(true);
      }}>
        <Plus className="w-4 h-4 ml-2" />
        إنشاء رحلة جديدة
      </Button>

      {tripsLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

      {/* الرحلات النشطة */}
      {(() => {
        const activeTrips = (myTrips as any[] ?? []).filter((t: any) => t.status !== "completed" && t.status !== "cancelled");
        if (!tripsLoading && activeTrips.length === 0) return (
          <div className="text-center py-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(167,139,250,0.4)" }}>
            <p className="text-sm" style={{ color: "#a78bfa" }}>لا توجد رحلات نشطة حالياً</p>
          </div>
        );
        return activeTrips.map((trip: any) => {
          const st = tripStatusLabel[trip.status] ?? { label: trip.status, color: "#6b7280" };
          const depTime = new Date(trip.departureTime);
          return (
            <div key={trip.id} className="rounded-2xl overflow-hidden" style={{ background: "rgba(30,20,60,0.85)", border: "1.5px solid rgba(167,139,250,0.45)", boxShadow: "0 6px 24px rgba(124,58,237,0.25)" }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(167,139,250,0.25)", background: "rgba(124,58,237,0.22)" }}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base" style={{ color: "#f0eeff" }}>{trip.fromCityName} → {trip.toCityName}</p>
                    {trip.tripType === "group" ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.4)", color: "#c4b5fd" }}>جماعي</span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(37,99,235,0.4)", color: "#93c5fd" }}>سريع</span>
                    )}
                  </div>
                  <p className="text-xs font-medium mt-0.5" style={{ color: "#c4b5fd" }}>
                    {depTime.toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" })} - {depTime.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: `${st.color}30`, color: st.color, border: `1px solid ${st.color}60` }}>
                  {st.label}
                </span>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-4 text-sm font-semibold" style={{ color: "#e9d5ff" }}>
                  <span>الحجوزات: <span style={{color:'#a78bfa'}}>{trip.currentBookings}/{trip.maxBookings}</span></span>
                  <span className="font-bold" style={{color:'#4ade80'}}>{trip.deliveryFee} ر.س</span>
                </div>
                {(trip.status === "upcoming" || trip.status === "collecting" || trip.status === "departed" || trip.status === "arrived") && (() => {
                  const deadlineTime = trip.bookingDeadline ?? null;
                  const hasDeadline = !!deadlineTime;
                  const countdown = hasDeadline ? formatTripCountdown(deadlineTime!) : null;
                  const totalSecs = hasDeadline ? Math.floor((new Date(deadlineTime!).getTime() - nowMs) / 1000) : 0;
                  const isUrgent = totalSecs < 3600 && totalSecs > 0;
                  return (
                    <div className="space-y-1.5">
                      {hasDeadline && (
                        <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: countdown ? (isUrgent ? "#ef4444" : "#f59e0b") : "#ef4444" }}>
                          <Timer className="w-3.5 h-3.5" />
                          {countdown ? <span>إغلاق الحجز خلال: {countdown}</span> : <span>انتهى وقت استقبال الحجوزات</span>}
                        </div>
                      )}
                      {(() => {
                        const arrivalCountdown = formatTripCountdown(trip.estimatedArrivalTime);
                        const arrivalMs = new Date(trip.estimatedArrivalTime).getTime() - nowMs;
                        const arrivalUrgent = arrivalMs < 3600000 && arrivalMs > 0;
                        return (
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: arrivalCountdown ? (arrivalUrgent ? "#f59e0b" : "#6ee7b7") : "#6ee7b7" }}>
                            <span>⌛</span>
                            {arrivalCountdown ? <span>الوصول المتوقع خلال: {arrivalCountdown}</span> : <span>وصلت / تجاوز وقت الوصول المتوقع</span>}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
                <div className="flex flex-wrap gap-2 pt-2">
                  {trip.status === "upcoming" && (
                    <button onClick={() => updateTripStatusMutation.mutate({ tripId: trip.id, status: "collecting" })} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95" style={{ background: "#16a34a", color: "#ffffff", minWidth: '100px' }}>✅ فتح الحجوزات</button>
                  )}
                  {trip.status === "collecting" && (
                    <>
                      <button onClick={() => { onManageBookings?.(trip.id); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95" style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#ffffff", boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>📊 إدارة الحجوزات ({trip.currentBookings})</button>
                      <button onClick={() => updateTripStatusMutation.mutate({ tripId: trip.id, status: "departed" })} className="py-2.5 px-4 rounded-xl text-sm font-bold transition-all active:scale-95" style={{ background: "#2563eb", color: "#ffffff" }}>🚀 انطلقت</button>
                    </>
                  )}
                  {trip.status === "departed" && (
                    <>
                      <button onClick={() => { onManageBookings?.(trip.id); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95" style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#ffffff", boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>📊 الحجوزات ({trip.currentBookings})</button>
                      <button onClick={() => updateTripStatusMutation.mutate({ tripId: trip.id, status: "arrived" })} className="py-2.5 px-4 rounded-xl text-sm font-bold transition-all active:scale-95" style={{ background: "#0891b2", color: "#ffffff" }}>🏙️ وصلت</button>
                    </>
                  )}
                  {trip.status === "arrived" && (
                    <button onClick={() => updateTripStatusMutation.mutate({ tripId: trip.id, status: "completed" })} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95" style={{ background: "#16a34a", color: "#ffffff" }}>✅ إتمام الرحلة</button>
                  )}
                </div>
              </div>
            </div>
          );
        });
      })()}

      {/* الرحلات السابقة */}
      {pastTrips.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-bold mb-2" style={{ color: "#a78bfa" }}>✅ الرحلات السابقة</p>
          <div className="space-y-2">
            {pastTrips.map((trip: any) => {
              const depTime = new Date(trip.departureTime);
              const tripTypeLabel = trip.tripType === "express" ? "⚡ سريع" : "🚚 جماعي";
              const tripTypeColor = trip.tripType === "express" ? "#f59e0b" : "#7c3aed";
              const statusLabel = trip.status === "completed" ? "مكتملة" : "ملغاة";
              const statusColor = trip.status === "completed" ? "#16a34a" : "#ef4444";
              return (
                <div key={trip.id} className="rounded-xl px-3 py-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#f0eeff" }}>{trip.fromCityName} → {trip.toCityName}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#a78bfa" }}>{depTime.toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" })}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${tripTypeColor}20`, color: tripTypeColor }}>{tripTypeLabel}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor}15`, color: statusColor }}>{statusLabel}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: "#374151" }}>{trip.currentBookings}/{trip.maxBookings}</p>
                    <p className="text-xs" style={{ color: "#7c3aed" }}>{trip.deliveryFee} ر.س</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* عرض حجوزات الرحلة المختارة */}
      {selectedTripId && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid rgba(124,58,237,0.6)", background: "rgba(124,58,237,0.08)" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(124,58,237,0.25)", borderBottom: "1px solid rgba(167,139,250,0.3)" }}>
            <p className="font-bold text-sm" style={{ color: "#f0eeff" }}>حجوزات الرحلة</p>
            <button onClick={() => setSelectedTripId(null)} className="p-1 rounded-lg" style={{ background: "rgba(167,139,250,0.2)", color: "#c4b5fd" }}><X className="w-4 h-4" /></button>
          </div>
          <div className="p-4 space-y-3">
            {(selectedTripBookings as any[] ?? []).some((b: any) => b.booking.status === "pending") && (
              <div className="flex gap-3">
                <button onClick={() => acceptAllMutation.mutate({ tripId: selectedTripId! })} disabled={acceptAllMutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: "#16a34a", color: "#fff" }}>✅ قبول الكل</button>
                <button onClick={() => { (selectedTripBookings as any[] ?? []).filter((b: any) => b.booking.status === "pending").forEach((b: any) => rejectBookingMutation.mutate({ bookingId: b.booking.id })); }} disabled={rejectBookingMutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: "#dc2626", color: "#fff" }}>❌ رفض الكل</button>
              </div>
            )}
            {selectedBookingsLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
            {(selectedTripBookings as any[] ?? []).length === 0 && !selectedBookingsLoading && (
              <div className="text-center py-10"><Package className="w-10 h-10 mx-auto mb-2" style={{color:'#6b7280'}} /><p className="text-sm" style={{color:'#a78bfa'}}>لا توجد حجوزات لهذه الرحلة</p></div>
            )}
            {(selectedTripBookings as any[] ?? []).map((item: any) => {
              const bk = item.booking; const cu = item.customer;
              const st = bookingStatusLabel[bk.status] ?? { label: bk.status, color: "#6b7280" };
              const pLat = bk.pickupLocationLat ? parseFloat(String(bk.pickupLocationLat)) : null;
              const pLng = bk.pickupLocationLng ? parseFloat(String(bk.pickupLocationLng)) : null;
              const dLat = bk.deliveryLocationLat ? parseFloat(String(bk.deliveryLocationLat)) : null;
              const dLng = bk.deliveryLocationLng ? parseFloat(String(bk.deliveryLocationLng)) : null;
              if (bookingDistances[bk.id] === undefined) calcBookingDistance(bk.id, bk.pickupLocationText || "", bk.deliveryLocationText || "", pLat, pLng, dLat, dLng);
              const dist = bookingDistances[bk.id];
              return (
                <div key={bk.id} className="rounded-2xl overflow-hidden" style={{ background: "rgba(124,58,237,0.1)", border: "1.5px solid rgba(167,139,250,0.3)" }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(124,58,237,0.2)", borderBottom: "1px solid rgba(167,139,250,0.2)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "#7c3aed" }}>{cu?.name?.charAt(0) || "؟"}</div>
                      <div><div className="text-sm font-bold" style={{color:'#f0eeff'}}>{cu?.name || "عميل"}</div><div className="text-xs" style={{color:'#a78bfa'}}>{cu?.phone || ""}</div></div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dist && typeof dist === "object" && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>{dist.distKm.toFixed(1)} كم</span>}
                      <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: st.color + "22", color: st.color }}>{st.label}</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {bk.pickupLocationText && <div className="flex items-start gap-2"><span className="text-green-400 mt-0.5">📍</span><div><div className="text-xs" style={{color:'#a78bfa'}}>الاستلام</div><div className="text-xs" style={{color:'#e9d5ff'}}>{bk.pickupLocationText}</div></div></div>}
                    {bk.deliveryLocationText && <div className="flex items-start gap-2"><span className="text-red-400 mt-0.5">🏠</span><div><div className="text-xs" style={{color:'#a78bfa'}}>التسليم</div><div className="text-xs" style={{color:'#e9d5ff'}}>{bk.deliveryLocationText}</div></div></div>}
                    {bk.deliveryFee && <div className="flex items-center gap-2"><span>💰</span><span className="text-sm font-bold" style={{color:'#4ade80'}}>{bk.deliveryFee} ريال</span></div>}
                    {bk.notes && <div className="text-xs italic" style={{color:'#c4b5fd'}}>"{bk.notes}"</div>}
                  </div>
                  <div className="px-4 pb-3">
                    {bk.status === "pending" && <div className="flex gap-2"><button onClick={() => acceptBookingMutation.mutate({ bookingId: bk.id })} disabled={acceptBookingMutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: "#16a34a", color: "#fff" }}>✅ قبول</button><button onClick={() => rejectBookingMutation.mutate({ bookingId: bk.id })} disabled={rejectBookingMutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: "#dc2626", color: "#fff" }}>❌ رفض</button></div>}
                    {bk.status === "accepted" && <button onClick={() => updateBookingStatusMutation.mutate({ bookingId: bk.id, status: "picked_up" })} disabled={updateBookingStatusMutation.isPending} className="w-full py-2.5 rounded-xl text-sm font-bold" style={{ background: "#2563eb", color: "#fff" }}>📦 تم الاستلام من المتجر</button>}
                    {bk.status === "picked_up" && <button onClick={() => updateBookingStatusMutation.mutate({ bookingId: bk.id, status: "delivered" })} disabled={updateBookingStatusMutation.isPending} className="w-full py-2.5 rounded-xl text-sm font-bold" style={{ background: "#16a34a", color: "#fff" }}>✅ تم التسليم للعميل</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* نموذج إنشاء رحلة */}
      {showCreateTrip && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full rounded-t-3xl overflow-y-auto" style={{ background: "#0f0c2e", maxHeight: "90vh", border: "2px solid rgba(124,58,237,0.5)" }}>
            <div className="px-4 pt-5 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(167,139,250,0.3)", background: "rgba(124,58,237,0.2)" }}>
              <h3 className="font-bold text-base" style={{ color: "#f0eeff" }}>إنشاء رحلة جديدة</h3>
              <button onClick={() => setShowCreateTrip(false)}><X className="w-5 h-5" style={{color:'#a78bfa'}} /></button>
            </div>
            <div className="px-4 py-4 space-y-4">
              {/* نوع الرحلة */}
              <div>
                <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>نوع التوصيل *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button type="button"
                    onClick={() => setTripForm(f => ({ ...f, tripType: "group", maxBookings: f.tripType === "express" ? 5 : f.maxBookings }))}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all"
                    style={tripForm.tripType === "group" ? { borderColor: "#7c3aed", background: "rgba(124,58,237,0.25)", color: "#c4b5fd" } : { borderColor: "rgba(167,139,250,0.3)", background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}
                  >
                    <span className="text-lg">🚚</span>
                    <span className="text-xs font-bold">جماعي</span>
                    <span className="text-[10px]" style={{ color: "#6b7280" }}>عدة طلبات</span>
                  </button>
                  <button type="button"
                    onClick={() => setTripForm(f => ({ ...f, tripType: "express", maxBookings: 1, bookingDeadline: "", departureTime: "", estimatedArrivalTime: "" }))}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all"
                    style={tripForm.tripType === "express" ? { borderColor: "#d97706", background: "rgba(217,119,6,0.2)", color: "#fbbf24" } : { borderColor: "rgba(167,139,250,0.3)", background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}
                  >
                    <span className="text-lg">⚡</span>
                    <span className="text-xs font-bold">سريع</span>
                    <span className="text-[10px]" style={{ color: "#6b7280" }}>طلب واحد فوري</span>
                  </button>
                </div>
                {tripForm.tripType === "express" && (
                  <p className="text-xs mt-1.5 text-center" style={{ color: "#d97706" }}>⚡ ستظهر بطاقتك فوراً للعملاء بدون توقيت محدد</p>
                )}
              </div>
              {/* موقع الانطلاق */}
              <div>
                <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>موقعي الحالي (مدينة الانطلاق) *</Label>
                <div className="mt-1 space-y-2">
                  {tripForm.fromCityName ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ background: "rgba(22,163,74,0.15)", borderColor: "rgba(134,239,172,0.4)" }}>
                      <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "#16a34a" }} />
                      <span className="text-sm font-semibold flex-1" style={{ color: "#4ade80" }}>{tripForm.fromCityName}</span>
                      <button type="button" onClick={() => setTripForm(f => ({ ...f, fromCityName: "", fromLat: null, fromLng: null }))} className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(22,163,74,0.2)", color: "#4ade80" }}>تغيير</button>
                    </div>
                  ) : (
                    <button type="button" onClick={fetchDriverLocation} disabled={fetchingLocation}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-semibold transition-colors"
                      style={{ borderColor: "#7c3aed", color: "#a78bfa", background: "rgba(124,58,237,0.1)" }}
                    >
                      {fetchingLocation ? <><Loader2 className="w-4 h-4 animate-spin" />جاري تحديد موقعك...</> : <><Navigation className="w-4 h-4" />اضغط لتحديد موقعك تلقائياً</>}
                    </button>
                  )}
                  {!tripForm.fromCityName && !fetchingLocation && <p className="text-xs text-red-400">يجب تحديد موقعك الحالي</p>}
                </div>
              </div>
              {/* منطقة التوصيل */}
              <div>
                <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>منطقة التوصيل *</Label>
                <p className="text-xs mt-0.5 mb-2" style={{ color: "#a78bfa" }}>اختر من مناطقك المحفوظة — أضف مناطق جديدة من الإعدادات</p>
                {savedPolygon && tripForm.toCityName && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl mb-2" style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(167,139,250,0.5)" }}>
                    <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "#7c3aed" }} />
                    <span className="text-sm font-semibold flex-1" style={{ color: "#c4b5fd" }}>{tripForm.toCityName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#7c3aed", color: "white" }}>✓ محددة</span>
                    <button type="button" onClick={() => { setSavedPolygon(null); setTripForm(f => ({ ...f, toCityName: "", toCityLat: null, toCityLng: null })); }} className="p-1 rounded-lg hover:bg-red-100" style={{ color: "#ef4444" }}><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                <div className="relative mb-2">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#9ca3af" }} />
                  <input type="text" value={savedPolygonSearch} onChange={e => setSavedPolygonSearch(e.target.value)}
                    placeholder="ابحث في مناطقك المحفوظة..."
                    className="w-full rounded-xl border px-3 py-2.5 pr-9 text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(167,139,250,0.3)", color: "#f0eeff", direction: "rtl" }}
                  />
                </div>
                {savedPolygonSearch.trim().length === 0 ? (
                  (cityPolygonsList ?? []).length === 0 ? (
                    <div className="text-center py-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(167,139,250,0.3)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#a78bfa" }}>لا توجد مناطق محفوظة</p>
                      <p className="text-xs mt-1" style={{ color: "#7c6fa0" }}>اذهب إلى الإعدادات ← مناطقي المحفوظة ← إضافة منطقة</p>
                    </div>
                  ) : (
                    <p className="text-xs text-center py-2" style={{ color: "#7c6fa0" }}>ابدأ الكتابة للبحث في {(cityPolygonsList ?? []).length} منطقة محفوظة</p>
                  )
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                    {(cityPolygonsList ?? [])
                      .filter((z: any) => z.cityName.toLowerCase().includes(savedPolygonSearch.toLowerCase()))
                      .map((z: any) => (
                        <button key={z.id} type="button"
                          onClick={() => {
                            setSavedPolygon(z.polygon as Array<[number, number]>);
                            setTripForm(f => ({ ...f, toCityName: z.cityName }));
                            incrementPolygonUsageMutation.mutate({ id: z.id });
                            setSavedPolygonSearch("");
                          }}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-right transition-all"
                          style={{ background: savedPolygon && tripForm.toCityName === z.cityName ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.05)", border: "1px solid " + (savedPolygon && tripForm.toCityName === z.cityName ? "rgba(167,139,250,0.5)" : "rgba(167,139,250,0.15)"), color: "#f0eeff" }}
                        >
                          <span className="text-base">📍</span>
                          <div className="flex-1 text-right">
                            <p className="text-sm font-semibold">{z.cityName}</p>
                            <p className="text-xs" style={{ color: "#7c6fa0" }}>{(z.polygon as any[]).length} نقطة • استُخدمت {z.usageCount} مرة</p>
                          </div>
                          {savedPolygon && tripForm.toCityName === z.cityName && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#7c3aed", color: "white" }}>✓</span>}
                        </button>
                      ))}
                    {(cityPolygonsList ?? []).filter((z: any) => z.cityName.toLowerCase().includes(savedPolygonSearch.toLowerCase())).length === 0 && (
                      <p className="text-xs text-center py-3" style={{ color: "#7c6fa0" }}>لا توجد نتائج لـ "{savedPolygonSearch}"</p>
                    )}
                  </div>
                )}
                {!savedPolygon && <p className="text-xs text-red-400 mt-1">يجب اختيار منطقة التوصيل</p>}
              </div>
              {tripForm.tripType === "group" && (
                <>
                  <div>
                    <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>وقت المغادرة *</Label>
                    <Input type="datetime-local" value={tripForm.departureTime}
                      min={new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16)}
                      onChange={(e) => { const val = e.target.value; const now = new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16); if (val < now) return; setTripForm(f => ({ ...f, departureTime: val })); }}
                      className="rounded-xl mt-1" style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(167,139,250,0.3)", color: "#f0eeff" }}
                    />
                    {tripForm.departureTime && new Date(tripForm.departureTime) < new Date() && <p className="text-xs text-red-400 mt-1">لا يمكن اختيار وقت في الماضي</p>}
                  </div>
                  <div>
                    <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>وقت الوصول المتوقع *</Label>
                    <Input type="datetime-local" value={tripForm.estimatedArrivalTime}
                      min={tripForm.departureTime || new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16)}
                      onChange={(e) => { const val = e.target.value; const minTime = tripForm.departureTime || new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16); if (val < minTime) return; setTripForm(f => ({ ...f, estimatedArrivalTime: val })); }}
                      className="rounded-xl mt-1" style={{ background: "rgba(255,255,255,0.07)", borderColor: !tripForm.estimatedArrivalTime ? "#ef4444" : "rgba(167,139,250,0.3)", color: "#f0eeff" }}
                    />
                    {!tripForm.estimatedArrivalTime && <p className="text-xs text-red-400 mt-1">مطلوب تحديد وقت الوصول</p>}
                  </div>
                  <div>
                    <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>آخر موعد لقبول الحجوزات (اختياري)</Label>
                    <Input type="datetime-local" value={tripForm.bookingDeadline}
                      onChange={(e) => setTripForm(f => ({ ...f, bookingDeadline: e.target.value }))}
                      className="rounded-xl mt-1" style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(167,139,250,0.3)", color: "#f0eeff" }}
                    />
                    <p className="text-xs mt-1" style={{ color: "#7c6fa0" }}>إذا تركته فارغاً سيغلق الحجز تلقائياً عند المغادرة</p>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>الحد الأقصى للحجوزات</Label>
                  <Input type="number" value={tripForm.maxBookings} onChange={(e) => setTripForm(f => ({ ...f, maxBookings: Number(e.target.value) }))} min={1} max={100} className="rounded-xl mt-1" style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(167,139,250,0.3)", color: "#f0eeff" }} />
                </div>
                <div>
                  <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>رسوم التوصيل (ر.س) *</Label>
                  <Input type="number" value={tripForm.deliveryFee} onChange={(e) => setTripForm(f => ({ ...f, deliveryFee: e.target.value }))} placeholder="أدخل السعر" min={1} className="rounded-xl mt-1" style={{ background: "rgba(255,255,255,0.07)", borderColor: !tripForm.deliveryFee || Number(tripForm.deliveryFee) <= 0 ? "#ef4444" : "rgba(167,139,250,0.3)", color: "#f0eeff" }} />
                  {(!tripForm.deliveryFee || Number(tripForm.deliveryFee) <= 0) && <p className="text-xs text-red-400 mt-1">مطلوب تحديد سعر التوصيل</p>}
                </div>
              </div>
              <div>
                <Label className="text-xs font-bold" style={{ color: "#c4b5fd" }}>ملاحظات</Label>
                <Input value={tripForm.notes} onChange={(e) => setTripForm(f => ({ ...f, notes: e.target.value }))} placeholder="أي تعليمات للعملاء..." className="rounded-xl mt-1" style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(167,139,250,0.3)", color: "#f0eeff" }} />
              </div>
              <Button
                className="w-full rounded-2xl h-12 font-bold"
                style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "#fff" }}
                disabled={
                  !tripForm.fromCityName.trim() ||
                  (!tripForm.toCityLat && !savedPolygon) ||
                  !tripForm.toCityName.trim() ||
                  !tripForm.deliveryFee || Number(tripForm.deliveryFee) <= 0 ||
                  (tripForm.tripType === "group" && (!tripForm.departureTime || !tripForm.estimatedArrivalTime)) ||
                  createTripMutation.isPending
                }
                onClick={() => setShowTripReview(true)}
              >
                <CheckCircle2 className="w-4 h-4 ml-2" />
                مراجعة وتأكيد الرحلة
              </Button>

              {/* نافذة مراجعة الرحلة */}
              {showTripReview && (
                <div className="fixed inset-0 z-[300] flex items-end" style={{ background: "rgba(0,0,0,0.75)" }}>
                  <div className="w-full rounded-t-3xl overflow-y-auto" style={{ background: "#0f0c2e", maxHeight: "85vh" }}>
                    <div className="px-5 pt-5 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(167,139,250,0.3)", background: "rgba(124,58,237,0.2)" }}>
                      <div>
                        <h3 className="text-base font-black" style={{ color: "#f0eeff" }}>مراجعة الرحلة</h3>
                        <p className="text-xs mt-0.5" style={{ color: "#a78bfa" }}>تأكد من التفاصيل قبل الإنشاء</p>
                      </div>
                      <button onClick={() => setShowTripReview(false)}><X className="w-5 h-5" style={{ color: "#a78bfa" }} /></button>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(22,163,74,0.15)", border: "1px solid rgba(134,239,172,0.3)" }}>
                        <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>من</span>
                        <span className="text-sm font-bold" style={{ color: "#4ade80" }}>{tripForm.fromCityName}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(167,139,250,0.5)" }}>
                        <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>إلى (منطقة)</span>
                        <span className="text-sm font-bold" style={{ color: "#c4b5fd" }}>{tripForm.toCityName}</span>
                      </div>
                      {tripForm.tripType === "group" && (
                        <>
                          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(147,197,253,0.3)" }}>
                            <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>وقت المغادرة</span>
                            <span className="text-sm font-bold" style={{ color: "#93c5fd" }}>
                              {tripForm.departureTime ? new Date(tripForm.departureTime).toLocaleString("ar-SA", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(147,197,253,0.3)" }}>
                            <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>وقت الوصول المتوقع</span>
                            <span className="text-sm font-bold" style={{ color: "#93c5fd" }}>
                              {tripForm.estimatedArrivalTime ? new Date(tripForm.estimatedArrivalTime).toLocaleString("ar-SA", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                            </span>
                          </div>
                          {tripForm.bookingDeadline && (
                            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(217,119,6,0.15)", border: "1px solid rgba(253,211,77,0.3)" }}>
                              <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>آخر موعد للحجز</span>
                              <span className="text-sm font-bold" style={{ color: "#fbbf24" }}>
                                {new Date(tripForm.bookingDeadline).toLocaleString("ar-SA", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {tripForm.tripType === "express" && (
                        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(217,119,6,0.15)", border: "1px solid rgba(253,211,77,0.3)" }}>
                          <span className="text-xs font-bold" style={{ color: "#a78bfa" }}>وقت المغادرة</span>
                          <span className="text-sm font-bold" style={{ color: "#fbbf24" }}>فوري — الآن</span>
                        </div>
                      )}
                      {tripForm.tripType === "group" && (
                        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                          <span className="text-xs font-bold" style={{ color: "#6b7280" }}>الحد الأقصى للحجوزات</span>
                          <span className="text-sm font-bold" style={{ color: "#111827" }}>{tripForm.maxBookings} حجز</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(22,163,74,0.15)", border: "1px solid rgba(134,239,172,0.3)" }}>
                        <span className="text-xs font-bold" style={{ color: "#6b7280" }}>رسوم التوصيل</span>
                        <span className="text-lg font-extrabold" style={{ color: "#15803d" }}>{tripForm.deliveryFee} ر.س</span>
                      </div>
                      {tripForm.notes && (
                        <div className="p-3 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                          <span className="text-xs font-bold" style={{ color: "#6b7280" }}>ملاحظات: </span>
                          <span className="text-xs" style={{ color: "#374151" }}>{tripForm.notes}</span>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowTripReview(false)} className="flex-1 py-3 rounded-2xl border-2 font-bold text-sm" style={{ borderColor: "#d1d5db", color: "#374151", background: "#f9fafb" }}>تعديل</button>
                        <button
                          type="button"
                          disabled={createTripMutation.isPending || (tripForm.tripType === "group" && !!tripForm.departureTime && new Date(tripForm.departureTime) <= new Date())}
                          onClick={() => {
                            if (tripForm.tripType === "group") {
                              if (!tripForm.fromCityName?.trim()) { toast.error("يجب تحديد مدينة الانطلاق"); return; }
                              if (!tripForm.toCityName?.trim()) { toast.error("يجب تحديد مدينة التوصيل"); return; }
                              if (!tripForm.departureTime) { toast.error("يجب تحديد وقت المغادرة"); return; }
                              if (!tripForm.estimatedArrivalTime) { toast.error("يجب تحديد وقت الوصول المتوقع"); return; }
                              if (!tripForm.deliveryFee || Number(tripForm.deliveryFee) <= 0) { toast.error("يجب تحديد رسوم التوصيل"); return; }
                              const depCheck = new Date(tripForm.departureTime);
                              if (depCheck <= new Date()) { toast.error("وقت المغادرة يجب أن يكون في المستقبل"); return; }
                              const arrCheck = new Date(tripForm.estimatedArrivalTime);
                              if (arrCheck <= depCheck) { toast.error("وقت الوصول يجب أن يكون بعد وقت المغادرة"); return; }
                            }
                            const now = new Date();
                            const depTime = tripForm.tripType === "express" ? now : new Date(tripForm.departureTime);
                            const arrTime = tripForm.estimatedArrivalTime ? new Date(tripForm.estimatedArrivalTime) : new Date(depTime.getTime() + 2 * 60 * 60 * 1000);
                            createTripMutation.mutate({
                              fromCityId: 0,
                              fromCityName: tripForm.fromCityName.trim(),
                              fromLat: tripForm.fromLat ?? undefined,
                              fromLng: tripForm.fromLng ?? undefined,
                              toCityId: 0,
                              toCityName: tripForm.toCityName.trim(),
                              toCityLat: tripForm.toCityLat ?? undefined,
                              toCityLng: tripForm.toCityLng ?? undefined,
                              toCityRadiusKm: Number(tripForm.toCityRadiusKm) || 10,
                              departureTime: depTime.toISOString(),
                              estimatedArrivalTime: arrTime.toISOString(),
                              bookingDeadline: tripForm.bookingDeadline ? new Date(tripForm.bookingDeadline).toISOString() : undefined,
                              maxBookings: tripForm.tripType === "express" ? 1 : tripForm.maxBookings,
                              deliveryFee: Number(tripForm.deliveryFee) || 0,
                              notes: tripForm.notes || undefined,
                              tripType: tripForm.tripType as "group" | "express",
                              coveragePolygon: savedPolygon ? JSON.stringify(savedPolygon) : undefined,
                            });
                          }}
                          className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "#fff" }}
                        >
                          {createTripMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإنشاء...</> : <><CheckCircle2 className="w-4 h-4" /> تأكيد وتشغيل الرحلة</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد الصورة */}
      {confirmPhotoState && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.88)" }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#ffffff" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: confirmPhotoState.type === "delivery" ? "#fff7ed" : "#eff6ff", borderBottom: "2px solid " + (confirmPhotoState.type === "delivery" ? "#fed7aa" : "#bfdbfe") }}>
              <div className="text-2xl">{confirmPhotoState.type === "delivery" ? "📦" : "🛒"}</div>
              <div>
                <div className="text-sm font-bold" style={{ color: confirmPhotoState.type === "delivery" ? "#9a3412" : "#1e40af" }}>
                  {confirmPhotoState.type === "delivery" ? "تأكيد صورة التسليم" : "تأكيد صورة الاستلام"}
                </div>
                <div className="text-xs" style={{ color: "#6b7280" }}>هل أنت متأكد من إرسال هذه الصورة؟</div>
              </div>
            </div>
            <div className="p-3">
              <img src={confirmPhotoState.preview} alt="معاينة الصورة" className="w-full rounded-xl object-cover" style={{ maxHeight: "280px", border: "2px solid #e5e7eb" }} />
            </div>
            <div className="px-3 pb-4 grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmPhotoState(null)} className="rounded-xl h-12 font-bold text-sm border-2" style={{ borderColor: "#d1d5db", background: "#f9fafb", color: "#374151" }}>📷 إعادة التصوير</button>
              <button onClick={handleConfirmSend} className="rounded-xl h-12 font-bold text-sm text-white" style={{ background: confirmPhotoState.type === "delivery" ? "#16a34a" : "#2563eb" }}>✅ نعم، إرسال</button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog حفظ المنطقة المرسومة */}
      {showSavePolygonDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl" dir="rtl">
            <h3 className="text-lg font-bold mb-1" style={{ color: "#1e293b" }}>💾 احفظ هذه المنطقة</h3>
            <p className="text-xs mb-4" style={{ color: "#64748b" }}>احفظ المنطقة المرسومة لاستخدامها مستقبلاً بسرعة دون إعادة الرسم</p>
            <input
              type="text"
              value={savePolygonName}
              onChange={e => setSavePolygonName(e.target.value)}
              placeholder="اسم المنطقة (مثال: عنيزة، حي النزهة)"
              className="w-full border rounded-xl px-3 py-2.5 text-right mb-4 text-sm"
              style={{ borderColor: "#cbd5e1", outline: "none" }}
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter" && savePolygonName.trim()) {
                  (async () => {
                    if (pendingSavePolygon) {
                      try {
                        await saveCityPolygonMutation.mutateAsync({ cityName: savePolygonName.trim(), polygon: pendingSavePolygon });
                        toast.success(`تم حفظ منطقة "${savePolygonName}" بنجاح`);
                      } catch {}
                    }
                    setShowSavePolygonDialog(false);
                  })();
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (savePolygonName.trim() && pendingSavePolygon) {
                    try {
                      await saveCityPolygonMutation.mutateAsync({ cityName: savePolygonName.trim(), polygon: pendingSavePolygon });
                      toast.success(`تم حفظ منطقة "${savePolygonName}" بنجاح`);
                    } catch {}
                  }
                  setShowSavePolygonDialog(false);
                }}
                disabled={!savePolygonName.trim()}
                className="flex-1 rounded-xl py-2.5 font-bold text-sm text-white transition-opacity"
                style={{ background: savePolygonName.trim() ? "#16a34a" : "#86efac", cursor: savePolygonName.trim() ? "pointer" : "not-allowed" }}
              >💾 حفظ</button>
              <button onClick={() => setShowSavePolygonDialog(false)} className="flex-1 rounded-xl py-2.5 font-bold text-sm" style={{ background: "#f1f5f9", color: "#475569" }}>تخطي</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
