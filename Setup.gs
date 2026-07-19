/**
 * ============================================================
 *  File: Setup.gs
 *  Jalankan setupDatabase() SATU KALI dari editor Apps Script
 *  untuk membuat spreadsheet database beserta seluruh sheet
 *  dan data awal (akun demo).
 * ============================================================
 */

/**
 * Definisi struktur seluruh tabel (sheet) beserta header kolomnya.
 * Menambah fitur baru di fase berikutnya = tinggal tambah entri di sini.
 */
var DB_SCHEMA = {
  'Users': [
    'id', 'nama', 'email', 'password_hash', 'salt',
    'role', 'kelas', 'level', 'xp', 'status', 'login_method', 'created_at'
  ],
  'Kelas': [
    'id', 'nama_kelas', 'wali_kelas', 'tahun_ajaran', 'jumlah_siswa', 'created_at'
  ],
  'Logs': [
    'timestamp', 'user_id', 'action', 'detail'
  ]
};

/**
 * FUNGSI UTAMA SETUP — jalankan sekali dari editor.
 * Membuat spreadsheet baru (jika belum ada), seluruh sheet, lalu mengisi data awal.
 */
function setupDatabase() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  var ss;

  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
    Logger.log('Menggunakan database yang sudah ada: ' + ss.getUrl());
  } else {
    ss = SpreadsheetApp.create('Smartlearn Database');
    props.setProperty('SPREADSHEET_ID', ss.getId());
    Logger.log('Database baru dibuat: ' + ss.getUrl());
  }

  // Buat / pastikan setiap sheet ada dan punya header yang benar
  for (var sheetName in DB_SCHEMA) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    var headers = DB_SCHEMA[sheetName];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Format baris header agar rapi
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#7C3AED')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }

  // Hapus sheet default "Sheet1" jika masih kosong
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && Object.keys(DB_SCHEMA).indexOf('Sheet1') === -1) {
    ss.deleteSheet(defaultSheet);
  }

  // Isi data awal hanya jika tabel Users masih kosong
  if (getRows('Users').length === 0) {
    seedInitialData();
    Logger.log('Data awal (akun demo) berhasil dibuat.');
  } else {
    Logger.log('Data sudah ada, seed dilewati.');
  }

  Logger.log('SETUP SELESAI. Buka database di: ' + ss.getUrl());
  return ss.getUrl();
}

/**
 * Mengisi data awal: kelas + akun demo (admin, guru, 2 siswa).
 * Password awal didokumentasikan di panduan setup.
 */
function seedInitialData() {
  var now = new Date();

  // --- Kelas ---
  appendRow('Kelas', { id: generateId('kls'), nama_kelas: '10A', wali_kelas: 'Bu Sari', tahun_ajaran: '2025/2026', jumlah_siswa: 0, created_at: now });
  appendRow('Kelas', { id: generateId('kls'), nama_kelas: '10B', wali_kelas: 'Pak Budi', tahun_ajaran: '2025/2026', jumlah_siswa: 0, created_at: now });

  // --- Akun demo ---
  // Password: admin123 / guru123 / siswa123
  createUserAccount('Administrator', 'admin@smartlearn.id', 'admin123', 'admin', '');
  createUserAccount('Bu Sari', 'guru@smartlearn.id', 'guru123', 'guru', '');
  createUserAccount('Andi Pratama', 'andi@smartlearn.id', 'siswa123', 'siswa', '10A');
  createUserAccount('Budi Santoso', 'budi@smartlearn.id', 'siswa123', 'siswa', '10A');
}

/**
 * Fungsi bantu membuat akun user lengkap dengan hashing password.
 * Dipakai oleh seed dan nantinya oleh fitur registrasi/admin.
 */
function createUserAccount(nama, email, password, role, kelas) {
  // Cek duplikat email
  if (findRow('Users', 'email', email)) {
    Logger.log('Email sudah terdaftar, dilewati: ' + email);
    return false;
  }
  var salt = generateSalt();
  var hash = hashPassword(password, salt);

  appendRow('Users', {
    id: generateId('usr'),
    nama: nama,
    email: email.toLowerCase(),
    password_hash: hash,
    salt: salt,
    role: role,            // 'admin' | 'guru' | 'siswa'
    kelas: kelas || '',
    level: 1,
    xp: 0,
    status: 'aktif',
    login_method: 'manual',
    created_at: new Date()
  });
  return true;
}

/**
 * Utility: cek URL & ID database yang sedang dipakai (untuk debugging).
 */
function showDatabaseInfo() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  if (!ssId) {
    Logger.log('Belum ada database. Jalankan setupDatabase().');
    return;
  }
  var ss = SpreadsheetApp.openById(ssId);
  Logger.log('ID Database  : ' + ssId);
  Logger.log('URL Database : ' + ss.getUrl());
}
