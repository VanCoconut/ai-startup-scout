/**
 * Ottiene il paese di una startup tramite IP geolocation
 * Usa API ip-api.com (gratis, 45 req/min)
 * @param {string} url - URL startup
 * @returns {string} Nome paese o "Unknown"
 */
function getCountryFromUrl(url) {
  try {
    // Estrai dominio
    var domain = extractDomain(url);
    
    if (!domain) {
      return 'Unknown';
    }
    
    // API ip-api.com: GET http://ip-api.com/json/{domain}
    // Risposta: {"status":"success","country":"United States","countryCode":"US",...}
    var apiUrl = 'http://ip-api.com/json/' + domain + '?fields=status,country';
    
    var response = UrlFetchApp.fetch(apiUrl, {
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      Logger.log('      API geolocation fallita per ' + domain);
      return 'Unknown';
    }
    
    var data = JSON.parse(response.getContentText());
    
    if (data.status === 'success' && data.country) {
      return data.country;  // Es. "United States", "United Kingdom", "France"
    } else {
      Logger.log('      Geolocation status: ' + data.status);
      return 'Unknown';
    }
    
  } catch (e) {
    Logger.log('      Errore geolocation: ' + e.message);
    return 'Unknown';
  }
}
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  url = url.trim();
  if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
  url = url.toLowerCase().replace(/^http:\/\//, 'https://').replace(/^(https:\/\/)www\./, '$1').replace(/\/$/, '').split('?')[0].split('#')[0];
  return url;
}

function extractDomain(url) {
  var match = url.match(/https?:\/\/([^\/]+)/);
  if (match && match[1]) return match[1].replace('www.', '');
  return '';
}

function isBlacklistedDomain(url) {
  var domain = extractDomain(url);
  var blacklist = [
    'google', 'facebook', 'linkedin', 'twitter', 'instagram', 'youtube', 'vimeo', 
    'github', 'apple', 'microsoft', 'amazon', 'cloudflare', 'typeform', 'brandfolder',
    'website-files', 'maps.google', 'googleapis', 'cdn', 'pr.co', 'wix', 'wordpress'
  ];
  var forbiddenExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf', '.ico'];
  
  var isForbiddenExt = forbiddenExtensions.some(ext => url.toLowerCase().endsWith(ext));
  var isBlacklisted = blacklist.some(b => domain.includes(b));
  
  return isForbiddenExt || isBlacklisted;
}

function isValidUrl(url) {
  if (!url) return false;
  var pattern = new RegExp('^(https?:\\/\\/)?' + '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,})', 'i');
  return !!pattern.test(url);
}

/**
 * Controlla se un URL è un asset (font, CSS, JS, immagine, CDN)
 * @param {string} url
 * @returns {boolean}
 */
function isAssetUrl(url) {
  var lowerUrl = url.toLowerCase();
  
  // Estensioni file asset
  var assetExtensions = [
    '.woff', '.woff2', '.ttf', '.otf', '.eot',  // Font
    '.css', '.scss', '.sass',                    // CSS
    '.js', '.min.js', '.bundle.js',             // JavaScript
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',  // Immagini
    '.mp4', '.webm', '.mov',                    // Video
    '.pdf', '.zip', '.tar', '.gz'               // File
  ];
  
  for (var i = 0; i < assetExtensions.length; i++) {
    if (lowerUrl.indexOf(assetExtensions[i]) !== -1) {
      return true;
    }
  }
  
  // Domini CDN comuni
  var cdnDomains = [
    'fonts.gstatic.com',
    'fonts.googleapis.com',
    'cdnjs.cloudflare.com',
    'cdn.jsdelivr.net',
    'unpkg.com',
    'assets.ctfassets.net',
    'cloudinary.com',
    'imgix.net',
    'fastly.net',
    'akamaized.net',
    'cloudfront.net'
  ];
  
  for (var i = 0; i < cdnDomains.length; i++) {
    if (lowerUrl.indexOf(cdnDomains[i]) !== -1) {
      return true;
    }
  }
  
  // Pattern URL asset
  if (lowerUrl.match(/\/assets?\//i)) return true;
  if (lowerUrl.match(/\/static\//i)) return true;
  if (lowerUrl.match(/\/dist\//i)) return true;
  if (lowerUrl.match(/\/public\//i)) return true;
  if (lowerUrl.match(/kit\.fontawesome\.com/i)) return true;
  
  return false;
}