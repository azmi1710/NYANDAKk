"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusPill, ZoneBadge, EmptyState } from "./brand";
import { api, tgl } from "./client";
import { rp, STATUS_LABEL } from "@/lib/nyandak";
import type { Me, OrderDTO } from "./types";

interface Overview {
  stats: { ordersToday: number; ordersWeek: number; ordersTotal: number; active: number; kurirOnline: number; kurirTotal: number; feeWeek: number; openNow: boolean };
  byStatus: { status: string; count: number }[];
  disputes: OrderDTO[];
  logs: { id: string; action: string; detail: string | null; createdAt: string; actor?: { name: string } | null }[];
  announcement: string;
}
interface KurirRow { id: string; name: string; phone: string; village: string | null; status: string; online: boolean; done: number; outstanding: number; oldestUnpaid: string | null; }
interface CustomerRow { id: string; name: string; phone: string; village: string | null; status: string; orders: number; penalties: number; }
interface LedgerKurir { id: string; name: string; status: string; outstanding: number; }
interface LedgerEntry { id: string; kurirName: string; type: string; amount: number; settled: boolean; orderCode?: string | null; createdAt: string; }

export default function AdminView({
  me, refreshSignal, onTapOrder, tabKey, onTabKey,
}: {
  me: Me;
  refreshSignal: number;
  onTapOrder: (id: string) => void;
  tabKey: string;
  onTabKey: (k: string) => void;
}) {
  const tab = tabKey as "ringkasan" | "order" | "orang" | "tabungan" | "setelan";
  const setTab = onTabKey;
  const [ov, setOv] = useState<Overview | null>(null);
  const [people, setPeople] = useState<{ kurirs: KurirRow[]; customers: CustomerRow[] } | null>(null);
  const [ledger, setLedger] = useState<{ kurirs: LedgerKurir[]; entries: LedgerEntry[] } | null>(null);

  async function logout() {
    await api("/api/auth", { action: "logout" });
    window.location.reload();
  }
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [filter, setFilter] = useState("ALL");

  const load = async () => {
    try {
      const [a, b, c, d] = await Promise.all([
        api<Overview>("/api/admin?view=overview"),
        api<{ kurirs: KurirRow[]; customers: CustomerRow[] }>("/api/admin?view=people"),
        api<{ kurirs: LedgerKurir[]; entries: LedgerEntry[] }>("/api/admin?view=ledger"),
        api<{ orders: OrderDTO[] }>("/api/orders"),
      ]);
      setOv(a); setPeople(b); setLedger(c); setOrders(d.orders);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  useEffect(() => {
    void load();
     
  }, [refreshSignal]);

  async function act(payload: object, okMsg: string) {
    try {
      await api("/api/admin", payload);
      toast.success(okMsg);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {([["ringkasan", "📊 Ringkasan"], ["order", "📦 Order"], ["orang", "👥 Orang"], ["tabungan", "💰 Tabungan"], ["setelan", "⚙️ Setelan"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`shrink-0 rounded-full px-4 h-10 text-sm font-bold transition-colors ${tab === k ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ringkasan" && ov && <OverviewTab ov={ov} />}
      {tab === "order" && <OrdersTab orders={filtered} filter={filter} setFilter={setFilter} onTap={onTapOrder} />}
      {tab === "orang" && people && <PeopleTab people={people} act={act} />}
      {tab === "tabungan" && ledger && <LedgerTab ledger={ledger} act={act} me={me} />}
      {tab === "setelan" && (
        <>
          <SettingsTab act={act} announcement={ov?.announcement ?? ""} />
          <Card className="ny-card mt-4">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-3">
                Masuk sebagai <span className="font-bold text-foreground">{me.name}</span> · {me.phone}
              </p>
              <Button
                variant="outline"
                className="w-full h-12 rounded-full justify-start text-destructive border-destructive/40"
                onClick={logout}
              >
                🚪 Keluar
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <Card className="ny-card"><CardContent className="p-3.5">
      <p className="text-[10px] text-muted-foreground font-bold uppercase">{label}</p>
      <p className={`text-xl font-extrabold ${accent ? "text-primary" : ""}`}>{value}</p>
    </CardContent></Card>
  );
}

function OverviewTab({ ov }: { ov: Overview }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className={ov.stats.openNow ? "bg-success" : "bg-destructive"}>
          {ov.stats.openNow ? "🟢 Layanan buka" : "🔴 Layanan tutup"}
        </Badge>
        <Badge variant="outline">🛵 {ov.stats.kurirOnline}/{ov.stats.kurirTotal} kurir online</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Order hari ini" value={ov.stats.ordersToday} accent />
        <Stat label="Order 7 hari" value={ov.stats.ordersWeek} />
        <Stat label="Lagi jalan" value={ov.stats.active} />
        <Stat label="Fee masuk 7 hari" value={rp(ov.stats.feeWeek)} accent />
        <Stat label="Total order" value={ov.stats.ordersTotal} />
        {ov.byStatus.map((b) => <Stat key={b.status} label={STATUS_LABEL[b.status] ?? b.status} value={b.count} />)}
      </div>

      {ov.disputes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-destructive uppercase tracking-wide">⚠️ Komplain nunggu putusan ({ov.disputes.length})</p>
          {ov.disputes.map((d) => (
            <Card key={d.id} className="ny-card p-3.5 border-destructive/50">
              <p className="font-bold text-sm">{d.code} · {d.customer.name} {d.kurir ? `· ${d.kurir.name}` : ""}</p>
              <p className="text-xs text-muted-foreground">{d.disputeNote}</p>
            </Card>
          ))}
          <p className="text-[11px] text-muted-foreground">Buka tab Order → pilih order → tombol “Tangani komplain”.</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">🧾 Log aktivitas terbaru</p>
        {ov.logs.map((l) => (
          <div key={l.id} className="flex items-start justify-between gap-2 text-xs border-b border-border/40 pb-1.5">
            <span><b>{l.actor?.name ?? "Sistem"}</b> · {l.action} {l.detail ? <span className="text-muted-foreground">— {l.detail}</span> : null}</span>
            <span className="text-muted-foreground shrink-0">{tgl(l.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersTab({ orders, filter, setFilter, onTap }: { orders: OrderDTO[]; filter: string; setFilter: (s: string) => void; onTap: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {["ALL", "MENUNGGU_KURIR", "DIPROSES", "DIANTAR", "SELESAI", "DIBATALKAN"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full px-3.5 h-9 text-xs font-bold ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
            {s === "ALL" ? "Semua" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {orders.length === 0 ? (
        <EmptyState emoji="📭" title="Gak ada order di filter ini" />
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <button key={o.id} onClick={() => onTap(o.id)} className="ny-card w-full bg-card text-left p-3.5 active:scale-[0.99] transition-transform">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">{o.code} · {tgl(o.createdAt)}</p>
                  <p className="font-bold text-sm truncate">
                    <ZoneBadge zone={o.zone} /> {o.villageFrom} → {o.villageTo}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{o.customer.name} {o.kurir ? `→ ${o.kurir.name}` : "· belum ada kurir"}{o.dispute ? " · ⚠️ komplain" : ""}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <StatusPill status={o.status} />
                  <span className="text-xs font-bold">{rp(o.fare)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PeopleTab({ people, act }: { people: { kurirs: KurirRow[]; customers: CustomerRow[] }; act: (p: object, m: string) => void }) {
  const [openKurir, setOpenKurir] = useState(false);
  const [openCust, setOpenCust] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">🛵 Kurir ({people.kurirs.length})</p>
        <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => setOpenKurir(!openKurir)}>
          {openKurir ? "Sembunyikan" : "Tampilkan"}
        </Button>
      </div>
      {openKurir && people.kurirs.map((k) => (
        <Card key={k.id} className={`ny-card p-3.5 ${k.status === "PENDING" ? "border-secondary" : ""}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{k.name} {k.online ? "🟢" : "⚪"}</p>
              <p className="text-xs text-muted-foreground">{k.phone} · {k.village ?? "-"}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{k.done} order selesai · tagihan {rp(k.outstanding)}</p>
            </div>
            <Badge variant={k.status === "ACTIVE" ? "default" : k.status === "PENDING" ? "secondary" : "destructive"} className="shrink-0">
              {k.status}
            </Badge>
          </div>
          <div className="flex gap-2 mt-2.5">
            {k.status === "PENDING" && (
              <Button size="sm" className="h-9 rounded-full font-bold" onClick={() => act({ action: "approveKurir", id: k.id }, `${k.name} disetujui ✅`)}>Setujui</Button>
            )}
            {k.status === "ACTIVE" && (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="h-9 rounded-full">Suspend</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Suspend {k.name}?</AlertDialogTitle>
                    <AlertDialogDescription>Order aktifnya dibatalkan otomatis & disebar ulang ke kurir lain.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => act({ action: "suspendKurir", id: k.id }, "Kurir disuspend")}>Ya, suspend</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {k.status === "SUSPENDED" && (
              <Button size="sm" className="h-9 rounded-full" onClick={() => act({ action: "activateKurir", id: k.id }, "Kurir diaktifin lagi")}>Aktifkan lagi</Button>
            )}
          </div>
        </Card>
      ))}

      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">🙋 Customer ({people.customers.length})</p>
        <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => setOpenCust(!openCust)}>
          {openCust ? "Sembunyikan" : "Tampilkan"}
        </Button>
      </div>
      {openCust && people.customers.map((c) => (
        <Card key={c.id} className={`ny-card p-3.5 ${c.status === "BLOCKED" ? "border-destructive/50" : ""}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.phone} · {c.village ?? "-"}</p>
              <p className="text-[11px] text-muted-foreground">{c.orders} order · total denda {rp(c.penalties)}</p>
            </div>
            <Badge variant={c.status === "ACTIVE" ? "default" : "destructive"} className="shrink-0">{c.status}</Badge>
          </div>
          <div className="mt-2.5">
            {c.status === "ACTIVE" ? (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="h-9 rounded-full text-destructive border-destructive/40">Blokir</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Blokir {c.name}?</AlertDialogTitle>
                    <AlertDialogDescription>Customer ini gak bisa login sampai dibuka lagi.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => act({ action: "blockCustomer", id: c.id }, "Customer diblokir")}>Ya, blokir</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button size="sm" className="h-9 rounded-full" onClick={() => act({ action: "unblockCustomer", id: c.id }, "Customer dibuka lagi")}>Buka blokir</Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function LedgerTab({ ledger, act, me }: { ledger: { kurirs: LedgerKurir[]; entries: LedgerEntry[] }; act: (p: object, m: string) => void; me: Me }) {
  const debtor = ledger.kurirs.filter((k) => k.outstanding > 0);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">💰 Kurir yang harus setor</p>
        {debtor.length === 0 && <EmptyState emoji="✅" title="Semua kurir lunas" />}
        {debtor.map((k) => (
          <Card key={k.id} className="ny-card p-3.5 flex items-center justify-between gap-2">
            <div>
              <p className="font-bold text-sm">{k.name}</p>
              <p className="text-xs text-destructive font-bold">{rp(k.outstanding)}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button size="sm" className="h-9 rounded-full font-bold">Setor Masuk ✅</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Terima setoran {k.name}?</AlertDialogTitle>
                  <AlertDialogDescription>Fee {rp(k.outstanding)} ditandai lunas, kurir dapat notifikasi.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => act({ action: "settle", kurirId: k.id }, "Setoran dicatat ✅")}>Sudah masuk</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Riwayat kas kurir</p>
        {ledger.entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between text-sm border-b border-border/40 pb-1.5">
            <span><b>{e.kurirName}</b> · {e.type === "FEE" ? "fee" : "setor"} {e.orderCode ? `· ${e.orderCode}` : ""}</span>
            <span className={`font-bold ${e.amount < 0 ? "text-success" : ""}`}>{e.amount < 0 ? "−" : ""}{rp(Math.abs(e.amount))}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">Login sebagai {me.name} · kurir telat setor 2 pekan otomatis disuspend sistem.</p>
    </div>
  );
}

function SettingsTab({ act, announcement }: { act: (p: object, m: string) => void; announcement: string }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [ann, setAnn] = useState("");

  useEffect(() => {
    api<{ settings: Record<string, string> }>("/api/admin?view=settings").then((r) => {
      setForm(r.settings);
      setAnn(announcement);
      setLoaded(true);
    }).catch(() => {});
     
  }, []);

  if (!loaded) return <p className="text-sm text-muted-foreground text-center py-8">Memuat setelan…</p>;
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const fields: [string, string, string?][] = [
    ["fareA", "Ongkir zona A (Rp)"],
    ["fareB", "Ongkir zona B (Rp)"],
    ["fareC", "Ongkir zona C (Rp)"],
    ["feePercent", "Fee admin (%)"],
    ["penalty", "Denda batal (Rp)"],
    ["codLimit", "Batas COD (Rp)"],
    ["openHour", "Jam buka (0–23)"],
    ["closeHour", "Jam tutup (0–23)"],
  ];

  return (
    <div className="space-y-4">
      <Card className="ny-card"><CardContent className="p-4 space-y-3">
        <p className="text-sm font-bold">⚙️ Tarif & aturan</p>
        {fields.map(([k, label]) => (
          <div key={k} className="space-y-1">
            <Label className="text-xs">{label}</Label>
            <Input value={form[k] ?? ""} onChange={(e) => set(k, e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" />
          </div>
        ))}
        <Button className="w-full h-11 rounded-full font-bold" onClick={() => {
          const payload: Record<string, string> = {};
          for (const [k] of fields) payload[k] = form[k];
          act({ action: "updateSettings", settings: payload }, "Setelan disimpan ✅");
        }}>Simpan setelan</Button>
        <p className="text-[11px] text-muted-foreground">Berlaku untuk order baru; order lama tetap pakai tarif saat dibuat.</p>
      </CardContent></Card>

      <Card className="ny-card"><CardContent className="p-4 space-y-3">
        <p className="text-sm font-bold">📢 Kirim pengumuman</p>
        <Input value={ann} onChange={(e) => setAnn(e.target.value)} placeholder="Judul singkat" maxLength={80} />
        <Textarea id="annbody" placeholder="Isi pengumuman buat semua customer & kurir…" rows={3} maxLength={500} />
        <Button variant="outline" className="w-full h-11 rounded-full font-bold"
          onClick={() => {
            const body = (document.getElementById("annbody") as HTMLTextAreaElement).value;
            if (!ann.trim() || !body.trim()) return toast.error("Isi judul & isi pengumumannya.");
            act({ action: "announce", title: ann, body }, "Pengumuman terkirim 📢");
            (document.getElementById("annbody") as HTMLTextAreaElement).value = "";
          }}>
          Kirim ke semua orang
        </Button>
      </CardContent></Card>
    </div>
  );
}
