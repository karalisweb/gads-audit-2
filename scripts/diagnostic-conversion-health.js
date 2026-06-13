/**
 * DIAGNOSTICA (sola lettura) - Conversioni per AZIONE negli ultimi 30 giorni.
 * Serve a capire da quale query escono i numeri, per poi importare nell'app
 * lo stato "Inattiva" (azione primaria con 0 conversioni recenti).
 *
 * NON modifica nulla. Stampa solo nei Log.
 * Uso: Google Ads (Massimo Borio) > Strumenti > Script > nuovo > incolla > Esegui.
 * Poi copia TUTTO il Log qui in chat.
 */
function main() {
  Logger.log('===== DIAGNOSTICA SALUTE CONVERSIONI =====');
  Logger.log('Account: ' + AdsApp.currentAccount().getName());

  // Tentativo 1: metriche direttamente sulla risorsa conversion_action
  Logger.log('\n--- [1] FROM conversion_action + metrics (30gg) ---');
  try {
    var q1 = 'SELECT conversion_action.name, conversion_action.status, ' +
             'conversion_action.primary_for_goal, metrics.all_conversions ' +
             'FROM conversion_action WHERE segments.date DURING LAST_30_DAYS';
    var r1 = AdsApp.report(q1).rows();
    var n1 = 0;
    while (r1.hasNext()) {
      var a = r1.next(); n1++;
      Logger.log('NAME=' + a['conversion_action.name'] +
        ' | status=' + a['conversion_action.status'] +
        ' | primary=' + a['conversion_action.primary_for_goal'] +
        ' | all_conversions=' + a['metrics.all_conversions']);
    }
    Logger.log('[1] righe: ' + n1);
  } catch (e) {
    Logger.log('[1] ERRORE: ' + e.message);
  }

  // Tentativo 2: senza date range (totali lifetime)
  Logger.log('\n--- [2] FROM conversion_action + metrics (senza date) ---');
  try {
    var q2 = 'SELECT conversion_action.name, metrics.all_conversions FROM conversion_action';
    var r2 = AdsApp.report(q2).rows();
    var n2 = 0;
    while (r2.hasNext()) {
      var b = r2.next(); n2++;
      Logger.log('NAME=' + b['conversion_action.name'] + ' | all_conversions=' + b['metrics.all_conversions']);
    }
    Logger.log('[2] righe: ' + n2);
  } catch (e) {
    Logger.log('[2] ERRORE: ' + e.message);
  }

  // Tentativo 3: segmentato per nome azione su una risorsa con metriche
  Logger.log('\n--- [3] FROM customer + segments.conversion_action_name (30gg) ---');
  try {
    var q3 = 'SELECT segments.conversion_action_name, metrics.all_conversions ' +
             'FROM customer WHERE segments.date DURING LAST_30_DAYS';
    var r3 = AdsApp.report(q3).rows();
    var n3 = 0;
    while (r3.hasNext()) {
      var c = r3.next(); n3++;
      Logger.log('NAME=' + c['segments.conversion_action_name'] + ' | all_conversions=' + c['metrics.all_conversions']);
    }
    Logger.log('[3] righe: ' + n3);
  } catch (e) {
    Logger.log('[3] ERRORE: ' + e.message);
  }

  Logger.log('\n===== FINE DIAGNOSTICA =====');
}
