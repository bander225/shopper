import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Truck, Lock, User, Eye, EyeOff } from "lucide-react";

interface AdminLoginProps {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.phoneAuth.adminLogin.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الدخول بنجاح");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (err) => {
      toast.error(err.message || "اسم المستخدم أو كلمة المرور غير صحيحة");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    loginMutation.mutate({ username: username.trim(), password: password.trim() });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      dir="rtl"
      style={{
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      }}
    >
      {/* دوائر زخرفية */}
      <div
        className="fixed top-[-80px] right-[-80px] w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.2), transparent)" }}
      />
      <div
        className="fixed bottom-[-60px] left-[-60px] w-56 h-56 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(79,70,229,0.15), transparent)" }}
      />

      <div className="w-full max-w-sm relative">
        {/* الشعار */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              boxShadow: "0 16px 48px rgba(124,58,237,0.5)",
            }}
          >
            <Truck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-widest" style={{background:'linear-gradient(90deg,#e0c3fc,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'0.15em'}}>شوبر</h1>
          <p className="text-purple-300 text-sm mt-1">لوحة التحكم الإدارية</p>
        </div>

        {/* بطاقة الدخول */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1.5px solid rgba(167,139,250,0.2)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(124,58,237,0.2)" }}
            >
              <Lock className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h2 className="font-bold text-white">تسجيل الدخول</h2>
              <p className="text-xs text-purple-400">أدخل بيانات المدير</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* اسم المستخدم */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-purple-200">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="app-input pr-10"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-purple-200">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="app-input pr-10 pl-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="app-btn-primary w-full h-12 text-base mt-2 disabled:opacity-60"
            >
              {loginMutation.isPending ? "جاري الدخول..." : "دخول"}
            </button>
          </form>

          <p className="text-center text-xs text-purple-600 mt-4">
            هذه الصفحة مخصصة للمدير فقط
          </p>
        </div>
      </div>
    </div>
  );
}
