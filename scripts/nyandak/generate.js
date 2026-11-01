// generate.js — Dokumen Kebutuhan & Desain Antarmuka NYANDAK v1.0
const {
  Document, Packer, Paragraph, TextRun, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, SectionType, LevelFormat, TableOfContents,
} = require("docx");
const fs = require("fs");
const path = require("path");
const L = require("./lib-nyandak.js");

const ASSETS = path.join(__dirname, "assets");
const OUT = "/home/z/my-project/download/Dokumen Kebutuhan & Desain Interface - NYANDAK v1.0.docx";

// ══════════════════════════ KONTEN ══════════════════════════
const bodyChildren = [];
const add = (...els) => els.forEach(e => Array.isArray(e) ? bodyChildren.push(...e) : bodyChildren.push(e));

// ── BAB 1 · RINGKASAN EKSEKUTIF ──
add(L.h1("1", "Ringkasan Eksekutif"));
add(L.body("NYANDAK adalah platform jasa suruh untuk warga Kecamatan Sirampog, Kabupaten Brebes, yang menghubungkan orang yang membutuhkan bantuan dengan kurir lokal melalui aplikasi berbasis web (PWA). Layanan mencakup tiga jenis pekerjaan: Beliin (diperintahkan membeli barang, misalnya belanja di Pasar Sirampog), Antar (mengantar barang dari satu titik ke titik lain), dan Lainnya (suruhan lain yang disepakati lewat catatan order). Produk ini sengaja dirancang untuk satu kecamatan agar operasional, tarif, dan kepercayaan warga dapat dikelola dengan baik sebelum diperluas."));
add(L.body("Konsep intinya dibuat sesederhana mungkin: alamat ditentukan lewat pilihan zona (bukan titik GPS), tarif ongkir flat dan sudah tampil sebelum order dikirim (Rp 5.000 / Rp 8.000 / Rp 15.000 sesuai zona), order disebar ke semua kurir yang sedang online di zona terkait, dan yang tercepat menekan tombol AMBIL berhak mengerjakan. Pembayaran memakai uang tunai saat barang diterima (COD), ditambah fitur chat sederhana antara customer dan kurir selama order berjalan. Seluruh infrastruktur memakai layanan gratis, sehingga biaya tetap Rp 0 pada tahap awal."));
add(L.body("Dokumen ini disusun untuk mengunci seluruh keputusan produk sebelum satu baris kode pun ditulis: kebutuhan fitur per modul, aturan bisnis dan tarif, identitas visual, rancangan antarmuka, hingga pilihan teknologi. Setelah dokumen ini disetujui pemilik, perubahan hanya boleh masuk lewat revisi bernomor (v1.1 dan seterusnya), sehingga pengembangan tidak terganggu perubahan spesifikasi di tengah jalan."));

// ── BAB 2 · KONTEKS DAN KONSEP PRODUK ──
add(L.h1("2", "Konteks dan Konsep Produk"));
add(L.h2("2.1", "Latar Belakang dan Wilayah Layanan"));
add(L.body("Kecamatan Sirampog adalah satu-satunya kecamatan di Kabupaten Brebes yang tidak berbatasan dengan laut. Wilayahnya berada di lereng pegunungan Sewu (bagian dari rangkaian Gunung Slamet); di Desa Mendala saja ketinggian berkisar 750 sampai 1.035 meter di atas permukaan laut. Administratifnya terdiri atas 13 desa: Batursari, Benda, Buniwah, Dawuhan, Igirklanceng, Kaligiri, Kaliloka, Manggis, Mendala, Mlayang, Plompong, Sridadi, dan Wanareja. Pusat kegiatan berada di Desa Mendala, tempat kantor kecamatan dan Pasar Sirampog berada, sementara kecamatan tetangganya adalah Tonjong (utara), Paguyangan (selatan), Bumiayu (barat), serta wilayah Kabupaten Tegal dan Pemalang di sisi timur."));
add(L.body("Dengan medan berbukit dan jarak antardesa yang cukup jauh, kebutuhan \u201cdititipi\u201d dan \u201cdiantarkan\u201d muncul setiap hari: belanja kebutuhan dapur di pasar, titipan dokumen, obat, hingga barang dari warung tetangga desa. Selama ini kebutuhan itu terjawab secara informal lewat kenalan yang sedang ke pasar. NYANDAK memformalkan kebiasaan tersebut menjadi layanan yang tarifnya jelas, jejaknya tercatat, dan penanggung jawabnya jelas, dimulai dari lingkup satu kecamatan."));
add(L.h2("2.2", "Konsep Solusi"));
add(L.body([
  L.run("Tiga prinsip menjadi fondasi produk. "),
  L.run("Pertama, zona menggantikan GPS: ", { bold: true }),
  L.run("customer memilih zona asal dan tujuan dari daftar (turun), lalu menulis alamat teks lengkap dengan patokan; sistem tidak perlu peta, dan kurir warga lokal memang mengenal wilayahnya."),
]));
add(L.body([
  L.run("Kedua, tarif flat diketahui di depan: ", { bold: true }),
  L.run("ongkir hanya bergantung pada pasangan zona, ditampilkan otomatis sebelum order dikirim sehingga tidak ada tawar-menawar dan tidak ada kejutan biaya. "),
  L.run("Ketiga, first-come-first-serve: ", { bold: true }),
  L.run("order muncul di papan semua kurir online pada zona terkait; kurir tercepat yang menekan AMBIL mendapatkan order, tanpa algoritma penugasan yang rumit."),
]));
add(L.body("Aplikasi dibangun sebagai PWA yang dijalankan di peramban HP, termasuk HP Android kelas bawah, sehingga customer dan kurir tidak perlu mengunduh aplikasi dari toko aplikasi. Satu tautan dibagikan lewat WhatsApp dan langsung bisa dipakai."));
add(L.h2("2.3", "Lingkup MVP dan Batasan yang Dikunci"));
add(L.body("Agar rilis pertama cepat, murah, dan mudah dioperasikan, batasan berikut dikunci sejak sekarang. Setiap baris \u201ctidak dibuat\u201d di bawah ini bukan keterbatasan sementara yang boleh diganti saat pengembangan; ia adalah keputusan desain dengan penggantinya sudah ditentukan."));
add(L.tableCaption("Batasan MVP dan penggantinya"));
add(L.dataTable(
  ["Komponen", "Keputusan MVP", "Pengganti yang dipakai"],
  [
    ["Pelacakan GPS langsung", "Tidak dibuat", "Status manual per tahap + foto bukti wajib"],
    ["Gerbang pembayaran digital", "Tidak dibuat", "COD: uang barang + ongkir dibayar di tempat"],
    ["Dompet saldo / top-up", "Tidak dibuat", "Uang tunai langsung antarpihak, tanpa perantara"],
    ["OTP lewat SMS", "Tidak dibuat", "Login nomor HP + kata sandi; pemblokiran manual oleh admin"],
    ["Peta interaktif", "Tidak dibuat", "Pilihan zona A/B/C + alamat teks + patokan"],
    ["Chat dengan foto/media", "Tidak dibuat", "Chat teks saja; foto melalui fitur lampiran order dan bukti kurir"],
    ["Notifikasi SMS", "Tidak dibuat", "Web push + pembaruan status langsung di layar"],
  ],
  [26, 22, 52]
));
add(L.body("Batasan di atas membuat seluruh infrastruktur tetap berada pada kuota gratis, mengurangi permukaan keamanan yang harus dijaga, dan menjaga aplikasi tetap ringan untuk jaringan desa. Fitur seperti pelacakan langsung atau pembayaran digital dapat masuk pada versi berikutnya setelah volume order dan pendapatan membenarkan biayanya.", { after: 200 }));

// ── BAB 3 · IDENTITAS BRAND ──
add(L.h1("3", "Identitas Brand dan Karakter Visual"));
add(L.h2("3.1", "Kandidat Nama dan Keputusan"));
add(L.body("Nama brand memegang peran penting karena produk ini hidup dari warga yang saling menyebut namanya dari mulut ke mulut. Lima kandidat dievaluasi dengan tiga ukuran: mudah diucapkan warga Sirampog, menggambarkan pekerjaan kurir, dan tidak tertukar dengan aplikasi besar."));
add(L.tableCaption("Kandidat nama dan penilaian"));
add(L.dataTable(
  ["Kandidat", "Makna", "Penilaian"],
  [
    ["Nyandak", "Dari kata nyandhak: mengambil/menjangkau dalam tutur Brebes\u2013Tegal", "Dipilih. Khas lokal, tiga suku kata mudah, sapaan kerjanya natural: \u201cnyandakin ya, Pak!\u201d"],
    ["Jupukin", "Jupuk (ambil) + akhiran -in", "Mudah dipahami, tetapi pola penamaannya mirip banyak aplikasi lain"],
    ["Anterin", "Antar + -in", "Jelas, namun generik dan mudah tertukar dengan layanan serupa"],
    ["Surukan", "Dari kata suruh", "Deskriptif, tetapi berkesan negatif (\u201cdisuruh-suruh\u201d)"],
    ["Kiriman", "Kirim + -an", "Terlalu umum, sulit menjadi identitas lokal yang kuat"],
  ],
  [16, 34, 50]
));
add(L.body([
  L.run("Keputusan terkunci: nama brand adalah "),
  L.run("NYANDAK", { bold: true }),
  L.run(" dengan tagline utama "),
  L.run("\u201cBeliin, antarin, beres.\u201d", { bold: true }),
  L.run(" dan tagline pendukung \u201cJasa suruh warga Sirampog\u201d. Kata kerja dari nama ini langsung menjadi bagian bahasa sehari-hari pengguna, yang biasanya adalah iklan terbaik."),
]));
add(L.h2("3.2", "Maskot Mentok"));
add(L.body("Identitas visual NYANDAK berdiri di atas maskot bernama Mentok si Kurir: seekor bebek bertubuh kuning kunyit yang membawa tas belanja. Pilihan ini mengambil dari identitas Brebes sebagai produsen telur asin mentok, sehingga maskot terasa milik warga sendiri, mudah digambar anak sekolah, dan enak dijadikan stiker WhatsApp untuk promosi. Mentok muncul di kepala aplikasi sebagai sapaan, di kartu kurir sebagai aksara avatar, dan di panel admin sebagai lambang."));
add(L.h2("3.3", "Palet Warna dan Tipografi"));
add(L.body("Palet warna mengikuti gaya Lokal Energik: hangat seperti genteng dan tanah liat, dengan aksen kunyit yang cerah. Kontras warna teks terhadap latarnya memenuhi standar keterbacaan WCAG AA."));
add(L.tableCaption("Palet warna NYANDAK"));
add(L.dataTable(
  ["Peran", "Warna", "Kode", "Penggunaan"],
  [
    ["Warna utama", "Terakota", "#C75B2B", "Tombol utama, tautan aktif, aksen kartu layanan Beliin"],
    ["Warna tekanan", "Merah bata", "#8F3E1E", "Judul tebal, latar badge zona A, tekanan tombol"],
    ["Latar aplikasi", "Krem hangat", "#FDF6EC", "Latar seluruh layar, memberi rasa hangat"],
    ["Aksen sekunder", "Kuning kunyit", "#F2A93B", "Badge zona B, kotak tarif, sorotan maskot"],
    ["Sukses", "Hijau segar", "#3E7C4F", "Status selesai, toggle online kurir, kartu Lainnya"],
    ["Teks utama", "Cokelat tua", "#33241C", "Seluruh teks pada latar terang, bilah samping admin"],
    ["Teks sekunder", "Abu hangat", "#8A7A70", "Keterangan, teks bantu, label kecil"],
    ["Permukaan kartu", "Putih", "#FFFFFF", "Kartu konten di atas latar krem"],
  ],
  [22, 20, 14, 44]
));
add(L.body("Tipografi aplikasi memakai Plus Jakarta Sans dengan bobot 400\u2013800: font sans-serif modern yang dibuat studio tipografi Indonesia (Tokotype) untuk identitas Jakarta dan dirilis gratis di Google Fonts. Judul dan angka tarif memakai bobot 700\u2013800, teks isi 400\u2013500. Pilihan ini membuat tampilan terasa asli karya Indonesia tanpa biaya lisensi."));
add(L.h2("3.4", "Gaya Bahasa Antarmuka"));
add(L.body("Gaya bahasa (nada suara) NYANDAK adalah bahasa Indonesia sehari-hari yang ramah, dengan sentuhan lokal yang ringan dan tidak berlebihan. Angka, tarif, dan status selalu ditulis eksplisit; sapaan hangat hanya muncul di tempat yang tidak menahan pengguna."));
add(L.tableCaption("Contoh penerapan gaya bahasa pada antarmuka"));
add(L.dataTable(
  ["Elemen UI", "Teks yang dipakai", "Alasan"],
  [
    ["Sapaan beranda", "Sore, Pak Dedi \u2014 dipesen apa hari ini?", "Sapaan kontekstual + ajakan ringan"],
    ["Tombol utama", "Kirim Order", "Perintah jelas; bukan istilah teknis seperti Submit"],
    ["Label status", "Sedang dibeliin", "Bahasa kerja warga, bukan \u201cIn Process\u201d"],
    ["Papan order kosong", "Belum ada order \u2014 Mentok masih istirahat.", "Maskot mewarnai kondisi kosong tanpa menyalahkan"],
    ["Pesan galat jaringan", "Yah, koneksinya kuyup. Coba sekali lagi ya.", "Empati, tidak menyalahkan pengguna"],
    ["Ringkasan tarif", "Ongkir Rp 8.000 \u00b7 barang dibayar di tempat", "Angka selalu eksplisit, tanpa singkatan rahasia"],
  ],
  [24, 40, 36]
));

// ── BAB 4 · KEBUTUHAN FUNGSIONAL ──
add(L.h1("4", "Kebutuhan Fungsional per Modul"));
add(L.body("Seluruh fitur pada tabel-tabel bab ini berstatus wajib untuk MVP dan harus hadir sebelum peluncuran, kecuali ditandai lain. Penambahan fitur baru di luar daftar ini otomatis menunda peluncuran; kebutuhan baru dicatat sebagai usulan untuk v1.1, bukan ditambahkan diam-diam."));
add(L.h2("4.1", "Modul Customer (PWA)"));
add(L.tableCaption("Fitur modul Customer"));
add(L.dataTable(
  ["Fitur", "Perilaku terkunci"],
  [
    ["Registrasi & login", "Nomor HP + kata sandi, tanpa OTP. Satu nomor satu akun. Admin dapat memblokir akun yang mencurigakan."],
    ["Beranda & pilih layanan", "Tiga kartu layanan besar ramah jempol: Beliin, Antar, Lainnya. Di bawahnya tampil tabel tarif zona dan jumlah kurir online."],
    ["Bikin order", "Isian: rincian barang (teks), zona asal-tujuan (pilihan), alamat teks + patokan, catatan, lampiran foto maksimal 2 (masing-masing \u2264 2 MB, dipadatkan di perangkat). Estimasi ongkir tampil otomatis sebelum kirim."],
    ["Papan status", "Lima status tampil langsung tanpa muat ulang; setiap perubahan memunculkan notifikasi web push."],
    ["Chat dengan kurir", "Terbuka otomatis saat order diambil, tertutup setelah selesai (lihat 4.4)."],
    ["Riwayat order", "Semua order dengan status akhir, tarif, dan alasan bila dibatalkan."],
    ["Rating & catatan", "Nilai 1\u20135 plus catatan singkat, satu kali per order selesai, memengaruhi skor kurir."],
    ["Alamat tersimpan", "Maksimal 5 alamat berlabel (Rumah/Kios/Lainnya): zona + teks alamat + patokan."],
  ],
  [26, 74]
));
add(L.h2("4.2", "Modul Kurir (Dashboard PWA)"));
add(L.tableCaption("Fitur modul Kurir"));
add(L.dataTable(
  ["Fitur", "Perilaku terkunci"],
  [
    ["Pendaftaran kurir", "Isi data diri, unggah foto KTP, kendaraan, dan pilih maksimal 2 zona yang dikuasai. Status MENUNGGU_VERIFIKASI sampai admin menyetujui."],
    ["Saklar Online/Offline", "Hanya kurir online yang menerima order. Status tidak bertahan: setiap kali aplikasi dibuka ulang, kondisi kembali Offline untuk mencegah kurir hantu."],
    ["Papan order", "Order baru pada zona yang dikuasai, urut terbaru, tampil real-time (target \u2264 10 detik). Order tidak diambil 15 menit akan ditandai mendesak dan disebar ulang."],
    ["Ambil order", "Siapa tercepat menekan AMBIL yang mendapat. Sistem menolak dua kurir pada satu order (kendali tingkat basis data)."],
    ["Pembaruan status", "Alur terkunci: DIPROSES \u2192 foto struk wajib (untuk layanan Beliin) \u2192 DIANTAR \u2192 SELESAI. Setiap perubahan tercatat waktunya."],
    ["Chat", "Sama seperti sisi customer (lihat 4.4)."],
    ["Rekap pendapatan", "Ringkasan harian/mingguan: jumlah order, total ongkir, rating rata-rata. Ongkir masuk kas kurir langsung saat COD."],
  ],
  [26, 74]
));
add(L.h2("4.3", "Modul Admin (Panel Desktop)"));
add(L.tableCaption("Fitur modul Admin"));
add(L.dataTable(
  ["Fitur", "Perilaku terkunci"],
  [
    ["Dasbor KPI", "Order hari ini, kurir online, total ongkir terkumpul, dan order bermasalah \u2014 terbarui real-time."],
    ["Verifikasi kurir", "Melihat KTP yang diunggah, lalu menerima atau menolak beserta alasan; alasan tampil di layar kurir."],
    ["Kelola zona & tarif", "Ubah daftar zona, tarif, dan target waktu. Perubahan hanya berlaku untuk order baru."],
    ["Kelola pengguna", "Mencari, memblokir, dan membuka blokir customer maupun kurir."],
    ["Mediasi order", "Melihat semua order dan membaca chat untuk keperluan mediasi (ditandai jelas sebagai pembacaan admin)."],
    ["Putusan sengketa", "Mencatat keputusan (misal ganti rugi belanja atau kompensasi ongkir) pada order; keputusan tampil di riwayat kedua pihak."],
    ["Rekap harian", "Tabel order selesai + nilai ongkir per hari, dapat diunduh CSV."],
  ],
  [26, 74]
));
add(L.h2("4.4", "Chat dalam Order"));
add(L.body("Chat adalah satu obrolan per order yang aktif sejak kurir menekan AMBIL sampai order ditandai SELESAI, kemudian menjadi hanya-baca. Pesan hanya teks, tanpa foto, tanpa lokasi \u2014 kebutuhan bukti visual sudah ditangani fitur lampiran order dan foto struk kurir, sehingga chat tidak menjadi celah pertukaran konten yang sulit dimoderasi. Riwayat chat disimpan 90 hari. Admin dapat membaca seluruh chat untuk mediasi sengketa, dan hal ini dinyatakan terbuka kepada kedua pihak di kepala obrolan (\u201cAdmin dapat membaca obrolan untuk membantu penyelesaian masalah\u201d). Pesan baru memicu notifikasi web push jika aplikasi sedang ditutup.", { after: 200 }));

// ── BAB 5 · ALUR & ATURAN BISNIS ──
add(L.h1("5", "Alur Utama dan Aturan Bisnis"));
add(L.h2("5.1", "Siklus Status Order"));
add(L.body("Status adalah tulang punggung sistem: semua pihak membaca kondisi yang sama dari daftar status tunggal berikut. Nama status di kode memakai huruf kapital ber-underscore, sedangkan label di layar memakai bahasa Indonesia."));
add(L.tableCaption("Daftar status order"));
add(L.dataTable(
  ["Status (kode)", "Label UI", "Pemicu", "Yang terjadi"],
  [
    ["MENUNGGU_KURIR", "Mencari kurir", "Customer mengirim order", "Tampil di papan kurir zona terkait; hitung mundur 15 menit"],
    ["DIPROSES", "Sedang dibeliin / dijemput", "Kurir menekan AMBIL", "Terkunci untuk kurir tersebut; chat terbuka; timer belanja 45 menit untuk layanan Beliin"],
    ["DIANTAR", "Sedang diantar", "Kurir mengunggah foto struk lalu menekan tombol", "Customer menerima push \u201cpesananmu sedang diantar\u201d"],
    ["SELESAI", "Selesai", "Kurir menandai setelah serah terima & pembayaran", "Muncul ajakan rating; order masuk rekap harian"],
    ["DIBATALKAN", "Dibatalkan", "Customer / kurir / admin, alasan wajib", "Bila sudah diambil, biaya Rp 5.000 tercatat (lihat 5.4)"],
  ],
  [22, 20, 26, 32]
));
add(L.h2("5.2", "Alur End-to-End"));
add(L.body("Gambar 1 merangkum enam langkah utuh dari order dibuat sampai selesai, beserta aturan kunci yang melekat pada alur: pembatalan, sengketa, jam layanan, dan arus uang. Perhatikan bahwa chat menemani dari langkah 3 sampai 6, dan foto struk menjadi gerbang wajib sebelum status DIANTAR dapat dinyalakan."));
add(L.figure(path.join(ASSETS, "flow-order.png"), 580, "Alur order NYANDAK end-to-end beserta aturan kunci"));
add(L.h2("5.3", "Zona Layanan dan Tarif"));
add(L.body("Zona mengikuti desa administratif agar mudah dipahami warga tanpa peta. Tarif flat per pasangan zona berlaku untuk barang normal (\u2264 5 kg); kebutuhan lebih besar atau jumlah banyak memakai layanan Lainnya dengan kesepakatan yang ditulis di catatan order. Harga barang tidak termasuk ongkir dan dibayar utuh kepada penjual; batas nilai belanja COD per order adalah Rp 300.000 sebagai mitgasi risiko tahap awal."));
add(L.tableCaption("Zona layanan dan tarif flat (dapat diubah admin, berlaku untuk order baru)"));
add(L.dataTable(
  ["Zona", "Cakupan", "Tarif ongkir", "Target waktu"],
  [
    ["A \u00b7 Inti Kecamatan", "Mendala, Buniwah, Kaligiri, Manggis", "Rp 5.000", "\u2264 30 menit"],
    ["B \u00b7 Sirampog Raya", "Batursari, Benda, Dawuhan, Igirklanceng, Kaliloka, Mlayang, Plompong, Sridadi, Wanareja", "Rp 8.000", "\u2264 60 menit"],
    ["C \u00b7 Luar Kecamatan", "Kec. Tonjong, Paguyangan, Bumiayu, dan Bumijawa (sisi Tegal)", "Rp 15.000", "\u2264 2 jam / perjanjian"],
  ],
  [20, 42, 18, 20]
));
add(L.h2("5.4", "Aturan Pembatalan, Sengketa, dan Operasional"));
add(L.body("Pembatalan gratis selama order belum diambil kurir. Setelah diambil, pembatalan dikenakan biaya Rp 5.000 sebagai pengganti waktu kurir, dicatat pada order dan diselesaikan lewat kesepakatan (biasanya diperhitungkan pada COD order berikutnya). Sengketa barang \u2014 salah, kurang, atau rusak \u2014 wajib dilaporkan customer dengan foto bukti maksimal 12 jam setelah pesanan diterima; admin memutus dalam 2\u00d724 jam dengan opsi penggantian nilai belanja atau kompensasi ongkir, dan putusan tercatat di riwayat order."));
add(L.body("Jam layanan adalah 06.00\u201320.00 WIB. Order di luar jam tetap dapat dibuat dan masuk antrean dengan status \u201cmenunggu jam layanan\u201d, lalu otomatis tayang di papan kurir saat buka. Order yang tidak diambil 15 menit ditandai mendesak dan tayang ulang di atas papan. Ongkir menjadi kas kurir pada saat serah terima; harga barang disetorkan utuh kepada penjual oleh customer secara langsung \u2014 NYANDAK tidak memegang uang barang sama sekali pada tahap ini."));

// ── BAB 6 · RANCANGAN ANTARMUKA ──
add(L.h1("6", "Rancangan Antarmuka (UI)"));
add(L.h2("6.1", "Sistem Desain"));
add(L.body("Antarmuka memakai kartu bersudut membulat 20 piksel di atas latar krem, tombol berbentuk pil dengan warna terakota, dan badge zona berwarna (A terakota muda, B kunyit muda, C hijau muda) yang konsisten di semua layar sehingga warga cepat mengenali pola. Prinsip penyusunannya: satu layar hanya menjalankan satu tugas utama; target sentuh minimal 44 piksel; teks kontras memenuhi WCAG AA; dan setiap kondisi kosong atau galat disampaikan dengan bahasa Bab 3.4, bukan pesan teknis. Status order digambarkan sebagai garis waktu bertitik \u2014 bukan teks tunggal \u2014 agar orang yang belum melek aplikasi tetap paham posisi pesanannya."));
add(L.h2("6.2", "Layar Customer"));
add(L.body("Gambar 2 memuat tiga layar inti customer. Beranda membuka dengan sapaan dan tiga kartu layanan, lalu tabel tarif zona dan status kurir online \u2014 warga langsung tahu \u201cbisa dipesen apa, berapa biayanya, ada kurir atau tidak\u201d dalam satu pandangan. Form Bikin Order berjalan dari atas ke bawah dengan kotak tarif kuning sebagai titik konfirmasi sebelum tombol Kirim Order. Layar Detail menampilkan garis waktu empat titik, kartu kurir, dan obrolan \u2014 seluruh kebutuhan \u201cbarangku sekarang bagaimana?\u201d dijawab di satu layar."));
add(L.figure(path.join(ASSETS, "ui-customer.png"), 520, "Rancangan tiga layar inti customer: beranda, form order, detail + chat"));
add(L.h2("6.3", "Layar Kurir"));
add(L.body("Gambar 3 memuat tiga layar inti kurir. Beranda Kurir menonjolkan saklar Online dan kartu pendapatan hari ini di atas, lalu papan order dengan tombol AMBIL dan hitung mundur 15 menit. Layar Order Aktif menyatukan daftar belanja, kotak unggah foto struk, dan tombol status berukuran besar \u2014 kurir tidak perlu berpindah layar saat bekerja. Layar Rekap menampilkan total ongkir mingguan beserta rincian per hari, memberi kurir rasa kepemilikan atas pendapatannya."));
add(L.figure(path.join(ASSETS, "ui-kurir.png"), 520, "Rancangan tiga layar inti kurir: beranda, order aktif, rekap pendapatan"));
add(L.h2("6.4", "Layar Admin"));
add(L.body("Gambar 4 memuat dasbor admin bergaya desktop: bilah samping gelap dengan navigasi enam menu, empat kartu KPI, tabel order terbaru dengan badge status berwarna, serta panel verifikasi kurir dan tabel zona-tarif. Panel admin sengaja dirancang untuk layar lebar karena tugas admin (verifikasi, mediasi, rekap) jarang dikerjakan dari HP."));
add(L.figure(path.join(ASSETS, "ui-admin.png"), 520, "Rancangan dasbor admin: KPI, tabel order, verifikasi kurir, zona & tarif"));

// ── BAB 7 · TEKNOLOGI ──
add(L.h1("7", "Teknologi dan Batasan Implementasi"));
add(L.h2("7.1", "Tumpukan Teknologi Terkunci"));
add(L.body("Seluruh komponen memakai layanan tingkat gratis sehingga biaya operasional tetap Rp 0 hingga volume order mendekati batas kuota. Admin memantau pemakaian kuota melalui dasbor penyedia; bila mendekati batas, keputusan peningkatan paket menjadi keputusan bisnis tersendiri, bukan keputusan teknis mendadak."));
add(L.tableCaption("Tumpukan teknologi MVP"));
add(L.dataTable(
  ["Komponen", "Pilihan", "Alasan"],
  [
    ["Frontend + backend", "Next.js 16 + TypeScript (PWA)", "Satu basis kode, rute API bawaan, gratis dan open source"],
    ["Basis data", "Supabase (PostgreSQL) tingkat gratis", "SQL standar, keamanan tingkat baris, kuota gratis cukup untuk MVP"],
    ["Login", "Supabase Auth (HP + kata sandi)", "Menghindari biaya OTP SMS yang tidak masuk anggaran Rp 0"],
    ["Foto barang & struk", "Supabase Storage", "Kuota gratis; foto dipadatkan di perangkat (\u2264 2 MB)"],
    ["Real-time & chat", "Supabase Realtime", "Pengganti Socket.io tanpa server tambahan"],
    ["Notifikasi", "Web Push (kunci VAPID)", "Gratis, bekerja walau aplikasi ditutup"],
    ["Hosting", "Vercel tingkat gratis", "Domain bawaan *.vercel.app, tanpa kartu kredit"],
    ["Peta", "Tidak ada di MVP", "Pilihan zona + alamat teks menggantikan geolokasi"],
  ],
  [24, 34, 42]
));
add(L.body("Dua keputusan teknis turunan juga dikunci. Pertama, pengambilan order dilindungi kendali unik di tingkat basis data sehingga mustahil dua kurir mendapat satu order, apa pun kondisi jaringannya. Kedua, seluruh foto dipadatkan di perangkat sebelum diunggah agar kuota dan kuota internet warga tidak terbakar."));
add(L.h2("7.2", "Kriteria Selesai MVP"));
add(L.body("MVP dinyatakan selesai hanya jika seluruh kriteria terukur berikut terpenuhi; kriteria ini menjadi daftar uji saat serah terima pengembang ke pemilik."));
const dod = [
  "Warga baru dapat mendaftar dan mengirim order pertamanya dalam \u2264 3 menit sejak membuka tautan.",
  "Tarif tampil otomatis benar untuk seluruh 9 kombinasi pasangan zona (uji matriks).",
  "Order baru tampil di papan kurir online dalam \u2264 10 detik setelah dikirim.",
  "Pengujian dua perangkat menekan AMBIL bersamaan menghasilkan tepat satu kurir pemenang.",
  "Perubahan status kurir dapat diselesaikan dalam \u2264 3 ketukan layar dari beranda kurir.",
  "Pesan chat terkirim dan tampil di penerima dalam \u2264 5 detik pada jaringan 3G normal.",
  "Rekap ongkir harian admin cocok dengan rekap pendapatan kurir untuk seluruh order uji.",
  "Seluruh layar terbuka dan dapat dioperasikan pada Android RAM 2 GB dengan Chrome terbaru.",
];
dod.forEach(t => add(new Paragraph({
  numbering: { reference: "list-dod", level: 0 },
  spacing: { after: 80, line: 312 },
  children: [L.run(t)],
})));
add(L.body("Setelah kriteria terpenuhi, dilakukan uji lapangan terbatas dengan 5 kurir pertama dan sekitar 20 order nyata sebelum pembukaan luas. Masukan uji lapangan menjadi bahan perbaikan peluncuran, bukan alasan membuka kembali lingkup fitur.", { after: 200 }));

// ── BAB 8 · LANGKAH BERIKUTNYA ──
add(L.h1("8", "Langkah Berikutnya"));
add(L.body("Eksekusi dibagi empat fase agar setiap tahap punya hasil yang bisa diuji. Fase 1 \u2014 fondasi (sekitar 2 minggu): struktur basis data, registrasi-login, dan panel admin dasar. Fase 2 \u2014 alur order inti (sekitar 3 minggu): form order, papan kurir, pengambilan order, pembaruan status, dan tarif zona. Fase 3 \u2014 chat dan notifikasi (sekitar 1 minggu): obrolan dalam order serta web push. Fase 4 \u2014 uji lapangan terbatas dan perbaikan (sekitar 2 minggu): 5 kurir pertama, 20 order nyata, lalu peluncuran di sekitar Pasar Sirampog. Total estimasi \u00b1 8 minggu kerja paruh waktu; angka ini estimasi perencanaan, bukan janji waktu."));
add(L.body("Sebelum eksekusi dimulai, ada empat keputusan yang tetap milik pemilik dan perlu dikonfirmasi sekali saja: (1) nama final NYANDAK atau memilih kandidat lain dari Tabel 2, (2) tarif final tiap zona pada Tabel 9, (3) jam layanan 06.00\u201320.00 WIB, dan (4) siapa menjadi admin kedua selain pemilik. Begitu keempatnya dikonfirmasi, dokumen ini beku sebagai acuan tetap; setiap kebutuhan baru dicatat untuk revisi v1.1 dan tidak mengubah pekerjaan yang sedang berjalan."));

// ══════════════════════════ DOKUMEN ══════════════════════════
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

const footerPage = () => new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080",
      font: { ascii: "Times New Roman" } })],
  })],
});
const headerTitle = () => new Header({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { bottom: { style: "single", size: 2, color: "D4875A", space: 4 } },
    children: [new TextRun({ text: "NYANDAK \u2014 Dokumen Kebutuhan & Desain Antarmuka v1.0",
      size: 18, color: "808080", font: { ascii: "Times New Roman" } })],
  })],
});

const doc = new Document({
  creator: "NYANDAK Project",
  title: "NYANDAK \u2014 Dokumen Kebutuhan & Desain Antarmuka v1.0",
  description: "PRD dan desain antarmuka platform jasa suruh Kecamatan Sirampog, Brebes",
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Times New Roman", eastAsia: "SimSun" }, size: 24, color: "000000" },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 32, bold: true, color: L.INK.primary },
        paragraph: { spacing: { before: 360, after: 200, line: 312 }, outlineLevel: 0 },
      },
      heading2: {
        run: { font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 28, bold: true, color: L.INK.primary },
        paragraph: { spacing: { before: 260, after: 130, line: 312 }, outlineLevel: 1 },
      },
    },
  },
  numbering: {
    config: [{
      reference: "list-dod",
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    }],
  },
  sections: [
    // ── Bagian 1: COVER (R4, margin 0, tanpa footer) ──
    {
      properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: L.buildCoverR4({
        englishLabel: "PRODUCT REQUIREMENTS AND UI DESIGN",
        title: "NYANDAK",
        subtitle: "Dokumen Kebutuhan Produk dan Desain Antarmuka",
        metaLines: [
          "Platform Jasa Suruh Warga Kecamatan Sirampog, Brebes",
          "Versi 1.0 \u2014 dikunci sebagai acuan tetap pengembangan",
          "Cakupan: MVP + chat dalam order \u00b7 infrastruktur biaya nol",
          "Disusun 1 November 2026",
        ],
        footerLeft: "NYANDAK \u00b7 Jasa Suruh Sirampog",
        footerRight: "Dokumen Internal v1.0",
        palette: {
          bg: L.GO1.bg, accent: L.GO1.accent,
          titleColor: L.GO1.cover.titleColor, subtitleColor: L.GO1.cover.subtitleColor,
          metaColor: L.GO1.cover.metaColor, footerColor: L.GO1.cover.footerColor,
        },
      }),
    },
    // ── Bagian 2: DAFTAR ISI (Romawi) ──
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: footerPage() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "DAFTAR ISI", bold: true, size: 32, color: L.INK.primary,
            font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
        }),
        new TableOfContents("Daftar Isi", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Catatan: Daftar isi dibuat dengan kode field. Setelah dokumen diubah, klik kanan daftar isi lalu pilih \u201cUpdate Field\u201d agar nomor halaman akurat.",
            italics: true, size: 18, color: "888888", font: { ascii: "Times New Roman" } })],
        }),
      ],
    },
    // ── Bagian 3: ISI (Arab, mulai 1) ──
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: headerTitle() },
      footers: { default: footerPage() },
      children: bodyChildren,
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log("OK ->", OUT, buf.length, "bytes");
});
