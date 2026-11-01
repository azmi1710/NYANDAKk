"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "./client";
import { DuckLogo } from "./brand";
import type { Me } from "./types";

export default function ProfileView({
  me: initial,
  villages,
  onMeChange,
}: {
  me: Me;
  villages: string[];
  onMeChange: (me: Me) => void;
}) {
  const [me, setMe] = useState(initial);
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveProfile(v: { name: string; village: string; address: string }) {
    setBusy(true);
    try {
      const r = await api<{ user: Me }>("/api/auth", { action: "profile", ...v });
      setMe(r.user);
      onMeChange(r.user);
      toast.success("Profil disimpan ✅");
      setEditOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function changePw(current: string, next: string) {
    setBusy(true);
    try {
      await api("/api/auth", { action: "changepw", current, next });
      toast.success("Password diganti ✅");
      setPwOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await api("/api/auth", { action: "logout" });
      window.location.href = "/";
    } catch (err) {
      // logout server gagal (misal koneksi putus) — tampilin pesan, jangan crash
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="ny-card">
        <CardContent className="p-5 flex items-center gap-4">
          <DuckLogo size={56} />
          <div className="min-w-0">
            <p className="text-lg font-extrabold truncate">{me.name}</p>
            <p className="text-sm text-muted-foreground">{me.phone}</p>
            <p className="text-xs text-muted-foreground">
              {me.role === "CUSTOMER" ? "🙋 Customer" : me.role === "KURIR" ? "🛵 Kurir" : "🖥️ Admin"}
              {me.village ? ` · ${me.village}` : ""}
              {me.role === "KURIR" && me.status === "SUSPENDED" ? " · ⛔ disuspend" : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="ny-card">
        <CardContent className="p-4 divide-y divide-border/60">
          {me.address && (
            <div className="pb-3">
              <p className="text-xs text-muted-foreground">Alamat</p>
              <p className="text-sm font-semibold">{me.address}</p>
            </div>
          )}
          <div className="py-3">
            <p className="text-xs text-muted-foreground">Metode bayar</p>
            <p className="text-sm font-semibold">💵 Cash / COD — NYANDAK gak pegang uang kamu</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button variant="outline" className="w-full h-12 rounded-full justify-start" onClick={() => setEditOpen(true)}>
          ✏️ Edit profil
        </Button>
        <Button variant="outline" className="w-full h-12 rounded-full justify-start" onClick={() => setPwOpen(true)}>
          🔑 Ganti password
        </Button>
        <Button variant="outline" className="w-full h-12 rounded-full justify-start text-destructive border-destructive/40" onClick={logout}>
          🚪 Keluar
        </Button>
      </div>

      <p className="text-center text-[11px] text-muted-foreground pt-2">
        NYANDAK v1.0 · Sirampog, Brebes<br />Chat tersimpan 90 hari · COD maks Rp 300.000
      </p>

      <EditProfile open={editOpen} onOpenChange={setEditOpen} me={me} villages={villages} busy={busy} onSave={saveProfile} />
      <ChangePw open={pwOpen} onOpenChange={setPwOpen} busy={busy} onSave={changePw} />
    </div>
  );
}

function EditProfile({
  open, onOpenChange, me, villages, busy, onSave,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; me: Me; villages: string[]; busy: boolean;
  onSave: (v: { name: string; village: string; address: string }) => void;
}) {
  const [name, setName] = useState(me.name);
  const [village, setVillage] = useState(me.village ?? "Mendala");
  const [address, setAddress] = useState(me.address ?? "");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit profil</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Desa</Label>
            <Select value={village} onValueChange={setVillage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-56">{villages.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Alamat singkat</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Gang masjid, rumah hijau" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={busy || name.trim().length < 2} onClick={() => onSave({ name, village, address })}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePw({ open, onOpenChange, busy, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; busy: boolean; onSave: (c: string, n: string) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ganti password</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Password lama</Label><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Password baru</Label><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Min. 6" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={busy || next.length < 6 || !current} onClick={() => onSave(current, next)}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
