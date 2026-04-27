import { Separator } from "@/components/ui/separator";

export default function Privacy() {
  const lastUpdated = "1 أبريل 2026";

  return (
    <div className="min-h-screen bg-white font-sans" dir="rtl">
      {/* Header */}
      <div className="border-b py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">سياسة الخصوصية والشروط</h1>
          <p className="text-sm text-gray-500">منصة شوبر للتوصيل — آخر تحديث: {lastUpdated}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8 text-gray-800 leading-relaxed">

        {/* مقدمة */}
        <section>
          <p>
            تلتزم منصة <strong>شوبر للتوصيل</strong> بحماية خصوصية مستخدميها وبياناتهم الشخصية وفقاً لأحكام نظام حماية البيانات الشخصية في المملكة العربية السعودية. تشرح هذه السياسة كيفية جمع بياناتك واستخدامها وحمايتها.
          </p>
        </section>

        <Separator />

        {/* البيانات التي نجمعها */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">البيانات التي نجمعها</h2>
          <ul className="space-y-2 text-gray-700">
            <li><strong>رقم الجوال:</strong> لتسجيل الدخول والتحقق من الهوية فقط</li>
            <li><strong>الاسم:</strong> لتخصيص تجربتك وتسهيل التواصل</li>
            <li><strong>عنوان التوصيل:</strong> لإتمام عملية التوصيل إلى موقعك</li>
            <li><strong>بيانات الطلبات:</strong> لمعالجة طلباتك وتتبعها وحل أي نزاعات</li>
            <li><strong>الموقع الجغرافي:</strong> لتحديد أقرب مندوب وحساب رسوم التوصيل</li>
          </ul>
        </section>

        <Separator />

        {/* حماية البيانات */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">كيف نحمي بياناتك</h2>
          <ul className="space-y-2 text-gray-700 list-disc list-inside">
            <li>تشفير جميع البيانات أثناء النقل باستخدام بروتوكول HTTPS/TLS</li>
            <li>تخزين البيانات في خوادم آمنة مع نسخ احتياطية منتظمة</li>
            <li>تقييد الوصول إلى البيانات الشخصية للموظفين المخولين فقط</li>
            <li>عدم مشاركة بياناتك مع أطراف ثالثة إلا بموافقتك أو بموجب أمر قضائي</li>
            <li>حذف البيانات عند طلبك وفق الإجراءات المعتمدة</li>
          </ul>
        </section>

        <Separator />

        {/* الشروط والأحكام */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">الشروط والأحكام</h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">1. استخدام الخدمة</h3>
              <p>باستخدامك لمنصة شوبر، فإنك توافق على الالتزام بهذه الشروط. يجب أن تكون بالغاً (18 سنة فأكثر) لاستخدام الخدمة.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">2. إفصاح محتوى الطلب</h3>
              <p>أنت تقر بأن محتويات طلبك مشروعة وغير مخالفة للأنظمة والقوانين المعمول بها. تتحمل المسؤولية الكاملة عن أي محتوى مخالف.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">3. الدفع والأسعار</h3>
              <p>الأسعار المعروضة شاملة لرسوم التوصيل. يحق للمنصة تعديل الأسعار مع إشعار مسبق.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">4. إلغاء الطلبات</h3>
              <p>يمكن إلغاء الطلب قبل قبوله من المندوب. بعد القبول، قد يُطبَّق رسم إلغاء حسب السياسة المعمول بها.</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* التزامنا عند الخطأ */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">التزامنا عند حدوث خطأ</h2>
          <ul className="space-y-2 text-gray-700 list-disc list-inside">
            <li>تحمّل المسؤولية الكاملة إذا ثبت وجود خطأ من جانب المنصة أو المندوب</li>
            <li>تعويض العميل بشكل عادل سواء بإعادة المبلغ أو تقديم خدمة بديلة</li>
            <li>توضيح سبب الخطأ بشفافية كاملة واتخاذ الإجراءات اللازمة لمنع تكراره</li>
            <li>الرد على جميع الشكاوى خلال 24 ساعة ومعالجتها خلال 72 ساعة كحد أقصى</li>
          </ul>
        </section>

        <Separator />

        {/* ممنوع */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">ما هو ممنوع</h2>
          <ul className="space-y-2 text-gray-700 list-disc list-inside">
            <li>تسريب أو مشاركة بيانات المستخدمين بدون إذن</li>
            <li>استخدام المنصة لأغراض غير مشروعة</li>
            <li>انتحال هوية شخص آخر</li>
            <li>توصيل مواد مخالفة للأنظمة أو الآداب العامة</li>
            <li>إساءة استخدام نظام الشكاوى أو التقييمات</li>
          </ul>
        </section>

        <Separator />

        {/* التواصل */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">التواصل بشأن الخصوصية</h2>
          <p className="text-gray-700 mb-2">لأي استفسار بشأن سياسة الخصوصية أو طلب حذف بياناتك:</p>
          <p className="text-gray-700">البريد الإلكتروني: <span className="font-medium">privacy@shopper.to</span></p>
          <p className="text-gray-700 mt-1">دعم العملاء — متاح 24 ساعة</p>
        </section>

        <div className="pt-4 pb-8 text-center text-xs text-gray-400">
          Shopper © 2026 — جميع الحقوق محفوظة
        </div>

      </div>
    </div>
  );
}
