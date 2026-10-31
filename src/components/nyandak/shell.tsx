"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api, tgl, useSocket } from "./client";
import { Wordmark } from "./brand";
import type { NotificationDTO } from "./types";

export function NotifBell({
  me, unread, onRead, onTapOrder,
}: {
  me: { id: string; role: string };
  unread: number;
  onRead: () => void;
  onTapOrder: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDTO[]>([]);

  const load = useCallback(() => {
    api<{ notifications: NotificationDTO[] }>("/api/notifications")
      .then((r) => setItems(r.notifications))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function markAll() {
    await api("/api/notifications", { action: "readAll" });
    onRead();
    load();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center text-lg" aria-label="Notifikasi">
          🔔
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0 bg-background flex flex-col">
        <SheetHeader className="p-4 pb-2 flex-row items-center justify-between">
          <SheetTitle className="text-left">🔔 Notifikasi</SheetTitle>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={markAll}>Tandai dibaca</Button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-10">Belum ada notifikasi.</p>}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                await api("/api/notifications", { action: "read", id: n.id }).catch(() => {});
                onRead();
                if (n.orderId) {
                  setOpen(false);
                  onTapOrder(n.orderId);
                }
              }}
              className={`w-full text-left ny-card bg-card p-3.5 ${!n.read ? "border-l-4 border-primary" : ""}`}
            >
              <p className="text-sm font-bold">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{tgl(n.createdAt)}</p>
              {n.orderId && <p className="text-[10px] text-primary font-bold mt-1">Buka order →</p>}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function TopBar({ me, unread, onRead, onTapOrder }: {
  me: { id: string; role: string; name: string };
  unread: number;
  onRead: () => void;
  onTapOrder: (id: string) => void;
}) {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border/60">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-16">
        <Wordmark />
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs font-bold text-muted-foreground mr-1">
            {me.role === "CUSTOMER" ? "🙋 Customer" : me.role === "KURIR" ? "🛵 Kurir" : "🖥️ Admin"}
          </span>
          <NotifBell me={me} unread={unread} onRead={onRead} onTapOrder={onTapOrder} />
        </div>
      </div>
    </header>
  );
}

// ── navigasi bawah ala aplikasi HP ──
export interface TabDef {
  key: string;
  label: string;
  icon: string;
}

export function BottomNav({
  tabs, active, onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border/80 pb-safe" aria-label="Navigasi utama">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1 min-h-[56px] transition-colors ${
              active === t.key ? "text-primary font-bold" : "text-muted-foreground"
            }`}
            aria-current={active === t.key ? "page" : undefined}
          >
            <span className="text-xl leading-none">{t.icon}</span>
            <span className="text-[10px]">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// hook notifikasi global: toasts realtime + badge
export function useRealtimeBadge(me: { id: string; role: string } | null) {
  const [unread, setUnread] = useState(0);
  const [signal, setSignal] = useState(0);
  const socket = useSocket(me?.id, me?.role);

  useEffect(() => {
    if (!me) return;
    api<{ unread: number }>("/api/auth").then((r) => setUnread(r.unread ?? 0)).catch(() => {});
    const t = setInterval(() => {
      api<{ unread: number }>("/api/auth").then((r) => setUnread(r.unread ?? 0)).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [me]);

  useEffect(() => {
    if (!socket) return;
    const onNotify = (n: { title?: string; body?: string }) => {
      setUnread((u) => u + 1);
      if (n?.title) toast(n.title, { description: n.body });
    };
    const bump = () => setSignal((s) => s + 1);
    socket.on("notify", onNotify);
    socket.on("order:new", bump);
    socket.on("order:update", bump);
    socket.on("order:refresh", bump);
    socket.on("orders:refresh", bump);
    socket.on("chat:new", bump);
    socket.on("admin:refresh", bump);
    socket.on("settings:changed", bump);
    return () => {
      socket.off("notify", onNotify);
      socket.off("order:new", bump);
      socket.off("order:update", bump);
      socket.off("order:refresh", bump);
      socket.off("orders:refresh", bump);
      socket.off("chat:new", bump);
      socket.off("admin:refresh", bump);
      socket.off("settings:changed", bump);
    };
  }, [socket]);

  return { unread, setUnread, signal };
}
