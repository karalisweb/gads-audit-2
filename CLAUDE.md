# CLAUDE.md - GADS Audit 2

## Progetto
Piattaforma SaaS per audit e ottimizzazione di account Google Ads. Gestisce 7 account clienti, analisi AI, e applicazione automatica delle modifiche via Google Ads Scripts.

## Stack tecnico
- **Backend**: NestJS v11, TypeScript, TypeORM, PostgreSQL 16, Redis 7, JWT auth
- **Frontend**: React 19, Vite 7, Tailwind CSS, Radix UI, Zustand, TanStack Query/Table
- **AI**: OpenAI (GPT) per raccomandazioni di ottimizzazione
- **Runtime produzione**: PM2 + Nginx reverse proxy

## Struttura progetto
```
backend/src/
  entities/         # 23 entita TypeORM
  modules/          # auth, users, integrations, audit, modifications, ai, export, email, settings, decisions
  migrations/       # Migrazioni DB
  config/           # Configurazione
  common/           # Guards, decorators, utilities

frontend/src/
  pages/            # audit, accounts, modifications, dashboard, auth, settings, admin
  components/       # Layout, ai, modifications, ui (Radix), data-table
  api/              # Client API
  hooks/            # Custom hooks
  stores/           # Zustand stores
  types/            # Tipi TypeScript

scripts/            # Google Ads Scripts (exporter + modifier per ogni account)
docs/               # Documentazione tecnica
```

## Comandi sviluppo
```bash
# Database e Redis locali
docker-compose -f docker-compose.dev.yml up

# Backend (porta 3001)
cd backend && npm run start:dev

# Frontend (porta 5173)
cd frontend && npm run dev

# TypeScript check
cd backend && npx tsc --noEmit

# Migrazioni DB
cd backend && npm run migration:generate -- -n NomeMigrazione
cd backend && npm run migration:run
```

## Deploy (Produzione)
```bash
# Deploy automatico con script
./deploy.sh "messaggio commit"
./deploy.sh --bump patch "descrizione fix"

# Deploy manuale
git push origin main
ssh root@vmi2996361.contaboserver.net
cd /var/www/gads-audit-2
git pull origin main
cd frontend && npm install && npm run build && cd ..
cd backend && npm install && npm run build && cd ..
cp -r frontend/dist/* /var/www/gads-audit-2/public/
pm2 restart gads-audit --update-env
```

## Infrastruttura produzione
- **Server**: vmi2996361.contaboserver.net (Contabo VPS, 185.192.97.108)
- **SSH**: `root@vmi2996361.contaboserver.net`
- **Path progetto**: `/var/www/gads-audit-2`
- **URL pubblica**: https://gads.karalisdemo.it
- **Nginx config**: `/etc/nginx/sites-available/gads-audit`
- **PM2 processo**: `gads-audit` (porta 3001)
- **DB produzione**: PostgreSQL su localhost:5432, db=`gadsaudit`, user=`gadsaudit`, pass=`Karalisweb2025`
- **DB locale**: PostgreSQL su localhost:5432, db=`google_ads_audit`, user=`audit`, pass=`dev_password`

## Query DB utili (produzione via SSH)
```bash
# Connessione al DB
ssh root@vmi2996361.contaboserver.net "PGPASSWORD=Karalisweb2025 psql -h localhost -U gadsaudit -d gadsaudit"

# Modifiche fallite per un account (es. 3MT = 7050747943)
ssh root@vmi2996361.contaboserver.net "PGPASSWORD=Karalisweb2025 psql -h localhost -U gadsaudit -d gadsaudit -c \"SELECT m.id, m.entity_name, m.modification_type, m.status FROM modifications m JOIN google_ads_accounts a ON m.account_id = a.id WHERE a.customer_id = '7050747943' AND m.status = 'failed';\""

# Resettare modifiche failed -> approved
ssh root@vmi2996361.contaboserver.net "PGPASSWORD=Karalisweb2025 psql -h localhost -U gadsaudit -d gadsaudit -c \"UPDATE modifications SET status = 'approved', result_message = NULL, result_details = NULL, applied_at = NULL FROM google_ads_accounts a WHERE modifications.account_id = a.id AND a.customer_id = '7050747943' AND modifications.status = 'failed';\""
```

## Account Google Ads gestiti
| Account | Customer ID | Script modifier |
|---------|-------------|-----------------|
| Arredi 2000 | 5448290625 | `google-ads-modifier-arredi-2000.js` |
| Casa Bulldog | - | `google-ads-modifier-casa-bulldog.js` |
| Colombo Palace | - | `google-ads-modifier-colombo-palace.js` |
| Massimo Borio | 8164965072 | `google-ads-modifier-massimo-borio.js` |
| Officina 3MT | 7050747943 | `google-ads-modifier-officina-3mt.js` |
| Sardegna Trasferimenti | 1094402562 | `google-ads-modifier-sardegna-trasferimenti.js` |
| Sfrido | 2409021335 | `google-ads-modifier-sfrido.js` |

## Autenticazione API
- **Endpoint normali**: JWT Bearer token (login via `POST /auth/login`)
- **Endpoint integrazione Google Ads**: HMAC-SHA256 (header X-Signature, X-Timestamp, X-Account-Id) con shared secret per account
- **Guard globale JWT**: tutte le rotte protette tranne quelle con `@Public()`

## Flow modifiche
1. L'AI analizza l'account e genera raccomandazioni (`POST /ai/analyze`)
2. Le raccomandazioni vengono convertite in modifiche (`POST /modifications/from-ai`) con status `pending`
3. L'admin approva le modifiche (`POST /modifications/:id/approve`) -> status `approved`
4. Lo script Google Ads Modifier (in ogni account) chiama `GET /integrations/google-ads/modifications/pending`
5. Lo script applica le modifiche e invia il risultato via `POST /integrations/google-ads/modifications/:id/result`
6. Status finale: `applied` (successo) o `failed` (errore)

## Convenzioni
- Commit message in inglese, prefisso: feat/fix/refactor/docs
- Codice backend in inglese, commenti e log in italiano dove utile
- Ogni account ha il suo script modifier dedicato nella cartella `scripts/`
