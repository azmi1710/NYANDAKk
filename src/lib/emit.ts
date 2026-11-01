// Kirim event realtime via Supabase Realtime Broadcast.
// Pengganti socket mini-service — jalan di mana saja termasuk serverless (Vercel).
// Gagal emit tidak boleh merusak request utama — best effort saja.
import { supaServer } from "./supabase-server";

const CHANNEL = "nyandak";
const globalForEmit = globalThis as unknown as {
  nyandakChannelReady: Promise<unknown> | undefined;
};

export type EmitPayload = { rooms: string[]; event: string; data: unknown };

export async function emit(rooms: string[], event: string, data: unknown): Promise<void> {
  const supa = supaServer();
  if (!supa) return; // env belum lengkap — lewati, UI tetap segar lewat polling

  try {
    // siapkan channel sekali per instance (serverless hangat = cepat)
    if (!globalForEmit.nyandakChannelReady) {
      const ch = supa.channel(CHANNEL);
      globalForEmit.nyandakChannelReady = ch.subscribe();
    }
    await Promise.race([
      globalForEmit.nyandakChannelReady,
      new Promise((r) => setTimeout(r, 1000)),
    ]);

    await supa.channel(CHANNEL).send({
      type: "broadcast",
      event,
      payload: { rooms, d: data },
    });
  } catch {
    // realtime gagal — abaikan, polling tetap jalan
  }
}

export const rooms = {
  kurirs: () => "role:KURIR",
  admins: () => "role:ADMIN",
  user: (id: string) => `user:${id}`,
  order: (id: string) => `order:${id}`,
};
