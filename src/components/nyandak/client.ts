"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";

// ── fetch helper ──
export async function api<T = unknown>(path: string, body?: unknown, method?: string): Promise<T> {
  const res = await fetch(path, {
    method: method ?? (body ? "POST" : "GET"),
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Ada yang error, coba lagi.");
  return data as T;
}

// ── supabase browser client ──
let supaBrowser: SupabaseClient | null = null;
function supaClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!supaBrowser) {
    supaBrowser = createClient(url, key, { auth: { persistSession: false } });
  }
  return supaBrowser;
}

// ── realtime: Supabase Broadcast, interface sama seperti socket.io (.on/.off) ──
type Listener = (data: unknown) => void;
const REG = new Map<string, Set<Listener>>();
const WRAP = new WeakMap<Listener, Listener>();
let chan: RealtimeChannel | null = null;

function ensureChannel(): boolean {
  const supa = supaClient();
  if (!supa) return false;
  if (!chan) {
    chan = supa.channel("nyandak");
    chan.on("broadcast", { event: "*" }, ({ event, payload }) => {
      const set = REG.get(event);
      if (!set || set.size === 0) return;
      for (const l of set) l(payload);
    });
    chan.subscribe();
  }
  return true;
}

// ── socket realtime (nama & perilaku dipertahankan dari versi lama) ──
export function useSocket(userId: string | undefined, role: string | undefined, orderId?: string | null) {
  return useMemo(() => {
    const uid = userId;
    const rl = role;
    const oid = orderId ?? undefined;
    return {
      on(event: string, cb: Listener) {
        if (!ensureChannel()) return;
        const wrapped: Listener = (payload) => {
          const rooms: string[] = Array.isArray(payload?.rooms) ? payload.rooms : [];
          const ok = rooms.some(
            (r) =>
              (uid && r === `user:${uid}`) ||
              (rl && r === `role:${rl}`) ||
              (oid && r === `order:${oid}`)
          );
          if (ok) cb(payload?.d);
        };
        WRAP.set(cb, wrapped);
        if (!REG.has(event)) REG.set(event, new Set());
        REG.get(event)!.add(wrapped);
      },
      off(event: string, cb: Listener) {
        const wrapped = WRAP.get(cb);
        if (wrapped) REG.get(event)?.delete(wrapped);
      },
    };
  }, [userId, role, orderId]);
}

// ── polling ringan ──
export function usePolling(fn: () => void | Promise<void>, ms: number, deps: unknown[] = []) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (document.visibilityState === "visible" && alive) ref.current();
    };
    tick();
    const t = setInterval(tick, ms);
    return () => {
      alive = false;
      clearInterval(t);
    };

  }, deps);
}

// ── kompres foto sebelum upload (biar hemat kuota) ──
export function compressImage(file: File, maxSide = 1280, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Gagal baca foto."));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Foto nggak bisa dibuka."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Gagal baca file."));
    reader.readAsDataURL(file);
  });
}

// ── format waktu Indonesia singkat ──
export function jam(t: string | Date): string {
  return new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
export function tgl(t: string | Date): string {
  return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function sisaMenit(t: string | Date): number {
  return Math.max(0, Math.round((new Date(t).getTime() + 15 * 60000 - Date.now()) / 60000));
}

export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(Date.now());
  const cb = useCallback(() => setNow(Date.now()), []);
  usePolling(cb, intervalMs);
  return now;
}
