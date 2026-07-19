# bankzeb — Website Personal & Portofolio

Website personal untuk menampilkan program dan proyek yang saya bangun.
Dibangun dengan **HTML, CSS, dan JavaScript murni** (tanpa build step) dan
di-hosting gratis di **Cloudflare Pages** pada domain **bankzeb.com**.

## 📁 Struktur File

| File         | Fungsi                                                        |
|--------------|--------------------------------------------------------------|
| `index.html` | Kerangka halaman (jarang perlu diubah)                       |
| `styles.css` | Semua tampilan/desain & warna                               |
| `script.js`  | Logika: render proyek, filter, tema, animasi                |
| `data.js`    | **Isi konten Anda** — proyek, keahlian, kontak (edit di sini)|

## ✍️ Cara Menambah / Mengubah Isi

Cukup edit **`data.js`**. Tidak perlu menyentuh file lain.

Menambah program baru — tambahkan satu blok di array `PROJECTS`:

```js
{
  title: "Nama Program Saya",
  desc: "Deskripsi singkat apa yang dilakukan program ini.",
  tags: ["Python", "API"],
  category: "tool",              // web | tool | mobile | lainnya
  link: "https://demo.com",      // opsional
  repo: "https://github.com/...",// opsional
  emoji: "🤖",
  status: "Selesai",             // Selesai | Dalam Pengembangan | Ide
},
```

Simpan → `commit` → `push`. Cloudflare otomatis memperbarui web dalam ±1 menit.

## 👀 Melihat di Komputer Sendiri (lokal)

Buka `index.html` langsung di browser, atau jalankan server kecil:

```bash
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

## 🚀 Deploy ke Cloudflare Pages (langkah demi langkah)

1. **Push kode ini ke GitHub** (branch sudah tersedia di repo `zebua717/smartlearn`).
2. Masuk ke **dash.cloudflare.com** → menu **Workers & Pages** → **Create** → tab **Pages** → **Connect to Git**.
3. Pilih repository **`zebua717/smartlearn`** lalu **Begin setup**.
4. Isi konfigurasi build:
   - **Production branch**: `main` (setelah kode di-merge) — atau branch ini untuk uji coba.
   - **Framework preset**: `None`
   - **Build command**: *(kosongkan)*
   - **Build output directory**: `/`
5. Klik **Save and Deploy**. Anda akan dapat URL `xxx.pages.dev`.
6. **Pasang domain bankzeb.com**: di project Pages → **Custom domains** → **Set up a domain**
   → ketik `bankzeb.com` (dan `www.bankzeb.com`). Karena domain sudah di Cloudflare,
   record DNS akan dibuat otomatis. Tunggu status **Active**.

Selesai — web Anda live di **https://bankzeb.com** 🎉

## 🔄 Alur Kerja Harian

```
edit data.js  →  git add .  →  git commit -m "tambah proyek X"  →  git push
```

Cloudflare mendeteksi push dan otomatis men-deploy versi terbaru.
