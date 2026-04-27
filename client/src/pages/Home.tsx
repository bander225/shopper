import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft } from "lucide-react";

// الشعار الجديد — بنفسجي + دبوس O + سهم أخضر
const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/115452271/NK9L9naBDDKkTQDnwgY78j/shopper-logo-transparent-final_911dcdb1.png";

// ─── Splash Screen ─────────────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  // مراحل الأنيميشن
  const [phase, setPhase] = useState<"idle" | "pinDrop" | "logoReveal" | "tagline" | "bar" | "exit">("idle");

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("pinDrop"),    150),   // الدبوس ينزل
      setTimeout(() => setPhase("logoReveal"), 900),   // الشعار يظهر كاملاً
      setTimeout(() => setPhase("tagline"),    1700),  // الشعار الفرعي
      setTimeout(() => setPhase("bar"),        2200),  // شريط التحميل
      setTimeout(() => setPhase("exit"),       3400),  // fade out
    ];
    const done = setTimeout(() => onDone(), 4050);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [onDone]);

  const pinVisible    = ["pinDrop","logoReveal","tagline","bar","exit"].includes(phase);
  const logoVisible   = ["logoReveal","tagline","bar","exit"].includes(phase);
  const taglineVis    = ["tagline","bar","exit"].includes(phase);
  const barVis        = ["bar","exit"].includes(phase);
  const exiting       = phase === "exit";

  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: Math.random() * 6 + 3,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${3 + Math.random() * 4}s`,
    color: i % 3 === 0 ? "rgba(124,58,237,0.12)" : i % 3 === 1 ? "rgba(124,58,237,0.08)" : "rgba(99,102,241,0.08)",
  }));

  return (
    <div
      dir="ltr"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#ffffff",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        opacity: exiting ? 0 : 1,
        transition: exiting ? "opacity 0.65s cubic-bezier(0.4,0,0.2,1)" : "none",
      }}
    >
      {/* Soft blobs */}
      <div style={{ position:"absolute", top:"-15%", right:"-8%", width:"60vw", height:"60vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)", animation:"blobFloat 9s ease-in-out infinite alternate", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"-15%", left:"-8%", width:"50vw", height:"50vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)", animation:"blobFloat 11s ease-in-out 2s infinite alternate-reverse", pointerEvents:"none" }} />

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{ position:"absolute", width:p.size, height:p.size, top:p.top, left:p.left, borderRadius:"50%", background:p.color, animationName:"particleFloat", animationDuration:p.duration, animationDelay:p.delay, animationIterationCount:"infinite", animationTimingFunction:"ease-in-out", animationDirection:"alternate", pointerEvents:"none" }} />
      ))}

      {/* ── الدبوس ينزل أولاً ── */}
      <div style={{
        opacity: pinVisible ? 1 : 0,
        transform: pinVisible ? "translateY(0) scale(1)" : "translateY(-80px) scale(0.3)",
        transition: "opacity 0.55s cubic-bezier(0.34,1.56,0.64,1), transform 0.65s cubic-bezier(0.34,1.56,0.64,1)",
        marginBottom: pinVisible && !logoVisible ? "0" : "-28px",
        zIndex: 2,
        filter: "drop-shadow(0 6px 18px rgba(124,58,237,0.4))",
        animation: pinVisible ? "pinBounce 0.6s ease 0.55s 1" : "none",
      }}>
        {/* دبوس SVG بنفسجي مع سهم أخضر — يطابق شعار الشركة */}
        <svg width="72" height="90" viewBox="0 0 72 90" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* دائرة خارجية */}
          <circle cx="36" cy="33" r="30" fill="url(#pinGrad)" />
          {/* حلقة داخلية بيضاء */}
          <circle cx="36" cy="33" r="18" fill="white" />
          {/* سهم أخضر داخل الدائرة */}
          <polygon points="26,38 46,33 26,28" fill="#ffffff" />
          {/* ذيل الدبوس */}
          <path d="M36 62 L27 80 Q36 90 45 80 Z" fill="url(#pinGrad)" />
          {/* بريق */}
          <ellipse cx="26" cy="22" rx="7" ry="4" fill="rgba(255,255,255,0.35)" transform="rotate(-25 26 22)" />
          <defs>
            <linearGradient id="pinGrad" x1="6" y1="3" x2="66" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── الشعار الكامل يظهر بعد الدبوس ── */}
      <div style={{
        opacity: logoVisible ? 1 : 0,
        transform: logoVisible ? "scale(1) translateY(0)" : "scale(0.7) translateY(20px)",
        transition: "opacity 0.5s cubic-bezier(0.34,1.4,0.64,1), transform 0.6s cubic-bezier(0.34,1.4,0.64,1)",
        filter: logoVisible ? "drop-shadow(0 4px 20px rgba(124,58,237,0.25))" : "none",
      }}>
        <img
          src={LOGO_URL}
          alt="Shopper"
          style={{
            width: "clamp(200px, 55vw, 320px)",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      {/* Tagline */}
      <p style={{
        color: "#9ca3af",
        fontSize: "clamp(0.75rem, 2.5vw, 0.88rem)",
        letterSpacing: "0.08em",
        fontFamily: "'Tajawal', sans-serif",
        fontWeight: 500,
        textAlign: "center",
        marginTop: "18px",
        opacity: taglineVis ? 1 : 0,
        transform: taglineVis ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
        direction: "rtl",
      }}>
        توصيل سريع • تتبّع لحظي • خدمة موثوقة
      </p>

      {/* Progress bar */}
      <div style={{
        width: "clamp(120px, 36vw, 180px)", height: "3px",
        borderRadius: "99px", background: "rgba(0,0,0,0.07)",
        overflow: "hidden", marginTop: "20px",
        opacity: barVis ? 1 : 0, transition: "opacity 0.3s ease",
      }}>
        <div style={{
          height: "100%", borderRadius: "99px",
          background: "#7c3aed",
          width: barVis ? "100%" : "0%",
          transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>

      {/* Dots */}
      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#7c3aed",
            opacity: barVis ? 1 : 0,
            animation: barVis ? `dotBounce 1.1s ease-in-out ${i * 0.18}s infinite` : "none",
            transition: "opacity 0.3s ease",
          }} />
        ))}
      </div>

      <style>{`
        @keyframes pinBounce {
          0%   { transform: translateY(0) scale(1); }
          25%  { transform: translateY(-14px) scale(1.12); }
          55%  { transform: translateY(6px) scale(0.94); }
          78%  { transform: translateY(-5px) scale(1.04); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes blobFloat {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(2%,3%) scale(1.07); }
        }
        @keyframes particleFloat {
          from { transform: translateY(0) scale(1); opacity: 0.7; }
          to   { transform: translateY(-18px) scale(1.25); opacity: 0.1; }
        }
        @keyframes dotBounce {
          0%,100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50%      { transform: translateY(-8px) scale(1.35); opacity: 1; }
        }

      `}</style>
    </div>
  );
}

// ─── Home Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [, setLocation] = useLocation();
  const [showSplash, setShowSplash] = useState(true);
  const [pageVisible, setPageVisible] = useState(false);

  const handleSplashDone = () => {
    setShowSplash(false);
    setTimeout(() => setPageVisible(true), 80);
  };

  return (
    <>
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      <div dir="rtl" style={{
        minHeight: "100vh", background: "#f8f5ff",
        opacity: pageVisible ? 1 : 0,
        transform: pageVisible ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.55s ease, transform 0.55s ease",
        fontFamily: "'Tajawal', 'Inter', sans-serif",
      }}>
        {/* Navbar */}
        {/* Hero */}
        <section style={{ minHeight:"calc(100vh - 80px)", padding:"72px 24px 40px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", gap:"28px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:"-60px", left:"50%", transform:"translateX(-50%)", width:"80vw", height:"80vw", maxWidth:"500px", maxHeight:"500px", borderRadius:"50%", background:"radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)", pointerEvents:"none" }} />
          <div style={{ display:"flex", flexDirection:"column", gap:"10px", alignItems:"center" }}>
            <h1 style={{ fontSize:"clamp(2.2rem, 9vw, 3.2rem)", fontWeight:900, color:"#111827", lineHeight:1.15, letterSpacing:"-0.02em" }}>
              أهلاً بك في{"\ "}
              <span style={{ color:"#7c3aed" }}>شوبر</span>
            </h1>
            <p style={{ color:"#6b7280", fontSize:"1.1rem", maxWidth:"300px", lineHeight:1.65 }}>توصيل سريع لباب منزلك — تتبّع طلبك لحظة بلحظة</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"12px", width:"100%", maxWidth:"320px" }}>
            <button onClick={() => setLocation("/customer")} style={{ height:"56px", borderRadius:"16px",background: "#7c3aed", boxShadow:"0 8px 32px rgba(124,58,237,0.35)", color:"#fff", fontWeight:800, fontSize:"1rem", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
              🛒 ابدأ الطلب الآن <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ textAlign:"center", padding:"20px 0 32px", borderTop:"1px solid rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", gap:"6px", alignItems:"center", marginTop:"auto" }}>
          <a href="https://shopper.to" style={{ color:"#7c3aed", fontSize:"0.82rem", fontWeight:600, textDecoration:"none" }}>shopper.to</a>
          <span style={{ color:"#d1d5db", fontSize:"0.72rem" }}>Shopper © {new Date().getFullYear()} — جميع الحقوق محفوظة</span>
        </footer>
      </div>
    </>
  );
}
