/**
 * Funzione speciale eseguita automaticamente all'apertura del foglio
 * Crea il menu personalizzato
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🤖 Startup Scouting AI')
    .addItem('1️⃣ Scouting Acceleratori', 'scoutAccelerators')
    .addItem('2️⃣ Aggiorna Startup dagli Acceleratori', 'scoutStartupsFromAccelerators')
    .addItem('3️⃣ Genera Value Proposition Mancanti', 'generateMissingValuePropositions')
    .addSeparator()
    .addItem('⚙️ Configura API Key Gemini', 'configureApiKey')
    .addItem('🧪 Test Configurazione', 'testConfiguration')
    .addToUi();
}

/**
 * Dialog per configurare API Key via UI
 */
function configureApiKey() {
  var ui = SpreadsheetApp.getUi();
  
  var result = ui.prompt(
    'Configurazione Gemini API Key',
    'Inserisci la tua API Key (ottienila da https://aistudio.google.com/app/apikey):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (result.getSelectedButton() === ui.Button.OK) {
    var apiKey = result.getResponseText().trim();
    
    if (!apiKey) {
      ui.alert('❌ Errore', 'API Key non può essere vuota', ui.ButtonSet.OK);
      return;
    }
    
    PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', apiKey);
    ui.alert('✅ Successo', 'API Key salvata correttamente!', ui.ButtonSet.OK);
  }
}

/**
 * Test per verificare che tutto sia configurato correttamente
 */
function testConfiguration() {
  var ui = SpreadsheetApp.getUi();
  var messages = [];
  
  // Check 1: API Key
  try {
    var apiKey = getGeminiApiKey();
    messages.push('✅ API Key: Configurata (lunghezza: ' + apiKey.length + ')');
  } catch (e) {
    messages.push('❌ API Key: NON configurata');
  }
  
  // Check 2: Fogli esistenti
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var accSheet = ss.getSheetByName(CONFIG.SHEET_ACCELERATORS);
  var startupSheet = ss.getSheetByName(CONFIG.SHEET_STARTUPS);
  
  messages.push(accSheet ? '✅ Foglio "accelerators": Presente' : '❌ Foglio "accelerators": MANCANTE');
  messages.push(startupSheet ? '✅ Foglio "startups": Presente' : '❌ Foglio "startups": MANCANTE');
  
  // Check 3: Normalizzazione URL
  var testUrl = normalizeUrl('HTTP://WWW.EXAMPLE.COM/');
  messages.push(testUrl === 'https://example.com' ? '✅ UrlUtils: Funzionante' : '❌ UrlUtils: ERRORE');
  
  ui.alert('🧪 Test Configurazione', messages.join('\n'), ui.ButtonSet.OK);
}


function testNormalization() {
  var testCases = [
    {input: 'HTTP://WWW.EXAMPLE.COM/', expected: 'https://example.com'},
    {input: 'https://example.com', expected: 'https://example.com'},
    {input: 'www.example.com/path?query=1#anchor', expected: 'https://example.com/path'},
    {input: 'example.com', expected: 'https://example.com'},
    {input: 'http://example.com/', expected: 'https://example.com'}
  ];
  
  Logger.log('=== Test Normalizzazione URL ===');
  var allPassed = true;
  
  for (var i = 0; i < testCases.length; i++) {
    var test = testCases[i];
    var result = normalizeUrl(test.input);
    var passed = (result === test.expected);
    
    if (passed) {
      Logger.log('✅ ' + test.input + ' → ' + result);
    } else {
      Logger.log('❌ ' + test.input + ' → ' + result + ' (atteso: ' + test.expected + ')');
      allPassed = false;
    }
  }
  
  Logger.log('');
  Logger.log(allPassed ? '🎉 TUTTI I TEST PASSATI' : '⚠️ ALCUNI TEST FALLITI');
}

function quickTestGemini() {
  testGeminiClient();
}