import { FileText, CheckCircle, AlertTriangle, ShoppingBag, CreditCard, Star, ChevronRight, XCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function Terms() {
  const [, navigate] = useLocation();
  const lastUpdated = "1 أبريل 2026";

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      {/* Header */}
      <div style={{ background: "#7c3aed" }} className="text-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate("/customer")}
            className="flex items-center gap-2 text-purple-200 hover:text-white mb-6 transition-colors text-sm"
          >
            <ChevronRight className="w-4 h-4" />
            العودة
          </button>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-2xl p-3">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">شروط وأحكام الاستخدام</h1>
              <p className="text-purple-200 text-sm mt-1">منصة شوبر للتوصيل — آخر تحديث: {lastUpdated}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* مقدمة */}
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
          <p className="text-purple-800 text-sm leading-relaxed">
            تمثل هذه الشروط اتفاقاً رسمياً بين <strong>منصة شوبر</strong> وبينك كمستخدم. باستخدامك للمنصة، فإنك توافق على الالتزام بجميع الشروط الواردة أدناه. إذا كنت لا توافق على أي منها، يُرجى التوقف عن استخدام الخدمة.
          </p>
        </div>

        {/* أحقية الاستخدام */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 text-purple-700 rounded-xl p-2">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-gray-800">أحقية الحصول على الخدمة</h2>
          </div>
          <div className="space-y-3">
            {[
              "أن تكون بالغاً (18 سنة فأكثر)",
              "ألا يكون حسابك قد أُوقف أو حُظر مسبقاً",
              "ألا تكون منافساً مباشراً لمنصة شوبر",
              "أن تمتلك الأهلية القانونية الكاملة للتعاقد",
              "ألا تكون عليك سوابق تتعلق بالاحتيال أو الغش",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
                <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                <span className="text-gray-700 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* التعهدات */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 text-purple-700 rounded-xl p-2">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-gray-800">التزاماتك كمستخدم</h2>
          </div>
          <div className="space-y-3">
            {[
              "الامتثال لجميع الأنظمة واللوائح المعمول بها في المملكة العربية السعودية",
              "تقديم معلومات صحيحة ودقيقة وتحديثها بشكل دوري",
              "استخدام المنصة لأغراض مشروعة فقط",
              "عدم مضايقة أو إزعاج المندوبين أو موظفي المنصة",
              "المحافظة على سرية بيانات حسابك وعدم مشاركتها",
              "الدفع الفوري لقيمة الخدمات عند الاستلام",
              "عدم محاولة اختراق أو تعطيل المنصة بأي شكل",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
                <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                <span className="text-gray-700 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* الممنوعات */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 text-red-700 rounded-xl p-2">
              <XCircle className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-gray-800">المواد والخدمات الممنوعة</h2>
          </div>
          <p className="text-gray-600 text-sm mb-3">يُحظر توصيل أو طلب أي من المواد التالية عبر المنصة:</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              "المسكرات والكحول",
              "المخدرات وما في حكمها",
              "الأسلحة والذخيرة",
              "المواد الإباحية",
              "السلع المقلدة والمزورة",
              "الحيوانات المهددة بالانقراض",
              "المواد المتفجرة والخطرة",
              "الأعضاء البشرية",
              "السلع المسروقة",
              "الأدوية غير المرخصة",
              "مواد القرصنة الإلكترونية",
              "الأشياء التي تتجاوز قيمتها 5,000 ريال",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded-xl">
                <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                <span className="text-gray-700 text-xs">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-3 bg-red-50 p-3 rounded-xl">
            تحتفظ شوبر بالحق في رفض أي طلب يشتبه في احتوائه على مواد ممنوعة، وإغلاق حساب المخالف نهائياً.
          </p>
        </div>

        {/* الدفع */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 text-purple-700 rounded-xl p-2">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-gray-800">الدفع والأسعار</h2>
          </div>
          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>يتوجب عليك دفع قيمة الخدمات والمشتريات فور تسليمها، نقداً أو عبر وسائل الدفع الإلكترونية المعتمدة.</p>
            <p>تحتفظ شوبر بالحق في تعديل أسعار الخدمات مع إشعار مسبق للمستخدمين.</p>
            <p className="bg-purple-50 p-3 rounded-xl text-purple-800 font-medium">
              يُحظر حظر العميل في حال عدم الدفع، ولن يُرفع الحظر إلا بعد سداد المبالغ المستحقة.
            </p>
          </div>
        </div>

        {/* التقييمات */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 text-purple-700 rounded-xl p-2">
              <Star className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-gray-800">التقييمات والشكاوى</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
            <p>يحق لك تقييم الخدمة والمندوب بشكل صادق وموضوعي.</p>
            <p>يُمنع تقديم تقييمات كيدية أو مزورة أو مضللة.</p>
            <p>يحق لك تقديم شكوى رسمية خلال 48 ساعة من استلام الطلب، وسيتم الرد عليها خلال 24 ساعة.</p>
          </div>
        </div>

        {/* الملكية الفكرية */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 text-purple-700 rounded-xl p-2">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-gray-800">الملكية الفكرية</h2>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            جميع حقوق الملكية الفكرية لمنصة شوبر — بما في ذلك الشعار والتصميم والكود البرمجي والمحتوى — هي ملك حصري لشوبر. يُحظر نسخ أو توزيع أو إعادة استخدام أي جزء من المنصة دون إذن كتابي مسبق.
          </p>
        </div>

        {/* التعديلات */}
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
          <h2 className="font-bold text-purple-800 mb-2">تعديل الشروط</h2>
          <p className="text-purple-700 text-sm leading-relaxed">
            تحتفظ شوبر بحق تعديل هذه الشروط في أي وقت. سيتم إشعارك بأي تغييرات جوهرية عبر التطبيق. استمرارك في استخدام المنصة بعد نشر التعديلات يُعدّ موافقةً ضمنية عليها.
          </p>
        </div>

        {/* القانون المعمول به */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-2">القانون المعمول به</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            تخضع هذه الشروط لأنظمة المملكة العربية السعودية. أي نزاعات تنشأ عن استخدام المنصة تُحسم أمام المحاكم المختصة في المملكة العربية السعودية.
          </p>
        </div>

        <p className="text-center text-gray-400 text-xs pb-8">
          © {new Date().getFullYear()} شوبر للتوصيل — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
