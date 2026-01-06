# Google Ads Audit App - Mapping Completo

## Analisi dei 23 Moduli → Dataset e Azioni

---

## RIEPILOGO EXECUTIVE

### Dataset Necessari per MVP

| # | Dataset | Priorità | Moduli che lo usano |
|---|---------|----------|---------------------|
| 1 | **Account Settings** | ALTA | M01, M02, M03, M06 |
| 2 | **Campaigns** | CRITICA | M04, M07, M09, M10, M11 |
| 3 | **Ad Groups** | CRITICA | M07, M12, M13, M14 |
| 4 | **Ads (RSA)** | CRITICA | M15, M16, M17, M18 |
| 5 | **Keywords** | CRITICA | M19, M20, M21 |
| 6 | **Search Terms** | CRITICA | M22, M23 |
| 7 | **Negative Keywords** | ALTA | M23 |
| 8 | **Assets/Extensions** | MEDIA | M14, M17, M18 |
| 9 | **Conversions Config** | ALTA | M01, M02 |
| 10 | **Location Performance** | MEDIA | M11 |
| 11 | **Device Performance** | MEDIA | M11 |
| 12 | **Hour/Day Performance** | MEDIA | M11 |

### Azioni Esportabili via Google Ads Editor

| Azione | Supporto Editor | Moduli |
|--------|-----------------|--------|
| Pausa/Attiva campagne | ✅ Completo | M04, M11 |
| Pausa/Attiva ad groups | ✅ Completo | M07, M12 |
| Pausa/Attiva keyword | ✅ Completo | M19, M20 |
| Pausa/Attiva annunci | ✅ Completo | M15, M16 |
| Aggiungi keyword negative | ✅ Completo | M22, M23 |
| Modifica corrispondenza KW | ✅ Completo | M19 |
| Modifica URL finale | ✅ Completo | M21 |
| Modifica titoli/descrizioni RSA | ✅ Completo | M15, M16 |
| Aggiungi/modifica estensioni | ✅ Completo | M17, M18 |
| Modifica bid/CPA target | ✅ Completo | M04, M12 |
| Modifica budget | ✅ Completo | M04 |
| Modifica località target | ✅ Completo | M11 |
| Modifica scheduling orari | ⚠️ Limitato | M11 |
| Modifica strategia offerta | ⚠️ Limitato | M04 |
| Gestione conversioni | ❌ No (solo UI) | M01, M02 |
| Consigli automatici | ❌ No (solo UI) | M03, M06 |

---

## MAPPING DETTAGLIATO PER MODULO

---

### MODULO 01 - Obiettivi attivi, con valore e priorità
**Livello:** Account

#### Dati Necessari
```
Dataset: conversion_actions
Campi:
- conversion_action_id
- name
- status (ENABLED/DISABLED)
- type (PURCHASE, LEAD, PAGE_VIEW, etc.)
- value_settings.default_value
- value_settings.always_use_default_value
- origin (WEBSITE, APP, PHONE_CALL, IMPORT, etc.)
- counting_type (ONE_CONVERSION, MANY_PER_CLICK)
- primary_for_goal
- campaigns_using (count)
```

#### Metriche da Calcolare
- Totale obiettivi
- Obiettivi attivi vs disattivi
- Obiettivi con valore assegnato
- Obiettivi non usati in alcuna campagna
- Obiettivi duplicati (stesso nome/tipo)

#### Azioni Possibili
| Azione | Via Editor | Note |
|--------|------------|------|
| Disattivare obiettivo | ❌ | Solo da UI Google Ads |
| Modificare valore | ❌ | Solo da UI |
| Eliminare obiettivo | ❌ | Solo da UI |

**Conclusione M01:** Dataset da estrarre, ma azioni solo documentative (Decision Log) → esecuzione manuale in UI.

---

### MODULO 02 - Consent Mode v2.2
**Livello:** Account

#### Dati Necessari
```
Dataset: conversion_actions (esteso)
Campi aggiuntivi:
- consent_mode.enabled
- modeled_conversions_percentage (ultimi 30gg)
- tag_status (ACTIVE, INACTIVE, UNVERIFIED)

Dataset: diagnostics (se disponibile via API)
- consent_warnings
- tag_issues
```

#### Metriche da Calcolare
- Consent Mode attiva (sì/no)
- % conversioni modellate
- Avvisi diagnostica

#### Azioni Possibili
| Azione | Via Editor | Note |
|--------|------------|------|
| Attivare Consent Mode | ❌ | Richiede modifica codice sito |
| Verificare tag | ❌ | Manuale (Tag Assistant) |

**Conclusione M02:** Solo diagnostica. Azioni esterne all'account Ads.

---

### MODULO 03 - Consigli automatici: attivi o disattivati?
**Livello:** Account

#### Dati Necessari
```
Dataset: auto_apply_recommendations
Campi:
- recommendation_type
- is_enabled
- applied_count_last_30_days
```

#### Azioni Possibili
| Azione | Via Editor | Note |
|--------|------------|------|
| Disattivare consigli | ❌ | Solo da UI Account Settings |

**Conclusione M03:** Solo diagnostica e documentazione.

---

### MODULO 04 - Strategia di offerta coerente col business
**Livello:** Account/Campaign

#### Dati Necessari
```
Dataset: campaigns
Campi specifici per M04:
- campaign_id
- campaign_name
- bidding_strategy_type (MAXIMIZE_CLICKS, MAXIMIZE_CONVERSIONS, TARGET_CPA, TARGET_ROAS, MANUAL_CPC)
- target_cpa.target_cpa_micros
- target_roas.target_roas
- budget_micros
- status

Metriche (ultimi 30gg):
- conversions
- conversions_value
- cost_micros
- cpa_calculated (cost/conversions)
- roas_calculated (conversions_value/cost)
```

#### Azioni Possibili
| Azione | Via Editor | CSV Export |
|--------|------------|------------|
| Modificare strategia offerta | ⚠️ Parziale | Sì, ma con limitazioni |
| Modificare CPA target | ✅ | `Campaign;Target CPA` |
| Modificare ROAS target | ✅ | `Campaign;Target ROAS` |
| Modificare budget | ✅ | `Campaign;Budget` |
| Pausare campagna | ✅ | `Campaign;Status` |

**CSV Template M04:**
```csv
Campaign,Campaign state,Bid Strategy Type,Target CPA,Target ROAS,Budget
"Campaign Name",enabled,Target CPA,15.00,,50.00
```

---

### MODULO 05 & 08 - Preset colonne
**Livello:** Account

**Nota:** Questi moduli riguardano la configurazione UI di Google Ads, non dati esportabili. L'app replicherà i preset come configurazione delle viste tabellari.

**Preset da implementare nell'app:**

#### Livello Campagna
```
Budget | Stato | Punteggio Ottimizzazione | Clic | Impressioni | CTR | 
CPC medio | QI persa (ranking) | QI superiore persa (ranking) | 
QI sup. assoluta persa (ranking) | QI persa (budget) | QI superiore persa (budget) |
QI sup. assoluta persa (budget) | Telefonate | Impr. telefono | Chat | 
Impr. messaggi | Lead da chiamata | Tipo strategia offerta | 
Tutte le conversioni | Valore/tutte conv. | Costo/tutte conv. | Costo |
% impr. (in cima) | % impr. (superiore) | Tasso tutte conv. | 
Valore tutte conv./costo | Valore tutte conv./clic | CPA target
```

#### Livello Ad Group
```
Campagna | Stato | CPA target | Clic | Impressioni | CTR | CPC medio | 
Costo | QI persa (ranking) | QI superiore persa (ranking) | 
QI sup. assoluta persa (ranking) | Telefonate | Impr. telefono | 
Chat | Impr. messaggi | Tutte le conversioni | Costo/tutte conv. | 
Valore/tutte conv. | % impr. (in cima) | % impr. (superiore) | 
Tasso tutte conv. | Valore tutte conv./costo | Valore tutte conv./clic
```

#### Livello Annuncio
```
Campagna | Gruppo annunci | Stato | Tipo annuncio | Efficacia annuncio |
Clic | Impressioni | CTR | CPC medio | Costo | Tasso tutte conv. |
Valore/tutte conv. | URL finale | Chat | Impr. messaggi | Telefonate |
Impr. telefono | % impr. (in cima) | % impr. (superiore) |
Tutte le conversioni | Valore tutte conv./costo | Costo/tutte conv. |
Valore tutte conv./clic
```

#### Livello Asset
```
Asset | Tipo asset | Livello | Stato | Origine | Ultimo aggiornamento |
Clic | CTR | CPC medio | Costo | Telefonate | Impr. telefono |
Tutte le conversioni | Valore/tutte conv. | Costo/tutte conv. |
Tasso tutte conv. | Valore tutte conv./costo | Valore tutte conv./clic
```

#### Livello Keyword
```
Parola chiave | Tipo corrispondenza | Campagna | Gruppo annunci | Stato |
Impressioni | Clic | CTR | CPC medio | Costo | Punteggio qualità | URL |
Esperienza pagina destinazione | Pertinenza annuncio | CTR previsto |
QI persa (ranking) | QI persa (budget) | Tutte le conversioni |
Valore/tutte conv. | Costo/tutte conv. | Telefonate | Impr. telefono |
% impr. (in cima) | % impr. (superiore) | Tasso tutte conv. |
Valore tutte conv./costo | Valore tutte conv./clic
```

---

### MODULO 06 - Suggerimenti manuali
**Livello:** Account

#### Dati Necessari
```
Dataset: recommendations
Campi:
- recommendation_id
- type (KEYWORD, AD, BUDGET, BID, etc.)
- impact.base_metrics
- impact.potential_metrics
- status (ACTIVE, DISMISSED, APPLIED)
- applied_date
```

#### Azioni Possibili
| Azione | Via Editor | Note |
|--------|------------|------|
| Applicare suggerimento | ❌ | Solo da UI |
| Ignorare suggerimento | ❌ | Solo da UI |

**Conclusione M06:** Diagnostica. Decisioni documentate, esecuzione manuale.

---

### MODULO 07 - Gruppi di annunci: struttura e performance
**Livello:** Ad Group

#### Dati Necessari
```
Dataset: ad_groups
Campi:
- ad_group_id
- ad_group_name
- campaign_id
- campaign_name
- status
- type (SEARCH_STANDARD, SEARCH_DYNAMIC_ADS, etc.)
- cpc_bid_micros
- target_cpa_micros

Metriche (ultimi 30gg):
- impressions
- clicks
- cost_micros
- conversions
- conversions_value
- ctr
- average_cpc
- cpa (calculated)
- roas (calculated)
```

#### Azioni Possibili
| Azione | Via Editor | CSV Export |
|--------|------------|------------|
| Pausare ad group | ✅ | `Ad Group;Status` |
| Attivare ad group | ✅ | `Ad Group;Status` |
| Modificare CPC bid | ✅ | `Ad Group;Max CPC` |
| Creare nuovo ad group | ✅ | Full row |
| Ristrutturare (spostare KW) | ✅ | Via keyword CSV |

**CSV Template M07:**
```csv
Campaign,Ad Group,Ad Group state,Max CPC
"Campaign Name","Ad Group Name",enabled,1.50
```

---

### MODULO 09 - Conversioni totali: Tel, Chat, Lead
**Livello:** Campaign

#### Dati Necessari
```
Dataset: campaigns (con breakdown conversioni)
Metriche:
- all_conversions
- all_conversions_value
- conversions_by_action_name (breakdown)
  - phone_calls
  - messages
  - form_submissions
  - purchases
```

#### Azioni Possibili
Diagnostica. Le azioni riguardano il tracciamento (tag, eventi GA4).

---

### MODULO 10 - KPI principali
**Livello:** Campaign

#### Dati Necessari
```
Dataset: campaigns (già incluso in M04)
Metriche chiave:
- ctr
- average_cpc
- conversion_rate
- cost_per_conversion
- roas
- impressions
- clicks
```

Nessuna azione specifica. Analisi e benchmark.

---

### MODULO 11 - Impostazioni: orari, giorni, località, dispositivi
**Livello:** Campaign

#### Dati Necessari
```
Dataset: campaign_geo_performance
Campi:
- campaign_id
- geo_target_constant (location)
- location_name
- impressions, clicks, cost, conversions, conversions_value

Dataset: campaign_device_performance
Campi:
- campaign_id
- device (MOBILE, DESKTOP, TABLET)
- impressions, clicks, cost, conversions, conversions_value

Dataset: campaign_hour_of_day_performance
Campi:
- campaign_id
- hour_of_day (0-23)
- impressions, clicks, cost, conversions

Dataset: campaign_day_of_week_performance
Campi:
- campaign_id
- day_of_week (MONDAY-SUNDAY)
- impressions, clicks, cost, conversions

Dataset: ad_schedule (targeting attivo)
Campi:
- campaign_id
- day_of_week
- start_hour, end_hour
- bid_modifier
```

#### Azioni Possibili
| Azione | Via Editor | CSV Export |
|--------|------------|------------|
| Escludere località | ✅ | Location targeting CSV |
| Aggiungere località | ✅ | Location targeting CSV |
| Modificare bid device | ⚠️ | Limitato |
| Modificare schedule | ⚠️ | Limitato (meglio UI) |

---

### MODULO 12 - Conversioni e CPA per gruppo
**Livello:** Ad Group

#### Dati Necessari
```
Dataset: ad_groups (già incluso in M07)
Focus su metriche:
- conversions
- cost_per_conversion
- cost_micros
- conversion_rate
```

#### Azioni Possibili
Come M07 (pausa/attiva, modifica bid).

---

### MODULO 13 - Quote perse per GDA
**Livello:** Ad Group

#### Dati Necessari
```
Dataset: ad_groups (esteso)
Metriche aggiuntive:
- search_impression_share
- search_impression_share_lost_rank
- search_impression_share_lost_budget
- search_top_impression_share
- search_absolute_top_impression_share
```

#### Azioni Possibili
Diagnostica → azioni correlate in altri moduli (bid, budget, qualità annunci).

---

### MODULO 14 - Asset associati e loro efficacia
**Livello:** Ad Group

#### Dati Necessari
```
Dataset: assets
Campi:
- asset_id
- asset_type (HEADLINE, DESCRIPTION, SITELINK, CALL, MESSAGE, IMAGE, etc.)
- asset_text (per text assets)
- asset_url (per sitelink)
- performance_label (BEST, GOOD, LOW, LEARNING, PENDING, UNKNOWN)
- status (ENABLED, REMOVED)
- source (ADVERTISER, AUTOMATICALLY_CREATED)

Dataset: ad_group_assets (collegamento)
Campi:
- ad_group_id
- asset_id
- field_type (HEADLINE, DESCRIPTION, SITELINK, etc.)

Metriche per asset:
- impressions
- clicks
- cost_micros
- conversions
```

#### Azioni Possibili
| Azione | Via Editor | CSV Export |
|--------|------------|------------|
| Aggiungere sitelink | ✅ | Sitelink CSV |
| Rimuovere asset | ✅ | Asset CSV |
| Modificare testo asset | ✅ | Asset CSV |

---

### MODULO 15 - Efficacia annunci e punteggio qualità
**Livello:** Ad

#### Dati Necessari
```
Dataset: ads
Campi:
- ad_id
- ad_group_id
- campaign_id
- ad_type (RESPONSIVE_SEARCH_AD, EXPANDED_TEXT_AD, etc.)
- status
- policy_approval_status
- ad_strength (EXCELLENT, GOOD, AVERAGE, POOR, UNSPECIFIED)
- headlines[] (array of text)
- descriptions[] (array of text)
- final_urls[]
- path1, path2

Metriche:
- impressions
- clicks
- ctr
- cost_micros
- conversions
- conversion_rate
```

#### Azioni Possibili
| Azione | Via Editor | CSV Export |
|--------|------------|------------|
| Modificare headlines | ✅ | Ad CSV con headlines 1-15 |
| Modificare descriptions | ✅ | Ad CSV con descriptions 1-4 |
| Modificare URL finale | ✅ | `Final URL` column |
| Pausare annuncio | ✅ | `Status` column |
| Creare nuovo annuncio | ✅ | Full row |

**CSV Template M15 (RSA):**
```csv
Campaign,Ad Group,Headline 1,Headline 2,Headline 3,Description 1,Description 2,Final URL,Path 1,Path 2,Status
"Camp","AdG","Headline 1","Headline 2","Headline 3","Desc 1","Desc 2","https://example.com","path1","path2",enabled
```

---

### MODULO 16 - Conversioni per annuncio
**Livello:** Ad

#### Dati Necessari
```
Dataset: ads (già in M15)
Focus metriche:
- conversions
- cost_per_conversion
- conversion_rate
- cost_micros
```

#### Azioni Possibili
Come M15.

---

### MODULO 17 - Estensione chiamata
**Livello:** Ad/Campaign/Account

#### Dati Necessari
```
Dataset: call_assets
Campi:
- asset_id
- phone_number
- country_code
- call_tracking_enabled
- status

Metriche:
- phone_impressions
- phone_calls
- phone_through_rate
- conversions_from_calls

Dataset: call_only_ads (se presenti)
```

#### Azioni Possibili
| Azione | Via Editor | CSV Export |
|--------|------------|------------|
| Aggiungere estensione chiamata | ✅ | Call extension CSV |
| Rimuovere estensione | ✅ | Status = removed |
| Modificare numero | ✅ | Phone number column |

---

### MODULO 18 - Estensione messaggi
**Livello:** Ad/Campaign/Account

#### Dati Necessari
```
Dataset: message_assets
Campi:
- asset_id
- business_name
- message_text
- phone_number
- status

Metriche:
- message_impressions
- message_chats
- conversions_from_messages
```

#### Azioni Possibili
Come M17.

---

### MODULO 19 - Prestazioni parole chiave
**Livello:** Keyword

#### Dati Necessari
```
Dataset: keywords
Campi:
- keyword_id
- keyword_text
- match_type (EXACT, PHRASE, BROAD)
- ad_group_id
- ad_group_name
- campaign_id
- campaign_name
- status
- quality_score (1-10)
- quality_score_creative_relevance (ABOVE_AVERAGE, AVERAGE, BELOW_AVERAGE)
- quality_score_landing_page_experience
- quality_score_expected_ctr
- cpc_bid_micros
- final_url

Metriche:
- impressions
- clicks
- ctr
- average_cpc
- cost_micros
- conversions
- conversions_value
- conversion_rate
- cost_per_conversion
```

#### Azioni Possibili
| Azione | Via Editor | CSV Export |
|--------|------------|------------|
| Pausare keyword | ✅ | `Status` |
| Attivare keyword | ✅ | `Status` |
| Modificare corrispondenza | ✅ | `Match type` (richiede remove+add) |
| Modificare bid | ✅ | `Max CPC` |
| Modificare URL | ✅ | `Final URL` |
| Eliminare keyword | ✅ | `Status = removed` |

**CSV Template M19:**
```csv
Campaign,Ad Group,Keyword,Match type,Max CPC,Final URL,Status
"Camp","AdG","keyword text",Exact,1.50,"https://example.com/page",enabled
```

---

### MODULO 20 - Quote perse per parole chiave
**Livello:** Keyword

#### Dati Necessari
```
Dataset: keywords (esteso)
Metriche aggiuntive:
- search_impression_share
- search_impression_share_lost_rank
- search_impression_share_lost_budget
- search_top_impression_share
```

#### Azioni Possibili
Diagnostica → azioni in M19 (bid, qualità) o M04 (budget).

---

### MODULO 21 - Coerenza KW → Annuncio → Landing Page
**Livello:** Keyword

#### Dati Necessari
```
Dataset: keywords (già in M19)
Campi focus:
- keyword_text
- final_url
- quality_score
- quality_score_creative_relevance
- quality_score_landing_page_experience

Dataset: ads (collegato via ad_group_id)
- headlines[]
- descriptions[]
- final_urls[]

Dataset: landing_page_view (se disponibile)
- unexpanded_final_url
- page_speed_score
- mobile_friendly_score
```

#### Azioni Possibili
| Azione | Via Editor | Note |
|--------|------------|------|
| Modificare URL keyword | ✅ | `Final URL` |
| Modificare URL annuncio | ✅ | `Final URL` |
| Modificare headlines | ✅ | Per allineamento |

---

### MODULO 22 - Analisi termini di ricerca
**Livello:** Search Term

#### Dati Necessari
```
Dataset: search_terms
Campi:
- search_term
- keyword_id
- keyword_text
- match_type_used
- ad_group_id
- ad_group_name
- campaign_id
- campaign_name

Metriche:
- impressions
- clicks
- ctr
- cost_micros
- conversions
- conversions_value
- conversion_rate
- cost_per_conversion
```

#### Azioni Possibili
| Azione | Via Editor | CSV Export |
|--------|------------|------------|
| Promuovere a keyword | ✅ | Aggiungere riga in Keywords CSV |
| Aggiungere come negativa | ✅ | Negative keywords CSV |

**CSV Template - Promozione a keyword:**
```csv
Campaign,Ad Group,Keyword,Match type,Max CPC,Status
"Camp","AdG","search term promoted",Exact,1.50,enabled
```

**CSV Template - Negativa:**
```csv
Campaign,Ad Group,Negative keyword,Match type
"Camp","AdG","search term to exclude",Exact
```

---

### MODULO 23 - Termini negativi: copertura ed efficacia
**Livello:** Negative Keyword

#### Dati Necessari
```
Dataset: negative_keywords
Campi:
- negative_keyword_id
- keyword_text
- match_type
- level (CAMPAIGN, AD_GROUP, ACCOUNT/SHARED_SET)
- campaign_id (se level = campaign/ad_group)
- ad_group_id (se level = ad_group)
- shared_set_name (se in lista condivisa)
- added_date
```

#### Azioni Possibili
| Azione | Via Editor | CSV Export |
|--------|------------|------------|
| Aggiungere negativa campaign | ✅ | Campaign negative CSV |
| Aggiungere negativa ad group | ✅ | Ad group negative CSV |
| Rimuovere negativa | ✅ | Status = removed |
| Modificare match type | ✅ | (remove + add) |

**CSV Template M23 - Campaign Level:**
```csv
Campaign,Negative keyword,Match type
"Campaign Name","keyword to exclude",Phrase
```

**CSV Template M23 - Ad Group Level:**
```csv
Campaign,Ad Group,Negative keyword,Match type
"Campaign Name","Ad Group Name","keyword to exclude",Exact
```

---

## SCHEMA DATASET FINALE PER SCRIPT

### 1. account_info
```javascript
{
  customer_id: "123-456-7890",
  customer_name: "Account Name",
  currency_code: "EUR",
  time_zone: "Europe/Rome"
}
```

### 2. conversion_actions
```javascript
{
  conversion_action_id: "123456",
  name: "Form Submit",
  status: "ENABLED",
  type: "WEBPAGE",
  category: "LEAD",
  origin: "WEBSITE",
  value_settings: {
    default_value: 50.0,
    always_use_default_value: false
  },
  counting_type: "ONE_CONVERSION",
  primary_for_goal: true
}
```

### 3. campaigns
```javascript
{
  campaign_id: "123456789",
  campaign_name: "Brand Campaign",
  status: "ENABLED",
  advertising_channel_type: "SEARCH",
  bidding_strategy_type: "TARGET_CPA",
  target_cpa_micros: 15000000, // €15.00
  target_roas: null,
  budget_micros: 50000000, // €50.00/day
  start_date: "2024-01-01",
  end_date: null,
  
  // Metriche (periodo: ultimi 30gg)
  impressions: 50000,
  clicks: 2500,
  cost_micros: 1500000000, // €1,500.00
  conversions: 100.0,
  conversions_value: 5000.0,
  ctr: 5.0,
  average_cpc_micros: 600000, // €0.60
  
  // Quote impressioni
  search_impression_share: 0.65,
  search_impression_share_lost_rank: 0.20,
  search_impression_share_lost_budget: 0.15,
  search_top_impression_share: 0.45,
  search_absolute_top_impression_share: 0.25,
  
  // Posizione
  top_impression_percentage: 0.70,
  absolute_top_impression_percentage: 0.35,
  
  // Conversioni per tipo
  phone_calls: 15,
  phone_impressions: 5000,
  message_chats: 8,
  message_impressions: 3000
}
```

### 4. ad_groups
```javascript
{
  ad_group_id: "123456789",
  ad_group_name: "Generic Keywords",
  campaign_id: "123456789",
  campaign_name: "Brand Campaign",
  status: "ENABLED",
  type: "SEARCH_STANDARD",
  cpc_bid_micros: 1500000, // €1.50
  target_cpa_micros: null,
  
  // Metriche
  impressions: 10000,
  clicks: 500,
  cost_micros: 300000000,
  conversions: 20.0,
  conversions_value: 1000.0,
  ctr: 5.0,
  average_cpc_micros: 600000,
  
  // Quote
  search_impression_share: 0.60,
  search_impression_share_lost_rank: 0.25,
  
  // Conversioni tipo
  phone_calls: 3,
  message_chats: 2
}
```

### 5. ads
```javascript
{
  ad_id: "123456789",
  ad_group_id: "123456789",
  ad_group_name: "Generic Keywords",
  campaign_id: "123456789",
  campaign_name: "Brand Campaign",
  ad_type: "RESPONSIVE_SEARCH_AD",
  status: "ENABLED",
  approval_status: "APPROVED",
  ad_strength: "GOOD",
  
  // Contenuti RSA
  headlines: [
    { text: "Headline 1", pinned_field: null },
    { text: "Headline 2", pinned_field: "HEADLINE_1" },
    // ... fino a 15
  ],
  descriptions: [
    { text: "Description 1", pinned_field: null },
    // ... fino a 4
  ],
  final_urls: ["https://example.com/landing"],
  path1: "products",
  path2: "best",
  
  // Metriche
  impressions: 5000,
  clicks: 250,
  cost_micros: 150000000,
  conversions: 10.0,
  ctr: 5.0,
  average_cpc_micros: 600000,
  
  phone_calls: 2,
  message_chats: 1
}
```

### 6. keywords
```javascript
{
  keyword_id: "123456789",
  keyword_text: "scarpe running uomo",
  match_type: "PHRASE",
  ad_group_id: "123456789",
  ad_group_name: "Generic Keywords",
  campaign_id: "123456789",
  campaign_name: "Brand Campaign",
  status: "ENABLED",
  approval_status: "APPROVED",
  
  // Punteggio qualità
  quality_score: 7,
  creative_relevance: "AVERAGE",
  landing_page_experience: "ABOVE_AVERAGE",
  expected_ctr: "AVERAGE",
  
  cpc_bid_micros: 1200000,
  final_url: "https://example.com/scarpe-running",
  
  // Metriche
  impressions: 2000,
  clicks: 100,
  cost_micros: 60000000,
  conversions: 4.0,
  ctr: 5.0,
  average_cpc_micros: 600000,
  
  // Quote
  search_impression_share: 0.55,
  search_impression_share_lost_rank: 0.30,
  search_impression_share_lost_budget: 0.15,
  
  phone_calls: 1
}
```

### 7. search_terms
```javascript
{
  search_term: "scarpe running uomo nike",
  keyword_id: "123456789",
  keyword_text: "scarpe running uomo",
  match_type_triggered: "PHRASE",
  ad_group_id: "123456789",
  ad_group_name: "Generic Keywords",
  campaign_id: "123456789",
  campaign_name: "Brand Campaign",
  
  // Metriche
  impressions: 150,
  clicks: 12,
  cost_micros: 7200000,
  conversions: 1.0,
  conversions_value: 50.0,
  ctr: 8.0,
  average_cpc_micros: 600000
}
```

### 8. negative_keywords
```javascript
{
  negative_keyword_id: "123456789",
  keyword_text: "gratis",
  match_type: "BROAD",
  level: "CAMPAIGN", // CAMPAIGN, AD_GROUP, ACCOUNT
  campaign_id: "123456789",
  campaign_name: "Brand Campaign",
  ad_group_id: null, // solo se level = AD_GROUP
  shared_set_id: null, // solo se in lista condivisa
  shared_set_name: null
}
```

### 9. assets
```javascript
{
  asset_id: "123456789",
  asset_type: "SITELINK",
  asset_text: "Scopri le Offerte",
  description1: "Sconti fino al 50%",
  description2: "Spedizione gratuita",
  final_url: "https://example.com/offerte",
  status: "ENABLED",
  performance_label: "GOOD",
  source: "ADVERTISER",
  
  // Collegamento
  linked_level: "CAMPAIGN", // CAMPAIGN, AD_GROUP, ACCOUNT
  campaign_id: "123456789",
  ad_group_id: null,
  
  // Metriche
  impressions: 3000,
  clicks: 120,
  cost_micros: 72000000,
  conversions: 5.0,
  ctr: 4.0
}
```

### 10. geo_performance
```javascript
{
  campaign_id: "123456789",
  campaign_name: "Brand Campaign",
  location_id: "1008463", // ID Google
  location_name: "Milan, Lombardy, Italy",
  location_type: "CITY",
  is_targeted: true,
  bid_modifier: 1.0,
  
  // Metriche
  impressions: 5000,
  clicks: 250,
  cost_micros: 150000000,
  conversions: 10.0
}
```

### 11. device_performance
```javascript
{
  campaign_id: "123456789",
  campaign_name: "Brand Campaign",
  device: "MOBILE",
  bid_modifier: 1.0,
  
  // Metriche
  impressions: 30000,
  clicks: 1500,
  cost_micros: 900000000,
  conversions: 60.0
}
```

### 12. hourly_performance
```javascript
{
  campaign_id: "123456789",
  hour_of_day: 14, // 0-23
  
  impressions: 2000,
  clicks: 100,
  cost_micros: 60000000,
  conversions: 4.0
}
```

### 13. daily_performance
```javascript
{
  campaign_id: "123456789",
  day_of_week: "MONDAY",
  
  impressions: 8000,
  clicks: 400,
  cost_micros: 240000000,
  conversions: 16.0
}
```

---

## CSV TEMPLATES PER GOOGLE ADS EDITOR

### Template 1: Campaign Updates
```csv
Campaign,Campaign state,Budget,Bid Strategy Type,Target CPA,Target ROAS
```

### Template 2: Ad Group Updates
```csv
Campaign,Ad Group,Ad Group state,Max CPC,Target CPA
```

### Template 3: Keyword Updates
```csv
Campaign,Ad Group,Keyword,Match type,Max CPC,Final URL,Status
```

### Template 4: Negative Keywords - Campaign Level
```csv
Campaign,Negative keyword,Match type
```

### Template 5: Negative Keywords - Ad Group Level
```csv
Campaign,Ad Group,Negative keyword,Match type
```

### Template 6: RSA Ads
```csv
Campaign,Ad Group,Headline 1,Headline 2,Headline 3,Headline 4,Headline 5,Headline 6,Headline 7,Headline 8,Headline 9,Headline 10,Headline 11,Headline 12,Headline 13,Headline 14,Headline 15,Description 1,Description 2,Description 3,Description 4,Final URL,Path 1,Path 2,Status
```

### Template 7: Sitelinks
```csv
Campaign,Sitelink text,Description line 1,Description line 2,Final URL,Status
```

### Template 8: Call Extensions
```csv
Campaign,Phone number,Country code,Status
```

### Template 9: Location Targeting
```csv
Campaign,Location,Bid modifier
```

---

## RACCOMANDAZIONI PER MVP

### Fase 1 - Dataset Core (priorità CRITICA)
1. campaigns
2. ad_groups
3. keywords
4. search_terms
5. negative_keywords
6. ads

### Fase 2 - Dataset Estesi (priorità ALTA)
7. assets
8. conversion_actions
9. geo_performance
10. device_performance

### Fase 3 - Dataset Opzionali (priorità MEDIA)
11. hourly_performance
12. daily_performance
13. recommendations
14. auto_apply_recommendations

### Azioni MVP via Editor
1. ✅ Pausa/Attiva entità (campaign, ad_group, keyword, ad)
2. ✅ Aggiunta negative keywords
3. ✅ Modifica URL finali
4. ✅ Modifica headlines/descriptions RSA
5. ✅ Promozione search term a keyword
6. ✅ Modifica match type keyword (via remove+add)
7. ✅ Modifica bid (CPC, CPA target)

### Azioni NON supportate da Editor (manuale su UI)
1. ❌ Gestione conversioni/obiettivi
2. ❌ Consigli automatici
3. ❌ Consent Mode
4. ❌ Modifica strategia offerta (parziale)
5. ❌ Ad scheduling complesso
