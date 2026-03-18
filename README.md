# KW GADS Audit

Piattaforma SaaS per audit e ottimizzazione di account Google Ads. Analisi AI, raccomandazioni automatiche, e applicazione modifiche via Google Ads Scripts.

**Versione**: 2.14.7
**URL produzione**: https://gads.karalisdemo.it
**Stack**: NestJS 11 + React 19 + PostgreSQL 16 + Redis 7

---

## Quick Start (setup locale in 5 minuti)

### Prerequisiti

- Node.js 20+
- Docker e Docker Compose
- Git

### 1. Clona e installa

```bash
git clone <repo-url>
cd GADS\ Audit\ 2

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Avvia database e Redis

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Questo avvia PostgreSQL (porta 5432) e Redis (porta 6379) in container Docker.

### 3. Configura environment

```bash
cp backend/.env.example backend/.env
# Modifica backend/.env con le tue chiavi (vedi sezione Environment)
```

### 4. Avvia backend e frontend

```bash
# Terminal 1 - Backend (porta 3001)
cd backend && npm run start:dev

# Terminal 2 - Frontend (porta 5173)
cd frontend && npm run dev
```

### 5. Apri il browser

Vai su http://localhost:5173

---

## Struttura progetto

```
├── backend/src/
│   ├── entities/           # 30 entità TypeORM (DB schema)
│   ├── modules/
│   │   ├── auth/           # Login, JWT, 2FA, inviti, password reset
│   │   ├── users/          # Gestione utenti e ruoli
│   │   ├── integrations/   # Ingestion dati da Google Ads Scripts (HMAC auth)
│   │   ├── audit/          # KPI, health score, regole audit
│   │   ├── ai/             # Analisi AI (OpenAI/Gemini), report, chat
│   │   ├── modifications/  # Workflow modifiche (pending→approved→applied)
│   │   ├── decisions/      # Storico decisioni approvazione/rifiuto
│   │   ├── export/         # Export CSV/Excel
│   │   ├── email/          # Invio email (OTP, report, inviti)
│   │   ├── settings/       # Configurazione AI, scheduling
│   │   └── landing-pages/  # LP Planner con clustering keyword
│   ├── migrations/         # Migrazioni database
│   └── config/             # Configurazione app, DB, JWT, AI
│
├── frontend/src/
│   ├── pages/              # Pagine: dashboard, audit, accounts, modifications, auth
│   ├── components/         # Componenti riutilizzabili (Radix UI)
│   ├── api/                # Client API (fetch wrapper)
│   ├── hooks/              # Custom hooks React
│   ├── stores/             # State management (Zustand)
│   └── types/              # Definizioni TypeScript
│
├── scripts/
│   ├── download/           # Google Ads Scripts per download dati (6 account)
│   └── upload/             # Google Ads Scripts per applicare modifiche
│
└── docs/                   # Documentazione tecnica e guida utente
```

---

## Architettura

### Flow dati principale

```
Google Ads Account
    │
    ▼ (Google Ads Script, ogni ~giorno)
┌──────────────────┐
│ POST /api/integrations/google-ads/ingest │  ← HMAC-SHA256 auth
└──────────┬───────┘
           ▼
┌──────────────────┐
│   PostgreSQL DB  │  ← campaigns, ad_groups, ads, keywords, search_terms...
└──────────┬───────┘
           ▼
┌──────────────────┐
│  AI Analysis     │  ← OpenAI GPT / Google Gemini
│  (per modulo)    │
└──────────┬───────┘
           ▼
┌──────────────────┐
│  Modifications   │  ← pending → approved → applied/failed
│  (workflow)      │
└──────────┬───────┘
           ▼
┌──────────────────┐
│ Google Ads Script │  ← GET /api/.../modifications/pending
│ (upload)         │  ← POST /api/.../modifications/:id/result
└──────────────────┘
```

### Autenticazione

| Tipo | Uso | Meccanismo |
|------|-----|------------|
| **JWT** | Frontend ↔ Backend | Bearer token + refresh token rotation |
| **HMAC-SHA256** | Google Ads Scripts ↔ Backend | Header X-Signature, X-Timestamp, X-Account-Id |
| **2FA** | Login utente | OTP via email (6 cifre, scadenza 10 min) |

### Moduli AI

L'analisi AI è modulare. Ogni modulo analizza un aspetto specifico dell'account:

| # | Modulo | Analizza |
|---|--------|----------|
| 1 | Campagne | Budget, bidding strategy, performance |
| 2 | Gruppi annunci | Struttura, CPC bid, distribuzione |
| 3 | Annunci RSA | Headline, descrizioni, ad strength |
| 4 | Keyword | Quality score, match type, performance |
| 5 | Termini ricerca | Query reali, negative keyword opportunities |
| 6 | Negative Keywords | Copertura, gap, keyword conflict |
| 7 | Asset/Estensioni | Sitelink, callout, snippet |
| 8 | Conversioni | Setup, attribution, valori |
| 9 | Landing Pages | Performance URL, distribuzione |

---

## Comandi utili

### Sviluppo

```bash
# TypeScript check (senza compilare)
cd backend && npx tsc --noEmit

# Test
cd backend && npm test                    # Unit test
cd backend && npm run test:cov            # Con coverage
cd backend && npm run test:e2e            # End-to-end

# Lint
cd backend && npm run lint
cd frontend && npm run lint

# Build produzione
cd frontend && npm run build
cd backend && npm run build
```

### Database

```bash
# Creare migrazione
cd backend && npm run migration:generate -- -n NomeMigrazione

# Eseguire migrazioni
cd backend && npm run migration:run

# Revert ultima migrazione
cd backend && npm run migration:revert
```

### Deploy

```bash
# Deploy automatico (bump patch + git push + build + restart PM2)
./deploy.sh --bump patch "descrizione fix"

# Deploy senza version bump
./deploy.sh "messaggio commit"
```

---

## Environment variables (backend/.env)

```env
# App
PORT=3001
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=audit
DB_PASSWORD=dev_password
DB_DATABASE=google_ads_audit

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_ACCESS_EXPIRATION=15m

# AI (almeno uno dei due)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
AI_PROVIDER=openai

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=password
```

---

## Account Google Ads gestiti

| Account | Customer ID | Note |
|---------|-------------|------|
| Arredi 2000 | 5448290625 | Ecommerce arredamento |
| Casa Bulldog | - | Allevamento |
| Colombo Palace | - | Hotel |
| Massimo Borio | 8164965072 | Professionista |
| Officina 3MT | 7050747943 | Officina auto |
| Sardegna Trasferimenti | 1094402562 | Trasporti |

---

## Documentazione

| Documento | Descrizione |
|-----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Istruzioni per Claude Code / AI assistant |
| [docs/GUIDA-UTENTE.md](docs/GUIDA-UTENTE.md) | Manuale utente completo |
| [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) | Dettagli server e infrastruttura |
| [CHANGELOG.md](CHANGELOG.md) | Storico versioni e modifiche |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Design system Karalisweb |
| [DEPLOY.md](DEPLOY.md) | Guida deploy produzione |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Stato completamento feature |

---

## Convenzioni

- **Commit**: inglese, prefisso `feat:` / `fix:` / `refactor:` / `docs:`
- **Codice backend**: inglese, commenti in italiano dove utile
- **Versioning**: Semantic Versioning (MAJOR.MINOR.PATCH), gestito da `deploy.sh`
- **Branch**: lavoro su `main` (single developer), tag per ogni release
