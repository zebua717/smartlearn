/**
 * ============================================================
 *  File: Util.gs — fungsi utilitas umum
 * ============================================================
 */

/** Format tanggal singkat, mis. "24 Jun 2026". */
function formatDate(d) {
  if (!d) return '';
  try {
    return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'd MMM yyyy');
  } catch (e) { return String(d); }
}

/** Format tanggal + jam, mis. "24 Jun 2026, 14:30". */
function formatDateTime(d) {
  if (!d) return '';
  try {
    return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'd MMM yyyy, HH:mm');
  } catch (e) { return String(d); }
}