import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { cookieName, getSessionUser } from "@/lib/auth";
import { getSettings, notify, logActivity } from "@/lib/notify";
import { emit, rooms } from "@/lib/emit";
import { isOpenNow, DEFAULT_SETTINGS } from "@/lib/nyandak";
import { sweep } from "@/lib/sweep";

async function requireAdmin() {
  return getSessionUser((await cookies()).get(cookieName())?.value);
}

export async function GET(req: NextRequest) {
  const me = await requireAdmin();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });
  await sweep();

  const view = new URL(req.url).searchParams.get("view") || "overview";

  if (view === "overview") {
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const startWeek = new Date(Date.now() - 7 * 86400_000);
    const [ordersToday, ordersWeek, ordersTotal, active, disputes, kurirOnline, kurirTotal, logs] =
      await Promise.all([
        db.order.count({ where: { createdAt: { gte: startToday } } }),
        db.order.count({ where: { createdAt: { gte: startWeek } } }),
        db.order.count(),
        db.order.count({ where: { status: { in: ["DIPROSES", "DIANTAR"] } } }),
        db.order.findMany({ where: { dispute: true }, include: { customer: { select: { name: true } }, kurir: { select: { name: true } } } }),
        db.user.count({ where: { role: "KURIR", online: true } }),
        db.user.count({ where: { role: "KURIR" } }),
        db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { actor: { select: { name: true } } } }),
      ]);
    const byStatus = await db.order.groupBy({ by: ["status"], _count: { _all: true } });
    const feeSum = await db.ledgerEntry.aggregate({
      where: { type: "FEE", createdAt: { gte: startWeek } },
      _sum: { amount: true },
    });
    const s = await getSettings();
    return NextResponse.json({
      stats: {
        ordersToday, ordersWeek, ordersTotal, active,
        kurirOnline, kurirTotal,
        feeWeek: feeSum._sum.amount ?? 0,
        openNow: isOpenNow(parseInt(s.openHour, 10), parseInt(s.closeHour, 10)),
      },
      byStatus: byStatus.map((b) => ({ status: b.status, count: b._count._all })),
      disputes, logs, announcement: s.announcement || "",
    });
  }

  if (view === "people") {
    const kurirs = await db.user.findMany({
      where: { role: "KURIR" },
      orderBy: { createdAt: "asc" },
      include: {
        kurirOrder: { where: { status: "SELESAI" }, select: { fee: true } },
        ledger: { where: { type: "FEE", settled: false }, select: { amount: true, createdAt: true } },
      },
    });
    const customers = await db.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "asc" },
      include: { customerOrder: { select: { status: true, penalty: true } } },
    });
    return NextResponse.json({
      kurirs: kurirs.map((k) => ({
        id: k.id, name: k.name, phone: k.phone, village: k.village, status: k.status, online: k.online,
        done: k.kurirOrder.length, outstanding: k.ledger.reduce((a, e) => a + e.amount, 0),
        oldestUnpaid: k.ledger.length ? k.ledger.map((e) => e.createdAt).sort()[0] : null,
      })),
      customers: customers.map((c) => ({
        id: c.id, name: c.name, phone: c.phone, village: c.village, status: c.status,
        orders: c.customerOrder.length,
        penalties: c.customerOrder.reduce((a, o) => a + o.penalty, 0),
      })),
    });
  }

  if (view === "ledger") {
    const kurirs = await db.user.findMany({
      where: { role: "KURIR" },
      include: { ledger: { orderBy: { createdAt: "desc" }, take: 40 } },
    });
    const entries = await db.ledgerEntry.findMany({
      orderBy: { createdAt: "desc" }, take: 80,
      include: { kurir: { select: { name: true } }, order: { select: { code: true } } },
    });
    return NextResponse.json({
      kurirs: kurirs.map((k) => ({
        id: k.id, name: k.name, status: k.status,
        outstanding: k.ledger.filter((e) => e.type === "FEE" && !e.settled).reduce((a, e) => a + e.amount, 0),
      })),
      entries: entries.map((e) => ({
        id: e.id, kurirName: e.kurir.name, type: e.type, amount: e.amount,
        settled: e.settled, orderCode: e.order?.code, createdAt: e.createdAt,
      })),
    });
  }

  if (view === "settings") {
    return NextResponse.json({ settings: await getSettings() });
  }

  return NextResponse.json({ error: "View nggak dikenal." }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const me = await requireAdmin();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "");

  if (action === "approveKurir" || action === "suspendKurir" || action === "activateKurir") {
    const id = String(b.id || "");
    const status = action === "approveKurir" ? "ACTIVE" : action === "suspendKurir" ? "SUSPENDED" : "ACTIVE";
    const kurir = await db.user.findUnique({ where: { id } });
    if (!kurir || kurir.role !== "KURIR") return NextResponse.json({ error: "Kurir nggak ketemu." }, { status: 404 });

    if (action === "suspendKurir") {
      // lepas order aktifnya balik ke papan
      const activeOrders = await db.order.findMany({ where: { kurirId: id, status: { in: ["DIPROSES", "DIANTAR"] } } });
      for (const o of activeOrders) {
        await db.order.update({
          where: { id: o.id },
          data: { kurirId: null, status: "MENUNGGU_KURIR", statusDetail: null, strukStatus: null, acceptedAt: null, broadcastAt: new Date() },
        });
        await emit([rooms.kurirs()], "order:new", { id: o.id, code: o.code });
        await notify(o.customerId, "Kurir diganti", `Order ${o.code} disebar ulang ke kurir lain.`, o.id);
      }
      await db.user.update({ where: { id }, data: { status, online: false } });
    } else {
      await db.user.update({ where: { id }, data: { status } });
    }
    await notify(id, action === "approveKurir" ? "Pendaftaran disetujui 🎉" : action === "suspendKurir" ? "Akun disuspend" : "Akun diaktifin lagi",
      action === "approveKurir" ? "Selamat! Kamu resmi jadi kurir NYANDAK. Buka app buat mulai online." : "Hubungi admin buat info lengkap.");
    await logActivity(me.id, action.toUpperCase(), kurir.name);
    await emit([rooms.admins()], "admin:refresh", {});
    return NextResponse.json({ ok: true });
  }

  if (action === "blockCustomer" || action === "unblockCustomer") {
    const id = String(b.id || "");
    const status = action === "blockCustomer" ? "BLOCKED" : "ACTIVE";
    await db.user.update({ where: { id }, data: { status } });
    await logActivity(me.id, action.toUpperCase(), id);
    await emit([rooms.admins()], "admin:refresh", {});
    return NextResponse.json({ ok: true });
  }

  if (action === "settle") {
    const kurirId = String(b.kurirId || "");
    const unpaid = await db.ledgerEntry.findMany({ where: { kurirId, type: "FEE", settled: false } });
    if (unpaid.length === 0) return NextResponse.json({ error: "Gak ada tagihan buat kurir ini." }, { status: 400 });
    const total = unpaid.reduce((a, e) => a + e.amount, 0);
    await db.ledgerEntry.updateMany({ where: { id: { in: unpaid.map((e) => e.id) } }, data: { settled: true } });
    await db.ledgerEntry.create({ data: { kurirId, type: "SETOR", amount: -total, settled: true } });
    await notify(kurirId, "Setoran diterima ✅", `Admin udah terima setoran fee Rp ${total.toLocaleString("id-ID")}. Makasih!`);
    await logActivity(me.id, "SETTLE", `${kurirId} Rp${total}`);
    await emit([rooms.admins()], "admin:refresh", {});
    return NextResponse.json({ ok: true, total });
  }

  if (action === "updateSettings") {
    const patch = (b.settings || {}) as Record<string, string>;
    for (const [key, value] of Object.entries(patch)) {
      if (!(key in DEFAULT_SETTINGS)) continue;
      await db.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
    }
    await logActivity(me.id, "UPDATE_SETTINGS", JSON.stringify(patch));
    await emit([rooms.kurirs(), rooms.admins()], "settings:changed", {});
    return NextResponse.json({ ok: true });
  }

  if (action === "announce") {
    const title = String(b.title || "Pengumuman").slice(0, 80);
    const body = String(b.body || "").slice(0, 500);
    if (!body) return NextResponse.json({ error: "Isi pengumumannya dulu." }, { status: 400 });
    const users = await db.user.findMany({ where: { role: { in: ["CUSTOMER", "KURIR"] }, status: "ACTIVE" }, select: { id: true } });
    for (const u of users) {
      await db.notification.create({ data: { userId: u.id, title: `📢 ${title}`, body } });
    }
    await emit(users.map((u) => rooms.user(u.id)), "notify", { title: `📢 ${title}`, body });
    await logActivity(me.id, "ANNOUNCE", title);
    return NextResponse.json({ ok: true, sent: users.length });
  }

  return NextResponse.json({ error: "Aksi nggak dikenal." }, { status: 400 });
}
