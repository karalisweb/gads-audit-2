# Changelog - KW GADS Audit

Tutte le modifiche rilevanti al progetto sono documentate in questo file.
Formato basato su [Semantic Versioning](https://semver.org/).

---



## [2.9.0] - 2026-02-20nn### Aggiunton- Dashboard widgets, modifications UI/UX, mobile card view, sidebar badge, audit breadcrumbnn---n## [2.8.0] - 2026-02-20nn### Aggiunton- Deploy strutturato con versioning obbligatorio, changelog auto, docs checknn---n## [2.7.0] - 2026-02-14

### Aggiunto
- **Pannello admin utenti**: pagina `/admin/users` per invitare collaboratori, gestire ruoli (admin/user), attivare/disattivare ed eliminare utenti
- **Helmet.js**: security headers HTTP (X-Frame-Options, X-Content-Type-Options, HSTS, etc.)
- **UX cron migliorata**: nella tab Schedule delle impostazioni, l'espressione cron viene mostrata in formato leggibile con preset cliccabili e campo avanzato collassabile
- **Guida utente**: documentazione per l'uso dell'applicazione (`docs/GUIDA-UTENTE.md`)
- **CHANGELOG.md**: storico versioni centralizzato

### Modificato
- **Riorganizzazione scripts**: gli script Google Ads sono ora in `scripts/download/` e `scripts/upload/` con nomi coerenti (`google-ads-download-*`, `google-ads-upload-*`)
- **Sidebar**: link "Utenti" spostato nel footer, visibile solo per admin
- **deploy.sh**: il bump di versione ora aggiorna automaticamente anche `Sidebar.tsx` e `LoginPage.tsx`
- **Documentazione aggiornata**: DEPLOY.md, PROJECT_STATUS.md, CLAUDE.md allineati allo stato reale (path, porte, nomi PM2, URL corretti)

### Rimosso
- Account Sfrido e relativi script
- Console.log di debug dal HMAC guard (leak di informazioni sensibili in produzione)

### Sicurezza
- Aggiunto Helmet.js per hardening HTTP headers
- Rimossi log di debug che esponevano signature, secret e body delle richieste HMAC

---

## [2.6.0] - 2026-02-08

### Aggiunto
- **Schedulazione analisi AI**: esecuzione automatica con espressione cron e invio report via email
- **AI analysis logging**: tracciamento analisi con percentuale accettazione raccomandazioni
- **Analisi landing page**: modulo AI 24 per analisi pagine di destinazione

### Modificato
- Injection contesto strategia bidding in tutti i moduli AI
- Impression share metrics nelle query GAQL per ad group e keyword

### Fix
- Sanitizzazione entityId per negative keywords e landing pages
- Prevenzione NaN nei CPC bids generati dall'AI
- Correzione entityId errati negli annunci
- Prevenzione URL generati come testo nelle modifiche AI

---

## [2.5.0] - 2026-02-01

### Aggiunto
- **Modifiche automatiche**: workflow completo pending -> approved -> applied/failed
- **Script Google Ads Upload**: script per applicare modifiche approvate via Google Ads Scripts
- **Creazione manuale modifiche**: modale per creare modifiche senza AI
- **Pagina modifiche**: vista completa con filtri, approvazione e tracking status

---

## [2.4.0] - 2026-01-25

### Aggiunto
- **Analisi AI**: integrazione OpenAI per generare raccomandazioni di ottimizzazione
- **Configurazione AI**: pagina settings per API key e selezione modello
- **AI Analysis Panel**: pannello risultati con raccomandazioni dettagliate

---

## [2.3.0] - 2026-01-18

### Aggiunto
- **Dashboard audit**: KPI, quality score, health score, trend performance con Recharts
- **Dashboard principale**: overview account con health score
- **DataTable component**: componente riusabile con TanStack Table
- **13 viste audit**: campaigns, ad groups, ads, keywords, search terms, negative keywords, assets, conversions, conversion actions, landing pages, issues
- **Layout responsive**: sidebar desktop + bottom nav mobile
- **PeriodSelector**: selettore periodo per filtri temporali

---

## [2.2.0] - 2026-01-12

### Aggiunto
- **API dati audit**: endpoint per campaigns, ad-groups, ads, keywords, search-terms, negative-keywords, assets, kpis, conversion-actions, geo-performance, device-performance
- **Paginazione e filtri**: DTOs per paginazione, ordinamento e filtri

---

## [2.1.0] - 2026-01-06

### Aggiunto
- **Ingestion Google Ads**: endpoint POST per ricezione dati da Google Ads Scripts
- **HMAC-SHA256 auth**: autenticazione script con firma crittografica e finestra temporale 5 min
- **Idempotenza**: gestione chunks duplicati con import_chunks table
- **Google Ads Script download**: script per esportazione dati da 6 account

---

## [2.0.0] - 2025-12-28

### Aggiunto
- **Progetto iniziale**: NestJS v11 + React 19 + Vite 7 + TypeScript
- **Autenticazione**: JWT con refresh token rotation, 2FA via email OTP
- **Gestione utenti**: inviti via email, ruoli admin/user, lockout account
- **Infrastruttura**: Docker Compose per PostgreSQL 16 + Redis 7
- **23 entities TypeORM**: schema database completo
- **Deploy**: script automatico con versioning semantico, PM2 + Nginx

---

*Ultimo aggiornamento: 2026-02-14*
