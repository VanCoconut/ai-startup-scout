function scoutStartupsFromAccelerators() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var accSheet = ss.getSheetByName('accelerators');
  var startupSheet = ss.getSheetByName('startups');
  
  if (!accSheet || !startupSheet) {
    SpreadsheetApp.getUi().alert('Errore: Fogli non trovati.');
    return;
  }

  var accData = accSheet.getDataRange().getValues();
  var existingUrls = startupSheet.getDataRange().getValues().map(row => row[0]);
  var totalAdded = 0;

  for (var i = 1; i < accData.length; i++) {
    var accUrl = accData[i][0];
    var accName = accData[i][1];
    if (!accUrl) continue;

    try {
      var portfolioUrl = findPortfolioUrl(accUrl);
      var response = UrlFetchApp.fetch(portfolioUrl, { 
        muteHttpExceptions: true, 
        followRedirects: true 
      });
      
      if (response.getResponseCode() !== 200) continue;
      
      var html = response.getContentText();
      var accDomain = extractDomain(accUrl);
      var links = extractPotentialStartupLinks(html, accDomain);
      
      var addedForThisAcc = 0;
      for (var j = 0; j < links.length && addedForThisAcc < 15; j++) {
        var sUrl = normalizeUrl(links[j]);
        
        if (isValidUrl(sUrl) && !isBlacklistedDomain(sUrl) && existingUrls.indexOf(sUrl) === -1) {
          var name = extractDomain(sUrl).split('.')[0];
          name = name.charAt(0).toUpperCase() + name.slice(1);
          
          startupSheet.appendRow([sUrl, name, 'Unknown', accUrl, '']);
          existingUrls.push(sUrl);
          addedForThisAcc++;
          totalAdded++;
        }
      }
    } catch (e) {
      Logger.log('Errore su ' + accName + ': ' + e.message);
    }
  }
  SpreadsheetApp.getUi().alert('Scansione completata! Aggiunte ' + totalAdded + ' startup.');
}

function findPortfolioUrl(baseUrl) {
  var paths = ['/portfolio', '/companies', '/startups'];
  for (var i = 0; i < paths.length; i++) {
    var testUrl = baseUrl.replace(/\/$/, '') + paths[i];
    try {
      var res = UrlFetchApp.fetch(testUrl, { muteHttpExceptions: true, method: 'get' });
      if (res.getResponseCode() === 200) return testUrl;
    } catch (e) {}
  }
  return baseUrl;
}

function extractPotentialStartupLinks(html, accDomain) {
  var hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
  var links = [];
  var match;
  while ((match = hrefRegex.exec(html)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}