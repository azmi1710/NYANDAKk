import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db } from "./db";
import type { User } from "@prisma/client";

const COOKIE = "nyandak_session";
const DAYS = 30;

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `s1$${salt}$${scryptSync(pw, salt, 32).toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pw, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + DAYS * 86400_000);
  await db.session.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

export function cookieName() {
  return COOKIE;
}

export async function getSessionUser(token: string | undefined | null): Promise<User | null> {
  if (!token) return null;
  const sess = await db.session.findUnique({ where: { token }, include: { user: true } });
  if (!sess || sess.expiresAt < new Date()) return null;
  if (sess.user.status === "BLOCKED") return null;
  return sess.user;
}

// Ambil user dari Request (route handler) — pakai cookies() dari next/headers di caller
export function publicUser(u: User) {
  return {
    id: u.id, role: u.role, name: u.name, phone: u.phone,
    village: u.village, address: u.address, status: u.status, online: u.online,
  };
}
export type PublicUser = ReturnType<typeof publicUser>;
