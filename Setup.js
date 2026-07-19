/**
 * ============================================================
 *  File: Setup.gs  (FASE 3)
 *  Jalankan setupDatabase() sekali. Aman dijalankan ulang:
 *  sheet yang sudah ada tidak dihapus.
 * ============================================================
 */

var DB_SCHEMA = {
  'Users':      ['id', 'nama', 'email', 'password_hash', 'salt', 'role', 'kelas', 'level', 'xp', 'status', 'login_method', 'created_at', 'nama_lengkap', 'nama_panggilan', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'alamat', 'no_hp', 'nama_wali', 'no_hp_wali', 'nis'],
  'Kelas':      ['id', 'nama_kelas', 'wali_kelas', 'tahun_ajaran', 'jumlah_siswa', 'created_at'],
  'Logs':       ['timestamp', 'user_id', 'action', 'detail'],
  // Fase 2
  'Materi':     ['id', 'judul', 'mapel', 'kelas', 'deskripsi', 'file_id', 'file_url', 'file_type', 'uploaded_by', 'created_at', 'semester'],
  'MateriRead': ['id', 'siswa_id', 'materi_id', 'read_at'],
  'PaketSoal':  ['id', 'nama', 'mapel', 'kelas', 'deskripsi', 'jumlah_soal', 'status', 'created_by', 'created_at', 'semester', 'acak', 'waktu_menit'],
  'Soal':       ['id', 'paket_id', 'nomor', 'pertanyaan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'kunci', 'skor'],
  'UjianLog':   ['id', 'siswa_id', 'siswa_nama', 'kelas', 'paket_id', 'paket_nama', 'mapel', 'skor', 'total_benar', 'total_soal', 'xp_earned', 'timestamp'],
  'UserBadge':  ['id', 'siswa_id', 'badge_code', 'earned_at'],
  // Fase 3
  'Pengumuman': ['id', 'judul', 'isi', 'target', 'dibuat_oleh', 'created_at'],
  'Pesan':      ['id', 'from_id', 'from_nama', 'to_id', 'to_nama', 'isi', 'dibaca', 'created_at'],
  'ChatGrup':   ['id', 'kelas', 'from_id', 'from_nama', 'isi', 'created_at'],
  'Pengaturan': ['key', 'value', 'updated_at'],
  // PR / Tugas
  'PR':           ['id', 'judul', 'mapel', 'kelas', 'paket_id', 'instruksi', 'deadline', 'kkm', 'allow_retry', 'status', 'created_by', 'created_at', 'target_siswa', 'created_by_id'],
  'PRSubmission': ['id', 'pr_id', 'siswa_id', 'siswa_nama', 'kelas', 'skor', 'total_benar', 'total_soal', 'terlambat', 'attempt', 'detail', 'submitted_at'],
  'Notifikasi':   ['id', 'user_id', 'tipe', 'judul', 'pesan', 'dibaca', 'created_at', 'ref']
};

function setupDatabase() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  var ss;
  if (ssId) { ss = SpreadsheetApp.openById(ssId); Logger.log('Pakai database: ' + ss.getUrl()); }
  else { ss = SpreadsheetApp.create('Smartlearn Database'); props.setProperty('SPREADSHEET_ID', ss.getId()); Logger.log('Database baru: ' + ss.getUrl()); }

  for (var sheetName in DB_SCHEMA) {
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    var headers = DB_SCHEMA[sheetName];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#7C3AED').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  var def = ss.getSheetByName('Sheet1');
  if (def && Object.keys(DB_SCHEMA).indexOf('Sheet1') === -1) ss.deleteSheet(def);
  var soalSheet = ss.getSheetByName('Soal');
  if (soalSheet) soalSheet.getRange('A:J').setNumberFormat('@');

  if (getRows('Users').length === 0) { seedInitialData(); Logger.log('Akun demo dibuat.'); }
  if (getRows('PaketSoal').length === 0) { seedAcademicData(); Logger.log('Soal demo dibuat.'); }
  if (getRows('Pengumuman').length === 0) { seedSocialData(); Logger.log('Data sosial demo dibuat.'); }

  Logger.log('SETUP SELESAI. Database: ' + ss.getUrl());
  return ss.getUrl();
}

function seedInitialData() {
  var now = new Date();
  appendRow('Kelas', { id: generateId('kls'), nama_kelas: '10A', wali_kelas: 'Bu Sari', tahun_ajaran: '2025/2026', jumlah_siswa: 0, created_at: now });
  appendRow('Kelas', { id: generateId('kls'), nama_kelas: '10B', wali_kelas: 'Pak Budi', tahun_ajaran: '2025/2026', jumlah_siswa: 0, created_at: now });
  createUserAccount('Administrator', 'admin@smartlearn.id', 'admin123', 'admin', '');
  createUserAccount('Bu Sari', 'guru@smartlearn.id', 'guru123', 'guru', '');
  createUserAccount('Andi Pratama', 'andi@smartlearn.id', 'siswa123', 'siswa', '10A');
  createUserAccount('Budi Santoso', 'budi@smartlearn.id', 'siswa123', 'siswa', '10A');
}

function seedAcademicData() {
  createPaketSoalInternal('Latihan Aljabar Dasar', 'Matematika', '10A',
    'Latihan persamaan kuadrat dan aljabar dasar.', [
      { pertanyaan: 'Tentukan nilai x dari x² − 5x + 6 = 0', a: 'x = 2 dan x = 3', b: 'x = −2 dan x = −3', c: 'x = 1 dan x = 6', d: 'x = 2 dan x = −3', kunci: 'A', skor: 10 },
      { pertanyaan: 'Hasil dari 3x + 2x adalah...', a: '5x', b: '6x', c: '5x²', d: 'x', kunci: 'A', skor: 10 },
      { pertanyaan: 'Faktor dari x² − 9 adalah...', a: '(x−3)(x+3)', b: '(x−9)(x+1)', c: '(x−3)²', d: '(x+9)(x−1)', kunci: 'A', skor: 10 },
      { pertanyaan: 'Jika 2x = 10, maka x = ...', a: '3', b: '5', c: '8', d: '20', kunci: 'B', skor: 10 },
      { pertanyaan: 'Bentuk sederhana dari 4(x + 2) adalah...', a: '4x + 2', b: '4x + 8', c: 'x + 8', d: '4x + 6', kunci: 'B', skor: 10 }
    ], 'aktif', 'Sistem');
}

function seedSocialData() {
  appendRow('Pengumuman', { id: generateId('peng'), judul: 'Selamat datang di Smartlearn!', isi: 'Mulai belajar dengan membuka menu Materi, lalu uji pemahamanmu di menu Latihan. Selamat belajar!', target: 'semua', dibuat_oleh: 'Bu Sari', created_at: new Date() });
  setSettingInternal('chat_10A', 'on');   // chat grup 10A aktif sebagai contoh
  setSettingInternal('chat_10B', 'off');
}

function createUserAccount(nama, email, password, role, kelas) {
  if (findRow('Users', 'email', email.toLowerCase())) return false;
  var salt = generateSalt();
  appendRow('Users', {
    id: generateId('usr'), nama: nama, email: email.toLowerCase(),
    password_hash: hashPassword(password, salt), salt: salt,
    role: role, kelas: kelas || '', level: 1, xp: 0, status: 'aktif',
    login_method: 'manual', created_at: new Date()
  });
  return true;
}

function showDatabaseInfo() {
  var ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!ssId) { Logger.log('Belum ada database. Jalankan setupDatabase().'); return; }
  Logger.log('URL Database: ' + SpreadsheetApp.openById(ssId).getUrl());
}

/**
 * Perbaikan data Users: mengisi field yang kosong pada baris user
 * (id, level, xp, status, login_method, created_at).
 * Jalankan SEKALI dari editor bila ada akun yang tidak bisa login
 * karena barisnya tidak lengkap (mis. kolom id kosong).
 * Aman dijalankan berulang kali.
 */
function perbaikiDataUser() {
  var sheet = getSheet('Users');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  function setCell(rowNum, col, val) {
    var idx = headers.indexOf(col);
    if (idx !== -1) sheet.getRange(rowNum, idx + 1).setValue(val);
  }
  var diperbaiki = 0;
  getRows('Users').forEach(function(u) {
    var fixed = false;
    if (!u.id || String(u.id).trim() === '') { setCell(u._row, 'id', generateId('usr')); fixed = true; }
    if (u.level === '' || u.level == null) { setCell(u._row, 'level', 1); fixed = true; }
    if (u.xp === '' || u.xp == null) { setCell(u._row, 'xp', 0); fixed = true; }
    if (!u.status || String(u.status).trim() === '') { setCell(u._row, 'status', 'aktif'); fixed = true; }
    if (!u.login_method || String(u.login_method).trim() === '') { setCell(u._row, 'login_method', 'manual'); fixed = true; }
    if (!u.created_at || String(u.created_at).toString().trim() === '') { setCell(u._row, 'created_at', new Date()); fixed = true; }
    if (fixed) diperbaiki++;
  });
  Logger.log('Selesai. Baris user diperbaiki: ' + diperbaiki);
  return diperbaiki;
}