// Seed data demo NYANDAK — jalankan: bun scripts/seed.ts
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const db = new PrismaClient();

function hash(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `s1$${salt}$${scryptSync(pw, salt, 32).toString("hex")}`;
}

const S = {
  fareA: "5000", fareB: "8000", fareC: "15000", feePercent: "20",
  openHour: "6", closeHour: "20", codLimit: "300000", penalty: "5000",
  announcement: "Selamat datang di NYANDAK! Layanan buka tiap hari jam 06.00–20.00 WIB.",
};

async function main() {
  for (const [key, value] of Object.entries(S)) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // reset data demo
  await db.activityLog.deleteMany();
  await db.notification.deleteMany();
  await db.ledgerEntry.deleteMany();
  await db.message.deleteMany();
  await db.orderPhoto.deleteMany();
  await db.order.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  const admin = await db.user.create({
    data: { role: "ADMIN", name: "Pak Admin", phone: "081200000001", passwordHash: hash("admin123"), village: "Mendala" },
  });
  const kurir1 = await db.user.create({
    data: { role: "KURIR", name: "Bang Toku", phone: "081200000002", passwordHash: hash("kurir123"), village: "Mendala", status: "ACTIVE", online: true, address: "Dekat Pasar Sirampog" },
  });
  await db.user.create({
    data: { role: "KURIR", name: "Bang Dwi", phone: "081200000003", passwordHash: hash("kurir123"), village: "Kaligiri", status: "PENDING" },
  });
  const cust1 = await db.user.create({
    data: { role: "CUSTOMER", name: "Bu Sari", phone: "081200000004", passwordHash: hash("cust123"), village: "Manggis", address: "Gang masjid, rumahpagunya" },
  });
  const cust2 = await db.user.create({
    data: { role: "CUSTOMER", name: "Mas Rudi", phone: "081200000005", passwordHash: hash("cust123"), village: "Buniwah", address: "Samping kios 12" },
  });

  const now = Date.now();
  const d = (ms: number) => new Date(now - ms);

  // 1. Order menunggu kurir (BELIIN)
  await db.order.create({
    data: {
      code: "NY-260131-0001", type: "BELIIN", status: "MENUNGGU_KURIR",
      customerId: cust1.id, villageFrom: "Mendala", villageTo: "Manggis", zone: "A",
      items: "Beras 5kg, minyak goreng 1L, gula 1kg, telur 1/2 kg", budget: 120000,
      note: "Telurnya yang bagus ya", fare: 5000, fee: 1000,
    },
  });
  // 2. Order diproses (ANTAR) — diambil kurir1
  const o2 = await db.order.create({
    data: {
      code: "NY-260131-0002", type: "ANTAR", status: "DIPROSES",
      customerId: cust2.id, kurirId: kurir1.id, villageFrom: "Mendala", villageTo: "Buniwah", zone: "A",
      items: "Dokumen map biru, harus tetap rata", fare: 5000, fee: 1000,
      strukStatus: null, acceptedAt: d(3 * 60000), broadcastAt: d(15 * 60000),
    },
  });
  // 3. Order selesai (BELIIN) kemarin + fee + chat
  const o3 = await db.order.create({
    data: {
      code: "NY-260130-0003", type: "BELIIN", status: "SELESAI",
      customerId: cust1.id, kurirId: kurir1.id, villageFrom: "Mendala", villageTo: "Manggis", zone: "A",
      items: "Kopi sachet 1 dus, kerupuk 2 bungkus", budget: 85000, fare: 5000, fee: 1000,
      strukStatus: "APPROVED", acceptedAt: d(26 * 3600_000), completedAt: d(24 * 3600_000),
      createdAt: d(27 * 3600_000), broadcastAt: d(27 * 3600_000),
    },
  });
  await db.ledgerEntry.create({ data: { kurirId: kurir1.id, orderId: o3.id, type: "FEE", amount: 1000 } });
  await db.message.createMany({
    data: [
      { orderId: o3.id, senderId: kurir1.id, text: "Assalamualaikum Bu, udah di warung. Kopi dusnya ada yang baru ya?", createdAt: d(26 * 3600_000) },
      { orderId: o3.id, senderId: cust1.id, text: "Waalaikumsalam, iya yang baru aja.", createdAt: d(25.9 * 3600_000) },
      { orderId: o3.id, senderId: kurir1.id, text: "Siap, udah dibeliin. Struk udah difoto ya Bu.", createdAt: d(25.5 * 3600_000) },
    ],
  });
  // 4. Order dibatalkan gratis
  await db.order.create({
    data: {
      code: "NY-260130-0004", type: "TITIP", status: "DIBATALKAN",
      customerId: cust2.id, villageFrom: "Buniwah", villageTo: "Mendala", zone: "A",
      items: "Bayar tagihan air, nomor 55xx", fare: 5000, fee: 1000,
      cancelReason: "Sudah dibayar sendiri ternyata", createdAt: d(30 * 3600_000),
    },
  });

  await db.notification.createMany({
    data: [
      { userId: cust1.id, title: "Selamat datang di NYANDAK 👋", body: "Coba bikin order pertamamu — kurir udah siap!" },
      { userId: kurir1.id, title: "Mode online aktif", body: "Order baru bakal muncul di papan otomatis." },
    ],
  });
  await db.activityLog.create({
    data: { actorId: admin.id, action: "SEED", detail: "Data demo NYANDAK dibuat" },
  });

  console.log("✅ Seed NYANDAK selesai.");
  console.log("   Admin   : 081200000001 / admin123");
  console.log("   Kurir   : 081200000002 / kurir123 (aktif)");
  console.log("   Customer: 081200000004 / cust123");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
