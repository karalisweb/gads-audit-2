/**
 * DIAGNOSTICA (sola lettura) - Conversioni per ENTITÀ x CANALE (azione di conversione)
 * Negli ultimi 30 giorni. Serve a confermare la GAQL per la feature
 * "quale keyword/campagna ha portato quale canale (chiamata/mail/form/WhatsApp)".
 *
 * NON modifica nulla. Stampa solo nei Log. Poi copia TUTTO il Log in chat.
 * Uso: Google Ads (un account con conversioni, es. Prestige NCC) > Script > incolla > Esegui.
 */
function main() {
  Logger.log('===== DIAGNOSTICA CONVERSIONI x CANALE =====');
  Logger.log('Account: ' + AdsApp.currentAccount().getName());

  // [1] Conversioni per KEYWORD x azione di conversione
  Logger.log('\n--- [1] KEYWORD x conversion_action (30gg, solo conv>0) ---');
  try {
    var q1 = 'SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ' +
             'segments.conversion_action_name, metrics.conversions ' +
             'FROM keyword_view WHERE segments.date DURING LAST_30_DAYS AND metrics.conversions > 0';
    var r1 = AdsApp.report(q1).rows();
    var n1 = 0;
    while (r1.hasNext()) {
      var a = r1.next(); n1++;
      Logger.log('KW=' + a['ad_group_criterion.keyword.text'] +
        ' | id=' + a['ad_group_criterion.criterion_id'] +
        ' | canale=' + a['segments.conversion_action_name'] +
        ' | conv=' + a['metrics.conversions']);
    }
    Logger.log('[1] righe: ' + n1);
  } catch (e) { Logger.log('[1] ERRORE: ' + e.message); }

  // [2] Conversioni per CAMPAGNA x azione di conversione
  Logger.log('\n--- [2] CAMPAGNA x conversion_action (30gg, solo conv>0) ---');
  try {
    var q2 = 'SELECT campaign.id, campaign.name, segments.conversion_action_name, metrics.conversions ' +
             'FROM campaign WHERE segments.date DURING LAST_30_DAYS AND metrics.conversions > 0';
    var r2 = AdsApp.report(q2).rows();
    var n2 = 0;
    while (r2.hasNext()) {
      var b = r2.next(); n2++;
      Logger.log('CAMP=' + b['campaign.name'] +
        ' | id=' + b['campaign.id'] +
        ' | canale=' + b['segments.conversion_action_name'] +
        ' | conv=' + b['metrics.conversions']);
    }
    Logger.log('[2] righe: ' + n2);
  } catch (e) { Logger.log('[2] ERRORE: ' + e.message); }

  Logger.log('\n===== FINE =====');
}
