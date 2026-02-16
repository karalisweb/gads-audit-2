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

*Ultimo aggiornamento: 2026-02-14 | Versione app: 2.7.0*
