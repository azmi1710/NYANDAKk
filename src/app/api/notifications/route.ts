import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { cookieName, getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser((await cookies()).get(cookieName())?.value);
  if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = notifications.filter((n) => !n.read).length;
  return NextResponse.json({ notifications, unread });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser((await cookies()).get(cookieName())?.value);
  if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
  const b = await req.json().catch(() => ({}));

  if (b.action === "readAll") {
    await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "read" && b.id) {
    await db.notification.updateMany({ where: { id: String(b.id), userId: user.id }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Aksi nggak dikenal." }, { status: 400 });
}
