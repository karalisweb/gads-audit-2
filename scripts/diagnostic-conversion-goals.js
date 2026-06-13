/**
 * DIAGNOSTICA (sola lettura) - Stato Primarie/Secondarie delle conversioni
 * ------------------------------------------------------------------------
 * Scopo: capire da QUALE campo Google deriva il "Primarie/Secondario" che
 * vedi nell'interfaccia, perche' conversion_action.primary_for_goal torna
 * sempre false anche per le azioni primarie (modello "obiettivi di conversione").
 *
 * Non modifica NULLA. Si limita a stampare nei Log.
 *
 * Come usarlo:
 *   1. Google Ads (account Massimo Borio) > Strumenti > Azioni collettive > Script
 *   2. Nuovo script > incolla tutto questo > Autorizza > Esegui (anche "Anteprima")
 *   3. Apri "Log" / "Cronologia" e copia TUTTO l'output qui in chat.
 */
function main() {
  Logger.log('===== DIAGNOSTICA CONVERSIONI - INIZIO =====');
  Logger.log('Account: ' + AdsApp.currentAccount().getName() + ' (' + AdsApp.currentAccount().getCustomerId() + ')');

  // [1] Azioni di conversione: valore GREZZO di primary_for_goal + category/origin
  Logger.log('\n--- [1] CONVERSION ACTIONS (valore grezzo primary_for_goal) ---');
  try {
    var q1 = 'SELECT conversion_action.name, conversion_action.category, conversion_action.origin, ' +
             'conversion_action.primary_for_goal, conversion_action.status, conversion_action.type ' +
             'FROM conversion_action WHERE conversion_action.status != "REMOVED"';
    var r1 = AdsApp.report(q1).rows();
    while (r1.hasNext()) {
      var a = r1.next();
      Logger.log('NAME=' + a['conversion_action.name'] +
        ' | CAT=' + a['conversion_action.category'] +
        ' | ORIGIN=' + a['conversion_action.origin'] +
        ' | primary_for_goal=' + a['conversion_action.primary_for_goal'] +
        ' | status=' + a['conversion_action.status'] +
        ' | type=' + a['conversion_action.type']);
    }
  } catch (e) { Logger.log('ERRORE [1]: ' + e.message); }

  // [2] Customer conversion goals (livello ACCOUNT): biddable=true => Primario
  Logger.log('\n--- [2] CUSTOMER CONVERSION GOALS (biddable = Primario) ---');
  try {
    var q2 = 'SELECT customer_conversion_goal.category, customer_conversion_goal.origin, ' +
             'customer_conversion_goal.biddable FROM customer_conversion_goal';
    var r2 = AdsApp.report(q2).rows();
    var n2 = 0;
    while (r2.hasNext()) {
      var g = r2.next(); n2++;
      Logger.log('CAT=' + g['customer_conversion_goal.category'] +
        ' | ORIGIN=' + g['customer_conversion_goal.origin'] +
        ' | biddable=' + g['customer_conversion_goal.biddable']);
    }
    if (n2 === 0) Logger.log('(nessuna riga)');
  } catch (e) { Logger.log('ERRORE [2]: ' + e.message); }

  // [3] Campaign conversion goals (override per campagna: usato dai goal personalizzati)
  Logger.log('\n--- [3] CAMPAIGN CONVERSION GOALS (override per campagna) ---');
  try {
    var q3 = 'SELECT campaign.id, campaign.name, campaign_conversion_goal.category, ' +
             'campaign_conversion_goal.origin, campaign_conversion_goal.biddable ' +
             'FROM campaign_conversion_goal';
    var r3 = AdsApp.report(q3).rows();
    var n3 = 0;
    while (r3.hasNext()) {
      var c = r3.next(); n3++;
      Logger.log('CAMP=' + c['campaign.name'] +
        ' | CAT=' + c['campaign_conversion_goal.category'] +
        ' | ORIGIN=' + c['campaign_conversion_goal.origin'] +
        ' | biddable=' + c['campaign_conversion_goal.biddable']);
    }
    if (n3 === 0) Logger.log('(nessuna riga)');
  } catch (e) { Logger.log('ERRORE [3]: ' + e.message); }

  // [4] Config goal per campagna: capire se le campagne usano goal personalizzati (es. "Contatto")
  Logger.log('\n--- [4] CONVERSION GOAL CAMPAIGN CONFIG (tipo di goal usato) ---');
  try {
    var q4 = 'SELECT campaign.id, campaign.name, ' +
             'conversion_goal_campaign_config.goal_config_level, ' +
             'conversion_goal_campaign_config.custom_conversion_goal ' +
             'FROM conversion_goal_campaign_config';
    var r4 = AdsApp.report(q4).rows();
    var n4 = 0;
    while (r4.hasNext()) {
      var cc = r4.next(); n4++;
      Logger.log('CAMP=' + cc['campaign.name'] +
        ' | level=' + cc['conversion_goal_campaign_config.goal_config_level'] +
        ' | customGoal=' + cc['conversion_goal_campaign_config.custom_conversion_goal']);
    }
    if (n4 === 0) Logger.log('(nessuna riga)');
  } catch (e) { Logger.log('ERRORE [4]: ' + e.message); }

  Logger.log('\n===== DIAGNOSTICA CONVERSIONI - FINE =====');
}
