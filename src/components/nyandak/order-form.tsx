"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "./client";
import { ORDER_TYPES, rp, ZONE_TARGET } from "@/lib/nyandak";
import type { PublicInfo } from "./types";

export default function OrderForm({
  info,
  me,
  onCreated,
  onCancel,
}: {
  info: PublicInfo;
  me: { village: string | null };
  onCreated: (orderId: string) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState("BELIIN");
  const [villageFrom, setVillageFrom] = useState(me.village || "Mendala");
  const [villageTo, setVillageTo] = useState(me.village || "Mendala");
  const [items, setItems] = useState("");
  const [budget, setBudget] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const rank: Record<string, number> = { A: 1, B: 2, C: 3 };
  const zoneFrom = (info.zones.A.includes(villageFrom) ? "A" : info.zones.B.includes(villageFrom) ? "B" : "C") as string;
  const zoneTo = (info.zones.A.includes(villageTo) ? "A" : info.zones.B.includes(villageTo) ? "B" : "C") as string;
  const zone = rank[zoneTo] >= rank[zoneFrom] ? zoneTo : zoneFrom;
  const fare = info.fares[zone];
  const budgetNum = type === "BELIIN" ? Math.round(Number(budget) || 0) : 0;

  async function submit() {
    if (items.trim().length < 3) {
      toast.error("Tulis dulu detail barang/jasa-nya.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ order: { id: string }; open: boolean }>("/api/orders", {
        type, villageFrom, villageTo, items, budget: budgetNum || undefined, note,
      });
      toast.success(r.open ? "Order terkirim! Sekarang disebar ke kurir 🛵" : "Order masuk antrean — tayang otomatis pas jam layanan buka.");
      router.refresh();
      onCreated(r.order.id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const placeholder: Record<string, string> = {
    BELIIN: "Contoh: Beras 5kg, minyak 1L, gula 1kg, telur ½kg. Warung bebas / sebutin warungnya.",
    ANTAR: "Contoh: Dokumen map biru dari kantor kecamatan ke rumah bu Ninik.",
    TITIP: "Contoh: Bayar token listrik nomor 54120xxxx, atau ambil paket di pos Sridadi.",
    LAINNYA: "Contoh: Titip jemputan anak sekolah jam 1 siang. Kesepakatan ditulis di sini.",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(ORDER_TYPES).map(([key, v]) => (
          <button
            key={key}
            type="button"
            onClick={() => setType(key)}
            className={`rounded-[20px] border-2 p-3 text-left min-h-[44px] transition-colors ${
              type === key ? "border-primary bg-accent" : "border-border bg-card"
            }`}
          >
            <span className="text-xl">{v.emoji}</span>
            <span className="block font-bold text-sm">{v.label}</span>
            <span className="block text-[11px] text-muted-foreground">{v.desc}</span>
          </button>
        ))}
      </div>

      <Card className="ny-card">
        <CardContent className="p-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dari desa</Label>
              <Select value={villageFrom} onValueChange={setVillageFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {info.villages.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ke desa</Label>
              <Select value={villageTo} onValueChange={setVillageTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {info.villages.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Detail {ORDER_TYPES[type].label.toLowerCase()}</Label>
            <Textarea
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder={placeholder[type]}
              rows={4}
              maxLength={2000}
            />
          </div>

          {type === "BELIIN" && (
            <div className="space-y-1.5">
              <Label>Estimasi belanja (COD)</Label>
              <Input
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder={`Maks ${rp(info.codLimit)}`}
              />
              <p className="text-[11px] text-muted-foreground">
                Batas belanja cash per order {rp(info.codLimit)} biar kurir gak pegang duit terlalu besar.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Catatan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: telur yang bagus, pecahin belimbing ya" maxLength={500} />
          </div>

          {/* Kotak tarif kuning */}
          <div className="rounded-2xl bg-secondary/25 border border-secondary/40 p-3.5 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Zona <b>{zone}</b> · target {ZONE_TARGET[zone]}</span>
              <span className="font-bold">{rp(fare)}</span>
            </div>
            {type === "BELIIN" && budgetNum > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimasi belanja</span>
                <span className="font-semibold">{rp(budgetNum)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-secondary/40 pt-1.5 text-sm font-extrabold">
              <span>{type === "BELIIN" && budgetNum > 0 ? "Total dibayar di tempat" : "Ongkir dibayar di tempat"}</span>
              <span className="text-primary">{rp((type === "BELIIN" ? budgetNum : 0) + fare)}</span>
            </div>
          </div>

          {!info.openNow && (
            <p className="text-xs bg-muted rounded-2xl p-3 text-muted-foreground">
              🌙 Lagi tutup ({String(info.openHour).padStart(2, "0")}.00–{String(info.closeHour).padStart(2, "0")}.00 WIB). Order bisa dibuat sekarang & otomatis tayang ke kurir pas buka.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-12 rounded-full" onClick={onCancel} type="button">
              Batal
            </Button>
            <Button className="flex-[2] h-12 rounded-full text-base font-bold" onClick={submit} disabled={busy}>
              {busy ? "Mengirim…" : "Kirim Order 🛵"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
