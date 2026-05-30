# CONTEXT — Verdant Schedule

Glosarium domain untuk aplikasi penjadwalan rapat.

## Aktor

| Term | Definisi |
|---|---|
| **Super Admin** | Pemilik sistem/instance. Mengelola kredensial Admin. Tidak terlibat dalam operasi rapat sehari-hari. |
| **Admin** (Penyelenggara) | Membuat dan mengelola Rapat, memilih tanggal kandidat, mengundang Peserta, melihat hasil analisis ketersediaan. |
| **Peserta** | Orang yang menerima Undangan. Mengisi Ketersediaan jam untuk setiap tanggal yang ditentukan Admin. |

## Konsep Inti

| Term | Definisi |
|---|---|
| **Rapat** | Acara yang dibuat Admin. Memiliki: nama, beberapa tanggal kandidat, rentang jam (startHour–endHour). |
| **Undangan** | Link unik yang dikirim Admin ke Peserta. Membawa ID Rapat. |
| **Ketersediaan** | Data dari satu Peserta untuk satu Rapat: jam-jam di mana Peserta bisa hadir, untuk setiap tanggal yang sudah ditentukan Admin. |
| **Slot** | Satu unit waktu 30 menit pada satu tanggal tertentu. Unit atomik dari Ketersediaan. |
| **Konflik GCal** | Acara di Google Calendar Peserta yang overlap dengan Slot Rapat. Ditampilkan sebagai overlay abu-abu informatif; tidak memblokir pemilihan Slot. |
| **Tanggal Kandidat** | Tanggal-tanggal yang dipilih Admin sebagai opsi hari Rapat. Hanya Admin yang menentukan tanggal; Peserta hanya mengisi jam. |
| **Wizard** | Alur tanya-jawab terpandu yang dijalani Peserta saat membuka Undangan: (1) input nama, (2) opsional sinkron GCal, (3) isi Ketersediaan per Tanggal Kandidat, (4) review, (5) simpan. |
| **Modify Flow** | Alur khusus saat Peserta yang sudah pernah mengisi membuka Undangan lagi. Sistem menampilkan konteks (timestamp + OS + Browser), Peserta bisa mengubah hari tertentu atau mengisi ulang dari awal. |
| **Skip** | Peserta menyatakan tidak bisa hadir di suatu Tanggal Kandidat. Disimpan sebagai array kosong `[]` — berbeda dengan "belum diisi" (tidak ada key). |
| **Jendela Tampilan** | Rentang `startHour`–`endHour` yang ditentukan Admin. Data Ketersediaan Peserta tetap utuh di database; hanya slot dalam jendela ini yang divisualisasikan. Jika jendela menyusut, slot di luar menjadi tersembunyi (tidak dihapus). Jika melebar kembali, slot tersebut muncul lagi. |

## Invariant

- **Nama Peserta tidak case-sensitive.** Disimpan sebagai UPPERCASE untuk query, ditampilkan dengan displayName asli.
- **Auto-save terjadi setiap pindah Tanggal Kandidat** dalam Wizard. Tombol "Simpan" di akhir adalah konfirmasi final.
- **Undangan bersifat broadcast:** satu link per Rapat, tidak ada token per-Peserta.
- **Data GCal tidak disimpan** di backend; hanya digunakan selama sesi Peserta.
- **Partial update:** saat Modify Flow, perubahan satu tanggal tidak mempengaruhi tanggal lain.
- **Perubahan rentang jam Admin tidak menghapus data Peserta.**
