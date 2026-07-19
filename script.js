/* ===== Tahun di footer ===== */
document.getElementById("year").textContent = new Date().getFullYear();

/* ===== Tema (dark/light) dengan penyimpanan ===== */
const root = document.documentElement;
const savedTheme = localStorage.getItem("theme");
if (savedTheme) root.setAttribute("data-theme", savedTheme);
else root.setAttribute(
  "data-theme",
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
);
document.getElementById("themeToggle").addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});

/* ===== Menu mobile ===== */
const navLinks = document.getElementById("navLinks");
document.getElementById("menuToggle").addEventListener("click", () => {
  navLinks.classList.toggle("open");
});
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

/* ===== Navbar shadow saat scroll ===== */
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 10);
});

/* ===== Render kartu proyek ===== */
const grid = document.getElementById("projectGrid");
const emptyState = document.getElementById("emptyState");

function cardHTML(p) {
  const tags = p.tags.map((t) => `<span class="tag">${t}</span>`).join("");
  const linkBtn = p.link
    ? `<a href="${p.link}" target="_blank" rel="noopener" class="card__link">Lihat ↗</a>`
    : "";
  const repoBtn = p.repo
    ? `<a href="${p.repo}" target="_blank" rel="noopener" class="card__link card__link--ghost">Kode</a>`
    : "";
  return `
    <article class="card" data-category="${p.category}">
      <div class="card__top">
        <span class="card__emoji">${p.emoji || "📦"}</span>
        <span class="card__status status--${slug(p.status)}">${p.status || ""}</span>
      </div>
      <h3 class="card__title">${p.title}</h3>
      <p class="card__desc">${p.desc}</p>
      <div class="card__tags">${tags}</div>
      <div class="card__actions">${linkBtn}${repoBtn}</div>
    </article>`;
}

function slug(s) {
  return (s || "").toLowerCase().replace(/\s+/g, "-");
}

function renderProjects(filter = "all") {
  const list = filter === "all"
    ? PROJECTS
    : PROJECTS.filter((p) => p.category === filter);
  grid.innerHTML = list.map(cardHTML).join("");
  emptyState.hidden = list.length !== 0;
}

/* ===== Filter kategori ===== */
const filtersEl = document.getElementById("filters");
const categories = ["all", ...new Set(PROJECTS.map((p) => p.category))];
const labelFor = (c) => (c === "all" ? "Semua" : c.charAt(0).toUpperCase() + c.slice(1));

filtersEl.innerHTML = categories
  .map((c, i) => `<button class="filter${i === 0 ? " active" : ""}" data-filter="${c}">${labelFor(c)}</button>`)
  .join("");

filtersEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter");
  if (!btn) return;
  filtersEl.querySelectorAll(".filter").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderProjects(btn.dataset.filter);
});

renderProjects();

/* ===== Render skills ===== */
document.getElementById("skills").innerHTML = SKILLS
  .map((s) => `<span class="skill">${s}</span>`)
  .join("");

/* ===== Render kontak ===== */
document.getElementById("contactLinks").innerHTML = CONTACTS
  .map(
    (c) => `
    <a href="${c.href}" target="_blank" rel="noopener" class="contact-card">
      <span class="contact-card__emoji">${c.emoji}</span>
      <span class="contact-card__meta">
        <span class="contact-card__label">${c.label}</span>
        <span class="contact-card__value">${c.value}</span>
      </span>
    </a>`
  )
  .join("");

/* ===== Animasi angka statistik proyek ===== */
const statEl = document.getElementById("statProjects");
const target = PROJECTS.length;
let observed = false;
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting && !observed) {
      observed = true;
      let n = 0;
      const step = () => {
        n++;
        statEl.textContent = n;
        if (n < target) requestAnimationFrame(step);
      };
      step();
    }
  });
});
io.observe(statEl);

/* ===== Reveal saat scroll ===== */
const revealIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("revealed");
        revealIO.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".section, .hero__inner").forEach((el) => {
  el.classList.add("reveal");
  revealIO.observe(el);
});
