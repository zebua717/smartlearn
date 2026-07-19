/**
 * ============================================================
 *  File: Auth.gs
 *  Sistem autentikasi & sesi:
 *   - Login manual (email + password, hash SHA-256 + salt)
 *   - Login Google (mencocokkan email akun Google)
 *   - Token sesi disimpan di CacheService (6 jam)
 * ============================================================
 */

/* ---------- Hashing & Salt ---------- */

/**
 * Membuat salt acak (string heksadesimal).
 */
function generateSalt() {
  var bytes = [];
  for (var i = 0; i < 16; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  return bytesToHex(bytes);
}

/**
 * Hash password menggunakan SHA-256 atas (password + salt).
 */
function hashPassword(password, salt) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + salt,
    Utilities.Charset.UTF_8
  );
  return bytesToHex(raw);
}

/**
 * Mengubah array byte menjadi string heksadesimal.
 */
function bytesToHex(bytes) {
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

/* ---------- Sesi (Session) ---------- */

/**
 * Membuat token sesi baru untuk user dan menyimpannya di cache.
 */
function createSession(userId) {
  var token = Utilities.getUuid();
  var cache = CacheService.getScriptCache();
  cache.put('session_' + token, String(userId), APP_CONFIG.SESSION_DURATION);
  return token;
}

/**
 * Memvalidasi token sesi. Mengembalikan data user (aman) atau null.
 * Dipanggil sisi klien tiap kali halaman dimuat.
 */
function validateSession(token) {
  if (!token) return null;
  var cache = CacheService.getScriptCache();
  var userId = cache.get('session_' + token);
  if (!userId) return null;

  var user = findRow('Users', 'id', userId);
  if (!user || user.status !== 'aktif') return null;

  return sanitizeUser(user);
}

/**
 * Menghapus sesi (logout).
 */
function serverLogout(token) {
  if (token) {
    CacheService.getScriptCache().remove('session_' + token);
  }
  return { success: true };
}

/**
 * Menghapus data sensitif sebelum dikirim ke klien.
 */
function sanitizeUser(user) {
  return {
    id: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role,
    kelas: user.kelas,
    level: user.level,
    xp: user.xp
  };
}

/* ---------- Login Manual ---------- */

/**
 * Login dengan email + password.
 * Dipanggil dari klien: google.script.run.serverLogin(email, password)
 */
function serverLogin(email, password) {
  if (!email || !password) {
    return { success: false, message: 'Email dan password wajib diisi.' };
  }

  var user = findRow('Users', 'email', String(email).toLowerCase().trim());
  if (!user) {
    return { success: false, message: 'Email tidak terdaftar.' };
  }
  if (user.status !== 'aktif') {
    return { success: false, message: 'Akun tidak aktif. Hubungi admin.' };
  }

  var hash = hashPassword(password, user.salt);
  if (hash !== user.password_hash) {
    return { success: false, message: 'Password salah.' };
  }

  var token = createSession(user.id);
  logAction(user.id, 'login', 'Login manual berhasil');

  return { success: true, token: token, user: sanitizeUser(user) };
}

/* ---------- Login Google ---------- */

/**
 * Mengambil email akun Google yang sedang mengakses web app.
 * CATATAN PENTING tentang deployment ada di panduan setup.
 */
function getGoogleEmail() {
  try {
    var email = Session.getActiveUser().getEmail();
    return email || '';
  } catch (e) {
    return '';
  }
}

/**
 * Login otomatis berbasis akun Google.
 * Mencocokkan email Google dengan kolom email di sheet Users.
 * Dipanggil dari klien: google.script.run.serverGoogleLogin()
 */
function serverGoogleLogin() {
  var email = getGoogleEmail();
  if (!email) {
    return {
      success: false,
      message: 'Tidak dapat membaca akun Google. Pastikan Anda sudah login Google, ' +
               'atau gunakan login manual.'
    };
  }

  var user = findRow('Users', 'email', email.toLowerCase());
  if (!user) {
    return {
      success: false,
      message: 'Akun Google (' + email + ') belum terdaftar. Hubungi guru/admin Anda.'
    };
  }
  if (user.status !== 'aktif') {
    return { success: false, message: 'Akun tidak aktif. Hubungi admin.' };
  }

  var token = createSession(user.id);
  logAction(user.id, 'login', 'Login Google berhasil (' + email + ')');

  return { success: true, token: token, user: sanitizeUser(user) };
}

/* ---------- Util untuk pengecekan hak akses ---------- */

/**
 * Memastikan token valid dan (opsional) memiliki salah satu role yang diizinkan.
 * Mengembalikan object user, atau melempar error jika tidak berhak.
 * Dipakai fungsi-fungsi fase berikutnya untuk proteksi.
 */
function requireAuth(token, allowedRoles) {
  var user = validateSession(token);
  if (!user) {
    throw new Error('Sesi tidak valid atau sudah kedaluwarsa. Silakan login ulang.');
  }
  if (allowedRoles && allowedRoles.length && allowedRoles.indexOf(user.role) === -1) {
    throw new Error('Anda tidak memiliki akses untuk tindakan ini.');
  }
  return user;
}
