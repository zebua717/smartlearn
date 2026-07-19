/**
 * ============================================================
 *  File: Pengumuman.gs
 * ============================================================
 */

function buatPengumuman(token, data) {
  var me = requireAuth(token, ['guru', 'admin']);
  if (!data || !data.judul || !data.isi) {
    return { success: false, message: 'Judul dan isi wajib diisi.' };
  }
  appendRow('Pengumuman', {
    id: generateId('peng'), judul: data.judul, isi: data.isi,
    target: data.target || 'semua', dibuat_oleh: me.nama, created_at: new Date()
  });
  logAction(me.id, 'buat_pengumuman', data.judul);
  return { success: true };
}

function listPengumuman(token) {
  var me = requireAuth(token);
  return getRows('Pengumuman')
    .filter(function(p) {
      if (me.role === 'siswa') return p.target === 'semua' || String(p.target) === String(me.kelas);
      return true;
    })
    .map(function(p) {
      return {
        id: p.id, judul: p.judul, isi: p.isi, target: p.target,
        dibuat_oleh: p.dibuat_oleh, created_at: formatDate(p.created_at)
      };
    })
    .reverse();
}

function hapusPengumuman(token, id) {
  var me = requireAuth(token, ['guru', 'admin']);
  var p = findRow('Pengumuman', 'id', id);
  if (!p) return { success: false, message: 'Pengumuman tidak ditemukan.' };
  getSheet('Pengumuman').deleteRow(p._row);
  logAction(me.id, 'hapus_pengumuman', p.judul);
  return { success: true };
}