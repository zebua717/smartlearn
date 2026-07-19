/**
 * ============================================================
 *  File: PR.gs — Pekerjaan Rumah / Tugas
 *  Konsep: deadline, umpan balik instan, mastery/KKM + boleh
 *  mengulang (growth mindset), dan insight untuk guru
 *  (tingkat pengerjaan, tepat waktu, analisis butir soal).
 *  Mendukung PR untuk seluruh kelas ATAU ditargetkan ke
 *  siswa tertentu (PR remedial). Memakai ulang bank soal.
 * ============================================================
 */

/** Daftar id siswa target (kosong = seluruh kelas). */
function _prTargets(p) {
  var t = p.target_siswa;
  if (t == null || String(t).trim() === '') return [];
  return String(t).split(',').map(function(x) { return x.trim(); }).filter(function(x) { return x; });
}

/** Apakah PR berlaku untuk siswa tertentu? */
function _isTargeted(p, siswaId) {
  var t = _prTargets(p);
  if (!t.length) return true; // tidak ditargetkan = berlaku untuk seluruh kelas
  return t.indexOf(String(siswaId)) !== -1;
}

function buatPR(token, data) {
  var me = requireAuth(token, ['guru', 'admin']);
  if (!data || !data.judul || !data.paket_id) return { success: false, message: 'Judul dan paket soal wajib diisi.' };
  var paket = findRow('PaketSoal', 'id', data.paket_id);
  if (!paket) return { success: false, message: 'Paket soal tidak ditemukan.' };
  var target = '';
  if (data.target_siswa) {
    target = Array.isArray(data.target_siswa) ? data.target_siswa.join(',') : String(data.target_siswa);
  }
  var prId = generateId('pr');
  appendRow('PR', {
    id: prId, judul: data.judul, mapel: data.mapel || paket.mapel || '',
    kelas: data.kelas || '', paket_id: data.paket_id, instruksi: data.instruksi || '',
    deadline: data.deadline || '', kkm: Number(data.kkm) || 75,
    allow_retry: data.allow_retry ? 'true' : 'false', status: 'aktif',
    created_by: me.nama, created_by_id: me.id, created_at: new Date(), target_siswa: target
  });
  logAction(me.id, 'buat_pr', data.judul + (target ? ' (remedial/targeted)' : ''));

  // Notifikasi ke penerima PR
  var siswa = getRows('Users').filter(function(u) { return u.role === 'siswa'; });
  var audience;
  if (target) {
    var ids = target.split(',');
    audience = siswa.filter(function(u) { return ids.indexOf(String(u.id)) !== -1; });
  } else {
    var fake = { kelas: data.kelas || '' };
    audience = siswa.filter(function(u) { return _materiBerlaku(fake, u.kelas); });
  }
  var pesanNotif = 'Mapel ' + (data.mapel || paket.mapel || '-') + (data.deadline ? ' · deadline ' + _prDeadlineLabel(data.deadline) : '');
  var refPr = JSON.stringify({ id: prId });
  audience.forEach(function(u) { _kirimNotif(u.id, 'pr', 'PR baru: ' + data.judul, pesanNotif, refPr); });

  return { success: true };
}

function _prDeadlineLabel(dl) { if (!dl) return ''; try { return formatDateTime(dl); } catch (e) { return String(dl); } }

/** Ambil submission terbaru per siswa. */
function _latestPerSiswa(subs) {
  var map = {};
  subs.forEach(function(s) {
    var k = String(s.siswa_id);
    if (!map[k] || new Date(s.submitted_at) > new Date(map[k].submitted_at)) map[k] = s;
  });
  return Object.keys(map).map(function(k) { return map[k]; });
}

function _soalCount(paketId) {
  return getRows('Soal').filter(function(s) { return String(s.paket_id) === String(paketId); }).length;
}

/** Daftar siswa yang menjadi sasaran sebuah PR (target tertentu atau seluruh kelas). */
function _prAudience(p, siswaList) {
  var targets = _prTargets(p);
  if (targets.length) {
    return siswaList.filter(function(u) { return targets.indexOf(String(u.id)) !== -1; });
  }
  return siswaList.filter(function(u) { return !p.kelas || String(u.kelas) === String(p.kelas); });
}

/** Daftar PR untuk guru/admin + ringkasan pengerjaan. */
function listPRGuru(token) {
  requireAuth(token, ['guru', 'admin']);
  var subs = getRows('PRSubmission');
  var siswa = getRows('Users').filter(function(u) { return u.role === 'siswa'; });
  return getRows('PR').map(function(p) {
    var audience = _prAudience(p, siswa);
    var totalSiswa = audience.length;
    var latest = _latestPerSiswa(subs.filter(function(s) { return String(s.pr_id) === String(p.id); }));
    var avg = latest.length ? Math.round(latest.reduce(function(a, s) { return a + Number(s.skor); }, 0) / latest.length) : 0;
    var targets = _prTargets(p);
    return {
      id: String(p.id), judul: String(p.judul), mapel: String(p.mapel || ''), kelas: String(p.kelas || ''),
      deadline_label: _prDeadlineLabel(p.deadline), total_siswa: totalSiswa, sudah: latest.length, rata_skor: avg,
      is_targeted: targets.length > 0, target_count: targets.length
    };
  }).reverse();
}

/** Daftar PR untuk siswa + status pengerjaannya. */
function listPRSiswa(token) {
  var me = requireAuth(token, ['siswa']);
  var now = new Date();
  var subs = getRows('PRSubmission').filter(function(s) { return String(s.siswa_id) === String(me.id); });
  return getRows('PR')
    .filter(function(p) {
      return p.status === 'aktif' && (!p.kelas || String(p.kelas) === String(me.kelas)) && _isTargeted(p, me.id);
    })
    .map(function(p) {
      var mine = subs.filter(function(s) { return String(s.pr_id) === String(p.id); })
        .sort(function(a, b) { return new Date(b.submitted_at) - new Date(a.submitted_at); });
      var last = mine[0];
      var lewat = p.deadline ? (now > new Date(p.deadline)) : false;
      return {
        id: String(p.id), judul: String(p.judul), mapel: String(p.mapel || ''),
        jumlah_soal: _soalCount(p.paket_id), deadline_label: _prDeadlineLabel(p.deadline),
        lewat_deadline: lewat, allow_retry: String(p.allow_retry) === 'true',
        status: last ? 'selesai' : 'belum', skor: last ? Number(last.skor) : 0,
        lulus: last ? (Number(last.skor) >= Number(p.kkm)) : false,
        remedial: _prTargets(p).length > 0
      };
    }).reverse();
}

/** Ambil PR untuk dikerjakan siswa (soal tanpa kunci). */
function getPRUntukKerjakan(token, prId) {
  var me = requireAuth(token, ['siswa']);
  var p = findRow('PR', 'id', prId);
  if (!p) return { success: false, message: 'PR tidak ditemukan.' };
  if (p.kelas && String(p.kelas) !== String(me.kelas)) return { success: false, message: 'PR ini bukan untuk kelasmu.' };
  if (!_isTargeted(p, me.id)) return { success: false, message: 'PR ini tidak ditujukan untukmu.' };
  if (String(p.allow_retry) !== 'true') {
    var done = getRows('PRSubmission').some(function(s) { return String(s.pr_id) === String(prId) && String(s.siswa_id) === String(me.id); });
    if (done) return { success: false, message: 'PR ini sudah dikerjakan dan tidak boleh diulang.' };
  }
  var soal = getRows('Soal')
    .filter(function(s) { return String(s.paket_id) === String(p.paket_id); })
    .sort(function(a, b) { return (Number(a.nomor) || 0) - (Number(b.nomor) || 0); })
    .map(function(s) {
      return { id: String(s.id), nomor: Number(s.nomor) || 0, pertanyaan: String(s.pertanyaan),
               a: String(s.opsi_a), b: String(s.opsi_b), c: String(s.opsi_c), d: String(s.opsi_d) };
    });
  return { success: true, instruksi: String(p.instruksi || ''), soal: soal };
}

/** Submit PR: koreksi otomatis, catat tepat waktu/terlambat, beri XP (percobaan pertama). */
function submitPR(token, prId, answers) {
  var me = requireAuth(token, ['siswa']);
  var p = findRow('PR', 'id', prId);
  if (!p) return { success: false, message: 'PR tidak ditemukan.' };
  if (!_isTargeted(p, me.id)) return { success: false, message: 'PR ini tidak ditujukan untukmu.' };
  var prev = getRows('PRSubmission').filter(function(s) { return String(s.pr_id) === String(prId) && String(s.siswa_id) === String(me.id); });
  if (String(p.allow_retry) !== 'true' && prev.length) return { success: false, message: 'PR ini sudah dikerjakan.' };

  var soal = getRows('Soal').filter(function(s) { return String(s.paket_id) === String(p.paket_id); });
  if (!soal.length) return { success: false, message: 'PR ini belum punya soal.' };
  soal.sort(function(a, b) { return (Number(a.nomor) || 0) - (Number(b.nomor) || 0); });

  var ansMap = {}; (answers || []).forEach(function(a) { ansMap[a.soal_id] = String(a.jawaban || '').toUpperCase(); });
  var maxScore = 0, earned = 0, benar = 0, review = [], detail = [];
  soal.forEach(function(s) {
    var w = Number(s.skor) || 10; maxScore += w;
    var jwb = ansMap[s.id] || ''; var kunci = String(s.kunci || '').toUpperCase(); var ok = jwb === kunci;
    if (ok) { earned += w; benar++; }
    review.push({ nomor: Number(s.nomor) || 0, pertanyaan: String(s.pertanyaan), jawaban_siswa: jwb, kunci: kunci, benar: ok,
      teks_jawaban: (jwb ? String(s['opsi_' + jwb.toLowerCase()] || '') : ''),
      teks_kunci: String(s['opsi_' + kunci.toLowerCase()] || '') });
    detail.push({ n: Number(s.nomor) || 0, q: String(s.pertanyaan), b: ok ? 1 : 0 });
  });
  var persen = maxScore > 0 ? Math.round(earned / maxScore * 100) : 0;
  var terlambat = p.deadline ? (new Date() > new Date(p.deadline)) : false;
  var attempt = prev.length + 1;

  var xpEarned = 0, xpTotal = null, newLevel = null;
  if (attempt === 1) {
    xpEarned = benar * 10 + (persen === 100 ? 50 : 0);
    var fresh = findRow('Users', 'id', me.id);
    var newXp = (Number(fresh.xp) || 0) + xpEarned;
    newLevel = calcLevel(newXp);
    updateRow('Users', fresh._row, { xp: newXp, level: newLevel });
    xpTotal = newXp;
    checkAndAwardBadges(me.id);
  }

  appendRow('PRSubmission', {
    id: generateId('prs'), pr_id: prId, siswa_id: me.id, siswa_nama: me.nama, kelas: me.kelas,
    skor: persen, total_benar: benar, total_soal: soal.length, terlambat: terlambat ? 'true' : 'false',
    attempt: attempt, detail: JSON.stringify(detail), submitted_at: new Date()
  });
  logAction(me.id, 'submit_pr', p.judul + ' skor ' + persen);

  // Notifikasi ke guru pembuat PR
  var guruId = p.created_by_id;
  if (!guruId) { var g = findRow('Users', 'nama', p.created_by); if (g) guruId = g.id; }
  if (guruId) _kirimNotif(guruId, 'pr_selesai', me.nama + ' mengerjakan PR', p.judul + ' — skor ' + persen + (terlambat ? ' (terlambat)' : ''), JSON.stringify({ id: String(p.id) }));

  return {
    success: true, skor: persen, benar: benar, total: soal.length, kkm: Number(p.kkm) || 75,
    terlambat: terlambat, allow_retry: String(p.allow_retry) === 'true',
    xp_earned: xpEarned, xp_total: xpTotal, level: newLevel, review: review
  };
}

/** Laporan + insight PR untuk guru. */
function getPRReport(token, prId) {
  requireAuth(token, ['guru', 'admin']);
  var p = findRow('PR', 'id', prId);
  if (!p) return { success: false, message: 'PR tidak ditemukan.' };
  var kkm = Number(p.kkm) || 75;
  var allSiswa = getRows('Users').filter(function(u) { return u.role === 'siswa'; });
  var users = _prAudience(p, allSiswa);
  var subsAll = getRows('PRSubmission').filter(function(s) { return String(s.pr_id) === String(prId); });
  var latest = _latestPerSiswa(subsAll);
  var byId = {}; latest.forEach(function(s) { byId[String(s.siswa_id)] = s; });

  var sudah = latest.length;
  var avg = sudah ? Math.round(latest.reduce(function(a, s) { return a + Number(s.skor); }, 0) / sudah) : 0;
  var tepat = latest.filter(function(s) { return String(s.terlambat) !== 'true'; }).length;
  var tepatPct = sudah ? Math.round(tepat / sudah * 100) : 0;
  var perluBantuan = latest.filter(function(s) { return Number(s.skor) < kkm; })
    .map(function(s) { return { nama: String(s.siswa_nama), skor: Number(s.skor) }; });

  var benarCount = {}, ansCount = {};
  latest.forEach(function(s) {
    try {
      JSON.parse(s.detail).forEach(function(it) {
        ansCount[it.n] = (ansCount[it.n] || 0) + 1;
        benarCount[it.n] = (benarCount[it.n] || 0) + (it.b ? 1 : 0);
      });
    } catch (e) {}
  });
  var itemAnalysis = Object.keys(ansCount).map(function(n) {
    return { nomor: Number(n), pct: Math.round(benarCount[n] / ansCount[n] * 100) };
  }).sort(function(a, b) { return a.nomor - b.nomor; });

  var daftar = users.map(function(u) {
    var s = byId[String(u.id)];
    if (s) return { nama: String(u.nama), status: 'selesai', skor: Number(s.skor), terlambat: String(s.terlambat) === 'true', attempt: Number(s.attempt) || 1, submitted_at: formatDateTime(s.submitted_at) };
    return { nama: String(u.nama), status: 'belum', skor: 0, terlambat: false, attempt: 0, submitted_at: '' };
  });

  return {
    success: true, judul: String(p.judul), mapel: String(p.mapel || ''), kelas: String(p.kelas || ''),
    deadline_label: _prDeadlineLabel(p.deadline), kkm: kkm, total_siswa: users.length, sudah: sudah,
    rata_skor: avg, tepat_waktu_pct: tepatPct, perlu_bantuan: perluBantuan, item_analysis: itemAnalysis, daftar: daftar,
    is_targeted: _prTargets(p).length > 0
  };
}

function hapusPR(token, prId) {
  var me = requireAuth(token, ['guru', 'admin']);
  var p = findRow('PR', 'id', prId);
  if (!p) return { success: false, message: 'PR tidak ditemukan.' };
  var sheet = getSheet('PRSubmission'); var rows = getRows('PRSubmission');
  for (var i = rows.length - 1; i >= 0; i--) { if (String(rows[i].pr_id) === String(prId)) sheet.deleteRow(rows[i]._row); }
  getSheet('PR').deleteRow(p._row);
  logAction(me.id, 'hapus_pr', p.judul);
  return { success: true };
}