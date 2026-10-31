"use client";

import { STATUS_LABEL } from "@/lib/nyandak";

// ── Maskot Mentok si Kurir (SVG inline) ──
export function DuckLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-label="Mentok si Kurir" role="img">
      <rect width="512" height="512" rx="112" fill="#C75B2B" />
      <ellipse cx="150" cy="392" rx="58" ry="40" fill="#F7C948" />
      <ellipse cx="362" cy="392" rx="58" ry="40" fill="#F7C948" />
      <circle cx="256" cy="272" r="152" fill="#F7C948" />
      <path d="M 218 130 q 16 -30 38 -8 q 8 -24 32 -18 q -10 24 -26 36 Z" fill="#E8B12E" />
      <circle cx="203" cy="252" r="15" fill="#33241C" />
      <circle cx="309" cy="252" r="15" fill="#33241C" />
      <circle cx="208" cy="246" r="5" fill="#FFF" />
      <circle cx="314" cy="246" r="5" fill="#FFF" />
      <path d="M 256 296 q 38 -16 76 0 q -12 34 -38 34 q -26 0 -38 -34 Z" fill="#E8862E" />
      <path d="M 274 300 q 20 8 40 0" stroke="#C75B2B" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <DuckLogo size={34} />
      <div className="leading-none">
        <span className={`block text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-[#8F3E1E]"}`}>
          NYANDAK
        </span>
        <span className={`block text-[10px] font-medium ${light ? "text-white/80" : "text-muted-foreground"}`}>
          Beliin, antarin, beres.
        </span>
      </div>
    </div>
  );
}

// ── badge zona ──
export function ZoneBadge({ zone }: { zone: string }) {
  return <span className={`zone-badge zone-${zone.toLowerCase()}`}>{zone}</span>;
}

// ── pill status order ──
const STATUS_STYLE: Record<string, string> = {
  MENUNGGU_KURIR: "bg-secondary/25 text-secondary-foreground",
  DIPROSES: "bg-accent text-accent-foreground",
  DIANTAR: "bg-primary text-primary-foreground",
  SELESAI: "bg-success text-success-foreground",
  DIBATALKAN: "bg-destructive/15 text-destructive",
};
export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[status] ?? "bg-muted"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ── garis waktu bertitik (4 titik) ──
export function Timeline({ status }: { status: string }) {
  const flow = ["MENUNGGU_KURIR", "DIPROSES", "DIANTAR", "SELESAI"];
  const idx = status === "DIBATALKAN" ? -1 : flow.indexOf(status);
  return (
    <div className="flex items-center w-full px-1">
      {flow.map((s, i) => (
        <div key={s} className="flex-1 flex items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold
                ${i <= idx && idx >= 0 ? "bg-primary border-primary text-primary-foreground" : i === idx + 1 ? "border-primary bg-background" : "border-border bg-background"}`}
            >
              {i <= idx && idx >= 0 ? "✓" : ""}
            </div>
            <span className={`text-[9px] leading-tight text-center ${i <= idx ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
              {STATUS_LABEL[s]}
            </span>
          </div>
          {i < flow.length - 1 && <div className={`flex-1 h-0.5 dotline mx-1 ${i < idx ? "opacity-100" : "opacity-40"}`} />}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="text-4xl mb-2">{emoji}</div>
      <p className="font-semibold">{title}</p>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
