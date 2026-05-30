## Problem Statement

Verdant Schedule saat ini (v1) memaksa Peserta untuk berhadapan dengan grid jadwal yang padat secara langsung — seluruh tanggal × seluruh slot ditampilkan sekaligus dalam heatmap 2D. Bagi orang yang tidak terbiasa dengan teknologi (target utama aplikasi ini), ini terlalu rumit:

- Terlalu banyak informasi dalam satu layar
- Tidak ada panduan langkah-demi-langkah
- Tidak terintegrasi dengan Google Calendar (Peserta harus mengecek manual apakah ada bentrok acara)
- Tidak ada penanganan ketika Peserta yang sama membuka undangan dua kali
- Nama case-sensitive dan tidak ada informasi konteks untuk identifikasi duplikat
- Admin tidak bisa memilih rentang jam yang fleksibel (hanya jam bulat)

## Solution

Merombak total pengalaman Peserta dari **grid padat** menjadi **wizard tanya-jawab terpandu** (guided wizard), sambil meningkatkan stack teknis dan mempertahankan alur Admin yang sudah ada.

### Wizard Flow untuk Peserta

1. **Input Nama** → deteksi apakah sudah ada yang mengisi dengan nama yang sama (case-insensitive). Jika ya, tampilkan konteks (timestamp + OS + Browser) dan tanya: "Apakah ini Anda?" → Ya (modify) / Bukan (pakai nama lain)
2. **Google Calendar (opsional)** → tawarkan sinkronisasi GCal via OAuth, tampilkan konflik sebagai overlay abu-abu informatif (tidak memblokir pemilihan slot)
3. **Isi Ketersediaan per Tanggal** — untuk setiap Tanggal Kandidat yang ditentukan Admin:
   - Desktop: bar horizontal kontinu, drag-select dengan snap 30 menit, tampilkan GCal konflik sebagai overlay
   - Mobile: tap list vertikal slot 30 menit
   - Navigasi: kotak-kotak tanggal horizontal (visual indicator terisi/skip/aktif/belum)
   - Bisa skip ("Tidak bisa di hari ini")
   - Auto-save setiap pindah tanggal
4. **Review** — tampilkan ringkasan semua pilihan, opsi ubah per tanggal
5. **Simpan** — konfirmasi final. Halaman terima kasih dengan opsi "Ubah jadwal"

### Modify Flow (Peserta yang sudah mengisi kembali)

- Tampilkan "Sepertinya [NAMA] sudah mengisi pada [timestamp] dari [OS] · [Browser]"
- Dua opsi: "Ya, ubah jadwal" atau "Bukan saya"
- Jika Ya → pilih hari yang ingin diubah (kotak-kotak tanggal) atau isi ulang semua
- Partial update — perubahan satu hari tidak mempengaruhi hari lain

### Admin Tetap dengan Peningkatan

- **Rentang jam fleksibel**: Admin bisa pilih jam mulai/selesai dengan granularitas menit (tidak hanya jam bulat)
- **Firebase Auth**: Login menggunakan Email/Password (Firebase Auth) menggantikan localStorage
- Analisis halaman dipertahankan: heatmap hijau, top 3 rekomendasi (real-time)

### Data Model Baru

Ketersediaan disimpan per-tanggal sebagai map:
- `availability["2026-06-15"] = ["08:00", "08:30", ...]` → bisa hadir
- `availability["2026-06-16"] = []` → skip / tidak bisa
- Key tidak ada → belum diisi

**Jendela Tampilan**: Rentang jam Admin bertindak sebagai "jendela" — data Peserta tetap utuh di database, hanya slot dalam jendela yang divisualisasikan. Perubahan rentang tidak menghapus data.

## User Stories

1. Sebagai **Peserta yang tidak terbiasa teknologi**, saya ingin dipandu langkah demi langkah saat mengisi ketersediaan, sehingga saya tidak bingung dengan tampilan yang terlalu padat.
2. Sebagai **Peserta**, saya ingin mengimpor Google Calendar saya, sehingga saya bisa melihat acara mana yang bentrok tanpa harus mengecek manual.
3. Sebagai **Peserta**, saya ingin bisa memilih jam ketersediaan dengan cara drag (di laptop) atau tap (di HP), sehingga proses pengisian terasa natural dan cepat.
4. Sebagai **Peserta**, saya ingin melihat ringkasan semua pilihan saya sebelum menyimpan, sehingga saya bisa memastikan tidak ada yang salah.
5. Sebagai **Peserta yang sudah mengisi**, saya ingin bisa mengubah jadwal saya tanpa harus mengisi ulang semuanya, sehingga saya tidak membuang waktu.
6. Sebagai **Peserta**, saya ingin tahu apakah saya sudah pernah mengisi sebelumnya (dengan konfirmasi sederhana), sehingga data saya tidak tertimpa oleh orang lain yang kebetulan bernama sama.
7. Sebagai **Peserta**, saya ingin bisa menyatakan bahwa saya tidak bisa hadir di suatu tanggal, sehingga Admin tahu bahwa saya sudah merespons meskipun tidak bisa.
8. Sebagai **Peserta**, saya ingin progress saya tersimpan otomatis saat saya pindah antar tanggal, sehingga saya tidak kehilangan data jika browser crash.
9. Sebagai **Admin**, saya ingin membuat rapat dengan memilih beberapa tanggal kandidat dan rentang jam yang fleksibel, sehingga rapat bisa disesuaikan dengan kebutuhan.
10. Sebagai **Admin**, saya ingin membagikan satu link undangan ke semua Peserta, sehingga proses distribusi undangan sederhana.
11. Sebagai **Admin**, saya ingin melihat heatmap ketersediaan semua Peserta secara real-time, sehingga saya bisa langsung tahu slot mana yang paling cocok.
12. Sebagai **Admin**, saya ingin melihat top 3 rekomendasi slot (slot dengan Peserta terbanyak + durasi terpanjang), sehingga saya bisa cepat mengambil keputusan.
13. Sebagai **Admin**, saya ingin login dengan email dan password yang aman, sehingga akun saya terlindungi.
14. Sebagai **Super Admin**, saya ingin mengelola kredensial Admin (tambah/hapus), sehingga saya bisa mengontrol siapa yang punya akses ke sistem.
15. Sebagai **Peserta**, saya ingin slot GCal yang bentrok tetap bisa saya pilih (hanya sebagai informasi), sehingga saya tidak terkekang oleh kalender saya sendiri.

## Implementation Decisions

1. **Stack**: Migrasi dari static HTML + Babel standalone ke Next.js + TypeScript. Tetap menggunakan Firebase (Firestore + Auth) sebagai backend.
2. **Auth Admin**: Firebase Auth Email/Password menggantikan localStorage-based auth. Super Admin tetap menggunakan master key hash di Firestore.
3. **Undangan**: Satu link broadcast per Rapat (`<base_url>/?id=<eventId>`), tanpa token per-Peserta.
4. **Identifikasi Peserta**: Berbasis nama (case-insensitive, disimpan UPPERCASE). Deteksi duplikat dengan query Firestore. Tidak ada email atau token verifikasi.
5. **Google Calendar**: Client-side OAuth via Google Identity Services. Data GCal hanya ada di sesi browser, tidak disimpan ke Firestore. Konflik ditampilkan sebagai overlay abu-abu pada pemilih jam dengan teks informatif bahwa slot tetap bisa dipilih.
6. **Pemilih Jam Desktop**: Bar horizontal kontinu dengan grid 30 menit. Drag mouse untuk select/deselect range. Snap ke grid 30 menit. GCal konflik sebagai overlay shading.
7. **Pemilih Jam Mobile**: Tap list vertikal — setiap slot 30 menit adalah baris yang bisa di-tap on/off. Navigasi antar tanggal via tab horizontal.
8. **Navigasi Wizard**: Kotak-kotak tanggal di bagian atas (chip/box horizontal) yang menunjukkan status setiap tanggal: terisi, skip, sedang diisi, belum diisi. Bisa diklik untuk melompat. Ada tombol "Sebelumnya" dan "Lanjut". Flow linear tapi bisa melompat.
9. **Auto-save**: Setiap pindah tanggal, data langsung ditulis ke Firestore (partial save). Tombol "Simpan" di review step adalah konfirmasi final (menambah flag atau timestamp final).
10. **Review**: Tampilan daftar semua tanggal dengan ringkasan slot yang dipilih. Tombol "Ubah" mengarah ke pilihan tanggal spesifik.
11. **Modify Flow**: Partial update — mengubah satu tanggal tidak menyentuh data tanggal lain. Opsi "Isi ulang semua" menghapus semua data dan mulai dari awal.
12. **Data Model Firestore**:
    - `/meetings/{meetingId}`: eventName, dates[], startHour (float), endHour (float), createdAt, updatedAt
    - `/meetings/{meetingId}/participants/{participantId}`: name (UPPERCASE), displayName, availability (map date→string[]), deviceInfo, createdAt, updatedAt
13. **Jendela Tampilan**: Rentang jam Admin adalah jendela tampilan. Data Peserta di luar jendela disimpan tetapi tidak divisualisasikan. Perubahan rentang tidak menghapus data.
14. **Analysis Page**: Dipertahankan dengan heatmap intensitas hijau single-hue, top 3 rekomendasi contiguous blocks, real-time via onSnapshot.
15. **Module Isolation**: Wizard Engine sebagai state machine terisolasi (deep module). Time Selector sebagai UI component murni. Analysis computation sebagai pure function.
16. **Tema Visual**: Verdant dipertahankan (earth tones, hijau, cream, DM Sans/DM Mono).
17. **Mobile-Desktop Balance**: Tidak mobile-first, tidak desktop-first. Desain responsif yang seimbang untuk kedua platform.

## Testing Decisions

**Apa yang membuat test bagus**: Test menguji external behavior (input → output), bukan implementation details. Tidak mock Firestore — gunakan seeded test data atau Firebase emulator.

**Module yang di-test**:
- **Wizard Engine**: State machine transition, auto-save logic, duplicate detection, modify flow branching. Prioritas tertinggi karena paling banyak edge case.
- **Analysis Computation**: Heatmap generation, contiguous block detection, top 3 ranking. Pure function, mudah di-test.
- **Data Layer**: Firestore CRUD operations, query untuk duplicate detection, data transformation.

**Belum di-test** (karena UI-heavy):
- Time Selector component (drag bar, tap list)
- GCal OAuth integration
- Animasi dan transisi visual

**Testing Framework**: Vitest (default Next.js ecosystem).

## Out of Scope

- Notifikasi atau email ke Peserta/Admin
- Export data (CSV, PDF) — untuk saat ini cukup copy-paste summary
- i18n / multi-bahasa
- Dark mode
- Token undangan per-Peserta
- Integrasi GCal sisi Admin (hanya Peserta)
- Mobile app native (PWA tetap bisa dipertimbangkan nanti)

## Further Notes

- Sistem v1 (HTML files) di-archive di git history, tidak dipertahankan sebagai fallback.
- Firebase project `rapat-6f578` tetap digunakan — tidak ada migrasi ke project baru.
- Semua terminologi mengacu pada `CONTEXT.md` di root repo.
- Development dimulai dari scaffolding Next.js, diikuti Auth, Admin Panel, Super Admin, Wizard (module paling kompleks), lalu polish.
