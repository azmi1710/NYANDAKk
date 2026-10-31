# NYANDAK 🦆 — Beliin, antarin, beres.

Platform jasa suruh (Beliin / Antar / Titip) untuk wilayah Kecamatan Sirampog, Brebes.
Dibangun dengan **Next.js 16 + TypeScript + Tailwind + Prisma (SQLite) + Socket.IO**.

## Fitur

- **3 peran**: Customer, Kurir, Admin (login pakai no. HP + password, tanpa KTP)
- **Order**: BELIIN (belanjakan + foto struk), ANTAR, TITIP, LAINNYA
- **Zona otomatis**: A (Mendala, Buniwah, Kaligiri, Manggis) Rp5.000 · B (9 desa Sirampog) Rp8.000 · C (Tonjong, Paguyangan, Bumiayu, Bumijawa) Rp15.000
- **Fee admin 20%** tercatat otomatis ke tabungan kurir (setoran Minggu / di atas Rp50.000)
- **Chat realtime** per order (Socket.IO), notifikasi in-app + Web Push
- **State machine**: MENUNGGU_KURIR → DIPROSES → DIANTAR → SELESAI / DIBATALKAN
- **Otomatisasi**: order luar jam buka masuk antrean (buka 06.00–20.00 WIB), broadcast 15 menit tak diambil → lelang ulang, COD maks Rp300.000, denda batal Rp5.000, 12 jam tanpa konfirmasi → auto selesai
- **PWA**: bisa "Add to Home Screen" di HP, tampil seperti aplikasi native

## Jalanin Lokal (Windows / Mac / Linux — pakai npm)

```bash
npm install              # 1. pasang dependensi
cp .env.example .env     #    Windows PowerShell: Copy-Item .env.example .env
npm run db:push          # 2. buat database SQLite
npm run db:seed          # 3. isi data demo (opsional tapi disarankan)
npm run dev              # 4. buka http://localhost:3000
```

> `npm run db:push` butuh file `.env` — kalau error "Environment variable not found:
> DATABASE_URL", berarti `.env` belum dibuat. Kalau error "unable to open database
> file", buat foldernya dulu: `mkdir db`.

Jalankan juga **socket service** di terminal kedua (buat chat & notif realtime):

```bash
npx tsx mini-services/nyandak-socket/index.ts
```

Tanpa socket service aplikasi tetap jalan (data tetap segar lewat polling),
tapi chat realtime baru aktif kalau service ini ikut dijalankan.

### Akun demo (dari seed)

| Peran     | No. HP        | Password  |
| --------- | ------------- | --------- |
| Admin     | 081200000001  | admin123  |
| Kurir     | 081200000002  | kurir123  |
| Customer  | 081200000004  | cust123   |

> Reset data demo kapan saja: `npm run db:seed` (⚠️ menghapus semua data order/user).

## Deploy Online (ringkas)

Aplikasi ini pakai **SQLite (file)** + **Socket.IO**, jadi cara paling pas adalah VPS
(persisten & support websocket) — misal Oracle Cloud Free Tier atau VPS murah lainnya:

```bash
# di VPS (Ubuntu):
git clone <repo> && cd nyandak
npm install
cp .env.example .env && npm run db:push && npm run db:seed
npm run build
npm run start          # port 3000 → arahkan Nginx/Caddy + domain ke port ini
```

> Di VPS, jalankan juga socket service (`npx tsx mini-services/nyandak-socket/index.ts`,
> misalnya lewat `pm2`) dan kosongkan `NEXT_PUBLIC_SOCKET_URL` di `.env` bila pakai
> Nginx/Caddy yang meneruskan `/?XTransformPort=3030` ke `127.0.0.1:3030`.

Alternatif tanpa VPS (Railway / Render berbayar-free-tier): tetap sama, tapi pastikan
disknya persisten karena data ada di file `db/custom.db`. Host serverless murni
(Vercel/Netlify functions) **tidak cocok** untuk SQLite file — datanya hilang karena
filesystem efemeral. Kalau nanti mau ke Vercel/Netlify, database perlu dipindah ke
Turso/Supabase (bisa jadi langkah v2).

## Struktur Penting

```
prisma/schema.prisma        Skema DB (User, Order, Message, LedgerEntry, dst.)
src/lib/nyandak.ts          Aturan bisnis: zona, tarif, fee, jam buka
src/app/api/                REST API (auth, orders, chat, admin, upload, ...)
src/components/nyandak/     UI Customer / Kurir / Admin + chat + shell PWA
mini-services/nyandak-socket  Socket.IO server (chat & notif realtime)
scripts/seed.ts             Data demo
```
