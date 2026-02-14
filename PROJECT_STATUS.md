# KW GADS Audit - Stato Progetto

## Ultimo Aggiornamento: 2026-02-14

---

## COMPLETATO

### STEP 1 - Infrastruttura

| Task | Stato |
|------|-------|
| Struttura cartelle progetto | Done |
| Backend NestJS v11 inizializzato | Done |
| Frontend React 19 + Vite 7 + TypeScript | Done |
| Tailwind CSS + Radix UI | Done |
| docker-compose.dev.yml (PostgreSQL + Redis) | Done |
| Schema SQL completo (23 tabelle) | Done |
| TypeORM configurato con 23 entities | Done |
| Build verificati (backend + frontend) | Done |

### STEP 2 - Auth e Sicurezza

| Task | Stato |
|------|-------|
| Modulo auth NestJS (controller, service, module) | Done |
| Strategia JWT (access + refresh token rotation) | Done |
| 2FA via email OTP (6 digit, rate limited) | Done |
| Guards: JwtAuthGuard, TwoFactorGuard, RolesGuard | Done |
| Rate limiting (ThrottlerModule) | Done |
| Account lockout (5 tentativi, blocco 15 min) | Done |
| Endpoint: login, logout, refresh, invite, accept-invite | Done |
| Password reset via email OTP | Done |
| Modulo users NestJS (CRUD admin) | Done |
| Frontend: Login page, 2FA verification, Accept invite | Done |
| Frontend: Forgot/Reset password | Done |
| Zustand auth store con persistenza | Done |
| React Router con ProtectedRoute | Done |

### STEP 3 - Ingestion Google Ads

| Task | Stato |
|------|-------|
| Modulo integrations NestJS | Done |
| Endpoint POST /api/integrations/google-ads/ingest | Done |
| Validazione HMAC-SHA256 (HmacAuthGuard) | Done |
| Idempotenza chunks (import_chunks table) | Done |
| Salvataggio dati in tutte le tabelle | Done |
| Import run tracking (status, progress) | Done |
| Google Ads Scripts download (6 account) | Done |
| Google Ads Scripts upload/modifier (6 account) | Done |

### STEP 4 - API Dati e Audit

| Task | Stato |
|------|-------|
| Modulo audit NestJS | Done |
| DTOs paginazione e filtri | Done |
| API: accounts, campaigns, ad-groups, ads | Done |
| API: keywords, search-terms, negative-keywords | Done |
| API: assets, kpis, conversion-actions | Done |
| API: geo-performance, device-performance | Done |

### STEP 5 - Frontend Dati

| Task | Stato |
|------|-------|
| Componente DataTable (TanStack Table) | Done |
| Dashboard principale (KPI, overview) | Done |
| Dashboard audit per account | Done |
| Vista Campaigns | Done |
| Vista Ad Groups | Done |
| Vista Ads | Done |
| Vista Keywords | Done |
| Vista Negative Keywords | Done |
| Vista Search Terms | Done |
| Vista Landing Pages | Done |
| Vista Assets | Done |
| Vista Conversions e Conversion Actions | Done |
| Vista Issues (problemi audit) | Done |
| Account listing e management | Done |
| PeriodSelector (selettore date) | Done |
| Layout responsive con sidebar + mobile nav | Done |

### STEP 6 - AI e Raccomandazioni

| Task | Stato |
|------|-------|
| Modulo AI NestJS (analisi con OpenAI) | Done |
| AI Analysis Button (trigger per account) | Done |
| AI Analysis Panel (visualizzazione risultati) | Done |
| AI Recommendations display | Done |
| Injection contesto strategia bidding | Done |
| Impression share metrics nelle query GAQL | Done |

### STEP 7 - Modifiche e Upload

| Task | Stato |
|------|-------|
| Modulo modifications NestJS | Done |
| Conversione raccomandazioni AI in modifiche | Done |
| Workflow: pending -> approved -> applied/failed | Done |
| ModificationsPage (lista, approvazione) | Done |
| CreateModificationModal (creazione manuale) | Done |
| ModifyButton component | Done |
| Script Google Ads Modifier per 6 account | Done |
| Endpoint GET/POST per sync modifiche con Scripts | Done |
| Sanitizzazione entityId (negative keywords, landing pages) | Done |
| Validazione CPC bids (prevenzione NaN) | Done |

### STEP 8 - Settings e Profilo

| Task | Stato |
|------|-------|
| Settings page (profilo, password, security, AI, schedule) | Done |
| Profile page | Done |
| Configurazione API key OpenAI | Done |
| Selezione modello OpenAI | Done |
| Toggle 2FA | Done |
| Scheduling analisi automatiche | Done |

---

## DA FARE

### Pannello Admin

| Task | Stato |
|------|-------|
| Lista utenti (frontend) | Da fare |
| Invita collaboratore (frontend) | Da fare |
| Gestione ruoli admin/user (frontend) | Da fare |
| Attivazione/disattivazione utenti (frontend) | Da fare |
| Assegnazione account a utenti (frontend) | Da fare |

**Nota**: Le API backend per tutte queste funzionalita esistono gia (`GET /users`, `POST /auth/invite`, `PATCH /users/:id/role`, etc.). Manca solo l'interfaccia frontend.

### Sicurezza (miglioramenti)

| Task | Stato |
|------|-------|
| Helmet.js (security headers HTTP) | Da fare |
| Rimuovere console.log debug da HMAC guard | Da fare |
| Lista password comuni piu completa | Da fare |

### Export

| Task | Stato |
|------|-------|
| Export CSV per Google Ads Editor | Da fare |
| Export UI nel frontend | Da fare |

---

## Struttura Scripts Google Ads

```
scripts/
  ├─ google-ads-download.js          # Template base download
  ├─ google-ads-upload.js             # Template base upload
  ├─ download-remote-db.sh            # Backup DB remoto
  ├─ download/                        # Download per account
  │   ├─ google-ads-download-arredi-2000.js
  │   ├─ google-ads-download-casa-bulldog.js
  │   ├─ google-ads-download-colombo-palace.js
  │   ├─ google-ads-download-massimo-borio.js
  │   ├─ google-ads-download-officina-3mt.js
  │   └─ google-ads-download-sardegna-trasferimenti.js
  └─ upload/                          # Upload/modifier per account
      ├─ google-ads-upload-arredi-2000.js
      ├─ google-ads-upload-casa-bulldog.js
      ├─ google-ads-upload-colombo-palace.js
      ├─ google-ads-upload-massimo-borio.js
      ├─ google-ads-upload-officina-3mt.js
      └─ google-ads-upload-sardegna-trasferimenti.js
```

---

## Account Google Ads gestiti (6 attivi)

| Account | Customer ID |
|---------|-------------|
| Arredi 2000 | 5448290625 |
| Casa Bulldog | - |
| Colombo Palace | - |
| Massimo Borio | 8164965072 |
| Officina 3MT | 7050747943 |
| Sardegna Trasferimenti | 1094402562 |

**Nota**: L'account Sfrido (2409021335) e stato rimosso dagli script.

---

## Sviluppo Locale

### Prerequisiti
- Node.js 20+
- PostgreSQL 16 (via Homebrew o Docker)
- Redis 7 (via Homebrew o Docker)

### Avviare con Docker

```bash
cd "/Users/alessio/Desktop/Sviluppo App Claude Code/GADS Audit 2"

# 1. Database e Redis
docker compose -f docker-compose.dev.yml up -d

# 2. Backend (porta 3001)
cd backend && npm run start:dev

# 3. Frontend (porta 5173) - in altro terminale
cd frontend && npm run dev
```

### Avviare con Homebrew

```bash
# 1. Avvia PostgreSQL e Redis
brew services start postgresql@15
brew services start redis

# 2. Backend (porta 3001)
cd backend && npm run start:dev

# 3. Frontend (porta 5173)
cd frontend && npm run dev
```

### URL Locali
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

*Ultimo aggiornamento: 2026-02-14*
