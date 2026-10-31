"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "./client";
import { Wordmark, DuckLogo } from "./brand";
import { ZONE_LABEL, rp } from "@/lib/nyandak";
import type { Me, PublicInfo } from "./types";

export default function AuthView({ onLoggedIn }: { onLoggedIn: (me: Me) => void }) {
  const [info, setInfo] = useState<PublicInfo | null>(null);
  const [role, setRole] = useState<"CUSTOMER" | "KURIR">("CUSTOMER");
  const [busy, setBusy] = useState(false);

  const loadInfo = () => api<PublicInfo>("/api/public").then(setInfo).catch(() => {});
  useEffect(() => {
    loadInfo();
  }, []);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await api<{ user: Me }>("/api/auth", { action: "login", phone: f.get("phone"), password: f.get("password") });
      toast.success(`Welitung, ${r.user.name}! 👋`);
      onLoggedIn(r.user);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await api<{ user?: Me; pending?: boolean; message?: string }>("/api/auth", {
        action: "register",
        role,
        name: f.get("name"),
        phone: f.get("phone"),
        password: f.get("password"),
        village: f.get("village"),
        address: f.get("address"),
      });
      if (r.pending) {
        toast.success(r.message || "Pendaftaran masuk!");
        (e.target as HTMLFormElement).reset();
      } else if (r.user) {
        toast.success(`Welitung, ${r.user.name}!`);
        onLoggedIn(r.user);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Hero */}
      <div className="bg-primary text-primary-foreground px-6 pt-10 pb-8 rounded-b-[32px]">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-extrabold tracking-tight">NYANDAK</div>
            <DuckLogo size={56} />
          </div>
          <p className="mt-1 text-primary-foreground/90 font-semibold">Beliin, antarin, beres.</p>
          <p className="mt-3 text-sm text-primary-foreground/80">
            Jasa suruh warga Sirampog &amp; sekitarnya. Kurirnya orang sekitar, bayarnya cash.
          </p>
          {info && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className={`rounded-full px-3 py-1 ${info.openNow ? "bg-white/20" : "bg-black/25"}`}>
                {info.openNow ? "🟢 Buka sekarang" : `🔴 Tutup · buka ${String(info.openHour).padStart(2, "0")}.00–${String(info.closeHour).padStart(2, "0")}.00`}
              </span>
              <span className="rounded-full px-3 py-1 bg-white/20">🛵 {info.kurirOnline} kurir online</span>
            </div>
          )}
          {info?.announcement && (
            <p className="mt-3 text-xs bg-white/15 rounded-2xl px-3 py-2">📢 {info.announcement}</p>
          )}
        </div>
      </div>

      {/* Tarif */}
      {info && (
        <div className="max-w-md mx-auto w-full px-4 -mt-4">
          <Card className="ny-card">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Tarif ongkir</p>
              {(["A", "B", "C"] as const).map((z) => (
                <div key={z} className="flex items-center justify-between py-1.5 border-b last:border-0 border-border/60 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`zone-badge zone-${z.toLowerCase()}`}>{z}</span>
                    <span className="text-muted-foreground text-xs">{ZONE_LABEL[z]}</span>
                  </span>
                  <span className="font-bold">{rp(info.fares[z])}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Form masuk / daftar */}
      <div className="max-w-md mx-auto w-full px-4 py-5 pb-10 flex-1">
        <Tabs defaultValue="masuk">
          <TabsList className="grid grid-cols-2 w-full rounded-full h-11">
            <TabsTrigger value="masuk" className="rounded-full">Masuk</TabsTrigger>
            <TabsTrigger value="daftar" className="rounded-full">Daftar</TabsTrigger>
          </TabsList>

          <TabsContent value="masuk" className="mt-4">
            <form onSubmit={login} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Nomor HP</Label>
                <Input id="phone" name="phone" inputMode="numeric" placeholder="08xx xxxx xxxx" required autoComplete="tel" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" placeholder="••••••" required autoComplete="current-password" />
              </div>
              <Button type="submit" disabled={busy} className="w-full h-12 rounded-full text-base font-bold mt-1">
                {busy ? "Proses…" : "Masuk"}
              </Button>
            </form>

            <div className="mt-5 ny-card bg-card border border-dashed p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-bold text-foreground">🔑 Akun demo (buat nyoba):</p>
              <p>Customer: <b>081200000004</b> / <b>cust123</b></p>
              <p>Kurir: <b>081200000002</b> / <b>kurir123</b></p>
              <p>Admin: <b>081200000001</b> / <b>admin123</b></p>
            </div>
          </TabsContent>

          <TabsContent value="daftar" className="mt-4">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(["CUSTOMER", "KURIR"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-2xl border-2 p-3 text-left transition-colors min-h-[44px] ${
                    role === r ? "border-primary bg-accent" : "border-border bg-card"
                  }`}
                >
                  <span className="block font-bold text-sm">{r === "CUSTOMER" ? "🙋 Saya Customer" : "🛵 Saya Kurir"}</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    {r === "CUSTOMER" ? "Titip belanja & antar" : "Ambil order, dapat ongkir"}
                  </span>
                </button>
              ))}
            </div>
            <form onSubmit={register} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nama lengkap</Label>
                <Input name="name" placeholder="Contoh: Bu Sari" required />
              </div>
              <div className="space-y-1.5">
                <Label>Nomor HP</Label>
                <Input name="phone" inputMode="numeric" placeholder="08xx xxxx xxxx" required />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input name="password" type="password" placeholder="Min. 6 huruf/angka" required />
              </div>
              <div className="space-y-1.5">
                <Label>Desa</Label>
                <Select name="village" required>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih desa kamu" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {(info?.villages ?? []).map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Alamat singkat <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                <Input name="address" placeholder="Contoh: gang masjid, rumah hijau" />
              </div>
              {role === "KURIR" && (
                <p className="text-xs text-muted-foreground bg-muted rounded-2xl p-3">
                  ℹ️ Pendaftaran kurir dicek admin dulu (tanpa KTP). Setelah disetujui, kamu bisa langsung online.
                </p>
              )}
              <Button type="submit" disabled={busy} className="w-full h-12 rounded-full text-base font-bold">
                {busy ? "Proses…" : role === "KURIR" ? "Daftar Jadi Kurir" : "Daftar"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      <p className="text-center text-[11px] text-muted-foreground pb-6">
        NYANDAK v1 · dibuat buat warga Kecamatan Sirampog, Brebes
      </p>
    </div>
  );
}
