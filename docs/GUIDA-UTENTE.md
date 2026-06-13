# KW GADS Audit - Guida Utente

Guida completa all'utilizzo della piattaforma di audit e ottimizzazione Google Ads.

---

## Accesso

### Login
1. Vai su **https://gads.karalisdemo.it**
2. Inserisci email e password
3. Se la 2FA e attiva, riceverai un codice OTP via email (valido 10 minuti)

### Password dimenticata
1. Dalla schermata di login, clicca **"Password dimenticata?"**
2. Inserisci la tua email
3. Riceverai un codice OTP per reimpostare la password
4. La nuova password deve avere almeno 12 caratteri con maiuscola, minuscola, numero e carattere speciale

### Primo accesso (invito)
1. Riceverai un'email di invito con un link
2. Clicca il link e crea la tua password
3. L'account sara attivo dopo la creazione

---

## Dashboard

### Dashboard principale
La home page mostra una panoramica di tutti gli account Google Ads:

- **Costo totale**: spesa complessiva di tutti gli account
- **Conversioni totali**: numero di conversioni aggregate
- **Campagne attive**: conteggio campagne attive
- **Health Score medio**: punteggio di salute medio degli account

Ogni **card account** mostra:
- Nome e Customer ID
- Health Score con indicatore colore (verde/giallo/rosso)
- Cliccando sulla card si accede all'audit dettagliato

### Dashboard audit (per account)
Entrando in un account specifico, la dashboard audit mostra:

- **KPI principali**: campagne, gruppi, keyword, search terms
- **Metriche performance**: costo, conversioni, CPA, ROAS, CTR, CPC
- **Quality Score**: punteggio qualita medio delle keyword
- **Health Score**: valutazione complessiva con dettaglio problemi
- **Grafici trend**: andamento performance nel tempo
- **Sezione AI**: ultima analisi con percentuale accettazione

---

## Audit Account

### Navigazione
Dopo aver selezionato un account, il menu laterale (o la bottom nav su mobile) mostra le sezioni:

| Sezione | Cosa mostra |
|---------|-------------|
| **Dashboard** | Panoramica KPI e grafici |
| **Campagne** | Lista campagne con budget, metriche, impression share |
| **Gruppi annunci** | Ad group con CPC bid, performance |
| **Annunci** | RSA con headline, descrizioni, URL, ad strength |
| **Keyword** | Keyword con quality score, match type, performance |
| **Termini ricerca** | Query reali degli utenti con metriche |
| **Neg. Keywords** | Keyword negative a livello campagna, gruppo, lista condivisa |
| **Asset** | Estensioni (sitelink, callout, snippet, immagini) |
| **Conversioni** | Dati conversione e azioni di conversione configurate |
| **Landing Pages** | Performance delle pagine di destinazione |
| **Issues** | Problemi rilevati con severita (critico/alto/medio/basso) |
| **Modifiche** | Modifiche proposte, approvate e applicate |

### Filtri e ricerca
Ogni tabella supporta:
- **Ricerca testuale**: cerca per nome, testo keyword, URL, etc.
- **Filtro per campagna**: seleziona una campagna specifica
- **Filtro per gruppo**: seleziona un gruppo di annunci
- **Filtro per stato**: attivo, in pausa, rimosso
- **Ordinamento**: clicca sulle intestazioni colonna

### Vista mobile
Su smartphone le tabelle si trasformano in **card espandibili** con tutte le metriche. La navigazione usa una bottom bar con pulsante "Menu" per le sezioni aggiuntive.

---

## Analisi AI

### Come funziona
L'AI analizza l'account e genera **raccomandazioni di ottimizzazione** basate sui dati reali.

### Analizzare un account
1. Vai nella **Dashboard audit** dell'account
2. Clicca **"Analizza con AI"** (o "Analizza tutti i moduli")
3. L'analisi richiede 1-3 minuti per completarsi
4. I risultati appaiono nel pannello AI con raccomandazioni dettagliate

### Raccomandazioni
Ogni raccomandazione include:
- **Tipo**: cosa fare (aumentare bid, aggiungere negativa, modificare annuncio, etc.)
- **Priorita**: alta, media, bassa
- **Motivazione**: perche l'AI suggerisce questa azione
- **Impatto stimato**: miglioramento atteso

### Convertire in modifiche
1. Dall'analisi AI, clicca **"Converti in modifiche"**
2. Le raccomandazioni diventano modifiche con status `pending`
3. Rivedi e approva le modifiche singolarmente

---

## Gestione Modifiche

### Workflow
Le modifiche seguono questo flusso:

```
Pending (in attesa) → Approved (approvata) → Applied (applicata)
                                            → Failed (fallita)
```

### Approvare modifiche
1. Vai nella sezione **Modifiche** dell'account
2. Rivedi le modifiche in stato `pending`
3. Clicca **"Approva"** per confermare
4. Le modifiche approvate verranno applicate automaticamente dallo script Google Ads

### Creare modifiche manuali
1. Nella sezione Modifiche, clicca **"Nuova modifica"**
2. Compila il form con tipo, entita, valori
3. La modifica viene creata in stato `pending`

### Stato delle modifiche
- **Pending**: in attesa di approvazione
- **Approved**: approvata, in attesa di applicazione
- **Applied**: applicata con successo su Google Ads
- **Failed**: applicazione fallita (verificare il messaggio di errore)

---

## Schedulazione Automatica

### Configurare l'analisi automatica
*(Solo admin)*

1. Vai in **Impostazioni** > tab **Schedule**
2. Attiva la schedulazione con il toggle
3. Scegli la frequenza tra i preset disponibili:
   - Ogni giorno alle 7:00
   - Lun-Ven alle 7:00
   - Ogni lunedi alle 7:00
   - Personalizzata (espressione cron avanzata)
4. Inserisci i **destinatari email** per ricevere il report
5. Clicca **Salva**

### Come leggere la frequenza
La schermata mostra sempre una descrizione leggibile, ad esempio:
- `0 7 * * 1` = **Ogni Lunedi alle 07:00**
- `0 7 * * 1-5` = **Dal Lunedi al Venerdi alle 07:00**
- `0 9 * * 1,4` = **Lunedi e Giovedi alle 09:00**

---

## Impostazioni

### Profilo
- Modifica il nome visualizzato
- L'email non puo essere cambiata

### Password
- Cambia la password inserendo quella attuale e la nuova
- Requisiti: minimo 12 caratteri, maiuscola, minuscola, numero, carattere speciale

### Sicurezza (2FA)
- Attiva/disattiva l'autenticazione a due fattori
- Quando attiva, ad ogni login riceverai un codice OTP via email

### AI *(solo admin)*
- Configura la **chiave API OpenAI** per abilitare l'analisi
- Seleziona il **modello** (GPT-5.2 raccomandato)
- La chiave viene crittografata nel database

### Schedule *(solo admin)*
- Configura l'esecuzione automatica dell'analisi AI
- Vedi sezione "Schedulazione Automatica"

---

## Gestione Utenti

*(Solo admin)*

### Accedere al pannello
- Clicca **"Utenti"** nel menu laterale (sezione footer)

### Invitare un collaboratore
1. Clicca **"Invita Utente"**
2. Inserisci l'email (deve essere `@karalisweb.net`)
3. Il collaboratore ricevera un'email con il link di registrazione

### Gestire i ruoli
- **Admin**: accesso completo (impostazioni AI, schedule, gestione utenti)
- **Utente**: accesso alle funzionalita di audit e visualizzazione

Per cambiare ruolo, clicca l'icona scudo nella riga dell'utente.

### Attivare/Disattivare utenti
- Clicca l'icona utente nella riga per attivare o disattivare
- Un utente disattivato non puo piu accedere al sistema

---

## Domande Frequenti

### Come vengono applicate le modifiche a Google Ads?
Le modifiche approvate vengono raccolte da uno **script Google Ads** che gira periodicamente nell'account. Lo script legge le modifiche approvate dall'API, le applica su Google Ads, e invia il risultato (successo o errore).

### Quanto e sicuro?
- Tutte le comunicazioni usano **HTTPS**
- L'autenticazione usa **JWT** con refresh token rotation
- La 2FA aggiunge un secondo livello di verifica
- Le chiavi API sono **crittografate** nel database
- Gli script Google Ads usano **HMAC-SHA256** per firmare le richieste

### Posso annullare una modifica?
Le modifiche in stato `pending` possono essere cancellate. Le modifiche gia `applied` su Google Ads devono essere ripristinate manualmente dalla piattaforma Google Ads.

### Chi puo vedere i dati?
Tutti gli utenti attivi con accesso alla piattaforma vedono i dati di tutti gli account configurati. I ruoli determinano solo l'accesso alle funzionalita amministrative (AI, schedule, gestione utenti).

---

## Cronologia Aggiornamenti

| Versione | Data | Descrizione |
|----------|------|-------------|
| 2.18.17 | 13 Giugno 2026 | Stato salute conversioni - rileva le 'Inattive' (conversione primaria con 0 conversioni in 30gg = tracciamento rotto); badge rosso + card Inattive + colonna Conv.30gg nell'app, l'AI lo segnala come problema grave; script v3.6 importa metrics.all_conversions |
| 2.18.16 | 13 Giugno 2026 | Rimosso il badge fuorviante 'Non usata' dalle conversioni; le pagine Campagne/Ad Groups/Ads/Keywords/Conversioni partono di default su 'Attivi' (pausa/rimossi nascosti ma accessibili dal filtro stato) |
| 2.18.15 | 13 Giugno 2026 | Lo script di apply non riceve piu le raccomandazioni advisory (solo modifiche eseguibili); corretto il riconoscimento delle negative (level minuscolo + campo keyword) e il parsing booleano delle conversioni (AdsApp.report torna booleani, non stringhe 'true') |
| 2.18.14 | 13 Giugno 2026 | La home 'Da fare oggi' contava urgenti su entita spente che la pagina Modifiche nasconde (incoerenza); ora conta solo modifiche su entita attive + la home si aggiorna quando torni sulla finestra |
| 2.18.13 | 13 Giugno 2026 | Analisi AI dei moduli abilitate solo dopo aver chattato nel Report AI (gate backend + bottone disabilitato con tooltip, scheduler non bloccato); Search Terms ora legge il contenuto del Report AI e propone i competitor citati come keyword negative |
| 2.18.12 | 13 Giugno 2026 | Modifiche meno rumore - 'Solo entita attive' e 'Da lavorare' attivi di default, la vista Per data apre il giorno piu recente con le sue card accese, rimossi i bottoni smart-bulk |
| 2.18.11 | 13 Giugno 2026 | Pagina Modifiche piu pulita - tab 'Modifiche' di default, card riassuntive legate al giorno selezionato nella vista Per data (spente finche non apri un giorno), rimossa la barra Progresso |
| 2.18.10 | 13 Giugno 2026 | Le raccomandazioni mostrano l'azione (es. 'Migliora Quality Score', 'Riscrivi annunci') + l'obiettivo + la motivazione AI, invece dell'etichetta fuorviante 'Stato Gruppo' e del finto before->after |
| 2.18.9 | 13 Giugno 2026 | Filtro 'Solo entita attive' nelle modifiche (nasconde quelle su campagne/gruppi/annunci/keyword in pausa o rimossi, con risalita al genitore) + vista Per data impostata come default |
| 2.18.8 | 13 Giugno 2026 | Pulsante 'Riporta in Attesa' per annullare un'approvazione fatta per sbaglio (da Approvata torna In Attesa) + nuova vista delle modifiche raggruppata per data (sessione di audit) |
| 2.18.7 | 13 Giugno 2026 | Importato il livello obiettivo (customer_conversion_goal.biddable) come goal_biddable sulle conversioni; l'AI ora valuta Primario/Secondario da questo invece che da primary_for_goal, niente piu falsi 'assenza di conversioni primarie' |
| 2.18.6 | 13 Giugno 2026 | L'analisi AI con Gemini falliva con 'Analysis failed' perche il JSON veniva troncato dal thinking di Gemini 3; alzato il budget token a 16k e aggiunto parsing difensivo con errore leggibile in caso di troncamento |
| 2.18.5 | 13 Giugno 2026 | La chat del report mostra un errore chiaro invece di far sparire il messaggio; il backend rimuove la domanda orfana e rilancia un errore leggibile (es. quota AI esaurita) quando il provider fallisce |
| 2.18.4 | 12 Giugno 2026 | I rifiuti ora sono permanenti - una modifica rifiutata non viene riproposta dall'AI finche lo stato attuale del dato resta invariato |
| 2.18.3 | 12 Giugno 2026 | Metriche di periodo gonfiate - daily_metrics deduplicate per (entita,giorno) tenendo l'import piu recente, niente piu somma tra run multipli |
| 2.18.2 | 12 Giugno 2026 | Card account legate al periodo selezionato con confronto (default 7gg+confronta); Da fare oggi solo modifiche urgenti, rimosse raccomandazioni dalla home |
| 2.18.1 | 12 Giugno 2026 | Badge conteggio pending nella sidebar agganciato a /accounts dopo rimozione Dashboard |
| 2.18.0 | 12 Giugno 2026 | Pagina Account unificata, split modifiche/raccomandazioni, AI ancorata a fattibilita e chat |
| 2.17.2 | 31 Maggio 2026 | Contatore termini netti e negativizzati nella pagina Search Terms |
| 2.17.1 | 31 Maggio 2026 | Marca i search term già spostati nelle negative nella pagina Search Terms |
| 2.17.0 | 31 Maggio 2026 | Analisi termini di ricerca nel report strategico + selezione multipla search terms con creazione negative in blocco |
| 2.16.0 | 4 Aprile 2026 | Redesign login page stile PMI: layout stretto, logo SVG, card con ombra |
| 2.15.1 | 26 Marzo 2026 | Improved report UX - clear new report flow, history pills, compare banner |
| 2.15.0 | 26 Marzo 2026 | 3 AI providers (OpenAI, Gemini, Claude) + report history with comparison + strategic per-report chat |
| 2.14.8 | 18 Marzo 2026 | Security hardening (JWT, XSS, rate limiting, TLS, encryption) + test suite + docs |
| 2.14.7 | 6 Marzo 2026 | Integrate Gemini 3 Flash as alternative AI provider |
| 2.14.6 | 4 Marzo 2026 | LP Planner excludes already-briefed keywords, persists clusters, prevents cannibalization |
| 2.14.5 | 4 Marzo 2026 | Auto-reload on chunk loading failure after deploys |
| 2.14.4 | 4 Marzo 2026 | Parse adGroupId~criterionId in keyword modifications for all download scripts |
| 2.14.3 | 4 Marzo 2026 | Extend daily_metrics entity_id to varchar(255) for long search terms |
| 2.14.2 | 4 Marzo 2026 | Daily_search_terms dedup + HMAC guard GET body mismatch |
| 2.14.1 | 4 Marzo 2026 | Add compare mode to entity tables with % change badges |
| 2.14.0 | 4 Marzo 2026 | Period filter on all entity tables (campaigns, ad groups, keywords, ads, search terms) |
| 2.13.4 | 4 Marzo 2026 | Performance section uses period-filtered data from daily_metrics |
| 2.13.3 | 4 Marzo 2026 | Add missing PeriodSelection import in DashboardPage |
| 2.13.2 | 4 Marzo 2026 | Add PeriodSelector to AuditLayout header on all audit pages |
| 2.13.1 | 4 Marzo 2026 | Remove old PeriodSelector from AuditLayout |
| 2.13.0 | 4 Marzo 2026 | Account strategy + daily metrics + period filter |
| 2.12.1 | 4 Marzo 2026 | Code cleanup, shared OpenAI provider, deploy script improvements |
| 2.12.0 | 4 Marzo 2026 | LP Planner con clustering keyword e brief AI per landing page |
| 2.11.2 | 3 Marzo 2026 | Esecuzione automatica audit rules durante analisi AI schedulata |
| 2.11.1 | 2 Marzo 2026 | Filtro tipo modifica nella pagina modifiche |
| 2.11.0 | 24 Febbraio 2026 | Scheduling AI per-account e deploy script migliorato |

---

*Ultimo aggiornamento: 13 Giugno 2026 | Versione app: 2.18.17*
