"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, compressImage, tgl } from "./client";
import { DuckLogo, StatusPill, Timeline, ZoneBadge } from "./brand";
import ChatPanel from "./chat-panel";
import { ORDER_TYPES, rp } from "@/lib/nyandak";
import type { Me, OrderDTO } from "./types";

const KIND_LABEL: Record<string, string> = {
  STRUK: "Struk belanja", BARANG: "Foto barang", PICKUP: "Barang diambil", BUKTI: "Bukti selesai", KOMPLAIN: "Foto komplain",
};

export default function OrderDetail({
  order: initial,
  me,
  villages,
  onChanged,
}: {
  order: OrderDTO;
  me: Me;
  villages: string[];
  onChanged: () => void;
}) {
  const [order, setOrder] = useState(initial);
  useEffect(() => {
    // parent me-refresh data (socket/polling/aksi) → ikutkan
    setOrder(initial);
  }, [initial]);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const strukInput = useRef<HTMLInputElement>(null);
  const barangInput = useRef<HTMLInputElement>(null);
  const buktiInput = useRef<HTMLInputElement>(null);

  const isCustomer = me.role === "CUSTOMER";
  const isKurir = me.role === "KURIR" && order.kurirId === me.id;
  const isAdmin = me.role === "ADMIN";
  const type = ORDER_TYPES[order.type] ?? { label: order.type, emoji: "📦", desc: "" };

  const chatOpen = order.status === "DIPROSES" || order.status === "DIANTAR";
  const closedNote =
    order.status === "SELESAI" ? "Chat ditutup — order udah selesai." :
    order.status === "DIBATALKAN" ? "Chat ditutup — order dibatalin." :
    "Chat kebuka otomatis pas kurir ambil order.";

  async function act(payload: object, okMsg: string) {
    setBusy(true);
    try {
      await api("/api/orders", { id: order.id, ...payload }, "PATCH");
      toast.success(okMsg);
      onChanged();
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    try {
      const r = await api<{ orders?: OrderDTO[]; mine?: OrderDTO[]; history?: OrderDTO[] }>(`/api/orders`);
      const pool = [...(r.orders ?? []), ...(r.mine ?? []), ...(r.history ?? [])];
      const fresh = pool.find((o) => o.id === order.id);
      if (fresh) setOrder(fresh);
    } catch {}
    onChanged();
  }

  async function upload(kind: string, file: File) {
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      await api("/api/upload", { orderId: order.id, kind, dataUrl });
      toast.success("Foto terkirim 📸");
      await reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const photos = order.photos ?? [];
  const strukPhotos = photos.filter((p) => p.kind === "STRUK" || p.kind === "BARANG");
  const otherPhotos = photos.filter((p) => p.kind !== "STRUK" && p.kind !== "BARANG");
  const totalBayar = (order.budget ?? 0) + order.fare;
  const canDispute =
    isCustomer && order.status === "SELESAI" && !order.dispute &&
    order.completedAt && Date.now() - new Date(order.completedAt).getTime() < 12 * 3600_000;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="ny-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">{order.code} · {tgl(order.createdAt)}</p>
              <h2 className="text-lg font-extrabold leading-tight">{type.emoji} {type.label} <ZoneBadge zone={order.zone} /></h2>
            </div>
            <StatusPill status={order.status} />
          </div>
          <Timeline status={order.status} />
          {order.statusDetail === "QUEUED_OFFHOURS" && (
            <p className="text-xs bg-secondary/20 border border-secondary/40 rounded-2xl p-2.5">
              ⏳ Menunggu jam layanan — order otomatis tayang ke kurir pas buka.
            </p>
          )}
          {order.statusDetail === "MENUNGGU_STRUK" && (
            <p className="text-xs bg-secondary/20 border border-secondary/40 rounded-2xl p-2.5">
              📸 Kurir lagi belanja — nunggu foto struk dikirim.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Rute & biaya */}
      <Card className="ny-card">
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold">●</span>
            <span className="font-semibold">{order.villageFrom}</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-primary font-bold">◆</span>
            <span className="font-semibold">{order.villageTo}</span>
          </div>
          <div className="border-t border-border/60 pt-2 space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Ongkir</span><span className="font-bold">{rp(order.fare)}</span></div>
            {order.budget != null && (
              <div className="flex justify-between"><span className="text-muted-foreground">Estimasi belanja</span><span className="font-semibold">{rp(order.budget)}</span></div>
            )}
            {order.status !== "DIBATALKAN" && (
              <div className="flex justify-between border-t border-border/60 pt-1 font-extrabold">
                <span>Total di tempat</span><span className="text-primary">{rp(totalBayar)}</span>
              </div>
            )}
            {order.penalty > 0 && (
              <div className="flex justify-between text-destructive"><span>Denda batal</span><span className="font-bold">{rp(order.penalty)}</span></div>
            )}
          </div>
          <p className="text-[13px] whitespace-pre-wrap border-t border-border/60 pt-2">{order.items}</p>
          {order.note && <p className="text-xs text-muted-foreground">📝 {order.note}</p>}
          {order.cancelReason && <p className="text-xs text-destructive bg-destructive/10 rounded-2xl p-2.5">❌ {order.cancelReason}</p>}
        </CardContent>
      </Card>

      {/* Kurir / customer card */}
      {(isCustomer || isKurir || isAdmin) && (
        <Card className="ny-card">
          <CardContent className="p-4 flex items-center gap-3">
            <DuckLogo size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground font-semibold uppercase">
                {isCustomer ? "Kurir kamu" : "Customer"}
              </p>
              <p className="font-bold truncate">
                {isCustomer
                  ? order.kurir?.name ?? "Belum ada kurir — order disebar ke kurir sekitar"
                  : order.customer.name}
              </p>
              {isCustomer && order.kurir && (
                <p className="text-xs text-muted-foreground truncate">{order.kurir.phone} · siap dihubungi darurat</p>
              )}
              {!isCustomer && (
                <p className="text-xs text-muted-foreground truncate">{order.customer.village} · {order.customer.address ?? "alamat via chat"}</p>
              )}
            </div>
            {(order.status === "DIPROSES" || order.status === "DIANTAR") && !isAdmin && (
              <a
                href={`tel:${isCustomer ? order.kurir?.phone : order.customer.phone}`}
                className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-success text-success-foreground text-lg"
                aria-label="Telepon"
              >
                📞
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Foto bukti */}
      <Card className="ny-card">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-bold">📸 Bukti foto</p>
          {photos.length === 0 && <p className="text-xs text-muted-foreground">Belum ada foto.</p>}
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                { }
                <img src={p.url} alt={KIND_LABEL[p.kind] ?? p.kind} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[9px] px-1 py-0.5 text-center truncate">
                  {KIND_LABEL[p.kind] ?? p.kind}
                </span>
              </a>
            ))}
          </div>

          {isKurir && order.status === "DIPROSES" && (
            <div className="flex flex-wrap gap-2">
              {order.type === "BELIIN" ? (
                <>
                  <input ref={strukInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload("STRUK", e.target.files[0])} />
                  <input ref={barangInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload("BARANG", e.target.files[0])} />
                  <Button variant="secondary" className="rounded-full h-11" onClick={() => strukInput.current?.click()} disabled={busy}>📷 Foto struk</Button>
                  <Button variant="secondary" className="rounded-full h-11" onClick={() => barangInput.current?.click()} disabled={busy}>📷 Foto barang</Button>
                </>
              ) : (
                <input ref={buktiInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload("BUKTI", e.target.files[0])} />
              )}
              {order.type !== "BELIIN" && (
                <Button variant="secondary" className="rounded-full h-11" onClick={() => buktiInput.current?.click()} disabled={busy}>📷 Foto bukti</Button>
              )}
            </div>
          )}

          {/* Konfirmasi struk customer */}
          {isCustomer && order.type === "BELIIN" && order.strukStatus === "PENDING" && strukPhotos.length > 0 && (
            <div className="rounded-2xl bg-secondary/20 border border-secondary/40 p-3 space-y-2">
              <p className="text-sm font-bold">Cek struk & barangnya dulu 👆</p>
              <p className="text-xs text-muted-foreground">Sudah sesuai? Setuju biar kurir bisa antar. Salah? Tolak + tulis alasannya.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full h-11" disabled={busy}
                  onClick={() => act({ action: "strukApprove", approve: false, note: "Belum sesuai, cek chat ya" }, "Struk ditolak — kurir bakal unggah ulang")}>
                  Tolak
                </Button>
                <Button className="flex-1 rounded-full h-11 font-bold" disabled={busy}
                  onClick={() => act({ action: "strukApprove", approve: true }, "Struk disetujui ✅")}>
                  Setuju, lanjut antar
                </Button>
              </div>
            </div>
          )}
          {isCustomer && order.strukStatus === "REJECTED" && (
            <p className="text-xs text-destructive">Struk ditolak — nunggu kurir unggah foto baru. {order.strukNote}</p>
          )}
        </CardContent>
      </Card>

      {/* Aksi kurir */}
      {isKurir && order.status === "DIPROSES" && (
        <div className="space-y-2">
          <Button
            className="w-full h-14 rounded-full text-base font-extrabold"
            disabled={busy || (order.type === "BELIIN" && order.strukStatus !== "APPROVED")}
            onClick={() => act({ action: "toDiantar" }, "Status: diantar 🛵")}
          >
            {order.type === "BELIIN" && order.strukStatus !== "APPROVED"
              ? "Nunggu customer setujui struk…"
              : "Checkout — Mulai Antar 🛵"}
          </Button>
          {order.acceptedAt && Date.now() - new Date(order.acceptedAt).getTime() < 5 * 60000 && (
            <Button variant="outline" className="w-full h-11 rounded-full" disabled={busy}
              onClick={() => act({ action: "release" }, "Order dilepas, disebar lagi ke kurir lain")}>
              Lepas order (masih dalam 5 menit)
            </Button>
          )}
        </div>
      )}
      {isKurir && order.status === "DIANTAR" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full h-14 rounded-full text-base font-extrabold bg-success hover:bg-success/90" disabled={busy}>
              ✅ Sudah Sampai — Tandai Selesai
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Barang udah diterima customer?</AlertDialogTitle>
              <AlertDialogDescription>
                Pastiin uangnya udah diterima utuh (belanja + ongkir). Order bakal ditandai selesai dan fee 20% otomatis masuk tabungan setor.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Belum</AlertDialogCancel>
              <AlertDialogAction onClick={() => act({ action: "selesai" }, "Order selesai 🎉")}>Sudah, selesaikan</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Aksi customer */}
      {isCustomer && order.status === "MENUNGGU_KURIR" && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-12 rounded-full" onClick={() => setEditOpen(true)}>✏️ Edit</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex-1 h-12 rounded-full text-destructive border-destructive/40">❌ Batal</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Batalin order ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  Belum ada kurir yang ambil, jadi gratis. Order gak bisa dipakai lagi setelah dibatalin.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Nggak jadi</AlertDialogCancel>
                <AlertDialogAction onClick={() => act({ action: "cancel", reason: "Dibatalin customer" }, "Order dibatalin")}>Ya, batalin</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      {isCustomer && ["DIPROSES", "DIANTAR"].includes(order.status) && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="w-full h-10 rounded-full text-destructive text-xs">Batalkan order (kena denda Rp 5.000)</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Batalin padahal udah diambil kurir?</AlertDialogTitle>
              <AlertDialogDescription>
                Waktu kurir udah kepakai, jadi ada denda Rp 5.000 sebagai ganti waktu. Lanjut?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Nggak jadi</AlertDialogCancel>
              <AlertDialogAction onClick={() => act({ action: "cancel", reason: "Dibatalin customer (denda)" }, "Order dibatalin dengan denda")}>Ya, batalin</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {canDispute && (
        <Button variant="outline" className="w-full h-11 rounded-full" onClick={() => setDisputeOpen(true)}>
          ⚠️ Ada masalah sama order ini
        </Button>
      )}
      {order.dispute && <p className="text-xs text-center text-muted-foreground">⚠️ Komplain lagi diproses admin (maks 2×24 jam).</p>}

      {/* Aksi admin */}
      {isAdmin && !["SELESAI", "DIBATALKAN"].includes(order.status) && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full h-11 rounded-full text-destructive border-destructive/40">Batalkan order ini (admin)</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Batalkan lewat admin?</AlertDialogTitle>
              <AlertDialogDescription>Customer & kurir bakal dapat notifikasi otomatis.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => act({ action: "cancel", reason: "[Admin] Dibatalkan lewat dashboard" }, "Order dibatalin")}>Ya, batalin</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {isAdmin && order.dispute && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full h-12 rounded-full font-bold">Tangani komplain</Button>
          </AlertDialogTrigger>
          <DisputeResolve order={order} busy={busy} onDone={(decision) => act({ action: "resolveDispute", decision }, "Komplain ditangani")} />
        </AlertDialog>
      )}

      {/* Chat */}
      {(chatOpen || (isCustomer && ["DIPROSES", "DIANTAR", "SELESAI"].includes(order.status)) || isAdmin) && (
        <ChatPanel orderId={order.id} me={me} chatOpen={chatOpen} closedNote={closedNote} />
      )}

      {/* Dialog edit (customer, sebelum diambil) */}
      <EditDialog open={editOpen} onOpenChange={setEditOpen} order={order} villages={villages} busy={busy}
        onSave={async (payload) => {
          const ok = await act({ action: "edit", ...payload }, "Order diupdate");
          if (ok) setEditOpen(false);
          await reload();
        }} />

      {/* Dialog komplain */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DisputeCreate busy={busy} onSubmit={async (note) => {
          const ok = await act({ action: "dispute", note }, "Komplain terkirim — admin bakal proses");
          if (ok) setDisputeOpen(false);
        }} />
      </Dialog>
    </div>
  );
}

function DisputeCreate({ busy, onSubmit }: { busy: boolean; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Laporan masalah</DialogTitle>
      </DialogHeader>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Ceritakan masalahnya: barang salah/kurang/rusak… (maks 12 jam setelah selesai)" />
      <DialogFooter>
        <Button variant="outline" onClick={() => onSubmit("")} disabled>Kirim</Button>
        <Button onClick={() => onSubmit(note)} disabled={busy || note.trim().length < 5}>Kirim laporan</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function DisputeResolve({ busy, onDone }: { order: OrderDTO; busy: boolean; onDone: (decision: string) => void }) {
  const [decision, setDecision] = useState("");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Putusan komplain</DialogTitle>
      </DialogHeader>
      <Input value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="Contoh: kurir ganti rugi belanja / kompensasi ongkir" />
      <DialogFooter>
        <Button onClick={() => onDone(decision || "Sudah diputus admin")} disabled={busy}>Simpan putusan</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditDialog({
  open, onOpenChange, order, villages, busy, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: OrderDTO;
  villages: string[];
  busy: boolean;
  onSave: (payload: object) => void;
}) {
  const [items, setItems] = useState(order.items);
  const [villageTo, setVillageTo] = useState(order.villageTo);
  const [budget, setBudget] = useState(order.budget ? String(order.budget) : "");
  const [note, setNote] = useState(order.note ?? "");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit order (belum diambil kurir)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Ke desa</Label>
            <Select value={villageTo} onValueChange={setVillageTo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-56">{villages.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Detail</Label>
            <Textarea value={items} onChange={(e) => setItems(e.target.value)} rows={3} />
          </div>
          {order.budget != null && (
            <div className="space-y-1.5">
              <Label>Estimasi belanja</Label>
              <Input value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            onClick={() => onSave({ items, villageTo, budget: budget ? Number(budget) : undefined, note })}
            disabled={busy || items.trim().length < 3}
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
