/**
 * ============================================================
 *  File: Pengaturan.gs — Setting platform (toggle chat, hak akses)
 * ============================================================
 */

var DEFAULT_HAK_AKSES = {
  upload_materi: 'Guru', buat_soal: 'Guru', kelola_siswa: 'Guru & Admin',
  lihat_analitik: 'Guru & Admin', chat_grup: 'Semua', pesan_privat: 'Guru & Siswa'
};

function _settingRow(key) { return findRow('Pengaturan', 'key', key); }

function getSetting(key, def) {
  var r = _settingRow(key);
  return (r && r.value !== '') ? r.value : def;
}

function setSettingInternal(key, value) {
  var r = _settingRow(key);
  if (r) updateRow('Pengaturan', r._row, { value: value, updated_at: new Date() });
  else appendRow('Pengaturan', { key: key, value: value, updated_at: new Date() });
}

/* ---- Toggle Chat Grup per kelas ---- */
function isChatAktif(kelas) { return getSetting('chat_' + kelas, 'off') === 'on'; }

function setChatToggle(token, kelas, aktif) {
  requireAuth(token, ['guru', 'admin']);
  setSettingInternal('chat_' + kelas, aktif ? 'on' : 'off');
  return { success: true };
}

function getAllChatToggles(token) {
  requireAuth(token, ['guru', 'admin']);
  return getRows('Kelas').map(function(k) {
    return { kelas: k.nama_kelas, aktif: isChatAktif(k.nama_kelas) };
  });
}

/* ---- Hak Akses Fitur ---- */
function getHakAkses(token) {
  requireAuth(token);
  var v = getSetting('hak_akses', '');
  if (!v) return DEFAULT_HAK_AKSES;
  try { return JSON.parse(v); } catch (e) { return DEFAULT_HAK_AKSES; }
}

function setHakAkses(token, obj) {
  requireAuth(token, ['admin']);
  setSettingInternal('hak_akses', JSON.stringify(obj));
  return { success: true };
}