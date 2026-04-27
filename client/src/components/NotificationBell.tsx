import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCheck, Package } from "lucide-react";
import { useState } from "react";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications, refetch } = trpc.notifications.list.useQuery(undefined, { refetchInterval: 30000 });
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, { refetchInterval: 30000 });
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: () => refetch() });
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => refetch() });

  const count = unreadCount ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" dir="rtl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-foreground">الإشعارات</h3>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-primary h-7 gap-1" onClick={() => markAllRead.mutate()}>
              <CheckCheck className="w-3.5 h-3.5" />
              قراءة الكل
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!notifications?.length ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد إشعارات</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-4 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${!n.isRead ? "bg-primary/5" : ""}`}
                onClick={() => { if (!n.isRead) markRead.mutate({ id: n.id }); }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!n.isRead ? "bg-primary/10" : "bg-muted"}`}>
                  <Package className={`w-4 h-4 ${!n.isRead ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</div>
                  {(n as any).imageUrl && (
                    <a href={(n as any).imageUrl} target="_blank" rel="noreferrer" className="block mt-2">
                      <img
                        src={(n as any).imageUrl}
                        alt="صورة التسليم"
                        className="w-full max-h-32 object-cover rounded-lg border border-border"
                      />
                      <span className="text-xs text-primary mt-1 block">📷 اضغط لعرض صورة التسليم</span>
                    </a>
                  )}
                  <div className="text-xs text-muted-foreground/60 mt-1">
                    {new Date(n.createdAt).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                  </div>
                </div>
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
