/**
 * ============================================================
 *  File: Notifikasi.gs — Notifikasi in-app
 *  - Materi/paket soal baru  -> siswa terkait
 *  - PR dikerjakan siswa     -> guru pembuat
 * ============================================================
 */

/** Kirim satu notifikasi ke seorang user. ref = string referensi target (mis. JSON) untuk deep-link. */
function _kirimNotif(userId, tipe, judul, pesan, ref) {
  if (!userId) return;
  appendRow('Notifikasi', {
    id: generateId('ntf'), user_id: String(userId), tipe: tipe || '',
    judul: judul || '', pesan: pesan || '', dibaca: 'false', created_at: new Date(),
    ref: ref || ''
  });
}

/** Kirim notifikasi ke semua siswa yang berhak atas kelas tertentu (CSV; kosong = semua). */
function _notifSiswaKelas(kelasCsv, tipe, judul, pesan, ref) {
  var fake = { kelas: kelasCsv || '' }; // pakai ulang _materiBerlaku (Materi.gs)
  getRows('Users').forEach(function(u) {
    if (u.role !== 'siswa') return;
    if (_materiBerlaku(fake, u.kelas)) _kirimNotif(u.id, tipe, judul, pesan, ref);
  });
}

/** Daftar notifikasi milik user (terbaru dulu, maks 50). */
function listNotifikasi(token) {
  var me = requireAuth(token);
  return getRows('Notifikasi')
    .filter(function(n) { return String(n.user_id) === String(me.id); })
    .map(function(n) {
      return {
        id: String(n.id), tipe: String(n.tipe || ''), judul: String(n.judul || ''),
        pesan: String(n.pesan || ''), dibaca: String(n.dibaca) === 'true', ref: String(n.ref || ''),
        waktu: _notifWaktu(n.created_at), ts: _notifTs(n.created_at)
      };
    })
    .sort(function(a, b) { return b.ts - a.ts; })
    .slice(0, 50);
}

function _notifTs(d) { try { return new Date(d).getTime(); } catch (e) { return 0; } }
function _notifWaktu(d) { try { return formatDateTime(d); } catch (e) { return String(d || ''); } }

/** Jumlah notifikasi belum dibaca. */
function hitungNotifBelum(token) {
  var me = requireAuth(token);
  var c = getRows('Notifikasi').filter(function(n) {
    return String(n.user_id) === String(me.id) && String(n.dibaca) !== 'true';
  }).length;
  return { count: c };
}

/** Tandai dibaca: satu notif (notifId) atau semua milik user (notifId kosong). */
function tandaiNotifDibaca(token, notifId) {
  var me = requireAuth(token);
  getRows('Notifikasi').forEach(function(n) {
    if (String(n.user_id) !== String(me.id)) return;
    if (notifId && String(n.id) !== String(notifId)) return;
    if (String(n.dibaca) !== 'true') updateRow('Notifikasi', n._row, { dibaca: 'true' });
  });
  return { success: true };
}