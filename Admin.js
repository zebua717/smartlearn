/**
 * ============================================================
 *  File: Admin.gs — Manajemen pengguna & data ringkasan dashboard
 * ============================================================
 */

/** Tambah pengguna baru (admin). */
function tambahPengguna(token, data) {
  requireAuth(token, ['admin']);
  if (!data || !data.nama || !data.email || !data.password || !data.role) {
    return { success: false, message: 'Nama, email, password, dan peran wajib diisi.' };
  }
  if (findRow('Users', 'email', String(data.email).toLowerCase())) {
    return { success: false, message: 'Email sudah terdaftar.' };
  }
  createUserAccount(data.nama, data.email, data.password, data.role, data.kelas || '');
  return { success: true };
}

/** Daftar seluruh pengguna (admin & guru). */
function listUsers(token) {
  requireAuth(token, ['admin', 'guru']);
  return getRows('Users').map(function(u) {
    return {
      id: u.id, nama: u.nama, email: u.email, role: u.role,
      kelas: u.kelas, level: calcLevel(u.xp), xp: Number(u.xp) || 0, status: u.status
    };
  });
}

/** Daftar kelas (untuk dropdown). */
function listKelas(token) {
  requireAuth(token);
  return getRows('Kelas').map(function(k) { return { id: k.id, nama_kelas: k.nama_kelas }; });
}

/* ---------- Ringkasan Dashboard ---------- */

function getGuruDashboard(token) {
  requireAuth(token, ['guru', 'admin']);
  var siswa = getRows('Users').filter(function(u) { return u.role === 'siswa'; });
  var totalSiswa = siswa.length;
  var siswaIds = {}; siswa.forEach(function(s) { siswaIds[String(s.id)] = true; });
  var ujian = getRows('UjianLog');
  var avg = ujian.length ? Math.round(ujian.reduce(function(s, u) { return s + Number(u.skor); }, 0) / ujian.length) : 0;

  var dist = [0, 0, 0, 0, 0, 0]; // <50, 50-59, 60-69, 70-79, 80-89, 90-100
  ujian.forEach(function(u) {
    var s = Number(u.skor);
    if (s < 50) dist[0]++; else if (s < 60) dist[1]++; else if (s < 70) dist[2]++;
    else if (s < 80) dist[3]++; else if (s < 90) dist[4]++; else dist[5]++;
  });

  // Skor tertinggi & terendah
  var hi = 0, lo = 0;
  if (ujian.length) {
    var arr = ujian.map(function(u) { return Number(u.skor); });
    hi = Math.max.apply(null, arr); lo = Math.min.apply(null, arr);
  }

  // Partisipasi ujian (siswa unik yang sudah mengerjakan ≥1 ujian)
  var ujianSiswa = {}; ujian.forEach(function(u) { if (siswaIds[String(u.siswa_id)]) ujianSiswa[String(u.siswa_id)] = true; });
  var partisipasiPct = totalSiswa ? Math.round(Object.keys(ujianSiswa).length / totalSiswa * 100) : 0;

  // Jangkauan materi (siswa unik yang sudah membuka ≥1 materi)
  var readSiswa = {}; getRows('MateriRead').forEach(function(r) { if (siswaIds[String(r.siswa_id)]) readSiswa[String(r.siswa_id)] = true; });
  var materiReachPct = totalSiswa ? Math.round(Object.keys(readSiswa).length / totalSiswa * 100) : 0;

  return {
    total_siswa: totalSiswa, total_materi: getRows('Materi').length,
    total_ujian: ujian.length, rata_skor: avg, distribusi: dist,
    skor_tertinggi: hi, skor_terendah: lo, partisipasi_pct: partisipasiPct,
    jumlah_mengerjakan: Object.keys(ujianSiswa).length, materi_reach_pct: materiReachPct
  };
}

function getDataSiswa(token) {
  requireAuth(token, ['guru', 'admin']);
  var siswa = getRows('Users').filter(function(u) { return u.role === 'siswa'; });
  var ujian = getRows('UjianLog');
  return siswa.map(function(s) {
    var u = ujian.filter(function(x) { return String(x.siswa_id) === String(s.id); });
    var avg = u.length ? Math.round(u.reduce(function(a, x) { return a + Number(x.skor); }, 0) / u.length) : 0;
    return {
      id: s.id, nama: s.nama, email: s.email, status: s.status || 'aktif',
      kelas: s.kelas, level: calcLevel(s.xp),
      xp: Number(s.xp) || 0, rata_skor: avg, jumlah_latihan: u.length
    };
  });
}

function getSiswaDashboard(token) {
  var user = requireAuth(token, ['siswa']);
  var fresh = findRow('Users', 'id', user.id);
  var ujian = getRows('UjianLog').filter(function(u) { return String(u.siswa_id) === String(user.id); });
  var avg = ujian.length ? Math.round(ujian.reduce(function(s, u) { return s + Number(u.skor); }, 0) / ujian.length) : 0;
  var lvl = calcLevel(fresh.xp);
  return {
    level: lvl, xp: Number(fresh.xp) || 0, xp_next: xpForNextLevel(lvl),
    rata_skor: avg, jumlah_latihan: ujian.length, kelas: fresh.kelas, badges: getUserBadges(user.id), badges_semua: getSemuaBadgeSiswa(user.id)
  };
}

function getAdminDashboard(token) {
  requireAuth(token, ['admin']);
  return {
    total_users: getRows('Users').length, total_kelas: getRows('Kelas').length,
    total_materi: getRows('Materi').length, total_paket: getRows('PaketSoal').length
  };
}

/* ============================================================
 *  Manajemen Pengguna (edit/hapus) & Kelas (tambah/edit/hapus)
 * ============================================================ */

function updatePengguna(token, userId, data) {
  var me = requireAuth(token, ['admin']);
  var u = findRow('Users', 'id', userId);
  if (!u) return { success: false, message: 'Pengguna tidak ditemukan.' };
  var patch = {};
  if (data.nama) patch.nama = data.nama;
  if (data.email) {
    var other = findRow('Users', 'email', String(data.email).toLowerCase());
    if (other && String(other.id) !== String(userId)) return { success: false, message: 'Email sudah dipakai pengguna lain.' };
    patch.email = String(data.email).toLowerCase();
  }
  if (data.role) patch.role = data.role;
  if (data.kelas != null) patch.kelas = data.kelas;
  if (data.status) patch.status = data.status;
  if (data.password) { var salt = generateSalt(); patch.salt = salt; patch.password_hash = hashPassword(data.password, salt); }
  updateRow('Users', u._row, patch);
  logAction(me.id, 'update_user', u.email);
  return { success: true };
}

function hapusPengguna(token, userId) {
  var me = requireAuth(token, ['admin']);
  if (String(me.id) === String(userId)) return { success: false, message: 'Tidak bisa menghapus akun sendiri.' };
  var u = findRow('Users', 'id', userId);
  if (!u) return { success: false, message: 'Pengguna tidak ditemukan.' };
  getSheet('Users').deleteRow(u._row);
  logAction(me.id, 'hapus_user', u.email);
  return { success: true };
}

function listKelasAdmin(token) {
  requireAuth(token, ['admin']);
  var siswa = getRows('Users').filter(function(u) { return u.role === 'siswa'; });
  return getRows('Kelas').map(function(k) {
    var cnt = siswa.filter(function(u) { return String(u.kelas) === String(k.nama_kelas); }).length;
    return { id: String(k.id), nama_kelas: String(k.nama_kelas), wali_kelas: String(k.wali_kelas || ''), tahun_ajaran: String(k.tahun_ajaran || ''), jumlah_siswa: cnt };
  });
}

function getKelasDetail(token, kelasId) {
  requireAuth(token, ['admin']);
  var k = findRow('Kelas', 'id', kelasId);
  if (!k) return { success: false, message: 'Kelas tidak ditemukan.' };
  var siswa = getRows('Users').filter(function(u) { return u.role === 'siswa'; }).map(function(u) {
    return { id: String(u.id), nama: String(u.nama), kelas: String(u.kelas || ''), terpilih: String(u.kelas) === String(k.nama_kelas) };
  });
  return { success: true, id: String(k.id), nama_kelas: String(k.nama_kelas), wali_kelas: String(k.wali_kelas || ''), tahun_ajaran: String(k.tahun_ajaran || ''), siswa: siswa };
}

function tambahKelas(token, data) {
  var me = requireAuth(token, ['admin']);
  if (!data || !data.nama_kelas) return { success: false, message: 'Nama kelas wajib diisi.' };
  if (findRow('Kelas', 'nama_kelas', data.nama_kelas)) return { success: false, message: 'Kelas sudah ada.' };
  appendRow('Kelas', { id: generateId('kls'), nama_kelas: data.nama_kelas, wali_kelas: data.wali_kelas || '', tahun_ajaran: data.tahun_ajaran || '', jumlah_siswa: 0, created_at: new Date() });
  (data.siswa_ids || []).forEach(function(sid) { var u = findRow('Users', 'id', sid); if (u) updateRow('Users', u._row, { kelas: data.nama_kelas }); });
  logAction(me.id, 'tambah_kelas', data.nama_kelas);
  return { success: true };
}

function updateKelas(token, kelasId, data) {
  var me = requireAuth(token, ['admin']);
  var k = findRow('Kelas', 'id', kelasId);
  if (!k) return { success: false, message: 'Kelas tidak ditemukan.' };
  var oldNama = String(k.nama_kelas);
  var newNama = data.nama_kelas || oldNama;
  if (newNama !== oldNama && findRow('Kelas', 'nama_kelas', newNama)) return { success: false, message: 'Nama kelas sudah dipakai.' };
  updateRow('Kelas', k._row, {
    nama_kelas: newNama,
    wali_kelas: (data.wali_kelas != null ? data.wali_kelas : k.wali_kelas),
    tahun_ajaran: (data.tahun_ajaran != null ? data.tahun_ajaran : k.tahun_ajaran)
  });
  // Cascade rename ke referensi berbasis nama kelas
  if (newNama !== oldNama) {
    [['Users', 'kelas'], ['Materi', 'kelas'], ['PaketSoal', 'kelas'], ['PR', 'kelas']].forEach(function(t) {
      getRows(t[0]).forEach(function(r) {
        if (String(r[t[1]]) === oldNama) { var patch = {}; patch[t[1]] = newNama; updateRow(t[0], r._row, patch); }
      });
    });
  }
  // Set keanggotaan siswa bila dikirim
  if (data.siswa_ids) {
    var sel = {}; data.siswa_ids.forEach(function(id) { sel[String(id)] = true; });
    getRows('Users').filter(function(u) { return u.role === 'siswa'; }).forEach(function(u) {
      var inClass = String(u.kelas) === newNama;
      if (sel[String(u.id)] && !inClass) updateRow('Users', u._row, { kelas: newNama });
      else if (!sel[String(u.id)] && inClass) updateRow('Users', u._row, { kelas: '' });
    });
  }
  logAction(me.id, 'update_kelas', newNama);
  return { success: true };
}

function hapusKelas(token, kelasId) {
  var me = requireAuth(token, ['admin']);
  var k = findRow('Kelas', 'id', kelasId);
  if (!k) return { success: false, message: 'Kelas tidak ditemukan.' };
  getRows('Users').forEach(function(u) { if (String(u.kelas) === String(k.nama_kelas)) updateRow('Users', u._row, { kelas: '' }); });
  getSheet('Kelas').deleteRow(k._row);
  logAction(me.id, 'hapus_kelas', k.nama_kelas);
  return { success: true };
}

/* ============================================================
 *  Dashboard per Mata Pelajaran (untuk grafik & drilldown)
 * ============================================================ */

/** Ringkasan tiap mapel: jumlah pengerjaan, rata-rata skor, siswa unik. Urut skor terendah dulu (perlu evaluasi). */
function getDashboardMapel(token) {
  requireAuth(token, ['guru', 'admin']);
  var map = {};
  getRows('UjianLog').forEach(function(u) {
    var m = u.mapel || '(Tanpa mapel)';
    if (!map[m]) map[m] = { mapel: m, total: 0, count: 0, siswa: {} };
    map[m].total += Number(u.skor); map[m].count++; map[m].siswa[String(u.siswa_id)] = true;
  });
  return Object.keys(map).map(function(m) {
    var o = map[m];
    return { mapel: String(m), jumlah: o.count, rata: o.count ? Math.round(o.total / o.count) : 0, siswa: Object.keys(o.siswa).length };
  }).sort(function(a, b) { return a.rata - b.rata; });
}

/** Analisa mendalam satu mapel: distribusi, per paket, siswa terlemah, materi. */
function getMapelDetail(token, mapel) {
  requireAuth(token, ['guru', 'admin']);
  var ujian = getRows('UjianLog').filter(function(u) { return String(u.mapel || '(Tanpa mapel)') === String(mapel); });
  var count = ujian.length;
  var avg = count ? Math.round(ujian.reduce(function(a, u) { return a + Number(u.skor); }, 0) / count) : 0;

  var siswaSet = {}; ujian.forEach(function(u) { siswaSet[String(u.siswa_id)] = true; });
  var dist = [0, 0, 0, 0, 0, 0];
  ujian.forEach(function(u) {
    var s = Number(u.skor);
    if (s < 50) dist[0]++; else if (s < 60) dist[1]++; else if (s < 70) dist[2]++;
    else if (s < 80) dist[3]++; else if (s < 90) dist[4]++; else dist[5]++;
  });

  var paketMap = {};
  ujian.forEach(function(u) { var k = u.paket_nama || '-'; if (!paketMap[k]) paketMap[k] = { nama: k, total: 0, count: 0 }; paketMap[k].total += Number(u.skor); paketMap[k].count++; });
  var perPaket = Object.keys(paketMap).map(function(k) { var o = paketMap[k]; return { nama: String(k), rata: o.count ? Math.round(o.total / o.count) : 0, jumlah: o.count }; }).sort(function(a, b) { return a.rata - b.rata; });

  var perSiswa = {};
  ujian.forEach(function(u) { var k = String(u.siswa_id); if (!perSiswa[k]) perSiswa[k] = { nama: u.siswa_nama, total: 0, count: 0 }; perSiswa[k].total += Number(u.skor); perSiswa[k].count++; });
  var terlemah = Object.keys(perSiswa).map(function(k) { var o = perSiswa[k]; return { nama: String(o.nama), rata: Math.round(o.total / o.count), jumlah: o.count }; }).sort(function(a, b) { return a.rata - b.rata; }).slice(0, 5);

  var totalMateri = getRows('Materi').filter(function(mm) { return String(mm.mapel || '') === String(mapel); }).length;
  return { success: true, mapel: String(mapel), jumlah: count, rata: avg, siswa: Object.keys(siswaSet).length, distribusi: dist, per_paket: perPaket, terlemah: terlemah, total_materi: totalMateri };
}

/* ============================================================
 *  Manajemen Siswa oleh GURU (terbatas: hanya akun siswa)
 * ============================================================ */

function guruTambahSiswa(token, data) {
  requireAuth(token, ['guru', 'admin']);
  if (!data || !data.nama || !data.email || !data.password) return { success: false, message: 'Nama, email, dan password wajib diisi.' };
  if (findRow('Users', 'email', String(data.email).toLowerCase())) return { success: false, message: 'Email sudah terdaftar.' };
  createUserAccount(data.nama, data.email, data.password, 'siswa', data.kelas || '');
  return { success: true };
}

function guruUpdateSiswa(token, userId, data) {
  requireAuth(token, ['guru', 'admin']);
  var u = findRow('Users', 'id', userId);
  if (!u) return { success: false, message: 'Siswa tidak ditemukan.' };
  if (u.role !== 'siswa') return { success: false, message: 'Hanya akun siswa yang bisa dikelola di sini.' };
  var patch = {};
  if (data.nama) patch.nama = data.nama;
  if (data.email) {
    var other = findRow('Users', 'email', String(data.email).toLowerCase());
    if (other && String(other.id) !== String(userId)) return { success: false, message: 'Email sudah dipakai pengguna lain.' };
    patch.email = String(data.email).toLowerCase();
  }
  if (data.kelas != null) patch.kelas = data.kelas;
  if (data.status) patch.status = data.status;
  ['nama_lengkap','nama_panggilan','jenis_kelamin','tempat_lahir','tanggal_lahir','alamat','no_hp','nama_wali','no_hp_wali','nis'].forEach(function(k){ if (data[k] != null) patch[k] = data[k]; });
  if (data.password) { var salt = generateSalt(); patch.salt = salt; patch.password_hash = hashPassword(data.password, salt); }
  updateRow('Users', u._row, patch);
  return { success: true };
}

/** Biodata lengkap seorang user (untuk profil sendiri, atau guru mengisi biodata siswa). */
function _biodataUser(u) {
  return {
    id: String(u.id), role: String(u.role), email: String(u.email || ''), kelas: String(u.kelas || ''),
    nama: String(u.nama || ''), nama_lengkap: String(u.nama_lengkap || ''), nama_panggilan: String(u.nama_panggilan || ''),
    jenis_kelamin: String(u.jenis_kelamin || ''), tempat_lahir: String(u.tempat_lahir || ''), tanggal_lahir: String(u.tanggal_lahir || ''),
    alamat: String(u.alamat || ''), no_hp: String(u.no_hp || ''), nama_wali: String(u.nama_wali || ''), no_hp_wali: String(u.no_hp_wali || ''), nis: String(u.nis || '')
  };
}
var _BIO_FIELDS = ['nama','nama_lengkap','nama_panggilan','jenis_kelamin','tempat_lahir','tanggal_lahir','alamat','no_hp','nama_wali','no_hp_wali','nis'];

/** Profil sendiri. */
function getProfil(token) {
  var me = requireAuth(token);
  var u = findRow('Users', 'id', me.id);
  if (!u) return { success: false, message: 'Akun tidak ditemukan.' };
  var o = _biodataUser(u); o.success = true; return o;
}
/** Perbarui biodata sendiri. */
function updateProfil(token, data) {
  var me = requireAuth(token);
  var u = findRow('Users', 'id', me.id);
  if (!u) return { success: false, message: 'Akun tidak ditemukan.' };
  var patch = {};
  _BIO_FIELDS.forEach(function(k) { if (data[k] != null) patch[k] = data[k]; });
  updateRow('Users', u._row, patch);
  return { success: true };
}
/** Biodata seorang siswa (guru/admin) untuk prefill form edit. */
function getSiswaBiodata(token, siswaId) {
  requireAuth(token, ['guru', 'admin']);
  var u = findRow('Users', 'id', siswaId);
  if (!u) return { success: false, message: 'Siswa tidak ditemukan.' };
  var o = _biodataUser(u); o.success = true; return o;
}

function guruHapusSiswa(token, userId) {
  requireAuth(token, ['guru', 'admin']);
  var u = findRow('Users', 'id', userId);
  if (!u) return { success: false, message: 'Siswa tidak ditemukan.' };
  if (u.role !== 'siswa') return { success: false, message: 'Hanya akun siswa yang bisa dihapus di sini.' };
  getSheet('Users').deleteRow(u._row);
  return { success: true };
}

/* ============================================================
 *  Analitik Mendalam per Siswa (untuk guru/admin)
 * ============================================================ */

function getSiswaDetail(token, siswaId) {
  requireAuth(token, ['guru', 'admin']);
  var u = findRow('Users', 'id', siswaId);
  if (!u || u.role !== 'siswa') return { success: false, message: 'Siswa tidak ditemukan.' };

  var ujian = getRows('UjianLog').filter(function(x) { return String(x.siswa_id) === String(siswaId); })
    .sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
  var jumlah = ujian.length;
  var avg = jumlah ? Math.round(ujian.reduce(function(a, x) { return a + Number(x.skor); }, 0) / jumlah) : 0;
  var lastActivity = jumlah ? formatDateTime(ujian[jumlah - 1].timestamp) : '';
  var materiDibaca = getRows('MateriRead').filter(function(r) { return String(r.siswa_id) === String(siswaId); }).length;

  function tier(rata) { return rata >= 75 ? 'mahir' : rata >= 60 ? 'berkembang' : 'bantuan'; }

  // Per mapel
  var mapelMap = {};
  ujian.forEach(function(x) {
    var m = x.mapel || '(Tanpa mapel)';
    if (!mapelMap[m]) mapelMap[m] = { mapel: m, total: 0, count: 0 };
    mapelMap[m].total += Number(x.skor); mapelMap[m].count++;
  });
  var perMapel = Object.keys(mapelMap).map(function(m) {
    var o = mapelMap[m]; var r = Math.round(o.total / o.count);
    return { mapel: String(m), rata: r, jumlah: o.count, tier: tier(r) };
  }).sort(function(a, b) { return a.rata - b.rata; });

  // Per paket
  var paketMap = {};
  ujian.forEach(function(x) {
    var k = String(x.paket_id);
    if (!paketMap[k]) paketMap[k] = { paket_id: k, paket_nama: x.paket_nama || '-', mapel: x.mapel || '', total: 0, count: 0 };
    paketMap[k].total += Number(x.skor); paketMap[k].count++;
  });
  var perPaket = Object.keys(paketMap).map(function(k) {
    var o = paketMap[k]; return { paket_id: o.paket_id, paket_nama: String(o.paket_nama), mapel: String(o.mapel), rata: Math.round(o.total / o.count), jumlah: o.count };
  }).sort(function(a, b) { return a.rata - b.rata; });

  // Tren (maks 10 terakhir)
  var trend = ujian.slice(-10).map(function(x) { return { label: String(x.paket_nama || x.mapel || '-'), skor: Number(x.skor) }; });

  // Soal yang sering dijawab salah (agregasi dari detail UjianLog + PRSubmission)
  var qStat = {};
  function serapDetail(detailStr) {
    if (!detailStr) return;
    try {
      JSON.parse(detailStr).forEach(function(it) {
        var q = String(it.q || ('Soal ' + it.n));
        if (!qStat[q]) qStat[q] = { q: q, salah: 0, total: 0 };
        qStat[q].total++; if (!it.b) qStat[q].salah++;
      });
    } catch (e) {}
  }
  ujian.forEach(function(x) { serapDetail(x.detail); });

  // Status PR
  var prSubs = getRows('PRSubmission').filter(function(s) { return String(s.siswa_id) === String(siswaId); });
  var prByPr = {};
  prSubs.forEach(function(s) {
    var k = String(s.pr_id);
    if (!prByPr[k] || new Date(s.submitted_at) > new Date(prByPr[k].submitted_at)) prByPr[k] = s;
  });
  var prList = Object.keys(prByPr).map(function(k) { return prByPr[k]; });
  var prRata = prList.length ? Math.round(prList.reduce(function(a, s) { return a + Number(s.skor); }, 0) / prList.length) : 0;
  prSubs.forEach(function(s) { serapDetail(s.detail); });
  var seringSalah = Object.keys(qStat).map(function(q) {
    var o = qStat[q]; return { q: o.q, salah: o.salah, total: o.total, pct_benar: Math.round((o.total - o.salah) / o.total * 100) };
  }).filter(function(o) { return o.salah > 0; }).sort(function(a, b) { return b.salah - a.salah || a.pct_benar - b.pct_benar; }).slice(0, 6);

  // Rekomendasi
  var perluBantuanMapel = perMapel.filter(function(m) { return m.tier === 'bantuan'; }).map(function(m) { return m.mapel; });
  var saranPaket = null;
  var kandidat = perPaket.filter(function(pk) { return pk.rata < 75; });
  if (kandidat.length) { var s = kandidat[0]; saranPaket = { paket_id: s.paket_id, paket_nama: s.paket_nama, rata: s.rata }; }

  return {
    success: true, id: String(u.id), nama: String(u.nama), email: String(u.email || ''),
    kelas: String(u.kelas || ''), level: calcLevel(u.xp), xp: Number(u.xp) || 0,
    rata_skor: avg, jumlah_pengerjaan: jumlah, materi_dibaca: materiDibaca, last_activity: lastActivity,
    per_mapel: perMapel, per_paket: perPaket, trend: trend, sering_salah: seringSalah,
    pr_selesai: prList.length, pr_rata: prRata,
    rekomendasi: { perlu_bantuan_mapel: perluBantuanMapel, saran_paket: saranPaket }
  };
}

/** Tambah kelas cepat (guru/admin) — hanya nama. Tersinkron ke semua menu via sheet Kelas. */
function tambahKelasCepat(token, nama) {
  requireAuth(token, ['guru', 'admin']);
  nama = String(nama || '').trim();
  if (!nama) return { success: false, message: 'Nama kelas wajib diisi.' };
  if (findRow('Kelas', 'nama_kelas', nama)) return { success: false, message: 'Kelas "' + nama + '" sudah ada.' };
  appendRow('Kelas', { id: generateId('kls'), nama_kelas: nama, wali_kelas: '', tahun_ajaran: '', jumlah_siswa: 0, created_at: new Date() });
  return { success: true, nama_kelas: nama };
}