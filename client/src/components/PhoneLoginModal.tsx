import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, MapPin, Locate, Map, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { MapView } from "@/components/Map";

interface PhoneLoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: { id: number; phone: string; name: string | null; role: string }) => void;
  role?: "customer" | "driver";
  title?: string;
}

type Step = "phone" | "otp" | "name" | "location";

export function PhoneLoginModal({ open, onClose, onSuccess, role = "customer", title }: PhoneLoginModalProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // بانر الخطأ في أعلى الصفحة
  const [errorBanner, setErrorBanner] = useState<{ code: number; message: string } | null>(null);
  // Location step state
  const [addressText, setAddressText] = useState("");
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapPin, setMapPin] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocodingMap, setIsGeocodingMap] = useState(false);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Helper: call server-side reverse geocoding via tRPC (uses BUILT_IN_FORGE_API_KEY - reliable)
  const utils = trpc.useUtils();
  async function reverseGeocodeServer(lat: number, lng: number): Promise<string> {
    try {
      const result = await utils.cities.reverseGeocode.fetch({ lat, lng });
      if (result?.address && !result.address.includes(",")) {
        return result.address;
      }
      // If result looks like coordinates, return fullAddress or formatted
      if (result?.fullAddress) return result.fullAddress;
      if (result?.address) return result.address;
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  const sendOTPMutation = trpc.phoneAuth.sendOTP.useMutation({
    onSuccess: () => {
      setErrorBanner(null); // أخفِ أي خطأ سابق
      setStep("otp");
      toast.success("تم إرسال رمز التحقق");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
      startResendCountdown();
    },
    onError: (e) => {
      // استخراج رمز الخطأ من الرسالة
      const msgMatch = e.message.match(/\[SMS-(\d+)\]/);
      if (msgMatch) {
        const code = parseInt(msgMatch[1]);
        setErrorBanner({ code, message: e.message });
      } else {
        // خطأ عام بدون رمز محدد
        setErrorBanner({ code: 502, message: e.message });
      }
      toast.error(e.message);
    },
  });

  const verifyOTPMutation = trpc.phoneAuth.verifyOTP.useMutation({
    onSuccess: (data) => {
      if ((data as any).token) {
        localStorage.setItem("phone_session_token", (data as any).token);
      }
      setPendingUser(data.user);
      if (!data.user.name) {
        setIsNewUser(true);
        setStep("name");
      } else if (!(data.user as any).pinnedAddressText) {
        setPendingUserId(data.user.id);
        setStep("location");
      } else {
        toast.success(`مرحباً ${data.user.name}!`);
        onSuccess(data.user as any);
        handleClose();
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const setNameMutation = trpc.phoneAuth.setNameById.useMutation({
    onSuccess: () => {
      if (pendingUser && !(pendingUser as any).pinnedAddressText) {
        setPendingUserId(pendingUser.id);
        setStep("location");
      } else {
        toast.success("تم حفظ بياناتك بنجاح!");
        if (pendingUser) onSuccess({ ...pendingUser, name, termsAccepted: (pendingUser as any).termsAccepted } as any);
        handleClose();
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const updateProfileMutation = trpc.phoneAuth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ عنوانك بنجاح!");
      // Invalidate phoneAuth.me so ProfileView gets fresh data
      utils.phoneAuth.me.invalidate();
      if (pendingUser) {
        // Pass the saved address data so phoneUser gets updated immediately
        onSuccess({
          ...pendingUser,
          name: name || pendingUser.name,
          pinnedAddressText: addressText,
          pinnedAddressLat: addressLat != null ? String(addressLat) : undefined,
          pinnedAddressLng: addressLng != null ? String(addressLng) : undefined,
          termsAccepted: (pendingUser as any).termsAccepted, // مهم: لمنع ظهور شاشة الشروط عند كل دخول
        } as any);
      }
      handleClose();
    },
    onError: (e) => toast.error(e.message),
  });

  // Start 60s countdown for resend OTP
  function startResendCountdown() {
    setResendCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleClose() {
    setStep("phone");
    setPhone("");
    setOtp(["", "", "", "", "", ""]);
    setName("");
    setIsNewUser(false);
    setPendingUserId(null);
    setPendingUser(null);
    setAddressText("");
    setAddressLat(null);
    setAddressLng(null);
    setShowMap(false);
    setMapPin(null);
    setResendCountdown(0);
    setErrorBanner(null); // إعادة تعيين بانر الخطأ
    if (countdownRef.current) clearInterval(countdownRef.current);
    onClose();
  }

  function handlePhoneSubmit() {
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned.length < 4) return toast.error("أدخل رقم جوال صحيح");
    sendOTPMutation.mutate({ phone: cleaned, role });
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    const maxIndex = role === "driver" ? 5 : 4;
    if (value && index < maxIndex) otpRefs.current[index + 1]?.focus();
    const filledCount = role === "driver" ? 6 : 5;
    if (newOtp.slice(0, filledCount).every(d => d !== "")) {
      setTimeout(() => {
        verifyOTPMutation.mutate({
          phone: phone.replace(/\s/g, ""),
          otp: newOtp.slice(0, filledCount).join(""),
          role,
        });
      }, 200);
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasteLen = role === "driver" ? 6 : 5;
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, pasteLen);
    if (pasted.length === pasteLen) {
      const newOtp = [...pasted.split(""), ...Array(6 - pasteLen).fill("")];
      setOtp(newOtp);
      otpRefs.current[pasteLen - 1]?.focus();
      setTimeout(() => {
        verifyOTPMutation.mutate({
          phone: phone.replace(/\s/g, ""),
          otp: pasted,
          role,
        });
      }, 200);
    }
  }

  async function handleLocateMe() {
    if (!navigator.geolocation) return toast.error("المتصفح لا يدعم تحديد الموقع");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapPin({ lat, lng });
        setAddressLat(lat);
        setAddressLng(lng);
        // Use server-side reverse geocoding (reliable)
        const address = await reverseGeocodeServer(lat, lng);
        setAddressText(address);
        // Update map center if open
        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(16);
          if (markerRef.current) {
            markerRef.current.position = { lat, lng };
          }
        }
        toast.success("تم تحديد موقعك");
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        toast.error("تعذّر تحديد موقعك، يرجى السماح بالوصول للموقع");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const handleMapReady = useCallback((map: any) => {
    mapRef.current = map;
    const center = mapPin || { lat: 24.7136, lng: 46.6753 };
    map.setCenter(center);
    map.setZoom(mapPin ? 16 : 12);

    const marker = new (window as any).google.maps.marker.AdvancedMarkerElement({
      map,
      position: center,
      title: "موقع التوصيل",
      gmpDraggable: true,
    });
    markerRef.current = marker;

    // Click on map to move marker
    map.addListener("click", async (e: any) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.position = { lat, lng };
      setMapPin({ lat, lng });
      setAddressLat(lat);
      setAddressLng(lng);
      setIsGeocodingMap(true);
      // Use server-side reverse geocoding
      const address = await reverseGeocodeServer(lat, lng);
      setAddressText(address);
      setIsGeocodingMap(false);
    });

    // Drag end on marker
    marker.addListener("dragend", async () => {
      const pos = marker.position as any;
      if (!pos) return;
      const lat = typeof pos.lat === "function" ? (pos.lat as any)() : pos.lat;
      const lng = typeof pos.lng === "function" ? (pos.lng as any)() : pos.lng;
      setMapPin({ lat, lng });
      setAddressLat(lat);
      setAddressLng(lng);
      setIsGeocodingMap(true);
      const address = await reverseGeocodeServer(lat, lng);
      setAddressText(address);
      setIsGeocodingMap(false);
    });
  }, []);

  function handleSaveLocation() {
    if (!addressText.trim()) return toast.error("يرجى تحديد موقعك أولاً");
    updateProfileMutation.mutate({
      pinnedAddressText: addressText,
      pinnedAddressLat: addressLat != null ? String(addressLat) : undefined,
      pinnedAddressLng: addressLng != null ? String(addressLng) : undefined,
    });
  }

  function handleSkipLocation() {
    if (pendingUser) onSuccess({ ...pendingUser, name: name || pendingUser.name } as any);
    handleClose();
  }

  const stepTitle: Record<Step, string> = {
    phone: title ?? "تسجيل الدخول",
    otp: "رمز التحقق",
    name: "أكمل ملفك الشخصي",
    location: "موقع التوصيل",
  };
  const stepSubtitle: Record<Step, string> = {
    phone: "أدخل رقم جوالك للمتابعة",
    otp: role === "driver" ? `استخدم الرمز الثابت 000000 للدخول` : `أُرسل رمز مكوّن من 5 أرقام إلى ${phone}`,
    name: "أدخل اسمك لإكمال التسجيل",
    location: "حدد موقعك مرة واحدة ونحفظه لك",
  };
  const stepIcon: Record<Step, React.ReactNode> = {
    phone: <Phone className="w-7 h-7 text-white" />,
    otp: <ShieldCheck className="w-7 h-7 text-white" />,
    name: <CheckCircle2 className="w-7 h-7 text-white" />,
    location: <MapPin className="w-7 h-7 text-white" />,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-sm rounded-3xl p-0 overflow-hidden border-0 shadow-2xl customer-theme"
        dir="rtl"
        style={showMap && step === "location" ? { maxWidth: "95vw", width: "95vw" } : {}}
      >
        {/* ─── بانر رمز الخطأ — يظهر في أعلى الصفحة ─── */}
        {errorBanner && (
          <div
            className="flex items-start gap-2 px-4 py-3 text-sm font-semibold"
            style={{
              background: "#fef2f2",
              borderBottom: "1px solid #fecaca",
              color: "#b91c1c",
              direction: "rtl",
            }}
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#dc2626" }} />
            <div className="flex-1">
              <span className="font-black" style={{ color: "#7f1d1d" }}>
                خطأ {errorBanner.code}
              </span>
              <span className="mr-1">— {errorBanner.message.replace(/\[SMS-\d+\]\s*/, "")}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="shrink-0 hover:opacity-70 transition-opacity"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" style={{ color: "#b91c1c" }} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-primary px-6 pt-8 pb-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            {stepIcon[step]}
          </div>
          <DialogTitle className="text-xl font-black text-white">{stepTitle[step]}</DialogTitle>
          <p className="text-white/80 text-sm mt-1">{stepSubtitle[step]}</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Step 1: Phone */}
          {step === "phone" && (
            <>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">+966</span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handlePhoneSubmit()}
                  placeholder="05XXXXXXXX"
                  className="pr-14 h-12 rounded-2xl text-center font-mono text-lg tracking-widest border-2 focus:border-primary"
                  autoFocus
                  dir="ltr"
                />
              </div>
              <Button
                className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-base"
                onClick={handlePhoneSubmit}
                disabled={sendOTPMutation.isPending}
              >
                {sendOTPMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : null}
                إرسال رمز التحقق
              </Button>
            </>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <>
              <div className="flex gap-2 justify-center" dir="ltr">
                {otp.slice(0, role === "driver" ? 6 : 5).map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    className="w-10 h-14 text-center text-xl font-bold rounded-2xl border-2 border-border focus:border-primary focus:outline-none bg-background text-foreground transition-colors"
                  />
                ))}
              </div>
              {verifyOTPMutation.isPending && (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">جاري التحقق...</span>
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                {resendCountdown > 0 ? (
                  <p className="text-muted-foreground text-sm text-center">
                    يمكن إعادة الإرسال خلال <span className="font-bold text-primary">{resendCountdown}</span> ثانية
                  </p>
                ) : (
                  <button
                    className="text-primary text-sm font-semibold hover:underline"
                    onClick={() => {
                      const cleaned = phone.replace(/\s/g, "");
                      sendOTPMutation.mutate({ phone: cleaned, role });
                    }}
                    disabled={sendOTPMutation.isPending}
                  >
                    {sendOTPMutation.isPending ? (
                      <span className="flex items-center gap-1 justify-center">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        جاري الإرسال...
                      </span>
                    ) : "إعادة إرسال الرمز"}
                  </button>
                )}
                <button
                  className="text-muted-foreground text-sm text-center hover:underline"
                  onClick={() => setStep("phone")}
                >
                  ← تغيير رقم الجوال
                </button>
              </div>
            </>
          )}

          {/* Step 3: Name */}
          {step === "name" && (
            <>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && name.trim()) {
                    const userId = verifyOTPMutation.data?.user?.id;
                    if (userId) setNameMutation.mutate({ userId, name: name.trim() });
                  }
                }}
                placeholder="محمد أحمد"
                className="h-12 rounded-2xl border-2 focus:border-primary text-center text-lg"
                autoFocus
              />
              <Button
                className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-base"
                onClick={() => {
                  const userId = verifyOTPMutation.data?.user?.id;
                  if (userId) setNameMutation.mutate({ userId, name: name.trim() });
                }}
                disabled={!name.trim() || setNameMutation.isPending}
              >
                {setNameMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : null}
                التالي
              </Button>
              <button
                className="w-full text-muted-foreground text-sm text-center hover:underline"
                onClick={() => {
                  if (pendingUser) {
                    setPendingUserId(pendingUser.id);
                    setStep("location");
                  }
                }}
              >
                تخطي الآن
              </button>
            </>
          )}

          {/* Step 4: Location (one-time setup) */}
          {step === "location" && (
            <>
              {/* Map view */}
              {showMap ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30">
                    <MapView
                      className="w-full h-64"
                      initialCenter={mapPin || { lat: 24.7136, lng: 46.6753 }}
                      initialZoom={mapPin ? 16 : 12}
                      onMapReady={handleMapReady}
                    />
                    {isGeocodingMap && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-2xl">
                        <div className="bg-white rounded-xl px-4 py-2 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-sm font-medium text-foreground">جاري تحديد العنوان...</span>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => setShowMap(false)}
                        className="bg-white rounded-xl px-3 py-1.5 text-xs font-bold text-foreground shadow-md border border-border"
                      >
                        ← رجوع
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs text-muted-foreground shadow-md">
                        انقر على الخريطة لتحديد موقعك
                      </div>
                    </div>
                  </div>

                  {/* Address from map */}
                  {addressText && (
                    <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-primary font-medium mb-0.5">الموقع المحدد</p>
                        <p className="text-sm text-foreground font-semibold leading-snug">{addressText}</p>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-base"
                    onClick={handleSaveLocation}
                    disabled={!addressText.trim() || isGeocodingMap || updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : null}
                    تأكيد هذا الموقع
                  </Button>
                </div>
              ) : (
                <>
                  {/* Info card */}
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
                    <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-foreground font-semibold mb-1">حدد موقع توصيلك</p>
                    <p className="text-xs text-muted-foreground">سيُستخدم هذا الموقع تلقائياً في كل طلباتك القادمة</p>
                  </div>

                  {/* Address display */}
                  {addressText ? (
                    <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-2xl p-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-primary font-medium mb-0.5">الموقع المحدد</p>
                        <p className="text-sm text-foreground font-semibold leading-snug">{addressText}</p>
                      </div>
                    </div>
                  ) : null}

                  {/* GPS button */}
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-2xl border-2 border-primary/30 text-primary font-bold"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <Loader2 className="w-5 h-5 animate-spin ml-2" />
                    ) : (
                      <Locate className="w-5 h-5 ml-2" />
                    )}
                    {isLocating ? "جاري التحديد والترجمة..." : "تحديد موقعي تلقائياً"}
                  </Button>

                  {/* Map picker button */}
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-2xl border-2 border-border text-foreground font-bold"
                    onClick={() => setShowMap(true)}
                  >
                    <Map className="w-5 h-5 ml-2 text-primary" />
                    اختر من الخريطة
                  </Button>

                  <Button
                    className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-base"
                    onClick={handleSaveLocation}
                    disabled={!addressText.trim() || updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : null}
                    حفظ الموقع والمتابعة
                  </Button>
                  <button
                    className="w-full text-muted-foreground text-sm text-center hover:underline"
                    onClick={handleSkipLocation}
                  >
                    تخطي وتحديده لاحقاً
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
