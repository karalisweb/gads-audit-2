/**
 * Google Ads Modifications Handler
 *
 * Questo file contiene le funzioni per applicare modifiche a Google Ads
 * ricevute dal backend GADS Audit.
 *
 * DA AGGIUNGERE AL FILE google-ads-exporter-*.js
 *
 * NOTA: Queste funzioni usano l'API AdsApp che è disponibile solo
 * nell'ambiente Google Ads Scripts.
 */

// =============================================================================
// CONFIGURAZIONE MODIFICHE
// =============================================================================

// Aggiungere a CONFIG esistente:
// MODIFICATIONS_ENDPOINT: 'https://gads.karalisdemo.it/api/integrations/google-ads/modifications',

// =============================================================================
// FUNZIONI MODIFICHE - DA AGGIUNGERE ALLO SCRIPT ESISTENTE
// =============================================================================

/**
 * Fase APPLY: Scarica e applica le modifiche pendenti dal backend
 * Chiamare questa funzione in main() dopo l'export dei dati
 */
function applyPendingModifications() {
  var accountId = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');

  Logger.log('\n========================================');
  Logger.log('Applying Pending Modifications');
  Logger.log('========================================');

  // 1. Fetch pending modifications from backend
  var modifications = fetchPendingModifications(accountId);

  if (!modifications || modifications.length === 0) {
    Logger.log('No pending modifications found');
    return;
  }

  Logger.log('Found ' + modifications.length + ' pending modifications');

  // 2. Apply each modification
  for (var i = 0; i < modifications.length; i++) {
    var mod = modifications[i];
    Logger.log('\n[' + (i + 1) + '/' + modifications.length + '] Applying: ' + mod.modificationType);
    Logger.log('  Entity: ' + mod.entityType + ' (' + mod.entityId + ')');

    try {
      // Mark as processing
      reportModificationStart(mod.id);

      // Apply the modification
      var result = applyModification(mod);

      // Report result
      reportModificationResult(mod.id, result);

      if (result.success) {
        Logger.log('  > SUCCESS: ' + result.message);
      } else {
        Logger.log('  > FAILED: ' + result.message);
      }
    } catch (e) {
      Logger.log('  > ERROR: ' + e.message);
      reportModificationResult(mod.id, {
        success: false,
        message: e.message,
        details: { error: e.toString() }
      });
    }
  }

  Logger.log('\n========================================');
  Logger.log('Modifications completed');
  Logger.log('========================================');
}

/**
 * Fetch pending modifications from backend
 */
function fetchPendingModifications(accountId) {
  var timestamp = new Date().toISOString();
  var url = CONFIG.ENDPOINT_URL.replace('/ingest', '/modifications/pending');

  // Create signature for GET request (body is empty)
  var signature = computeHmacSignature(timestamp, '');

  var options = {
    method: 'get',
    headers: {
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'X-Account-Id': accountId
    },
    muteHttpExceptions: true,
    timeout: CONFIG.HTTP_TIMEOUT
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();

    if (responseCode < 200 || responseCode >= 300) {
      Logger.log('Error fetching modifications: HTTP ' + responseCode);
      return [];
    }

    var data = JSON.parse(response.getContentText());
    return data.modifications || [];
  } catch (e) {
    Logger.log('Error fetching modifications: ' + e.message);
    return [];
  }
}

/**
 * Report that modification is starting
 */
function reportModificationStart(modificationId) {
  var accountId = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');
  var timestamp = new Date().toISOString();
  var url = CONFIG.ENDPOINT_URL.replace('/ingest', '/modifications/' + modificationId + '/start');

  var signature = computeHmacSignature(timestamp, '');

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'X-Account-Id': accountId
    },
    payload: '',
    muteHttpExceptions: true,
    timeout: CONFIG.HTTP_TIMEOUT
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log('Warning: Could not report modification start: ' + e.message);
  }
}

/**
 * Report modification result to backend
 */
function reportModificationResult(modificationId, result) {
  var accountId = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');
  var timestamp = new Date().toISOString();
  var url = CONFIG.ENDPOINT_URL.replace('/ingest', '/modifications/' + modificationId + '/result');

  var payload = JSON.stringify(result);
  var signature = computeHmacSignature(timestamp, payload);

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'X-Account-Id': accountId
    },
    payload: payload,
    muteHttpExceptions: true,
    timeout: CONFIG.HTTP_TIMEOUT
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log('Warning: Could not report modification result: ' + e.message);
  }
}

/**
 * Route modification to appropriate handler
 */
function applyModification(mod) {
  var type = mod.modificationType;

  switch (type) {
    // Campaign modifications
    case 'campaign.budget':
      return applyCampaignBudget(mod);
    case 'campaign.status':
      return applyCampaignStatus(mod);
    case 'campaign.target_cpa':
      return applyCampaignTargetCpa(mod);
    case 'campaign.target_roas':
      return applyCampaignTargetRoas(mod);

    // Ad Group modifications
    case 'ad_group.status':
      return applyAdGroupStatus(mod);
    case 'ad_group.cpc_bid':
      return applyAdGroupCpcBid(mod);

    // Keyword modifications
    case 'keyword.status':
      return applyKeywordStatus(mod);
    case 'keyword.cpc_bid':
      return applyKeywordCpcBid(mod);

    // Keyword Final URL
    case 'keyword.final_url':
      return applyKeywordFinalUrl(mod);

    // Negative keyword modifications
    case 'negative_keyword.add':
      return addNegativeKeyword(mod);
    case 'negative_keyword.remove':
      return removeNegativeKeyword(mod);

    // Ad modifications
    case 'ad.status':
      return applyAdStatus(mod);
    case 'ad.headlines':
      return applyAdHeadlines(mod);
    case 'ad.descriptions':
      return applyAdDescriptions(mod);
    case 'ad.final_url':
      return applyAdFinalUrl(mod);

    // Conversion Action modifications
    case 'conversion.primary':
      return applyConversionPrimary(mod);
    case 'conversion.default_value':
      return applyConversionDefaultValue(mod);

    default:
      return {
        success: false,
        message: 'Unknown modification type: ' + type
      };
  }
}

// =============================================================================
// CAMPAIGN MODIFICATIONS
// =============================================================================

function applyCampaignBudget(mod) {
  var campaignIterator = AdsApp.campaigns()
    .withCondition('CampaignId = ' + mod.entityId)
    .get();

  if (!campaignIterator.hasNext()) {
    return { success: false, message: 'Campaign not found: ' + mod.entityId };
  }

  var campaign = campaignIterator.next();
  var budget = campaign.getBudget();

  // afterValue.budget è in micros, setAmount vuole euro
  var newBudget = mod.afterValue.budget / 1000000;
  var oldBudget = budget.getAmount();

  budget.setAmount(newBudget);

  return {
    success: true,
    message: 'Budget updated from €' + oldBudget + ' to €' + newBudget,
    details: { oldBudget: oldBudget, newBudget: newBudget }
  };
}

function applyCampaignStatus(mod) {
  var campaignIterator = AdsApp.campaigns()
    .withCondition('CampaignId = ' + mod.entityId)
    .get();

  if (!campaignIterator.hasNext()) {
    return { success: false, message: 'Campaign not found: ' + mod.entityId };
  }

  var campaign = campaignIterator.next();
  var oldStatus = campaign.isEnabled() ? 'ENABLED' : 'PAUSED';
  var newStatus = mod.afterValue.status;

  if (newStatus === 'ENABLED') {
    campaign.enable();
  } else if (newStatus === 'PAUSED') {
    campaign.pause();
  } else {
    return { success: false, message: 'Invalid status: ' + newStatus };
  }

  return {
    success: true,
    message: 'Status changed from ' + oldStatus + ' to ' + newStatus,
    details: { oldStatus: oldStatus, newStatus: newStatus }
  };
}

function applyCampaignTargetCpa(mod) {
  var campaignIterator = AdsApp.campaigns()
    .withCondition('CampaignId = ' + mod.entityId)
    .get();

  if (!campaignIterator.hasNext()) {
    return { success: false, message: 'Campaign not found: ' + mod.entityId };
  }

  var campaign = campaignIterator.next();
  var biddingStrategy = campaign.getBiddingStrategyType();

  if (biddingStrategy !== 'TARGET_CPA' && biddingStrategy !== 'MAXIMIZE_CONVERSIONS') {
    return {
      success: false,
      message: 'Campaign bidding strategy is ' + biddingStrategy + ', not TARGET_CPA'
    };
  }

  // Nota: L'API AdsApp non supporta direttamente setTargetCpa()
  // Questa funzione richiede l'uso di Google Ads API diretta o mutate
  return {
    success: false,
    message: 'Target CPA modification requires Google Ads API (not available in Scripts)'
  };
}

function applyCampaignTargetRoas(mod) {
  // Simile a Target CPA - richiede Google Ads API
  return {
    success: false,
    message: 'Target ROAS modification requires Google Ads API (not available in Scripts)'
  };
}

// =============================================================================
// AD GROUP MODIFICATIONS
// =============================================================================

function applyAdGroupStatus(mod) {
  var adGroupIterator = AdsApp.adGroups()
    .withCondition('AdGroupId = ' + mod.entityId)
    .get();

  if (!adGroupIterator.hasNext()) {
    return { success: false, message: 'Ad Group not found: ' + mod.entityId };
  }

  var adGroup = adGroupIterator.next();
  var oldStatus = adGroup.isEnabled() ? 'ENABLED' : 'PAUSED';
  var newStatus = mod.afterValue.status;

  if (newStatus === 'ENABLED') {
    adGroup.enable();
  } else if (newStatus === 'PAUSED') {
    adGroup.pause();
  } else {
    return { success: false, message: 'Invalid status: ' + newStatus };
  }

  return {
    success: true,
    message: 'Status changed from ' + oldStatus + ' to ' + newStatus,
    details: { oldStatus: oldStatus, newStatus: newStatus }
  };
}

function applyAdGroupCpcBid(mod) {
  var adGroupIterator = AdsApp.adGroups()
    .withCondition('AdGroupId = ' + mod.entityId)
    .get();

  if (!adGroupIterator.hasNext()) {
    return { success: false, message: 'Ad Group not found: ' + mod.entityId };
  }

  var adGroup = adGroupIterator.next();

  // afterValue.cpcBid è in micros
  var newBid = mod.afterValue.cpcBid / 1000000;

  // Nota: L'API AdsApp potrebbe non supportare setBid() su tutti i tipi di campagna
  try {
    adGroup.bidding().setCpc(newBid);
    return {
      success: true,
      message: 'CPC bid updated to €' + newBid,
      details: { newBid: newBid }
    };
  } catch (e) {
    return {
      success: false,
      message: 'Could not set CPC bid: ' + e.message
    };
  }
}

// =============================================================================
// KEYWORD MODIFICATIONS
// =============================================================================

function applyKeywordStatus(mod) {
  var keywordIterator = AdsApp.keywords()
    .withCondition('Id = ' + mod.entityId)
    .get();

  if (!keywordIterator.hasNext()) {
    return { success: false, message: 'Keyword not found: ' + mod.entityId };
  }

  var keyword = keywordIterator.next();
  var oldStatus = keyword.isEnabled() ? 'ENABLED' : 'PAUSED';
  var newStatus = mod.afterValue.status;

  if (newStatus === 'ENABLED') {
    keyword.enable();
  } else if (newStatus === 'PAUSED') {
    keyword.pause();
  } else {
    return { success: false, message: 'Invalid status: ' + newStatus };
  }

  return {
    success: true,
    message: 'Status changed from ' + oldStatus + ' to ' + newStatus,
    details: { oldStatus: oldStatus, newStatus: newStatus }
  };
}

function applyKeywordCpcBid(mod) {
  var keywordIterator = AdsApp.keywords()
    .withCondition('Id = ' + mod.entityId)
    .get();

  if (!keywordIterator.hasNext()) {
    return { success: false, message: 'Keyword not found: ' + mod.entityId };
  }

  var keyword = keywordIterator.next();

  // afterValue.cpcBid è in micros
  var newBid = mod.afterValue.cpcBid / 1000000;

  try {
    keyword.bidding().setCpc(newBid);
    return {
      success: true,
      message: 'CPC bid updated to €' + newBid,
      details: { newBid: newBid }
    };
  } catch (e) {
    return {
      success: false,
      message: 'Could not set CPC bid: ' + e.message
    };
  }
}

// =============================================================================
// NEGATIVE KEYWORD MODIFICATIONS
// =============================================================================

function addNegativeKeyword(mod) {
  var text = mod.afterValue.text;
  var matchType = mod.afterValue.matchType || 'BROAD';
  var level = mod.afterValue.level || 'CAMPAIGN';

  try {
    if (level === 'CAMPAIGN') {
      var campaignIterator = AdsApp.campaigns()
        .withCondition('CampaignId = ' + mod.afterValue.campaignId)
        .get();

      if (!campaignIterator.hasNext()) {
        return { success: false, message: 'Campaign not found' };
      }

      var campaign = campaignIterator.next();

      // Formatta la keyword in base al match type
      var formattedKeyword = formatNegativeKeyword(text, matchType);
      campaign.createNegativeKeyword(formattedKeyword);

      return {
        success: true,
        message: 'Negative keyword added: ' + formattedKeyword,
        details: { keyword: text, matchType: matchType, level: level }
      };

    } else if (level === 'AD_GROUP') {
      var adGroupIterator = AdsApp.adGroups()
        .withCondition('AdGroupId = ' + mod.afterValue.adGroupId)
        .get();

      if (!adGroupIterator.hasNext()) {
        return { success: false, message: 'Ad Group not found' };
      }

      var adGroup = adGroupIterator.next();
      var formattedKeyword = formatNegativeKeyword(text, matchType);
      adGroup.createNegativeKeyword(formattedKeyword);

      return {
        success: true,
        message: 'Negative keyword added: ' + formattedKeyword,
        details: { keyword: text, matchType: matchType, level: level }
      };
    }

    return { success: false, message: 'Invalid level: ' + level };

  } catch (e) {
    return {
      success: false,
      message: 'Could not add negative keyword: ' + e.message
    };
  }
}

function removeNegativeKeyword(mod) {
  // L'API AdsApp non supporta la rimozione diretta di negative keywords
  // Richiede l'uso di Google Ads API
  return {
    success: false,
    message: 'Removing negative keywords requires Google Ads API (not available in Scripts)'
  };
}

/**
 * Formatta una keyword in base al match type
 */
function formatNegativeKeyword(text, matchType) {
  switch (matchType) {
    case 'EXACT':
      return '[' + text + ']';
    case 'PHRASE':
      return '"' + text + '"';
    case 'BROAD':
    default:
      return text;
  }
}

// =============================================================================
// KEYWORD FINAL URL MODIFICATIONS
// =============================================================================

function applyKeywordFinalUrl(mod) {
  var keywordIterator = AdsApp.keywords()
    .withCondition('Id = ' + mod.entityId)
    .get();

  if (!keywordIterator.hasNext()) {
    return { success: false, message: 'Keyword not found: ' + mod.entityId };
  }

  var keyword = keywordIterator.next();
  var newUrl = mod.afterValue.finalUrl;

  try {
    keyword.urls().setFinalUrl(newUrl);
    return {
      success: true,
      message: 'Final URL updated to: ' + newUrl,
      details: { newUrl: newUrl }
    };
  } catch (e) {
    return { success: false, message: 'Could not set final URL: ' + e.message };
  }
}

// =============================================================================
// AD MODIFICATIONS
// =============================================================================

function applyAdStatus(mod) {
  var adIterator = AdsApp.ads()
    .withCondition('Id = ' + mod.entityId)
    .get();

  if (!adIterator.hasNext()) {
    return { success: false, message: 'Ad not found: ' + mod.entityId };
  }

  var ad = adIterator.next();
  var oldStatus = ad.isEnabled() ? 'ENABLED' : 'PAUSED';
  var newStatus = mod.afterValue.status;

  if (newStatus === 'ENABLED') {
    ad.enable();
  } else if (newStatus === 'PAUSED') {
    ad.pause();
  } else {
    return { success: false, message: 'Invalid status: ' + newStatus };
  }

  return {
    success: true,
    message: 'Status changed from ' + oldStatus + ' to ' + newStatus,
    details: { oldStatus: oldStatus, newStatus: newStatus }
  };
}

function applyAdHeadlines(mod) {
  // Modifying ad headlines requires creating a new ad and pausing the old one
  // Google Ads Scripts doesn't support in-place editing of RSAs
  return {
    success: false,
    message: 'Modifying ad headlines requires Google Ads API (not available in Scripts). Consider creating a new ad with updated headlines.'
  };
}

function applyAdDescriptions(mod) {
  return {
    success: false,
    message: 'Modifying ad descriptions requires Google Ads API (not available in Scripts). Consider creating a new ad with updated descriptions.'
  };
}

function applyAdFinalUrl(mod) {
  var adIterator = AdsApp.ads()
    .withCondition('Id = ' + mod.entityId)
    .get();

  if (!adIterator.hasNext()) {
    return { success: false, message: 'Ad not found: ' + mod.entityId };
  }

  var ad = adIterator.next();
  var newUrl = mod.afterValue.finalUrl;

  try {
    ad.urls().setFinalUrl(newUrl);
    return {
      success: true,
      message: 'Final URL updated to: ' + newUrl,
      details: { newUrl: newUrl }
    };
  } catch (e) {
    return { success: false, message: 'Could not set final URL: ' + e.message };
  }
}

// =============================================================================
// CONVERSION ACTION MODIFICATIONS
// =============================================================================

function applyConversionPrimary(mod) {
  return {
    success: false,
    message: 'Modifying conversion action primary status requires Google Ads API (not available in Scripts)'
  };
}

function applyConversionDefaultValue(mod) {
  return {
    success: false,
    message: 'Modifying conversion default value requires Google Ads API (not available in Scripts)'
  };
}
