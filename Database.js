/**
 * ============================================================
 *  File: Database.gs
 *  Kumpulan fungsi pembantu untuk membaca & menulis data
 *  ke Google Sheets yang berperan sebagai "database".
 * ============================================================
 */

/**
 * Mengambil objek Spreadsheet database.
 * ID spreadsheet disimpan di ScriptProperties saat setupDatabase() dijalankan.
 */
function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  if (!ssId) {
    throw new Error('Database belum di-setup. Jalankan fungsi setupDatabase() terlebih dahulu.');
  }
  return SpreadsheetApp.openById(ssId);
}

/**
 * Mengambil sheet (tab) berdasarkan nama. Error jika tidak ditemukan.
 */
function getSheet(sheetName) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" tidak ditemukan. Jalankan ulang setupDatabase().');
  }
  return sheet;
}

/**
 * Membaca semua baris dari sebuah sheet dan mengubahnya menjadi array of object,
 * dengan key sesuai nama kolom (baris pertama = header).
 * Setiap object juga memiliki properti _row (nomor baris di sheet, untuk update).
 */
function getRows(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    obj._row = i + 1; // nomor baris sebenarnya di spreadsheet
    rows.push(obj);
  }
  return rows;
}

/**
 * Mencari satu baris berdasarkan nilai pada kolom tertentu.
 * Mengembalikan object baris pertama yang cocok, atau null.
 */
function findRow(sheetName, columnName, value) {
  var rows = getRows(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][columnName]) === String(value)) {
      return rows[i];
    }
  }
  return null;
}

/**
 * Menambahkan satu baris baru. `rowObject` adalah object dengan key = nama kolom.
 * Kolom yang tidak ada di object akan dikosongkan.
 */
function appendRow(sheetName, rowObject) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow = headers.map(function(h) {
    return rowObject.hasOwnProperty(h) ? rowObject[h] : '';
  });
  sheet.appendRow(newRow);
  return true;
}

/**
 * Memperbarui beberapa kolom pada baris tertentu (berdasarkan nomor _row).
 */
function updateRow(sheetName, rowNumber, updates) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var key in updates) {
    var colIndex = headers.indexOf(key);
    if (colIndex !== -1) {
      sheet.getRange(rowNumber, colIndex + 1).setValue(updates[key]);
    }
  }
  return true;
}

/**
 * Menghasilkan ID unik berbasis waktu + random (untuk primary key sederhana).
 */
function generateId(prefix) {
  var ts = new Date().getTime().toString(36);
  var rnd = Math.floor(Math.random() * 1000).toString(36);
  return (prefix || 'id') + '_' + ts + rnd;
}

/**
 * Mencatat aktivitas ke sheet Logs (audit trail).
 */
function logAction(userId, action, detail) {
  try {
    appendRow('Logs', {
      timestamp: new Date(),
      user_id: userId || '-',
      action: action || '-',
      detail: detail || ''
    });
  } catch (err) {
    // Jangan sampai logging menggagalkan operasi utama
    console.error('Gagal menulis log: ' + err.message);
  }
}