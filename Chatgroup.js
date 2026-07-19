/**
 * ============================================================
 *  File: ChatGrup.gs — Chat grup per kelas dengan toggle aktif/nonaktif
 * ============================================================
 */

/** Ambil pesan chat grup sebuah kelas + status aktif. Siswa terkunci ke kelasnya. */
function getChatGrup(token, kelas) {
  var me = requireAuth(token);
  if (me.role === 'siswa') kelas = me.kelas;
  if (!kelas) return { kelas: '', aktif: false, pesan: [] };

  var pesan = getRows('ChatGrup')
    .filter(function(c) { return String(c.kelas) === String(kelas); })
    .sort(function(a, b) { return new Date(a.created_at) - new Date(b.created_at); })
    .map(function(c) {
      return {
        from_nama: c.from_nama, isi: c.isi, waktu: formatDateTime(c.created_at),
        dari_saya: String(c.from_id) === String(me.id)
      };
    });

  return { kelas: kelas, aktif: isChatAktif(kelas), pesan: pesan };
}

/** Kirim pesan ke chat grup. Ditolak bila chat sedang dinonaktifkan guru. */
function kirimChatGrup(token, kelas, isi) {
  var me = requireAuth(token);
  if (me.role === 'siswa') kelas = me.kelas;
  if (!kelas) return { success: false, message: 'Kelas tidak ditemukan.' };
  if (!isChatAktif(kelas)) return { success: false, message: 'Chat grup sedang dinonaktifkan guru.' };
  if (!isi || !String(isi).trim()) return { success: false, message: 'Pesan kosong.' };

  appendRow('ChatGrup', {
    id: generateId('cg'), kelas: kelas, from_id: me.id, from_nama: me.nama,
    isi: String(isi).trim(), created_at: new Date()
  });
  return { success: true };
}

/** Daftar kelas + status chat (untuk guru memilih kelas mana yang dilihat/dikelola). */
function listKelasChat(token) {
  requireAuth(token, ['guru', 'admin']);
  return getRows('Kelas').map(function(k) {
    return { nama_kelas: k.nama_kelas, aktif: isChatAktif(k.nama_kelas) };
  });
}