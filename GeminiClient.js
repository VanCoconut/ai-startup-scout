/**
 * Chiama l'API Gemini per generare testo
 * @param {string} prompt - Il prompt da inviare
 * @returns {string|null} Testo generato o null se errore
 */
function callGeminiAPI(prompt) {
  var apiKey = getGeminiApiKey();
  var endpoint = CONFIG.GEMINI_ENDPOINT + CONFIG.GEMINI_MODEL + ':generateContent?key=' + apiKey;
  
  var payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 200,
      topP: 0.95,
      topK: 40
    }
  };
  
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(endpoint, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      Logger.log('❌ Gemini API errore HTTP ' + responseCode + ': ' + response.getContentText());
      return null;
    }
    
    var json = JSON.parse(response.getContentText());
    
    if (json.candidates && json.candidates[0] && json.candidates[0].content) {
      var text = json.candidates[0].content.parts[0].text;
      return text.trim();
    } else {
      Logger.log('❌ Risposta Gemini inattesa: ' + response.getContentText());
      return null;
    }
    
  } catch (e) {
    Logger.log('❌ Errore chiamata Gemini: ' + e.message);
    return null;
  }
}

/**
 * Test del client Gemini
 */
function testGeminiClient() {
  Logger.log('=== Test Gemini Client ===');
  
  var prompt = 'Scrivi solo "OK" se mi ricevi correttamente.';
  Logger.log('Invio prompt: ' + prompt);
  
  var response = callGeminiAPI(prompt);
  
  if (response) {
    Logger.log('✅ Risposta ricevuta: ' + response);
  } else {
    Logger.log('❌ Nessuna risposta valida');
  }
}