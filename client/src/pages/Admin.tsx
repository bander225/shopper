import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ImageUpload } from "@/components/ImageUpload";
import {
  Building2, ChefHat, Package, Plus, ShoppingBag, Trash2, Truck, Users,
  Star, MapPin, Phone, Eye, EyeOff, Pencil, RefreshCw, UserCheck,
  KeyRound, AlertCircle, Loader2, CheckCircle2, XCircle, BarChart3,
  Store, ChevronRight, Globe, Navigation2, X, Map, Megaphone, Image as ImageIcon, Crosshair, Search,
  MessageSquareWarning, Send, Clock, CheckCheck, ChevronDown
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import AdminLogin from "./AdminLogin";
import { MapView } from "@/components/Map";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار", ready: "جاهز", driver_assigned: "مندوب معيّن",
  preparing: "يُحضَّر", picked_up: "تم الاستلام", on_the_way: "في الطريق",
  delivered: "تم التوصيل", cancelled: "ملغي",
};
const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-900/30 text-yellow-300", ready: "bg-blue-900/30 text-blue-300",
  driver_assigned: "bg-purple-900/30 text-purple-300", preparing: "bg-orange-900/30 text-orange-300",
  picked_up: "bg-indigo-900/30 text-indigo-300", on_the_way: "bg-cyan-900/30 text-cyan-300",
  delivered: "bg-green-900/30 text-green-300", cancelled: "bg-red-900/30 text-red-300",
};
const MAX_ORDERS_OPTIONS = [1, 2, 3, 5, 10, 20, 50];
const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

// ─── Stats Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div className="app-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-black text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// === Restaurants Tab ===
function RestaurantsTab() {
  const { data: restaurants, refetch } = trpc.restaurants.listAll.useQuery();
  const createMutation = trpc.restaurants.create.useMutation({
    onSuccess: () => { refetch(); setOpen(false); toast.success("تم إضافة المطعم"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const updateMutation = trpc.restaurants.update.useMutation({
    onSuccess: () => { refetch(); setOpen(false); toast.success("تم تحديث المطعم"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const deleteMutation = trpc.restaurants.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("تم حذف المطعم"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const toggleMutation = trpc.restaurants.toggleOrders.useMutation({ onSuccess: () => refetch() });
  const setHoursMutation = trpc.restaurants.setHours.useMutation({ onSuccess: () => { toast.success("تم حفظ أوقات العمل"); setHoursOpen(false); } });
  const setDiscountMutation = trpc.restaurants.setDiscount.useMutation({
    onSuccess: () => { refetch(); setDiscountOpen(false); toast.success("تم تحديث الخصم"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const setBagsMutation = trpc.restaurants.setBags.useMutation({
    onSuccess: () => { refetch(); setBagsOpen(false); toast.success("تم تحديث الحافظات"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const [bagsOpen, setBagsOpen] = useState(false);
  const [bagsRestaurant, setBagsRestaurant] = useState<any>(null);
  const [bagsForm, setBagsForm] = useState({ hasHotBag: false, hasColdBag: false });

  function openBags(r: any) {
    setBagsRestaurant(r);
    setBagsForm({ hasHotBag: r.hasHotBag ?? false, hasColdBag: r.hasColdBag ?? false });
    setBagsOpen(true);
  }
  function handleSaveBags() {
    if (!bagsRestaurant) return;
    setBagsMutation.mutate({ id: bagsRestaurant.id, hasHotBag: bagsForm.hasHotBag, hasColdBag: bagsForm.hasColdBag });
  }

  // ── Menu management state ──
  const [menuRestaurant, setMenuRestaurant] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCatFilter, setActiveCatFilter] = useState<number | null>(null);
  const [catName, setCatName] = useState("");
  const [itemOpen, setItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: "", discountPrice: "", imageUrl: "", categoryId: "", isAvailable: true, stockEnabled: false, stockCount: 0 });

  const { data: menuCategories, refetch: refetchCats } = trpc.restaurants.getCategories.useQuery(
    { restaurantId: menuRestaurant?.id! },
    { enabled: !!menuRestaurant }
  );
  const { data: menuItemsList, refetch: refetchItems } = trpc.restaurants.getMenuItems.useQuery(
    { restaurantId: menuRestaurant?.id! },
    { enabled: !!menuRestaurant }
  );
  const createCatMutation = trpc.restaurants.createCategory.useMutation({
    onSuccess: () => { refetchCats(); setCatName(""); toast.success("تمت إضافة الفئة"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCatMutation = trpc.restaurants.deleteCategory.useMutation({
    onSuccess: () => { refetchCats(); refetchItems(); toast.success("تم حذف الفئة"); },
    onError: (e) => toast.error(e.message),
  });
  const createItemMutation = trpc.restaurants.createMenuItem.useMutation({
    onSuccess: (newItem: any) => {
      const { stockEnabled, stockCount } = itemForm;
      if (stockEnabled && newItem?.id) {
        setStockMutation.mutate({ id: newItem.id, stockEnabled, stockCount: Number(stockCount) });
      } else {
        refetchItems();
        setItemOpen(false);
        toast.success("تمت إضافة الصنف");
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const setStockMutation = trpc.restaurants.setMenuItemStock.useMutation({
    onSuccess: () => { refetchItems(); setItemOpen(false); toast.success("تم حفظ الصنف والمخزون"); },
    onError: (e) => toast.error(e.message),
  });
  const updateItemMutation = trpc.restaurants.updateMenuItem.useMutation({
    onSuccess: () => {
      // بعد تحديث بيانات الصنف نحفظ المخزون دائماً
      const { stockEnabled, stockCount } = itemForm;
      setStockMutation.mutate({ id: editItem!.id, stockEnabled, stockCount: Number(stockCount) });
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteItemMutation = trpc.restaurants.deleteMenuItem.useMutation({
    onSuccess: () => { refetchItems(); toast.success("تم حذف الصنف"); },
    onError: (e) => toast.error(e.message),
  });

  const openMenuManager = (r: any) => {
    setMenuRestaurant(r);
    setActiveCatFilter(null);
    setMenuOpen(true);
  };
  const openAddItem = (catId?: number) => {
    setEditItem(null);
    setItemForm({ name: "", description: "", price: "", discountPrice: "", imageUrl: "", categoryId: catId?.toString() ?? "", isAvailable: true, stockEnabled: false, stockCount: 0 });
    setItemOpen(true);
  };
  const openEditItem = (item: any) => {
    setEditItem(item);
    setItemForm({ name: item.name, description: item.description ?? "", price: item.price, discountPrice: item.discountPrice ?? "", imageUrl: item.imageUrl ?? "", categoryId: item.categoryId?.toString() ?? "", isAvailable: item.isAvailable, stockEnabled: item.stockEnabled ?? false, stockCount: item.stockCount ?? 0 });
    setItemOpen(true);
  };
  const handleItemSubmit = () => {
    if (!itemForm.name.trim() || !itemForm.price) { toast.error("الاسم والسعر مطلوبان"); return; }
    if (!menuRestaurant) return;
    const { stockEnabled, stockCount, ...rest } = itemForm;
    const payload = { ...rest, discountPrice: rest.discountPrice || undefined, categoryId: rest.categoryId ? Number(rest.categoryId) : undefined };
    if (editItem) {
      // setStockMutation يُستدعى تلقائياً في onSuccess لـ updateItemMutation
      updateItemMutation.mutate({ id: editItem.id, ...payload }, { onError: (e) => toast.error(e.message) });
    } else {
      createItemMutation.mutate({ restaurantId: menuRestaurant.id, ...payload }, { onError: (e) => toast.error(e.message) });
    }
  };
  const filteredMenuItems = activeCatFilter
    ? menuItemsList?.filter((i: any) => i.categoryId === activeCatFilter)
    : menuItemsList;

  const [open, setOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountRestaurant, setDiscountRestaurant] = useState<any>(null);
  const [discountForm, setDiscountForm] = useState({ discountEnabled: false, discountPercent: 10, discountLabel: "", discountExpiresAt: "" });
  const [editing, setEditing] = useState<any>(null);
  const [hoursRestaurant, setHoursRestaurant] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", addressText: "", phone: "", cuisine: "", googleMapsUrl: "", minOrderAmount: "0", estimatedDeliveryTime: 30, logoUrl: "", menuImageUrl: "", cityId: "", streetId: "", driverAssignMode: "manual" as "manual" | "street" | "nearest" });
  const { data: allCities } = trpc.cities.listActive.useQuery();
  const { data: cityStreets } = trpc.cities.getStreets.useQuery(
    { cityId: Number(form.cityId) },
    { enabled: !!form.cityId && Number(form.cityId) > 0 }
  );
  const [hours, setHours] = useState(Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, isClosed: false, openTime: "09:00", closeTime: "23:00" })));

  const { data: restaurantHours } = trpc.restaurants.getHours.useQuery(
    { restaurantId: hoursRestaurant?.id! },
    { enabled: !!hoursRestaurant }
  );

  useEffect(() => {
    if (restaurantHours && restaurantHours.length > 0) {
      setHours(prev => prev.map((h, i) => {
        const found = restaurantHours.find((r: any) => r.dayOfWeek === i);
        return found ? { dayOfWeek: i, isClosed: found.isClosed, openTime: found.openTime ?? "09:00", closeTime: found.closeTime ?? "23:00" } : h;
      }));
    }
  }, [restaurantHours]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", addressText: "", phone: "", cuisine: "", googleMapsUrl: "", minOrderAmount: "0", estimatedDeliveryTime: 30, logoUrl: "", menuImageUrl: "", cityId: "", streetId: "", driverAssignMode: "manual" });
    setOpen(true);
  };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ name: r.name ?? "", description: r.description ?? "", addressText: r.addressText ?? "", phone: r.phone ?? "", cuisine: r.cuisine ?? "", googleMapsUrl: r.googleMapsUrl ?? "", minOrderAmount: r.minOrderAmount ?? "0", estimatedDeliveryTime: r.estimatedDeliveryTime ?? 30, logoUrl: r.logoUrl ?? "", menuImageUrl: r.menuImageUrl ?? "", cityId: r.cityId ? String(r.cityId) : "", streetId: r.streetId ? String(r.streetId) : "", driverAssignMode: (r as any).driverAssignMode ?? "manual" });
    setOpen(true);
  };
  const openHours = (r: any) => {
    setHoursRestaurant(r);
    setHours(Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, isClosed: false, openTime: "09:00", closeTime: "23:00" })));
    setHoursOpen(true);
  };
  const openDiscount = (r: any) => {
    setDiscountRestaurant(r);
    setDiscountForm({
      discountEnabled: r.discountEnabled ?? false,
      discountPercent: r.discountPercent ?? 10,
      discountLabel: r.discountLabel ?? "",
      discountExpiresAt: r.discountExpiresAt ? new Date(r.discountExpiresAt).toISOString().slice(0, 16) : "",
    });
    setDiscountOpen(true);
  };
  const handleSaveDiscount = () => {
    if (!discountRestaurant) return;
    setDiscountMutation.mutate({
      id: discountRestaurant.id,
      discountEnabled: discountForm.discountEnabled,
      discountPercent: Number(discountForm.discountPercent),
      discountLabel: discountForm.discountLabel || undefined,
      discountExpiresAt: discountForm.discountExpiresAt ? new Date(discountForm.discountExpiresAt) : null,
    });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("اسم المطعم مطلوب"); return; }
    const payload = { ...form, estimatedDeliveryTime: Number(form.estimatedDeliveryTime), cityId: form.cityId ? Number(form.cityId) : undefined, streetId: form.streetId ? Number(form.streetId) : undefined };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload, driverAssignMode: form.driverAssignMode } as any);
    } else {
      createMutation.mutate({ ...payload } as any);
    }
  };

  const handleSaveHours = () => {
    if (!hoursRestaurant) return;
    setHoursMutation.mutate({ restaurantId: hoursRestaurant.id, hours });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-foreground">المطاعم ({restaurants?.length ?? 0})</h2>
        <Button onClick={openAdd} className="bg-primary text-white rounded-xl gap-2"><Plus className="w-4 h-4" />إضافة مطعم</Button>
      </div>

      {/* ── قسم المطاعم المفعّلة ── */}
      {restaurants?.filter(r => r.isAcceptingOrders).length! > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <h3 className="font-bold text-green-400 text-sm">مفعّلة ويستقبل طلبات ({restaurants?.filter(r => r.isAcceptingOrders).length ?? 0})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {restaurants?.filter(r => r.isAcceptingOrders).map(r => (
              <div key={r.id} className="app-card overflow-hidden border-2 border-green-500/20">
                <div className="flex items-start gap-3 p-4">
                  {r.logoUrl ? (
                    <img src={r.logoUrl} alt={r.name} className="w-14 h-14 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Store className="w-7 h-7 text-primary" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground truncate">{r.name}</span>
                      <Badge className="bg-green-900/30 text-green-300 border-0 text-xs">يستقبل</Badge>
                      {(r as any).driverAssignMode === "nearest" && <Badge className="bg-blue-900/30 text-blue-300 border-0 text-xs">📍 أقرب</Badge>}
                      {(r as any).driverAssignMode === "street" && <Badge className="bg-purple-900/30 text-purple-300 border-0 text-xs">🚦 شارع</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 truncate">{r.addressText}</div>
                    <div className="text-xs text-muted-foreground/70">{r.cuisine}{r.phone && ` · ${r.phone}`}</div>
                  </div>
                </div>
                <div className="border-t border-white/5 px-4 py-3 flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)} className="rounded-lg gap-1 text-xs"><Pencil className="w-3 h-3" />تعديل</Button>
                  <Button size="sm" variant="outline" onClick={() => openMenuManager(r)} className="rounded-lg gap-1 text-xs text-purple-600 border-purple-200">
                    <ChefHat className="w-3 h-3" />إدارة المنيو
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openHours(r)} className="rounded-lg gap-1 text-xs text-blue-600 border-blue-200">أوقات العمل</Button>
                  <Button size="sm" variant="outline" onClick={() => openDiscount(r)} className={`rounded-lg gap-1 text-xs ${(r as any).discountEnabled ? "text-orange-500 border-orange-300" : "text-muted-foreground"}`}>
                    🏷️ {(r as any).discountEnabled ? `${(r as any).discountPercent}% خصم` : "خصم"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openBags(r)} className={`rounded-lg gap-1 text-xs ${(r as any).hasHotBag || (r as any).hasColdBag ? "text-blue-600 border-blue-300" : "text-muted-foreground"}`}>
                    🎒 حافظات
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: r.id, isAcceptingOrders: false })} className="rounded-lg gap-1 text-xs text-red-600 border-red-200">
                    <EyeOff className="w-3 h-3" />إيقاف
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm("حذف المطعم؟")) deleteMutation.mutate({ id: r.id }); }} className="rounded-lg gap-1 text-xs text-red-600 border-red-200"><Trash2 className="w-3 h-3" />حذف</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── قسم المطاعم الموقوفة ── */}
      {restaurants?.filter(r => !r.isAcceptingOrders).length! > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <h3 className="font-bold text-red-400 text-sm">موقوفة / لا تستقبل طلبات ({restaurants?.filter(r => !r.isAcceptingOrders).length ?? 0})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {restaurants?.filter(r => !r.isAcceptingOrders).map(r => (
              <div key={r.id} className="app-card overflow-hidden opacity-80">
                <div className="flex items-start gap-3 p-4">
                  {r.logoUrl ? (
                    <img src={r.logoUrl} alt={r.name} className="w-14 h-14 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Store className="w-7 h-7 text-primary" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground truncate">{r.name}</span>
                      <Badge className="bg-red-900/30 text-red-300 border-0 text-xs">موقوف</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 truncate">{r.addressText}</div>
                    <div className="text-xs text-muted-foreground/70">{r.cuisine}{r.phone && ` · ${r.phone}`}</div>
                  </div>
                </div>
                <div className="border-t border-white/5 px-4 py-3 flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)} className="rounded-lg gap-1 text-xs"><Pencil className="w-3 h-3" />تعديل</Button>
                  <Button size="sm" variant="outline" onClick={() => openMenuManager(r)} className="rounded-lg gap-1 text-xs text-purple-600 border-purple-200">
                    <ChefHat className="w-3 h-3" />إدارة المنيو
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openHours(r)} className="rounded-lg gap-1 text-xs text-blue-600 border-blue-200">أوقات العمل</Button>
                  <Button size="sm" variant="outline" onClick={() => openDiscount(r)} className={`rounded-lg gap-1 text-xs ${(r as any).discountEnabled ? "text-orange-500 border-orange-300" : "text-muted-foreground"}`}>
                    🏷️ {(r as any).discountEnabled ? `${(r as any).discountPercent}% خصم` : "خصم"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openBags(r)} className={`rounded-lg gap-1 text-xs ${(r as any).hasHotBag || (r as any).hasColdBag ? "text-blue-600 border-blue-300" : "text-muted-foreground"}`}>
                    🎒 حافظات
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: r.id, isAcceptingOrders: true })} className="rounded-lg gap-1 text-xs text-green-600 border-green-200">
                    <Eye className="w-3 h-3" />تفعيل
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm("حذف المطعم؟")) deleteMutation.mutate({ id: r.id }); }} className="rounded-lg gap-1 text-xs text-red-600 border-red-200"><Trash2 className="w-3 h-3" />حذف</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── رسالة فارغة إذا لم توجد مطاعم ── */}
      {(!restaurants || restaurants.length === 0) && (
        <div className="text-center py-16 text-muted-foreground/70 app-card">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد مطاعم بعد. اضغط "إضافة مطعم" للبدء.</p>
        </div>
      )}

      {/* Discount Dialog */}
      <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>🏷️ إعداد الخصم — {discountRestaurant?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <span className="font-semibold text-sm">تفعيل الخصم</span>
              <button
                type="button"
                onClick={() => setDiscountForm(p => ({ ...p, discountEnabled: !p.discountEnabled }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${discountForm.discountEnabled ? "bg-orange-500" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${discountForm.discountEnabled ? "right-0.5" : "left-0.5"}`} />
              </button>
            </div>
            {discountForm.discountEnabled && (
              <>
                <div>
                  <Label>نسبة الخصم (%)</Label>
                  <Input type="number" min={1} max={99} value={discountForm.discountPercent} onChange={e => setDiscountForm(p => ({ ...p, discountPercent: Number(e.target.value) }))} className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label>نص الخصم (اختياري)</Label>
                  <Input value={discountForm.discountLabel} onChange={e => setDiscountForm(p => ({ ...p, discountLabel: e.target.value }))} className="rounded-xl mt-1" placeholder="مثال: عرض نهاية الأسبوع" />
                </div>
                <div>
                  <Label>تاريخ انتهاء الخصم (اختياري)</Label>
                  <Input type="datetime-local" value={discountForm.discountExpiresAt} onChange={e => setDiscountForm(p => ({ ...p, discountExpiresAt: e.target.value }))} className="rounded-xl mt-1" />
                </div>
              </>
            )}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveDiscount} disabled={setDiscountMutation.isPending} className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white">
                {setDiscountMutation.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setDiscountOpen(false)} className="rounded-xl">إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bags Dialog */}
      <Dialog open={bagsOpen} onOpenChange={setBagsOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>🎒 حافظات الطعام — {bagsRestaurant?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div>
                <p className="font-semibold text-sm">🔥 حافظ حرارة الطعام</p>
                <p className="text-xs text-muted-foreground">يظهر أيقونة الحرارة على بطاقة المطعم</p>
              </div>
              <button
                type="button"
                onClick={() => setBagsForm(p => ({ ...p, hasHotBag: !p.hasHotBag }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${bagsForm.hasHotBag ? "bg-orange-500" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${bagsForm.hasHotBag ? "right-0.5" : "left-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <div>
                <p className="font-semibold text-sm">❄️ حافظ برودة المشروبات</p>
                <p className="text-xs text-muted-foreground">يظهر أيقونة البرودة على بطاقة المطعم</p>
              </div>
              <button
                type="button"
                onClick={() => setBagsForm(p => ({ ...p, hasColdBag: !p.hasColdBag }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${bagsForm.hasColdBag ? "bg-sky-500" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${bagsForm.hasColdBag ? "right-0.5" : "left-0.5"}`} />
              </button>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveBags} disabled={setBagsMutation.isPending} className="flex-1 rounded-xl">
                {setBagsMutation.isPending ? "جارِ الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setBagsOpen(false)} className="rounded-xl">إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل المطعم" : "إضافة مطعم جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>اسم المطعم *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl mt-1" placeholder="مطعم الشيف" /></div>
              <div><Label>نوع المطبخ</Label><Input value={form.cuisine} onChange={e => setForm(p => ({ ...p, cuisine: e.target.value }))} className="rounded-xl mt-1" placeholder="سعودي، برغر..." /></div>
            </div>
            <div><Label>الوصف</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="rounded-xl mt-1" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المدينة</Label>
                <select value={form.cityId} onChange={e => setForm(p => ({ ...p, cityId: e.target.value, streetId: "" }))} className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2 text-sm">
                  <option value="">اختر المدينة</option>
                  {allCities?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>الشارع</Label>
                <select value={form.streetId} onChange={e => setForm(p => ({ ...p, streetId: e.target.value }))} className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" disabled={!form.cityId}>
                  <option value="">اختر الشارع</option>
                  {cityStreets?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div><Label>العنوان التفصيلي</Label><Input value={form.addressText} onChange={e => setForm(p => ({ ...p, addressText: e.target.value }))} className="rounded-xl mt-1" /></div>
            <div><Label>رابط قوقل ماب (اختياري)</Label><Input value={form.googleMapsUrl} onChange={e => setForm(p => ({ ...p, googleMapsUrl: e.target.value }))} className="rounded-xl mt-1" placeholder="https://maps.google.com/..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>رقم الهاتف</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="rounded-xl mt-1" /></div>
              <div><Label>الحد الأدنى (ريال)</Label><Input type="number" value={form.minOrderAmount} onChange={e => setForm(p => ({ ...p, minOrderAmount: e.target.value }))} className="rounded-xl mt-1" /></div>
            </div>
            <div><Label>وقت التوصيل (دقيقة)</Label><Input type="number" value={form.estimatedDeliveryTime} onChange={e => setForm(p => ({ ...p, estimatedDeliveryTime: Number(e.target.value) }))} className="rounded-xl mt-1" /></div>
            <div>
              <Label>وضع تعيين المندوب</Label>
              <select
                value={form.driverAssignMode}
                onChange={e => setForm(p => ({ ...p, driverAssignMode: e.target.value as any }))}
                className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="manual">يدوي — المشرف يختار المندوب</option>
                <option value="street">حسب الشارع — أول متاح في نفس الشارع</option>
                <option value="nearest">أقرب تلقائياً — أقرب مندوب بالموقع</option>
              </select>
            </div>
            <div><Label>لوغو المطعم</Label><ImageUpload value={form.logoUrl} onChange={(url: string) => setForm(p => ({ ...p, logoUrl: url }))} label="رفع اللوغو" /></div>
            <div><Label>صورة قائمة الطعام (المنيو)</Label><ImageUpload value={form.menuImageUrl} onChange={(url: string) => setForm(p => ({ ...p, menuImageUrl: url }))} label="رفع صورة المنيو" /></div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary text-white rounded-xl">
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "حفظ التعديلات" : "إضافة المطعم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Menu Manager Dialog ── */}
      <Dialog open={menuOpen} onOpenChange={(v) => { setMenuOpen(v); if (!v) { setMenuRestaurant(null); setActiveCatFilter(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              إدارة منيو: {menuRestaurant?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Categories Section */}
          <div className="space-y-4">
            <div className="app-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">فئات القائمة</h3>
                <div className="flex gap-2">
                  <Input
                    value={catName}
                    onChange={e => setCatName(e.target.value)}
                    placeholder="اسم فئة جديدة..."
                    className="rounded-xl h-9 text-sm w-40"
                    onKeyDown={e => { if (e.key === 'Enter' && catName && menuRestaurant) createCatMutation.mutate({ restaurantId: menuRestaurant.id, name: catName }); }}
                  />
                  <Button
                    size="sm"
                    className="bg-primary text-white rounded-xl shrink-0"
                    disabled={!catName || createCatMutation.isPending}
                    onClick={() => { if (catName && menuRestaurant) createCatMutation.mutate({ restaurantId: menuRestaurant.id, name: catName }); }}
                  >
                    <Plus className="w-4 h-4" />إضافة
                  </Button>
                </div>
              </div>
              {/* Category Chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCatFilter(null)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border-2 ${
                    !activeCatFilter ? 'bg-primary text-white border-primary' : 'bg-transparent text-muted-foreground border-white/15 hover:border-primary/40'
                  }`}
                >
                  الكل ({menuItemsList?.length ?? 0})
                </button>
                {menuCategories?.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveCatFilter(activeCatFilter === c.id ? null : c.id)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border-2 ${
                        activeCatFilter === c.id ? 'bg-primary text-white border-primary' : 'bg-transparent text-muted-foreground border-white/15 hover:border-primary/40'
                      }`}
                    >
                      {c.name} ({menuItemsList?.filter((i: any) => i.categoryId === c.id).length ?? 0})
                    </button>
                    <button
                      onClick={() => { if (confirm(`حذف فئة "${c.name}" وجميع أصنافها؟`)) deleteCatMutation.mutate({ id: c.id }); }}
                      className="p-1 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {(!menuCategories || menuCategories.length === 0) && (
                  <span className="text-xs text-muted-foreground/60">لا توجد فئات بعد. أضف فئة لتنظيم أصناف المنيو.</span>
                )}
              </div>
            </div>

            {/* Items Section */}
            <div className="app-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">الأصناف ({filteredMenuItems?.length ?? 0})</h3>
                <Button size="sm" onClick={() => openAddItem(activeCatFilter ?? undefined)} className="bg-primary text-white rounded-xl gap-1">
                  <Plus className="w-4 h-4" />إضافة صنف
                </Button>
              </div>
              {(!filteredMenuItems || filteredMenuItems.length === 0) ? (
                <div className="text-center py-10 text-muted-foreground/70">
                  <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">لا توجد أصناف بعد</p>
                  <p className="text-xs mt-1">اضغط "إضافة صنف" لبدء إضافة أصناف القائمة</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMenuItems?.map((item: any) => (
                    <div key={item.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${
                      item.isAvailable ? 'border-white/10 hover:border-primary/30' : 'border-white/10 opacity-60'
                    }`}>
                      {/* Image */}
                      <div className="relative">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover" />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 flex items-center justify-center">
                            <ChefHat className="w-9 h-9 text-orange-300 opacity-50" />
                          </div>
                        )}
                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                          item.isAvailable ? 'bg-green-500 text-white' : 'bg-white/20 text-white'
                        }`}>
                          {item.isAvailable ? 'متاح' : 'غير متاح'}
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-3">
                        <div className="font-bold text-sm truncate text-foreground">{item.name}</div>
                        {item.description && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</div>}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-lg font-black text-primary">{item.price} ريال</span>
                          {menuCategories?.find((c: any) => c.id === item.categoryId) && (
                            <span className="text-xs bg-purple-900/20 text-orange-400 px-2 py-0.5 rounded-full">
                              {menuCategories.find((c: any) => c.id === item.categoryId)?.name}
                            </span>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                          <Switch
                            checked={item.isAvailable}
                            onCheckedChange={v => updateItemMutation.mutate({ id: item.id, isAvailable: v })}
                            className="scale-75"
                          />
                          <span className="text-xs text-muted-foreground flex-1">{item.isAvailable ? 'معروض' : 'مخفي'}</span>
                          <button onClick={() => openEditItem(item)} className="p-1.5 rounded-lg hover:bg-blue-900/20 text-blue-400 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { if (confirm('حذف الصنف نهائياً؟')) deleteItemMutation.mutate({ id: item.id }); }} className="p-1.5 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Item Add/Edit Dialog ── */}
      <Dialog open={itemOpen} onOpenChange={(v) => { setItemOpen(v); if (!v) setEditItem(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              {editItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <Label className="font-bold">صورة الصنف</Label>
              <div className="mt-1">
                <ImageUpload
                  value={itemForm.imageUrl}
                  onChange={(url: string) => setItemForm(p => ({ ...p, imageUrl: url }))}
                  label="اضغط لرفع صورة الصنف"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="font-bold">اسم الصنف *</Label>
                <Input value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl mt-1" placeholder="مثال: برغر كلاسيك" />
              </div>
              <div>
                <Label className="font-bold">السعر (ريال) *</Label>
                <Input type="number" min="0" step="0.5" value={itemForm.price} onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))} className="rounded-xl mt-1" placeholder="25" />
              </div>
              <div>
                <Label className="font-bold">الفئة</Label>
                <Select value={itemForm.categoryId || 'none'} onValueChange={v => setItemForm(p => ({ ...p, categoryId: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="بدون فئة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فئة</SelectItem>
                    {menuCategories?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="font-bold text-orange-400">سعر مخفض (ريال) — اختياري</Label>
                <Input type="number" min="0" step="0.5" value={(itemForm as any).discountPrice} onChange={e => setItemForm(p => ({ ...p, discountPrice: e.target.value }))} className="rounded-xl mt-1 border-orange-400/40" placeholder="مثال: 20 (اتركه فارغاً إذا لا يوجد خصم)" />
              </div>
            </div>
            <div>
              <Label className="font-bold">الوصف (اختياري)</Label>
              <Textarea value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} className="rounded-xl mt-1" rows={2} placeholder="وصف مختصر للصنف..." />
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <Switch checked={itemForm.isAvailable} onCheckedChange={v => setItemForm(p => ({ ...p, isAvailable: v }))} />
              <div>
                <div className="font-medium text-sm">{itemForm.isAvailable ? 'متاح للطلب' : 'غير متاح'}</div>
                <div className="text-xs text-muted-foreground">{itemForm.isAvailable ? 'سيظهر هذا الصنف للعملاء' : 'لن يظهر هذا الصنف للعملاء'}</div>
              </div>
            </div>
            {/* Stock Management */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <Switch checked={itemForm.stockEnabled} onCheckedChange={v => setItemForm(p => ({ ...p, stockEnabled: v }))} />
                <div>
                  <div className="font-medium text-sm text-blue-800">تفعيل إدارة المخزون</div>
                  <div className="text-xs text-blue-600">{itemForm.stockEnabled ? 'سيُمنع الطلب عند نفاد المخزون' : 'لا يوجد حد للكمية'}</div>
                </div>
              </div>
              {itemForm.stockEnabled && (
                <div>
                  <Label className="font-bold text-foreground">الكمية المتاحة</Label>
                  <Input
                    type="number" min="0" step="1"
                    value={itemForm.stockCount}
                    onChange={e => setItemForm(p => ({ ...p, stockCount: Number(e.target.value) }))}
                    className="rounded-xl mt-1 font-bold text-lg bg-white"
                    style={{ color: '#000000' }}
                    placeholder="مثال: 10"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {itemForm.stockCount === 0 ? '⚠️ المخزون نافد — لن يتمكن العملاء من الطلب' : `✅ متبقي ${itemForm.stockCount} وحدة`}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setItemOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleItemSubmit} disabled={createItemMutation.isPending || updateItemMutation.isPending || setStockMutation.isPending} className="bg-primary text-white rounded-xl px-6">
              {(createItemMutation.isPending || updateItemMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {editItem ? 'حفظ التعديلات' : 'إضافة الصنف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Working Hours Dialog */}
      <Dialog open={hoursOpen} onOpenChange={setHoursOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>أوقات عمل: {hoursRestaurant?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {hours.map((h, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-transparent rounded-xl">
                <span className="w-16 text-sm font-medium text-foreground">{DAY_NAMES[i]}</span>
                <Switch checked={!h.isClosed} onCheckedChange={v => setHours(prev => prev.map((x, j) => j === i ? { ...x, isClosed: !v } : x))} />
                {!h.isClosed ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input type="time" value={h.openTime} onChange={e => setHours(prev => prev.map((x, j) => j === i ? { ...x, openTime: e.target.value } : x))} className="rounded-lg text-xs h-8 flex-1" />
                    <span className="text-muted-foreground/70 text-xs">—</span>
                    <Input type="time" value={h.closeTime} onChange={e => setHours(prev => prev.map((x, j) => j === i ? { ...x, closeTime: e.target.value } : x))} className="rounded-lg text-xs h-8 flex-1" />
                  </div>
                ) : (
                  <span className="text-red-500 text-xs flex-1">مغلق</span>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setHoursOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleSaveHours} disabled={setHoursMutation.isPending} className="bg-primary text-white rounded-xl">
              {setHoursMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ أوقات العمل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Menus Tab ===
function MenusTab() {
  const { data: restaurants } = trpc.restaurants.listAll.useQuery();
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<number | null>(null);
  const { data: categories, refetch: refetchCats } = trpc.restaurants.getCategories.useQuery({ restaurantId: selectedRestaurant! }, { enabled: !!selectedRestaurant });
  const { data: menuItems, refetch: refetchItems } = trpc.restaurants.getMenuItems.useQuery({ restaurantId: selectedRestaurant! }, { enabled: !!selectedRestaurant });

  const createCatMutation = trpc.restaurants.createCategory.useMutation({ onSuccess: () => { refetchCats(); setCatName(""); toast.success("تمت إضافة الفئة"); } });
  const createItemMutation = trpc.restaurants.createMenuItem.useMutation({ onSuccess: () => { refetchItems(); setItemOpen(false); toast.success("تمت إضافة الصنف"); } });
  const updateItemMutation = trpc.restaurants.updateMenuItem.useMutation({ onSuccess: () => { refetchItems(); setItemOpen(false); toast.success("تم التحديث"); } });
  const deleteItemMutation = trpc.restaurants.deleteMenuItem.useMutation({ onSuccess: () => { refetchItems(); toast.success("تم الحذف"); } });

  const [catName, setCatName] = useState("");
  const [itemOpen, setItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: "", imageUrl: "", categoryId: "", isAvailable: true });

  const openAddItem = (catId?: number) => {
    setEditItem(null);
    setItemForm({ name: "", description: "", price: "", imageUrl: "", categoryId: catId?.toString() ?? "", isAvailable: true });
    setItemOpen(true);
  };
  const openEditItem = (item: any) => {
    setEditItem(item);
    setItemForm({ name: item.name, description: item.description ?? "", price: item.price, imageUrl: item.imageUrl ?? "", categoryId: item.categoryId?.toString() ?? "", isAvailable: item.isAvailable });
    setItemOpen(true);
  };

  const handleItemSubmit = () => {
    if (!itemForm.name.trim() || !itemForm.price) { toast.error("الاسم والسعر مطلوبان"); return; }
    if (!selectedRestaurant) return;
    const payload = { ...itemForm, categoryId: itemForm.categoryId ? Number(itemForm.categoryId) : undefined };
    if (editItem) {
      updateItemMutation.mutate({ id: editItem.id, ...payload }, { onError: (e) => toast.error(e.message) });
    } else {
      createItemMutation.mutate({ restaurantId: selectedRestaurant, ...payload }, { onError: (e) => toast.error(e.message) });
    }
  };

  const filteredItems = activeCategoryFilter
    ? menuItems?.filter(i => i.categoryId === activeCategoryFilter)
    : menuItems;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-foreground">إدارة الأصناف والقوائم</h2>

      {/* Restaurant Selector */}
      <div className="app-card p-4">
        <Label className="text-sm font-semibold text-foreground mb-2 block">اختر المطعم</Label>
        <div className="flex flex-wrap gap-2">
          {restaurants?.map(r => (
            <button key={r.id} onClick={() => { setSelectedRestaurant(r.id); setActiveCategoryFilter(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedRestaurant === r.id ? "bg-primary text-white shadow-sm" : "bg-white/10 text-foreground hover:bg-white/15"}`}>
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {selectedRestaurant && (
        <div className="space-y-4">
          {/* Categories + Add Category */}
          <div className="app-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground">فئات القائمة</h3>
              <div className="flex gap-2">
                <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="اسم فئة جديدة..." className="rounded-xl h-9 text-sm w-44" onKeyDown={e => { if (e.key === "Enter" && catName) createCatMutation.mutate({ restaurantId: selectedRestaurant, name: catName }); }} />
                <Button size="sm" className="bg-primary text-white rounded-xl shrink-0" disabled={!catName || createCatMutation.isPending} onClick={() => { if (catName) createCatMutation.mutate({ restaurantId: selectedRestaurant, name: catName }); }}>
                  <Plus className="w-4 h-4" />إضافة
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategoryFilter(null)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 ${!activeCategoryFilter ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-white/15 hover:border-primary/40"}`}
              >
                الكل ({menuItems?.length ?? 0})
              </button>
              {categories?.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategoryFilter(activeCategoryFilter === c.id ? null : c.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 ${activeCategoryFilter === c.id ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-white/15 hover:border-primary/40"}`}
                >
                  {c.name} ({menuItems?.filter(i => i.categoryId === c.id).length ?? 0})
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div className="app-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">الأصناف ({filteredItems?.length ?? 0})</h3>
              <Button size="sm" onClick={() => openAddItem(activeCategoryFilter ?? undefined)} className="bg-primary text-white rounded-xl gap-1">
                <Plus className="w-4 h-4" />إضافة صنف
              </Button>
            </div>

            {(!filteredItems || filteredItems.length === 0) ? (
              <div className="text-center py-12 text-muted-foreground/70">
                <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">لا توجد أصناف بعد</p>
                <p className="text-sm mt-1">اضغط "إضافة صنف" لبدء إضافة أصناف القائمة</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems?.map(item => (
                  <div key={item.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${item.isAvailable ? "border-white/10 hover:border-primary/30 hover:shadow-md" : "border-white/10 opacity-60"}`}>
                    {/* Image */}
                    <div className="relative">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-36 object-cover" />
                      ) : (
                        <div className="w-full h-36 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 flex items-center justify-center">
                          <ChefHat className="w-10 h-10 text-orange-300" />
                        </div>
                      )}
                      {/* Availability Badge */}
                      <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold ${item.isAvailable ? "bg-green-500 text-white" : "bg-white/20 text-white"}`}>
                        {item.isAvailable ? "متاح" : "غير متاح"}
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <div className="font-bold text-foreground text-sm mb-0.5 truncate">{item.name}</div>
                      {item.description && <div className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</div>}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-primary">{item.price} ريال</span>
                        {categories?.find(c => c.id === item.categoryId) && (
                          <span className="text-xs bg-purple-900/20 text-orange-600 px-2 py-0.5 rounded-full">{categories.find(c => c.id === item.categoryId)?.name}</span>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={v => updateItemMutation.mutate({ id: item.id, isAvailable: v })}
                          className="scale-75"
                        />
                        <span className="text-xs text-muted-foreground flex-1">{item.isAvailable ? "معروض للعملاء" : "مخفي"}</span>
                        <button onClick={() => openEditItem(item)} className="p-1.5 rounded-lg hover:bg-blue-900/20 text-blue-400 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if (confirm("حذف الصنف نهائياً؟")) deleteItemMutation.mutate({ id: item.id }); }} className="p-1.5 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedRestaurant && (
        <div className="text-center py-16 text-muted-foreground app-card">
          <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>اختر مطعماً لإدارة قائمته</p>
        </div>
      )}

      {/* Item Dialog */}
      <Dialog open={itemOpen} onOpenChange={(v) => { setItemOpen(v); if (!v) setEditItem(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              {editItem ? "تعديل الصنف" : "إضافة صنف جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image Upload - prominent */}
            <div>
              <Label className="font-bold">صورة الصنف</Label>
              <div className="mt-2">
                <ImageUpload
                  value={itemForm.imageUrl}
                  onChange={(url: string) => setItemForm(p => ({ ...p, imageUrl: url }))}
                  label="اضغط لرفع صورة الصنف"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="font-bold">اسم الصنف *</Label>
                <Input value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl mt-1" placeholder="مثال: برغر كلاسيك" />
              </div>
              <div>
                <Label className="font-bold">السعر (ريال) *</Label>
                <Input type="number" min="0" step="0.5" value={itemForm.price} onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))} className="rounded-xl mt-1" placeholder="25" />
              </div>
              <div>
                <Label className="font-bold">الفئة</Label>
                <Select value={itemForm.categoryId || "none"} onValueChange={v => setItemForm(p => ({ ...p, categoryId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="بدون فئة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فئة</SelectItem>
                    {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="font-bold text-orange-400">سعر مخفض (ريال) — اختياري</Label>
                <Input type="number" min="0" step="0.5" value={(itemForm as any).discountPrice} onChange={e => setItemForm(p => ({ ...p, discountPrice: e.target.value }))} className="rounded-xl mt-1 border-orange-400/40" placeholder="مثال: 20 (اتركه فارغاً إذا لا يوجد خصم)" />
              </div>
            </div>

            <div>
              <Label className="font-bold">الوصف (اختياري)</Label>
              <Textarea value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} className="rounded-xl mt-1" rows={2} placeholder="وصف مختصر للصنف..." />
            </div>

            <div className="flex items-center gap-3 p-3 bg-transparent rounded-xl">
              <Switch checked={itemForm.isAvailable} onCheckedChange={v => setItemForm(p => ({ ...p, isAvailable: v }))} />
              <div>
                <div className="font-medium text-sm">{itemForm.isAvailable ? "متاح للطلب" : "غير متاح"}</div>
                <div className="text-xs text-muted-foreground">{itemForm.isAvailable ? "سيظهر هذا الصنف للعملاء" : "لن يظهر هذا الصنف للعملاء"}</div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setItemOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleItemSubmit} disabled={createItemMutation.isPending || updateItemMutation.isPending} className="bg-primary text-white rounded-xl px-6">
              {(createItemMutation.isPending || updateItemMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {editItem ? "حفظ التعديلات" : "إضافة الصنف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Drivers Tab ===
// ─── Driver Coverage Manager (sub-component) ─────────────────────────────────
function DriverCoverageManager({ driverId, onClose }: { driverId: number; onClose: () => void }) {
  const { data: coverage, refetch: refetchCoverage } = trpc.drivers.adminGetCoverage.useQuery({ driverId });
  const { data: allCities } = trpc.cities.listAll.useQuery();
  const [selCity, setSelCity] = useState("");
  const [selStreet, setSelStreet] = useState("");
  const [isCurrentLoc, setIsCurrentLoc] = useState(false);

  const { data: cityStreets } = trpc.cities.getStreets.useQuery(
    { cityId: Number(selCity) },
    { enabled: !!selCity && Number(selCity) > 0 }
  );

  const addMutation = trpc.drivers.adminAddCoverageZone.useMutation({
    onSuccess: () => { refetchCoverage(); setSelCity(""); setSelStreet(""); setIsCurrentLoc(false); toast.success("تمت إضافة المنطقة"); },
    onError: (e) => toast.error(e.message),
  });
  const removeMutation = trpc.drivers.adminRemoveCoverageZone.useMutation({
    onSuccess: () => { refetchCoverage(); toast.success("تمت إزالة المنطقة"); },
    onError: (e) => toast.error(e.message),
  });
  const setCurrentMutation = trpc.drivers.adminSetCurrentLocation.useMutation({
    onSuccess: () => { refetchCoverage(); toast.success("تم تحديد موقع التواجد"); },
    onError: (e) => toast.error(e.message),
  });

  const handleAdd = () => {
    if (!selCity) { toast.error("اختر مدينة أولاً"); return; }
    addMutation.mutate({
      driverId,
      cityId: Number(selCity),
      streetId: selStreet ? Number(selStreet) : null,
      isCurrentLocation: isCurrentLoc,
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Current coverage zones */}
      <div>
        <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
          <Map className="w-4 h-4 text-primary" />مناطق التغطية الحالية
        </h4>
        {(!coverage || coverage.length === 0) ? (
          <div className="text-center py-6 text-muted-foreground/60 bg-white/5 rounded-xl">
            <MapPin className="w-6 h-6 mx-auto mb-1 opacity-30" />
            <p className="text-xs">لا توجد مناطق محددة بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {coverage.map((zone: any) => {
              const city = allCities?.find(c => c.id === zone.cityId);
              const street = cityStreets?.find(s => s.id === zone.streetId);
              return (
                <div key={zone.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${
                  zone.isCurrentLocation ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/5"
                }`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {zone.isCurrentLocation && (
                      <Navigation2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-foreground truncate">
                      {city?.name ?? `مدينة #${zone.cityId}`}
                      {zone.streetId && ` — شارع #${zone.streetId}`}
                    </span>
                    {zone.isCurrentLocation && (
                      <Badge className="bg-primary/20 text-primary border-0 text-xs px-1.5 py-0">موقعي الآن</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!zone.isCurrentLocation && (
                      <Button size="sm" variant="outline"
                        onClick={() => setCurrentMutation.mutate({ driverId, zoneId: zone.id })}
                        className="rounded-lg text-xs h-7 px-2 text-primary border-primary/30 gap-1">
                        <Navigation2 className="w-3 h-3" />تواجد هنا
                      </Button>
                    )}
                    <Button size="sm" variant="outline"
                      onClick={() => removeMutation.mutate({ zoneId: zone.id })}
                      className="rounded-lg text-xs h-7 w-7 p-0 text-red-400 border-red-400/30">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add new zone */}
      <div className="border-t border-white/10 pt-4">
        <h4 className="text-sm font-bold text-foreground mb-3">إضافة منطقة جديدة</h4>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">المدينة *</Label>
            <select
              value={selCity}
              onChange={e => { setSelCity(e.target.value); setSelStreet(""); }}
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground"
            >
              <option value="">اختر مدينة...</option>
              {allCities?.filter(c => c.isActive).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {selCity && (
            <div>
              <Label className="text-xs text-muted-foreground">الشارع (اختياري)</Label>
              <select
                value={selStreet}
                onChange={e => setSelStreet(e.target.value)}
                className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground"
              >
                <option value="">كامل المدينة</option>
                {cityStreets?.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">هذا موقع تواجده الحالي</Label>
            <Switch checked={isCurrentLoc} onCheckedChange={setIsCurrentLoc} />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!selCity || addMutation.isPending}
            className="w-full rounded-xl bg-primary text-white gap-2"
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />إضافة المنطقة</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// === Driver Polygon Zone Editor ===
function DriverPolygonZoneEditor({ driverUserId, driverName, onClose, initialCenter }: { driverUserId: number; driverName: string; onClose: () => void; initialCenter?: { lat: number; lng: number } }) {
  const utils = trpc.useUtils();
  const { data: zones, refetch: refetchZones } = trpc.coverageZones.getByDriver.useQuery({ driverUserId });
  const saveMutation = trpc.coverageZones.save.useMutation({
    onSuccess: () => { refetchZones(); toast.success("تم حفظ منطقة التغطية"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const deleteMutation = trpc.coverageZones.delete.useMutation({
    onSuccess: () => { refetchZones(); toast.success("تم حذف المنطقة"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const toggleActiveMutation = trpc.coverageZones.toggleActive.useMutation({
    onSuccess: () => { refetchZones(); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const mapRef = useRef<any>(null);
  const polygonsOnMapRef = useRef<any[]>([]);
  const clickListenerRef = useRef<any>(null);
  const previewPolyRef = useRef<any>(null);
  const previewMarkersRef = useRef<any[]>([]);
  const [zoneName, setZoneName] = useState("منطقة التغطية");
  const [drawnPolygon, setDrawnPolygon] = useState<[number, number][] | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<{lat: number; lng: number}[]>([]);
  const drawingPointsRef = useRef<{lat: number; lng: number}[]>([]);

  // رسم المضلعات الموجودة على الخريطة
  const drawExistingZones = (map: any) => {
    polygonsOnMapRef.current.forEach(p => p.setMap(null));
    polygonsOnMapRef.current = [];
    if (!zones) return;
    zones.forEach((zone: any) => {
      const coords = zone.polygon.map(([lng, lat]: [number, number]) => ({ lat, lng }));
      const poly = new (window as any).google.maps.Polygon({
        paths: coords,
        strokeColor: zone.isActive ? "#22c55e" : "#94a3b8",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: zone.isActive ? "#22c55e" : "#94a3b8",
        fillOpacity: 0.15,
        map,
      });
      const infoWin = new (window as any).google.maps.InfoWindow({
        content: `<div dir="rtl" style="padding:8px;font-family:sans-serif;min-width:140px">
          <div style="font-weight:bold;font-size:13px;margin-bottom:4px">${zone.name}</div>
          <div style="font-size:11px;color:${zone.isActive ? '#16a34a' : '#94a3b8'}">${zone.isActive ? '✅ مفعّلة' : '⏸ موقوفة'}</div>
        </div>`,
      });
      poly.addListener("click", (e: any) => {
        infoWin.setPosition(e.latLng);
        infoWin.open(map);
      });
      polygonsOnMapRef.current.push(poly);
    });
  };

  // تنظيف رسم المعاينة
  const clearPreview = () => {
    if (previewPolyRef.current) { previewPolyRef.current.setMap(null); previewPolyRef.current = null; }
    previewMarkersRef.current.forEach(m => m.setMap(null));
    previewMarkersRef.current = [];
  };

  // تحديث رسم المعاينة على الخريطة
  const updatePreview = (map: any, points: {lat: number; lng: number}[]) => {
    const google = (window as any).google;
    clearPreview();
    if (points.length === 0) return;
    // رسم نقاط
    points.forEach((pt, i) => {
      const el = document.createElement("div");
      el.style.cssText = `width:10px;height:10px;background:${i === 0 ? '#f59e0b' : '#3b82f6'};border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer`;
      const m = new google.maps.marker.AdvancedMarkerElement({ position: pt, map, content: el });
      previewMarkersRef.current.push(m);
    });
    // رسم خط/مضلع مؤقت
    if (points.length >= 2) {
      const poly = new google.maps.Polyline({
        path: points,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        map,
      });
      previewPolyRef.current = poly;
    }
  };

  // تهيئة الخريطة
  const handleMapReady = (map: any) => {
    mapRef.current = map;
    drawExistingZones(map);
  };

  // بدء وضع الرسم
  const startDrawing = () => {
    const map = mapRef.current;
    if (!map) return;
    const google = (window as any).google;
    // تغيير cursor الخريطة
    map.setOptions({ draggableCursor: "crosshair" });
    drawingPointsRef.current = [];
    setDrawingPoints([]);
    setIsDrawingMode(true);
    // إضافة listener للنقر
    const listener = google.maps.event.addListener(map, "click", (e: any) => {
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      drawingPointsRef.current = [...drawingPointsRef.current, pt];
      setDrawingPoints([...drawingPointsRef.current]);
      updatePreview(map, drawingPointsRef.current);
    });
    clickListenerRef.current = listener;
  };

  // إنهاء الرسم وإغلاق المضلع
  const finishDrawing = () => {
    const map = mapRef.current;
    if (!map) return;
    const google = (window as any).google;
    const pts = drawingPointsRef.current;
    if (pts.length < 3) {
      toast.error("يجب رسم 3 نقاط على الأقل لإنشاء منطقة");
      return;
    }
    // إيقاف listener
    if (clickListenerRef.current) { google.maps.event.removeListener(clickListenerRef.current); clickListenerRef.current = null; }
    map.setOptions({ draggableCursor: null });
    setIsDrawingMode(false);
    clearPreview();
    // بناء المضلع المغلق [lng, lat]
    const coords: [number, number][] = pts.map(p => [p.lng, p.lat]);
    coords.push(coords[0]); // إغلاق المضلع
    setDrawnPolygon(coords);
    drawingPointsRef.current = [];
    setDrawingPoints([]);
  };

  // إلغاء وضع الرسم
  const cancelDrawing = () => {
    const map = mapRef.current;
    if (!map) return;
    const google = (window as any).google;
    if (clickListenerRef.current) { google.maps.event.removeListener(clickListenerRef.current); clickListenerRef.current = null; }
    map.setOptions({ draggableCursor: null });
    setIsDrawingMode(false);
    clearPreview();
    drawingPointsRef.current = [];
    setDrawingPoints([]);
  };

  // إعادة رسم المضلعات عند تحديث البيانات
  useEffect(() => {
    if (mapRef.current) drawExistingZones(mapRef.current);
  }, [zones]);

  const handleSave = () => {
    if (!drawnPolygon || drawnPolygon.length < 4) {
      toast.error("ارسم منطقة التغطية على الخريطة أولاً");
      return;
    }
    saveMutation.mutate({
      id: editingZoneId ?? undefined,
      driverUserId,
      name: zoneName || "منطقة التغطية",
      polygon: drawnPolygon,
      isActive: true,
    }, {
      onSuccess: () => {
        setDrawnPolygon(null);
        setEditingZoneId(null);
        setZoneName("منطقة التغطية");
      }
    });
  };

  const handleCancelDraw = () => {
    setDrawnPolygon(null);
    setEditingZoneId(null);
    setZoneName("منطقة التغطية");
    cancelDrawing();
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground text-base">مناطق تغطية: {driverName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">ارسم مضلعاً على الخريطة لتحديد نطاق عمل المندوب</p>
        </div>
        <Button size="sm" variant="outline" onClick={onClose} className="rounded-xl gap-1 text-xs"><X className="w-3 h-3" />إغلاق</Button>
      </div>

      {/* أزرار الرسم */}
      <div className="flex gap-2 flex-wrap">
        {!isDrawingMode && !drawnPolygon && (
          <Button
            onClick={startDrawing}
            className="gap-2 bg-primary text-white rounded-xl text-sm"
            disabled={!mapRef.current}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/></svg>
            ابدأ رسم منطقة جديدة
          </Button>
        )}
        {isDrawingMode && (
          <>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="text-xs text-blue-400 font-medium">وضع الرسم نشط — انقر على الخريطة لإضافة نقاط ({drawingPoints.length} نقطة)</span>
            </div>
            {drawingPoints.length >= 3 && (
              <Button onClick={finishDrawing} className="gap-1 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />أنهِ الرسم
              </Button>
            )}
            {drawingPoints.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  const pts = drawingPointsRef.current.slice(0, -1);
                  drawingPointsRef.current = pts;
                  setDrawingPoints([...pts]);
                  if (mapRef.current) updatePreview(mapRef.current, pts);
                }}
                className="rounded-xl text-xs gap-1 h-9"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                تراجع
              </Button>
            )}
            <Button variant="outline" onClick={cancelDrawing} className="rounded-xl text-xs gap-1 h-9 text-red-400 border-red-400/30">
              <X className="w-3.5 h-3.5" />إلغاء
            </Button>
          </>
        )}
      </div>

      {/* الخريطة */}
      <div className="relative">
        <MapView
          className="h-72 rounded-xl overflow-hidden"
          initialCenter={initialCenter ?? { lat: 24.7136, lng: 46.6753 }}
          initialZoom={initialCenter ? 12 : 10}
          onMapReady={handleMapReady}
        />
        {isDrawingMode && drawingPoints.length === 0 && (
          <div className="absolute top-2 right-2 left-2 flex justify-center" style={{ zIndex: 10 }}>
            <div className="bg-blue-600/90 text-white text-xs px-3 py-1.5 rounded-full shadow">
              • انقر على الخريطة لإضافة أول نقطة (نقطة البداية باللون الذهبي)
            </div>
          </div>
        )}
      </div>

      {/* نموذج الحفظ - يظهر بعد رسم مضلع */}
      {drawnPolygon && (
        <div className="app-card p-4 space-y-3 border border-blue-500/30">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm font-bold text-foreground">مضلع جديد جاهز للحفظ ({drawnPolygon.length - 1} نقطة)</span>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">اسم المنطقة</label>
            <Input
              value={zoneName}
              onChange={e => setZoneName(e.target.value)}
              placeholder="مثال: منطقة الرياض الشمالية"
              className="rounded-xl border-white/15 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex-1 bg-primary text-white rounded-xl gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" />حفظ المنطقة</>}
            </Button>
            <Button variant="outline" onClick={handleCancelDraw} className="rounded-xl text-xs">
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* قائمة المناطق المحفوظة */}
      <div>
        <h4 className="text-sm font-bold text-foreground mb-2">المناطق المحفوظة ({zones?.length ?? 0})</h4>
        {(!zones || zones.length === 0) ? (
          <div className="text-center py-6 text-muted-foreground/60 bg-white/5 rounded-xl">
            <MapPin className="w-6 h-6 mx-auto mb-1 opacity-30" />
            <p className="text-xs">لا توجد مناطق محددة بعد — ارسم مضلعاً على الخريطة</p>
          </div>
        ) : (
          <div className="space-y-2">
            {zones.map((zone: any) => (
              <div key={zone.id} className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border ${
                zone.isActive ? "border-green-500/30 bg-green-500/5" : "border-white/10 bg-white/5"
              }`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${zone.isActive ? "bg-green-400" : "bg-slate-500"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{zone.name}</p>
                    <p className="text-xs text-muted-foreground/60">{zone.polygon.length - 1} نقطة · {zone.isActive ? "مفعّلة" : "موقوفة"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Switch
                    checked={zone.isActive}
                    onCheckedChange={v => toggleActiveMutation.mutate({ id: zone.id, isActive: v })}
                  />
                  <Button
                    size="sm" variant="outline"
                    onClick={() => { if (confirm(`حذف منطقة "${zone.name}"؟`)) deleteMutation.mutate({ id: zone.id }); }}
                    className="rounded-lg text-xs h-7 w-7 p-0 text-red-400 border-red-400/30"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// === Drivers Tab ===
function DriversTab() {
  const { data: drivers, refetch } = trpc.drivers.adminListFull.useQuery(undefined, {
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
  const createMutation = trpc.drivers.adminCreate.useMutation({
    onSuccess: () => { refetch(); setOpen(false); toast.success("تم إضافة المندوب"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const updateMutation = trpc.drivers.adminUpdate.useMutation({
    onSuccess: () => { refetch(); setOpen(false); toast.success("تم التحديث"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const deleteMutation = trpc.drivers.adminDelete.useMutation({
    onSuccess: () => { refetch(); toast.success("تم حذف المندوب"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const toggleMutation = trpc.drivers.adminToggleActive.useMutation({ onSuccess: () => refetch() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "available" | "pending">("all");
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [polygonEditorDriver, setPolygonEditorDriver] = useState<{ userId: number; name: string; cityCenterLat?: string | null; cityCenterLng?: string | null; currentLat?: string | null; currentLng?: string | null } | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const emptyForm = { name: "", phone: "", whatsappNumber: "", maxOrders: 5, nationalId: "", licenseNumber: "", licenseExpiry: "", vehiclePlate: "", vehicleModel: "", vehicleYear: "", vehicleColor: "", verificationStatus: "pending" as "pending" | "verified" | "rejected" };
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (d: any) => { setEditing(d); setForm({ name: d.name ?? "", phone: d.phone ?? "", whatsappNumber: d.whatsappNumber ?? "", maxOrders: d.maxOrders ?? 5, nationalId: d.nationalId ?? "", licenseNumber: d.licenseNumber ?? "", licenseExpiry: d.licenseExpiry ?? "", vehiclePlate: d.vehiclePlate ?? "", vehicleModel: d.vehicleModel ?? "", vehicleYear: d.vehicleYear ?? "", vehicleColor: d.vehicleColor ?? "", verificationStatus: d.verificationStatus ?? "pending" }); setOpen(true); };;

  const handleSubmit = () => {
    if (!form.name.trim() || !form.phone.trim()) { toast.error("الاسم ورقم الجوال مطلوبان"); return; }
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form }, { onError: (e) => toast.error(e.message) });
    } else {
      createMutation.mutate(form, { onError: (e) => toast.error(e.message) });
    }
  };

  // Filter drivers based on selected status and search query
  const filteredDrivers = (drivers ?? []).filter(d => {
    if (statusFilter === "online" && !d.isOnline) return false;
    if (statusFilter === "available" && !d.isAvailable) return false;
    if (statusFilter === "pending" && d.verificationStatus !== "pending") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const nameMatch = (d.name ?? "").toLowerCase().includes(q);
      const phoneMatch = (d.phone ?? "").includes(q);
      const whatsappMatch = (d.whatsappNumber ?? "").includes(q);
      if (!nameMatch && !phoneMatch && !whatsappMatch) return false;
    }
    return true;
  });

  // Update map markers when drivers data changes
  useEffect(() => {
    if (!mapRef.current || !drivers) return;
    // Clear old markers
    markersRef.current.forEach(m => { m.map = null; });
    markersRef.current = [];
    // Add markers for drivers with GPS location
    const driversWithLocation = drivers.filter(d => d.currentLat && d.currentLng);
    driversWithLocation.forEach(d => {
      const lat = parseFloat(d.currentLat as string);
      const lng = parseFloat(d.currentLng as string);
      if (isNaN(lat) || isNaN(lng)) return;
      const color = d.isOnline ? "#22c55e" : "#94a3b8";
      const pin = document.createElement("div");
      pin.style.cssText = `width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;cursor:pointer;`;
      pin.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M1 3h15v13H1z" stroke="white" stroke-width="1"/><path d="M16 8l4 2v6h-4V8z" fill="white"/><circle cx="5.5" cy="18.5" r="2.5" fill="white"/><circle cx="18.5" cy="18.5" r="2.5" fill="white"/></svg>`;
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat, lng },
        title: d.name,
        content: pin,
      });
      // Info window on click
      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="direction:rtl;padding:8px;min-width:160px;font-family:sans-serif">
          <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${d.name}</div>
          <div style="font-size:12px;color:#666">${d.phone}</div>
          <div style="font-size:12px;margin-top:4px">
            <span style="background:${d.isOnline ? '#dcfce7' : '#f1f5f9'};color:${d.isOnline ? '#16a34a' : '#64748b'};padding:2px 6px;border-radius:999px">
              ${d.isOnline ? '⚫ متصل' : '⚪ غير متصل'}
            </span>
          </div>
          ${d.cityName ? `<div style="font-size:11px;color:#888;margin-top:4px">📍 ${d.cityName}${d.streetName ? ' — ' + d.streetName : ''}</div>` : ''}
          ${d.currentOrders !== null ? `<div style="font-size:11px;color:#888">📦 طلبات: ${d.currentOrders}/${d.maxOrders}</div>` : ''}
        </div>`,
      });
      marker.addListener("click", () => {
        infoWindow.open({ map: mapRef.current, anchor: marker });
      });
      markersRef.current.push(marker);
    });
    // Fit map to markers if any
    if (driversWithLocation.length > 0 && mapRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      driversWithLocation.forEach(d => {
        const lat = parseFloat(d.currentLat as string);
        const lng = parseFloat(d.currentLng as string);
        if (!isNaN(lat) && !isNaN(lng)) bounds.extend({ lat, lng });
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [drivers, showMap]);

  // Stats
  const onlineCount = (drivers ?? []).filter(d => d.isOnline).length;
  const withLocationCount = (drivers ?? []).filter(d => d.currentLat && d.currentLng).length;
  const pendingCount = (drivers ?? []).filter(d => d.verificationStatus === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-black text-foreground">المناديب ({drivers?.length ?? 0})</h2>
          <p className="text-xs text-muted-foreground mt-0.5">تحديث تلقائي كل 30 ثانية · {onlineCount} متصل · {withLocationCount} بموقع حي</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMap(v => !v)}
            className={`rounded-xl gap-1.5 text-xs ${showMap ? "bg-primary/10 border-primary/30 text-primary" : ""}`}
          >
            <Map className="w-3.5 h-3.5" />
            {showMap ? "إخفاء الخريطة" : "خريطة حية"}
          </Button>
          <Button onClick={openAdd} className="bg-primary text-white rounded-xl gap-2"><Plus className="w-4 h-4" />إضافة مندوب</Button>
        </div>
      </div>

      {/* Live Map */}
      {showMap && (
        <div className="app-card overflow-hidden rounded-2xl">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm">خريطة المناديب الحية</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>متصل</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>غير متصل</span>
              <span className="text-muted-foreground/60">{withLocationCount} مندوب على الخريطة</span>
            </div>
          </div>
          <MapView
            className="h-[380px] w-full"
            initialCenter={{ lat: 26.3, lng: 43.9 }}
            initialZoom={6}
            onMapReady={(map) => { mapRef.current = map; }}
          />
          {withLocationCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
              <div className="text-center text-white">
                <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا يوجد مناديب بموقع GPS حالياً</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الجوال..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pr-9 pl-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { key: "all", label: `الكل (${drivers?.length ?? 0})` },
          { key: "online", label: `⚫ متصل (${onlineCount})` },
          { key: "available", label: `✅ متاح (${(drivers ?? []).filter(d => d.isAvailable).length})` },
          { key: "pending", label: `⏳ قيد المراجعة (${pendingCount})` },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === f.key
                ? "bg-primary text-white"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDrivers.map(d => {
          const remaining = Math.max(0, (d.maxOrders ?? 5) - (d.currentOrders ?? 0));
          return (
          <div key={d.id} className="app-card p-4">
            <div className="flex items-start gap-3">
              {/* Avatar + online dot */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Truck className="w-6 h-6 text-primary" /></div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${d.isOnline ? "bg-emerald-400" : "bg-slate-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                {/* Name + badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground">{d.name}</span>
                  <Badge className={d.isAvailable ? "bg-green-900/30 text-green-300 border-0 text-xs" : "bg-white/10 text-muted-foreground border-0 text-xs"}>{d.isAvailable ? "متاح" : "مُوقَف"}</Badge>
                  <Badge className={d.isOnline ? "bg-emerald-900/30 text-emerald-300 border-0 text-xs" : "bg-white/10 text-muted-foreground border-0 text-xs"}>{d.isOnline ? "⚫ متصل" : "⚪ غير متصل"}</Badge>
                </div>
                {/* Phone */}
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><Phone className="w-3 h-3" />{d.phone}</div>
                {/* Location — city/street from phoneUsers (set when going online) */}
                {(d.cityName || d.streetName) ? (
                  <div className="mt-1 flex items-center gap-1 text-xs text-primary/80">
                    <Navigation2 className="w-3 h-3" />
                    <span>{d.cityName ?? ""}{d.streetName ? ` — ${d.streetName}` : ""}</span>
                  </div>
                ) : (d as any).currentCityName ? (
                  <div className="mt-1 flex items-center gap-1 text-xs text-blue-400/80">
                    <MapPin className="w-3 h-3" />
                    <span>GPS: {(d as any).currentCityName}</span>
                  </div>
                ) : d.isOnline ? (
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/60">
                    <MapPin className="w-3 h-3" />
                    <span>الموقع غير محدد</span>
                  </div>
                ) : null}
                {/* GPS coordinates if available */}
                {(d as any).currentLat && (d as any).currentLng && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground/50">
                    <a
                      href={`https://www.google.com/maps?q=${(d as any).currentLat},${(d as any).currentLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-400/70 hover:text-blue-400 transition-colors"
                    >
                      <Globe className="w-3 h-3" />
                      <span>عرض على الخريطة</span>
                    </a>
                    {(d as any).lastLocationUpdate && (
                      <span className="text-muted-foreground/40 mr-1">
                        · آخر تحديث: {new Date((d as any).lastLocationUpdate).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                )}
                {/* In-restaurant badge */}
                {d.inRestaurantId && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-amber-400">
                    <Store className="w-3 h-3" />
                    <span>داخل المطعم: {(d as any).inRestaurantName ?? `#${d.inRestaurantId}`}</span>
                  </div>
                )}
                {/* Orders progress */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">الطلبات الحالية</span>
                    <span className="font-bold text-foreground">{d.currentOrders ?? 0} / {d.maxOrders ?? 5}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((d.currentOrders ?? 0) / (d.maxOrders ?? 5)) * 100)}%`,
                        background: remaining === 0 ? "#ef4444" : remaining <= 1 ? "#f59e0b" : "#22c55e"
                      }}
                    />
                  </div>
                  <div className="text-xs mt-1 text-muted-foreground/70">
                    {remaining === 0 ? (
                      <span className="text-red-400">وصل للحد الأقصى</span>
                    ) : (
                      <span>متبقى <strong className="text-foreground">{remaining}</strong> طلب لاكتمال نصيبه</span>
                    )}
                  </div>
                </div>
                {/* Total deliveries + rating */}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground/60">إجمالي التوصيلات: {d.totalDeliveries ?? 0}</span>
                  {d.rating && Number(d.rating) > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">{Number(d.rating).toFixed(1)}</span>
                    </span>
                  )}
                </div>
                {/* حالة التحقق الرسمي */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge className={d.verificationStatus === 'verified' ? 'bg-green-900/30 text-green-300 border-0 text-xs' : d.verificationStatus === 'rejected' ? 'bg-red-900/30 text-red-300 border-0 text-xs' : 'bg-yellow-900/30 text-yellow-300 border-0 text-xs'}>
                    {d.verificationStatus === 'verified' ? '✅ تم التحقق' : d.verificationStatus === 'rejected' ? '❌ مرفوض' : '⏳ قيد المراجعة'}
                  </Badge>
                  {d.vehiclePlate && <span className="text-xs text-muted-foreground/70">لوحة: {d.vehiclePlate}</span>}
                  {d.vehicleModel && <span className="text-xs text-muted-foreground/70">{d.vehicleModel}{d.vehicleColor ? ` · ${d.vehicleColor}` : ""}</span>}
                  {d.nationalId && <span className="text-xs text-muted-foreground/70">هوية: {d.nationalId}</span>}
                  {d.deliveryFee && Number(d.deliveryFee) > 0 && <span className="text-xs text-emerald-400/80">رسوم: {Number(d.deliveryFee).toFixed(2)} ر.س</span>}
                </div>
              </div>
            </div>
            <div className="border-t border-white/5 mt-3 pt-3 flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => openEdit(d)} className="rounded-lg gap-1 text-xs"><Pencil className="w-3 h-3" />تعديل</Button>
              <Button
                size="sm" variant="outline"
                onClick={() => {
                  if (!d.userId) { toast.error("هذا المندوب لم يسجّل دخولاً بعد — يجب تسجيل الدخول أولاً"); return; }
                  setPolygonEditorDriver({ userId: d.userId, name: d.name ?? "", cityCenterLat: d.cityCenterLat, cityCenterLng: d.cityCenterLng, currentLat: d.currentLat, currentLng: d.currentLng });
                }}
                className="rounded-lg gap-1 text-xs text-blue-400 border-blue-400/30"
              >
                <Map className="w-3 h-3" />مناطق التغطية
              </Button>
              <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: d.id, isAvailable: !d.isAvailable })} className={`rounded-lg gap-1 text-xs ${d.isAvailable ? "text-red-600 border-red-200" : "text-green-600 border-green-200"}`}>
                {d.isAvailable ? <><EyeOff className="w-3 h-3" />إيقاف</> : <><Eye className="w-3 h-3" />تفعيل</>}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { if (confirm("حذف المندوب؟")) deleteMutation.mutate({ id: d.id }); }} className="rounded-lg gap-1 text-xs text-red-600 border-red-200"><Trash2 className="w-3 h-3" />حذف</Button>
            </div>
          </div>
        );
        })}
        {filteredDrivers.length === 0 && (
          <div className="col-span-2 text-center py-16 text-muted-foreground app-card">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{statusFilter === "all" ? "لا يوجد مناديب بعد" : "لا يوجد مناديب بهذه الحالة"}</p>
          </div>
        )}
      </div>

      {/* Polygon Zone Editor Dialog */}
      <Dialog open={!!polygonEditorDriver} onOpenChange={(v) => { if (!v) setPolygonEditorDriver(null); }}>
        <DialogContent className="max-w-2xl w-full" dir="rtl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Map className="w-5 h-5 text-primary" />مناطق التغطية الجغرافية</DialogTitle></DialogHeader>
          {polygonEditorDriver && (
            <div className="max-h-[80vh] overflow-y-auto">
              <DriverPolygonZoneEditor
                driverUserId={polygonEditorDriver.userId}
                driverName={polygonEditorDriver.name}
                initialCenter={
                  polygonEditorDriver.cityCenterLat && polygonEditorDriver.cityCenterLng
                    ? { lat: Number(polygonEditorDriver.cityCenterLat), lng: Number(polygonEditorDriver.cityCenterLng) }
                    : polygonEditorDriver.currentLat && polygonEditorDriver.currentLng
                    ? { lat: Number(polygonEditorDriver.currentLat), lng: Number(polygonEditorDriver.currentLng) }
                    : undefined
                }
                onClose={() => setPolygonEditorDriver(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل المندوب" : "إضافة مندوب جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {/* معلومات أساسية */}
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-1">معلومات أساسية</div>
            <div><Label>الاسم الكامل *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl mt-1" placeholder="محمد أحمد" /></div>
            <div><Label>رقم الجوال *</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="rounded-xl mt-1" placeholder="05XXXXXXXX" /></div>
            <div><Label>رقم واتساب</Label><Input value={form.whatsappNumber} onChange={e => setForm(p => ({ ...p, whatsappNumber: e.target.value }))} className="rounded-xl mt-1" placeholder="05XXXXXXXX" /></div>
            <div>
              <Label>الحد الأقصى للطلبات</Label>
              <Select value={form.maxOrders.toString()} onValueChange={v => setForm(p => ({ ...p, maxOrders: Number(v) }))}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAX_ORDERS_OPTIONS.map(n => <SelectItem key={n} value={n.toString()}>{n === 50 ? "غير محدود (50)" : `${n} طلب`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* بيانات التحقق الرسمية */}
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2 border-t border-border">بيانات التحقق الرسمية</div>
            <div><Label>رقم الهوية الوطنية</Label><Input value={form.nationalId} onChange={e => setForm(p => ({ ...p, nationalId: e.target.value }))} className="rounded-xl mt-1" placeholder="1XXXXXXXXX" /></div>
            <div><Label>رقم رخصة القيادة</Label><Input value={form.licenseNumber} onChange={e => setForm(p => ({ ...p, licenseNumber: e.target.value }))} className="rounded-xl mt-1" placeholder="رقم الرخصة" /></div>
            <div><Label>تاريخ انتهاء الرخصة</Label><Input type="date" value={form.licenseExpiry} onChange={e => setForm(p => ({ ...p, licenseExpiry: e.target.value }))} className="rounded-xl mt-1" /></div>
            {/* بيانات السيارة */}
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2 border-t border-border">بيانات السيارة</div>
            <div><Label>لوحة السيارة *</Label><Input value={form.vehiclePlate} onChange={e => setForm(p => ({ ...p, vehiclePlate: e.target.value }))} className="rounded-xl mt-1" placeholder="أبج 1234" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>موديل السيارة</Label><Input value={form.vehicleModel} onChange={e => setForm(p => ({ ...p, vehicleModel: e.target.value }))} className="rounded-xl mt-1" placeholder="تويوتا كامري" /></div>
              <div><Label>سنة الصنع</Label><Input value={form.vehicleYear} onChange={e => setForm(p => ({ ...p, vehicleYear: e.target.value }))} className="rounded-xl mt-1" placeholder="2022" /></div>
            </div>
            <div><Label>لون السيارة</Label><Input value={form.vehicleColor} onChange={e => setForm(p => ({ ...p, vehicleColor: e.target.value }))} className="rounded-xl mt-1" placeholder="أبيض" /></div>
            {/* حالة التحقق */}
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2 border-t border-border">حالة التحقق</div>
            <div>
              <Label>حالة التحقق الرسمي</Label>
              <Select value={form.verificationStatus} onValueChange={v => setForm(p => ({ ...p, verificationStatus: v as any }))}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">قيد المراجعة</SelectItem>
                  <SelectItem value="verified">تم التحقق ✅</SelectItem>
                  <SelectItem value="rejected">مرفوض ❌</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary text-white rounded-xl">
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}

// === Orders Tab ===
function OrdersTab() {
  const { data: orders, refetch } = trpc.orders.adminList.useQuery(undefined, { refetchInterval: 15000 });
  const { data: drivers } = trpc.drivers.adminList.useQuery();
  const { data: autoAssignData, refetch: refetchSettings } = trpc.settings.getAutoAssign.useQuery();
  const { data: unassignedOrders, refetch: refetchUnassigned } = trpc.orders.adminUnassignedOrders.useQuery(undefined, { refetchInterval: 10000 });
  const assignMutation = trpc.orders.adminAssignDriver.useMutation({
    onSuccess: () => { refetch(); toast.success("تم تعيين المندوب"); setAssignDialog(null); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const manualAssignMutation = trpc.orders.adminManualAssign.useMutation({
    onSuccess: (data) => { refetch(); refetchUnassigned(); toast.success(`✅ تم تعيين المندوب ${data.driverName} بنجاح`); setManualAssignDialog(null); setSelectedManualDriver(""); },
    onError: (e) => toast.error("خطأ في التعيين: " + e.message),
  });
  const [manualAssignDialog, setManualAssignDialog] = useState<any>(null);
  const [selectedManualDriver, setSelectedManualDriver] = useState("");
  const [deleteOrderDialog, setDeleteOrderDialog] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteCustomReason, setDeleteCustomReason] = useState("");
  const CANCEL_REASONS = [
    "المطعم مغلق",
    "خارج نطاق التغطية",
    "طلب مكرر",
    "العميل ألغى الطلب",
    "لا يوجد مندوب متاح",
    "سبب آخر",
  ];
  const deleteCancelMutation = trpc.orders.adminCancel.useMutation({
    onSuccess: () => {
      refetch();
      refetchUnassigned();
      toast.success("تم إلغاء الطلب وإشعار العميل");
      setDeleteOrderDialog(null);
      setDeleteReason("");
      setDeleteCustomReason("");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const setAutoAssignMutation = trpc.settings.setAutoAssign.useMutation({
    onSuccess: (data) => {
      refetchSettings();
      toast.success(data.autoAssignDrivers ? "✅ تم تفعيل التوزيع التلقائي" : "⏸ تم إيقاف التوزيع التلقائي — التعيين يدوياً");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const [cancelDialog, setCancelDialog] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const cancelMutation = trpc.orders.adminCancel.useMutation({ onSuccess: () => { refetch(); toast.success("تم إلغاء الطلب"); setCancelDialog(null); setCancelReason(""); } });
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({ onSuccess: () => { refetch(); toast.success("تم تحديث الحالة"); } });

  const [assignDialog, setAssignDialog] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = orders?.filter(o => statusFilter === "all" || o.status === statusFilter) ?? [];
  const pendingCount = orders?.filter(o => o.status === "pending").length ?? 0;
  const autoAssignEnabled = autoAssignData?.autoAssignDrivers ?? true;

  return (
    <div className="space-y-4">
      {/* Auto-assign control banner */}
      <div className="app-card p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${autoAssignEnabled ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
            {autoAssignEnabled
              ? <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              : <UserCheck className="w-5 h-5 text-amber-400" />}
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">
              {autoAssignEnabled ? "توزيع تلقائي للأقرب" : "تعيين يدوي"}
            </p>
            <p className="text-xs text-muted-foreground">
              {autoAssignEnabled
                ? "الطلب يصل تلقائياً للمندوب الأقل انشغالاً في نفس المدينة والشارع"
                : "الطلب يصل لجميع المناديب — عيّن مندوباً يدوياً من كل طلب"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setAutoAssignMutation.mutate({ enabled: !autoAssignEnabled })}
          disabled={setAutoAssignMutation.isPending}
          className={`rounded-xl gap-2 text-xs font-bold ${
            autoAssignEnabled
              ? "bg-red-500/10 text-red-400 border border-red-400/30 hover:bg-red-500/20"
              : "bg-emerald-600 hover:bg-emerald-700 text-white border-0"
          }`}
        >
          {setAutoAssignMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : autoAssignEnabled ? (
            <>⏸ إيقاف التلقائي</>
          ) : (
            <>⚡ تفعيل التلقائي</>
          )}
        </Button>
      </div>
      {/* Unassigned orders alert banner */}
      {unassignedOrders && unassignedOrders.length > 0 && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="font-bold text-red-300 text-sm">
              {unassignedOrders.length} طلب بدون مندوب — يحتاج تدخلاً يدوياً
            </p>
          </div>
          <div className="space-y-2">
            {unassignedOrders.map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-3 bg-red-900/20 rounded-xl p-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-white">#{o.orderNumber}</span>
                    {o.driverAssignStatus === "no_driver" ? (
                      <Badge className="bg-red-600/80 text-white border-0 text-xs">لا يوجد مندوب</Badge>
                    ) : o.driverAssignStatus === "manual_needed" ? (
                      <Badge className="bg-amber-600/80 text-white border-0 text-xs">يحتاج تعيين يدوي</Badge>
                    ) : (
                      <Badge className="bg-gray-600/80 text-white border-0 text-xs">معلق</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{o.restaurantName ?? "—"}</span>
                  </div>
                  {o.driverAssignFailReason && (
                    <p className="text-xs text-red-300/80 mt-1 truncate">سبب: {o.driverAssignFailReason}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{o.deliveryAddressText}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => setManualAssignDialog(o)}
                    className="bg-amber-600 hover:bg-amber-700 text-white border-0 rounded-xl text-xs font-bold"
                  >
                    <UserCheck className="w-3.5 h-3.5 ml-1" />
                    تعيين
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setDeleteOrderDialog(o); setDeleteReason(""); setDeleteCustomReason(""); }}
                    className="bg-red-700/80 hover:bg-red-700 text-white border-0 rounded-xl text-xs font-bold"
                  >
                    <X className="w-3.5 h-3.5 ml-1" />
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete order dialog */}
      <Dialog open={!!deleteOrderDialog} onOpenChange={(open) => { if (!open) { setDeleteOrderDialog(null); setDeleteReason(""); setDeleteCustomReason(""); } }}>
        <DialogContent className="app-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              إلغاء الطلب
            </DialogTitle>
          </DialogHeader>
          {deleteOrderDialog && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-xl p-3 space-y-1">
                <p className="text-xs text-muted-foreground">الطلب</p>
                <p className="font-bold text-sm text-foreground">#{deleteOrderDialog.orderNumber}</p>
                <p className="text-xs text-muted-foreground truncate">{deleteOrderDialog.deliveryAddressText}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground text-sm font-bold">سبب الإلغاء</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CANCEL_REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setDeleteReason(r)}
                      className={`text-xs rounded-xl px-3 py-2.5 text-right font-medium transition-all border ${
                        deleteReason === r
                          ? "bg-red-600 text-white border-red-500"
                          : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {deleteReason === "سبب آخر" && (
                  <Input
                    placeholder="اكتب السبب هنا..."
                    value={deleteCustomReason}
                    onChange={(e) => setDeleteCustomReason(e.target.value)}
                    className="app-input text-sm mt-2"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">سيتلقى العميل إشعاراً بسبب الإلغاء.</p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOrderDialog(null)} className="rounded-xl">تراجع</Button>
            <Button
              onClick={() => {
                const finalReason = deleteReason === "سبب آخر" ? deleteCustomReason : deleteReason;
                deleteCancelMutation.mutate({ orderId: deleteOrderDialog.id, reason: finalReason || "تم الإلغاء من قبل الإدارة" });
              }}
              disabled={!deleteReason || (deleteReason === "سبب آخر" && !deleteCustomReason.trim()) || deleteCancelMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white border-0 rounded-xl"
            >
              {deleteCancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الإلغاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual assign dialog */}
      <Dialog open={!!manualAssignDialog} onOpenChange={(open) => { if (!open) { setManualAssignDialog(null); setSelectedManualDriver(""); } }}>
        <DialogContent className="app-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">تعيين مندوب يدوياً</DialogTitle>
          </DialogHeader>
          {manualAssignDialog && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-xl p-3 space-y-1">
                <p className="text-xs text-muted-foreground">الطلب</p>
                <p className="font-bold text-sm text-foreground">#{manualAssignDialog.orderNumber}</p>
                {manualAssignDialog.driverAssignFailReason && (
                  <p className="text-xs text-red-400">سبب عدم التعيين: {manualAssignDialog.driverAssignFailReason}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground text-sm">اختر المندوب</Label>
                <Select value={selectedManualDriver} onValueChange={setSelectedManualDriver}>
                  <SelectTrigger className="app-input">
                    <SelectValue placeholder="اختر مندوباً متاحاً..." />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers?.filter(d => d.isAvailable).map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name} — {d.isOnline ? "متصل" : "غير متصل"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setManualAssignDialog(null); setSelectedManualDriver(""); }} className="rounded-xl">إلغاء</Button>
            <Button
              onClick={() => manualAssignMutation.mutate({ orderId: manualAssignDialog.id, driverId: parseInt(selectedManualDriver) })}
              disabled={!selectedManualDriver || manualAssignMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white border-0 rounded-xl"
            >
              {manualAssignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد التعيين"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-foreground">الطلبات ({filtered.length})</h2>
          {pendingCount > 0 && <Badge className="bg-red-500 text-white border-0">{pendingCount} معلق</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 rounded-xl text-sm"><SelectValue placeholder="تصفية بالحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الطلبات</SelectItem>
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl"><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground app-card">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد طلبات</p>
          </div>
        )}
        {filtered.map(order => (
          <div key={order.id} className={`app-card p-4 ${order.status === "pending" ? "border-yellow-500/30" : ""}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-foreground">#{order.orderNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status] ?? "bg-white/10 text-foreground"}`}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  <span className="text-xs text-muted-foreground/70">{new Date(order.createdAt).toLocaleString("ar-SA")}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">المطعم:</span> {(order as any).restaurantName ?? `#${order.restaurantId}`}
                  {" · "}
                  <span className="font-medium">العميل:</span> {(order as any).customerName ?? `#${order.userId}`}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{order.deliveryAddressText}</div>
                <div className="text-sm font-bold text-primary mt-1">
                  الإجمالي: {order.total} ريال
                  {order.deliveryFee && order.deliveryFee !== "0" && <span className="font-normal text-muted-foreground mr-2">(توصيل: {order.deliveryFee} ريال)</span>}
                </div>
                {(order as any).driverName && (
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Truck className="w-3 h-3" />المندوب: {(order as any).driverName}</div>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {!["delivered", "cancelled", "driver_assigned", "picked_up", "on_the_way"].includes(order.status) && (
                  <Button size="sm" onClick={() => { setAssignDialog(order); setSelectedDriver(""); }} className="bg-primary text-white rounded-xl gap-1 text-xs">
                    <UserCheck className="w-3 h-3" />تعيين مندوب
                  </Button>
                )}
                {order.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "ready" })} className="rounded-xl gap-1 text-xs text-blue-600 border-blue-200">
                    <CheckCircle2 className="w-3 h-3" />تحديد كجاهز
                  </Button>
                )}
                {!["delivered", "cancelled"].includes(order.status) && (
                  <Button size="sm" variant="outline" onClick={() => setCancelDialog(order)} className="rounded-xl gap-1 text-xs text-red-600 border-red-200">
                    <XCircle className="w-3 h-3" />إلغاء
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cancel Order Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={() => { setCancelDialog(null); setCancelReason(""); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle className="text-red-400">❌ إلغاء الطلب #{cancelDialog?.orderNumber}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">سيتم إشعار العميل بإلغاء طلبه. يمكنك إضافة سبب لإعلامه.</p>
            <Label>سبب الإلغاء (اختياري)</Label>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="مثال: المطعم مغلق، لا يوجد مناديب متاحون..."
              rows={3}
              className="w-full rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex gap-2 flex-wrap">
              {["المطعم مغلق", "لا يوجد مناديب متاحون", "طلب مكرر", "خارج نطاق التغطية"].map(r => (
                <button key={r} onClick={() => setCancelReason(r)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors">
                  {r}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => { setCancelDialog(null); setCancelReason(""); }} className="rounded-xl">تراجع</Button>
            <Button onClick={() => cancelMutation.mutate({ orderId: cancelDialog.id, reason: cancelReason || undefined })} disabled={cancelMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
              {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 ml-1" />تأكيد الإلغاء</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Assign Driver Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>تعيين مندوب للطلب #{assignDialog?.orderNumber}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>اختر المندوب المتاح</Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر مندوباً..." /></SelectTrigger>
              <SelectContent>
                {drivers?.filter(d => d.isAvailable && d.currentOrders < d.maxOrders).map(d => (
                  <SelectItem key={d.id} value={d.id.toString()}>
                    {d.name} — {d.deliveryFee ?? "—"} ريال ({d.currentOrders}/{d.maxOrders} طلب)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {drivers?.filter(d => d.isAvailable && d.currentOrders < d.maxOrders).length === 0 && (
              <div className="text-sm text-amber-600 flex items-center gap-2 bg-yellow-900/20 rounded-xl p-3">
                <AlertCircle className="w-4 h-4" />لا يوجد مناديب متاحون حالياً
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setAssignDialog(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={() => { if (assignDialog && selectedDriver) assignMutation.mutate({ orderId: assignDialog.id, driverId: Number(selectedDriver) }); }} disabled={!selectedDriver || assignMutation.isPending} className="bg-primary text-white rounded-xl">
              {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تعيين المندوب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Customers Tab ===
function CustomersTab() {
  const { data: customers, refetch } = trpc.phoneAuth.adminListCustomers.useQuery();
  const [search, setSearch] = useState("");
  const [editCustomer, setEditCustomer] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", isActive: true });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const updateMutation = trpc.phoneAuth.adminUpdateUser.useMutation({
    onSuccess: () => { refetch(); setEditCustomer(null); toast.success("تم تحديث بيانات العميل"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.phoneAuth.adminDeleteUser.useMutation({
    onSuccess: () => { refetch(); setDeleteConfirm(null); toast.success("تم حذف العميل"); },
    onError: (e) => toast.error(e.message),
  });
  const toggleMutation = trpc.phoneAuth.adminUpdateUser.useMutation({
    onSuccess: () => { refetch(); toast.success("تم تحديث حالة العميل"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (customers ?? []).filter(c =>
    !search ||
    (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const openEdit = (c: any) => {
    setEditCustomer(c);
    setEditForm({ name: c.name ?? "", phone: c.phone, isActive: c.isActive });
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-foreground">العملاء المسجّلون</h2>
          <p className="text-sm text-muted-foreground">{customers?.length ?? 0} عميل مسجّل</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الجوال..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-9 rounded-xl bg-white/5 border-white/10 w-56"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl gap-1">
            <RefreshCw className="w-4 h-4" />تحديث
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="app-card p-4 text-center">
          <div className="text-2xl font-black text-foreground">{customers?.length ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">إجمالي العملاء</div>
        </div>
        <div className="app-card p-4 text-center">
          <div className="text-2xl font-black text-green-400">{customers?.filter(c => c.isActive).length ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">نشطون</div>
        </div>
        <div className="app-card p-4 text-center">
          <div className="text-2xl font-black text-red-400">{customers?.filter(c => !c.isActive).length ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">موقوفون</div>
        </div>
      </div>

      {/* Table */}
      <div className="app-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-transparent border-b border-white/10">
              <tr>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">#</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">الاسم</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">رقم الجوال</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">العنوان</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">الحالة</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">تاريخ التسجيل</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 px-4 text-muted-foreground text-xs">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {(c.name ?? c.phone).charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">
                        {c.name ?? <span className="text-muted-foreground italic text-xs">بدون اسم</span>}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-sm">{c.phone}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground max-w-[160px] truncate">
                    {c.addressText ?? c.pinnedAddressText ?? <span className="italic opacity-40">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={c.isActive ? "bg-green-900/30 text-green-300 border-0" : "bg-red-900/30 text-red-300 border-0"}>
                      {c.isActive ? "نشط" : "موقوف"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground/70">
                    {new Date(c.createdAt).toLocaleDateString("ar-SA")}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}
                        className="rounded-lg text-xs h-7 px-2 gap-1 border-white/10">
                        <Pencil className="w-3 h-3" />تعديل
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
                        className={`rounded-lg text-xs h-7 px-2 ${c.isActive ? "text-red-400 border-red-400/30" : "text-green-400 border-green-400/30"}`}>
                        {c.isActive ? <><EyeOff className="w-3 h-3" />إيقاف</> : <><Eye className="w-3 h-3" />تفعيل</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(c.id)}
                        className="rounded-lg text-xs h-7 px-2 text-red-400 border-red-400/30">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-14 text-muted-foreground/60">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{search ? "لا توجد نتائج للبحث" : "لا يوجد عملاء مسجّلون بعد"}</p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editCustomer} onOpenChange={open => !open && setEditCustomer(null)}>
        <DialogContent className="bg-background border-white/10 rounded-2xl max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">تعديل بيانات العميل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-muted-foreground text-sm">الاسم</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder="اسم العميل"
                className="mt-1 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">رقم الجوال</Label>
              <Input
                value={editForm.phone}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="05xxxxxxxx"
                className="mt-1 bg-white/5 border-white/10 rounded-xl font-mono"
                dir="ltr"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-sm">الحساب نشط</Label>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={v => setEditForm(f => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditCustomer(null)} className="rounded-xl border-white/10">
              إلغاء
            </Button>
            <Button
              onClick={() => updateMutation.mutate({ id: editCustomer.id, name: editForm.name || undefined, phone: editForm.phone, isActive: editForm.isActive })}
              disabled={updateMutation.isPending}
              className="rounded-xl bg-primary text-white"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-background border-white/10 rounded-2xl max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm py-2">
            هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع بياناته نهائياً ولا يمكن التراجع.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-xl border-white/10">
              إلغاء
            </Button>
            <Button
              onClick={() => deleteConfirm !== null && deleteMutation.mutate({ id: deleteConfirm })}
              disabled={deleteMutation.isPending}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف نهائي"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── OTP / Users Tab ──────────────────────────────────────────────────────────
function UsersTab() {
  const { data: otps, refetch: refetchOtps } = trpc.phoneAuth.adminListOtps.useQuery(undefined, { refetchInterval: 10000 });
  const { data: phoneUsers, refetch: refetchUsers } = trpc.phoneAuth.adminListUsers.useQuery();
  const toggleUserMutation = trpc.phoneAuth.adminToggleUser.useMutation({ onSuccess: () => refetchUsers() });

  return (
    <div className="space-y-6">
      {/* OTP Codes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black text-foreground">رموز التحقق الأخيرة</h2>
          <Button variant="outline" size="sm" onClick={() => refetchOtps()} className="rounded-xl gap-1"><RefreshCw className="w-4 h-4" />تحديث</Button>
        </div>
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-transparent border-b border-white/10">
                <tr>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">رقم الجوال</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">رمز التحقق</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">الحالة</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {otps?.slice(0, 20).map(otp => (
                  <tr key={otp.id} className="border-b border-white/5 hover:bg-transparent">
                    <td className="py-3 px-4 font-mono font-bold">{otp.phone}</td>
                    <td className="py-3 px-4">
                      <span className="bg-primary/10 text-primary font-black text-lg px-3 py-1 rounded-lg tracking-widest">{otp.otp}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={otp.isUsed ? "bg-white/10 text-muted-foreground border-0" : new Date(otp.expiresAt) < new Date() ? "bg-red-900/30 text-red-300 border-0" : "bg-green-900/30 text-green-300 border-0"}>
                        {otp.isUsed ? "مستخدم" : new Date(otp.expiresAt) < new Date() ? "منتهي" : "صالح"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground/70 text-xs">{new Date(otp.createdAt).toLocaleString("ar-SA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!otps || otps.length === 0) && (
            <div className="text-center py-10 text-muted-foreground/70"><KeyRound className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>لا توجد رموز بعد</p></div>
          )}
        </div>
      </div>

      {/* Phone Users */}
      <div>
        <h2 className="text-xl font-black text-foreground mb-3">المستخدمون ({phoneUsers?.length ?? 0})</h2>
        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-transparent border-b border-white/10">
                <tr>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">الاسم</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">رقم الجوال</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">الدور</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">الحالة</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {phoneUsers?.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-transparent">
                    <td className="py-3 px-4 font-medium">{u.name ?? "—"}</td>
                    <td className="py-3 px-4 font-mono">{u.phone}</td>
                    <td className="py-3 px-4">
                      <Badge className={u.role === "driver" ? "bg-blue-900/30 text-blue-300 border-0" : "bg-white/10 text-muted-foreground border-0"}>
                        {u.role === "driver" ? "مندوب" : "عميل"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={u.isActive ? "bg-green-900/30 text-green-300 border-0" : "bg-red-900/30 text-red-300 border-0"}>
                        {u.isActive ? "نشط" : "موقوف"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button size="sm" variant="outline" onClick={() => toggleUserMutation.mutate({ id: u.id, isActive: !u.isActive })} className={`rounded-lg text-xs ${u.isActive ? "text-red-600 border-red-200" : "text-green-600 border-green-200"}`}>
                        {u.isActive ? "إيقاف" : "تفعيل"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!phoneUsers || phoneUsers.length === 0) && (
            <div className="text-center py-10 text-muted-foreground/70"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>لا يوجد مستخدمون بعد</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Google Places Tab ─────────────────────────────────────────────────────────
function GooglePlacesTab() {
  const { data: allCities } = trpc.cities.listAll.useQuery();
  const [filterCityId, setFilterCityId] = useState<number | null>(null);
  const [filterStreetId, setFilterStreetId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: cityStreetsList } = trpc.cities.getAllStreets.useQuery(
    { cityId: filterCityId! },
    { enabled: !!filterCityId }
  );

  const { data: places, refetch } = trpc.googlePlaces.listAll.useQuery(
    { search: search || undefined, cityId: filterCityId ?? undefined, streetId: filterStreetId ?? undefined },
    { refetchInterval: 30000 }
  );

  const toggleMutation = trpc.googlePlaces.toggleActive.useMutation({ onSuccess: () => { refetch(); toast.success("تم تحديث الحالة"); } });
  const deleteMutation = trpc.googlePlaces.delete.useMutation({ onSuccess: () => { refetch(); toast.success("تم الحذف"); } });

  // Bags management for Google Places
  const [googleBagsOpen, setGoogleBagsOpen] = useState(false);
  const [googleBagsPlace, setGoogleBagsPlace] = useState<any>(null);
  const [googleBagsForm, setGoogleBagsForm] = useState({ hasHotBag: false, hasColdBag: false });
  const setGoogleBagsMutation = trpc.googlePlaces.setBags.useMutation({
    onSuccess: () => { refetch(); setGoogleBagsOpen(false); toast.success("تم تحديث الحافظات"); },
    onError: (e) => toast.error(e.message),
  });
  const openGoogleBags = (place: any) => {
    setGoogleBagsPlace(place);
    setGoogleBagsForm({ hasHotBag: place.hasHotBag ?? false, hasColdBag: place.hasColdBag ?? false });
    setGoogleBagsOpen(true);
  };

  // Menus management
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mgmtTab, setMgmtTab] = useState<"items" | "hours" | "settings">("items");

  const { data: menuItems, refetch: refetchItems } = trpc.googlePlaces.getAllMenuItems.useQuery(
    { placeDbId: selectedPlace?.id ?? 0 },
    { enabled: !!selectedPlace }
  );
  const createItemMutation = trpc.googlePlaces.addMenuItem.useMutation({ onSuccess: () => { refetchItems(); setItemOpen(false); toast.success("تمت إضافة الصنف"); } });
  const updateItemMutation = trpc.googlePlaces.updateMenuItem.useMutation({ onSuccess: () => { refetchItems(); setItemOpen(false); toast.success("تم التحديث"); } });
  const deleteItemMutation = trpc.googlePlaces.deleteMenuItem.useMutation({ onSuccess: () => { refetchItems(); toast.success("تم الحذف"); } });
  // ── Categories for Google Place ──
  const DEFAULT_CATEGORIES = ['عصاير', 'قهوة', 'طعام', 'مشويات', 'حلويات', 'وجبات سريعة', 'مقبلات', 'مشروبات ساخنة'];
  const [activeCatFilter, setActiveCatFilter] = useState<number | null>(null);
  const [catName, setCatName] = useState("");
  const { data: placeCategories, refetch: refetchCats } = trpc.googlePlaces.getCategories.useQuery(
    { placeDbId: selectedPlace?.id ?? 0 },
    { enabled: !!selectedPlace }
  );
  const addCatMutation = trpc.googlePlaces.addCategory.useMutation({
    onSuccess: () => { refetchCats(); setCatName(""); toast.success("تمت إضافة الفئة"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCatMutation = trpc.googlePlaces.deleteCategory.useMutation({
    onSuccess: () => { refetchCats(); refetchItems(); toast.success("تم حذف الفئة"); },
    onError: (e) => toast.error(e.message),
  });
  const filteredMenuItems = activeCatFilter
    ? menuItems?.filter((i: any) => i.categoryId === activeCatFilter)
    : menuItems;
  const [itemOpen, setItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: "", discountPrice: "", imageUrl: "", categoryId: "", isAvailable: true, stockEnabled: false, stockCount: 0 });

  // Hours management
  const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const defaultHours = () => DAY_NAMES.map((_, i) => ({ dayOfWeek: i, isClosed: false, openTime: "08:00", closeTime: "23:00" }));
  const [hoursForm, setHoursForm] = useState<{ dayOfWeek: number; isClosed: boolean; openTime: string; closeTime: string }[]>(defaultHours());
  const { data: existingHours, refetch: refetchHours } = trpc.googlePlaces.getHours.useQuery(
    { placeDbId: selectedPlace?.id ?? 0 },
    { enabled: !!selectedPlace && mgmtTab === "hours" }
  );
  const saveHoursMutation = trpc.googlePlaces.saveHours.useMutation({
    onSuccess: () => { refetchHours(); toast.success("تم حفظ أوقات العمل"); },
    onError: (e) => toast.error(e.message),
  });

  // Settings management
  const [settingsForm, setSettingsForm] = useState({ name: "", address: "", googleMapsUrl: "", isActive: false, coverImageUrl: "" });
  const updatePlaceMutation = trpc.googlePlaces.updatePlace.useMutation({
    onSuccess: () => { refetch(); toast.success("تم حفظ الإعدادات"); },
    onError: (e) => toast.error(e.message),
  });

  const openManage = (place: any) => {
    setSelectedPlace(place);
    setMgmtTab("items");
    setSettingsForm({ name: place.name, address: place.address ?? "", googleMapsUrl: (place as any).googleMapsUrl ?? "", isActive: place.isActive, coverImageUrl: (place as any).coverImageUrl ?? "" });
    setMenuOpen(true);
  };

  // Sync hours form when existingHours loads
  const prevHoursRef = useRef<any>(null);
  if (existingHours && existingHours !== prevHoursRef.current) {
    prevHoursRef.current = existingHours;
    if (existingHours.length > 0) {
      const merged = defaultHours().map(d => {
        const found = existingHours.find((h: any) => h.dayOfWeek === d.dayOfWeek);
        return found ? { dayOfWeek: d.dayOfWeek, isClosed: found.isClosed, openTime: found.openTime ?? "08:00", closeTime: found.closeTime ?? "23:00" } : d;
      });
      setHoursForm(merged);
    }
  }

  const openAddItem = () => {
    setEditItem(null);
    setItemForm({ name: "", description: "", price: "", discountPrice: "", imageUrl: "", categoryId: "", isAvailable: true, stockEnabled: false, stockCount: 0 });
    setItemOpen(true);
  };
  const openEditItem = (item: any) => {
    setEditItem(item);
    setItemForm({ name: item.name, description: item.description ?? "", price: item.price, discountPrice: item.discountPrice ?? "", imageUrl: item.imageUrl ?? "", categoryId: item.categoryId?.toString() ?? "", isAvailable: item.isAvailable, stockEnabled: item.stockEnabled ?? false, stockCount: item.stockCount ?? 0 });
    setItemOpen(true);
  };
  const handleItemSubmit = () => {
    if (!itemForm.name.trim() || !itemForm.price) { toast.error("الاسم والسعر مطلوبان"); return; }
    if (!selectedPlace) return;
    const { stockEnabled, stockCount, ...rest } = itemForm;
    const payload = { ...rest, discountPrice: (rest as any).discountPrice || undefined, categoryId: rest.categoryId ? Number(rest.categoryId) : undefined };
    if (editItem) {
      updateItemMutation.mutate({ itemId: editItem.id, ...payload }, { onError: (e) => toast.error(e.message) });
    } else {
      createItemMutation.mutate({ placeDbId: selectedPlace.id, ...payload }, { onError: (e) => toast.error(e.message) });
    }
  };

  const getPlacePhoto = (photoRef: string | null) =>
    photoRef ? `/api/maps-proxy?endpoint=place/photo&maxwidth=200&photo_reference=${photoRef}` : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-foreground">مطاعم خرائط جوجل ({places?.length ?? 0})</h2>
        <div className="text-xs text-muted-foreground bg-white/5 px-3 py-1 rounded-full">
          مفعّل: {places?.filter(p => p.isActive).length ?? 0} / {places?.length ?? 0}
        </div>
      </div>

      {/* Filters */}
      <div className="app-card p-4 flex flex-wrap gap-3">
        <Input
          placeholder="بحث باسم المطعم أو العنوان..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-xl h-9 text-sm flex-1 min-w-[180px]"
        />
        <select
          value={filterCityId ?? ""}
          onChange={e => { setFilterCityId(e.target.value ? Number(e.target.value) : null); setFilterStreetId(null); }}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm h-9"
        >
          <option value="">كل المدن</option>
          {allCities?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {filterCityId && (
          <select
            value={filterStreetId ?? ""}
            onChange={e => setFilterStreetId(e.target.value ? Number(e.target.value) : null)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm h-9"
          >
            <option value="">كل الشوارع</option>
            {cityStreetsList?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* Places Grid */}
      {(!places || places.length === 0) ? (
        <div className="text-center py-16 text-muted-foreground app-card">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا توجد مطاعم جوجل بعد</p>
          <p className="text-sm mt-1 text-muted-foreground/60">ستظهر المطاعم هنا بعد اكتشافها من خرائط جوجل في صفحة العميل</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── قسم المفعّلة ── */}
          {places.filter(p => p.isActive).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                <h3 className="font-bold text-green-400 text-sm">مفعّلة وتظهر للعملاء ({places.filter(p => p.isActive).length})</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {places.filter(p => p.isActive).map(place => (
                  <div key={place.id} className="app-card overflow-hidden transition-all border-2 border-green-500/30 shadow-green-900/10 shadow-lg">
                    <div className="relative h-36">
                      {getPlacePhoto(place.photoRef) ? (
                        <img src={getPlacePhoto(place.photoRef)!} alt={place.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-indigo-900/30 flex items-center justify-center">
                          <Globe className="w-10 h-10 text-purple-400 opacity-50" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white">مفعّل</div>
                      {place.rating && (
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          {Number(place.rating).toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="font-bold text-foreground text-sm truncate">{place.name}</div>
                      {place.address && <div className="text-xs text-muted-foreground truncate">{place.address}</div>}
                      {place.cityId && allCities?.find(c => c.id === place.cityId) && (
                        <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full">{allCities.find(c => c.id === place.cityId)?.name}</span>
                      )}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        <Switch checked={place.isActive} onCheckedChange={v => toggleMutation.mutate({ id: place.id, isActive: v })} className="scale-75" />
                        <span className="text-xs text-green-400 flex-1">مفعّل</span>
                        <button onClick={() => openManage(place)} className="p-1.5 rounded-lg hover:bg-orange-900/20 text-orange-400 transition-colors" title="إدارة المطعم">
                          <ChefHat className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openGoogleBags(place)} className={`p-1.5 rounded-lg hover:bg-blue-900/20 transition-colors ${(place as any).hasHotBag || (place as any).hasColdBag ? 'text-blue-400' : 'text-muted-foreground'}`} title="حافظات">
                          <span className="text-xs">🎒</span>
                        </button>
                        <button onClick={() => { if (confirm(`حذف "${place.name}" نهائياً؟`)) deleteMutation.mutate({ id: place.id }); }} className="p-1.5 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── قسم الموقوفة ── */}
          {places.filter(p => !p.isActive).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <h3 className="font-bold text-red-400 text-sm">موقوفة / لا تظهر للعملاء ({places.filter(p => !p.isActive).length})</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {places.filter(p => !p.isActive).map(place => (
                  <div key={place.id} className="app-card overflow-hidden transition-all border-2 border-white/10 opacity-75">
                    <div className="relative h-36">
                      {getPlacePhoto(place.photoRef) ? (
                        <img src={getPlacePhoto(place.photoRef)!} alt={place.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-900/30 to-gray-800/30 flex items-center justify-center">
                          <Globe className="w-10 h-10 text-gray-400 opacity-50" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">موقوف</div>
                      {place.rating && (
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          {Number(place.rating).toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="font-bold text-foreground text-sm truncate">{place.name}</div>
                      {place.address && <div className="text-xs text-muted-foreground truncate">{place.address}</div>}
                      {place.cityId && allCities?.find(c => c.id === place.cityId) && (
                        <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full">{allCities.find(c => c.id === place.cityId)?.name}</span>
                      )}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        <Switch checked={place.isActive} onCheckedChange={v => toggleMutation.mutate({ id: place.id, isActive: v })} className="scale-75" />
                        <span className="text-xs text-red-400 flex-1">موقوف</span>
                        <button onClick={() => openManage(place)} className="p-1.5 rounded-lg hover:bg-orange-900/20 text-orange-400 transition-colors" title="إدارة المطعم">
                          <ChefHat className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openGoogleBags(place)} className={`p-1.5 rounded-lg hover:bg-blue-900/20 transition-colors ${(place as any).hasHotBag || (place as any).hasColdBag ? 'text-blue-400' : 'text-muted-foreground'}`} title="حافظات">
                          <span className="text-xs">🎒</span>
                        </button>
                        <button onClick={() => { if (confirm(`حذف "${place.name}" نهائياً؟`)) deleteMutation.mutate({ id: place.id }); }} className="p-1.5 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Restaurant Management Dialog - Multi-tab */}
      <Dialog open={menuOpen} onOpenChange={v => { setMenuOpen(v); if (!v) { setSelectedPlace(null); prevHoursRef.current = null; setHoursForm(defaultHours()); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              إدارة: {selectedPlace?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Tab Buttons */}
          <div className="flex gap-2 border-b border-white/10 pb-2">
            {(["items", "hours", "settings"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setMgmtTab(tab)}
                className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                  mgmtTab === tab ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                {tab === "items" ? "🍴 الأصناف" : tab === "hours" ? "⏰ أوقات العمل" : "⚙️ الإعدادات"}
              </button>
            ))}
          </div>

          {/* ── ITEMS TAB ── */}
          {mgmtTab === "items" && (
            <div className="space-y-4">
              {/* Categories Section */}
              <div className="app-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground text-sm">فئات القائمة</h3>
                  <div className="flex gap-2">
                    <Input
                      value={catName}
                      onChange={e => setCatName(e.target.value)}
                      placeholder="اسم فئة جديدة..."
                      className="rounded-xl h-8 text-xs w-36"
                      onKeyDown={e => { if (e.key === 'Enter' && catName && selectedPlace) addCatMutation.mutate({ placeDbId: selectedPlace.id, name: catName }); }}
                    />
                    <Button
                      size="sm"
                      className="bg-primary text-white rounded-xl shrink-0 h-8 text-xs"
                      disabled={!catName || addCatMutation.isPending}
                      onClick={() => { if (catName && selectedPlace) addCatMutation.mutate({ placeDbId: selectedPlace.id, name: catName }); }}
                    >
                      <Plus className="w-3 h-3" />إضافة
                    </Button>
                  </div>
                </div>
                {/* Default Categories Quick-Add */}
                {(!placeCategories || placeCategories.length === 0) && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">إضافة سريعة — اضغط على أي فئة لإضافتها:</p>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_CATEGORIES.map(name => (
                        <button
                          key={name}
                          onClick={() => { if (selectedPlace) addCatMutation.mutate({ placeDbId: selectedPlace.id, name }); }}
                          disabled={addCatMutation.isPending}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 border border-white/15 hover:bg-primary/20 hover:border-primary/50 hover:text-primary transition-all"
                        >
                          + {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveCatFilter(null)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-all border-2 ${
                      !activeCatFilter ? 'bg-primary text-white border-primary' : 'bg-transparent text-muted-foreground border-white/15 hover:border-primary/40'
                    }`}
                  >
                    الكل ({menuItems?.length ?? 0})
                  </button>
                  {placeCategories?.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveCatFilter(activeCatFilter === c.id ? null : c.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-medium transition-all border-2 ${
                          activeCatFilter === c.id ? 'bg-primary text-white border-primary' : 'bg-transparent text-muted-foreground border-white/15 hover:border-primary/40'
                        }`}
                      >
                        {c.name} ({menuItems?.filter((i: any) => i.categoryId === c.id).length ?? 0})
                      </button>
                      <button
                        onClick={() => { if (confirm(`حذف فئة "${c.name}" وجميع أصنافها؟`)) deleteCatMutation.mutate({ categoryId: c.id }); }}
                        className="p-1 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {placeCategories && placeCategories.length > 0 && (
                    <button
                      onClick={() => {
                        const existing = placeCategories.map((c: any) => c.name);
                        const toAdd = DEFAULT_CATEGORIES.filter(n => !existing.includes(n));
                        if (toAdd.length === 0) { toast.info('جميع الفئات الافتراضية مضافة بالفعل'); return; }
                        toAdd.forEach(name => { if (selectedPlace) addCatMutation.mutate({ placeDbId: selectedPlace.id, name }); });
                      }}
                      className="px-3 py-1 rounded-xl text-xs font-medium bg-white/5 border border-white/15 hover:bg-primary/20 hover:border-primary/50 hover:text-primary transition-all"
                    >
                      + إضافة الفئات الافتراضية
                    </button>
                  )}
                </div>
              </div>
              {/* Items Grid */}
              <div className="app-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">الأصناف ({filteredMenuItems?.length ?? 0})</span>
                  <Button size="sm" onClick={() => openAddItem()} className="bg-primary text-white rounded-xl gap-1">
                    <Plus className="w-4 h-4" />إضافة صنف
                  </Button>
                </div>
                {(!filteredMenuItems || filteredMenuItems.length === 0) ? (
                  <div className="text-center py-10 text-muted-foreground/70">
                    <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">لا توجد أصناف بعد</p>
                    <p className="text-xs mt-1">اضغط "إضافة صنف" لبدء إضافة أصناف القائمة</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredMenuItems.map((item: any) => (
                      <div key={item.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${
                        item.isAvailable ? 'border-white/10 hover:border-primary/30' : 'border-white/10 opacity-60'
                      }`}>
                        <div className="relative">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover" />
                          ) : (
                            <div className="w-full h-32 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 flex items-center justify-center">
                              <ChefHat className="w-9 h-9 text-orange-300 opacity-50" />
                            </div>
                          )}
                          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                            item.isAvailable ? 'bg-green-500 text-white' : 'bg-white/20 text-white'
                          }`}>
                            {item.isAvailable ? 'متاح' : 'غير متاح'}
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="font-bold text-sm truncate text-foreground">{item.name}</div>
                          {item.description && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</div>}
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-lg font-black text-primary">{item.price} ريال</span>
                            {placeCategories?.find((c: any) => c.id === item.categoryId) && (
                              <span className="text-xs bg-purple-900/20 text-orange-400 px-2 py-0.5 rounded-full">
                                {placeCategories.find((c: any) => c.id === item.categoryId)?.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                            <Switch
                              checked={item.isAvailable}
                              onCheckedChange={v => updateItemMutation.mutate({ itemId: item.id, isAvailable: v })}
                              className="scale-75"
                            />
                            <span className="text-xs text-muted-foreground flex-1">{item.isAvailable ? 'معروض' : 'مخفي'}</span>
                            <button onClick={() => openEditItem(item)} className="p-1.5 rounded-lg hover:bg-blue-900/20 text-blue-400 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { if (confirm('حذف الصنف نهائياً؟')) deleteItemMutation.mutate({ itemId: item.id }); }} className="p-1.5 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── HOURS TAB ── */}
          {mgmtTab === "hours" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">حدد أوقات عمل المطعم لكل يوم</p>
              {hoursForm.map((day, idx) => (
                <div key={day.dayOfWeek} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <div className="w-16 text-sm font-bold text-foreground">{DAY_NAMES[day.dayOfWeek]}</div>
                  <Switch
                    checked={!day.isClosed}
                    onCheckedChange={v => setHoursForm(prev => prev.map((d, i) => i === idx ? { ...d, isClosed: !v } : d))}
                    className="scale-75"
                  />
                  {!day.isClosed ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={day.openTime}
                        onChange={e => setHoursForm(prev => prev.map((d, i) => i === idx ? { ...d, openTime: e.target.value } : d))}
                        className="rounded-lg border border-input bg-background px-2 py-1 text-sm w-24"
                      />
                      <span className="text-muted-foreground text-xs">إلى</span>
                      <input
                        type="time"
                        value={day.closeTime}
                        onChange={e => setHoursForm(prev => prev.map((d, i) => i === idx ? { ...d, closeTime: e.target.value } : d))}
                        className="rounded-lg border border-input bg-background px-2 py-1 text-sm w-24"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-red-400 flex-1">مغلق</span>
                  )}
                </div>
              ))}
              <Button
                onClick={() => saveHoursMutation.mutate({ placeDbId: selectedPlace!.id, hours: hoursForm })}
                disabled={saveHoursMutation.isPending}
                className="w-full bg-primary text-white rounded-xl mt-2"
              >
                {saveHoursMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                حفظ أوقات العمل
              </Button>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {mgmtTab === "settings" && (
            <div className="space-y-4">
              <div>
                <Label className="font-bold">اسم المطعم</Label>
                <Input value={settingsForm.name} onChange={e => setSettingsForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label className="font-bold">العنوان</Label>
                <Input value={settingsForm.address} onChange={e => setSettingsForm(p => ({ ...p, address: e.target.value }))} className="rounded-xl mt-1" placeholder="مثال: شارع البخاري، بريدة" />
              </div>
              <div>
                <Label className="font-bold">رابط الموقع على خرائط جوجل</Label>
                <Input
                  value={settingsForm.googleMapsUrl}
                  onChange={e => setSettingsForm(p => ({ ...p, googleMapsUrl: e.target.value }))}
                  className="rounded-xl mt-1 text-xs"
                  placeholder="https://maps.google.com/maps?q=... or https://goo.gl/maps/..."
                />
                <p className="text-xs text-muted-foreground mt-1">سيظهر هذا الرابط للمندوب للتنقل إلى المطعم</p>
              </div>
              <div>
                <Label className="font-bold">صورة غلاف المطعم (اختياري)</Label>
                <div className="mt-2">
                  <ImageUpload value={settingsForm.coverImageUrl} onChange={(url: string) => setSettingsForm(p => ({ ...p, coverImageUrl: url }))} label="اضغط لرفع صورة غلاف المطعم" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">تظهر في بطاقة المطعم بدلاً من صورة جوجل مابس</p>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <Switch
                  checked={settingsForm.isActive}
                  onCheckedChange={v => setSettingsForm(p => ({ ...p, isActive: v }))}
                />
                <div>
                  <div className="font-medium text-sm">{settingsForm.isActive ? "مطعم مفعّل" : "مطعم موقوف"}</div>
                  <div className="text-xs text-muted-foreground">عند التفعيل يظهر المطعم للعملاء</div>
                </div>
              </div>
              <Button
                onClick={() => updatePlaceMutation.mutate({ id: selectedPlace!.id, ...settingsForm })}
                disabled={updatePlaceMutation.isPending}
                className="w-full bg-primary text-white rounded-xl"
              >
                {updatePlaceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                حفظ الإعدادات
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Item Add/Edit Dialog */}
      <Dialog open={itemOpen} onOpenChange={v => { setItemOpen(v); if (!v) setEditItem(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              {editItem ? "تعديل الصنف" : "إضافة صنف جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-bold">صورة الصنف</Label>
              <div className="mt-2">
                <ImageUpload value={itemForm.imageUrl} onChange={(url: string) => setItemForm(p => ({ ...p, imageUrl: url }))} label="اضغط لرفع صورة الصنف" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="font-bold">اسم الصنف *</Label>
                <Input value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl mt-1" placeholder="مثال: قهوة عربي" />
              </div>
              <div>
                <Label className="font-bold">السعر (ريال) *</Label>
                <Input type="number" min="0" step="0.5" value={itemForm.price} onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))} className="rounded-xl mt-1" placeholder="15" />
              </div>
              <div>
                <Label className="font-bold">الفئة</Label>
                <Select value={itemForm.categoryId || 'none'} onValueChange={v => setItemForm(p => ({ ...p, categoryId: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="بدون فئة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فئة</SelectItem>
                    {placeCategories?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="font-bold text-orange-400">سعر مخفض (ريال) — اختياري</Label>
                <Input type="number" min="0" step="0.5" value={(itemForm as any).discountPrice} onChange={e => setItemForm(p => ({ ...p, discountPrice: e.target.value }))} className="rounded-xl mt-1 border-orange-400/40" placeholder="مثال: 20 (اتركه فارغاً إذا لا يوجد خصم)" />
              </div>
            </div>
            <div>
              <Label className="font-bold">الوصف (اختياري)</Label>
              <Textarea value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} className="rounded-xl mt-1" rows={2} />
            </div>
            <div className="flex items-center gap-3 p-3 bg-transparent rounded-xl">
              <Switch checked={itemForm.isAvailable} onCheckedChange={v => setItemForm(p => ({ ...p, isAvailable: v }))} />
              <div>
                <div className="font-medium text-sm">{itemForm.isAvailable ? "متاح للطلب" : "غير متاح"}</div>
              </div>
            </div>
            {/* Stock Management */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <Switch checked={itemForm.stockEnabled} onCheckedChange={v => setItemForm(p => ({ ...p, stockEnabled: v }))} />
                <div>
                  <div className="font-medium text-sm text-blue-800">تفعيل إدارة المخزون</div>
                  <div className="text-xs text-blue-600">{itemForm.stockEnabled ? 'سيُمنع الطلب عند نفاد المخزون' : 'لا يوجد حد للكمية'}</div>
                </div>
              </div>
              {itemForm.stockEnabled && (
                <div>
                  <Label className="font-bold text-foreground">الكمية المتاحة</Label>
                  <Input
                    type="number" min="0" step="1"
                    value={itemForm.stockCount}
                    onChange={e => setItemForm(p => ({ ...p, stockCount: Number(e.target.value) }))}
                    className="rounded-xl mt-1 font-bold text-lg bg-white"
                    style={{ color: '#000000' }}
                    placeholder="مثال: 10"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {itemForm.stockCount === 0 ? '⚠️ المخزون نافد — لن يتمكن العملاء من الطلب' : `✅ متبقي ${itemForm.stockCount} وحدة`}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setItemOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleItemSubmit} disabled={createItemMutation.isPending || updateItemMutation.isPending} className="bg-primary text-white rounded-xl px-6">
              {(createItemMutation.isPending || updateItemMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {editItem ? "حفظ التعديلات" : "إضافة الصنف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Bags Dialog */}
      <Dialog open={googleBagsOpen} onOpenChange={setGoogleBagsOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>🎒</span> حافظات: {googleBagsPlace?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <div className="font-bold text-orange-800">حافظ حرارة الطعام</div>
                  <div className="text-xs text-orange-600">يحافظ على حرارة الطعام خلال التوصيل</div>
                </div>
              </div>
              <button
                onClick={() => setGoogleBagsForm(p => ({ ...p, hasHotBag: !p.hasHotBag }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${googleBagsForm.hasHotBag ? 'bg-orange-500' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${googleBagsForm.hasHotBag ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-sky-50 border border-sky-200 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">❄️</span>
                <div>
                  <div className="font-bold text-sky-800">حافظ برودة المشروبات</div>
                  <div className="text-xs text-sky-600">يحافظ على برودة المشروبات خلال التوصيل</div>
                </div>
              </div>
              <button
                onClick={() => setGoogleBagsForm(p => ({ ...p, hasColdBag: !p.hasColdBag }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${googleBagsForm.hasColdBag ? 'bg-sky-500' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${googleBagsForm.hasColdBag ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setGoogleBagsMutation.mutate({ id: googleBagsPlace!.id, hasHotBag: googleBagsForm.hasHotBag, hasColdBag: googleBagsForm.hasColdBag })} disabled={setGoogleBagsMutation.isPending} className="flex-1 rounded-xl">
              {setGoogleBagsMutation.isPending ? "جارِ الحفظ..." : "حفظ"}
            </Button>
            <Button variant="outline" onClick={() => setGoogleBagsOpen(false)} className="rounded-xl">إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Coverage Tab ===
function CoverageTab() {
  const { data: allCities, refetch: refetchCities } = trpc.cities.listAll.useQuery();
  const updateCoverageMutation = trpc.cities.updateCityCoverage.useMutation({
    onSuccess: () => { refetchCities(); toast.success("تم تحديث نطاق التغطية"); },
    onError: () => toast.error("فشل تحديث التغطية"),
  });

  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [coverageForm, setCoverageForm] = useState({ centerLat: "", centerLng: "", radiusKm: "10", deliveryFee: "" });
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const handleSelectCity = (city: any) => {
    setSelectedCity(city);
    setCoverageForm({
      centerLat: String(city.centerLat ?? ""),
      centerLng: String(city.centerLng ?? ""),
      radiusKm: String(city.radiusKm ?? "10"),
      deliveryFee: String(city.deliveryFee ?? ""),
    });
    if (mapRef.current && city.centerLat && city.centerLng) {
      const pos = { lat: Number(city.centerLat), lng: Number(city.centerLng) };
      mapRef.current.setCenter(pos);
      mapRef.current.setZoom(12);
    }
  };

  const updateMapMarker = (lat: number, lng: number, radiusKm: number) => {
    if (!mapRef.current) return;
    const pos = { lat, lng };
    if (markerRef.current) markerRef.current.position = pos;
    else markerRef.current = new (window as any).google.maps.marker.AdvancedMarkerElement({ map: mapRef.current, position: pos });
    if (circleRef.current) {
      circleRef.current.setCenter(pos);
      circleRef.current.setRadius(radiusKm * 1000);
    } else {
      circleRef.current = new (window as any).google.maps.Circle({
        map: mapRef.current,
        center: pos,
        radius: radiusKm * 1000,
        fillColor: "#7c3aed",
        fillOpacity: 0.15,
        strokeColor: "#7c3aed",
        strokeOpacity: 0.6,
        strokeWeight: 2,
      });
    }
  };

  const handleMapReady = (map: any) => {
    mapRef.current = map;
    map.addListener("click", (e: any) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat().toFixed(6);
      const lng = e.latLng.lng().toFixed(6);
      setCoverageForm(prev => {
        const newForm = { ...prev, centerLat: lat, centerLng: lng };
        updateMapMarker(Number(lat), Number(lng), Number(newForm.radiusKm));
        return newForm;
      });
    });
    // Show existing coverage if city selected
    if (selectedCity?.centerLat && selectedCity?.centerLng) {
      const lat = Number(selectedCity.centerLat);
      const lng = Number(selectedCity.centerLng);
      map.setCenter({ lat, lng });
      map.setZoom(12);
      updateMapMarker(lat, lng, Number(selectedCity.radiusKm ?? 10));
    }
  };

  const handleSave = () => {
    if (!selectedCity) return;
    updateCoverageMutation.mutate({
      id: selectedCity.id,
      isCovered: selectedCity.isCovered ?? false,
      centerLat: coverageForm.centerLat || undefined,
      centerLng: coverageForm.centerLng || undefined,
      radiusKm: coverageForm.radiusKm || undefined,
      deliveryFee: coverageForm.deliveryFee || "0",
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Cities list */}
      <div className="app-card p-4 space-y-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />مناطق التغطية
        </h3>
        <p className="text-xs text-muted-foreground">اختر مدينة لتحديد نطاق تغطيتها على الخريطة</p>
        <div className="space-y-2">
          {allCities?.map(city => (
            <button
              key={city.id}
              onClick={() => handleSelectCity(city)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors text-right ${
                selectedCity?.id === city.id
                  ? "border-primary bg-primary/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground/70" />
                <span className="text-sm font-semibold text-foreground">{city.name}</span>
              </div>
              {city.isCovered
                ? <Badge className="text-xs bg-green-700/30 text-green-300 border-0">مغطّاة</Badge>
                : <Badge variant="outline" className="text-xs text-muted-foreground/50">غير مغطّاة</Badge>
              }
            </button>
          ))}
          {(!allCities || allCities.length === 0) && (
            <div className="text-center py-8 text-muted-foreground/70">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد مدن بعد</p>
            </div>
          )}
        </div>
      </div>

      {/* Map + form */}
      <div className="md:col-span-2 space-y-4">
        {selectedCity ? (
          <>
            <div className="app-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-foreground">تغطية {selectedCity.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">تفعيل التغطية</span>
                  <Switch
                    checked={selectedCity.isCovered}
                    onCheckedChange={v => {
                      updateCoverageMutation.mutate({
                        id: selectedCity.id,
                        isCovered: v,
                        centerLat: coverageForm.centerLat || undefined,
                        centerLng: coverageForm.centerLng || undefined,
                        radiusKm: coverageForm.radiusKm || undefined,
                        deliveryFee: coverageForm.deliveryFee || undefined,
                      });
                      setSelectedCity((prev: any) => prev ? { ...prev, isCovered: v } : prev);
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground/70">
                  اضغط على الخريطة لتحديد مركز التغطية، ثم اضبط النطاق بالكيلومتر واحفظ
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs shrink-0 mr-2"
                  onClick={() => {
                    if (!navigator.geolocation) return toast.error("المتصفح لا يدعم الموقع");
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const lat = pos.coords.latitude.toFixed(6);
                        const lng = pos.coords.longitude.toFixed(6);
                        setCoverageForm(p => ({ ...p, centerLat: lat, centerLng: lng }));
                        updateMapMarker(Number(lat), Number(lng), Number(coverageForm.radiusKm));
                        if (mapRef.current) mapRef.current.setCenter({ lat: Number(lat), lng: Number(lng) });
                        toast.success("تم تحديد موقعك الحالي");
                      },
                      () => toast.error("تعذر جلب الموقع")
                    );
                  }}
                >
                  <Crosshair className="w-3.5 h-3.5 ml-1" /> موقعي
                </Button>
              </div>
              <MapView
                className="h-64 rounded-xl overflow-hidden"
                initialCenter={selectedCity.centerLat && selectedCity.centerLng
                  ? { lat: Number(selectedCity.centerLat), lng: Number(selectedCity.centerLng) }
                  : { lat: 24.6877, lng: 46.7219 }
                }
                initialZoom={11}
                onMapReady={handleMapReady}
              />
            </div>
            <div className="app-card p-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">سعر التوصيل (ريال)</label>
                  <Input
                    type="number"
                    value={coverageForm.deliveryFee}
                    onChange={e => setCoverageForm(p => ({ ...p, deliveryFee: e.target.value }))}
                    placeholder="15"
                    className="rounded-xl border-white/15 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">النطاق (كم)</label>
                  <Input
                    type="number"
                    value={coverageForm.radiusKm}
                    onChange={e => {
                      const v = e.target.value;
                      setCoverageForm(p => ({ ...p, radiusKm: v }));
                      if (coverageForm.centerLat && coverageForm.centerLng) updateMapMarker(Number(coverageForm.centerLat), Number(coverageForm.centerLng), Number(v));
                    }}
                    placeholder="10"
                    className="rounded-xl border-white/15 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">خط العرض (Lat)</label>
                  <Input
                    value={coverageForm.centerLat}
                    onChange={e => {
                      const v = e.target.value;
                      setCoverageForm(p => ({ ...p, centerLat: v }));
                      if (v && coverageForm.centerLng) updateMapMarker(Number(v), Number(coverageForm.centerLng), Number(coverageForm.radiusKm));
                    }}
                    placeholder="24.6877"
                    className="rounded-xl border-white/15 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">خط الطول (Lng)</label>
                  <Input
                    value={coverageForm.centerLng}
                    onChange={e => {
                      const v = e.target.value;
                      setCoverageForm(p => ({ ...p, centerLng: v }));
                      if (coverageForm.centerLat && v) updateMapMarker(Number(coverageForm.centerLat), Number(v), Number(coverageForm.radiusKm));
                    }}
                    placeholder="46.7219"
                    className="rounded-xl border-white/15 text-sm"
                  />
                </div>
              </div>
              <Button
                className="w-full bg-primary text-white rounded-xl"
                onClick={handleSave}
                disabled={updateCoverageMutation.isPending}
              >
                {updateCoverageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التغطية وسعر التوصيل"}
              </Button>
            </div>
          </>
        ) : (
          <div className="app-card p-12 flex flex-col items-center justify-center text-muted-foreground/70">
            <MapPin className="w-12 h-12 mb-3 opacity-30" />
            <p>اختر مدينة من القائمة لتحديد نطاق تغطيتها</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cities & Neighborhoods Tab ─────────────────────────────────────────────
function CitiesTab() {
  const utils = trpc.useUtils();
  const { data: allCities, refetch: refetchCities } = trpc.cities.listAll.useQuery();
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const { data: neighborhoods } = trpc.cities.getAllNeighborhoods.useQuery(
    { cityId: selectedCityId! },
    { enabled: !!selectedCityId }
  );
  const [newCityName, setNewCityName] = useState("");
  const [newNeighborhoodName, setNewNeighborhoodName] = useState("");

  const addCityMutation = trpc.cities.addCity.useMutation({
    onSuccess: () => { setNewCityName(""); refetchCities(); toast.success("تمت إضافة المدينة"); },
    onError: () => toast.error("فشل إضافة المدينة"),
  });
  const toggleCityMutation = trpc.cities.toggleCity.useMutation({ onSuccess: () => refetchCities() });
  const deleteCityMutation = trpc.cities.deleteCity.useMutation({
    onSuccess: () => { setSelectedCityId(null); refetchCities(); toast.success("تم حذف المدينة"); },
  });
  const updateCoverageMutation = trpc.cities.updateCityCoverage.useMutation({
    onSuccess: () => { refetchCities(); toast.success("تم تحديث نطاق التغطية"); },
    onError: () => toast.error("فشل تحديث التغطية"),
  });
  const addNeighborhoodMutation = trpc.cities.addNeighborhood.useMutation({
    onSuccess: () => { setNewNeighborhoodName(""); utils.cities.getAllNeighborhoods.invalidate(); toast.success("تمت إضافة الحي"); },
    onError: () => toast.error("فشل إضافة الحي"),
  });
  const toggleNeighborhoodMutation = trpc.cities.toggleNeighborhood.useMutation({ onSuccess: () => utils.cities.getAllNeighborhoods.invalidate() });
  const deleteNeighborhoodMutation = trpc.cities.deleteNeighborhood.useMutation({
    onSuccess: () => { utils.cities.getAllNeighborhoods.invalidate(); toast.success("تم حذف الحي"); },
  });

  const [coverageEditId, setCoverageEditId] = useState<number | null>(null);
  const [coverageForm, setCoverageForm] = useState({ centerLat: "", centerLng: "", radiusKm: "10", deliveryFee: "0", isCovered: false });

  const selectedCity = allCities?.find(c => c.id === selectedCityId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Cities Column */}
      <div className="app-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground flex items-center gap-2"><Globe className="w-5 h-5 text-primary" />المدن</h3>
        </div>
        {/* Add city */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="اسم المدينة الجديدة"
            value={newCityName}
            onChange={e => setNewCityName(e.target.value)}
            className="rounded-xl border-white/15 text-sm"
            onKeyDown={e => e.key === "Enter" && newCityName.trim() && addCityMutation.mutate({ name: newCityName.trim() })}
          />
          <Button
            size="sm"
            className="rounded-xl bg-primary text-white"
            disabled={!newCityName.trim() || addCityMutation.isPending}
            onClick={() => addCityMutation.mutate({ name: newCityName.trim() })}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {/* Cities list - sorted: covered+active first */}
        <div className="space-y-2">
          {[...(allCities ?? [])].sort((a, b) => {
            const scoreA = (a.isCovered ? 2 : 0) + (a.isActive ? 1 : 0);
            const scoreB = (b.isCovered ? 2 : 0) + (b.isActive ? 1 : 0);
            return scoreB - scoreA;
          }).map(city => (
            <div key={city.id}>
              <div
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedCityId === city.id ? "border-primary bg-primary/5" : "border-white/10 hover:border-white/15"
                }`}
                onClick={() => setSelectedCityId(city.id === selectedCityId ? null : city.id)}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground/70" />
                  <div className="flex flex-col">
                    <span className={`text-sm font-semibold ${!city.isActive ? "line-through text-muted-foreground/70" : "text-foreground"}`}>{city.name}</span>
                    {city.isCovered && Number(city.deliveryFee ?? 0) > 0 && (
                      <span className="text-xs text-green-400 font-bold">🚚 {Number(city.deliveryFee).toFixed(2)} ﷼</span>
                    )}
                  </div>
                  {!city.isActive && <Badge variant="outline" className="text-xs text-muted-foreground/70">معطّل</Badge>}
                  {city.isCovered
                    ? <Badge className="text-xs bg-green-700/30 text-green-300 border-green-600/30">مغطّاة ✓</Badge>
                    : <Badge variant="outline" className="text-xs text-muted-foreground/50">غير مغطّاة</Badge>
                  }
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="ghost" size="sm"
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg"
                    title="إعدادات التغطية"
                    onClick={() => {
                      setCoverageEditId(coverageEditId === city.id ? null : city.id);
                      setCoverageForm({
                        centerLat: city.centerLat ?? "",
                        centerLng: city.centerLng ?? "",
                        radiusKm: city.radiusKm ?? "10",
                        deliveryFee: city.deliveryFee ? String(city.deliveryFee) : "0",
                        isCovered: city.isCovered ?? false,
                      });
                    }}
                  >
                    <Globe className="w-4 h-4" />
                  </Button>
                  <Switch
                    checked={city.isActive}
                    onCheckedChange={v => toggleCityMutation.mutate({ id: city.id, isActive: v })}
                  />
                  <Button
                    variant="ghost" size="sm"
                    className="text-red-400 hover:text-red-600 hover:bg-red-900/20 rounded-lg"
                    onClick={() => { if (confirm(`حذف مدينة "${city.name}" وجميع أحيائها؟`)) deleteCityMutation.mutate({ id: city.id }); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {/* Coverage settings panel */}
              {coverageEditId === city.id && (
                <div className="mt-1 p-4 rounded-xl border border-blue-500/30 bg-blue-900/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-300">نطاق التغطية لـ {city.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">تفعيل التغطية</span>
                      <Switch
                        checked={coverageForm.isCovered}
                        onCheckedChange={v => setCoverageForm(p => ({ ...p, isCovered: v }))}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground/70">أدخل إحداثيات مركز المدينة ونطاق التغطية بالكيلومتر. يمكن نسخ الإحداثيات من خرائط جوجل.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">خط العرض (Lat)</label>
                      <Input
                        value={coverageForm.centerLat}
                        onChange={e => setCoverageForm(p => ({ ...p, centerLat: e.target.value }))}
                        placeholder="24.6877"
                        className="rounded-lg border-white/15 text-xs h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">خط الطول (Lng)</label>
                      <Input
                        value={coverageForm.centerLng}
                        onChange={e => setCoverageForm(p => ({ ...p, centerLng: e.target.value }))}
                        placeholder="46.7219"
                        className="rounded-lg border-white/15 text-xs h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">النطاق (كم)</label>
                      <Input
                        value={coverageForm.radiusKm}
                        onChange={e => setCoverageForm(p => ({ ...p, radiusKm: e.target.value }))}
                        placeholder="10"
                        className="rounded-lg border-white/15 text-xs h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-green-400 font-semibold">💰 سعر التوصيل (ريال)</label>
                      <Input
                        value={coverageForm.deliveryFee}
                        onChange={e => setCoverageForm(p => ({ ...p, deliveryFee: e.target.value }))}
                        placeholder="0"
                        type="number"
                        min="0"
                        step="0.5"
                        className="rounded-lg border-green-500/30 bg-green-900/10 text-green-300 text-xs h-8 font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      disabled={updateCoverageMutation.isPending}
                      onClick={() => updateCoverageMutation.mutate({
                        id: city.id,
                        isCovered: coverageForm.isCovered,
                        centerLat: coverageForm.centerLat,
                        centerLng: coverageForm.centerLng,
                        radiusKm: coverageForm.radiusKm,
                        deliveryFee: coverageForm.deliveryFee || "0",
                      })}
                    >
                      💾 حفظ الإعدادات
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="rounded-lg text-xs text-muted-foreground"
                      onClick={() => setCoverageEditId(null)}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {(!allCities || allCities.length === 0) && (
            <div className="text-center py-8 text-muted-foreground/70"><Globe className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>لا توجد مدن بعد</p></div>
          )}
        </div>
      </div>

      {/* Neighborhoods Column */}
      <div className="app-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {selectedCity ? `أحياء ${selectedCity.name}` : "اختر مدينة"}
          </h3>
        </div>
        {!selectedCityId ? (
          <div className="text-center py-12 text-muted-foreground/70">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">اضغط على مدينة لعرض أحيائها</p>
          </div>
        ) : (
          <>
            {/* Add neighborhood */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="اسم الحي الجديد"
                value={newNeighborhoodName}
                onChange={e => setNewNeighborhoodName(e.target.value)}
                className="rounded-xl border-white/15 text-sm"
                onKeyDown={e => e.key === "Enter" && newNeighborhoodName.trim() && addNeighborhoodMutation.mutate({ cityId: selectedCityId, name: newNeighborhoodName.trim() })}
              />
              <Button
                size="sm"
                className="rounded-xl bg-primary text-white"
                disabled={!newNeighborhoodName.trim() || addNeighborhoodMutation.isPending}
                onClick={() => addNeighborhoodMutation.mutate({ cityId: selectedCityId, name: newNeighborhoodName.trim() })}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {/* Neighborhoods list */}
            <div className="space-y-2">
              {neighborhoods?.map(n => (
                <div key={n.id} className="flex items-center justify-between p-3 rounded-xl border border-white/10">
                  <span className={`text-sm font-medium ${!n.isActive ? "line-through text-muted-foreground/70" : "text-gray-800"}`}>{n.name}</span>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={n.isActive}
                      onCheckedChange={v => toggleNeighborhoodMutation.mutate({ id: n.id, isActive: v })}
                    />
                    <Button
                      variant="ghost" size="sm"
                      className="text-red-400 hover:text-red-600 hover:bg-red-900/20 rounded-lg"
                      onClick={() => { if (confirm(`حذف حي "${n.name}"؟`)) deleteNeighborhoodMutation.mutate({ id: n.id }); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!neighborhoods || neighborhoods.length === 0) && (
                <div className="text-center py-8 text-muted-foreground/70"><MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>لا توجد أحياء بعد</p></div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// === Banners Tab ===
function BannersTab() {
  const { data: banners, refetch } = trpc.banners.adminList.useQuery();

  // صورة هيدر شوبر
  const { data: shopperHeaderData, refetch: refetchShopperHeader } = trpc.settings.getShopperHeaderImage.useQuery();
  const [shopperHeaderUrl, setShopperHeaderUrl] = useState("");
  const setShopperHeaderMutation = trpc.settings.setShopperHeaderImage.useMutation({
    onSuccess: () => { refetchShopperHeader(); toast.success("تم تحديث صورة هيدر شوبر"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  useEffect(() => {
    if (shopperHeaderData?.url !== undefined) setShopperHeaderUrl(shopperHeaderData.url ?? "");
  }, [shopperHeaderData]);

  // صورة هيدر المتاجر
  const { data: restaurantsHeaderData, refetch: refetchRestaurantsHeader } = trpc.settings.getRestaurantsHeaderImage.useQuery();
  const [restaurantsHeaderUrl, setRestaurantsHeaderUrl] = useState("");
  const setRestaurantsHeaderMutation = trpc.settings.setRestaurantsHeaderImage.useMutation({
    onSuccess: () => { refetchRestaurantsHeader(); toast.success("تم تحديث صورة هيدر المتاجر"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  useEffect(() => {
    if (restaurantsHeaderData?.url !== undefined) setRestaurantsHeaderUrl(restaurantsHeaderData.url ?? "");
  }, [restaurantsHeaderData]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", subtitle: "", imageUrl: "", isActive: true, sortOrder: 0 });

  const createMutation = trpc.banners.create.useMutation({
    onSuccess: () => { refetch(); setOpen(false); toast.success("تمت إضافة البانر"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const updateMutation = trpc.banners.update.useMutation({
    onSuccess: () => { refetch(); setOpen(false); toast.success("تم تحديث البانر"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const deleteMutation = trpc.banners.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("تم حذف البانر"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ title: "", subtitle: "", imageUrl: "", isActive: true, sortOrder: 0 });
    setOpen(true);
  };
  const openEdit = (b: any) => {
    setEditing(b);
    setForm({ title: b.title ?? "", subtitle: b.subtitle ?? "", imageUrl: b.imageUrl ?? "", isActive: b.isActive, sortOrder: b.sortOrder ?? 0 });
    setOpen(true);
  };
  const handleSubmit = () => {
    if (editing) updateMutation.mutate({ id: editing.id, ...form });
    else createMutation.mutate(form);
  };

  return (
    <div className="space-y-6">

      {/* ===== قسم هيدر صفحة المتاجر ===== */}
      <div className="app-card p-5 space-y-4 border-2 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">صورة هيدر صفحة المتاجر</h2>
            <p className="text-xs text-muted-foreground">تظهر في أعلى صفحة المتاجر (السلايدر) للعميل</p>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ height: "120px" }}>
          {restaurantsHeaderUrl ? (
            <img src={restaurantsHeaderUrl} alt="هيدر المتاجر" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900/20 to-indigo-900/20 flex flex-col items-center justify-center gap-2">
              <ImageIcon className="w-8 h-8 text-primary/30" />
              <span className="text-xs text-muted-foreground">لا توجد صورة - سيظهر التدرج الافتراضي</span>
            </div>
          )}
        </div>
        <ImageUpload
          value={restaurantsHeaderUrl}
          onChange={(url: string) => setRestaurantsHeaderUrl(url)}
          label="رفع صورة هيدر المتاجر"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            className="rounded-xl flex-1"
            onClick={() => setRestaurantsHeaderMutation.mutate({ url: restaurantsHeaderUrl })}
            disabled={setRestaurantsHeaderMutation.isPending}
          >
            {setRestaurantsHeaderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ صورة المتاجر"}
          </Button>
          {restaurantsHeaderUrl && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-red-400 border-red-400/30"
              onClick={() => { setRestaurantsHeaderUrl(""); setRestaurantsHeaderMutation.mutate({ url: "" }); }}
            >
              حذف
            </Button>
          )}
        </div>
      </div>

      {/* ===== قسم هيدر صفحة شوبر ===== */}
      <div className="app-card p-5 space-y-4 border-2 border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">صورة هيدر صفحة شوبر</h2>
            <p className="text-xs text-muted-foreground">تظهر في أعلى صفحة شوبر (الرحلات) للعميل</p>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ height: "120px" }}>
          {shopperHeaderUrl ? (
            <img src={shopperHeaderUrl} alt="هيدر شوبر" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-violet-900/20 flex flex-col items-center justify-center gap-2">
              <ImageIcon className="w-8 h-8 text-amber-500/30" />
              <span className="text-xs text-muted-foreground">لا توجد صورة - سيظهر التدرج البنفسجي الافتراضي</span>
            </div>
          )}
        </div>
        <ImageUpload
          value={shopperHeaderUrl}
          onChange={(url: string) => setShopperHeaderUrl(url)}
          label="رفع صورة هيدر شوبر"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            className="rounded-xl flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => setShopperHeaderMutation.mutate({ url: shopperHeaderUrl })}
            disabled={setShopperHeaderMutation.isPending}
          >
            {setShopperHeaderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ صورة شوبر"}
          </Button>
          {shopperHeaderUrl && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-red-400 border-red-400/30"
              onClick={() => { setShopperHeaderUrl(""); setShopperHeaderMutation.mutate({ url: "" }); }}
            >
              حذف
            </Button>
          )}
        </div>
      </div>

      {/* ===== بانرات صفحة المتاجر (سلايدر) ===== */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">بانرات صفحة المتاجر (سلايدر)</h2>
        <Button onClick={openAdd} size="sm" className="rounded-xl">
          <Plus className="w-4 h-4 ml-1" /> إضافة بانر
        </Button>
      </div>

      {/* Preview hint */}
      <div className="app-card p-3 flex items-center gap-3 text-sm text-muted-foreground">
        <ImageIcon className="w-5 h-5 text-primary/60 shrink-0" />
        <span>البانرات تظهر في أعلى صفحة المتاجر للعميل. أضف صورة بانر وعنواناً اختيارياً.</span>
      </div>

      {/* Banners list */}
      {!banners ? (
        <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>لا توجد بانرات حتى الآن</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b: any) => (
            <div key={b.id} className="app-card overflow-hidden">
              {/* Banner preview */}
              <div className="relative h-32 bg-gradient-to-br from-violet-900/40 to-indigo-900/40">
                {b.imageUrl ? (
                  <img src={b.imageUrl} alt={b.title ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-primary/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {(b.title || b.subtitle) && (
                  <div className="absolute bottom-3 right-3 text-right">
                    {b.title && <p className="text-white font-bold text-sm drop-shadow">{b.title}</p>}
                    {b.subtitle && <p className="text-white/70 text-xs">{b.subtitle}</p>}
                  </div>
                )}
                {/* Status badge */}
                <div className="absolute top-2 left-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    b.isActive ? 'bg-emerald-500/80 text-white' : 'bg-gray-500/80 text-white'
                  }`}>{b.isActive ? 'نشط' : 'معطل'}</span>
                </div>
              </div>
              {/* Actions */}
              <div className="p-3 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">ترتيب: {b.sortOrder}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg h-8 px-3" onClick={() => openEdit(b)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg h-8 px-3 text-red-400 border-red-400/30 hover:bg-red-500/10" onClick={() => deleteMutation.mutate({ id: b.id })}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="app-card border-0 max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل بانر' : 'إضافة بانر جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>صورة البانر</Label>
              <ImageUpload value={form.imageUrl} onChange={(url: string) => setForm(p => ({ ...p, imageUrl: url }))} label="رفع صورة البانر" />
              {form.imageUrl && (
                <div className="mt-2 rounded-xl overflow-hidden h-28">
                  <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div>
              <Label>العنوان (اختياري)</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="مثال: عروض اليوم" className="rounded-xl" />
            </div>
            <div>
              <Label>الوصف (اختياري)</Label>
              <Input value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} placeholder="مثال: خصومات حتى 50%" className="rounded-xl" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>ترتيب الظهور</Label>
                <Input type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))} className="rounded-xl" />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))} />
                <Label>{form.isActive ? 'نشط' : 'معطل'}</Label>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button className="flex-1 rounded-xl" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'حفظ التعديلات' : 'إضافة')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Ratings Tab ===
function RatingsTab() {
  const { data: driversStats, isLoading } = trpc.ratings.getAllDriversStats.useQuery();

  const renderStars = (value: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${
            n <= Math.round(value)
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-600"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-foreground">تقييمات المناديبين</h2>
        <div className="text-sm text-muted-foreground">متوسط التعامل + سرعة التوصيل</div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !driversStats || driversStats.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground app-card">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>لا توجد بيانات تقييمات بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {driversStats.map((driver: any) => {
            const overallAvg = driver.totalRatings > 0
              ? ((driver.avgService + driver.avgSpeed) / 2)
              : 0;
            return (
              <div key={driver.id} className="app-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground">{driver.name}</span>
                      {driver.totalRatings > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-black text-yellow-400 text-sm">{overallAvg.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">لا تقييمات</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{driver.phone}</div>

                    {driver.totalRatings > 0 ? (
                      <div className="mt-3 space-y-2">
                        {/* Service rating */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">جودة التعامل</span>
                          <div className="flex items-center gap-2">
                            {renderStars(driver.avgService)}
                            <span className="text-xs font-bold text-foreground">{driver.avgService.toFixed(1)}</span>
                          </div>
                        </div>
                        {/* Speed rating */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">سرعة التوصيل</span>
                          <div className="flex items-center gap-2">
                            {renderStars(driver.avgSpeed)}
                            <span className="text-xs font-bold text-foreground">{driver.avgSpeed.toFixed(1)}</span>
                          </div>
                        </div>
                        {/* Total ratings count */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-2">
                          <span className="text-xs text-muted-foreground">عدد التقييمات</span>
                          <span className="text-xs font-bold text-foreground">{driver.totalRatings} تقييم</span>
                        </div>
                        {/* Progress bars */}
                        <div className="space-y-1.5 mt-1">
                          <div>
                            <div className="flex justify-between text-xs text-muted-foreground/60 mb-0.5">
                              <span>التعامل</span>
                              <span>{((driver.avgService / 5) * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all"
                                style={{ width: `${(driver.avgService / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-muted-foreground/60 mb-0.5">
                              <span>السرعة</span>
                              <span>{((driver.avgSpeed / 5) * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                                style={{ width: `${(driver.avgSpeed / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-muted-foreground/50 italic">لم يتلقّ أي تقييم بعد</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// === Shopper Admin Tab ===
function ShopperAdminTab() {
  const [activeSection, setActiveSection] = useState<"bookings" | "ratings">("bookings");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [expandedBooking, setExpandedBooking] = useState<number | null>(null);
  const [assigningBookingId, setAssigningBookingId] = useState<number | null>(null);
  const { data: allBookings, isLoading: loadingBookings, refetch: refetchBookings } = trpc.shopper.adminGetAllBookings.useQuery();
  const { data: allRatings, isLoading: loadingRatings } = trpc.shopper.adminGetAllRatings.useQuery();
  const { data: mergedDriverStats, isLoading: loadingStats } = trpc.ratings.getAllDriversWithBothRatings.useQuery();
  const { data: allDrivers } = trpc.drivers.adminListFull.useQuery();
  const assignDriverMutation = trpc.shopper.adminAssignDriver.useMutation({
    onSuccess: (data) => {
      toast.success(`تم تعيين ${data.driverName} بنجاح`);
      setAssigningBookingId(null);
      refetchBookings();
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const STATUS_LABELS: Record<string, string> = {
    pending: "بانتظار القبول",
    accepted: "مقبول",
    collecting: "جاري التجميع",
    on_the_way: "في الطريق",
    picked_up: "تم الاستلام",
    delivered: "تم التوصيل",
    confirmed: "مؤكد",
    cancelled: "ملغي",
    rejected: "مرفوض",
  };
  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-900/30 text-yellow-300",
    accepted: "bg-blue-900/30 text-blue-300",
    collecting: "bg-purple-900/30 text-purple-300",
    on_the_way: "bg-orange-900/30 text-orange-300",
    picked_up: "bg-indigo-900/30 text-indigo-300",
    delivered: "bg-green-900/30 text-green-300",
    confirmed: "bg-emerald-900/30 text-emerald-300",
    cancelled: "bg-red-900/30 text-red-300",
    rejected: "bg-rose-900/30 text-rose-300",
  };

  const renderStars = (value: number) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={`w-3 h-3 ${n <= Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
      ))}
    </div>
  );

  // حساب الإحصائيات
  const totalBookings = allBookings?.length ?? 0;
  const pendingCount = allBookings?.filter((b: any) => b.booking.status === "pending").length ?? 0;
  const onWayCount = allBookings?.filter((b: any) => ["on_the_way", "picked_up", "collecting", "accepted"].includes(b.booking.status)).length ?? 0;
  const completedCount = allBookings?.filter((b: any) => ["delivered", "confirmed"].includes(b.booking.status)).length ?? 0;
  const cancelledCount = allBookings?.filter((b: any) => b.booking.status === "cancelled").length ?? 0;

  // فلترة الطلبات حسب الحالة المختارة
  const filteredBookings = filterStatus === null
    ? allBookings ?? []
    : filterStatus === "on_the_way"
      ? (allBookings ?? []).filter((b: any) => ["on_the_way", "picked_up", "collecting", "accepted"].includes(b.booking.status))
      : filterStatus === "completed"
        ? (allBookings ?? []).filter((b: any) => ["delivered", "confirmed"].includes(b.booking.status))
        : (allBookings ?? []).filter((b: any) => b.booking.status === filterStatus);

  const statCards = [
    { label: "إجمالي الطلبات", value: totalBookings, color: "text-primary", border: "border-primary/20", filter: null },
    { label: "بانتظار القبول", value: pendingCount, color: "text-yellow-400", border: "border-yellow-500/20", filter: "pending" },
    { label: "في الطريق", value: onWayCount, color: "text-orange-400", border: "border-orange-500/20", filter: "on_the_way" },
    { label: "مكتملة", value: completedCount, color: "text-green-400", border: "border-green-500/20", filter: "completed" },
    { label: "ملغاة", value: cancelledCount, color: "text-red-400", border: "border-red-500/20", filter: "cancelled" },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* عنوان القسم + أزرار التبويب */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground leading-none">إدارة الشوبر</h2>
            <p className="text-xs text-muted-foreground">متابعة طلبات وتقييمات خدمة الشوبر</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveSection("bookings"); setFilterStatus(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeSection === "bookings" ? "bg-primary text-white shadow-lg" : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />حركة الطلبات
          </button>
          <button
            onClick={() => setActiveSection("ratings")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeSection === "ratings" ? "bg-primary text-white shadow-lg" : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            <Star className="w-4 h-4" />تقييمات المناديب
          </button>
        </div>
      </div>

      {activeSection === "bookings" && (
        <div className="space-y-3">
          {/* بطاقات الإحصائيات - قابلة للنقر للفلترة */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {statCards.map(stat => (
              <button
                key={stat.label}
                onClick={() => setFilterStatus(filterStatus === stat.filter ? null : stat.filter)}
                className={`app-card p-4 text-center border transition-all hover:scale-105 cursor-pointer ${
                  filterStatus === stat.filter ? `${stat.border} ring-2 ring-offset-1 ring-offset-background` : stat.border
                } ${filterStatus === stat.filter ? "ring-current" : ""}`}
              >
                <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                {filterStatus === stat.filter && (
                  <div className="text-xs text-primary mt-1 font-semibold">● مفلتر</div>
                )}
              </button>
            ))}
          </div>

          {filterStatus && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>عرض: <strong className="text-foreground">{statCards.find(s => s.filter === filterStatus)?.label}</strong></span>
              <button onClick={() => setFilterStatus(null)} className="text-primary hover:underline">× إلغاء الفلتر</button>
            </div>
          )}

          {loadingBookings ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : !filteredBookings || filteredBookings.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground app-card">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>لا توجد طلبات{filterStatus ? " في هذه الحالة" : " بعد"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(filteredBookings as any[]).map((item: any) => {
                const isExpanded = expandedBooking === item.booking.id;
                return (
                  <div
                    key={item.booking.id}
                    className="app-card overflow-hidden cursor-pointer hover:border-primary/30 transition-all"
                    onClick={() => setExpandedBooking(isExpanded ? null : item.booking.id)}
                  >
                    {/* الصف الرئيسي */}
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-foreground text-sm">#{item.booking.id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[item.booking.status] ?? "bg-gray-900/30 text-gray-400"}`}>
                            {STATUS_LABELS[item.booking.status] ?? item.booking.status}
                          </span>
                          {item.hasRating && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-300 font-semibold flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400" />مُقيَّم
                            </span>
                          )}
                        </div>
                        {/* وصف الطلب */}
                        {item.booking.itemDescription && (
                          <div className="mt-1.5 text-sm text-foreground/80 font-medium">{item.booking.itemDescription}</div>
                        )}
                        {/* من أين إلى أين */}
                        <div className="mt-2 space-y-1">
                          {item.booking.pickupLocationText && (
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                              <span><span className="text-blue-400 font-semibold">من:</span> {item.booking.pickupLocationText}</span>
                            </div>
                          )}
                          {item.booking.deliveryLocationText && (
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <Navigation2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                              <span><span className="text-green-400 font-semibold">إلى:</span> {item.booking.deliveryLocationText}</span>
                            </div>
                          )}
                        </div>
                        {/* المندوب والعميل */}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-primary" />
                            <span className="text-primary font-semibold">العميل:</span> {item.customerInfo?.name ?? "غير معروف"} • {item.customerInfo?.phone}
                          </span>
                          {item.driverUser?.name ? (
                            <span className="flex items-center gap-1">
                              <Truck className="w-3 h-3 text-orange-400" />
                              <span className="text-orange-400 font-semibold">الشوبر:</span> {item.driverUser.name} • {item.driverUser.phone}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-500">
                              <Truck className="w-3 h-3" />لم يُسند لشوبر بعد
                            </span>
                          )}
                          {/* زر تعيين مندوب يدوياً للطلبات المعلقة */}
                          {item.booking.status === "pending" && (
                            <button
                              onClick={e => { e.stopPropagation(); setAssigningBookingId(item.booking.id); }}
                              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-all font-semibold"
                            >
                              <UserCheck className="w-3 h-3" />تعيين مندوب
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-left flex-shrink-0 flex flex-col items-end gap-1">
                        <div className="text-base font-black text-primary">{item.booking.deliveryFee} ر.س</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.booking.createdAt).toLocaleDateString("ar-SA", { day: "2-digit", month: "short", year: "2-digit" })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.booking.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {/* التفاصيل الموسّعة عند النقر */}
                    {isExpanded && (
                      <div className="border-t border-white/10 px-4 pb-4 pt-3 bg-white/2 space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          {item.trip?.tripTitle && (
                            <div className="bg-white/5 rounded-lg p-2">
                              <div className="text-muted-foreground mb-0.5">اسم الرحلة</div>
                              <div className="font-semibold text-foreground">{item.trip.tripTitle}</div>
                            </div>
                          )}
                          {item.booking.storeName && (
                            <div className="bg-white/5 rounded-lg p-2">
                              <div className="text-muted-foreground mb-0.5">المتجر / المطعم</div>
                              <div className="font-semibold text-foreground">{item.booking.storeName}</div>
                            </div>
                          )}
                          {item.booking.itemType && (
                            <div className="bg-white/5 rounded-lg p-2">
                              <div className="text-muted-foreground mb-0.5">نوع الطلب</div>
                              <div className="font-semibold text-foreground">{item.booking.itemType}</div>
                            </div>
                          )}
                          {item.booking.estimatedAmount && (
                            <div className="bg-white/5 rounded-lg p-2">
                              <div className="text-muted-foreground mb-0.5">المبلغ التقديري</div>
                              <div className="font-semibold text-foreground">{item.booking.estimatedAmount} ر.س</div>
                            </div>
                          )}
                          <div className="bg-white/5 rounded-lg p-2">
                            <div className="text-muted-foreground mb-0.5">رسوم التوصيل</div>
                            <div className="font-semibold text-primary">{item.booking.deliveryFee} ر.س</div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2">
                            <div className="text-muted-foreground mb-0.5">رقم الطلب</div>
                            <div className="font-semibold text-foreground">#{item.booking.id}</div>
                          </div>
                        </div>
                        {/* ملاحظات إضافية */}
                        {item.booking.notes && (
                          <div className="bg-white/5 rounded-lg p-2 text-xs">
                            <div className="text-muted-foreground mb-0.5">ملاحظات</div>
                            <div className="text-foreground">{item.booking.notes}</div>
                          </div>
                        )}
                        {/* صورة الاستلام إن وجدت */}
                        {item.booking.pickupPhotoUrl && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">صورة الاستلام</div>
                            <img src={item.booking.pickupPhotoUrl} alt="صورة الاستلام" className="w-32 h-32 object-cover rounded-lg border border-white/10" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* نافذة تعيين مندوب يدوياً */}
      {assigningBookingId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setAssigningBookingId(null)}
        >
          <div
            className="app-card w-full max-w-sm mx-4 p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                <h3 className="font-black text-foreground">تعيين مندوب للطلب #{assigningBookingId}</h3>
              </div>
              <button onClick={() => setAssigningBookingId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">اختر مندوباً لتعيينه يدوياً لهذا الطلب (سيتغيّر الحالة إلى مقبول)</p>
            {!allDrivers || allDrivers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">لا يوجد مناديب متاحون</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(allDrivers as any[]).map((d: any) => (
                  <button
                    key={d.id}
                    onClick={() => assignDriverMutation.mutate({ bookingId: assigningBookingId, driverUserId: d.userId ?? d.id })}
                    disabled={assignDriverMutation.isPending}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-right disabled:opacity-50"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${d.isOnline ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-sm">{d.name}</div>
                      <div className="text-xs text-muted-foreground">{d.phone} • طلبات: {d.currentOrders ?? 0}/{d.maxOrders ?? 5}</div>
                      {d.cityName && <div className="text-xs text-muted-foreground/60">📍 {d.cityName}{d.streetName ? ' — ' + d.streetName : ''}</div>}
                    </div>
                    {d.isOnline && <span className="text-xs text-green-400 font-semibold flex-shrink-0">متصل</span>}
                    {assignDriverMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === "ratings" && (
        <div className="space-y-4">
          {/* تقييمات المناديب المدمجة (توصيل عادي + شوبر) */}
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <h3 className="text-base font-black text-foreground">تقييمات المناديب الشاملة</h3>
            <span className="text-xs text-muted-foreground">(توصيل عادي + شوبر)</span>
          </div>

          {loadingStats ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !mergedDriverStats || mergedDriverStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground app-card">
              <Star className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">لا توجد بيانات مناديب</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(mergedDriverStats as any[]).filter((d: any) => d.totalRatings > 0 || d.totalShopperRatings > 0).map((driver: any) => {
                const deliveryAvg = driver.totalRatings > 0 ? ((driver.avgService + driver.avgDeliverySpeed) / 2) : 0;
                const shopperAvg = driver.totalShopperRatings > 0 ? driver.avgOverall : 0;
                const combinedAvg = (driver.totalRatings > 0 && driver.totalShopperRatings > 0)
                  ? ((deliveryAvg * driver.totalRatings + shopperAvg * driver.totalShopperRatings) / (driver.totalRatings + driver.totalShopperRatings))
                  : deliveryAvg || shopperAvg;
                return (
                  <div key={driver.id} className="app-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground">{driver.name}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-black text-yellow-400 text-sm">{combinedAvg.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{driver.phone}</div>

                        {/* تقييمات التوصيل العادي */}
                        {driver.totalRatings > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-semibold text-blue-400 mb-1.5">🚗 التوصيل العادي ({driver.totalRatings} تقييم)</div>
                            <div className="space-y-1.5">
                              {[
                                { label: "جودة التعامل", value: driver.avgService, color: "from-primary to-violet-400" },
                                { label: "سرعة التوصيل", value: driver.avgDeliverySpeed, color: "from-green-500 to-emerald-400" },
                              ].map(item => (
                                <div key={item.label}>
                                  <div className="flex justify-between text-xs text-muted-foreground/70 mb-0.5">
                                    <span>{item.label}</span>
                                    <span>{item.value.toFixed(1)}/5</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full bg-gradient-to-r ${item.color}`} style={{ width: `${(item.value/5)*100}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* تقييمات الشوبر */}
                        {driver.totalShopperRatings > 0 && (
                          <div className="mt-3">
                            <div className="text-xs font-semibold text-orange-400 mb-1.5">🛍️ الشوبر ({driver.totalShopperRatings} تقييم)</div>
                            <div className="space-y-1.5">
                              {[
                                { label: "الدقة", value: driver.avgAccuracy, color: "from-blue-500 to-blue-400" },
                                { label: "السرعة", value: driver.avgSpeed, color: "from-green-500 to-emerald-400" },
                                { label: "التعاون", value: driver.avgCooperation, color: "from-purple-500 to-violet-400" },
                              ].map(item => (
                                <div key={item.label}>
                                  <div className="flex justify-between text-xs text-muted-foreground/70 mb-0.5">
                                    <span>{item.label}</span>
                                    <span>{item.value.toFixed(1)}/5</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full bg-gradient-to-r ${item.color}`} style={{ width: `${(item.value/5)*100}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {driver.totalRatings === 0 && driver.totalShopperRatings === 0 && (
                          <div className="mt-3 text-xs text-muted-foreground/50 italic">لم يتلقّ أي تقييم بعد</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* التقييمات التفصيلية للشوبر */}
          {!loadingRatings && allRatings && allRatings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-muted-foreground">تقييمات طلبات الشوبر التفصيلية ({allRatings.length})</h3>
              </div>
              <div className="space-y-3">
                {(allRatings as any[]).map((item: any) => (
                  <div key={item.rating.id} className="app-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(n => (
                              <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(parseFloat(item.rating.overallRating)) ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
                            ))}
                          </div>
                          <span className="font-black text-yellow-400">{parseFloat(item.rating.overallRating).toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">طلب #{item.rating.bookingId}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-orange-400" />الشوبر: {item.driverUser?.name ?? "غير معروف"} • {item.driverUser?.phone}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3 text-primary" />العميل: {item.customerInfo?.name ?? "غير معروف"} • {item.customerInfo?.phone}</span>
                        </div>
                        <div className="mt-2 flex gap-4 text-xs">
                          <span>الدقة: <strong className="text-blue-400">{item.rating.accuracyRating}/5</strong></span>
                          <span>السرعة: <strong className="text-green-400">{item.rating.speedRating}/5</strong></span>
                          <span>التعاون: <strong className="text-purple-400">{item.rating.cooperationRating}/5</strong></span>
                        </div>
                        {item.rating.comment && (
                          <div className="mt-2 text-xs text-muted-foreground italic bg-white/5 rounded-lg p-2">"{item.rating.comment}"</div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(item.rating.createdAt).toLocaleDateString("ar-SA", { day: "2-digit", month: "short" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === Complaints Tab ===
const COMPLAINT_STATUS_LABELS: Record<string, string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  resolved: "محلولة",
  closed: "مغلقة",
};
const COMPLAINT_CATEGORY_LABELS: Record<string, string> = {
  delivery: "توصيل",
  driver: "مندوب",
  restaurant: "مطعم",
  payment: "دفع",
  other: "أخرى",
};
const COMPLAINT_STATUS_COLORS: Record<string, string> = {
  open: "bg-red-900/30 text-red-300",
  in_progress: "bg-yellow-900/30 text-yellow-300",
  resolved: "bg-green-900/30 text-green-300",
  closed: "bg-gray-900/30 text-gray-400",
};

function ComplaintsTab() {
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "in_progress" | "resolved" | "closed">("all");
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [newStatus, setNewStatus] = useState<"open" | "in_progress" | "resolved" | "closed">("in_progress");

  const { data: complaints, refetch } = trpc.government.adminListComplaints.useQuery({ status: filterStatus });
  const replyMutation = trpc.government.adminReplyComplaint.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedComplaint(null);
      setReplyText("");
      toast.success("تم حفظ الرد وتحديث الحالة");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const closeMutation = trpc.government.adminReplyComplaint.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("تم إغلاق الشكوى");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  function openComplaint(c: any) {
    setSelectedComplaint(c);
    setReplyText(c.adminReply ?? "");
    setNewStatus(c.status === "open" ? "in_progress" : c.status);
  }

  function handleReply() {
    if (!selectedComplaint) return;
    replyMutation.mutate({ id: selectedComplaint.id, status: newStatus, adminReply: replyText || undefined });
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "open", "in_progress", "resolved", "closed"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === s
                ? "bg-primary text-white"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            }`}
          >
            {s === "all" ? "الكل" : COMPLAINT_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Complaints list */}
      {!complaints || complaints.length === 0 ? (
        <div className="app-card p-10 text-center text-muted-foreground">
          <MessageSquareWarning className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لا توجد شكاوى</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c: any) => (
            <div key={c.id} className="app-card p-4 cursor-pointer hover:border-primary/40 transition-all" onClick={() => openComplaint(c)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${COMPLAINT_STATUS_COLORS[c.status]}`}>
                      {COMPLAINT_STATUS_LABELS[c.status]}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">
                      {COMPLAINT_CATEGORY_LABELS[c.category] ?? c.category}
                    </span>
                    {c.orderNumber && <span className="text-xs text-muted-foreground">طلب #{c.orderNumber}</span>}
                  </div>
                  <p className="font-bold text-foreground mt-1.5 text-sm">{c.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {c.userName && <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />{c.userName}</span>}
                    {c.userPhone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.userPhone}</span>}
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(c.createdAt).toLocaleString("ar-SA")}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {c.adminReply ? (
                    <span className="text-xs text-green-400 flex items-center gap-1"><CheckCheck className="w-3 h-3" />تم الرد</span>
                  ) : (
                    <span className="text-xs text-orange-400 flex items-center gap-1"><Clock className="w-3 h-3" />بانتظار الرد</span>
                  )}
                  {c.status !== "closed" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); closeMutation.mutate({ id: c.id, status: "closed" }); }}
                      disabled={closeMutation.isPending}
                      className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1 mt-1"
                    >
                      <XCircle className="w-3 h-3" />
                      إغلاق
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={(o) => { if (!o) setSelectedComplaint(null); }}>
        <DialogContent className="max-w-lg rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareWarning className="w-5 h-5 text-primary" />
              تفاصيل الشكوى والرد
            </DialogTitle>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4">
              {/* Complaint details */}
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${COMPLAINT_STATUS_COLORS[selectedComplaint.status]}`}>
                    {COMPLAINT_STATUS_LABELS[selectedComplaint.status]}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">
                    {COMPLAINT_CATEGORY_LABELS[selectedComplaint.category]}
                  </span>
                </div>
                <p className="font-bold text-foreground">{selectedComplaint.subject}</p>
                <p className="text-sm text-muted-foreground">{selectedComplaint.description}</p>
                <div className="flex gap-3 flex-wrap text-xs text-muted-foreground pt-1">
                  {selectedComplaint.userName && <span>{selectedComplaint.userName}</span>}
                  {selectedComplaint.userPhone && <span>{selectedComplaint.userPhone}</span>}
                  {selectedComplaint.orderNumber && <span>طلب #{selectedComplaint.orderNumber}</span>}
                  <span>{new Date(selectedComplaint.createdAt).toLocaleString("ar-SA")}</span>
                </div>
              </div>

              {/* Status update */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">تحديث الحالة</Label>
                <div className="flex gap-2 flex-wrap">
                  {(["open", "in_progress", "resolved", "closed"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        newStatus === s ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      {COMPLAINT_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">الرد على العميل (اختياري)</Label>
                <Textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  rows={4}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedComplaint(null)} className="rounded-xl">إلغاء</Button>
            <Button onClick={handleReply} disabled={replyMutation.isPending} className="rounded-xl gap-2">
              {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              حفظ الرد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── City Polygons Tab ──────────────────────────────────────────────────────
// مكون رسم المضلع (خارج CityPolygonsTab لمنع إعادة الإنشاء عند كل render)
function PolygonDrawer({ onDone, initialPolygon }: { onDone: (polygon: [number, number][]) => void; initialPolygon?: [number, number][] | null }) {
    const mapRef = useRef<any>(null);
    const clickListenerRef = useRef<any>(null);
    const previewPolyRef = useRef<any>(null);
    const previewMarkersRef = useRef<any[]>([]);
    const polygonShapeRef = useRef<any>(null);
    const drawingPointsRef = useRef<{lat: number; lng: number}[]>([]);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [drawingPoints, setDrawingPoints] = useState<{lat: number; lng: number}[]>([]);
    const [drawnPolygon, setDrawnPolygon] = useState<[number, number][] | null>(initialPolygon ?? null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
      if (!searchQuery.trim() || !mapRef.current) return;
      setIsSearching(true);
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ address: searchQuery }, (results: any[], status: string) => {
          setIsSearching(false);
          if (status === "OK" && results && results.length > 0) {
            const loc = results[0].geometry.location;
            mapRef.current.panTo(loc);
            mapRef.current.setZoom(13);
          } else {
            toast.error("لم يتم العثور على الموقع");
          }
        });
      } catch {
        setIsSearching(false);
        toast.error("خطأ في البحث");
      }
    };

    const clearPreview = () => {
      if (previewPolyRef.current) { previewPolyRef.current.setMap(null); previewPolyRef.current = null; }
      previewMarkersRef.current.forEach(m => m.setMap(null));
      previewMarkersRef.current = [];
    };

    const updatePreview = (map: any, points: {lat: number; lng: number}[]) => {
      const google = (window as any).google;
      clearPreview();
      if (points.length === 0) return;
      points.forEach((pt, i) => {
        const el = document.createElement("div");
        el.style.cssText = `width:10px;height:10px;background:${i === 0 ? '#f59e0b' : '#3b82f6'};border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer`;
        const m = new google.maps.marker.AdvancedMarkerElement({ position: pt, map, content: el });
        previewMarkersRef.current.push(m);
      });
      if (points.length >= 2) {
        const poly = new google.maps.Polyline({ path: points, strokeColor: "#3b82f6", strokeOpacity: 0.8, strokeWeight: 2, map });
        previewPolyRef.current = poly;
      }
    };

    const drawExistingPolygon = (map: any, polygon: [number, number][]) => {
      if (polygonShapeRef.current) { polygonShapeRef.current.setMap(null); polygonShapeRef.current = null; }
      if (!polygon || polygon.length < 3) return;
      const coords = polygon.map(([lng, lat]) => ({ lat, lng }));
      const poly = new (window as any).google.maps.Polygon({
        paths: coords,
        strokeColor: "#22c55e",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#22c55e",
        fillOpacity: 0.2,
        map,
      });
      polygonShapeRef.current = poly;
    };

    const handleMapReady = (map: any) => {
      mapRef.current = map;
      setIsMapReady(true);
      if (drawnPolygon) drawExistingPolygon(map, drawnPolygon);
    };

    const startDrawing = () => {
      const map = mapRef.current;
      if (!map) return;
      const google = (window as any).google;
      if (polygonShapeRef.current) { polygonShapeRef.current.setMap(null); polygonShapeRef.current = null; }
      map.setOptions({ draggableCursor: "crosshair" });
      drawingPointsRef.current = [];
      setDrawingPoints([]);
      setIsDrawingMode(true);
      const listener = google.maps.event.addListener(map, "click", (e: any) => {
        const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        drawingPointsRef.current = [...drawingPointsRef.current, pt];
        setDrawingPoints([...drawingPointsRef.current]);
        updatePreview(map, drawingPointsRef.current);
      });
      clickListenerRef.current = listener;
    };

    const finishDrawing = () => {
      const map = mapRef.current;
      if (!map) return;
      const google = (window as any).google;
      const pts = drawingPointsRef.current;
      if (pts.length < 3) { toast.error("يجب رسم 3 نقاط على الأقل"); return; }
      if (clickListenerRef.current) { google.maps.event.removeListener(clickListenerRef.current); clickListenerRef.current = null; }
      map.setOptions({ draggableCursor: null });
      setIsDrawingMode(false);
      clearPreview();
      const coords: [number, number][] = pts.map(p => [p.lng, p.lat]);
      coords.push(coords[0]);
      setDrawnPolygon(coords);
      drawExistingPolygon(map, coords);
      drawingPointsRef.current = [];
      setDrawingPoints([]);
    };

    const cancelDrawing = () => {
      const map = mapRef.current;
      if (!map) return;
      const google = (window as any).google;
      if (clickListenerRef.current) { google.maps.event.removeListener(clickListenerRef.current); clickListenerRef.current = null; }
      map.setOptions({ draggableCursor: null });
      setIsDrawingMode(false);
      clearPreview();
      drawingPointsRef.current = [];
      setDrawingPoints([]);
    };

    return (
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {!isDrawingMode && (
            <button type="button" onClick={startDrawing} disabled={!isMapReady}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary text-white gap-1 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/></svg>
              {drawnPolygon ? "إعادة رسم المنطقة" : "ابدأ رسم المنطقة"}
            </button>
          )}
          {isDrawingMode && (
            <>
              <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-xs text-blue-400 font-medium">وضع الرسم — {drawingPoints.length} نقطة</span>
              </div>
              {drawingPoints.length >= 3 && (
                <button type="button" onClick={finishDrawing} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-600 text-white">✓ أنهِ</button>
              )}
              {drawingPoints.length > 0 && (
                <button type="button" onClick={() => {
                  const pts = drawingPointsRef.current.slice(0, -1);
                  drawingPointsRef.current = pts;
                  setDrawingPoints([...pts]);
                  if (mapRef.current) updatePreview(mapRef.current, pts);
                }} className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-amber-400/50 text-amber-400">تراجع</button>
              )}
              <button type="button" onClick={cancelDrawing} className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-400/30 text-red-400">إلغاء</button>
            </>
          )}
          {drawnPolygon && !isDrawingMode && (
            <button type="button" onClick={() => onDone(drawnPolygon)}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-green-600 text-white"
            >✓ تأكيد المنطقة</button>
          )}
        </div>
        {/* حقل البحث */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="ابحث عن مدينة أو حي..."
            className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-white/5 border border-white/15 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || !isMapReady}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-foreground flex items-center gap-1 disabled:opacity-50"
          >
            {isSearching ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70"/></svg>
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            بحث
          </button>
        </div>
        <MapView
          className="h-64 rounded-xl overflow-hidden"
          initialCenter={{ lat: 24.7136, lng: 46.6753 }}
          initialZoom={10}
          onMapReady={handleMapReady}
        />
        {drawnPolygon && !isDrawingMode && (
          <p className="text-xs text-green-400 font-medium">✅ تم رسم مضلع بـ {drawnPolygon.length - 1} نقطة — اضغط "تأكيد" للحفظ</p>
        )}
      </div>
    );
}
// مكون عرض المضلع على الخريطة (خارج CityPolygonsTab)
function PolygonViewer({ polygon }: { polygon: [number, number][] }) {
  const mapRef = useRef<any>(null);
  const handleMapReady = (map: any) => {
    mapRef.current = map;
    if (!polygon || polygon.length < 3) return;
    const coords = polygon.map(([lng, lat]) => ({ lat, lng }));
    new (window as any).google.maps.Polygon({
      paths: coords,
      strokeColor: "#22c55e",
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: "#22c55e",
      fillOpacity: 0.2,
      map,
    });
    const bounds = new (window as any).google.maps.LatLngBounds();
    coords.forEach(c => bounds.extend(c));
    map.fitBounds(bounds);
  };
  return <MapView className="h-56 rounded-xl overflow-hidden" initialCenter={{ lat: 24.7136, lng: 46.6753 }} initialZoom={10} onMapReady={handleMapReady} />;
}

function CityPolygonsTab() {
  const { data: polygons, refetch, isLoading } = trpc.cityPolygons.listAll.useQuery();
  const saveMutation = trpc.cityPolygons.save.useMutation({
    onSuccess: () => { refetch(); toast.success("تم حفظ المنطقة بنجاح"); setShowAddDialog(false); setNewName(""); setNewPolygon(null); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const updateMutation = trpc.cityPolygons.update.useMutation({
    onSuccess: () => { refetch(); toast.success("تم تحديث المنطقة"); setEditingPolygon(null); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const toggleMutation = trpc.cityPolygons.toggle.useMutation({
    onSuccess: () => { refetch(); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const deleteMutation = trpc.cityPolygons.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("تم حذف المنطقة"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPolygon, setNewPolygon] = useState<[number, number][] | null>(null);
  const [editingPolygon, setEditingPolygon] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [viewingPolygon, setViewingPolygon] = useState<any | null>(null);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground text-base">🗺️ الخرائط المرسومة</h3>
          <p className="text-xs text-muted-foreground mt-0.5">مناطق محفوظة يستخدمها المناديب لتحديد نطاق عملهم بسرعة</p>
        </div>
        <button
          onClick={() => { setShowAddDialog(true); setNewName(""); setNewPolygon(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white"
        >
          <Plus className="w-4 h-4" />إضافة منطقة
        </button>
      </div>

      {/* قائمة المناطق */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !polygons || polygons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/60 bg-white/5 rounded-2xl border border-white/10">
          <Map className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">لا توجد مناطق محفوظة بعد</p>
          <p className="text-xs mt-1">اضغط "إضافة منطقة" لإنشاء أول منطقة</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {polygons.map((poly: any) => (
            <div key={poly.id} className="app-card p-4 flex items-center gap-3 hover:bg-white/5 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${poly.isActive ? 'bg-green-400' : 'bg-slate-500'}`} />
                  <p className="font-semibold text-foreground text-sm truncate">{poly.cityName}</p>
                </div>
                <div className="flex items-center gap-3 mt-0.5 mr-4.5">
                  <p className="text-xs text-muted-foreground/60">{poly.polygon.length - 1} نقطة · أضيف {new Date(poly.createdAt).toLocaleDateString('ar-SA')}</p>
                  {(poly.usageCount ?? 0) > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {poly.usageCount} استخدام
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Toggle تفعيل/إيقاف */}
                <button
                  onClick={() => toggleMutation.mutate({ id: poly.id, isActive: !poly.isActive })}
                  disabled={toggleMutation.isPending}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                    poly.isActive
                      ? 'bg-green-500/15 text-green-400 hover:bg-red-500/15 hover:text-red-400'
                      : 'bg-slate-500/15 text-slate-400 hover:bg-green-500/15 hover:text-green-400'
                  }`}
                  title={poly.isActive ? 'إيقاف المنطقة' : 'تفعيل المنطقة'}
                >{poly.isActive ? 'نشطة' : 'موقوفة'}</button>
                <button
                  onClick={() => setViewingPolygon(poly)}
                  className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  title="عرض على الخريطة"
                ><Map className="w-4 h-4" /></button>
                <button
                  onClick={() => { setEditingPolygon(poly); setEditName(poly.cityName); }}
                  className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  title="تعديل"
                ><Pencil className="w-4 h-4" /></button>
                <button
                  onClick={() => { if (confirm(`حذف منطقة "${poly.cityName}"?`)) deleteMutation.mutate({ id: poly.id }); }}
                  className="p-2 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                  title="حذف"
                ><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog إضافة منطقة */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة منطقة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-1.5 block">اسم المنطقة</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="مثال: عنيزة، حي النزهة"
                className="rounded-xl"
              />
            </div>
            <PolygonDrawer onDone={(polygon) => setNewPolygon(polygon)} />
          </div>
          <DialogFooter>
            <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 rounded-xl text-sm border border-white/15 text-muted-foreground">إلغاء</button>
            <button
              onClick={() => {
                if (!newName.trim()) { toast.error("أدخل اسم المنطقة"); return; }
                if (!newPolygon) { toast.error("ارسم المنطقة على الخريطة أولاً"); return; }
                saveMutation.mutate({ cityName: newName.trim(), polygon: newPolygon });
              }}
              disabled={saveMutation.isPending}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white flex items-center gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              حفظ
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog تعديل منطقة */}
      <Dialog open={!!editingPolygon} onOpenChange={(v) => !v && setEditingPolygon(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل منطقة: {editingPolygon?.cityName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-1.5 block">اسم المنطقة</Label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="اسم المنطقة"
                className="rounded-xl"
              />
            </div>
            {editingPolygon && (
              <PolygonDrawer
                onDone={(polygon) => {
                  updateMutation.mutate({ id: editingPolygon.id, cityName: editName.trim() || editingPolygon.cityName, polygon });
                }}
                initialPolygon={editingPolygon.polygon}
              />
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setEditingPolygon(null)} className="px-4 py-2 rounded-xl text-sm border border-white/15 text-muted-foreground">إلغاء</button>
            <button
              onClick={() => {
                if (!editingPolygon) return;
                updateMutation.mutate({ id: editingPolygon.id, cityName: editName.trim() || editingPolygon.cityName });
              }}
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white flex items-center gap-2"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              حفظ الاسم فقط
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog عرض المنطقة على الخريطة */}
      <Dialog open={!!viewingPolygon} onOpenChange={(v) => !v && setViewingPolygon(null)}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>🗺️ {viewingPolygon?.cityName}</DialogTitle>
          </DialogHeader>
          {viewingPolygon && <PolygonViewer polygon={viewingPolygon.polygon} />}
          <DialogFooter>
            <button onClick={() => setViewingPolygon(null)} className="px-4 py-2 rounded-xl text-sm border border-white/15 text-muted-foreground">إغلاق</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function Admin() {
  const [, setLocation] = useLocation();
  const { data: adminUser, isLoading: adminLoading, refetch: refetchAdmin } = trpc.phoneAuth.adminMe.useQuery();
  const logoutMutation = trpc.phoneAuth.adminLogout.useMutation({
    onSuccess: () => { refetchAdmin(); },
  });

  const { data: orders } = trpc.orders.adminList.useQuery(undefined, { refetchInterval: 30000, enabled: !!adminUser });
  const { data: drivers } = trpc.drivers.adminList.useQuery(undefined, { enabled: !!adminUser });
  const { data: restaurants } = trpc.restaurants.listAll.useQuery(undefined, { enabled: !!adminUser });
  const { data: openComplaintsData } = trpc.government.adminCountOpenComplaints.useQuery(undefined, { refetchInterval: 60000, enabled: !!adminUser });
  const openComplaintsCount = openComplaintsData?.count ?? 0;

  // الزوار المتصلين الآن - يجب أن يكون قبل أي early return
  const { data: visitorsData } = trpc.restaurants.adminGetVisitors.useQuery(undefined, {
    refetchInterval: 30_000,
    enabled: !!adminUser,
  });
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [showOnlineDriversModal, setShowOnlineDriversModal] = useState(false);
  const [selectedOnlineDriver, setSelectedOnlineDriver] = useState<any>(null);

  if (adminLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!adminUser) return <AdminLogin onSuccess={() => refetchAdmin()} />;

  const pendingOrders = orders?.filter(o => o.status === "pending").length ?? 0;
  const activeOrders = orders?.filter(o => !["delivered", "cancelled"].includes(o.status)).length ?? 0;
  const onlineDrivers = drivers?.filter(d => d.isOnline).length ?? 0;
  const totalRestaurants = restaurants?.length ?? 0;

  return (
    <div className="min-h-screen admin-bg" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 admin-header">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-foreground text-lg leading-none">لوحة التحكم</div>
              <div className="text-xs text-muted-foreground">الإدارة العامة</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setLocation("/")} className="rounded-xl gap-1 text-xs">
              <ChevronRight className="w-4 h-4" />الرئيسية
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:block">{adminUser?.username ?? "admin"}</span>
            <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()} className="rounded-xl gap-1 text-xs text-red-500 border-red-200 hover:bg-red-900/20">
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={ShoppingBag} label="طلبات نشطة" value={activeOrders} color="bg-primary/10 text-primary" />
          <StatCard icon={AlertCircle} label="طلبات معلقة" value={pendingOrders} color="bg-yellow-900/20 text-yellow-300" />
          <div
            className="app-card p-5 flex items-center gap-4 cursor-pointer hover:border-blue-500/50 transition-colors"
            onClick={() => setShowOnlineDriversModal(true)}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-900/20 text-blue-300">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">{onlineDrivers}</div>
              <div className="text-sm text-muted-foreground">مناديب أونلاين</div>
            </div>
          </div>
          <StatCard icon={Store} label="المطاعم" value={totalRestaurants} color="bg-green-900/20 text-green-300" />
          {/* بطاقة الزوار المتصلين */}
          <div
            className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setShowVisitorsModal(true)}
          >
            <div className="w-10 h-10 bg-purple-900/30 rounded-xl flex items-center justify-center mb-1">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div className="font-black text-2xl text-purple-300">{visitorsData?.total ?? 0}</div>
            <div className="text-xs text-muted-foreground text-center">زوار متصلون الآن</div>
          </div>
        </div>

        {/* نافذة إحصائيات المدن */}
        {showVisitorsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowVisitorsModal(false)}>
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span className="font-black text-foreground">الزوار المتصلون الآن</span>
                </div>
                <button onClick={() => setShowVisitorsModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-center mb-4">
                <div className="font-black text-4xl text-purple-300">{visitorsData?.total ?? 0}</div>
                <div className="text-sm text-muted-foreground">زائر نشط خلال آخر 90 ثانية</div>
              </div>
              {visitorsData?.byCityId && visitorsData.byCityId.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-muted-foreground mb-2">توزيع المدن</div>
                  {visitorsData.byCityId.map(city => (
                    <div key={city.cityId} className="flex items-center justify-between bg-muted/20 rounded-xl px-3 py-2">
                      <span className="text-sm font-semibold text-foreground">{city.cityName}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${Math.max(20, (city.count / (visitorsData.total || 1)) * 80)}px` }} />
                        <span className="font-black text-purple-300 text-sm w-6 text-center">{city.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">لا يوجد زوار نشطون حالياً</div>
              )}
              <div className="text-xs text-muted-foreground text-center mt-4">يتحدث تلقائياً كل 30 ثانية</div>
            </div>
          </div>
        )}

        {/* نافذة تفاصيل المناديب الأونلاين */}
        {showOnlineDriversModal && (() => {
          const onlineDriversList = (drivers ?? []).filter(d => d.isOnline);
          const driversWithLocation = onlineDriversList.filter(d => d.currentLat && d.currentLng);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { setShowOnlineDriversModal(false); setSelectedOnlineDriver(null); }}>
              <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-900/30 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-black text-foreground">المناديب الأونلاين</div>
                      <div className="text-xs text-muted-foreground">{onlineDriversList.length} مندوب متصل · {driversWithLocation.length} بموقع حي</div>
                    </div>
                  </div>
                  <button onClick={() => { setShowOnlineDriversModal(false); setSelectedOnlineDriver(null); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                  {/* قائمة المناديب */}
                  <div className="w-full md:w-72 border-b md:border-b-0 md:border-l border-border overflow-y-auto max-h-64 md:max-h-full">
                    {onlineDriversList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Truck className="w-10 h-10 mb-3 opacity-30" />
                        <div className="text-sm">لا يوجد مناديب متصلون الآن</div>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {onlineDriversList.map(d => (
                          <div
                            key={d.id}
                            className={`px-4 py-3 cursor-pointer transition-colors hover:bg-muted/20 ${
                              selectedOnlineDriver?.id === d.id ? "bg-blue-900/20 border-r-2 border-blue-400" : ""
                            }`}
                            onClick={() => setSelectedOnlineDriver(d)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center">
                                    <Truck className="w-4 h-4 text-blue-400" />
                                  </div>
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                                </div>
                                <div>
                                  <div className="font-semibold text-sm text-foreground">{d.name ?? "مندوب"}</div>
                                  <div className="text-xs text-muted-foreground">{(d as any).currentCityName ?? (d as any).cityName ?? "—"}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                {d.currentOrders != null && (
                                  <div className="text-xs font-bold text-blue-400">{d.currentOrders} طلب</div>
                                )}
                                {d.rating != null && (
                                  <div className="text-xs text-yellow-400 flex items-center gap-0.5 justify-end">
                                    <Star className="w-3 h-3" />{Number(d.rating).toFixed(1)}
                                  </div>
                                )}
                              </div>
                            </div>
                            {d.currentLat && d.currentLng && (
                              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                                <Navigation2 className="w-3 h-3 text-green-400" />
                                <span className="text-green-400">موقع حي</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* الخريطة */}
                  <div className="flex-1 min-h-64 md:min-h-0 relative">
                    {driversWithLocation.length > 0 ? (
                      <MapView
                        initialCenter={selectedOnlineDriver?.currentLat
                          ? { lat: Number(selectedOnlineDriver.currentLat), lng: Number(selectedOnlineDriver.currentLng) }
                          : { lat: Number(driversWithLocation[0].currentLat), lng: Number(driversWithLocation[0].currentLng) }
                        }
                        initialZoom={selectedOnlineDriver ? 14 : 11}
                        className="w-full h-full min-h-64"
                        onMapReady={(map) => {
                          const google = (window as any).google;
                          if (!google) return;
                          // رسم markers لجميع المناديب الأونلاين باستخدام AdvancedMarkerElement
                          driversWithLocation.forEach(d => {
                            const lat = Number(d.currentLat);
                            const lng = Number(d.currentLng);
                            const isSelected = selectedOnlineDriver?.id === d.id;

                            // إنشاء عنصر HTML مخصص للـ marker
                            const markerEl = document.createElement("div");
                            markerEl.style.cssText = [
                              `width:${isSelected ? 28 : 20}px`,
                              `height:${isSelected ? 28 : 20}px`,
                              `background:${isSelected ? "#3b82f6" : "#22c55e"}`,
                              "border-radius:50%",
                              "border:3px solid #ffffff",
                              "box-shadow:0 2px 6px rgba(0,0,0,0.4)",
                              "cursor:pointer",
                            ].join(";");

                            const marker = new google.maps.marker.AdvancedMarkerElement({
                              position: { lat, lng },
                              map,
                              title: d.name ?? "مندوب",
                              content: markerEl,
                            });

                            const infoWindow = new google.maps.InfoWindow({
                              content: `<div style="direction:rtl;font-family:Tajawal,sans-serif;padding:4px 8px">
                                <div style="font-weight:700;font-size:13px">${d.name ?? "مندوب"}</div>
                                <div style="color:#666;font-size:11px">${(d as any).currentCityName ?? (d as any).cityName ?? ""}</div>
                                ${d.currentOrders != null ? `<div style="color:#3b82f6;font-size:11px">${d.currentOrders} طلب نشط</div>` : ""}
                                ${d.rating != null ? `<div style="color:#f59e0b;font-size:11px">⭐ ${Number(d.rating).toFixed(1)}</div>` : ""}
                              </div>`,
                            });
                            marker.addListener("click", () => {
                              infoWindow.open(map, marker);
                            });
                            if (isSelected) {
                              infoWindow.open(map, marker);
                            }
                          });
                        }}
                      />
                    ) : (
                      <div className="w-full h-full min-h-64 flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                        <MapPin className="w-10 h-10 mb-3 opacity-30" />
                        <div className="text-sm">لا يوجد مناديب بموقع حي</div>
                        <div className="text-xs mt-1">يجب أن يشغّل المندوب التطبيق لظهور موقعه</div>
                      </div>
                    )}

                    {/* بطاقة تفاصيل المندوب المختار */}
                    {selectedOnlineDriver && (
                      <div className="absolute bottom-4 right-4 left-4 bg-card/95 backdrop-blur border border-border rounded-2xl p-4 shadow-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center">
                              <Truck className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <div className="font-black text-foreground">{selectedOnlineDriver.name ?? "مندوب"}</div>
                              <div className="text-xs text-muted-foreground">{(selectedOnlineDriver as any).currentCityName ?? (selectedOnlineDriver as any).cityName ?? "—"} · {(selectedOnlineDriver as any).streetName ?? ""}</div>
                            </div>
                          </div>
                          <button onClick={() => setSelectedOnlineDriver(null)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="bg-muted/20 rounded-xl p-2 text-center">
                            <div className="font-black text-blue-400 text-lg">{selectedOnlineDriver.currentOrders ?? 0}</div>
                            <div className="text-xs text-muted-foreground">طلبات نشطة</div>
                          </div>
                          <div className="bg-muted/20 rounded-xl p-2 text-center">
                            <div className="font-black text-yellow-400 text-lg">{selectedOnlineDriver.rating != null ? Number(selectedOnlineDriver.rating).toFixed(1) : "—"}</div>
                            <div className="text-xs text-muted-foreground">التقييم</div>
                          </div>
                          <div className="bg-muted/20 rounded-xl p-2 text-center">
                            <div className="font-black text-green-400 text-lg">{selectedOnlineDriver.totalDeliveries ?? 0}</div>
                            <div className="text-xs text-muted-foreground">إجمالي التوصيل</div>
                          </div>
                        </div>
                        {selectedOnlineDriver.phone && (
                          <a href={`tel:${selectedOnlineDriver.phone}`} className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline">
                            <Phone className="w-4 h-4" />{selectedOnlineDriver.phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tabs */}
        <Tabs defaultValue="orders">
          <TabsList className="bg-white/5 border border-white/10 rounded-2xl p-1 w-full grid grid-cols-12">
            <TabsTrigger value="orders" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-semibold">
              <ShoppingBag className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">الطلبات</span>
              {pendingOrders > 0 && <span className="mr-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingOrders}</span>}
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-semibold">
              <Store className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">المطاعم</span>
            </TabsTrigger>
            <TabsTrigger value="menus" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-semibold">
              <ChefHat className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">القوائم</span>
            </TabsTrigger>
            <TabsTrigger value="drivers" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-semibold">
              <Truck className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">المناديب</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-semibold">
              <KeyRound className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">المستخدمون</span>
            </TabsTrigger>
            <TabsTrigger value="cities" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-semibold">
              <Globe className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">المدن</span>
            </TabsTrigger>

            <TabsTrigger value="customers" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-semibold">
              <Users className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">العملاء</span>
            </TabsTrigger>
            <TabsTrigger value="gplaces" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-semibold">
              <Globe className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">جوجل</span>
            </TabsTrigger>
            <TabsTrigger value="banners" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-semibold">
              <Megaphone className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">البانرات</span>
            </TabsTrigger>
            <TabsTrigger value="shopper-admin" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-semibold">
              <ShoppingBag className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">شوبر</span>
            </TabsTrigger>
            <TabsTrigger value="complaints" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-semibold relative">
              <MessageSquareWarning className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">الشكاوى</span>
              {openComplaintsCount > 0 && <span className="mr-1 bg-red-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1">{openComplaintsCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="city-polygons" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white text-xs font-semibold">
              <Map className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">الخرائط</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4"><OrdersTab /></TabsContent>
          <TabsContent value="restaurants" className="mt-4"><RestaurantsTab /></TabsContent>
          <TabsContent value="menus" className="mt-4"><MenusTab /></TabsContent>
          <TabsContent value="drivers" className="mt-4"><DriversTab /></TabsContent>
          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
          <TabsContent value="cities" className="mt-4"><CitiesTab /></TabsContent>

          <TabsContent value="customers" className="mt-4"><CustomersTab /></TabsContent>
          <TabsContent value="gplaces" className="mt-4"><GooglePlacesTab /></TabsContent>
          <TabsContent value="banners" className="mt-4"><BannersTab /></TabsContent>
          <TabsContent value="shopper-admin" className="mt-4"><ShopperAdminTab /></TabsContent>
          <TabsContent value="complaints" className="mt-4"><ComplaintsTab /></TabsContent>
          <TabsContent value="city-polygons" className="mt-4"><CityPolygonsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
