// ── Sweep aturan bisnis otomatis ──────────────────────────────────
// Dipanggil tiap ~30 detik oleh socket mini-service DAN sebelum query
// penting di API (lazy), supaya aturan tetap jalan walau service mati.
import { db } from "./db";
import { isOpenNow } from "./nyandak";
import { getSettings, notify, logActivity } from "./notify";
import { emit, rooms } from "./emit";

const REBROADCAST_MS = 15 * 60 * 1000; // order tak diambil 15 menit → tayang ulang
const AUTO_STRUK_MS = 2 * 3600 * 1000; // struk tak dikonfirmasi 2 jam → auto setuju
const CHAT_KEEP_MS = 90 * 24 * 3600 * 1000; // chat disimpan 90 hari

export async function sweep(): Promise<string[]> {
  const done: string[] = [];
  const s = await getSettings();
  const open = parseInt(s.openHour, 10);
  const close = parseInt(s.closeHour, 10);
  const now = Date.now();

  // 1. Tayangkan antrean "menunggu jam layanan" saat buka
  if (isOpenNow(open, close)) {
    const queued = await db.order.findMany({
      where: { status: "MENUNGGU_KURIR", statusDetail: "QUEUED_OFFHOURS" },
      include: { customer: true },
    });
    for (const o of queued) {
      await db.order.update({
        where: { id: o.id },
        data: { statusDetail: null, broadcastAt: new Date() },
      });
      await emit([rooms.kurirs()], "order:new", serializeOrderLite(o));
      done.push(`publish:${o.code}`);
    }
  }

  // 2. Tayang ulang order tak diambil 15 menit
  const stale = await db.order.findMany({
    where: {
      status: "MENUNGGU_KURIR",
      statusDetail: null,
      broadcastAt: { lt: new Date(now - REBROADCAST_MS) },
    },
    include: { customer: true },
  });
  for (const o of stale) {
    await db.order.update({
      where: { id: o.id },
      data: { broadcastAt: new Date(), note: o.note }, // broadcastAt diperbarui → masuk lagi di atas papan
    });
    await emit([rooms.kurirs()], "order:new", serializeOrderLite(o));
    await notify(o.customerId, "Order belum diambil", `Order ${o.code} lagi disebar ulang ke kurir.`, o.id);
    done.push(`rebroadcast:${o.code}`);
  }

  // 3. Auto-setujui struk 2 jam
  const pendingStruk = await db.order.findMany({
    where: { status: "DIPROSES", strukStatus: "PENDING", type: "BELIIN" },
    include: { photos: { where: { kind: "STRUK" } }, customer: true, kurir: true },
  });
  for (const o of pendingStruk) {
    if (o.photos.length === 0) continue;
    const last = Math.max(...o.photos.map((p) => p.createdAt.getTime()));
    if (now - last > AUTO_STRUK_MS) {
      await db.order.update({
        where: { id: o.id },
        data: { strukStatus: "APPROVED", strukNote: "Disetujui otomatis (2 jam tanpa konfirmasi)." },
      });
      if (o.kurirId) await notify(o.kurirId, "Struk disetujui otomatis", `Order ${o.code} boleh langsung diantar.`, o.id);
      done.push(`autostruk:${o.code}`);
    }
  }

  // 4. Suspensi kurir yang telat setor 2 pekan berturut
  const lastSunday = lastSundayDate();
  const unpaid = await db.ledgerEntry.findMany({
    where: { type: "FEE", settled: false, createdAt: { lt: lastSunday } },
    include: { kurir: true },
  });
  const byKurir = new Map<string, Set<string>>();
  for (const e of unpaid) {
    if (e.kurir.status !== "ACTIVE") continue;
    const wk = weekKey(e.createdAt);
    if (!byKurir.has(e.kurirId)) byKurir.set(e.kurirId, new Set());
    byKurir.get(e.kurirId)!.add(wk);
  }
  for (const [kurirId, weeks] of byKurir) {
    if (weeks.size >= 2) {
      await db.user.update({ where: { id: kurirId }, data: { status: "SUSPENDED", online: false } });
      await notify(kurirId, "Akun disuspend", "Ada tagihan setor yang telat lebih dari 2 pekan. Hubungi admin.");
      await logActivity(null, "AUTO_SUSPEND_KURIR", kurirId);
      await emit([rooms.admins()], "admin:refresh", { reason: "auto-suspend" });
      done.push(`suspend:${kurirId}`);
    }
  }

  // 5. Bersihkan chat > 90 hari
  const old = await db.message.deleteMany({ where: { createdAt: { lt: new Date(now - CHAT_KEEP_MS) } } });
  if (old.count > 0) done.push(`chatpurge:${old.count}`);

  return done;
}

// Pembungkus aman: sweep itu pekerjaan maintenance — kalau gagal,
// JANGAN sampai bikin request utama (orders/admin) ikut error 500.
export async function safeSweep(): Promise<void> {
  try {
    await sweep();
  } catch (e) {
    console.error("[sweep] gagal (diabaikan):", e);
  }
}

function lastSundayDate(): Date {
  const d = new Date();
  const day = d.getDay(); // 0 = Minggu
  const diff = day === 0 ? 0 : day;
  const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff, 20, 0, 0);
  return sunday;
}
function weekKey(d: Date): string {
  const jan1 = new Date(d.getFullYear(), 0, 1).getTime();
  return String(d.getFullYear()) + "-w" + Math.floor((d.getTime() - jan1) / (7 * 86400_000));
}

// bentuk ringkas order untuk broadcast ke papan kurir
export function serializeOrderLite(o: {
  id: string; code: string; type: string; villageFrom: string; villageTo: string;
  zone: string; fare: number; fee: number; items: string; budget: number | null;
  broadcastAt: Date; customer: { name: string };
}) {
  return {
    id: o.id, code: o.code, type: o.type, villageFrom: o.villageFrom, villageTo: o.villageTo,
    zone: o.zone, fare: o.fare, fee: o.fee, items: o.items, budget: o.budget,
    customerName: o.customer.name, broadcastAt: o.broadcastAt,
  };
}
