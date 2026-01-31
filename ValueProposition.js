/**
 * FUNZIONE PRINCIPALE: Genera value propositions per startup senza
 */
function generateMissingValuePropositions() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_STARTUPS);
  var data = sheet.getDataRange().getValues();
  
  Logger.log('=== INIZIO GENERAZIONE VALUE PROPOSITIONS ===');
  
  var totalProcessed = 0;
  var totalSkipped = 0;
  var errors = 0;

  for (var i = 1; i < data.length; i++) {
    var url = data[i][0];
    var startupName = data[i][1];
    var currentCountry = data[i][2];
    var currentValProp = data[i][4];

    if (url && currentValProp && currentValProp.trim() !== '') {
      totalSkipped++;
      continue;
    }

    if (!url) continue;

    Logger.log('');
    Logger.log('--- [' + (totalProcessed + 1) + '] ' + startupName + ' ---');
    
    try {
      var siteData = fetchSiteData(url);
      
      if (!siteData) {
        Logger.log('⚠️ Impossibile recuperare dati sito');
        errors++;
        continue;
      }
      
      Logger.log('📄 Title: ' + siteData.title.substring(0, 60) + '...');
      Logger.log('📝 Description: ' + siteData.description.substring(0, 80) + '...');
      
      var result = generateValueProp(startupName, url, siteData);
      
      if (!result) {
        Logger.log('❌ Gemini non ha ritornato risultato valido');
        errors++;
        continue;
      }
      
      if (!validateValueProp(result.vp)) {
        Logger.log('⚠️ Formato value prop non valido, tentativo correzione...');
        result.vp = fixValuePropFormat(startupName, result.vp);
      }
      
      sheet.getRange(i + 1, 5).setValue(result.vp);
      
      Logger.log('✅ Value Prop: ' + result.vp);
      
      totalProcessed++;
      
      Utilities.sleep(CONFIG.DELAY_BETWEEN_GEMINI_CALLS_MS);
      
    } catch (e) {
      Logger.log('❌ Errore critico: ' + e.message);
      errors++;
    }
  }

  Logger.log('');
  Logger.log('=== COMPLETATO ===');
  Logger.log('Startup aggiornate: ' + totalProcessed);
  Logger.log('Già completate (skip): ' + totalSkipped);
  Logger.log('Errori: ' + errors);
  
  ui.alert('✅ Generazione Completata',
    'Value propositions generate: ' + totalProcessed + '\n' +
    'Già presenti (saltate): ' + totalSkipped + '\n' +
    'Errori: ' + errors,
    ui.ButtonSet.OK);
}

function fetchSiteData(url) {
  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (response.getResponseCode() !== 200) {
      return null;
    }
    
    var html = response.getContentText();
    
    var titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    var title = titleMatch ? titleMatch[1].trim() : 'No Title';
    
    var descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    var description = descMatch ? descMatch[1].trim() : 'No Description';
    
    var bodySnippet = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000);
    
    return {
      title: title,
      description: description,
      bodySnippet: bodySnippet
    };
    
  } catch (e) {
    Logger.log('Errore fetch: ' + e.message);
    return null;
  }
}

function generateValueProp(startupName, url, siteData) {
  var prompt = 
`You are a startup analyst. Analyze this company and provide a value proposition.

COMPANY INFO:
- Name: ${startupName}
- URL: ${url}
- Title: ${siteData.title}
- Description: ${siteData.description}
- Body excerpt: ${siteData.bodySnippet}

TASK:
Generate a VALUE PROPOSITION following this EXACT format:
"[Name] helps [target audience] do [specific action/capability] so that [concrete benefit/outcome]"

EXAMPLES:
- "Stripe helps online businesses process payments so that they can accept credit cards without building infrastructure"
- "Notion helps knowledge workers organize information collaboratively so that teams can centralize documentation in one place"

RULES:
- Use the EXACT format shown above
- Keep under 25 words total
- Be specific about target audience (not "users" or "people")
- Focus on core value, not features
- Use present tense

RESPONSE FORMAT (JSON only, no markdown):
{"vp": "${startupName} helps..."}`;

  var response = callGeminiAPI(prompt);
  
  if (!response) {
    return null;
  }
  
  try {
    var cleanJson = response
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    
    var result = JSON.parse(cleanJson);
    
    if (!result.vp) {
      Logger.log('⚠️ JSON incompleto: ' + cleanJson);
      return null;
    }
    
    return {
      vp: result.vp.trim()
    };
    
  } catch (e) {
    Logger.log('❌ Errore parsing JSON: ' + e.message);
    Logger.log('Risposta Gemini: ' + response);
    return null;
  }
}

function validateValueProp(vp) {
  var lower = vp.toLowerCase();
  
  var hasStartup = lower.indexOf('startup') !== -1;
  var hasHelps = lower.indexOf('helps') !== -1 || lower.indexOf('help') !== -1;
  var hasSoThat = lower.indexOf('so that') !== -1;
  
  return hasStartup && hasHelps && hasSoThat;
}

function fixValuePropFormat(name, invalidVp) {
  if (invalidVp.toLowerCase().indexOf('startup') !== 0) {
    invalidVp = 'Startup ' + name + ' ' + invalidVp;
  }
  
  if (invalidVp.toLowerCase().indexOf('so that') === -1) {
    invalidVp = invalidVp.replace(/\s+to\s+([a-z]+)/i, ' so that they can $1');
  }
  
  return invalidVp;
}