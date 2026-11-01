import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { cookieName, getSessionUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { emit, rooms } from "@/lib/emit";
import { supaServer } from "@/lib/supabase-server";

const MAX_BASE64 = 2_500_000; // ~1.9 MB foto
const KINDS = ["STRUK", "BARANG", "PICKUP", "BUKTI", "KOMPLAIN"];
const BUCKET = "nyandak-foto";
const g = globalThis as unknown as { bucketReady?: boolean };

// pastikan bucket publik ada (dibuat otomatis sekali per instance)
async function ensureBucket() {
  if (g.bucketReady) return;
  const supa = supaServer();
  if (!supa) throw new Error("Supabase belum disetel.");
  const { data: buckets } = await supa.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supa.storage.createBucket(BUCKET, { public: true });
    if (error && !error.message.includes("exists")) throw new Error(error.message);
  }
  g.bucketReady = true;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser((await cookies()).get(cookieName())?.value);
  if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const orderId = String(b.orderId || "");
  const kind = String(b.kind || "");
  const dataUrl = String(b.dataUrl || "");

  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Jenis foto nggak dikenal." }, { status: 400 });
  if (!dataUrl.startsWith("data:image/") || dataUrl.length > MAX_BASE64) {
    return NextResponse.json({ error: "Fotonya kegedean (maks ±2 MB). Coba lagi." }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Order nggak ketemu." }, { status: 404 });

  const isKurir = order.kurirId === user.id;
  const isCustomer = order.customerId === user.id;
  if (!isKurir && !isCustomer) return NextResponse.json({ error: "Gak berhak upload di order ini." }, { status: 403 });
  if (order.status === "DIBATALKAN") return NextResponse.json({ error: "Order udah dibatalin." }, { status: 400 });
  if (isCustomer && kind !== "KOMPLAIN") return NextResponse.json({ error: "Customer cukup lihat foto bukti ya." }, { status: 403 });

  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(dataUrl);
  if (!m) return NextResponse.json({ error: "Format foto nggak didukung." }, { status: 400 });
  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const buf = Buffer.from(m[2], "base64");

  // simpan ke Supabase Storage (bucket publik, dibuat otomatis)
  try {
    await ensureBucket();
  } catch (e) {
    return NextResponse.json({ error: `Storage gagal: ${(e as Error).message}` }, { status: 500 });
  }
  const supa = supaServer()!;
  const filename = `${orderId}-${kind.toLowerCase()}-${Date.now()}.${ext}`;
  const { error: upErr } = await supa.storage.from(BUCKET).upload(filename, buf, {
    contentType: `image/${m[1]}`,
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: `Gagal simpan foto: ${upErr.message}` }, { status: 500 });
  const { data: pub } = supa.storage.from(BUCKET).getPublicUrl(filename);
  const url = pub.publicUrl;

  const photo = await db.orderPhoto.create({
    data: { orderId, uploaderId: user.id, url, kind },
  });

  if (isKurir && kind === "STRUK") {
    if (order.strukStatus === "REJECTED" || order.strukStatus === null) {
      await db.order.update({ where: { id: orderId }, data: { strukStatus: "PENDING", statusDetail: order.type === "BELIIN" ? "MENUNGGU_STRUK" : null } });
    }
    await notify(order.customerId, "Foto struk & barang masuk 📸", `Cek fotonya di order ${order.code}, lalu tekan Setuju biar kurir bisa antar.`, orderId);
    await emit([rooms.user(order.customerId), rooms.admins(), rooms.order(orderId)], "order:update", { id: orderId, photo: true });
  } else if (isKurir) {
    await emit([rooms.user(order.customerId), rooms.admins(), rooms.order(orderId)], "order:update", { id: orderId, photo: true });
  } else {
    await emit([rooms.admins()], "order:update", { id: orderId, photo: true });
  }

  return NextResponse.json({ photo });
}
