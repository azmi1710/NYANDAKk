// ── Supabase client (SERVER-ONLY, pakai service role key) ──
// Dipakai untuk: broadcast realtime + upload foto ke Storage.
// JANGAN pernah impor file ini dari komponen client!
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const globalForSupa = globalThis as unknown as {
  nyandakSupa: SupabaseClient | undefined;
};

export function supaServer(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!globalForSupa.nyandakSupa) {
    globalForSupa.nyandakSupa = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return globalForSupa.nyandakSupa;
}
