# UI Improvements - Gennaio 2026

## Obiettivo
Migliorare l'interfaccia utente per ottimizzare lo spazio orizzontale e visualizzare tutte le colonne necessarie per l'analisi degli account Google Ads.

---

## 1. Sidebar Collassabile

### Problema
La sidebar fissa occupa 256px (w-64) di spazio orizzontale, riducendo lo spazio disponibile per le tabelle dati.

### Soluzione
- Implementato toggle sidebar con hamburger menu
- Hamburger posizionato in alto a destra quando sidebar chiusa
- Overlay scuro su mobile per chiudere sidebar cliccando fuori
- Stato persistito in localStorage tramite Zustand

### File modificati
- `frontend/src/stores/ui.store.ts` (nuovo)
- `frontend/src/components/Layout/Sidebar.tsx`
- `frontend/src/components/Layout/MainLayout.tsx`

---

## 2. Colonne Preset per Livello

### Colonne da implementare per ogni livello secondo il preset Google Ads:

#### Campagna
| Colonna | Campo DB | Stato |
|---------|----------|-------|
| Budget | budgetMicros | OK |
| Stato | status | OK |
| Punteggio di ottimizzazione | optimizationScore | DA AGGIUNGERE |
| Clic | clicks | OK |
| Impressioni | impressions | OK |
| CTR | ctr | OK |
| CPC medio | averageCpcMicros | OK |
| QI persa rete ricerca (ranking) | searchImpressionShareLostRank | DA VERIFICARE |
| QI superiore persa (ranking) | searchTopImpressionShareLostRank | DA VERIFICARE |
| QI sup. assoluta persa (ranking) | searchAbsoluteTopImpressionShareLostRank | DA VERIFICARE |
| QI persa rete ricerca (budget) | searchImpressionShareLostBudget | DA VERIFICARE |
| QI superiore persa (budget) | searchTopImpressionShareLostBudget | DA VERIFICARE |
| QI sup. assoluta persa (budget) | searchAbsoluteTopImpressionShareLostBudget | DA VERIFICARE |
| Telefonate | phoneCalls | OK |
| Impressioni telefono | phoneImpressions | DA VERIFICARE |
| Chat | messageChats | OK |
| Impressioni messaggi | messageImpressions | DA VERIFICARE |
| Lead da chiamata | callLeads | DA VERIFICARE |
| Tipo strategia offerta | biddingStrategyType | OK |
| Tutte le conversioni | allConversions | DA VERIFICARE |
| Valore/tutte le conversioni | allConversionsValue | DA VERIFICARE |
| Costo/tutte le conversioni | costPerAllConversions | CALCOLATO |
| Valore di tutte le conv./costo | allConversionsValuePerCost | CALCOLATO |
| Costo | costMicros | OK |
| % impr. (in cima) | topImpressionPercentage | DA VERIFICARE |
| % impr. (superiore) | absoluteTopImpressionPercentage | DA VERIFICARE |
| Tasso tutte le conversioni | allConversionsRate | CALCOLATO |
| Valore tutte le conv./clic | allConversionsValuePerClick | CALCOLATO |
| CPA target | targetCpaMicros | OK |

#### Gruppo di Annunci
| Colonna | Campo DB | Stato |
|---------|----------|-------|
| Campagna | campaignName | OK |
| Stato | status | OK |
| CPA target | targetCpaMicros | OK |
| Clic | clicks | OK |
| Impressioni | impressions | OK |
| CTR | ctr | OK |
| CPC medio | averageCpcMicros | OK |
| Costo | costMicros | OK |
| QI persa rete ricerca (ranking) | searchImpressionShareLostRank | OK |
| QI sup. assoluta persa (ranking) | searchAbsoluteTopImpressionShareLostRank | DA VERIFICARE |
| Telefonate | phoneCalls | OK |
| Impressioni telefono | phoneImpressions | DA VERIFICARE |
| Chat | messageChats | OK |
| Impressioni messaggi | messageImpressions | DA VERIFICARE |
| Tutte le conversioni | allConversions | DA VERIFICARE |
| Costo/tutte le conversioni | costPerAllConversions | CALCOLATO |
| Valore/tutte le conversioni | allConversionsValue | DA VERIFICARE |
| % impr. (in cima) | topImpressionPercentage | DA VERIFICARE |
| % impr. (superiore) | absoluteTopImpressionPercentage | DA VERIFICARE |
| Tasso tutte le conversioni | allConversionsRate | CALCOLATO |
| Valore/tutte le conv./clic | allConversionsValuePerClick | CALCOLATO |

#### Annuncio
| Colonna | Campo DB | Stato |
|---------|----------|-------|
| Campagna | campaignName | OK |
| Gruppo di annunci | adGroupName | OK |
| Stato | status | OK |
| Tipo di annuncio | adType | OK |
| Efficacia annuncio (Ad Strength) | adStrength | OK |
| Clic | clicks | OK |
| Impressioni | impressions | OK |
| CTR | ctr | OK |
| CPC medio | averageCpcMicros | OK |
| Costo | costMicros | OK |
| Tasso tutte le conversioni | allConversionsRate | CALCOLATO |
| Valore/tutte le conversioni | allConversionsValue | DA VERIFICARE |
| URL finale | finalUrls | OK |
| Chat | messageChats | OK |
| Impressioni messaggi | messageImpressions | DA VERIFICARE |
| Telefonate | phoneCalls | OK |
| Impressioni telefono | phoneImpressions | DA VERIFICARE |
| % impr. (in cima) | topImpressionPercentage | DA VERIFICARE |
| % impr. (superiore) | absoluteTopImpressionPercentage | DA VERIFICARE |
| Tutte le conversioni | allConversions | DA VERIFICARE |
| Valore tutte le conv./costo | allConversionsValuePerCost | CALCOLATO |
| Costo/tutte le conversioni | costPerAllConversions | CALCOLATO |
| Valore tutte le conv./clic | allConversionsValuePerClick | CALCOLATO |

#### Asset
| Colonna | Campo DB | Stato |
|---------|----------|-------|
| Asset | assetText | OK |
| Tipo asset | assetType | OK |
| Livello | linkedLevel | OK |
| Stato | status | OK |
| Origine | source | OK |
| Ultimo aggiornamento | updatedAt | DA VERIFICARE |
| Clic | clicks | OK |
| CTR | ctr | OK |
| CPC medio | averageCpcMicros | CALCOLATO |
| Costo | costMicros | OK |
| Telefonate | phoneCalls | DA VERIFICARE |
| Impressioni telefono | phoneImpressions | DA VERIFICARE |
| Tutte le conversioni | allConversions | DA VERIFICARE |
| Valore/tutte le conversioni | allConversionsValue | DA VERIFICARE |
| Costo/tutte le conversioni | costPerAllConversions | CALCOLATO |
| Tasso tutte le conversioni | allConversionsRate | CALCOLATO |
| Valore tutte le conv./costo | allConversionsValuePerCost | CALCOLATO |
| Valore tutte le conv./clic | allConversionsValuePerClick | CALCOLATO |

#### Parola Chiave (Keyword)
| Colonna | Campo DB | Stato |
|---------|----------|-------|
| Parola chiave | keywordText | OK |
| Tipo di corrispondenza | matchType | OK |
| Campagna | campaignName | OK |
| Gruppo di annunci | adGroupName | OK |
| Stato | status | OK |
| Impressioni | impressions | OK |
| Clic | clicks | OK |
| CTR | ctr | OK |
| CPC medio | averageCpcMicros | OK |
| Costo | costMicros | OK |
| Punteggio di qualità | qualityScore | OK |
| URL | finalUrl | OK |
| Esperienza pagina destinazione | landingPageExperience | OK |
| Pertinenza annuncio | creativeRelevance | OK |
| CTR previsto | expectedCtr | OK |
| QI persa rete ricerca (ranking) | searchImpressionShareLostRank | DA VERIFICARE |
| QI persa rete ricerca (budget) | searchImpressionShareLostBudget | DA VERIFICARE |
| Tutte le conversioni | allConversions | DA VERIFICARE |
| Valore/tutte le conversioni | allConversionsValue | DA VERIFICARE |
| Costo/tutte le conversioni | costPerAllConversions | CALCOLATO |
| Telefonate | phoneCalls | OK |
| Impressioni telefono | phoneImpressions | DA VERIFICARE |
| % impr. (in cima) | topImpressionPercentage | DA VERIFICARE |
| % impr. (superiore) | absoluteTopImpressionPercentage | DA VERIFICARE |
| Tasso tutte le conversioni | allConversionsRate | CALCOLATO |
| Valore tutte le conv./costo | allConversionsValuePerCost | CALCOLATO |
| Valore tutte le conv./clic | allConversionsValuePerClick | CALCOLATO |

---

## 3. Headlines e Descriptions Annunci

### Problema
I campi `headlines` e `descriptions` nella tabella `ads` sono vuoti (array JSON `[]`).

### Causa
Lo script di importazione Google Ads non estrae i componenti RSA (Responsive Search Ads).

### Soluzione
Modificare lo script `scripts/google-ads-exporter.js` per estrarre:
- Fino a 15 headlines per annuncio RSA
- Fino a 4 descriptions per annuncio RSA
- Informazioni su pinning (posizione fissa)

### Struttura dati attesa
```json
{
  "headlines": [
    { "text": "Titolo 1", "pinnedField": "HEADLINE_1" },
    { "text": "Titolo 2", "pinnedField": null },
    ...
  ],
  "descriptions": [
    { "text": "Descrizione 1", "pinnedField": "DESCRIPTION_1" },
    { "text": "Descrizione 2", "pinnedField": null }
  ]
}
```

---

## 4. Pagina Negative Keywords

### Problema
La pagina mostra solo keyword_text, match_type, level, campaign, adgroup - poco utile per l'analisi.

### Dati disponibili nel DB
- `keyword_text` - testo della keyword negativa
- `match_type` - BROAD, PHRASE, EXACT
- `level` - CAMPAIGN, AD_GROUP, SHARED_SET
- `campaign_id/name` - se a livello campagna
- `ad_group_id/name` - se a livello ad group
- `shared_set_id/name` - se in lista condivisa

### Miglioramenti proposti
1. Raggruppare per `shared_set_name` (liste condivise)
2. Mostrare conteggio keyword per lista
3. Aggiungere filtro per livello (Campaign/AdGroup/SharedSet)
4. Preparare struttura per futuro modulo AI di analisi negative keywords

### Futuro: Modulo AI Negative Keywords
- Analizzare pattern nelle negative keywords
- Suggerire accorpamenti (es. "gratis", "gratuito", "free" → lista unica)
- Verificare che le negative non blocchino traffico utile
- Cross-check con search terms convertenti

---

## 5. Pagina Conversion Actions

### Problema
La pagina attuale (`ConversionsPage.tsx`) mostra statistiche aggregate delle conversioni, NON la configurazione delle azioni di conversione.

### Dati disponibili nel DB (tabella `conversion_actions`)
- `name` - nome azione
- `status` - ENABLED, REMOVED, HIDDEN
- `type` - WEBPAGE, AD_CALL, CLICK_TO_CALL, etc.
- `category` - PURCHASE, LEAD, CONTACT, etc.
- `origin` - WEBSITE, CALL_FROM_ADS, GOOGLE_HOSTED, etc.
- `counting_type` - ONE_PER_CLICK, MANY_PER_CLICK
- `default_value` - valore di default della conversione
- `always_use_default_value` - boolean
- `primary_for_goal` - se è primaria per l'obiettivo
- `campaigns_using_count` - numero campagne che la usano

### Miglioramenti proposti
1. Creare nuova sezione/tab per "Configurazione Conversioni"
2. Mostrare tutte le conversion actions con i loro parametri
3. Evidenziare:
   - Azioni non primarie ma attive
   - Azioni con valore 0 o 1 (placeholder)
   - Azioni non utilizzate (campaigns_using_count = 0)
4. Visualizzazione chiara di tipo, categoria, origine

---

---

## Stato Campi Database (Verificato)

### Campaigns - Campi Disponibili
```
budget_micros, status, clicks, impressions, ctr, average_cpc_micros, cost_micros,
conversions, conversions_value, bidding_strategy_type, target_cpa_micros, target_roas,
search_impression_share, search_impression_share_lost_rank, search_impression_share_lost_budget,
search_top_impression_share, search_absolute_top_impression_share,
top_impression_percentage, absolute_top_impression_percentage,
phone_calls, phone_impressions, message_chats, message_impressions
```

### Ad Groups - Campi Disponibili
```
campaign_name, status, target_cpa_micros, clicks, impressions, ctr, average_cpc_micros,
cost_micros, conversions, conversions_value, cpc_bid_micros,
search_impression_share, search_impression_share_lost_rank, search_impression_share_lost_budget,
phone_calls, message_chats
```

### Keywords - Campi Disponibili
```
keyword_text, match_type, campaign_name, ad_group_name, status, impressions, clicks,
ctr, average_cpc_micros, cost_micros, conversions, conversions_value,
quality_score, final_url, landing_page_experience, creative_relevance, expected_ctr,
search_impression_share, search_impression_share_lost_rank, search_impression_share_lost_budget,
phone_calls
```

### Assets - Campi Disponibili
```
asset_type, asset_text, description1, description2, final_url, phone_number,
status, performance_label, source, linked_level, campaign_id, ad_group_id,
impressions, clicks, cost_micros, conversions, ctr
```

### Ads - Campi Disponibili
```
campaign_name, ad_group_name, status, ad_type, ad_strength, approval_status,
headlines (JSONB - VUOTO), descriptions (JSONB - VUOTO), final_urls, path1, path2,
impressions, clicks, ctr, average_cpc_micros, cost_micros,
conversions, conversions_value, phone_calls, message_chats
```

---

## Piano di Implementazione

### Fase 1: Sidebar (COMPLETATO)
- [x] Creare store UI con Zustand
- [x] Implementare toggle sidebar
- [x] Hamburger menu a destra
- [x] Persistenza stato

### Fase 2: Documentazione (COMPLETATO)
- [x] Documentare modifiche pianificate
- [x] Mappare colonne DB vs preset

### Fase 3: Colonne Tabelle (IN CORSO)
- [x] Verificare campi disponibili nel DB
- [ ] Aggiungere colonne mancanti alle pagine
- [ ] Implementare colonne calcolate (CPA, ROAS, tassi)

### Fase 4: Headlines/Descriptions
- [ ] Analizzare script import attuale
- [ ] Modificare estrazione dati Google Ads API
- [ ] Testare import con dati reali

### Fase 5: Negative Keywords
- [ ] Raggruppamento per lista condivisa
- [ ] Filtri avanzati
- [ ] UI migliorata

### Fase 6: Conversion Actions
- [ ] Nuova pagina/sezione configurazione
- [ ] Visualizzazione parametri
- [ ] Highlight problemi configurazione
