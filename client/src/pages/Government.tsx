import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Shield, Search, FileText, Phone, Mail, Building2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Government() {
  const [orderNumber, setOrderNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const trackQuery = trpc.government.trackOrder.useQuery(
    { orderNumber: searchQuery },
    { enabled: !!searchQuery }
  );

  const handleSearch = () => {
    if (!orderNumber.trim()) {
      toast.error("يرجى إدخال رقم الطلب");
      return;
    }
    setSearchQuery(orderNumber.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="w-16 h-16 opacity-90" />
          </div>
          <h1 className="text-3xl font-bold mb-3">بوابة الجهات الحكومية</h1>
          <p className="text-blue-200 text-lg">
            منصة شوبر للتوصيل — الامتثال التنظيمي والشفافية الكاملة
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* معلومات المنصة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Shield className="w-5 h-5" />
              نبذة عن المنصة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700 leading-relaxed">
            <p>
              <strong>منصة شوبر</strong> هي منصة توصيل طلبات مرخصة تعمل وفق الأنظمة واللوائح المعمول بها في المملكة العربية السعودية. تلتزم المنصة بالشفافية الكاملة مع الجهات الحكومية والرقابية.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-1">الاسم التجاري</p>
                <p className="text-gray-700">منصة شوبر للتوصيل</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-1">نوع النشاط</p>
                <p className="text-gray-700">خدمات التوصيل والشحن</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ما توفره المنصة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <CheckCircle className="w-5 h-5" />
              ما توفره المنصة للجهات الحكومية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "تتبع الطلب المباشر", desc: "تتبع فوري لكل طلب بمعرف فريد وحالة محدّثة لحظياً" },
                { title: "بيانات المندوب", desc: "اسم المندوب، رقم الهوية، رخصة القيادة، بيانات السيارة" },
                { title: "رقم الطلب", desc: "رقم مرجعي فريد لكل طلب يمكن الاستعلام عنه" },
                { title: "حالة الطلب", desc: "تفاصيل كاملة: الاستلام، التوصيل، الإلغاء، التأخير" },
                { title: "سجل العمليات", desc: "أرشيف كامل لجميع الطلبات مع الطوابع الزمنية" },
                { title: "ربط تقني API", desc: "واجهة برمجية للاستعلام الآلي عن الطلبات عند الطلب" },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* استعلام عن طلب */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Search className="w-5 h-5" />
              الاستعلام عن طلب (تتبع مباشر)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              يمكن للجهات الحكومية الاستعلام عن أي طلب بإدخال رقمه المرجعي.
            </p>
            <div className="flex gap-3">
              <Input
                placeholder="أدخل رقم الطلب..."
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="text-right"
                style={{ color: "#000", backgroundColor: "#fff" }}
              />
              <Button onClick={handleSearch} className="bg-blue-700 hover:bg-blue-800 shrink-0">
                <Search className="w-4 h-4 ml-2" />
                بحث
              </Button>
            </div>

            {trackQuery.isLoading && (
              <div className="text-center py-4 text-gray-500">جاري البحث...</div>
            )}

            {trackQuery.data && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 border">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">رقم الطلب: #{trackQuery.data.orderNumber}</h3>
                  <Badge className={
                    trackQuery.data.status === "delivered" ? "bg-green-100 text-green-800" :
                    trackQuery.data.status === "cancelled" ? "bg-red-100 text-red-800" :
                    "bg-blue-100 text-blue-800"
                  }>
                    {trackQuery.data.statusLabel}
                  </Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">اسم المندوب:</span> <span className="font-medium">{trackQuery.data.driverName || "—"}</span></div>
                  <div><span className="text-gray-500">تاريخ الطلب:</span> <span className="font-medium">{trackQuery.data.createdAt}</span></div>
                  <div><span className="text-gray-500">المطعم:</span> <span className="font-medium">{trackQuery.data.restaurantName || "—"}</span></div>
                  <div><span className="text-gray-500">المدينة:</span> <span className="font-medium">{trackQuery.data.city || "—"}</span></div>
                </div>
              </div>
            )}

            {trackQuery.isError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>لم يتم العثور على طلب بهذا الرقم</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* توثيق API */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <FileText className="w-5 h-5" />
              الربط التقني (API) مع الجهات الحكومية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              تتيح المنصة ربطاً تقنياً مباشراً مع الجهات الحكومية عند الطلب الرسمي. يتم تزويد الجهة بمفتاح API خاص وآمن.
            </p>
            <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono text-green-400 overflow-x-auto">
              <p className="text-gray-400 mb-2"># استعلام عن طلب</p>
              <p>GET /api/government/track/:orderNumber</p>
              <p className="mt-2 text-gray-400"># الاستجابة</p>
              <p>{"{"}</p>
              <p className="mr-4">"orderNumber": "12345",</p>
              <p className="mr-4">"status": "delivered",</p>
              <p className="mr-4">"driverName": "محمد أحمد",</p>
              <p className="mr-4">"driverNationalId": "1xxxxxxxxx",</p>
              <p className="mr-4">"vehiclePlate": "أ ب ج 1234",</p>
              <p className="mr-4">"createdAt": "2026-01-01T10:00:00Z",</p>
              <p className="mr-4">"deliveredAt": "2026-01-01T10:45:00Z"</p>
              <p>{"}"}</p>
            </div>
            <p className="text-sm text-gray-500">
              للحصول على مفتاح API الرسمي، يرجى التواصل عبر القنوات الرسمية أدناه.
            </p>
          </CardContent>
        </Card>

        {/* التواصل */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Phone className="w-5 h-5" />
              قنوات التواصل الرسمية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="w-5 h-5 text-blue-700" />
              <div>
                <p className="font-semibold text-gray-900">الهاتف الرسمي</p>
                <p className="text-gray-600 text-sm">متاح خلال أوقات الدوام الرسمي</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-blue-700" />
              <div>
                <p className="font-semibold text-gray-900">البريد الإلكتروني الرسمي</p>
                <p className="text-gray-600 text-sm">gov@shopper.to</p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 mt-2">
              <p className="text-sm text-blue-800">
                <strong>ملاحظة:</strong> جميع الطلبات الحكومية الرسمية يجب أن تكون مكتوبة وموثقة بختم الجهة الحكومية. نلتزم بالرد خلال 24 ساعة عمل.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
