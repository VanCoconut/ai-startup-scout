/**
 * Ottiene tutti gli URL esistenti da un foglio (colonna A)
 * @param {string} sheetName - Nome del foglio
 * @returns {Array<string>} Array di URL normalizzati
 */
function getExistingUrls(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error('Foglio "' + sheetName + '" non trovato');
  }
  
  var data = sheet.getDataRange().getValues();
  var urls = [];
  
  // Salta header (riga 0)
  for (var i = 1; i < data.length; i++) {
    var url = data[i][0];  // Colonna A
    if (url && url.toString().trim() !== '') {
      urls.push(normalizeUrl(url));
    }
  }
  
  return urls;
}

/**
 * Aggiunge una riga al foglio se l'URL non esiste già
 * @param {string} sheetName
 * @param {Array} rowData - Array con i dati della riga
 * @returns {boolean} true se inserita, false se duplicato
 */
function addRowIfNotExists(sheetName, rowData) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var urlToAdd = normalizeUrl(rowData[0]);
  
  var existingUrls = getExistingUrls(sheetName);
  
  if (existingUrls.indexOf(urlToAdd) !== -1) {
    Logger.log('⊘ SKIP (duplicato): ' + urlToAdd);
    return false;
  }
  
  // Normalizza l'URL nella riga prima di inserire
  rowData[0] = urlToAdd;
  sheet.appendRow(rowData);
  Logger.log('✓ INSERITO: ' + rowData[1] + ' (' + urlToAdd + ')');
  return true;
}

/**
 * Ottiene tutte le righe da un foglio (escluso header)
 * @param {string} sheetName
 * @returns {Array<Array>} Array di righe
 */
function getAllRows(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  
  // Rimuovi header
  return data.slice(1);
}

/**
 * Aggiorna una cella specifica
 * @param {string} sheetName
 * @param {number} row - Numero riga (1-indexed)
 * @param {number} col - Numero colonna (1-indexed)
 * @param {string} value - Valore da scrivere
 */
function updateCell(sheetName, row, col, value) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  sheet.getRange(row, col).setValue(value);
}