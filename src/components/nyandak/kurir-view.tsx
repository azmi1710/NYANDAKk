"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { OrderCard, OrderList } from "./order-card";
import { EmptyState, ZoneBadge } from "./brand";
import { sisaMenit, tgl, useNow } from "./client";
import { ORDER_TYPES, rp } from "@/lib/nyandak";
import type { BoardItem, LedgerEntryDTO, Me, OrderDTO } from "./types";

export function KurirBoard({
  me, board, mine, todayFare, onAccept, onTapOrder, onToggleOnline, busyId,
}: {
  me: Me;
  board: BoardItem[];
  mine: OrderDTO[];
  todayFare: number;
  onAccept: (id: string) => void;
  onTapOrder: (id: string) => void;
  onToggleOnline: (v: boolean) => void;
  busyId: string | null;
}) {
  useNow(10000);
  return (
    <div className="space-y-4">
      {/* Saklar online + pendapatan */}
      <Card className={`ny-card ${me.online ? "border-success/60" : ""}`}>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-extrabold">{me.online ? "🟢 Kamu ONLINE" : "⚪ Kamu offline"}</p>
            <p className="text-xs text-muted-foreground">
              {me.online ? "Order baru muncul di papan otomatis" : "Online dulu biar dapet order"}
            </p>
          </div>
          <Switch checked={me.online} onCheckedChange={onToggleOnline} className="scale-125" aria-label="Mode online" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <Card className="ny-card"><CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground font-bold uppercase">Ongkir hari ini</p>
          <p className="text-xl font-extrabold text-primary">{rp(todayFare)}</p>
        </CardContent></Card>
        <Card className="ny-card"><CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground font-bold uppercase">Order di papan</p>
          <p className="text-xl font-extrabold">{board.length}</p>
        </CardContent></Card>
      </div>

      {/* Papan order */}
      <div className="space-y-2.5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">📋 Papan order — siapa cepat dia dapat</p>
        {!me.online ? (
          <EmptyState emoji="😴" title="Kamu offline" sub="Nyalakan saklar Online di atas buat lihat order masuk." />
        ) : board.length === 0 ? (
          <EmptyState emoji="🌿" title="Belum ada order masuk" sub="Santai dulu, order bakal muncul di sini." />
        ) : (
          board.map((b) => {
            const t = ORDER_TYPES[b.type] ?? { label: b.type, emoji: "📦" };
            const sisa = sisaMenit(b.broadcastAt);
            return (
              <Card key={b.id} className={`ny-card p-4 ${sisa <= 5 ? "border-destructive/50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground font-semibold">{b.code} · {b.customerName}</p>
                    <p className="font-bold text-sm truncate">{t.emoji} {t.label} <ZoneBadge zone={b.zone} /> {b.villageFrom} → {b.villageTo}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{b.items}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-extrabold text-primary">{rp(b.fare)}</p>
                    <p className="text-[10px] text-muted-foreground">setor {rp(b.fee)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className={`text-[10px] ${sisa <= 5 ? "border-destructive/50 text-destructive" : ""}`}>
                    ⏱ {sisa} mnt{b.budget ? ` · ±${rp(b.budget)}` : ""}
                  </Badge>
                  <Button
                    size="sm"
                    className="ml-auto h-11 rounded-full px-6 font-extrabold"
                    disabled={busyId === b.id || mine.length >= 2}
                    onClick={() => onAccept(b.id)}
                  >
                    {mine.length >= 2 ? "Selesaikan order aktif dulu" : busyId === b.id ? "Mengambil…" : "AMBIL 🛵"}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Order aktif */}
      {mine.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">🔥 Order kamu yang lagi jalan</p>
          {mine.map((o) => <OrderCard key={o.id} order={o} onTap={() => onTapOrder(o.id)} />)}
        </div>
      )}
    </div>
  );
}

export function KurirRiwayat({ history }: { history: OrderDTO[] }) {
  if (history.length === 0) return <EmptyState emoji="📚" title="Belum ada riwayat" sub="Order yang udah selesai/batal muncul di sini." />;
  return <OrderList orders={history} onTap={() => {}} />;
}

export function KurirTabungan({ entries }: { entries: LedgerEntryDTO[] }) {
  const outstanding = entries.filter((e) => e.type === "FEE" && !e.settled).reduce((a, e) => a + e.amount, 0);
  const weekFee = entries
    .filter((e) => e.type === "FEE" && Date.now() - new Date(e.createdAt).getTime() < 7 * 86400000)
    .reduce((a, e) => a + e.amount, 0);
  const settledTotal = entries.filter((e) => e.type === "SETOR").reduce((a, e) => a + Math.abs(e.amount), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2.5">
        <Card className="ny-card"><CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground font-bold uppercase">Tagihan setor (fee 20%)</p>
          <p className="text-2xl font-extrabold text-destructive">{rp(outstanding)}</p>
          <p className="text-xs text-muted-foreground mt-1">Setor ke admin tiap Minggu malam — transfer/cash, admin yang konfirmasi.</p>
        </CardContent></Card>
        <div className="grid grid-cols-2 gap-2.5">
          <Card className="ny-card"><CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground font-bold uppercase">Fee 7 hari</p>
            <p className="text-lg font-extrabold text-success">{rp(weekFee)}</p>
          </CardContent></Card>
          <Card className="ny-card"><CardContent className="p-4">
            <p className="text-[11px] text-muted-foreground font-bold uppercase">Udah disetor</p>
            <p className="text-lg font-extrabold">{rp(settledTotal)}</p>
          </CardContent></Card>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Catatan terakhir</p>
        {entries.length === 0 && <EmptyState emoji="🐷" title="Belum ada catatan" sub="Selesaikan order buat mulai nabung." />}
        {entries.slice(0, 30).map((e) => (
          <div key={e.id} className="ny-card bg-card p-3 flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold">{e.type === "FEE" ? "Fee order" : "Setoran"} {e.orderCode ? `· ${e.orderCode}` : ""}</p>
              <p className="text-[11px] text-muted-foreground">{tgl(e.createdAt)}{e.type === "FEE" && !e.settled ? " · belum disetor" : e.settled ? " · lunas" : ""}</p>
            </div>
            <p className={`font-bold ${e.amount < 0 ? "text-success" : ""}`}>{e.amount < 0 ? "-" : ""}{rp(Math.abs(e.amount))}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
