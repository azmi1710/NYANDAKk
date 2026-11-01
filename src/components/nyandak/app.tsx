"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import AuthView from "./auth-view";
import OrderForm from "./order-form";
import OrderDetail from "./order-detail";
import ProfileView from "./profile-view";
import { CustomerHome } from "./customer-view";
import { KurirBoard, KurirRiwayat, KurirTabungan } from "./kurir-view";
import AdminView from "./admin-view";
import { OrderList } from "./order-card";
import { BottomNav, TopBar, useRealtimeBadge, type TabDef } from "./shell";
import { EmptyState } from "./brand";
import { api, usePolling } from "./client";
import { ALL_VILLAGES, ZONE_A, ZONE_B, ZONE_C } from "@/lib/nyandak";
import type { BoardItem, LedgerEntryDTO, Me, OrderDTO, PublicInfo } from "./types";

// Cadangan kalau /api/public gagal sesaat — biar user tetap bisa masuk & pakai app
const FALLBACK_INFO: PublicInfo = {
  fares: { A: 5000, B: 8000, C: 15000 },
  openHour: 6,
  closeHour: 20,
  openNow: false,
  codLimit: 300000,
  announcement: "",
  kurirOnline: 0,
  orderCount: 0,
  zones: { A: ZONE_A, B: ZONE_B, C: ZONE_C },
  villages: ALL_VILLAGES,
};

const NAV: Record<string, TabDef[]> = {
  CUSTOMER: [
    { key: "beranda", label: "Beranda", icon: "🏠" },
    { key: "pesanan", label: "Pesanan", icon: "📋" },
    { key: "profil", label: "Profil", icon: "👤" },
  ],
  KURIR: [
    { key: "papan", label: "Papan", icon: "🛵" },
    { key: "aktif", label: "Aktif", icon: "🔥" },
    { key: "riwayat", label: "Riwayat", icon: "📚" },
    { key: "tabungan", label: "Tabungan", icon: "🐷" },
    { key: "profil", label: "Profil", icon: "👤" },
  ],
  ADMIN: [
    { key: "ringkasan", label: "Ringkasan", icon: "📊" },
    { key: "order", label: "Order", icon: "📦" },
    { key: "orang", label: "Orang", icon: "👥" },
    { key: "tabungan", label: "Tabungan", icon: "💰" },
    { key: "setelan", label: "Setelan", icon: "⚙️" },
  ],
};

export default function NyandakApp() {
  const [booting, setBooting] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [info, setInfo] = useState<PublicInfo | null>(null);
  const [tab, setTab] = useState("beranda");
  const [view, setView] = useState<{ kind: "none" } | { kind: "form"; type?: string } | { kind: "order"; id: string }>({ kind: "none" });

  // data per role
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [kurirData, setKurirData] = useState<{ board: BoardItem[]; mine: OrderDTO[]; history: OrderDTO[]; ledger: LedgerEntryDTO[] }>({ board: [], mine: [], history: [], ledger: [] });
  const [busyId, setBusyId] = useState<string | null>(null);

  const { unread, setUnread, signal } = useRealtimeBadge(me);

  // boot: cek sesi
  const loadMe = useCallback(() => {
    api<{ user: Me | null }>("/api/auth")
      .then((r) => {
        setMe(r.user);
        setTab(r.user ? NAV[r.user.role][0].key : "beranda");
      })
      .catch(() => {})
      .finally(() => setBooting(false));
  }, []);
  useEffect(loadMe, [loadMe]);

  // info publik
  useEffect(() => {
    api<PublicInfo>("/api/public").then(setInfo).catch(() => {});
  }, [signal]);

  // data customer & kurir
  const loadRoleData = useCallback(() => {
    if (!me) return;
    if (me.role === "CUSTOMER") {
      api<{ orders: OrderDTO[] }>("/api/orders").then((r) => setOrders(r.orders)).catch(() => {});
    } else if (me.role === "KURIR") {
      api<{ board: BoardItem[]; mine: OrderDTO[]; history: OrderDTO[]; ledger: LedgerEntryDTO[] }>("/api/orders")
        .then((r) => setKurirData({ board: r.board, mine: r.mine, history: r.history, ledger: r.ledger ?? [] }))
        .catch(() => {});
    }
  }, [me]);
  useEffect(() => {
    loadRoleData();
  }, [loadRoleData, signal]);
  usePolling(loadRoleData, 15000, [me]);

  function onLoggedIn(u: Me) {
    setMe(u);
    setTab(NAV[u.role][0].key);
    setView({ kind: "none" });
  }

  async function toggleOnline(v: boolean) {
    try {
      const r = await api<{ user: Me }>("/api/auth", { action: "toggleOnline", online: v });
      setMe(r.user);
      if (v) toast.success("Online! Order baru bakal masuk papan 🛵");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function acceptOrder(id: string) {
    setBusyId(id);
    try {
      await api("/api/orders", { id, action: "accept" }, "PATCH");
      toast.success("Order dapet! Cek tab Aktif 🔥");
      setTab("aktif");
      setView({ kind: "order", id });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
      loadRoleData();
    }
  }

  if (booting) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="animate-pulse font-extrabold text-2xl text-primary">NYANDAK</p>
      </div>
    );
  }

  if (!me) {
    return <AuthView onLoggedIn={onLoggedIn} />;
  }

  const infoData = info ?? FALLBACK_INFO;
  const nav = NAV[me.role];
  const openOrder = (id: string) => setView({ kind: "order", id });
  const closeOverlay = () => setView({ kind: "none" });

  // ── overlay layar penuh: form / detail order ──
  if (view.kind === "form") {
    return (
      <div className="min-h-dvh bg-background">
        <TopBar me={me} unread={unread} onRead={() => setUnread(0)} onTapOrder={openOrder} />
        <main className="max-w-lg mx-auto px-4 py-4 pb-24">
          <h1 className="text-lg font-extrabold mb-3">🛵 Bikin Order</h1>
          <OrderForm info={infoData} me={me} onCancel={closeOverlay} onCreated={(id) => setView({ kind: "order", id })} />
        </main>
      </div>
    );
  }
  if (view.kind === "order") {
    const pool = me.role === "CUSTOMER"
      ? orders
      : me.role === "KURIR"
        ? [...kurirData.mine, ...kurirData.board.map((b) => ({ ...b, customer: { id: "", name: b.customerName, phone: "", village: null, address: null }, kurir: null, photos: [], status: "MENUNGGU_KURIR", statusDetail: null, customerId: "", kurirId: null, note: null, strukStatus: null, strukNote: null, cancelReason: null, penalty: 0, dispute: false, disputeNote: null, acceptedAt: null, completedAt: null, createdAt: b.broadcastAt } as unknown as OrderDTO)), ...kurirData.history]
        : [];
    const order = view.kind === "order" ? pool.find((o) => o.id === view.id) : null;
    if (!order) {
      // admin buka dari datanya sendiri via AdminOrderOverlay
      return me.role === "ADMIN" ? (
        <AdminOrderScreen id={view.id} me={me} villages={infoData.villages} unread={unread} setUnread={setUnread} onBack={closeOverlay} onChanged={() => {}} />
      ) : (
        <div className="min-h-dvh bg-background">
          <TopBar me={me} unread={unread} onRead={() => setUnread(0)} onTapOrder={openOrder} />
          <main className="max-w-lg mx-auto px-4 py-6">
            <EmptyState emoji="🤔" title="Order nggak ketemu" sub="Mungkin udah keupdate. Balik & coba lagi." />
            <div className="max-w-xs mx-auto mt-4"><Button className="w-full h-12 rounded-full" onClick={closeOverlay}>Kembali</Button></div>
          </main>
        </div>
      );
    }
    return (
      <div className="min-h-dvh bg-background">
        <TopBar me={me} unread={unread} onRead={() => setUnread(0)} onTapOrder={openOrder} />
        <main className="max-w-lg mx-auto px-4 py-4 pb-24">
          <Button variant="ghost" className="h-9 rounded-full px-3 mb-2 -ml-2" onClick={closeOverlay}>← Kembali</Button>
          <OrderDetail order={order} me={me} villages={infoData.villages} onChanged={loadRoleData} />
        </main>
      </div>
    );
  }

  // ── layar utama per role ──
  let content: React.ReactNode = null;
  if (me.role === "CUSTOMER") {
    if (tab === "beranda") {
      content = (
        <CustomerHome
          me={me}
          info={infoData}
          orders={orders}
          onNewOrder={(type) => setView({ kind: "form", type })}
          onTapOrder={openOrder}
        />
      );
    } else if (tab === "pesanan") {
      content = (
        <div className="space-y-3">
          <h1 className="text-lg font-extrabold">📋 Pesanan kamu</h1>
          <OrderList orders={orders} onTap={openOrder} />
        </div>
      );
    } else {
      content = <ProfileView me={me} villages={infoData.villages} onMeChange={setMe} />;
    }
  } else if (me.role === "KURIR") {
    const todayFare = kurirData.mine
      .filter((o) => o.acceptedAt && new Date(o.acceptedAt).toDateString() === new Date().toDateString())
      .reduce((a, o) => a + o.fare, 0);
    if (tab === "papan") {
      content = (
        <KurirBoard
          me={me}
          board={kurirData.board}
          mine={kurirData.mine}
          todayFare={todayFare}
          busyId={busyId}
          onAccept={acceptOrder}
          onTapOrder={openOrder}
          onToggleOnline={toggleOnline}
        />
      );
    } else if (tab === "aktif") {
      content = (
        <div className="space-y-3">
          <h1 className="text-lg font-extrabold">🔥 Order aktif</h1>
          {kurirData.mine.length === 0 ? (
            <EmptyState emoji="🕸️" title="Belum ada order aktif" sub="Ambil order dari Papan dulu." />
          ) : (
            kurirData.mine.map((o) => (
              <button key={o.id} onClick={() => openOrder(o.id)} className="ny-card w-full bg-card text-left p-4 active:scale-[0.99] transition-transform border-l-4 border-primary">
                <p className="font-bold text-sm">{o.code} · {o.villageTo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{o.status === "DIPROSES" ? "Lagi diproses — cek langkah kerja" : "Lagi dijalan 🛵"}</p>
              </button>
            ))
          )}
        </div>
      );
    } else if (tab === "riwayat") {
      content = (
        <div className="space-y-3">
          <h1 className="text-lg font-extrabold">📚 Riwayat order</h1>
          <KurirRiwayat history={kurirData.history} />
        </div>
      );
    } else if (tab === "tabungan") {
      content = <KurirTabungan entries={kurirData.ledger} />;
    } else {
      content = <ProfileView me={me} villages={infoData.villages} onMeChange={setMe} />;
    }
  } else {
    content = <AdminView me={me} refreshSignal={signal} onTapOrder={(id) => setView({ kind: "order", id })} tabKey={tab} onTabKey={setTab} />;
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <TopBar me={me} unread={unread} onRead={() => setUnread(0)} onTapOrder={openOrder} />
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-4 pb-28">{content}</main>
      <BottomNav tabs={nav} active={tab} onChange={setTab} />
    </div>
  );
}

// Admin melihat order dari datanya sendiri (endpoint /api/orders admin scope)
function AdminOrderScreen({
  id, me, villages, unread, setUnread, onBack, onChanged,
}: {
  id: string;
  me: Me;
  villages: string[];
  unread: number;
  setUnread: (n: number) => void;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [missing, setMissing] = useState(false);
  const load = useCallback(() => {
    api<{ orders: OrderDTO[] }>("/api/orders")
      .then((r) => {
        const found = r.orders.find((o) => o.id === id) ?? null;
        setOrder(found);
        setMissing(!found);
      })
      .catch(() => setMissing(true));
  }, [id]);
  useEffect(load, [load]);

  if (missing) {
    return (
      <div className="min-h-dvh bg-background">
        <TopBar me={me} unread={unread} onRead={() => setUnread(0)} onTapOrder={() => {}} />
        <main className="max-w-lg mx-auto px-4 py-6">
          <EmptyState emoji="🤔" title="Order nggak ketemu" />
          <div className="max-w-xs mx-auto mt-4"><Button className="w-full h-12 rounded-full" onClick={onBack}>Kembali</Button></div>
        </main>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="animate-pulse text-muted-foreground">Memuat order…</p>
      </div>
    );
  }
  return (
    <div className="min-h-dvh bg-background">
      <TopBar me={me} unread={unread} onRead={() => setUnread(0)} onTapOrder={() => {}} />
      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        <Button variant="ghost" className="h-9 rounded-full px-3 mb-2 -ml-2" onClick={onBack}>← Kembali</Button>
        <OrderDetail order={order} me={me} villages={villages} onChanged={() => { load(); onChanged(); }} />
      </main>
    </div>
  );
}
