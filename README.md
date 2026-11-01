# NYANDAK 🦆 — Beliin, antarin, beres.

Platform jasa suruh (Beliin / Antar / Titip) untuk wilayah Kecamatan Sirampog, Brebes.
Dibangun dengan **Next.js 16 + TypeScript + Tailwind + Prisma (PostgreSQL/Supabase) + Supabase Realtime & Storage**.

## Fitur

- **3 peran**: Customer, Kurir, Admin (login pakai no. HP + password, tanpa KTP)
- **Order**: BELIIN (belanjakan + foto struk), ANTAR, TITIP, LAINNYA
- **Zona otomatis**: A (Mendala, Buniwah, Kaligiri, Manggis) Rp5.000 · B (9 desa Sirampog) Rp8.000 · C (Tonjong, Paguyangan, Bumiayu, Bumijawa) Rp15.000
- **Fee admin 20%** tercatat otomatis ke tabungan kurir (setoran Minggu / di atas Rp50.000)
- **Chat realtime** per order (Supabase Realtime), notifikasi in-app
- **State machine**: MENUNGGU_KURIR → DIPROSES → DIANTAR → SELESAI / DIBATALKAN
- **Otomatisasi**: order luar jam buka masuk antrean (buka 06.00–20.00 WIB), broadcast 15 menit tak diambil → lelang ulang, COD maks Rp300.000, denda batal Rp5.000, 12 jam tanpa konfirmasi → auto selesai (sweep jalan otomatis tiap ada aktivitas API)
- **PWA**: bisa "Add to Home Screen" di HP, tampil seperti aplikasi native

## Siapkan Supabase (sekali saja, gratis)

1. Buka [supabase.com](https://supabase.com) → **Start your project** → sign in pakai GitHub
2. **New project** → Name: `nyandak`, region **Singapore**, buat database password (CATAT!)
3. Setelah jadi, ambil 5 nilai ini:
   - Tombol **Connect** → **Transaction pooler** → `DATABASE_URL` (tambahkan `?pgbouncer=true&connection_limit=1` di belakangnya bila belum ada)
   - Tombol **Connect** → **Session pooler** → `DIRECT_URL`
   - **Project Settings → API** → Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project Settings → API** → `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project Settings → API** → `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (rahasia!)

## Jalanin Lokal (Windows / Mac / Linux — pakai npm)

```bash
npm install                    # 1. pasang dependensi
cp .env.example .env           #    Windows: Copy-Item .env.example .env
# 2. isi .env dengan 5 nilai dari Supabase (lihat di atas)
npm run db:push                # 3. buat semua tabel di Supabase
npm run db:seed                # 4. isi data demo (opsional tapi disarankan)
npm run dev                    # 5. buka http://localhost:3000
```

> Error "Environment variable not found: DATABASE_URL" = `.env` belum dibuat / belum diisi.
> Local dan online pakai database Supabase yang sama — data demo yang di-seed langsung
> terlihat juga di versi online.

### Akun demo (dari seed)

| Peran     | No. HP        | Password  |
| --------- | ------------- | --------- |
| Admin     | 081200000001  | admin123  |
| Kurir     | 081200000002  | kurir123  |
| Customer  | 081200000004  | cust123   |

> Reset data demo kapan saja: `npm run db:seed` (⚠️ menghapus semua data order/user).

## Deploy ke Vercel (klik-klik doang)

1. Push project ke GitHub (lihat bagian sebelumnya / GitHub Desktop)
2. Buka [vercel.com](https://vercel.com) → **Sign up with GitHub** → **Add New… → Project** → pilih repo `nyandak` → **Import**
3. Sebelum klik Deploy, buka **Environment Variables**, isi 5 variabel berikut (nilainya sama seperti di `.env` kamu):

   | Nama                          | Isi                                   |
   | ----------------------------- | ------------------------------------- |
   | `DATABASE_URL`                | Transaction pooler (port 6543)        |
   | `DIRECT_URL`                  | Session pooler (port 5432)            |
   | `NEXT_PUBLIC_SUPABASE_URL`    | URL project Supabase                  |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key                     |
   | `SUPABASE_SERVICE_ROLE_KEY`   | service_role key (rahasia)            |

4. Klik **Deploy** → tunggu ±2 menit → dapat link `nyandak-xxx.vercel.app` 🎉
5. Tiap kali kamu push ke GitHub sesudah ini, Vercel **otomatis** update websitenya.

## Struktur Penting

```
prisma/schema.prisma        Skema DB (User, Order, Message, LedgerEntry, dst.)
src/lib/nyandak.ts          Aturan bisnis: zona, tarif, fee, jam buka
src/lib/emit.ts             Broadcast realtime (Supabase)
src/lib/supabase-server.ts  Client Supabase sisi server (storage & realtime)
src/app/api/                REST API (auth, orders, chat, admin, upload, ...)
src/components/nyandak/     UI Customer / Kurir / Admin + chat + shell PWA
scripts/seed.ts             Data demo
```
