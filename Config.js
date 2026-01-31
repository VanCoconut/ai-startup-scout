/**
 * Recupera la Gemini API Key dalle proprietà script
 * @returns {string} API Key
 */
function getGeminiApiKey() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY non configurata. Vai in Impostazioni Progetto → Proprietà Script');
  }
  
  return apiKey;
}

/**
 * Costanti di configurazione globali
 */
var CONFIG = {
  // Rate limiting
  DELAY_BETWEEN_REQUESTS_MS: 2000,  // 2 secondi (più conservativo per Google)
  DELAY_BETWEEN_GEMINI_CALLS_MS: 4000,
  
  // Batch sizes
  MAX_ACCELERATORS_PER_RUN: 10,
  MAX_STARTUPS_PER_ACCELERATOR: 20,
  MAX_VALUE_PROPS_PER_RUN: 20,
  
  // Timeout
  HTTP_TIMEOUT_MS: 10000,
  
  // Gemini
  GEMINI_MODEL: 'gemma-3-27b-it',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/',
  
  // Sheet names
  SHEET_ACCELERATORS: 'accelerators',
  SHEET_STARTUPS: 'startups'
};