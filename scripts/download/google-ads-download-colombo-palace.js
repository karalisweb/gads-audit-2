/**
 * GADS Audit 2.0 - Google Ads Download Script
 *
 * ACCOUNT: COLOMBO PALACE
 * ULTIMA MODIFICA: 2026-02-12
 *
 * Questo script estrae dati dall'account Google Ads e li invia all'app di audit
 * tramite HTTPS POST con autenticazione HMAC-SHA256.
 *
 * ISTRUZIONI:
 * 1. Copia questo script in Google Ads > Strumenti e impostazioni > Script
 * 2. Esegui lo script manualmente o schedulalo
 */

// =============================================================================
// CONFIGURAZIONE - COLOMBO PALACE
// =============================================================================
var CONFIG = {
  ENDPOINT_URL: 'https://gads.karalisdemo.it/api/integrations/google-ads/ingest',
  SHARED_SECRET: '08d11a860f005a3dcac7dfc880b82980fc701182ce426593e010284d7c48ebe4',
  DATE_RANGE: {
    START: getDateNDaysAgo(30),
    END: getDateNDaysAgo(1)
  },
  CHUNK_SIZE: 50,
  HTTP_TIMEOUT: 60000,
  DATASETS: [
    'campaigns',
    'ad_groups',
    'ads',
    'keywords',
    'search_terms',
    'negative_keywords',
    'assets',
    'conversion_actions',
    'geo_performance',
    'device_performance'
  ],
  EXCLUDE_PMAX: true,
  APPLY_MODIFICATIONS: true
};

function main() {
  var accountId = AdsApp.currentAccount().getCustomerId();
  var accountName = AdsApp.currentAccount().getName();
  var runId = generateRunId();

  Logger.log('========================================');
  Logger.log('GADS Audit 2.0 - Download Script');
  Logger.log('========================================');
  Logger.log('Account: ' + accountName + ' (' + accountId + ')');
  Logger.log('Run ID: ' + runId);
  Logger.log('Date Range: ' + CONFIG.DATE_RANGE.START + ' - ' + CONFIG.DATE_RANGE.END);
  Logger.log('========================================');

  var datasetsToExport = CONFIG.DATASETS;
  var totalDatasets = datasetsToExport.length;

  for (var i = 0; i < datasetsToExport.length; i++) {
    var dataset = datasetsToExport[i];
    Logger.log('\nExporting dataset: ' + dataset + ' (' + (i + 1) + '/' + totalDatasets + ')');

    try {
      exportDataset(accountId, runId, dataset, totalDatasets);
      Logger.log('  > Completed');
    } catch (e) {
      Logger.log('  > ERROR: ' + e.message);
    }
  }

  Logger.log('\n========================================');
  Logger.log('Export completed');
  Logger.log('========================================');

  if (CONFIG.APPLY_MODIFICATIONS) {
    applyPendingModifications();
  }
}

function exportDataset(accountId, runId, datasetName, totalDatasets) {
  var data = [];

  switch (datasetName) {
    case 'campaigns': data = extractCampaigns(); break;
    case 'ad_groups': data = extractAdGroups(); break;
    case 'ads': data = extractAds(); break;
    case 'keywords': data = extractKeywords(); break;
    case 'search_terms': data = extractSearchTerms(); break;
    case 'negative_keywords': data = extractNegativeKeywords(); break;
    case 'assets': data = extractAssets(); break;
    case 'conversion_actions': data = extractConversionActions(); break;
    case 'geo_performance': data = extractGeoPerformance(); break;
    case 'device_performance': data = extractDevicePerformance(); break;
    default: Logger.log('  > Unknown dataset: ' + datasetName); return;
  }

  Logger.log('  > Extracted ' + data.length + ' rows');

  if (data.length === 0) {
    sendChunk(accountId, runId, datasetName, [], 0, 1, totalDatasets);
    return;
  }

  var chunks = chunkArray(data, CONFIG.CHUNK_SIZE);
  Logger.log('  > Sending ' + chunks.length + ' chunks');

  for (var i = 0; i < chunks.length; i++) {
    sendChunk(accountId, runId, datasetName, chunks[i], i, chunks.length, totalDatasets);
    Logger.log('    - Chunk ' + (i + 1) + '/' + chunks.length + ' sent');
    if (i < chunks.length - 1) Utilities.sleep(500);
  }
}

function extractCampaigns() {
  var campaigns = [];
  var query = 'SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.bidding_strategy_type, campaign.target_cpa.target_cpa_micros, campaign.target_roas.target_roas, campaign_budget.amount_micros, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc, metrics.search_impression_share, metrics.search_rank_lost_impression_share, metrics.search_budget_lost_impression_share, metrics.search_top_impression_share, metrics.search_absolute_top_impression_share, metrics.top_impression_percentage, metrics.absolute_top_impression_percentage, metrics.phone_calls, metrics.phone_impressions FROM campaign WHERE segments.date BETWEEN "' + CONFIG.DATE_RANGE.START + '" AND "' + CONFIG.DATE_RANGE.END + '" ' + (CONFIG.EXCLUDE_PMAX ? 'AND campaign.advertising_channel_type != "PERFORMANCE_MAX" ' : '') + 'AND campaign.status != "REMOVED"';

  var rows = AdsApp.report(query).rows();
  while (rows.hasNext()) {
    var row = rows.next();
    campaigns.push({
      campaign_id: row['campaign.id'],
      campaign_name: row['campaign.name'],
      status: row['campaign.status'],
      advertising_channel_type: row['campaign.advertising_channel_type'],
      bidding_strategy_type: row['campaign.bidding_strategy_type'],
      target_cpa_micros: row['campaign.target_cpa.target_cpa_micros'] || null,
      target_roas: row['campaign.target_roas.target_roas'] || null,
      budget_micros: row['campaign_budget.amount_micros'] || null,
      impressions: parseInt(row['metrics.impressions']) || 0,
      clicks: parseInt(row['metrics.clicks']) || 0,
      cost_micros: parseInt(row['metrics.cost_micros']) || 0,
      conversions: parseFloat(row['metrics.conversions']) || 0,
      conversions_value: parseFloat(row['metrics.conversions_value']) || 0,
      ctr: parseFloat(row['metrics.ctr']) || 0,
      average_cpc_micros: parseInt(row['metrics.average_cpc']) || 0,
      search_impression_share: parseFloat(row['metrics.search_impression_share']) || null,
      search_impression_share_lost_rank: parseFloat(row['metrics.search_rank_lost_impression_share']) || null,
      search_impression_share_lost_budget: parseFloat(row['metrics.search_budget_lost_impression_share']) || null,
      search_top_impression_share: parseFloat(row['metrics.search_top_impression_share']) || null,
      search_absolute_top_impression_share: parseFloat(row['metrics.search_absolute_top_impression_share']) || null,
      top_impression_percentage: parseFloat(row['metrics.top_impression_percentage']) || null,
      absolute_top_impression_percentage: parseFloat(row['metrics.absolute_top_impression_percentage']) || null,
      phone_calls: parseInt(row['metrics.phone_calls']) || 0,
      phone_impressions: parseInt(row['metrics.phone_impressions']) || 0,
      message_chats: 0,
      message_impressions: 0
    });
  }
  return campaigns;
}

function extractAdGroups() {
  var adGroups = [];
  var query = 'SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.type, ad_group.cpc_bid_micros, ad_group.target_cpa_micros, campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc, metrics.search_impression_share, metrics.search_rank_lost_impression_share FROM ad_group WHERE segments.date BETWEEN "' + CONFIG.DATE_RANGE.START + '" AND "' + CONFIG.DATE_RANGE.END + '" ' + (CONFIG.EXCLUDE_PMAX ? 'AND campaign.advertising_channel_type != "PERFORMANCE_MAX" ' : '') + 'AND ad_group.status != "REMOVED"';

  var rows = AdsApp.report(query).rows();
  while (rows.hasNext()) {
    var row = rows.next();
    adGroups.push({
      ad_group_id: row['ad_group.id'],
      ad_group_name: row['ad_group.name'],
      campaign_id: row['campaign.id'],
      campaign_name: row['campaign.name'],
      status: row['ad_group.status'],
      type: row['ad_group.type'],
      cpc_bid_micros: row['ad_group.cpc_bid_micros'] || null,
      target_cpa_micros: row['ad_group.target_cpa_micros'] || null,
      impressions: parseInt(row['metrics.impressions']) || 0,
      clicks: parseInt(row['metrics.clicks']) || 0,
      cost_micros: parseInt(row['metrics.cost_micros']) || 0,
      conversions: parseFloat(row['metrics.conversions']) || 0,
      conversions_value: parseFloat(row['metrics.conversions_value']) || 0,
      ctr: parseFloat(row['metrics.ctr']) || 0,
      average_cpc_micros: parseInt(row['metrics.average_cpc']) || 0,
      search_impression_share: parseFloat(row['metrics.search_impression_share']) || null,
      search_impression_share_lost_rank: parseFloat(row['metrics.search_rank_lost_impression_share']) || null,
      search_impression_share_lost_budget: null,
      phone_calls: 0,
      message_chats: 0
    });
  }
  return adGroups;
}

function extractAds() {
  var ads = [];
  var query = 'SELECT ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.status, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions, ad_group_ad.ad.final_urls, ad_group_ad.ad.responsive_search_ad.path1, ad_group_ad.ad.responsive_search_ad.path2, ad_group_ad.policy_summary.approval_status, ad_group_ad.ad_strength, ad_group.id, ad_group.name, campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc FROM ad_group_ad WHERE segments.date BETWEEN "' + CONFIG.DATE_RANGE.START + '" AND "' + CONFIG.DATE_RANGE.END + '" ' + (CONFIG.EXCLUDE_PMAX ? 'AND campaign.advertising_channel_type != "PERFORMANCE_MAX" ' : '') + 'AND ad_group_ad.status != "REMOVED"';

  var rows = AdsApp.report(query).rows();
  while (rows.hasNext()) {
    var row = rows.next();
    var headlines = parseAdTextAssets(row['ad_group_ad.ad.responsive_search_ad.headlines']);
    var descriptions = parseAdTextAssets(row['ad_group_ad.ad.responsive_search_ad.descriptions']);
    var finalUrls = [];
    try {
      var finalUrlsRaw = row['ad_group_ad.ad.final_urls'];
      if (finalUrlsRaw) {
        if (typeof finalUrlsRaw === 'string') finalUrls = JSON.parse(finalUrlsRaw);
        else if (Array.isArray(finalUrlsRaw)) finalUrls = finalUrlsRaw;
      }
    } catch (e) {}

    ads.push({
      ad_id: row['ad_group_ad.ad.id'],
      ad_group_id: row['ad_group.id'],
      ad_group_name: row['ad_group.name'],
      campaign_id: row['campaign.id'],
      campaign_name: row['campaign.name'],
      ad_type: row['ad_group_ad.ad.type'],
      status: row['ad_group_ad.status'],
      approval_status: row['ad_group_ad.policy_summary.approval_status'],
      ad_strength: row['ad_group_ad.ad_strength'] || '',
      headlines: headlines,
      descriptions: descriptions,
      final_urls: finalUrls,
      path1: row['ad_group_ad.ad.responsive_search_ad.path1'] || '',
      path2: row['ad_group_ad.ad.responsive_search_ad.path2'] || '',
      impressions: parseInt(row['metrics.impressions']) || 0,
      clicks: parseInt(row['metrics.clicks']) || 0,
      cost_micros: parseInt(row['metrics.cost_micros']) || 0,
      conversions: parseFloat(row['metrics.conversions']) || 0,
      conversions_value: parseFloat(row['metrics.conversions_value']) || 0,
      ctr: parseFloat(row['metrics.ctr']) || 0,
      average_cpc_micros: parseInt(row['metrics.average_cpc']) || 0,
      phone_calls: 0,
      message_chats: 0
    });
  }
  return ads;
}

function parseAdTextAssets(rawValue) {
  if (!rawValue) return [];
  try {
    var parsed;
    if (typeof rawValue === 'string') {
      if (rawValue.trim() === '' || rawValue === '[]') return [];
      parsed = JSON.parse(rawValue);
    } else {
      parsed = rawValue;
    }
    if (Array.isArray(parsed)) {
      return parsed.map(function(item) {
        if (typeof item === 'string') return { text: item, pinnedField: null };
        if (item && typeof item === 'object') return { text: item.text || item.assetText || '', pinnedField: item.pinnedField || item.pinned_field || null };
        return { text: String(item), pinnedField: null };
      });
    }
    if (parsed && typeof parsed === 'object' && parsed.text) return [{ text: parsed.text, pinnedField: parsed.pinnedField || null }];
    return [];
  } catch (e) { return []; }
}

function extractKeywords() {
  var keywords = [];
  var query = 'SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status, ad_group_criterion.approval_status, ad_group_criterion.effective_cpc_bid_micros, ad_group_criterion.final_urls, ad_group_criterion.quality_info.quality_score, ad_group_criterion.quality_info.creative_quality_score, ad_group_criterion.quality_info.post_click_quality_score, ad_group_criterion.quality_info.search_predicted_ctr, ad_group.id, ad_group.name, campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc, metrics.search_impression_share, metrics.search_rank_lost_impression_share FROM keyword_view WHERE segments.date BETWEEN "' + CONFIG.DATE_RANGE.START + '" AND "' + CONFIG.DATE_RANGE.END + '" ' + (CONFIG.EXCLUDE_PMAX ? 'AND campaign.advertising_channel_type != "PERFORMANCE_MAX" ' : '') + 'AND ad_group_criterion.status != "REMOVED"';

  var rows = AdsApp.report(query).rows();
  while (rows.hasNext()) {
    var row = rows.next();
    var finalUrl = '';
    try {
      var finalUrlsRaw = row['ad_group_criterion.final_urls'];
      if (finalUrlsRaw) {
        var urls = typeof finalUrlsRaw === 'string' ? JSON.parse(finalUrlsRaw) : finalUrlsRaw;
        if (urls && urls.length > 0) finalUrl = urls[0];
      }
    } catch (e) {}

    keywords.push({
      keyword_id: row['ad_group_criterion.criterion_id'],
      keyword_text: row['ad_group_criterion.keyword.text'],
      match_type: row['ad_group_criterion.keyword.match_type'],
      ad_group_id: row['ad_group.id'],
      ad_group_name: row['ad_group.name'],
      campaign_id: row['campaign.id'],
      campaign_name: row['campaign.name'],
      status: row['ad_group_criterion.status'],
      approval_status: row['ad_group_criterion.approval_status'],
      cpc_bid_micros: row['ad_group_criterion.effective_cpc_bid_micros'] || null,
      final_url: finalUrl,
      quality_score: parseInt(row['ad_group_criterion.quality_info.quality_score']) || null,
      creative_relevance: row['ad_group_criterion.quality_info.creative_quality_score'] || '',
      landing_page_experience: row['ad_group_criterion.quality_info.post_click_quality_score'] || '',
      expected_ctr: row['ad_group_criterion.quality_info.search_predicted_ctr'] || '',
      impressions: parseInt(row['metrics.impressions']) || 0,
      clicks: parseInt(row['metrics.clicks']) || 0,
      cost_micros: parseInt(row['metrics.cost_micros']) || 0,
      conversions: parseFloat(row['metrics.conversions']) || 0,
      conversions_value: parseFloat(row['metrics.conversions_value']) || 0,
      ctr: parseFloat(row['metrics.ctr']) || 0,
      average_cpc_micros: parseInt(row['metrics.average_cpc']) || 0,
      search_impression_share: parseFloat(row['metrics.search_impression_share']) || null,
      search_impression_share_lost_rank: parseFloat(row['metrics.search_rank_lost_impression_share']) || null,
      search_impression_share_lost_budget: null,
      phone_calls: 0
    });
  }
  return keywords;
}

function extractSearchTerms() {
  var searchTerms = [];
  var query = 'SELECT search_term_view.search_term, search_term_view.status, ad_group.id, ad_group.name, campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc FROM search_term_view WHERE segments.date BETWEEN "' + CONFIG.DATE_RANGE.START + '" AND "' + CONFIG.DATE_RANGE.END + '" ' + (CONFIG.EXCLUDE_PMAX ? 'AND campaign.advertising_channel_type != "PERFORMANCE_MAX" ' : '');

  var rows = AdsApp.report(query).rows();
  while (rows.hasNext()) {
    var row = rows.next();
    searchTerms.push({
      search_term: row['search_term_view.search_term'],
      keyword_id: null,
      keyword_text: null,
      match_type_triggered: row['search_term_view.status'] || '',
      ad_group_id: row['ad_group.id'],
      ad_group_name: row['ad_group.name'],
      campaign_id: row['campaign.id'],
      campaign_name: row['campaign.name'],
      impressions: parseInt(row['metrics.impressions']) || 0,
      clicks: parseInt(row['metrics.clicks']) || 0,
      cost_micros: parseInt(row['metrics.cost_micros']) || 0,
      conversions: parseFloat(row['metrics.conversions']) || 0,
      conversions_value: parseFloat(row['metrics.conversions_value']) || 0,
      ctr: parseFloat(row['metrics.ctr']) || 0,
      average_cpc_micros: parseInt(row['metrics.average_cpc']) || 0
    });
  }
  return searchTerms;
}

function extractNegativeKeywords() {
  var negatives = [];

  var campaignQuery = 'SELECT campaign_criterion.criterion_id, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type, campaign.id, campaign.name FROM campaign_criterion WHERE campaign_criterion.type = "KEYWORD" AND campaign_criterion.negative = true ' + (CONFIG.EXCLUDE_PMAX ? 'AND campaign.advertising_channel_type != "PERFORMANCE_MAX" ' : '');
  var rows = AdsApp.report(campaignQuery).rows();
  while (rows.hasNext()) {
    var row = rows.next();
    negatives.push({ negative_keyword_id: row['campaign_criterion.criterion_id'], keyword_text: row['campaign_criterion.keyword.text'], match_type: row['campaign_criterion.keyword.match_type'], level: 'CAMPAIGN', campaign_id: row['campaign.id'], campaign_name: row['campaign.name'], ad_group_id: null, ad_group_name: null, shared_set_id: null, shared_set_name: null });
  }

  var adGroupQuery = 'SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group.id, ad_group.name, campaign.id, campaign.name FROM ad_group_criterion WHERE ad_group_criterion.type = "KEYWORD" AND ad_group_criterion.negative = true ' + (CONFIG.EXCLUDE_PMAX ? 'AND campaign.advertising_channel_type != "PERFORMANCE_MAX" ' : '');
  rows = AdsApp.report(adGroupQuery).rows();
  while (rows.hasNext()) {
    var row = rows.next();
    negatives.push({ negative_keyword_id: row['ad_group_criterion.criterion_id'], keyword_text: row['ad_group_criterion.keyword.text'], match_type: row['ad_group_criterion.keyword.match_type'], level: 'AD_GROUP', campaign_id: row['campaign.id'], campaign_name: row['campaign.name'], ad_group_id: row['ad_group.id'], ad_group_name: row['ad_group.name'], shared_set_id: null, shared_set_name: null });
  }

  try {
    var sharedQuery = 'SELECT shared_criterion.criterion_id, shared_criterion.keyword.text, shared_criterion.keyword.match_type, shared_set.id, shared_set.name FROM shared_criterion WHERE shared_criterion.type = "KEYWORD"';
    rows = AdsApp.report(sharedQuery).rows();
    while (rows.hasNext()) {
      var row = rows.next();
      negatives.push({ negative_keyword_id: row['shared_criterion.criterion_id'], keyword_text: row['shared_criterion.keyword.text'], match_type: row['shared_criterion.keyword.match_type'], level: 'SHARED_SET', campaign_id: null, campaign_name: null, ad_group_id: null, ad_group_name: null, shared_set_id: row['shared_set.id'], shared_set_name: row['shared_set.name'] });
    }
  } catch (e) {}

  return negatives;
}

function extractAssets() {
  var assets = [];
  var query = 'SELECT asset.id, asset.type, asset.text_asset.text, asset.sitelink_asset.description1, asset.sitelink_asset.description2, asset.sitelink_asset.link_text, asset.final_urls, asset.call_asset.phone_number, campaign_asset.status, campaign.id, campaign.advertising_channel_type, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.ctr FROM campaign_asset WHERE segments.date BETWEEN "' + CONFIG.DATE_RANGE.START + '" AND "' + CONFIG.DATE_RANGE.END + '" ' + (CONFIG.EXCLUDE_PMAX ? 'AND campaign.advertising_channel_type != "PERFORMANCE_MAX" ' : '');

  try {
    var rows = AdsApp.report(query).rows();
    while (rows.hasNext()) {
      var row = rows.next();
      var finalUrl = '';
      try { var urls = JSON.parse(row['asset.final_urls']); if (urls.length > 0) finalUrl = urls[0]; } catch (e) {}
      assets.push({ asset_id: row['asset.id'], asset_type: row['asset.type'], asset_text: row['asset.text_asset.text'] || row['asset.sitelink_asset.link_text'] || '', description1: row['asset.sitelink_asset.description1'] || '', description2: row['asset.sitelink_asset.description2'] || '', final_url: finalUrl, phone_number: row['asset.call_asset.phone_number'] || '', status: row['campaign_asset.status'], performance_label: '', source: '', linked_level: 'CAMPAIGN', campaign_id: row['campaign.id'], ad_group_id: null, impressions: parseInt(row['metrics.impressions']) || 0, clicks: parseInt(row['metrics.clicks']) || 0, cost_micros: parseInt(row['metrics.cost_micros']) || 0, conversions: parseFloat(row['metrics.conversions']) || 0, ctr: parseFloat(row['metrics.ctr']) || 0 });
    }
  } catch (e) {}
  return assets;
}

function extractConversionActions() {
  var conversions = [];
  var query = 'SELECT conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type, conversion_action.category, conversion_action.origin, conversion_action.counting_type, conversion_action.value_settings.default_value, conversion_action.value_settings.always_use_default_value, conversion_action.primary_for_goal FROM conversion_action WHERE conversion_action.status != "REMOVED"';

  var rows = AdsApp.report(query).rows();
  while (rows.hasNext()) {
    var row = rows.next();
    conversions.push({ conversion_action_id: row['conversion_action.id'], name: row['conversion_action.name'], status: row['conversion_action.status'], type: row['conversion_action.type'], category: row['conversion_action.category'], origin: row['conversion_action.origin'], counting_type: row['conversion_action.counting_type'], default_value: parseFloat(row['conversion_action.value_settings.default_value']) || null, always_use_default_value: row['conversion_action.value_settings.always_use_default_value'] === 'true', primary_for_goal: row['conversion_action.primary_for_goal'] === 'true', campaigns_using_count: 0 });
  }
  return conversions;
}

function extractGeoPerformance() {
  var geoData = [];
  var query = 'SELECT campaign.id, campaign.name, campaign.advertising_channel_type, geographic_view.location_type, geographic_view.country_criterion_id, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM geographic_view WHERE segments.date BETWEEN "' + CONFIG.DATE_RANGE.START + '" AND "' + CONFIG.DATE_RANGE.END + '" ' + (CONFIG.EXCLUDE_PMAX ? 'AND campaign.advertising_channel_type != "PERFORMANCE_MAX" ' : '');

  try {
    var rows = AdsApp.report(query).rows();
    while (rows.hasNext()) {
      var row = rows.next();
      geoData.push({ campaign_id: row['campaign.id'], campaign_name: row['campaign.name'], location_id: row['geographic_view.country_criterion_id'] || '', location_name: '', location_type: row['geographic_view.location_type'], is_targeted: true, bid_modifier: null, impressions: parseInt(row['metrics.impressions']) || 0, clicks: parseInt(row['metrics.clicks']) || 0, cost_micros: parseInt(row['metrics.cost_micros']) || 0, conversions: parseFloat(row['metrics.conversions']) || 0 });
    }
  } catch (e) {}
  return geoData;
}

function extractDevicePerformance() {
  var deviceData = [];
  var query = 'SELECT campaign.id, campaign.name, segments.device, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign WHERE segments.date BETWEEN "' + CONFIG.DATE_RANGE.START + '" AND "' + CONFIG.DATE_RANGE.END + '" ' + (CONFIG.EXCLUDE_PMAX ? 'AND campaign.advertising_channel_type != "PERFORMANCE_MAX" ' : '') + 'AND campaign.status != "REMOVED"';

  var rows = AdsApp.report(query).rows();
  while (rows.hasNext()) {
    var row = rows.next();
    deviceData.push({ campaign_id: row['campaign.id'], campaign_name: row['campaign.name'], device: row['segments.device'], bid_modifier: null, impressions: parseInt(row['metrics.impressions']) || 0, clicks: parseInt(row['metrics.clicks']) || 0, cost_micros: parseInt(row['metrics.cost_micros']) || 0, conversions: parseFloat(row['metrics.conversions']) || 0 });
  }
  return deviceData;
}

function sendChunk(accountId, runId, datasetName, data, chunkIndex, chunkTotal, datasetsExpected) {
  var timestamp = new Date().toISOString();
  var payload = { metadata: { runId: runId, datasetName: datasetName, chunkIndex: chunkIndex, chunkTotal: chunkTotal, rowCount: data.length, datasetsExpected: datasetsExpected, dateRangeStart: CONFIG.DATE_RANGE.START, dateRangeEnd: CONFIG.DATE_RANGE.END }, data: data };
  var bodyString = JSON.stringify(payload);
  var signature = computeHmacSignature(timestamp, bodyString);
  var options = { method: 'post', contentType: 'application/json', headers: { 'X-Timestamp': timestamp, 'X-Signature': signature, 'X-Account-Id': accountId.replace(/-/g, '') }, payload: bodyString, muteHttpExceptions: true, timeout: CONFIG.HTTP_TIMEOUT };
  var response = UrlFetchApp.fetch(CONFIG.ENDPOINT_URL, options);
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('HTTP ' + response.getResponseCode() + ': ' + response.getContentText());
  return JSON.parse(response.getContentText());
}

function computeHmacSignature(timestamp, body) {
  var signature = Utilities.computeHmacSha256Signature(timestamp + body, CONFIG.SHARED_SECRET, Utilities.Charset.UTF_8);
  return signature.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2); }).join('');
}

function generateRunId() {
  return 'run_' + AdsApp.currentAccount().getCustomerId().replace(/-/g, '') + '_' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd_HHmmss');
}

function getDateNDaysAgo(n) {
  var date = new Date();
  date.setDate(date.getDate() - n);
  return Utilities.formatDate(date, AdsApp.currentAccount().getTimeZone(), 'yyyy-MM-dd');
}

function chunkArray(array, size) {
  var chunks = [];
  for (var i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

// =============================================================================
// MODIFICATIONS PHASE
// =============================================================================

function applyPendingModifications() {
  var accountId = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');
  Logger.log('\n========================================');
  Logger.log('Applying Pending Modifications');
  Logger.log('========================================');

  var modifications = fetchPendingModifications(accountId);
  if (!modifications || modifications.length === 0) {
    Logger.log('No pending modifications found');
    return;
  }

  Logger.log('Found ' + modifications.length + ' pending modifications');

  for (var i = 0; i < modifications.length; i++) {
    var mod = modifications[i];
    Logger.log('\n[' + (i + 1) + '/' + modifications.length + '] Applying: ' + mod.modificationType);
    try {
      reportModificationStart(mod.id);
      var result = applyModification(mod);
      reportModificationResult(mod.id, result);
      Logger.log('  > ' + (result.success ? 'SUCCESS' : 'FAILED') + ': ' + result.message);
    } catch (e) {
      Logger.log('  > ERROR: ' + e.message);
      reportModificationResult(mod.id, { success: false, message: e.message });
    }
  }
  Logger.log('\nModifications completed');
}

function fetchPendingModifications(accountId) {
  var timestamp = new Date().toISOString();
  var url = CONFIG.ENDPOINT_URL.replace('/ingest', '/modifications/pending');
  var signature = computeHmacSignature(timestamp, '');
  var options = { method: 'get', headers: { 'X-Timestamp': timestamp, 'X-Signature': signature, 'X-Account-Id': accountId }, muteHttpExceptions: true, timeout: CONFIG.HTTP_TIMEOUT };
  try {
    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) return [];
    return JSON.parse(response.getContentText()).modifications || [];
  } catch (e) { return []; }
}

function reportModificationStart(modificationId) {
  var accountId = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');
  var timestamp = new Date().toISOString();
  var url = CONFIG.ENDPOINT_URL.replace('/ingest', '/modifications/' + modificationId + '/start');
  var signature = computeHmacSignature(timestamp, '');
  try { UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', headers: { 'X-Timestamp': timestamp, 'X-Signature': signature, 'X-Account-Id': accountId }, payload: '', muteHttpExceptions: true }); } catch (e) {}
}

function reportModificationResult(modificationId, result) {
  var accountId = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');
  var timestamp = new Date().toISOString();
  var url = CONFIG.ENDPOINT_URL.replace('/ingest', '/modifications/' + modificationId + '/result');
  var payload = JSON.stringify(result);
  var signature = computeHmacSignature(timestamp, payload);
  try { UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', headers: { 'X-Timestamp': timestamp, 'X-Signature': signature, 'X-Account-Id': accountId }, payload: payload, muteHttpExceptions: true }); } catch (e) {}
}

function applyModification(mod) {
  switch (mod.modificationType) {
    case 'campaign.budget': return applyCampaignBudget(mod);
    case 'campaign.status': return applyCampaignStatus(mod);
    case 'campaign.target_cpa': case 'campaign.target_roas': return { success: false, message: 'Requires Google Ads API' };
    case 'ad_group.status': return applyAdGroupStatus(mod);
    case 'ad_group.cpc_bid': return applyAdGroupCpcBid(mod);
    case 'keyword.status': return applyKeywordStatus(mod);
    case 'keyword.cpc_bid': return applyKeywordCpcBid(mod);
    case 'keyword.final_url': return applyKeywordFinalUrl(mod);
    case 'negative_keyword.add': return addNegativeKeyword(mod);
    case 'negative_keyword.remove': return { success: false, message: 'Requires Google Ads API' };
    case 'ad.status': return applyAdStatus(mod);
    case 'ad.headlines': case 'ad.descriptions': return { success: false, message: 'Requires Google Ads API' };
    case 'ad.final_url': return applyAdFinalUrl(mod);
    case 'conversion.primary': case 'conversion.default_value': return { success: false, message: 'Requires Google Ads API' };
    default: return { success: false, message: 'Unknown type: ' + mod.modificationType };
  }
}

function applyCampaignBudget(mod) {
  var it = AdsApp.campaigns().withCondition('CampaignId = ' + mod.entityId).get();
  if (!it.hasNext()) return { success: false, message: 'Campaign not found' };
  var c = it.next(); var b = c.getBudget(); var old = b.getAmount(); var nb = mod.afterValue.budget / 1000000;
  b.setAmount(nb);
  return { success: true, message: 'Budget: €' + old + ' -> €' + nb };
}

function applyCampaignStatus(mod) {
  var it = AdsApp.campaigns().withCondition('CampaignId = ' + mod.entityId).get();
  if (!it.hasNext()) return { success: false, message: 'Campaign not found' };
  var c = it.next(); var old = c.isEnabled() ? 'ENABLED' : 'PAUSED';
  if (mod.afterValue.status === 'ENABLED') c.enable(); else if (mod.afterValue.status === 'PAUSED') c.pause();
  return { success: true, message: 'Status: ' + old + ' -> ' + mod.afterValue.status };
}

function applyAdGroupStatus(mod) {
  var it = AdsApp.adGroups().withCondition('AdGroupId = ' + mod.entityId).get();
  if (!it.hasNext()) return { success: false, message: 'Ad Group not found' };
  var ag = it.next(); var old = ag.isEnabled() ? 'ENABLED' : 'PAUSED';
  if (mod.afterValue.status === 'ENABLED') ag.enable(); else if (mod.afterValue.status === 'PAUSED') ag.pause();
  return { success: true, message: 'Status: ' + old + ' -> ' + mod.afterValue.status };
}

function applyAdGroupCpcBid(mod) {
  var it = AdsApp.adGroups().withCondition('AdGroupId = ' + mod.entityId).get();
  if (!it.hasNext()) return { success: false, message: 'Ad Group not found' };
  try { it.next().bidding().setCpc(mod.afterValue.cpcBid / 1000000); return { success: true, message: 'CPC bid updated' }; }
  catch (e) { return { success: false, message: e.message }; }
}

function applyKeywordStatus(mod) {
  var it = AdsApp.keywords().withCondition('Id = ' + mod.entityId).get();
  if (!it.hasNext()) return { success: false, message: 'Keyword not found' };
  var kw = it.next(); var old = kw.isEnabled() ? 'ENABLED' : 'PAUSED';
  if (mod.afterValue.status === 'ENABLED') kw.enable(); else if (mod.afterValue.status === 'PAUSED') kw.pause();
  return { success: true, message: 'Status: ' + old + ' -> ' + mod.afterValue.status };
}

function applyKeywordCpcBid(mod) {
  var it = AdsApp.keywords().withCondition('Id = ' + mod.entityId).get();
  if (!it.hasNext()) return { success: false, message: 'Keyword not found' };
  try { it.next().bidding().setCpc(mod.afterValue.cpcBid / 1000000); return { success: true, message: 'CPC bid updated' }; }
  catch (e) { return { success: false, message: e.message }; }
}

function applyKeywordFinalUrl(mod) {
  var it = AdsApp.keywords().withCondition('Id = ' + mod.entityId).get();
  if (!it.hasNext()) return { success: false, message: 'Keyword not found' };
  try { it.next().urls().setFinalUrl(mod.afterValue.finalUrl); return { success: true, message: 'URL updated' }; }
  catch (e) { return { success: false, message: e.message }; }
}

function addNegativeKeyword(mod) {
  var text = mod.afterValue.text; var mt = mod.afterValue.matchType || 'BROAD'; var level = mod.afterValue.level || 'CAMPAIGN';
  var fmt = mt === 'EXACT' ? '[' + text + ']' : mt === 'PHRASE' ? '"' + text + '"' : text;
  try {
    if (level === 'CAMPAIGN') {
      var it = AdsApp.campaigns().withCondition('CampaignId = ' + mod.afterValue.campaignId).get();
      if (!it.hasNext()) return { success: false, message: 'Campaign not found' };
      it.next().createNegativeKeyword(fmt);
    } else {
      var it = AdsApp.adGroups().withCondition('AdGroupId = ' + mod.afterValue.adGroupId).get();
      if (!it.hasNext()) return { success: false, message: 'Ad Group not found' };
      it.next().createNegativeKeyword(fmt);
    }
    return { success: true, message: 'Negative keyword added: ' + fmt };
  } catch (e) { return { success: false, message: e.message }; }
}

function applyAdStatus(mod) {
  var it = AdsApp.ads().withCondition('Id = ' + mod.entityId).get();
  if (!it.hasNext()) return { success: false, message: 'Ad not found' };
  var ad = it.next(); var old = ad.isEnabled() ? 'ENABLED' : 'PAUSED';
  if (mod.afterValue.status === 'ENABLED') ad.enable(); else if (mod.afterValue.status === 'PAUSED') ad.pause();
  return { success: true, message: 'Status: ' + old + ' -> ' + mod.afterValue.status };
}

function applyAdFinalUrl(mod) {
  var it = AdsApp.ads().withCondition('Id = ' + mod.entityId).get();
  if (!it.hasNext()) return { success: false, message: 'Ad not found' };
  try { it.next().urls().setFinalUrl(mod.afterValue.finalUrl); return { success: true, message: 'URL updated' }; }
  catch (e) { return { success: false, message: e.message }; }
}
