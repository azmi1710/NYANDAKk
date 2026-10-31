import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, createSession, cookieName, getSessionUser, publicUser } from "@/lib/auth";
import { normPhone } from "@/lib/nyandak";
import { logActivity } from "@/lib/notify";

export async function GET() {
  const jar = await cookies();
  const me = await getSessionUser(jar.get(cookieName())?.value);
  if (!me) return NextResponse.json({ user: null });
  const unread = await db.notification.count({ where: { userId: me.id, read: false } });
  return NextResponse.json({ user: publicUser(me), unread });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "logout") {
    const jar = await cookies();
    const token = jar.get(cookieName())?.value;
    if (token) await db.session.deleteMany({ where: { token } });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookieName(), "", { path: "/", maxAge: 0 });
    return res;
  }

  const phone = normPhone(String(body.phone || ""));
  const password = String(body.password || "");

  if (action === "register") {
    if (phone.length < 9) return NextResponse.json({ error: "Nomor HP nggak valid." }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Password minimal 6 huruf/angka." }, { status: 400 });
    const name = String(body.name || "").trim();
    if (name.length < 2) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    const role = body.role === "KURIR" ? "KURIR" : "CUSTOMER";
    const exists = await db.user.findUnique({ where: { phone } });
    if (exists) return NextResponse.json({ error: "Nomor HP ini udah terdaftar, coba masuk aja." }, { status: 400 });

    const user = await db.user.create({
      data: {
        role, name, phone,
        passwordHash: hashPassword(password),
        village: body.village ? String(body.village) : null,
        address: body.address ? String(body.address) : null,
        status: role === "KURIR" ? "PENDING" : "ACTIVE",
      },
    });
    await logActivity(user.id, "REGISTER", `${role} ${name} (${phone})`);

    if (role === "KURIR") {
      return NextResponse.json({ pending: true, message: "Pendaftaran masuk! Tunggu admin setujui dulu ya (biasanya cepet)." });
    }
    const { token, expiresAt } = await createSession(user.id);
    const res = NextResponse.json({ user: publicUser(user) });
    res.cookies.set(cookieName(), token, { httpOnly: true, sameSite: "lax", path: "/", expires: expiresAt });
    return res;
  }

  if (action === "login") {
    const user = await db.user.findUnique({ where: { phone } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Nomor HP atau password salah." }, { status: 400 });
    }
    if (user.role === "KURIR" && user.status === "PENDING") {
      return NextResponse.json({ error: "Pendaftaran kamu masih nunggu disetujui admin." }, { status: 403 });
    }
    if (user.status === "SUSPENDED") {
      return NextResponse.json({ error: "Akun kamu lagi disuspend. Hubungi admin buat aktifin lagi." }, { status: 403 });
    }
    if (user.status === "BLOCKED") {
      return NextResponse.json({ error: "Akun kamu diblokir. Hubungi admin." }, { status: 403 });
    }
    const { token, expiresAt } = await createSession(user.id);
    await logActivity(user.id, "LOGIN", user.role);
    const res = NextResponse.json({ user: publicUser(user) });
    res.cookies.set(cookieName(), token, { httpOnly: true, sameSite: "lax", path: "/", expires: expiresAt });
    return res;
  }

  if (action === "toggleOnline") {
    const user = await getSessionUser((await cookies()).get(cookieName())?.value);
    if (!user || user.role !== "KURIR") return NextResponse.json({ error: "Khusus kurir." }, { status: 403 });
    if (user.status !== "ACTIVE") return NextResponse.json({ error: "Akun kamu belum aktif / disuspend." }, { status: 403 });
    const updated = await db.user.update({ where: { id: user.id }, data: { online: Boolean(body.online) } });
    await logActivity(user.id, body.online ? "KURIR_ONLINE" : "KURIR_OFFLINE", updated.name);
    return NextResponse.json({ user: publicUser(updated) });
  }

  if (action === "profile") {
    const user = await getSessionUser((await cookies()).get(cookieName())?.value);
    if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        name: body.name ? String(body.name).trim().slice(0, 60) : user.name,
        village: body.village !== undefined ? String(body.village) || null : user.village,
        address: body.address !== undefined ? String(body.address).slice(0, 200) || null : user.address,
      },
    });
    return NextResponse.json({ user: publicUser(updated) });
  }

  if (action === "changepw") {
    const user = await getSessionUser((await cookies()).get(cookieName())?.value);
    if (!user) return NextResponse.json({ error: "Login dulu." }, { status: 401 });
    if (!verifyPassword(String(body.current || ""), user.passwordHash)) {
      return NextResponse.json({ error: "Password lama salah." }, { status: 400 });
    }
    const next = String(body.next || "");
    if (next.length < 6) return NextResponse.json({ error: "Password baru minimal 6 huruf/angka." }, { status: 400 });
    await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } });
    await logActivity(user.id, "CHANGE_PASSWORD", user.role);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi nggak dikenal." }, { status: 400 });
}
