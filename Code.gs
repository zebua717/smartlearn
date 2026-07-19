/**
 * ============================================================
 *  SMARTLEARN — Platform Pembelajaran Adaptif
 *  FASE 1: Database + Autentikasi (Google + Manual) + Halaman Utama
 * ------------------------------------------------------------
 *  File: Code.gs  (entry point / routing)
 * ============================================================
 */

// Konfigurasi global aplikasi
var APP_CONFIG = {
  NAME: 'Smartlearn',
  TAGLINE: 'Platform pembelajaran adaptif untuk semua jenjang',
  SESSION_DURATION: 21600 // 6 jam (dalam detik) — batas maksimal CacheService
};

/**
 * Fungsi utama yang dijalankan saat web app diakses.
 * Mengembalikan halaman HTML (Single Page App).
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('App');
  template.appName = APP_CONFIG.NAME;
  template.tagline = APP_CONFIG.TAGLINE;

  return template.evaluate()
    .setTitle(APP_CONFIG.NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://ssl.gstatic.com/docs/script/images/favicon.png')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper untuk menyisipkan file HTML lain (CSS/JS) ke dalam template.
 * Dipakai di App.html dengan: <?!= include('Style') ?>
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Mengembalikan konfigurasi publik ke sisi klien (tanpa data sensitif).
 */
function getAppConfig() {
  return {
    name: APP_CONFIG.NAME,
    tagline: APP_CONFIG.TAGLINE
  };
}
