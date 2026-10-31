"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StatusPill, ZoneBadge, EmptyState } from "./brand";
import { ORDER_TYPES, rp } from "@/lib/nyandak";
import { tgl } from "./client";
import type { OrderDTO } from "./types";

export function OrderCard({ order, onTap }: { order: OrderDTO; onTap: () => void }) {
  const type = ORDER_TYPES[order.type] ?? { label: order.type, emoji: "📦" };
  return (
    <button onClick={onTap} className="ny-card w-full bg-card text-left p-4 active:scale-[0.99] transition-transform">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground font-semibold">{order.code} · {tgl(order.createdAt)}</p>
          <p className="font-bold truncate">
            {type.emoji} {type.label} <ZoneBadge zone={order.zone} /> · {order.villageFrom} → {order.villageTo}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{order.items}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <StatusPill status={order.status} />
          <span className="text-sm font-bold">{rp(order.fare)}</span>
        </div>
      </div>
    </button>
  );
}

export function OrderList({ orders, onTap }: { orders: OrderDTO[]; onTap: (id: string) => void }) {
  if (orders.length === 0) {
    return <EmptyState emoji="📭" title="Belum ada pesanan" sub="Order pertamamu muncul di sini." />;
  }
  return (
    <div className="space-y-2.5">
      {orders.map((o) => <OrderCard key={o.id} order={o} onTap={() => onTap(o.id)} />)}
    </div>
  );
}
