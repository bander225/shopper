import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending:         { label: "في الانتظار",       className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  confirmed:       { label: "مؤكد",              className: "bg-blue-100 text-blue-800 border-blue-200" },
  preparing:       { label: "قيد التحضير",       className: "bg-orange-100 text-orange-800 border-orange-200" },
  ready:           { label: "جاهز",              className: "bg-purple-100 text-purple-800 border-purple-200" },
  driver_assigned: { label: "تم تعيين مندوب",   className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  picked_up:       { label: "تم الاستلام",       className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  on_the_way:      { label: "في الطريق إليك",   className: "bg-teal-100 text-teal-800 border-teal-200" },
  delivered:       { label: "تم التوصيل ✓",     className: "bg-green-100 text-green-800 border-green-200" },
  cancelled:       { label: "ملغي",              className: "bg-red-100 text-red-800 border-red-200" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-800" };
  return (
    <Badge variant="outline" className={`text-xs font-medium px-2 py-0.5 ${info.className}`}>
      {info.label}
    </Badge>
  );
}

export function getStatusLabel(status: string): string {
  return STATUS_MAP[status]?.label ?? status;
}

// WhatsApp contact button
export function WhatsAppButton({ phone, message }: { phone: string; message?: string }) {
  const cleanPhone = phone.replace(/\D/g, "");
  const waNumber = cleanPhone.startsWith("0") ? "966" + cleanPhone.slice(1) : cleanPhone;
  const encodedMsg = encodeURIComponent(message ?? "مرحباً، لدي استفسار حول طلبي");
  const url = `https://wa.me/${waNumber}?text=${encodedMsg}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white text-sm shadow-sm hover:shadow-md transition-all"
      style={{ backgroundColor: "#25D366" }}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      تواصل مع المندوب
    </a>
  );
}
