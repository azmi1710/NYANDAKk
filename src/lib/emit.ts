// Kirim event realtime ke socket mini-service (port 3030).
// Gagal emit tidak boleh merusak request utama — best effort saja.
const SOCKET_URL = "http://127.0.0.1:3030/emit";
const KEY = "nyandak-internal-1";

export type EmitPayload = { rooms: string[]; event: string; data: unknown };

export async function emit(rooms: string[], event: string, data: unknown): Promise<void> {
  try {
    const body: EmitPayload = { rooms, event, data };
    await fetch(SOCKET_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-nyandak-key": KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // socket service mungkin belum jalan — abaikan
  }
}

export const rooms = {
  kurirs: () => "role:KURIR",
  admins: () => "role:ADMIN",
  user: (id: string) => `user:${id}`,
  order: (id: string) => `order:${id}`,
};
