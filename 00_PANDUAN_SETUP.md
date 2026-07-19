# Smartlearn — Panduan Setup Fase 1

Fase 1 mencakup: **struktur database (Google Sheets)**, **sistem login (Google + manual)**, dan **halaman utama berbasis peran (role)**.

## Daftar File

| File | Tipe | Fungsi |
|------|------|--------|
| `Code.gs` | Server | Entry point (`doGet`), routing, konfigurasi |
| `Database.gs` | Server | Helper baca/tulis Google Sheets |
| `Setup.gs` | Server | Membuat database & data awal |
| `Auth.gs` | Server | Login, hashing password, sesi |
| `App.html` | Tampilan | Kerangka halaman (login + dashboard) |
| `Style.html` | Tampilan | CSS tema gradasi Smartlearn |
| `Script.html` | Tampilan | Logika sisi klien |

---

## Langkah 1 — Buat Proyek Apps Script

1. Buka https://script.google.com → **New project**.
2. Beri nama proyek, misalnya **Smartlearn**.

## Langkah 2 — Salin Semua File

Untuk tiap file `.gs`:
- Klik ikon **+** di samping "Files" → **Script** → beri nama (tanpa `.gs`), lalu tempel isinya.
- File `Code.gs` sudah ada secara default; ganti isinya.

Untuk tiap file `.html`:
- Klik **+** → **HTML** → beri nama persis (`App`, `Style`, `Script`) → tempel isinya.

> Penting: nama file harus **persis** (`App`, `Style`, `Script`) karena saling memanggil lewat `include()`.

## Langkah 3 — Buat Database

1. Di editor, pilih fungsi **`setupDatabase`** dari dropdown atas, lalu klik **Run**.
2. Saat diminta, **izinkan (Authorize)** akses ke Spreadsheet & akun Anda.
3. Buka menu **Execution log** — akan muncul URL database. Itu adalah Google Sheet "Smartlearn Database" yang berisi sheet `Users`, `Kelas`, dan `Logs`.

Akun demo yang otomatis dibuat:

| Email | Password | Peran |
|-------|----------|-------|
| admin@smartlearn.id | admin123 | Admin |
| guru@smartlearn.id | guru123 | Guru |
| andi@smartlearn.id | siswa123 | Siswa |
| budi@smartlearn.id | siswa123 | Siswa |

> Ganti password akun-akun ini sebelum dipakai sungguhan.

## Langkah 4 — Deploy sebagai Web App

1. Klik **Deploy** → **New deployment**.
2. Pilih tipe **Web app**.
3. Atur:
   - **Execute as**: `Me` (Anda)
   - **Who has access**: `Anyone` (agar siapa saja yang punya link bisa mengakses halaman login)
4. Klik **Deploy**, izinkan akses, lalu salin **Web app URL**. Itulah link aplikasi Smartlearn Anda.

## Langkah 5 — Uji Coba

Buka Web app URL, lalu coba login dengan salah satu akun demo (mis. `andi@smartlearn.id` / `siswa123`). Anda akan masuk ke dashboard sesuai peran.

---

## Catatan Penting tentang Login Google

Tombol "Masuk dengan Google" mencocokkan **email akun Google** Anda dengan kolom `email` di sheet `Users`. Agar berfungsi, email Google harus sudah terdaftar di database.

Keterbacaan email Google bergantung pada pengaturan deploy:
- **Akun Google Workspace (domain sekolah)**: paling andal — email terbaca otomatis.
- **Akun Gmail umum / lintas domain**: email bisa kosong karena pembatasan privasi Google. Jika ini terjadi, gunakan **login manual** (email + password). Sistem sudah menyediakan keduanya sebagai fallback.

Untuk hasil terbaik di sekolah, daftarkan email Workspace siswa/guru, lalu deploy dengan **Execute as: User accessing the web app** (opsi ini muncul jika memakai Workspace).

---

## Arsitektur Sesi

- Setelah login berhasil, server membuat **token** dan menyimpannya di `CacheService` selama 6 jam.
- Token disimpan di `localStorage` browser, lalu dikirim ulang setiap halaman dimuat untuk validasi otomatis.
- Logout menghapus token di server dan browser.

> CacheService bisa "lupa" lebih cepat jika beban tinggi. Pada fase berikutnya, sesi bisa dipindah ke sheet khusus agar lebih tahan lama bila diperlukan.

---

## Yang Akan Dibangun di Fase Berikutnya

- **Fase 2 — Akademik**: upload materi (PDF/Dok ke Drive), bank soal, ujian auto-koreksi, sistem level & badge.
- **Fase 3 — Sosial & Analitik**: dashboard analitik dengan grafik dinamis, pengumuman, pesan privat guru–siswa, chat grup dengan toggle aktif/nonaktif, dan pengaturan hak akses.

Struktur kode sudah disiapkan agar mudah diperluas: tambah tabel cukup di `DB_SCHEMA` (Setup.gs), proteksi fungsi pakai `requireAuth(token, ['guru'])` (Auth.gs).
