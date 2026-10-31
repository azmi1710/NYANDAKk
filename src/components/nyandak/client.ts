"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

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

// ── socket realtime ──
// Lokal (PC sendiri): set NEXT_PUBLIC_SOCKET_URL=http://localhost:3030 di .env
// Sandbox/gateway  : biarkan kosong → pakai path gateway bawaan
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "/?XTransformPort=3030";

export function useSocket(userId: string | undefined, role: string | undefined, orderId?: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const soRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;
    const so = io(SOCKET_URL, { path: "/", reconnectionDelayMax: 10000 });
    soRef.current = so;
    setSocket(so);
    so.emit("subscribe", { userId, role, orderId: orderId ?? undefined });
    return () => {
      so.disconnect();
      soRef.current = null;
      setSocket(null);
    };
     
  }, [userId, role]);

  useEffect(() => {
    if (soRef.current && orderId) soRef.current.emit("subscribe", { userId, role, orderId });
     
  }, [orderId]);

  return socket;
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
