/**
 * FUNZIONE PRINCIPALE: Estrae startup da tutti gli acceleratori
 * Con prompt per numero max startup per acceleratore
 */
function scoutStartupsFromAccelerators() {
  var ui = SpreadsheetApp.getUi();
  
  // Ottieni tutti gli acceleratori
  var accelerators = getAllRows(CONFIG.SHEET_ACCELERATORS);
  
  if (accelerators.length === 0) {
    ui.alert('⚠️ Nessun acceleratore trovato', 'Esegui prima "Scouting Acceleratori"', ui.ButtonSet.OK);
    return;
  }
  
  // Chiedi limite startup
  var limitPerAcc = promptForStartupLimit(ui);
  
  if (limitPerAcc === null) {
    // Utente ha annullato
    return;
  }
  
  Logger.log('=== INIZIO SCRAPING STARTUP ===');
  Logger.log('Acceleratori da processare: ' + accelerators.length);
  Logger.log('Limite per acceleratore: ' + (limitPerAcc === 0 ? 'NESSUNO (tutte)' : limitPerAcc));
  
  var totalAdded = 0;
  var totalErrors = 0;
  
  for (var i = 0; i < accelerators.length; i++) {
    var acc = accelerators[i];
    var accWebsite = acc[0];  // colonna A
    var accName = acc[1];     // colonna B
    
    if (!accWebsite) continue;
    
    Logger.log('');
    Logger.log('--- [' + (i+1) + '/' + accelerators.length + '] Processando: ' + accName + ' ---');
    
    try {
      var result = scrapeSingleAccelerator(accWebsite, accName, limitPerAcc);
      totalAdded += result.added;
      totalErrors += result.errors;
      
    } catch (e) {
      Logger.log('❌ ERRORE CRITICO per ' + accName + ': ' + e.message);
      totalErrors++;
    }
    
    // Pausa tra acceleratori
    if (i < accelerators.length - 1) {
      Utilities.sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
    }
  }
  
  Logger.log('');
  Logger.log('=== SCRAPING COMPLETATO ===');
  Logger.log('Startup aggiunte: ' + totalAdded);
  Logger.log('Errori: ' + totalErrors);
  
  ui.alert('✅ Scraping Completato', 
    'Startup aggiunte: ' + totalAdded + '\n' +
    'Errori: ' + totalErrors + '\n\n' +
    'Vedi log per dettagli (Estensioni → Apps Script → Esecuzioni)',
    ui.ButtonSet.OK);
}

/**
 * Prompt per chiedere limite startup
 * @param {Ui} ui
 * @returns {number|null} Numero limite (0 = nessun limite) o null se annullato
 */
function promptForStartupLimit(ui) {
  var response = ui.prompt(
    'Configurazione Scraping',
    'Quante startup vuoi estrarre per ogni acceleratore?\n\n' +
    'Esempi:\n' +
    '• 10 = max 10 startup per acceleratore (default)\n' +
    '• 0 = TUTTE le startup (nessun limite)\n' +
    '• Lascia vuoto = default 10',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) {
    return null; // Annullato
  }
  
  var input = response.getResponseText().trim();
  
  if (input === '') {
    return 10; // Default
  }
  
  var limit = parseInt(input);
  
  if (isNaN(limit) || limit < 0) {
    ui.alert('⚠️ Valore non valido', 'Inserisci un numero >= 0', ui.ButtonSet.OK);
    return promptForStartupLimit(ui); // Richiedi
  }
  
  return limit;
}

/**
 * Estrae startup da un singolo acceleratore
 * @param {string} accWebsite - URL acceleratore
 * @param {string} accName - Nome acceleratore
 * @param {number} limit - Max startup (0 = nessun limite)
 * @returns {Object} {added: number, errors: number}
 */
function scrapeSingleAccelerator(accWebsite, accName, limit) {
  var added = 0;
  var errors = 0;
  
  // Step 1: Trova URL portfolio
  var portfolioUrl = findPortfolioUrl(accWebsite, accName);
  
  if (!portfolioUrl) {
    Logger.log('⚠️ Portfolio URL non trovato');
    return {added: 0, errors: 1};
  }
  
  Logger.log('📄 Portfolio URL: ' + portfolioUrl);
  
  // Step 2: Estrai URL startup
  var startupUrls = extractStartupUrlsFromPage(portfolioUrl, accWebsite);
  
  if (startupUrls.length === 0) {
    Logger.log('⚠️ Nessuna startup trovata');
    return {added: 0, errors: 0};
  }
  
  Logger.log('🔗 Link trovati: ' + startupUrls.length);
  
  // Applica limite
  if (limit > 0) {
    startupUrls = startupUrls.slice(0, limit);
  }
  
  Logger.log('📊 Processando: ' + startupUrls.length + ' startup');
  

// Step 3: Estrai info e aggiungi al foglio
for (var i = 0; i < startupUrls.length; i++) {
  var startupUrl = startupUrls[i];
  
  Logger.log('  [' + (i+1) + '/' + startupUrls.length + '] Tentativo: ' + startupUrl);
  
  try {
    var info = extractStartupInfo(startupUrl);
    
    if (!info) {
      Logger.log('    ⚠️ extractStartupInfo ha ritornato null');
      errors++;
      continue;
    }
    
// Ottieni country via geolocation API
var country = getCountryFromUrl(startupUrl);
Logger.log('    📍 Country (geolocation): ' + country);

// Aggiungi al foglio
var inserted = addRowIfNotExists(CONFIG.SHEET_STARTUPS, [
  startupUrl,
  info.name,
  country,  // ← USA geolocation invece di info.country
  accWebsite,
  ''
]);
    
    if (inserted) {
      added++;
      Logger.log('    ✓ Inserito: ' + info.name);
    } else {
      Logger.log('    ⊘ Duplicato');
    }
    
  } catch (e) {
    Logger.log('    ❌ Errore: ' + e.message);
    errors++;
  }
  
  // Pausa tra startup
  Utilities.sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
}
  return {added: added, errors: errors};
}

/**
 * Trova l'URL della pagina portfolio di un acceleratore
 * @param {string} accWebsite - URL base acceleratore
 * @param {string} accName - Nome acceleratore (per euristica)
 * @returns {string|null} URL portfolio o null
 */
function findPortfolioUrl(accWebsite, accName) {
  // EURISTICA SPECIFICA PER SEEDCAMP
  if (accWebsite.indexOf('seedcamp.com') !== -1) {
    return 'https://seedcamp.com/companies/';
  }
  
  // EURISTICA GENERICA per altri acceleratori
  var commonPaths = [
    '/portfolio',
    '/companies',
    '/startups',
    '/portfolio-companies',
    '/our-companies'
  ];
  
  // Prova percorsi comuni
  for (var i = 0; i < commonPaths.length; i++) {
    var testUrl = accWebsite + commonPaths[i];
    
    try {
      var response = UrlFetchApp.fetch(testUrl, {
        muteHttpExceptions: true,
        followRedirects: true
      });
      
      if (response.getResponseCode() === 200) {
        Logger.log('✓ Trovato portfolio a: ' + testUrl);
        return testUrl;
      }
    } catch (e) {
      // Continua
    }
  }
  
  // Fallback: usa homepage e cerca link nel contenuto
  try {
    var response = UrlFetchApp.fetch(accWebsite, {
      muteHttpExceptions: true,
      followRedirects: true
    });
    
    if (response.getResponseCode() !== 200) {
      return null;
    }
    
    var html = response.getContentText();
    
    // Cerca link con pattern comuni
    var patterns = [
      /href=["']([^"']*portfolio[^"']*)["']/i,
      /href=["']([^"']*companies[^"']*)["']/i,
      /href=["']([^"']*startups[^"']*)["']/i
    ];
    
    for (var i = 0; i < patterns.length; i++) {
      var match = html.match(patterns[i]);
      if (match) {
        var path = match[1];
        
        // Se è path relativo, rendilo assoluto
        if (path.startsWith('/')) {
          var baseUrl = accWebsite.match(/^https?:\/\/[^\/]+/)[0];
          return baseUrl + path;
        }
        
        return path;
      }
    }
    
  } catch (e) {
    Logger.log('Errore fetch homepage: ' + e.message);
  }
  
  return null;
}

/**
 * Estrae URL di startup da una pagina portfolio
 * @param {string} portfolioUrl - URL pagina portfolio
 * @param {string} accWebsite - URL acceleratore (per filtraggio)
 * @returns {Array<string>} Array di URL normalizzati
 */
function extractStartupUrlsFromPage(portfolioUrl, accWebsite) {
  try {
    var response = UrlFetchApp.fetch(portfolioUrl, {
      muteHttpExceptions: true,
      followRedirects: true
    });
    
    if (response.getResponseCode() !== 200) {
      Logger.log('❌ Errore HTTP ' + response.getResponseCode());
      return [];
    }
    
    var html = response.getContentText();
    
    // Estrai tutti gli href
    var hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
    var matches = [];
    var match;
    
    while ((match = hrefRegex.exec(html)) !== null) {
      matches.push(match[1]);
    }
    
    Logger.log('Link totali trovati: ' + matches.length);
    
    // Filtra solo URL validi di startup
    var accDomain = extractDomain(accWebsite);
    var startupUrls = [];
    var seenUrls = {};
    
    for (var i = 0; i < matches.length; i++) {
      var url = matches[i];
      var normalized = normalizeUrl(url);
      
      // Skip se già visto
      if (seenUrls[normalized]) continue;
      
      // Skip se è l'acceleratore stesso
      if (normalized.indexOf(accDomain) !== -1) continue;
      
      // Skip se blacklisted
      if (isBlacklistedDomain(normalized)) continue;
      
      // Skip se non è URL valido
      if (!isValidUrl(normalized)) continue;
      
      // *** NUOVO: Skip asset/font/CDN ***
      if (isAssetUrl(normalized)) continue;
      
      startupUrls.push(normalized);
      seenUrls[normalized] = true;
    }
    
    return startupUrls;
    
  } catch (e) {
    Logger.log('❌ Errore estrazione da ' + portfolioUrl + ': ' + e.message);
    return [];
  }
}

/**
 * Estrae nome e country da sito startup
 * @param {string} url - URL homepage startup
 * @returns {Object|null} {name: string, country: string} o null
 */
/**
 * Estrae nome e country da sito startup
 * VERSIONE MIGLIORATA: Gestione "Home", caratteri HTML e nomi lunghi
 */
function extractStartupInfo(url) {
  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (response.getResponseCode() !== 200) return null;
    var html = response.getContentText();
    
    var titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    var rawTitle = titleMatch ? titleMatch[1].trim() : '';
    
    var name = cleanTitle(rawTitle);
    
    var useDomain = false;
    
    if (!name) useDomain = true;
    if (/powered|solution|platform|software|tool|app|best|leading|world|network|review/i.test(name)) useDomain = true;
    if (name.split(' ').length > 3) useDomain = true;
    if (name.includes('.') || name === 'Home' || name === 'Welcome') useDomain = true;

    if (useDomain) {
      name = formatNameFromDomain(url);
    }
    
    return { name: name };
    
  } catch (e) {
    return null;
  }
}

function cleanTitle(rawTitle) {
  if (!rawTitle) return '';
  // Decodifica entità
  var text = rawTitle.replace(/&#8211;/g, '-').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
  // Prende solo la parte PRIMA di separatori come -, |, :
  var separators = ['|', ' - ', ' – ', ' — ', ':', '•'];
  for (var i = 0; i < separators.length; i++) {
    if (text.indexOf(separators[i]) !== -1) {
      text = text.split(separators[i])[0];
      break;
    }
  }
  return text.trim();
}

/**
 * Estrae un nome pulito dal dominio (es. https://getrevox.com -> Revox)
 */
function formatNameFromDomain(url) {
  try {
    // Rimuove protocollo
    var domain = url.replace(/^https?:\/\//, '');
    // Rimuove www e sottodomini comuni
    domain = domain.replace(/^www\./, '').replace(/^app\./, '');
    // Rimuove path
    domain = domain.split('/')[0];
    // Rimuove estensione (.com, .ai, .io, ecc)
    var parts = domain.split('.');
    var name = parts[0]; 
    
    // Rimuove parole "get", "use", "try" se all'inizio (es. getrevox -> revox)
    name = name.replace(/^(get|use|try|my)(?=[a-z]{3,})/i, '');

    // Capitalizza (revox -> Revox)
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch (e) {
    return 'Unknown';
  }
}

