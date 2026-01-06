# Google Ads Audit App v2.0 - Stato Progetto

## Ultimo Aggiornamento: 2026-01-06

---

## COMPLETATO

### STEP 1 - Infrastruttura ✅

| Task | Stato |
|------|-------|
| Struttura cartelle progetto | ✅ |
| Backend NestJS inizializzato | ✅ |
| Frontend React + Vite + TypeScript | ✅ |
| Tailwind CSS v4 + shadcn/ui base | ✅ |
| docker-compose.dev.yml (PostgreSQL + Redis) | ✅ |
| Schema SQL completo (19 tabelle) | ✅ |
| TypeORM configurato con 19 entities | ✅ |
| Build verificati (backend + frontend) | ✅ |

### STEP 2 - Auth ✅

| Task | Stato |
|------|-------|
| Modulo auth NestJS (controller, service, module) | ✅ |
| Strategia JWT (access + refresh token rotation) | ✅ |
| 2FA TOTP con otplib (QR code, backup codes) | ✅ |
| Guards: JwtAuthGuard, TwoFactorGuard, RolesGuard | ✅ |
| Rate limiting (ThrottlerModule) | ✅ |
| Endpoint: login, logout, refresh, invite, accept-invite | ✅ |
| Modulo users NestJS (CRUD admin) | ✅ |
| Frontend: Login page | ✅ |
| Frontend: 2FA verification page | ✅ |
| Frontend: Setup 2FA page | ✅ |
| Frontend: Accept invite page | ✅ |
| Zustand auth store con persistenza | ✅ |
| React Router v6 con ProtectedRoute | ✅ |

### STEP 3 - Ingestion ✅

| Task | Stato |
|------|-------|
| Modulo integrations NestJS | ✅ |
| Endpoint POST /api/integrations/google-ads/ingest | ✅ |
| Validazione HMAC-SHA256 (HmacAuthGuard) | ✅ |
| Idempotenza chunks (import_chunks table) | ✅ |
| Salvataggio dati in tutte le 10 tabelle | ✅ |
| Import run tracking (status, progress) | ✅ |
| Google Ads Script completo | ✅ |

**File creati:**
- `backend/src/modules/integrations/integrations.module.ts`
- `backend/src/modules/integrations/integrations.controller.ts`
- `backend/src/modules/integrations/integrations.service.ts`
- `backend/src/modules/integrations/guards/hmac-auth.guard.ts`
- `backend/src/modules/integrations/dto/ingest.dto.ts`
- `scripts/google-ads-exporter.js`

### STEP 4 - API Dati ✅

| Task | Stato |
|------|-------|
| Modulo audit NestJS | ✅ |
| DTOs paginazione e filtri | ✅ |
| GET /api/audit/accounts | ✅ |
| GET /api/audit/accounts/:id/campaigns | ✅ |
| GET /api/audit/accounts/:id/ad-groups | ✅ |
| GET /api/audit/accounts/:id/ads | ✅ |
| GET /api/audit/accounts/:id/keywords | ✅ |
| GET /api/audit/accounts/:id/search-terms | ✅ |
| GET /api/audit/accounts/:id/negative-keywords | ✅ |
| GET /api/audit/accounts/:id/assets | ✅ |
| GET /api/audit/accounts/:id/kpis | ✅ |
| GET /api/audit/accounts/:id/conversion-actions | ✅ |
| GET /api/audit/accounts/:id/geo-performance | ✅ |
| GET /api/audit/accounts/:id/device-performance | ✅ |

**File creati:**
- `backend/src/modules/audit/audit.module.ts`
- `backend/src/modules/audit/audit.controller.ts`
- `backend/src/modules/audit/audit.service.ts`
- `backend/src/modules/audit/dto/pagination.dto.ts`
- `backend/src/modules/audit/dto/filters.dto.ts`

---

## DA FARE - SVILUPPO LOCALE

### STEP 5 - Frontend Dati (Prossimo)
- [ ] Componente DataTable (TanStack Table)
- [ ] Viste: Campaigns, Ad Groups, Ads, Keywords, Search Terms, Negatives, Assets
- [ ] Dashboard con KPI

### STEP 6 - Decisioni
- [ ] CRUD decisioni con versioning
- [ ] Storico e rollback
- [ ] Frontend: Decision form, Decision log

### STEP 7 - Export
- [ ] Generazione CSV per Google Ads Editor
- [ ] ZIP + README
- [ ] Frontend: Change Set management, Export center

### STEP 8 - Polish
- [ ] ProcedurePanel (23 moduli audit)
- [ ] Admin: gestione utenti e account
- [ ] Audit log completo
- [ ] Error handling, loading states

---

## DA FARE - VPS CONTABO (gads.karalisweb.it)

### Prerequisiti VPS
- [x] Ubuntu 24.04 LTS
- [x] 8GB RAM, 4 CPU, 290GB disco
- [x] Nginx già installato (porte 80/443)
- [ ] Installare Docker e Docker Compose

### Setup VPS (da fare prima del deploy)
```bash
# 1. Installa Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 2. Installa Docker Compose plugin
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 3. Verifica installazione
docker --version
docker compose version

# 4. Crea directory app
mkdir -p /var/www/gads-audit
cd /var/www/gads-audit
```

### Configurazione Nginx (da fare)
- [ ] Creare `/etc/nginx/sites-available/gads.karalisweb.it`
- [ ] Proxy pass verso container backend (porta 3002)
- [ ] Servire frontend come file statici
- [ ] Configurare SSL con Let's Encrypt

### File da creare per produzione
- [ ] `docker-compose.yml` (produzione)
- [ ] `.env.production`
- [ ] Script di deploy

### Deploy checklist
- [ ] Clonare repo su VPS
- [ ] Copiare `.env.production`
- [ ] `docker compose up -d`
- [ ] Verificare Nginx proxy
- [ ] Testare SSL

---

## COME CONTINUARE LO SVILUPPO

### Prerequisiti Locale
- Node.js 20+
- PostgreSQL 15 (via Homebrew) oppure Docker
- Redis (via Homebrew) oppure Docker

### Avviare l'ambiente di sviluppo (senza Docker)

```bash
cd "/Users/alessio/Desktop/Sviluppo App Claude Code/GADS Audit 2"

# 1. Avvia PostgreSQL e Redis (se non già attivi)
brew services start postgresql@15
brew services start redis

# 2. Backend (porta 3002)
cd backend
npm run start:dev

# 3. Frontend (porta 5173) - in altro terminale
cd frontend
npm run dev
```

### Avviare l'ambiente di sviluppo (con Docker)

```bash
cd "/Users/alessio/Desktop/Sviluppo App Claude Code/GADS Audit 2"

# 1. Avvia database e Redis
docker compose -f docker-compose.dev.yml up -d

# 2. Backend (porta 3002)
cd backend
npm run start:dev

# 3. Frontend (porta 5173) - in altro terminale
cd frontend
npm run dev
```

### URL Locali
- Frontend: http://localhost:5173
- Backend API: http://localhost:3002/api
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Prompt per nuova chat Claude

```
Sto continuando lo sviluppo della Google Ads Audit App v2.0.

Leggi questi file per il contesto:
1. PROJECT_STATUS.md - stato attuale e cosa manca
2. PROMPT_CLAUDE_CODE_V2.md - specifiche complete del progetto
3. audit_mapping.md - mapping dei 23 moduli di audit

STEP 1-4 completati (Infrastruttura, Auth, Ingestion, API Dati).
Devo procedere con STEP 5 - Frontend Dati.

Il progetto si trova in: /Users/alessio/Desktop/Sviluppo App Claude Code/GADS Audit 2
```

---

## NOTE TECNICHE

### Porte utilizzate
| Servizio | Porta | Note |
|----------|-------|------|
| Backend API | 3002 | NestJS |
| Frontend Dev | 5173 | Vite dev server |
| PostgreSQL | 5432 | Docker container |
| Redis | 6379 | Docker container |

### Database
- PostgreSQL 16
- User: audit / Password: dev_password
- Database: google_ads_audit
- Schema in: backend/init.sql

### Componenti UI disponibili (shadcn)
- Button, Input, Label, Card
- Da aggiungere: Dialog, Select, Table, Toast, etc.

---

## INFO VPS CONTABO

```
OS: Ubuntu 24.04.3 LTS
RAM: 8GB
CPU: 4 core
Disco: 290GB
IP: (inserire IP)
Dominio: gads.karalisweb.it
Nginx: già attivo su 80/443
Porte occupate: 3000, 3001 (altre app)
```
