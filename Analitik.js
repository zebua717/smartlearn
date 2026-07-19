/**
 * ============================================================
 *  File: Analitik.gs — Data agregat untuk dashboard analitik guru/admin
 * ============================================================
 */

function getAnalitik(token) {
  requireAuth(token, ['guru', 'admin']);
  var ujian = getRows('UjianLog');
  var siswa = getRows('Users').filter(function(u) { return u.role === 'siswa'; });

  // Rata-rata skor per kelas
  var kelasMap = {};
  getRows('Kelas').forEach(function(k) { kelasMap[k.nama_kelas] = { kelas: k.nama_kelas, total: 0, count: 0 }; });
  ujian.forEach(function(u) {
    var k = u.kelas || '-';
    if (!kelasMap[k]) kelasMap[k] = { kelas: k, total: 0, count: 0 };
    kelasMap[k].total += Number(u.skor); kelasMap[k].count++;
  });
  var perKelas = Object.keys(kelasMap).map(function(k) {
    var o = kelasMap[k];
    return { kelas: k, avg: o.count ? Math.round(o.total / o.count) : 0, count: o.count };
  });

  // Distribusi skor
  var dist = [0, 0, 0, 0, 0, 0];
  ujian.forEach(function(u) {
    var s = Number(u.skor);
    if (s < 50) dist[0]++; else if (s < 60) dist[1]++; else if (s < 70) dist[2]++;
    else if (s < 80) dist[3]++; else if (s < 90) dist[4]++; else dist[5]++;
  });

  // Top 5 siswa berdasarkan XP
  var top = siswa.map(function(s) {
    return { nama: s.nama, kelas: s.kelas, xp: Number(s.xp) || 0, level: calcLevel(s.xp) };
  }).sort(function(a, b) { return b.xp - a.xp; }).slice(0, 5);

  // Tren aktivitas 7 hari terakhir
  var tz = Session.getScriptTimeZone();
  var days = [], dayIndex = {};
  for (var i = 6; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    var key = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    dayIndex[key] = days.length;
    days.push({ label: Utilities.formatDate(d, tz, 'd/M'), jumlah: 0 });
  }
  ujian.forEach(function(u) {
    try {
      var key = Utilities.formatDate(new Date(u.timestamp), tz, 'yyyy-MM-dd');
      if (dayIndex[key] !== undefined) days[dayIndex[key]].jumlah++;
    } catch (e) {}
  });

  return { perKelas: perKelas, distribusi: dist, topSiswa: top, tren: days };
}

/**
 * Ranking kecepatan pengerjaan per mata pelajaran.
 * Untuk tiap mapel, siswa diurutkan dari rata-rata durasi TERCEPAT ke TERLAMA.
 * Hanya menghitung pengerjaan yang punya catatan durasi (> 0 detik).
 */
function getRankingWaktu(token) {
  requireAuth(token, ['guru', 'admin']);
  var byMapel = {}; // mapel -> { siswaId -> {nama,kelas,totDur,totSkor,count} }
  getRows('UjianLog').forEach(function(u) {
    var dur = Number(u.durasi) || 0;
    if (dur <= 0) return;
    var m = u.mapel || '(Tanpa mapel)';
    if (!byMapel[m]) byMapel[m] = {};
    var sid = String(u.siswa_id);
    if (!byMapel[m][sid]) byMapel[m][sid] = { nama: u.siswa_nama, kelas: u.kelas || '', totDur: 0, totSkor: 0, count: 0 };
    var e = byMapel[m][sid];
    e.totDur += dur; e.totSkor += Number(u.skor) || 0; e.count++;
  });
  return Object.keys(byMapel).sort().map(function(m) {
    var ranking = Object.keys(byMapel[m]).map(function(sid) {
      var e = byMapel[m][sid];
      return { nama: String(e.nama || '-'), kelas: String(e.kelas || ''), avg_durasi: Math.round(e.totDur / e.count), avg_skor: Math.round(e.totSkor / e.count), jumlah: e.count };
    }).sort(function(a, b) { return a.avg_durasi - b.avg_durasi; });
    return { mapel: String(m), ranking: ranking };
  });
}