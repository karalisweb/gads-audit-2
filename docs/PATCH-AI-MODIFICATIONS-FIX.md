# Patch Correttiva: Modifiche Google Ads dall'AI - Febbraio 2026

## Obiettivo
Correggere i bug che causavano il fallimento sistematico delle modifiche Google Ads generate dall'analisi AI (12 fallite su 16 per il cliente Officina 3MT).

---

## 1. QueryError.BAD_NUMBER sulle keyword negative

### Problema
Le keyword negative generate dall'AI (modulo 22 - Search Terms) fallivano con `QueryError.BAD_NUMBER` perche lo script Google Ads tentava di cercare una campagna con un ID fittizio.

### Causa
Il metodo `prepareSearchTermsForPrompt()` in `ai.service.ts` inviava all'AI solo i **nomi** delle campagne/gruppi annunci (`campaignName`, `adGroupName`), ma **non gli ID numerici** (`campaignId`, `adGroupId`). L'AI era costretta a inventare un `entityId` fittizio (es. `st_1e0c0a44`). Lo script Google Ads poi faceva:
```
campaign.id = st_1e0c0a44  → BAD_NUMBER
```

### Soluzione
1. Aggiunto `campaignId` e `adGroupId` ai dati inviati all'AI in `prepareSearchTermsForPrompt()`
2. Aggiornato il prompt del Modulo 22 per istruire l'AI a usare il vero `campaignId` come `entityId`
3. Aggiunto `campaignId` e `adGroupId` come campi nella raccomandazione AI
4. In `mapRecommendationToModification()`, aggiunto `campaignId` e `adGroupId` in `afterValue` per le azioni `add_negative_campaign`, `add_negative_adgroup`, `add_negative_account`
5. Riscritto `applyNegativeKeywordAdd()` nello script per supportare:
   - Livello **campagna**: usa `afterValue.campaignId || entityId`
   - Livello **gruppo annunci**: usa `afterValue.adGroupId`
   - Livello **account**: log warning (non supportato via Scripts)

### File modificati
- `backend/src/modules/ai/ai.service.ts` — `prepareSearchTermsForPrompt()`, `callOpenAI()`
- `backend/src/modules/ai/prompts/module-prompts.ts` — Modulo 22
- `backend/src/modules/modifications/modifications.service.ts` — `mapRecommendationToModification()`
- `scripts/google-ads-modifier.js` — `applyNegativeKeywordAdd()`
- `scripts/google-ads-modifier-*.js` (7 file client)

---

## 2. Formato entityId keyword non valido

### Problema
Le modifiche a keyword (stato, bid) fallivano con `Formato entityId keyword non valido` perche lo script si aspettava il formato `adGroupId~criterionId` (es. `123456~789012`) ma riceveva solo un singolo numero.

### Causa
Il metodo `prepareDataForPrompt()` per le keyword inviava `id: k.keywordId` ma **non** `adGroupId`. I prompt dei moduli 19, 20, 21 istruivano l'AI a usare `"keyword_id"` come entityId, che e un singolo numero. Lo script poi faceva:
```
entityId.split('~')  → solo 1 parte → ERRORE
```

### Soluzione
1. Aggiunto `adGroupId` e `campaignId` ai dati keyword in `prepareDataForPrompt()`
2. Aggiornati i prompt dei Moduli 19, 20, 21 per istruire l'AI a usare il formato `adGroupId~id`
3. Aggiunta normalizzazione difensiva in `mapRecommendationToModification()`: se `entityId` non contiene `~` e `adGroupId` e disponibile, costruisce `${adGroupId}~${entityId}`

### File modificati
- `backend/src/modules/ai/ai.service.ts` — `prepareDataForPrompt()`
- `backend/src/modules/ai/prompts/module-prompts.ts` — Moduli 19, 20, 21
- `backend/src/modules/modifications/modifications.service.ts` — normalizzazione entityId

---

## 3. Mismatch campi afterValue (cpcBid vs cpcBidMicros, budget vs budgetMicros)

### Problema
Lo script Google Ads leggeva `afterValue.cpcBidMicros` e `afterValue.budgetMicros` (valori in micros), ma il backend salvava `afterValue.cpcBid` e `afterValue.budget` (stringhe in euro dall'AI, es. `"1.50"`).

### Causa
L'AI restituisce valori come `"1.50"` (euro). Il backend li passava direttamente senza convertirli in micros. Lo script poi faceva:
```
afterValue.cpcBidMicros / 1000000  → undefined / 1000000 → NaN
```

### Soluzione
1. Aggiunto metodo `parseToMicros()` in `modifications.service.ts` che converte stringhe euro in micros (es. `"1.50"` → `1500000`)
2. In `mapRecommendationToModification()`, le azioni `increase_bid`, `decrease_bid`, `reduce_bid` e `increase_campaign_budget` ora salvano **entrambi** i formati:
   - `cpcBid: "1.50"` (originale AI)
   - `cpcBidMicros: 1500000` (convertito)
3. Gli script Google Ads ora accettano entrambi i formati con fallback:
   ```javascript
   var bidValue;
   if (afterValue.cpcBidMicros) {
     bidValue = afterValue.cpcBidMicros / 1000000;
   } else if (afterValue.cpcBid) {
     var raw = parseFloat(afterValue.cpcBid);
     bidValue = raw > 1000 ? raw / 1000000 : raw;
   }
   ```

### File modificati
- `backend/src/modules/modifications/modifications.service.ts` — `parseToMicros()`, azioni bid/budget
- `scripts/google-ads-modifier.js` — `applyCampaignBudget()`, `applyAdGroupCpcBid()`, `applyKeywordCpcBid()`
- `scripts/google-ads-modifier-*.js` (7 file client)

---

## 4. Aggiornamento DTO e tipi

### Modifiche
Aggiunti campi opzionali `campaignId` e `adGroupId` ai tipi per propagare gli ID reali dall'AI al backend e al frontend.

### File modificati
- `backend/src/modules/modifications/dto/create-from-ai.dto.ts` — `AIRecommendationItem`
- `backend/src/modules/ai/dto/ai-analysis.dto.ts` — `AIRecommendation`
- `frontend/src/types/ai.ts` — `AIRecommendation`

---

## Formato afterValue Prima/Dopo

### Keyword negativa (add_negative_campaign)
| Campo | Prima | Dopo |
|-------|-------|------|
| keyword | `rec.entityName` | `rec.entityName` |
| matchType | `rec.suggestedValue \|\| 'EXACT'` | `rec.suggestedValue \|\| 'EXACT'` |
| level | `'campaign'` | `'campaign'` |
| campaignId | **assente** | `rec.campaignId \|\| rec.entityId` |
| source | `'ai_recommendation'` | `'ai_recommendation'` |

### Keyword bid (increase_bid / decrease_bid)
| Campo | Prima | Dopo |
|-------|-------|------|
| cpcBid | `rec.suggestedValue` | `rec.suggestedValue` |
| cpcBidMicros | **assente** | `parseToMicros(rec.suggestedValue)` |
| action | `rec.action` | `rec.action` |

### Campaign budget (increase_campaign_budget)
| Campo | Prima | Dopo |
|-------|-------|------|
| budget | `rec.suggestedValue` | `rec.suggestedValue` |
| budgetMicros | **assente** | `parseToMicros(rec.suggestedValue)` |

---

## Retrocompatibilita

- Gli script accettano sia il vecchio formato (solo `cpcBidMicros`/`budgetMicros`) che il nuovo (con fallback a `cpcBid`/`budget`)
- Le modifiche pendenti gia create con il vecchio formato continueranno a funzionare
- La normalizzazione `entityId` per keyword e difensiva: agisce solo se manca il separatore `~`

---

## Note di Deploy

1. **Backend**: Riavviare il server dopo il deploy per caricare i nuovi prompt e la logica di mapping
2. **Script Google Ads**: Copiare il contenuto aggiornato degli script client nei rispettivi account Google Ads
3. **Modifiche esistenti**: Le 12 modifiche fallite con il formato vecchio dovranno essere **ricreate** (eliminare le vecchie e rieseguire l'analisi AI sui moduli interessati)
4. **Verifica**: Dopo il deploy, eseguire un'analisi AI sul modulo 22 (Search Terms) e verificare che le raccomandazioni contengano `campaignId` reali

---

## Elenco completo file modificati

| File | Tipo |
|------|------|
| `backend/src/modules/ai/ai.service.ts` | Modificato |
| `backend/src/modules/ai/prompts/module-prompts.ts` | Modificato |
| `backend/src/modules/ai/dto/ai-analysis.dto.ts` | Modificato |
| `backend/src/modules/modifications/modifications.service.ts` | Modificato |
| `backend/src/modules/modifications/dto/create-from-ai.dto.ts` | Modificato |
| `frontend/src/types/ai.ts` | Modificato |
| `scripts/google-ads-modifier.js` | Modificato |
| `scripts/google-ads-modifier-arredi-2000.js` | Modificato |
| `scripts/google-ads-modifier-casa-bulldog.js` | Modificato |
| `scripts/google-ads-modifier-colombo-palace.js` | Modificato |
| `scripts/google-ads-modifier-massimo-borio.js` | Modificato |
| `scripts/google-ads-modifier-officina-3mt.js` | Modificato |
| `scripts/google-ads-modifier-sardegna-trasferimenti.js` | Modificato |
| `scripts/google-ads-modifier-sfrido.js` | Modificato |
