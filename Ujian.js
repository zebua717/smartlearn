/**
 * ============================================================
 *  File: Ujian.gs — Pengerjaan ujian/latihan & auto-koreksi
 * ============================================================
 */

/**
 * Submit jawaban ujian (siswa). Koreksi dilakukan di server agar kunci aman.
 * answers: array of { soal_id, jawaban }  (jawaban = 'A'|'B'|'C'|'D')
 */
function submitUjian(token, paketId, answers, durasi) {
  var user = requireAuth(token, ['siswa']);
  var paket = findRow('PaketSoal', 'id', paketId);
  if (!paket) return { success: false, message: 'Paket soal tidak ditemukan.' };

  var soal = getRows('Soal').filter(function(s) { return String(s.paket_id) === String(paketId); });
  if (!soal.length) return { success: false, message: 'Paket soal kosong.' };

  var ansMap = {};
  (answers || []).forEach(function(a) { ansMap[a.soal_id] = String(a.jawaban || '').toUpperCase(); });

  var maxScore = 0, earned = 0, benar = 0, review = [];
  soal.forEach(function(s) {
    var w = Number(s.skor) || 10;
    maxScore += w;
    var jwb = ansMap[s.id] || '';
    var kunci = String(s.kunci || '').toUpperCase();
    var ok = jwb === kunci;
    if (ok) { earned += w; benar++; }
    review.push({
      nomor: s.nomor, pertanyaan: s.pertanyaan, jawaban_siswa: jwb, kunci: kunci, benar: ok,
      teks_jawaban: (jwb ? String(s['opsi_' + jwb.toLowerCase()] || '') : ''),
      teks_kunci: String(s['opsi_' + kunci.toLowerCase()] || '')
    });
  });
  review.sort(function(a, b) { return a.nomor - b.nomor; });

  var persen = maxScore > 0 ? Math.round(earned / maxScore * 100) : 0;
  var xpEarned = benar * 10 + (persen === 100 ? 50 : 0);

  // Update XP & level
  var fresh = findRow('Users', 'id', user.id);
  var oldLevel = calcLevel(fresh.xp);
  var newXp = (Number(fresh.xp) || 0) + xpEarned;
  var newLevel = calcLevel(newXp);
  updateRow('Users', fresh._row, { xp: newXp, level: newLevel });

  appendRow('UjianLog', {
    id: generateId('ulog'), siswa_id: user.id, siswa_nama: user.nama, kelas: user.kelas,
    paket_id: paketId, paket_nama: paket.nama, mapel: paket.mapel,
    skor: persen, total_benar: benar, total_soal: soal.length, xp_earned: xpEarned, timestamp: new Date(),
    detail: JSON.stringify(review.map(function(r) { return { n: r.nomor, q: r.pertanyaan, b: r.benar ? 1 : 0 }; })),
    durasi: Math.max(0, Math.round(Number(durasi) || 0))
  });

  var newBadges = checkAndAwardBadges(user.id);
  logAction(user.id, 'submit_ujian', paket.nama + ' — skor ' + persen);

  return {
    success: true, skor: persen, benar: benar, total: soal.length, durasi: Math.max(0, Math.round(Number(durasi) || 0)),
    xp_earned: xpEarned, xp_total: newXp, level: newLevel, naik_level: newLevel > oldLevel,
    new_badges: newBadges, review: review
  };
}

/** Riwayat ujian seorang siswa. */
function getRiwayatUjian(token) {
  var user = requireAuth(token, ['siswa']);
  return getRows('UjianLog')
    .filter(function(u) { return String(u.siswa_id) === String(user.id); })
    .map(function(u) {
      return {
        paket_nama: u.paket_nama, mapel: u.mapel, skor: u.skor,
        total_benar: u.total_benar, total_soal: u.total_soal, timestamp: formatDate(u.timestamp)
      };
    })
    .reverse();
}

/** Statistik latihan per paket untuk siswa yang login: jumlah pengerjaan, rata-rata waktu (detik), skor tertinggi. */
function getLatihanStats(token) {
  var me = requireAuth(token, ['siswa']);
  var logs = getRows('UjianLog').filter(function(x) { return String(x.siswa_id) === String(me.id); });
  var map = {};
  logs.forEach(function(x) {
    var k = String(x.paket_id);
    if (!map[k]) map[k] = { kali: 0, total_waktu: 0, waktu_count: 0, skor_tertinggi: 0 };
    map[k].kali++;
    var d = Number(x.durasi) || 0; if (d > 0) { map[k].total_waktu += d; map[k].waktu_count++; }
    var s = Number(x.skor) || 0; if (s > map[k].skor_tertinggi) map[k].skor_tertinggi = s;
  });
  var out = {};
  Object.keys(map).forEach(function(k) {
    var m = map[k];
    out[k] = { kali: m.kali, rata_waktu: m.waktu_count ? Math.round(m.total_waktu / m.waktu_count) : 0, skor_tertinggi: m.skor_tertinggi };
  });
  return out;
}