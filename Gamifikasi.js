/**
 * ============================================================
 *  File: Gamifikasi.gs — Level & Badge
 * ============================================================
 */

// Ambang XP untuk tiap level. Index 0 = Level 1, dst.
var LEVEL_THRESHOLDS = [0, 300, 800, 1600, 3000, 5000, 8000, 12000];

/** Menghitung level berdasarkan total XP. */
function calcLevel(xp) {
  xp = Number(xp) || 0;
  var lvl = 1;
  for (var i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) lvl = i + 1;
  }
  return lvl;
}

/** XP yang dibutuhkan untuk naik ke level berikutnya (null jika sudah maksimal). */
function xpForNextLevel(level) {
  if (level >= LEVEL_THRESHOLDS.length) return null;
  return LEVEL_THRESHOLDS[level];
}

// Definisi seluruh badge yang tersedia.
var BADGES = {
  first_exercise: { icon: '✏️', nama: 'Latihan Pertama', desc: 'Menyelesaikan latihan pertama', syarat: 'Selesaikan 1 latihan/ujian.' },
  five_exercises: { icon: '🔥', nama: 'Konsisten',       desc: 'Menyelesaikan 5 latihan', syarat: 'Selesaikan 5 latihan/ujian.' },
  perfect_score:  { icon: '🏅', nama: 'Skor Sempurna',   desc: 'Meraih skor 100', syarat: 'Raih skor 100 pada satu latihan/ujian.' },
  reader_5:       { icon: '📚', nama: 'Pembaca Rajin',   desc: 'Membaca 5 materi', syarat: 'Buka & baca 5 materi berbeda.' },
  level_3:        { icon: '⭐', nama: 'Pelajar Berdedikasi', desc: 'Mencapai Level 3', syarat: 'Kumpulkan XP hingga mencapai Level 3.' }
};

/** Semua badge dengan status earned/terkunci + syarat (untuk motivasi). */
function getSemuaBadgeSiswa(siswaId) {
  var owned = {};
  getRows('UserBadge').filter(function(b) { return String(b.siswa_id) === String(siswaId); })
    .forEach(function(b) { owned[b.badge_code] = formatDate(b.earned_at); });
  return Object.keys(BADGES).map(function(code) {
    var d = BADGES[code];
    return { code: code, icon: d.icon, nama: d.nama, desc: d.desc, syarat: d.syarat || d.desc,
             earned: !!owned[code], earned_at: owned[code] || '' };
  });
}

/** Mengambil badge yang sudah dimiliki seorang siswa. */
function getUserBadges(siswaId) {
  return getRows('UserBadge')
    .filter(function(b) { return String(b.siswa_id) === String(siswaId); })
    .map(function(b) {
      var def = BADGES[b.badge_code] || { icon: '🎖️', nama: b.badge_code, desc: '' };
      return { code: b.badge_code, icon: def.icon, nama: def.nama, desc: def.desc, earned_at: formatDate(b.earned_at) };
    });
}

/**
 * Memeriksa kondisi & memberi badge baru yang layak diraih.
 * Mengembalikan daftar badge yang baru diberikan.
 */
function checkAndAwardBadges(siswaId) {
  var owned = getRows('UserBadge')
    .filter(function(b) { return String(b.siswa_id) === String(siswaId); })
    .map(function(b) { return b.badge_code; });

  var ujian = getRows('UjianLog').filter(function(u) { return String(u.siswa_id) === String(siswaId); });
  var reads = getRows('MateriRead').filter(function(r) { return String(r.siswa_id) === String(siswaId); });
  var user = findRow('Users', 'id', siswaId);
  var level = user ? calcLevel(user.xp) : 1;

  var toAward = [];
  function maybe(code, condition) {
    if (condition && owned.indexOf(code) === -1) toAward.push(code);
  }
  maybe('first_exercise', ujian.length >= 1);
  maybe('five_exercises', ujian.length >= 5);
  maybe('perfect_score', ujian.some(function(u) { return Number(u.skor) >= 100; }));
  maybe('reader_5', reads.length >= 5);
  maybe('level_3', level >= 3);

  var newBadges = [];
  toAward.forEach(function(code) {
    appendRow('UserBadge', { id: generateId('bdg'), siswa_id: siswaId, badge_code: code, earned_at: new Date() });
    var def = BADGES[code];
    newBadges.push({ code: code, icon: def.icon, nama: def.nama, desc: def.desc });
  });
  return newBadges;
}