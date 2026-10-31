// ── NYANDAK · konstanta & helper inti ──────────────────────────────
export const BRAND = "NYANDAK";
export const SLOGAN = "Beliin, antarin, beres.";

// 13 desa Kecamatan Sirampog + zona (dokumen v1.0 Bab 5.3)
export const ZONE_A = ["Mendala", "Buniwah", "Kaligiri", "Manggis"];
export const ZONE_B = [
  "Batursari", "Benda", "Dawuhan", "Igirklanceng", "Kaliloka",
  "Mlayang", "Plompong", "Sridadi", "Wanareja",
];
export const ZONE_C = ["Tonjong", "Paguyangan", "Bumiayu", "Bumijawa"];
export const ALL_VILLAGES = [...ZONE_A, ...ZONE_B, ...ZONE_C];

export function zoneOf(village: string): "A" | "B" | "C" {
  if (ZONE_A.includes(village)) return "A";
  if (ZONE_B.includes(village)) return "B";
  return "C";
}

export const ZONE_LABEL: Record<string, string> = {
  A: "A · Inti Kecamatan",
  B: "B · Sirampog Raya",
  C: "C · Luar Kecamatan",
};
export const ZONE_TARGET: Record<string, string> = { A: "≤ 30 menit", B: "≤ 60 menit", C: "≤ 2 jam" };

export const ORDER_TYPES: Record<string, { label: string; desc: string; emoji: string }> = {
  BELIIN: { label: "Beliin", desc: "Dititip belanja", emoji: "🛒" },
  ANTAR: { label: "Antar", desc: "Barang diantar", emoji: "📦" },
  TITIP: { label: "Titip", desc: "Bayar tagihan / ambil barang", emoji: "🧾" },
  LAINNYA: { label: "Lainnya", desc: "Kesepakatan khusus", emoji: "💬" },
};

export const STATUS_LABEL: Record<string, string> = {
  MENUNGGU_KURIR: "Menunggu Kurir",
  DIPROSES: "Diproses",
  DIANTAR: "Diantar",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalin",
};

export const STATUS_FLOW = ["MENUNGGU_KURIR", "DIPROSES", "DIANTAR", "SELESAI"];

// ── pengaturan default (bisa diubah admin) ──
export const DEFAULT_SETTINGS: Record<string, string> = {
  fareA: "5000",
  fareB: "8000",
  fareC: "15000",
  feePercent: "20",
  openHour: "6",
  closeHour: "20",
  codLimit: "300000",
  penalty: "5000",
  announcement: "",
};

// ── jam layanan WIB (Asia/Jakarta) ──
export function wibHour(): number {
  return parseInt(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false }).format(new Date()),
    10
  );
}
export function isOpenNow(open: number, close: number): boolean {
  const h = wibHour();
  return h >= open && h < close;
}

export function fareForZone(zone: string, s: Record<string, string>): number {
  return parseInt(s[`fare${zone}`] ?? DEFAULT_SETTINGS[`fare${zone}`], 10);
}
export function feeForFare(fare: number, s: Record<string, string>): number {
  return Math.round((fare * parseInt(s.feePercent || DEFAULT_SETTINGS.feePercent, 10)) / 100);
}

export function rp(n: number | null | undefined): string {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

let codeCounter = 0;
export function orderCode(): string {
  const d = new Date();
  const wib = new Date(d.getTime() + 7 * 3600 * 1000);
  const ymd = wib.toISOString().slice(2, 10).replace(/-/g, "");
  codeCounter = (codeCounter + 1) % 1000;
  return `NY-${ymd}-${String(Date.now() % 9000 + 100 * (codeCounter % 9)).slice(0, 4)}`;
}

export function normPhone(p: string): string {
  return p.replace(/[^0-9]/g, "").replace(/^62/, "0");
}
