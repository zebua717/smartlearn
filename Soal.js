/**
 * ============================================================
 *  File: Soal.gs — Bank soal & paket latihan/ujian
 * ============================================================
 */

/**
 * Helper internal membuat paket soal (dipakai juga oleh seed).
 * soalArr: array of { pertanyaan, a, b, c, d, kunci, skor }
 */
/** Tanda unik sebuah soal (untuk deteksi duplikat persis). */
function _soalSig(pertanyaan, a, b, c, d, kunci) {
  return [String(pertanyaan || '').trim(), String(a || ''), String(b || ''), String(c || ''), String(d || ''), String(kunci || '').toUpperCase()].join('||');
}
/** Buang soal duplikat persis dari array input (mempertahankan yang pertama). */
function _dedupeSoalArr(arr) {
  var seen = {}, out = [];
  (arr || []).forEach(function(s) {
    var sig = _soalSig(s.pertanyaan, s.a, s.b, s.c, s.d, s.kunci);
    if (!seen[sig]) { seen[sig] = true; out.push(s); }
  });
  return out;
}

function createPaketSoalInternal(nama, mapel, kelas, deskripsi, soalArr, status, createdBy, semester, acak, waktuMenit) {
  soalArr = _dedupeSoalArr(soalArr);
  var paketId = generateId('pkt');
  appendRow('PaketSoal', {
    id: paketId, nama: nama, mapel: mapel || '', kelas: kelas || '',
    deskripsi: deskripsi || '', jumlah_soal: soalArr.length,
    status: status || 'aktif', created_by: createdBy || 'Sistem', created_at: new Date(),
    semester: semester || '', acak: acak ? 'true' : 'false', waktu_menit: Number(waktuMenit) || 0
  });
  soalArr.forEach(function(s, i) {
    appendRow('Soal', {
      id: generateId('sl'), paket_id: paketId, nomor: i + 1,
      pertanyaan: s.pertanyaan, opsi_a: s.a, opsi_b: s.b, opsi_c: s.c, opsi_d: s.d,
      kunci: String(s.kunci).toUpperCase(), skor: s.skor || 10
    });
  });
  return paketId;
}

/** Membuat paket soal baru (guru/admin). */
function createPaketSoal(token, data) {
  var user = requireAuth(token, ['guru', 'admin']);
  if (!data || !data.nama || !data.soal || !data.soal.length) {
    return { success: false, message: 'Paket soal harus punya nama dan minimal 1 soal.' };
  }
  var id = createPaketSoalInternal(data.nama, data.mapel, data.kelas, data.deskripsi,
                                   data.soal, data.status || 'aktif', user.nama, data.semester,
                                   data.acak, data.waktu_menit);
  logAction(user.id, 'create_paket', data.nama);
  if (data.notifikasi && (data.status || 'aktif') === 'aktif') {
    _notifSiswaKelas(data.kelas, 'soal', 'Latihan baru: ' + data.nama, 'Mapel ' + (data.mapel || '-'),
      JSON.stringify({ mapel: data.mapel || '', id: id, nama: data.nama || '' }));
  }
  return { success: true, id: id };
}

/** Daftar paket soal. Siswa hanya melihat paket aktif untuk kelasnya. */
function listPaket(token) {
  var user = requireAuth(token);
  return getRows('PaketSoal')
    .filter(function(p) {
      if (user.role === 'siswa') {
        return p.status === 'aktif' && (!p.kelas || String(p.kelas) === String(user.kelas));
      }
      return true;
    })
    .map(function(p) {
      return {
        id: p.id, nama: p.nama, mapel: p.mapel, kelas: p.kelas, deskripsi: p.deskripsi,
        jumlah_soal: p.jumlah_soal, status: p.status, created_by: p.created_by,
        semester: p.semester || '', acak: String(p.acak) === 'true', waktu_menit: Number(p.waktu_menit) || 0,
        created_at: formatDate(p.created_at)
      };
    })
    .reverse();
}

/** Mengambil soal dalam satu paket. Kunci jawaban hanya disertakan untuk guru/admin. */
function getSoalByPaket(token, paketId) {
  var user = requireAuth(token);
  var includeKunci = (user.role !== 'siswa');
  function ambil() {
    var r = getRows('Soal').filter(function(s) { return String(s.paket_id) === String(paketId); });
    r.sort(function(a, b) { return (Number(a.nomor) || 0) - (Number(b.nomor) || 0) || a._row - b._row; });
    return r;
  }
  var rows = ambil();

  // Deteksi duplikat persis
  var seen = {}, dupRows = [];
  rows.forEach(function(s) {
    var sig = _soalSig(s.pertanyaan, s.opsi_a, s.opsi_b, s.opsi_c, s.opsi_d, s.kunci);
    if (seen[sig]) dupRows.push(s._row); else seen[sig] = true;
  });

  if (dupRows.length && includeKunci) {
    // Guru/admin membuka paket -> bersihkan permanen & nomori ulang
    var sheet = getSheet('Soal');
    dupRows.sort(function(a, b) { return b - a; }).forEach(function(rw) { sheet.deleteRow(rw); });
    rows = ambil();
    rows.forEach(function(s, i) { if (Number(s.nomor) !== i + 1) updateRow('Soal', s._row, { nomor: i + 1 }); });
    var pk = findRow('PaketSoal', 'id', paketId);
    if (pk && Number(pk.jumlah_soal) !== rows.length) updateRow('PaketSoal', pk._row, { jumlah_soal: rows.length });
  } else if (dupRows.length) {
    // Siswa -> saring duplikat di tampilan saja (tanpa menulis)
    var seen2 = {}, uniq = [];
    rows.forEach(function(s) {
      var sig = _soalSig(s.pertanyaan, s.opsi_a, s.opsi_b, s.opsi_c, s.opsi_d, s.kunci);
      if (!seen2[sig]) { seen2[sig] = true; uniq.push(s); }
    });
    rows = uniq;
  }

  return rows.map(function(s) {
    var o = {
      id: String(s.id),
      nomor: Number(s.nomor) || 0,
      pertanyaan: String(s.pertanyaan),
      a: String(s.opsi_a), b: String(s.opsi_b), c: String(s.opsi_c), d: String(s.opsi_d),
      skor: Number(s.skor) || 10
    };
    if (includeKunci) o.kunci = String(s.kunci || '').toUpperCase();
    return o;
  });
}

/** Hapus paket soal beserta seluruh soalnya (guru/admin). */
function deletePaket(token, paketId) {
  var user = requireAuth(token, ['guru', 'admin']);
  var p = findRow('PaketSoal', 'id', paketId);
  if (!p) return { success: false, message: 'Paket tidak ditemukan.' };

  var sheet = getSheet('Soal');
  var rows = getRows('Soal');
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i].paket_id) === String(paketId)) sheet.deleteRow(rows[i]._row);
  }
  getSheet('PaketSoal').deleteRow(p._row);
  logAction(user.id, 'delete_paket', p.nama);
  return { success: true };
}

/** Memperbarui paket soal: mengganti seluruh soal + metadata (guru/admin). */
function updatePaket(token, paketId, data) {
  var me = requireAuth(token, ['guru', 'admin']);
  var p = findRow('PaketSoal', 'id', paketId);
  if (!p) return { success: false, message: 'Paket tidak ditemukan.' };
  if (!data || !data.soal || !data.soal.length) return { success: false, message: 'Minimal 1 soal.' };

  // Hapus soal lama
  var sheet = getSheet('Soal');
  var rows = getRows('Soal');
  for (var i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i].paket_id) === String(paketId)) sheet.deleteRow(rows[i]._row);
  }
  // Tulis soal baru (dedup dulu agar tidak ada ganda)
  var soalBersih = _dedupeSoalArr(data.soal);
  soalBersih.forEach(function(s, i) {
    appendRow('Soal', {
      id: generateId('sl'), paket_id: paketId, nomor: i + 1,
      pertanyaan: s.pertanyaan, opsi_a: s.a, opsi_b: s.b, opsi_c: s.c, opsi_d: s.d,
      kunci: String(s.kunci).toUpperCase(), skor: s.skor || 10
    });
  });
  updateRow('PaketSoal', p._row, {
    nama: data.nama || p.nama,
    mapel: (data.mapel != null ? data.mapel : p.mapel),
    kelas: (data.kelas != null ? data.kelas : p.kelas),
    semester: (data.semester != null ? data.semester : p.semester),
    status: (data.status != null && data.status !== '' ? data.status : p.status),
    acak: (data.acak != null ? (data.acak ? 'true' : 'false') : p.acak),
    waktu_menit: (data.waktu_menit != null ? Number(data.waktu_menit) || 0 : p.waktu_menit),
    jumlah_soal: soalBersih.length
  });
  logAction(me.id, 'update_paket', data.nama || p.nama);
  return { success: true };
}

/** Ubah status paket (aktif/draft). Saat dipublikasikan (aktif), kirim notifikasi ke siswa terkait. */
function setPaketStatus(token, paketId, status) {
  var me = requireAuth(token, ['guru', 'admin']);
  var p = findRow('PaketSoal', 'id', paketId);
  if (!p) return { success: false, message: 'Paket tidak ditemukan.' };
  status = (status === 'aktif') ? 'aktif' : 'draft';
  var wasAktif = String(p.status) === 'aktif';
  updateRow('PaketSoal', p._row, { status: status });
  logAction(me.id, 'set_status_paket', p.nama + ' -> ' + status);
  if (status === 'aktif' && !wasAktif) {
    _notifSiswaKelas(p.kelas, 'soal', 'Latihan baru: ' + p.nama, 'Mapel ' + (p.mapel || '-'),
      JSON.stringify({ mapel: p.mapel || '', id: String(p.id), nama: p.nama || '' }));
  }
  return { success: true, status: status };
}

/** Duplikat paket soal beserta seluruh soalnya. Salinan default berstatus draft. */
function duplikatPaket(token, paketId, data) {
  var me = requireAuth(token, ['guru', 'admin']);
  var p = findRow('PaketSoal', 'id', paketId);
  if (!p) return { success: false, message: 'Paket tidak ditemukan.' };
  var soal = getRows('Soal').filter(function(s) { return String(s.paket_id) === String(paketId); })
    .sort(function(a, b) { return (Number(a.nomor) || 0) - (Number(b.nomor) || 0); })
    .map(function(s) { return { pertanyaan: s.pertanyaan, a: s.opsi_a, b: s.opsi_b, c: s.opsi_c, d: s.opsi_d, kunci: s.kunci, skor: s.skor }; });
  if (!soal.length) return { success: false, message: 'Paket sumber belum punya soal.' };
  var nama = (data && data.nama) ? data.nama : (p.nama + ' (salinan)');
  var id = createPaketSoalInternal(
    nama,
    (data && data.mapel != null ? data.mapel : p.mapel),
    (data && data.kelas != null ? data.kelas : p.kelas),
    p.deskripsi, soal,
    (data && data.status) ? data.status : 'draft',
    me.nama,
    (data && data.semester != null ? data.semester : p.semester),
    String(p.acak) === 'true',
    Number(p.waktu_menit) || 0
  );
  logAction(me.id, 'duplikat_paket', nama);
  return { success: true, id: id };
}

/**
 * Bersihkan soal duplikat (persis sama) di tiap paket, nomori ulang, dan
 * sinkronkan jumlah_soal. Aman dijalankan berulang. (guru/admin)
 */
function bersihkanSoalGanda(token) {
  requireAuth(token, ['guru', 'admin']);
  var sheet = getSheet('Soal');
  var all = getRows('Soal');
  var byPaket = {};
  all.forEach(function(s) { var k = String(s.paket_id); if (!byPaket[k]) byPaket[k] = []; byPaket[k].push(s); });

  var hapusRows = [], totalDup = 0, paketTerpengaruh = 0;
  Object.keys(byPaket).forEach(function(pid) {
    var list = byPaket[pid].slice().sort(function(a, b) { return (Number(a.nomor) || 0) - (Number(b.nomor) || 0) || a._row - b._row; });
    var seen = {}, dupHere = 0;
    list.forEach(function(s) {
      var sig = [String(s.pertanyaan || '').trim(), String(s.opsi_a || ''), String(s.opsi_b || ''),
                 String(s.opsi_c || ''), String(s.opsi_d || ''), String(s.kunci || '').toUpperCase()].join('||');
      if (seen[sig]) { hapusRows.push(s._row); dupHere++; }
      else seen[sig] = true;
    });
    if (dupHere) { totalDup += dupHere; paketTerpengaruh++; }
  });

  // Hapus baris duplikat dari bawah ke atas agar nomor baris tidak bergeser
  hapusRows.sort(function(a, b) { return b - a; }).forEach(function(r) { sheet.deleteRow(r); });

  // Nomori ulang & sinkronkan jumlah_soal
  var fresh = getRows('Soal'), byP2 = {};
  fresh.forEach(function(s) { var k = String(s.paket_id); if (!byP2[k]) byP2[k] = []; byP2[k].push(s); });
  Object.keys(byP2).forEach(function(pid) {
    var list = byP2[pid].sort(function(a, b) { return (Number(a.nomor) || 0) - (Number(b.nomor) || 0) || a._row - b._row; });
    list.forEach(function(s, i) { if (Number(s.nomor) !== i + 1) updateRow('Soal', s._row, { nomor: i + 1 }); });
    var pk = findRow('PaketSoal', 'id', pid);
    if (pk && Number(pk.jumlah_soal) !== list.length) updateRow('PaketSoal', pk._row, { jumlah_soal: list.length });
  });

  return { success: true, dihapus: totalDup, paket: paketTerpengaruh };
}