import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { cookieName, getSessionUser } from "@/lib/auth";
import {
  ALL_VILLAGES, ORDER_TYPES, isOpenNow, zoneOf, fareForZone, feeForFare, orderCode,
  STATUS_LABEL,
} from "@/lib/nyandak";
import { getSettings, notify, logActivity } from "@/lib/notify";
import { emit, rooms } from "@/lib/emit";
import { sweep, serializeOrderLite } from "@/lib/sweep";

async function me() {
  const jar = await cookies();
  return getSessionUser(jar.get(cookieName())?.value);
}

const ORDER_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true, village: true, address: true } },
  kurir: { select: { id: true, name: true, phone: true } },
  photos: true,
  _count: { select: { messages: true } },
};

export async function GET(req: NextRequest) {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  await sweep();

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "all";

  if (user.role === "CUSTOMER") {
    const orders = await db.order.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: "desc" },
      include: ORDER_INCLUDE,
    });
    return NextResponse.json({ orders });
  }

  if (user.role === "KURIR") {
    const mine = await db.order.findMany({
      where: { kurirId: user.id, status: { in: ["DIPROSES", "DIANTAR"] } },
      orderBy: { acceptedAt: "desc" },
      include: ORDER_INCLUDE,
    });
    let board: unknown[] = [];
    if (user.status === "ACTIVE") {
      board = await db.order.findMany({
        where: { status: "MENUNGGU_KURIR", statusDetail: null },
        orderBy: { broadcastAt: "desc" },
        take: 20,
        include: { customer: { select: { name: true } } },
      });
    }
    const history = await db.order.findMany({
      where: { kurirId: user.id, status: { in: ["SELESAI", "DIBATALKAN"] } },
      orderBy: { completedAt: "desc" },
      take: 50,
      include: { customer: { select: { name: true } }, photos: true },
    });
    const ledger = await db.ledgerEntry.findMany({
      where: { kurirId: user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { order: { select: { code: true } } },
    });
    return NextResponse.json({
      board: board.map(serializeOrderLite),
      mine,
      history,
      ledger: ledger.map((e) => ({
        id: e.id, kurirId: e.kurirId, type: e.type, amount: e.amount,
        settled: e.settled, orderCode: e.order?.code ?? null, createdAt: e.createdAt,
      })),
    });
  }

  // ADMIN
  const status = url.searchParams.get("status");
  const orders = await db.order.findMany({
    where: status && status !== "ALL" ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: ORDER_INCLUDE,
  });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const user = await me();
  if (!user || user.role !== "CUSTOMER") return NextResponse.json({ error: "Cuma customer yang bisa bikin order." }, { status: 403 });
  const s = await getSettings();

  const b = await req.json().catch(() => ({}));
  const type = String(b.type || "");
  if (!ORDER_TYPES[type]) return NextResponse.json({ error: "Jenis layanan nggak dikenal." }, { status: 400 });
  const villageFrom = String(b.villageFrom || "");
  const villageTo = String(b.villageTo || "");
  if (!ALL_VILLAGES.includes(villageFrom) || !ALL_VILLAGES.includes(villageTo)) {
    return NextResponse.json({ error: "Desa asal/tujuh harus dari daftar." }, { status: 400 });
  }
  const items = String(b.items || "").trim();
  if (items.length < 3) return NextResponse.json({ error: "Tulis dulu detail barang/jasa-nya." }, { status: 400 });

  let budget: number | null = null;
  if (type === "BELIIN") {
    budget = Math.round(Number(b.budget));
    if (!budget || budget < 1000) return NextResponse.json({ error: "Isi estimasi belanja (min Rp 1.000)." }, { status: 400 });
    if (budget > parseInt(s.codLimit, 10)) {
      return NextResponse.json({ error: `Batas belanja COD per order ${s.codLimit}. Untuk belanja besar, pecah jadi beberapa order ya.` }, { status: 400 });
    }
  }

  // zona & tarif: ikut zona yang lebih jauh di antara asal-tujuh
  const rank = { A: 1, B: 2, C: 3 } as const;
  const za = zoneOf(villageFrom), zb = zoneOf(villageTo);
  const zone = rank[zb as keyof typeof rank] >= rank[za as keyof typeof rank] ? zb : za;
  const fare = fareForZone(zone, s);
  const fee = feeForFare(fare, s);
  const open = isOpenNow(parseInt(s.openHour, 10), parseInt(s.closeHour, 10));

  const order = await db.order.create({
    data: {
      code: orderCode(), type,
      customerId: user.id,
      villageFrom, villageTo, zone,
      items, budget, note: b.note ? String(b.note).slice(0, 500) : null,
      fare, fee,
      status: "MENUNGGU_KURIR",
      statusDetail: open ? null : "QUEUED_OFFHOURS",
    },
    include: { customer: { select: { name: true } } },
  });

  if (open) await emit([rooms.kurirs()], "order:new", serializeOrderLite(order));
  await logActivity(user.id, "CREATE_ORDER", order.code);
  return NextResponse.json({ order, open });
}

export async function PATCH(req: NextRequest) {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "");
  const action = String(b.action || "");
  const order = await db.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!order) return NextResponse.json({ error: "Order nggak ketemu." }, { status: 404 });
  const s = await getSettings();
  const broad = (extra?: object) =>
    emit(
      [rooms.user(order.customerId), ...(order.kurirId ? [rooms.user(order.kurirId)] : []), rooms.admins(), rooms.order(order.id)],
      "order:update",
      { id: order.id, code: order.code, status: order.status, action, ...extra }
    );

  // ── CUSTOMER ──
  if (user.role === "CUSTOMER") {
    if (order.customerId !== user.id) return NextResponse.json({ error: "Bukan order kamu." }, { status: 403 });

    if (action === "edit" && order.status === "MENUNGGU_KURIR") {
      const villageFrom = b.villageFrom ? String(b.villageFrom) : order.villageFrom;
      const villageTo = b.villageTo ? String(b.villageTo) : order.villageTo;
      if (!ALL_VILLAGES.includes(villageFrom) || !ALL_VILLAGES.includes(villageTo)) {
        return NextResponse.json({ error: "Desa nggak valid." }, { status: 400 });
      }
      const rank = { A: 1, B: 2, C: 3 } as const;
      const za = zoneOf(villageFrom), zb = zoneOf(villageTo);
      const zone = rank[zb] >= rank[za] ? zb : za;
      const fare = fareForZone(zone, s);
      const updated = await db.order.update({
        where: { id },
        data: {
          villageFrom, villageTo, zone, fare, fee: feeForFare(fare, s),
          items: b.items ? String(b.items).trim() : order.items,
          budget: b.budget !== undefined ? Math.round(Number(b.budget)) || null : order.budget,
          note: b.note !== undefined ? String(b.note).slice(0, 500) || null : order.note,
        },
      });
      await emit([rooms.kurirs()], "order:refresh", { id });
      await broad();
      return NextResponse.json({ order: updated });
    }

    if (action === "cancel") {
      if (!["MENUNGGU_KURIR", "DIPROSES", "DIANTAR"].includes(order.status)) {
        return NextResponse.json({ error: "Order udah selesai/gabatal." }, { status: 400 });
      }
      const taken = order.status !== "MENUNGGU_KURIR";
      const penalty = taken ? parseInt(s.penalty, 10) : 0;
      const updated = await db.order.update({
        where: { id },
        data: { status: "DIBATALKAN", cancelReason: String(b.reason || "Dibatalin customer"), penalty },
      });
      if (taken && order.kurirId) {
        await notify(order.kurirId, "Order dibatalin", `${order.code} dibatalin customer. Denda ${penalty} buat ganti waktu kamu.`, id);
      }
      await notify(order.customerId, "Order dibatalin", `Order ${order.code} berhasil dibatalin.${penalty ? " Ada denda Rp 5.000." : ""}`, id);
      await logActivity(user.id, "CANCEL_ORDER", `${order.code} denda:${penalty}`);
      await broad({ status: "DIBATALKAN" });
      return NextResponse.json({ order: updated });
    }

    if (action === "strukApprove") {
      if (order.strukStatus !== "PENDING") return NextResponse.json({ error: "Struk udah dikonfirmasi." }, { status: 400 });
      await db.order.update({
        where: { id },
        data: {
          strukStatus: b.approve ? "APPROVED" : "REJECTED",
          statusDetail: b.approve ? null : "MENUNGGU_STRUK",
          strukNote: b.approve ? "Disetujui customer" : String(b.note || "Ditolak customer"),
        },
      });
      if (order.kurirId) {
        await notify(
          order.kurirId,
          b.approve ? "Struk disetujui ✅" : "Struk ditolak",
          b.approve ? `Order ${order.code} bisa langsung diantar.` : `Cek catatan customer di order ${order.code}, lalu unggah foto baru.`,
          id
        );
      }
      await broad({ struk: b.approve ? "APPROVED" : "REJECTED" });
      return NextResponse.json({ ok: true });
    }

    if (action === "dispute") {
      if (order.status !== "SELESAI" || order.dispute) return NextResponse.json({ error: "Gabisu komplain." }, { status: 400 });
      const hours = (Date.now() - (order.completedAt?.getTime() ?? 0)) / 3600_000;
      if (hours > 12) return NextResponse.json({ error: "Batas komplain 12 jam setelah selesai." }, { status: 400 });
      await db.order.update({ where: { id }, data: { dispute: true, disputeNote: String(b.note || "") } });
      await logActivity(user.id, "DISPUTE", order.code);
      await notify(order.customerId, "Komplain terkirim", `Admin bakal cek order ${order.code} dan putuskan maks. 2×24 jam.`, id);
      await broad({ dispute: true });
      return NextResponse.json({ ok: true });
    }
  }

  // ── KURIR ──
  if (user.role === "KURIR") {
    if (user.status !== "ACTIVE") return NextResponse.json({ error: "Akun kurir belum aktif." }, { status: 403 });

    if (action === "accept") {
      if (!user.online) return NextResponse.json({ error: "Buka mode Online dulu di beranda." }, { status: 400 });
      if (order.statusDetail) return NextResponse.json({ error: "Order ini belum tayang — masih nunggu jam layanan." }, { status: 409 });
      if (order.status !== "MENUNGGU_KURIR")
        return NextResponse.json({ error: "Duh, telat — order udah keambil kurir lain." }, { status: 409 });
      const race = await db.order.updateMany({
        where: { id, status: "MENUNGGU_KURIR", statusDetail: null, kurirId: null },
        data: { kurirId: user.id, status: "DIPROSES", acceptedAt: new Date(), strukStatus: order.type === "BELIIN" ? "PENDING" : null, statusDetail: order.type === "BELIIN" ? "MENUNGGU_STRUK" : null },
      });
      if (race.count === 0) return NextResponse.json({ error: "Duh, telat — order udah keambil kurir lain." }, { status: 409 });
      await notify(order.customerId, "Order diambil!", `${user.name} udah ambil order ${order.code}. Chat langsung di layar order ya.`, id);
      await logActivity(user.id, "ACCEPT_ORDER", order.code);
      await broad({ status: "DIPROSES", kurirName: user.name });
      return NextResponse.json({ ok: true });
    }

    if (action === "release" && order.kurirId === user.id && order.status === "DIPROSES") {
      const mins = (Date.now() - (order.acceptedAt?.getTime() ?? 0)) / 60000;
      if (mins > 5) return NextResponse.json({ error: "Batas lepas order 5 menit sejak diambil. Telepon admin buat bantu." }, { status: 400 });
      const updated = await db.order.update({
        where: { id },
        data: { kurirId: null, status: "MENUNGGU_KURIR", statusDetail: null, strukStatus: null, acceptedAt: null, broadcastAt: new Date() },
      });
      await notify(order.customerId, "Kurir melepas order", `Order ${order.code} disebar lagi ke kurir lain.`, id);
      await emit([rooms.kurirs()], "order:new", serializeOrderLite({ ...updated, customer: { name: order.customer.name } }));
      await broad({ status: "MENUNGGU_KURIR" });
      return NextResponse.json({ ok: true });
    }

    if (action === "toDiantar" && order.kurirId === user.id && order.status === "DIPROSES") {
      if (order.type === "BELIIN" && order.strukStatus !== "APPROVED") {
        return NextResponse.json({ error: "Struk belum disetujui customer — unggah foto struk & barang dulu ya." }, { status: 400 });
      }
      await db.order.update({ where: { id }, data: { status: "DIANTAR", statusDetail: null } });
      await notify(order.customerId, "Barang dijalan 🛵", `Kurir lagi antar ${order.code}. Siapin ${"Rp " + ((order.budget ?? 0) + order.fare).toLocaleString("id-ID")} (belanja + ongkir).`, id);
      await logActivity(user.id, "STATUS_DIANTAR", order.code);
      await broad({ status: "DIANTAR" });
      return NextResponse.json({ ok: true });
    }

    if (action === "selesai" && order.kurirId === user.id && order.status === "DIANTAR") {
      const updated = await db.order.update({
        where: { id },
        data: { status: "SELESAI", completedAt: new Date() },
      });
      await db.ledgerEntry.create({
        data: { kurirId: user.id, orderId: id, type: "FEE", amount: order.fee },
      });
      await notify(order.customerId, "Order selesai ✅", `${order.code} udah sampai. Ada masalah? Laporkan maks 12 jam ya.`, id);
      await logActivity(user.id, "ORDER_SELESAI", order.code);
      await broad({ status: "SELESAI" });
      return NextResponse.json({ order: updated });
    }
  }

  // ── ADMIN ──
  if (user.role === "ADMIN") {
    if (action === "cancel") {
      const updated = await db.order.update({
        where: { id },
        data: { status: "DIBATALKAN", cancelReason: `[Admin] ${String(b.reason || "")}` },
      });
      await notify(order.customerId, "Order dibatalin admin", `${order.code}: ${String(b.reason || "")}`, id);
      if (order.kurirId) await notify(order.kurirId, "Order dibatalin admin", `${order.code}: ${String(b.reason || "")}`, id);
      await logActivity(user.id, "ADMIN_CANCEL_ORDER", order.code);
      await broad({ status: "DIBATALKAN" });
      return NextResponse.json({ order: updated });
    }
    if (action === "resolveDispute") {
      await db.order.update({ where: { id }, data: { dispute: false } });
      await notify(order.customerId, "Komplain ditangani", `${order.code}: ${String(b.decision || "Sudah diputus admin.")}`, id);
      if (order.kurirId) await notify(order.kurirId, "Komplain ditangani", `${order.code}: ${String(b.decision || "")}`, id);
      await logActivity(user.id, "RESOLVE_DISPUTE", `${order.code} → ${String(b.decision || "")}`);
      await broad({ dispute: false });
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ error: "Aksi nggak dikenal / gak berhak." }, { status: 400 });
}
