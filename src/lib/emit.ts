// Kirim event realtime via Supabase Realtime Broadcast.
// Pengganti socket mini-service — jalan di mana saja termasuk serverless (Vercel).
// Gagal emit tidak boleh merusak request utama — best effort saja.
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { supaServer } from "./supabase-server";

const CHANNEL = "nyandak";
const globalForEmit = globalThis as unknown as {
  nyandakChannel: RealtimeChannel | null;
  nyandakChannelReady: Promise<void> | null;
};

// Satu channel per instance server — dibuat sekali, dipakai berulang.
function ensureChannel(supa: SupabaseClient): RealtimeChannel {
  if (!globalForEmit.nyandakChannel) {
    const ch = supa.channel(CHANNEL);
    globalForEmit.nyandakChannel = ch;
    globalForEmit.nyandakChannelReady = new Promise<void>((resolve) => {
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
      });
    });
  }
  return globalForEmit.nyandakChannel;
}

export type EmitPayload = { rooms: string[]; event: string; data: unknown };

export async function emit(rooms: string[], event: string, data: unknown): Promise<void> {
  const supa = supaServer();
  if (!supa) return; // env belum lengkap — lewati, UI tetap segar lewat polling

  try {
    const ch = ensureChannel(supa);
    // tunggu channel siap maksimal 1 detik — jangan bikin request lambat
    await Promise.race([
      globalForEmit.nyandakChannelReady ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 1000)),
    ]);
    await ch.send({
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
