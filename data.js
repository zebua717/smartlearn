/* =====================================================================
   DATA WEBSITE — Cukup edit file ini untuk memperbarui isi web Anda.
   Tidak perlu menyentuh HTML/CSS. Simpan, commit, push -> web ter-update.
   ===================================================================== */

/* -------------------------------------------------------------------
   1) PROYEK / PROGRAM
   Untuk menambah program baru: salin satu blok { ... } lalu ubah isinya.
   - title   : nama program
   - desc    : deskripsi singkat
   - tags    : daftar teknologi (juga dipakai untuk filter)
   - category: "web" | "tool" | "mobile" | "lainnya" (bebas, untuk filter)
   - link    : URL demo/website (opsional, hapus jika belum ada)
   - repo    : URL kode sumber (opsional)
   - emoji   : ikon sederhana untuk kartu
   - status  : "Selesai" | "Dalam Pengembangan" | "Ide"
   ------------------------------------------------------------------- */
const PROJECTS = [
  {
    title: "Contoh Proyek Pertama",
    desc: "Ganti ini dengan deskripsi program pertama Anda. Jelaskan apa yang dilakukannya dan masalah apa yang diselesaikan.",
    tags: ["HTML", "CSS", "JavaScript"],
    category: "web",
    link: "",
    repo: "https://github.com/zebua717/smartlearn",
    emoji: "🚀",
    status: "Dalam Pengembangan",
  },
  {
    title: "Contoh Tool / Utility",
    desc: "Contoh kartu untuk sebuah tool. Hapus atau ubah menjadi proyek nyata Anda.",
    tags: ["Python", "CLI"],
    category: "tool",
    link: "",
    repo: "",
    emoji: "🛠️",
    status: "Ide",
  },
  {
    title: "Website Portofolio Ini",
    desc: "Web personal yang sedang Anda lihat. Dibangun dengan HTML, CSS, dan JavaScript, di-hosting gratis di Cloudflare Pages.",
    tags: ["HTML", "CSS", "JavaScript", "Cloudflare"],
    category: "web",
    link: "https://bankzeb.com",
    repo: "https://github.com/zebua717/smartlearn",
    emoji: "🌐",
    status: "Selesai",
  },
];

/* -------------------------------------------------------------------
   2) KEAHLIAN / TEKNOLOGI  — tampil di bagian "Alat & Teknologi"
   ------------------------------------------------------------------- */
const SKILLS = [
  "HTML", "CSS", "JavaScript", "Python", "Git", "Cloudflare",
];

/* -------------------------------------------------------------------
   3) KONTAK — hapus baris yang tidak Anda punya, ganti yang lain.
   ------------------------------------------------------------------- */
const CONTACTS = [
  { label: "Email",    value: "zebua717@gmail.com",              href: "mailto:zebua717@gmail.com", emoji: "✉️" },
  { label: "GitHub",   value: "github.com/zebua717",             href: "https://github.com/zebua717", emoji: "🐙" },
  // { label: "LinkedIn", value: "linkedin.com/in/username",     href: "https://linkedin.com/in/username", emoji: "💼" },
  // { label: "Twitter/X",value: "@username",                    href: "https://x.com/username", emoji: "🐦" },
];
