/**
 * GADS Audit 2.0 - Google Ads Modifier Script
 *
 * ACCOUNT: OFFICINA 3MT (7050747943)
 *
 * Questo script legge le modifiche approvate dal backend GADS Audit
 * e le applica all'account Google Ads corrente.
 *
 * ISTRUZIONI:
 * 1. Copia questo script in Google Ads > Strumenti e impostazioni > Script
 * 2. Esegui lo script manualmente o schedulalo
 */

// ============================================================================
// CONFIGURAZIONE - OFFICINA 3MT
// ============================================================================
var CONFIG = {
  API_URL: 'https://gads.karalisdemo.it/api/integrations/google-ads',
  SHARED_SECRET: 'a8ae36e7635ef7962679f1bd73301c289885e9ff220b28a6af3a7f19444ebbf6',
  DRY_RUN: false
};

// ============================================================================
// FUNZIONI HELPER
// ============================================================================

function generateSignature(timestamp, body, secret) {
  var payload = timestamp + body;
  var signature = Utilities.computeHmacSha256Signature(payload, secret);
  return signature.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function apiRequest(method, endpoint, body) {
  var customerId = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');
  var timestamp = new Date().toISOString();
  var bodyStr = body ? JSON.stringify(body) : '{}';

  var signature = generateSignature(timestamp, bodyStr, CONFIG.SHARED_SECRET);

  var options = {
    method: method,
    contentType: 'application/json',
    headers: {
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'X-Account-Id': customerId
    },
    muteHttpExceptions: true
  };

  if (body && method !== 'GET') {
    options.payload = bodyStr;
  }

  var url = CONFIG.API_URL + endpoint;
  Logger.log('Calling: ' + method + ' ' + url);

  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (responseCode >= 200 && responseCode < 300) {
    return JSON.parse(responseText);
  } else {
    Logger.log('API Error ' + responseCode + ': ' + responseText);
    throw new Error('API Error ' + responseCode + ': ' + responseText);
  }
}

function getPendingModifications() {
  return apiRequest('GET', '/modifications/pending', null);
}

function markAsProcessing(modificationId) {
  return apiRequest('POST', '/modifications/' + modificationId + '/start', {});
}

function sendResult(modificationId, success, message, details) {
  return apiRequest('POST', '/modifications/' + modificationId + '/result', {
    success: success,
    message: message,
    details: details || {}
  });
}

// ============================================================================
// FUNZIONI DI MODIFICA GOOGLE ADS
// ============================================================================

function applyCampaignBudget(entityId, afterValue) {
  var campaignIterator = AdsApp.campaigns()
    .withCondition('campaign.id = ' + entityId)
    .get();

  if (!campaignIterator.hasNext()) {
    throw new Error('Campagna non trovata: ' + entityId);
  }

  var campaign = campaignIterator.next();
  var budget = campaign.getBudget();

  if (CONFIG.DRY_RUN) {
    Logger.log('[DRY RUN] Budget campagna ' + campaign.getName() + ': ' +
               budget.getAmount() + ' -> ' + afterValue.budgetMicros / 1000000);
    return { dryRun: true };
  }

  budget.setAmount(afterValue.budgetMicros / 1000000);

  return {
    previousValue: budget.getAmount(),
    newValue: afterValue.budgetMicros / 1000000
  };
}

function applyCampaignStatus(entityId, afterValue) {
  var campaignIterator = AdsApp.campaigns()
    .withCondition('campaign.id = ' + entityId)
    .get();

  if (!campaignIterator.hasNext()) {
    throw new Error('Campagna non trovata: ' + entityId);
  }

  var campaign = campaignIterator.next();

  if (CONFIG.DRY_RUN) {
    Logger.log('[DRY RUN] Stato campagna ' + campaign.getName() + ' -> ' + afterValue.status);
    return { dryRun: true };
  }

  if (afterValue.status === 'ENABLED') {
    campaign.enable();
  } else if (afterValue.status === 'PAUSED') {
    campaign.pause();
  }

  return { newStatus: afterValue.status };
}

function applyAdGroupStatus(entityId, afterValue) {
  var adGroupIterator = AdsApp.adGroups()
    .withCondition('ad_group.id = ' + entityId)
    .get();

  if (!adGroupIterator.hasNext()) {
    throw new Error('Gruppo annunci non trovato: ' + entityId);
  }

  var adGroup = adGroupIterator.next();

  if (CONFIG.DRY_RUN) {
    Logger.log('[DRY RUN] Stato gruppo ' + adGroup.getName() + ' -> ' + afterValue.status);
    return { dryRun: true };
  }

  if (afterValue.status === 'ENABLED') {
    adGroup.enable();
  } else if (afterValue.status === 'PAUSED') {
    adGroup.pause();
  }

  return { newStatus: afterValue.status };
}

function applyAdGroupCpcBid(entityId, afterValue) {
  var adGroupIterator = AdsApp.adGroups()
    .withCondition('ad_group.id = ' + entityId)
    .get();

  if (!adGroupIterator.hasNext()) {
    throw new Error('Gruppo annunci non trovato: ' + entityId);
  }

  var adGroup = adGroupIterator.next();

  if (CONFIG.DRY_RUN) {
    Logger.log('[DRY RUN] CPC bid gruppo ' + adGroup.getName() + ' -> ' + afterValue.cpcBidMicros / 1000000);
    return { dryRun: true };
  }

  adGroup.bidding().setCpc(afterValue.cpcBidMicros / 1000000);

  return { newCpcBid: afterValue.cpcBidMicros / 1000000 };
}

function applyKeywordStatus(entityId, afterValue) {
  var parts = entityId.split('~');
  if (parts.length !== 2) {
    throw new Error('Formato entityId keyword non valido: ' + entityId);
  }

  var adGroupId = parts[0];
  var criterionId = parts[1];

  var keywordIterator = AdsApp.keywords()
    .withCondition('ad_group.id = ' + adGroupId)
    .withCondition('ad_group_criterion.criterion_id = ' + criterionId)
    .get();

  if (!keywordIterator.hasNext()) {
    throw new Error('Keyword non trovata: ' + entityId);
  }

  var keyword = keywordIterator.next();

  if (CONFIG.DRY_RUN) {
    Logger.log('[DRY RUN] Stato keyword ' + keyword.getText() + ' -> ' + afterValue.status);
    return { dryRun: true };
  }

  if (afterValue.status === 'ENABLED') {
    keyword.enable();
  } else if (afterValue.status === 'PAUSED') {
    keyword.pause();
  }

  return { newStatus: afterValue.status };
}

function applyKeywordCpcBid(entityId, afterValue) {
  var parts = entityId.split('~');
  if (parts.length !== 2) {
    throw new Error('Formato entityId keyword non valido: ' + entityId);
  }

  var adGroupId = parts[0];
  var criterionId = parts[1];

  var keywordIterator = AdsApp.keywords()
    .withCondition('ad_group.id = ' + adGroupId)
    .withCondition('ad_group_criterion.criterion_id = ' + criterionId)
    .get();

  if (!keywordIterator.hasNext()) {
    throw new Error('Keyword non trovata: ' + entityId);
  }

  var keyword = keywordIterator.next();

  if (CONFIG.DRY_RUN) {
    Logger.log('[DRY RUN] CPC bid keyword ' + keyword.getText() + ' -> ' + afterValue.cpcBidMicros / 1000000);
    return { dryRun: true };
  }

  keyword.bidding().setCpc(afterValue.cpcBidMicros / 1000000);

  return { newCpcBid: afterValue.cpcBidMicros / 1000000 };
}

function applyNegativeKeywordAdd(entityId, afterValue) {
  var campaignIterator = AdsApp.campaigns()
    .withCondition('campaign.id = ' + entityId)
    .get();

  if (!campaignIterator.hasNext()) {
    throw new Error('Campagna non trovata: ' + entityId);
  }

  var campaign = campaignIterator.next();

  if (CONFIG.DRY_RUN) {
    Logger.log('[DRY RUN] Aggiungi negativa "' + afterValue.keyword + '" a campagna ' + campaign.getName());
    return { dryRun: true };
  }

  var matchType = afterValue.matchType || 'EXACT';
  var keywordText = afterValue.keyword;

  if (matchType === 'EXACT') {
    keywordText = '[' + keywordText + ']';
  } else if (matchType === 'PHRASE') {
    keywordText = '"' + keywordText + '"';
  }

  campaign.createNegativeKeyword(keywordText);

  return {
    keyword: afterValue.keyword,
    matchType: matchType,
    campaignName: campaign.getName()
  };
}

function applyAdStatus(entityId, afterValue) {
  var parts = entityId.split('~');
  if (parts.length !== 2) {
    throw new Error('Formato entityId annuncio non valido: ' + entityId);
  }

  var adGroupId = parts[0];
  var adId = parts[1];

  var adIterator = AdsApp.ads()
    .withCondition('ad_group.id = ' + adGroupId)
    .withCondition('ad_group_ad.ad.id = ' + adId)
    .get();

  if (!adIterator.hasNext()) {
    throw new Error('Annuncio non trovato: ' + entityId);
  }

  var ad = adIterator.next();

  if (CONFIG.DRY_RUN) {
    Logger.log('[DRY RUN] Stato annuncio -> ' + afterValue.status);
    return { dryRun: true };
  }

  if (afterValue.status === 'ENABLED') {
    ad.enable();
  } else if (afterValue.status === 'PAUSED') {
    ad.pause();
  }

  return { newStatus: afterValue.status };
}

function applyAdHeadlines(entityId, afterValue) {
  Logger.log('ATTENZIONE: La modifica dei titoli RSA richiede la creazione di un nuovo annuncio.');
  return {
    warning: 'RSA headline modification requires creating a new ad',
    headlines: afterValue.headlines
  };
}

function applyAdDescriptions(entityId, afterValue) {
  Logger.log('ATTENZIONE: La modifica delle descrizioni RSA richiede la creazione di un nuovo annuncio.');
  return {
    warning: 'RSA description modification requires creating a new ad',
    descriptions: afterValue.descriptions
  };
}

// ============================================================================
// DISPATCHER PRINCIPALE
// ============================================================================

function applyModification(modification) {
  var entityId = modification.entityId;
  var afterValue = modification.afterValue;
  var modType = modification.modificationType;

  Logger.log('Applicando modifica: ' + modType + ' su entità ' + entityId);

  switch (modType) {
    case 'campaign.budget':
      return applyCampaignBudget(entityId, afterValue);
    case 'campaign.status':
      return applyCampaignStatus(entityId, afterValue);
    case 'ad_group.status':
      return applyAdGroupStatus(entityId, afterValue);
    case 'ad_group.cpc_bid':
      return applyAdGroupCpcBid(entityId, afterValue);
    case 'keyword.status':
      return applyKeywordStatus(entityId, afterValue);
    case 'keyword.cpc_bid':
      return applyKeywordCpcBid(entityId, afterValue);
    case 'negative_keyword.add':
      return applyNegativeKeywordAdd(entityId, afterValue);
    case 'ad.status':
      return applyAdStatus(entityId, afterValue);
    case 'ad.headlines':
      return applyAdHeadlines(entityId, afterValue);
    case 'ad.descriptions':
      return applyAdDescriptions(entityId, afterValue);
    default:
      throw new Error('Tipo di modifica non supportato: ' + modType);
  }
}

// ============================================================================
// FUNZIONE PRINCIPALE
// ============================================================================

function main() {
  Logger.log('=================================================');
  Logger.log('GADS Audit 2.0 - Modifier Script');
  Logger.log('ACCOUNT CONFIGURATO: OFFICINA 3MT');
  Logger.log('Account corrente: ' + AdsApp.currentAccount().getName());
  Logger.log('Customer ID: ' + AdsApp.currentAccount().getCustomerId());
  Logger.log('Data: ' + new Date().toISOString());
  Logger.log('Dry Run: ' + CONFIG.DRY_RUN);
  Logger.log('=================================================');

  var currentCustomerId = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');
  if (currentCustomerId !== '7050747943') {
    Logger.log('ATTENZIONE: Questo script è configurato per OFFICINA 3MT (7050747943)');
    Logger.log('Account corrente: ' + currentCustomerId);
    Logger.log('Continuando comunque...');
  }

  try {
    Logger.log('\n1. Recupero modifiche approvate...');
    var response = getPendingModifications();
    var modifications = response.modifications || [];

    Logger.log('Trovate ' + modifications.length + ' modifiche da applicare');

    if (modifications.length === 0) {
      Logger.log('Nessuna modifica da applicare. Esco.');
      return;
    }

    var results = { success: 0, failed: 0, skipped: 0 };

    for (var i = 0; i < modifications.length; i++) {
      var mod = modifications[i];
      Logger.log('\n--- Modifica ' + (i + 1) + '/' + modifications.length + ' ---');
      Logger.log('ID: ' + mod.id);
      Logger.log('Tipo: ' + mod.modificationType);
      Logger.log('Entità: ' + mod.entityName + ' (' + mod.entityId + ')');

      try {
        if (!CONFIG.DRY_RUN) {
          markAsProcessing(mod.id);
        }

        var result = applyModification(mod);
        Logger.log('Risultato: ' + JSON.stringify(result));

        if (!CONFIG.DRY_RUN) {
          sendResult(mod.id, true, 'Modifica applicata con successo', result);
        }

        results.success++;

      } catch (error) {
        Logger.log('ERRORE: ' + error.message);

        if (!CONFIG.DRY_RUN) {
          try {
            sendResult(mod.id, false, error.message, { stack: error.stack });
          } catch (sendError) {
            Logger.log('Errore invio risultato: ' + sendError.message);
          }
        }

        results.failed++;
      }
    }

    Logger.log('\n=================================================');
    Logger.log('RIEPILOGO - OFFICINA 3MT');
    Logger.log('Successo: ' + results.success);
    Logger.log('Fallite: ' + results.failed);
    Logger.log('Saltate: ' + results.skipped);
    Logger.log('=================================================');

  } catch (error) {
    Logger.log('ERRORE FATALE: ' + error.message);
    Logger.log(error.stack);
  }
}
