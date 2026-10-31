import { db } from "./db";
import { DEFAULT_SETTINGS } from "./nyandak";

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  const s: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) s[r.key] = r.value;
  return s;
}

export async function notify(
  userId: string,
  title: string,
  body: string,
  orderId?: string
): Promise<void> {
  try {
    const n = await db.notification.create({ data: { userId, title, body, orderId } });
    const { emit, rooms } = await import("./emit");
    await emit([rooms.user(userId)], "notify", n);
  } catch {
    // jangan pernah gagalkan alur utama karena notifikasi
  }
}

export async function logActivity(actorId: string | null, action: string, detail?: string) {
  try {
    await db.activityLog.create({ data: { actorId, action, detail } });
  } catch {}
}
