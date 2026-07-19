/**
 * ============================================================
 *  File: Pesan.gs — Pesan privat 1:1 (guru ↔ siswa)
 * ============================================================
 */

/** Daftar kontak yang bisa diajak chat + jumlah pesan belum dibaca. */
function getKontak(token) {
  var me = requireAuth(token);
  var users = getRows('Users').filter(function(u) { return u.status === 'aktif' && String(u.id) !== String(me.id); });
  var filtered;
  if (me.role === 'siswa') filtered = users.filter(function(u) { return u.role === 'guru' || u.role === 'admin'; });
  else if (me.role === 'guru') filtered = users.filter(function(u) { return u.role === 'siswa'; });
  else filtered = users; // admin: semua

  var pesan = getRows('Pesan');
  return filtered.map(function(u) {
    var unread = pesan.filter(function(p) {
      return String(p.from_id) === String(u.id) && String(p.to_id) === String(me.id) && !_isTrue(p.dibaca);
    }).length;
    return { id: u.id, nama: u.nama, role: u.role, kelas: u.kelas, unread: unread };
  });
}

function _isTrue(v) { return v === true || v === 'true' || v === 'TRUE'; }

/** Mengambil percakapan dengan satu kontak + menandai pesan masuk sebagai dibaca. */
function getPercakapan(token, otherId) {
  var me = requireAuth(token);
  var all = getRows('Pesan');

  var thread = all.filter(function(p) {
    return (String(p.from_id) === String(me.id) && String(p.to_id) === String(otherId)) ||
           (String(p.from_id) === String(otherId) && String(p.to_id) === String(me.id));
  }).sort(function(a, b) { return new Date(a.created_at) - new Date(b.created_at); });

  // Tandai pesan dari lawan sebagai dibaca
  all.forEach(function(p) {
    if (String(p.from_id) === String(otherId) && String(p.to_id) === String(me.id) && !_isTrue(p.dibaca)) {
      updateRow('Pesan', p._row, { dibaca: true });
    }
  });

  var other = findRow('Users', 'id', otherId);
  return {
    nama: other ? other.nama : '-',
    pesan: thread.map(function(p) {
      return { dari_saya: String(p.from_id) === String(me.id), isi: p.isi, waktu: formatDateTime(p.created_at) };
    })
  };
}

function kirimPesan(token, toId, isi) {
  var me = requireAuth(token);
  if (!isi || !String(isi).trim()) return { success: false, message: 'Pesan kosong.' };
  var other = findRow('Users', 'id', toId);
  if (!other) return { success: false, message: 'Penerima tidak ditemukan.' };
  appendRow('Pesan', {
    id: generateId('msg'), from_id: me.id, from_nama: me.nama,
    to_id: toId, to_nama: other.nama, isi: String(isi).trim(),
    dibaca: false, created_at: new Date()
  });
  return { success: true };
}