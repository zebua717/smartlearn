/**
 * ============================================================
 *  File: Materi.gs — Manajemen materi pembelajaran (PDF/Dok)
 * ============================================================
 */

/** Mengambil/membuat folder Drive khusus materi. */
function getMateriFolder() {
  var props = PropertiesService.getScriptProperties();
  var fid = props.getProperty('MATERI_FOLDER_ID');
  if (fid) {
    try { return DriveApp.getFolderById(fid); } catch (e) {}
  }
  var folder = DriveApp.createFolder('Smartlearn - Materi');
  props.setProperty('MATERI_FOLDER_ID', folder.getId());
  return folder;
}

/** Set akses file agar bisa dipratinjau siapa saja. Mengembalikan level yang berhasil. */
function _bagikanFilePublik(file) {
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); return 'anyone_with_link'; } catch (e) {}
  try { file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW); return 'anyone'; } catch (e) {}
  try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); return 'domain_with_link'; } catch (e) {}
  return 'gagal';
}

/**
 * Perbaiki akses semua file materi lama agar bisa dipratinjau siswa.
 * Jalankan sekali (guru/admin) bila ada materi yang gagal preview ("Couldn't preview file").
 */
function perbaikiSharingMateri(token) {
  requireAuth(token, ['guru', 'admin']);
  var rows = getRows('Materi');
  var ok = 0, gagal = 0, hilang = 0, detailGagal = [];
  rows.forEach(function(m) {
    if (!m.file_id) return;
    try {
      var f = DriveApp.getFileById(m.file_id);
      var r = _bagikanFilePublik(f);
      if (r === 'gagal') { gagal++; detailGagal.push(String(m.judul || m.file_id)); }
      else ok++;
    } catch (e) { hilang++; detailGagal.push(String(m.judul || m.file_id) + ' (file tak ditemukan)'); }
  });
  return { success: true, ok: ok, gagal: gagal, hilang: hilang, detail: detailGagal };
}

/**
 * Upload materi (guru/admin). `data` berisi:
 *  { judul, mapel, kelas, deskripsi, fileName, mimeType, base64data }
 */
function uploadMateri(token, data) {
  var user = requireAuth(token, ['guru', 'admin']);
  if (!data || !data.judul || !data.base64data) {
    return { success: false, message: 'Judul dan file materi wajib diisi.' };
  }
  try {
    var folder = getMateriFolder();
    var bytes = Utilities.base64Decode(data.base64data);
    var blob = Utilities.newBlob(bytes, data.mimeType || 'application/octet-stream', data.fileName || data.judul);
    var file = folder.createFile(blob);
    // Agar bisa di-preview siswa lewat iframe Drive. Coba beberapa level akses.
    _bagikanFilePublik(file);

    var ftype = (data.mimeType && data.mimeType.indexOf('pdf') !== -1) ? 'PDF' : 'DOC';
    var kelasVal = Array.isArray(data.kelas) ? data.kelas.join(',') : (data.kelas || '');
    var id = generateId('mat');
    appendRow('Materi', {
      id: id, judul: data.judul, mapel: data.mapel || '', kelas: kelasVal,
      deskripsi: data.deskripsi || '', file_id: file.getId(),
      file_url: 'https://drive.google.com/file/d/' + file.getId() + '/preview',
      file_type: ftype, uploaded_by: user.nama, created_at: new Date(),
      semester: data.semester || ''
    });
    logAction(user.id, 'upload_materi', data.judul);
    _notifSiswaKelas(kelasVal, 'materi', 'Materi baru: ' + data.judul, 'Mapel ' + (data.mapel || '-'),
      JSON.stringify({ mapel: data.mapel || '', q: data.judul || '' }));
    return { success: true, id: id };
  } catch (err) {
    return { success: false, message: 'Gagal upload: ' + err.message };
  }
}

/** Daftar kelas yang boleh mengakses materi (CSV di kolom kelas; kosong = semua). */
function _materiKelasList(m) {
  if (!m.kelas || String(m.kelas).trim() === '') return [];
  return String(m.kelas).split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
}
function _materiBerlaku(m, kelas) {
  var list = _materiKelasList(m);
  return list.length === 0 || list.indexOf(String(kelas)) !== -1;
}

/** Daftar materi. Siswa hanya melihat materi kelasnya (atau yang berlaku semua kelas). */
function listMateri(token) {
  var user = requireAuth(token);
  var reads = {};
  var readByMateri = {}; // materi_id -> { siswa_id: true }
  getRows('MateriRead').forEach(function(r) {
    if (user.role === 'siswa' && String(r.siswa_id) === String(user.id)) reads[r.materi_id] = true;
    if (!readByMateri[r.materi_id]) readByMateri[r.materi_id] = {};
    readByMateri[r.materi_id][String(r.siswa_id)] = true;
  });
  var siswaAll = (user.role !== 'siswa') ? getRows('Users').filter(function(u) { return u.role === 'siswa'; }) : [];
  return getRows('Materi')
    .filter(function(m) {
      if (user.role === 'siswa') return _materiBerlaku(m, user.kelas);
      return true;
    })
    .map(function(m) {
      var o = {
        id: m.id, judul: m.judul, mapel: m.mapel, kelas: m.kelas, deskripsi: m.deskripsi,
        file_url: m.file_url, file_id: m.file_id, file_type: m.file_type, semester: m.semester || '',
        uploaded_by: m.uploaded_by, created_at: formatDate(m.created_at),
        sudah_dibaca: !!reads[m.id]
      };
      if (user.role !== 'siswa') {
        var total = siswaAll.filter(function(u) { return _materiBerlaku(m, u.kelas); }).length;
        o.dibaca_count = readByMateri[m.id] ? Object.keys(readByMateri[m.id]).length : 0;
        o.total_siswa = total;
      }
      return o;
    })
    .reverse();
}

/** Edit metadata materi (guru/admin): judul, mapel, deskripsi, dan kelas (boleh banyak). */
function updateMateri(token, materiId, data) {
  var user = requireAuth(token, ['guru', 'admin']);
  var m = findRow('Materi', 'id', materiId);
  if (!m) return { success: false, message: 'Materi tidak ditemukan.' };
  var patch = {};
  if (data.judul) patch.judul = data.judul;
  if (data.mapel != null) patch.mapel = data.mapel;
  if (data.deskripsi != null) patch.deskripsi = data.deskripsi;
  if (data.semester != null) patch.semester = data.semester;
  if (data.kelas != null) {
    patch.kelas = Array.isArray(data.kelas) ? data.kelas.join(',') : String(data.kelas);
  }
  updateRow('Materi', m._row, patch);
  logAction(user.id, 'update_materi', patch.judul || m.judul);
  return { success: true };
}

/** Menandai materi sudah dibaca (siswa). */
function markMateriRead(token, materiId) {
  var user = requireAuth(token, ['siswa']);
  var already = getRows('MateriRead').some(function(r) {
    return String(r.siswa_id) === String(user.id) && String(r.materi_id) === String(materiId);
  });
  if (!already) {
    appendRow('MateriRead', { id: generateId('rd'), siswa_id: user.id, materi_id: materiId, read_at: new Date() });
    checkAndAwardBadges(user.id);
  }
  return { success: true };
}

/** Hapus materi (guru/admin) — file Drive ikut dipindah ke sampah. */
function deleteMateri(token, materiId) {
  var user = requireAuth(token, ['guru', 'admin']);
  var m = findRow('Materi', 'id', materiId);
  if (!m) return { success: false, message: 'Materi tidak ditemukan.' };
  try { DriveApp.getFileById(m.file_id).setTrashed(true); } catch (e) {}
  getSheet('Materi').deleteRow(m._row);
  logAction(user.id, 'delete_materi', m.judul);
  return { success: true };
}

/** Daftar mata pelajaran unik (dari Materi + PaketSoal) untuk referensi pilihan. */
function listMapel(token) {
  requireAuth(token);
  var set = {};
  getRows('Materi').forEach(function(m) { var v = String(m.mapel || '').trim(); if (v) set[v] = true; });
  getRows('PaketSoal').forEach(function(p) { var v = String(p.mapel || '').trim(); if (v) set[v] = true; });
  return Object.keys(set).sort(function(a, b) { return a.localeCompare(b); });
}