"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderList } from "./order-card";
import { EmptyState } from "./brand";
import { ZONE_LABEL, ZONE_TARGET, ORDER_TYPES, rp } from "@/lib/nyandak";
import type { OrderDTO, PublicInfo } from "./types";

export function CustomerHome({
  me, info, orders, onNewOrder, onTapOrder,
}: {
  me: { name: string };
  info: PublicInfo;
  orders: OrderDTO[];
  onNewOrder: (type?: string) => void;
  onTapOrder: (id: string) => void;
}) {
  const active = orders.filter((o) => ["MENUNGGU_KURIR", "DIPROSES", "DIANTAR"].includes(o.status));

  return (
    <div className="space-y-4">
      {/* Sapaan */}
      <div>
        <h1 className="text-xl font-extrabold">Wilujeng, {me.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Ada yang dititip hari ini?</p>
      </div>

      {/* Order aktif */}
      {active.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Sedang jalan</p>
          {active.map((o) => (
            <button key={o.id} onClick={() => onTapOrder(o.id)} className="ny-card w-full bg-card text-left p-4 active:scale-[0.99] transition-transform border-l-4 border-primary">
              <p className="font-bold text-sm">🛵 {o.code} · {o.villageTo}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {o.status === "MENUNGGU_KURIR" ? "Nyari kurir…" : o.status === "DIPROSES" ? "Kurir lagi proses" : "Lagi dijalan ke kamu!"}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Kartu layanan */}
      <div className="grid grid-cols-2 gap-2.5">
        {Object.entries(ORDER_TYPES).map(([key, v]) => (
          <button
            key={key}
            onClick={() => onNewOrder(key)}
            className={`${key === "BELIIN" ? "bg-primary text-primary-foreground" : key === "LAINNYA" ? "bg-success text-success-foreground" : "bg-card"} ny-card p-4 text-left min-h-[44px] active:scale-[0.98] transition-transform`}
          >
            <span className="text-2xl">{v.emoji}</span>
            <span className="block font-extrabold mt-1">{v.label}</span>
            <span className={`block text-[11px] ${key === "BELIIN" || key === "LAINNYA" ? "opacity-80" : "text-muted-foreground"}`}>{v.desc}</span>
          </button>
        ))}
      </div>

      {/* Info layanan */}
      <Card className="ny-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Tarif & zona</p>
            <span className={`text-xs font-bold ${info.openNow ? "text-success" : "text-destructive"}`}>
              {info.openNow ? "🟢 Buka" : `🔴 Tutup · ${String(info.openHour).padStart(2, "0")}.00–${String(info.closeHour).padStart(2, "0")}.00`}
            </span>
          </div>
          {(["A", "B", "C"] as const).map((z) => (
            <div key={z} className="flex items-center justify-between py-2 border-b last:border-0 border-border/60 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className={`zone-badge zone-${z.toLowerCase()}`}>{z}</span>
                <span className="text-muted-foreground text-xs truncate">{ZONE_LABEL[z]}</span>
              </span>
              <span className="text-right shrink-0 ml-2">
                <span className="font-bold">{rp(info.fares[z])}</span>
                <span className="block text-[10px] text-muted-foreground">{ZONE_TARGET[z]}</span>
              </span>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground mt-2.5">
            💵 Semua bayar cash di tempat · 🛵 {info.kurirOnline} kurir online · COD maks {rp(info.codLimit)}
          </p>
        </CardContent>
      </Card>

      {/* Riwayat singkat */}
      <div className="space-y-2.5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Pesanan terakhir</p>
        <RecentOrders orders={orders} onTap={onTapOrder} onNew={() => onNewOrder()} />
      </div>
    </div>
  );
}

function RecentOrders({ orders, onTap, onNew }: { orders: OrderDTO[]; onTap: (id: string) => void; onNew: () => void }) {
  const done = orders.filter((o) => ["SELESAI", "DIBATALKAN"].includes(o.status)).slice(0, 3);
  if (orders.length === 0) {
    return <EmptyState emoji="🛵" title="Belum pernah order" sub="Tekan salah satu kartu layanan di atas buat mulai." />;
  }
  return (
    <>
      <OrderList orders={done} onTap={onTap} />
      {orders.length > 0 && (
        <Button variant="outline" className="w-full h-11 rounded-full" onClick={onNew}>
          + Bikin order baru
        </Button>
      )}
    </>
  );
}
