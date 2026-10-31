import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { cookieName, getSessionUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { emit, rooms } from "@/lib/emit";

const MAX_BASE64 = 2_500_000; // ~1.9 MB foto
const KINDS = ["STRUK", "BARANG", "PICKUP", "BUKTI", "KOMPLAIN"];

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

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${orderId}-${kind.toLowerCase()}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), buf);
  const url = `/uploads/${filename}`;

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
