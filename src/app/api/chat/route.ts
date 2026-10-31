import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { cookieName, getSessionUser } from "@/lib/auth";
import { emit, rooms } from "@/lib/emit";

const CHAT_KEEP_MS = 90 * 24 * 3600 * 1000;

export async function GET(req: NextRequest) {
  const user = await getSessionUser((await cookies()).get(cookieName())?.value);
  if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });

  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId") || "";
  const after = url.searchParams.get("after");
  const order = await db.order.findUnique({ where: { id: orderId }, include: { customer: true, kurir: true } });
  if (!order) return NextResponse.json({ error: "Order nggak ketemu." }, { status: 404 });

  const isParty = order.customerId === user.id || order.kurirId === user.id;
  if (!isParty && user.role !== "ADMIN") return NextResponse.json({ error: "Gak berhak lihat chat ini." }, { status: 403 });

  const messages = await db.message.findMany({
    where: { orderId, createdAt: { gt: after ? new Date(after) : new Date(Date.now() - CHAT_KEEP_MS) } },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true, role: true } } },
    take: 300,
  });

  const chatOpen = order.status === "DIPROSES" || order.status === "DIANTAR";
  return NextResponse.json({ messages, chatOpen, status: order.status });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser((await cookies()).get(cookieName())?.value);
  if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const orderId = String(b.orderId || "");
  const text = String(b.text || "").trim().slice(0, 1000);
  if (!text) return NextResponse.json({ error: "Pesan kosong." }, { status: 400 });

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Order nggak ketemu." }, { status: 404 });
  const isParty = order.customerId === user.id || order.kurirId === user.id;
  if (!isParty) return NextResponse.json({ error: "Gak berhak kirim chat di order ini." }, { status: 403 });
  if (!["DIPROSES", "DIANTAR"].includes(order.status)) {
    return NextResponse.json({ error: "Chat cuma aktif dari order diambil sampai selesai." }, { status: 400 });
  }

  const msg = await db.message.create({
    data: { orderId, senderId: user.id, text },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  const targetRooms = [rooms.user(order.customerId), rooms.order(orderId), rooms.admins()];
  if (order.kurirId) targetRooms.push(rooms.user(order.kurirId));
  await emit(targetRooms, "chat:new", { orderId, message: msg });

  return NextResponse.json({ message: msg });
}
