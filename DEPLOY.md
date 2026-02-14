# KW GADS Audit - Guida Deploy

Versione attuale: **2.7.0**

---

## Informazioni Server

| Parametro | Valore |
|-----------|--------|
| **Host** | vmi2996361.contaboserver.net |
| **IP** | 185.192.97.108 |
| **User** | root |
| **Path applicazione** | `/var/www/gads-audit-2` |
| **PM2 process name** | `gads-audit` |
| **Porta backend** | 3001 |
| **URL pubblico** | https://gads.karalisdemo.it |
| **Nginx config** | `/etc/nginx/sites-available/gads-audit` |
| **GitHub repo** | github.com/karalisweb/gads-audit-2 |
| **Branch** | main |
| **Database** | PostgreSQL 16 (Docker) |
| **Cache** | Redis 7 (Docker) |
| **Framework frontend** | React 19 + Vite 7 + TypeScript |
| **Framework backend** | NestJS v11 |

---

## Deploy con Script

### Deploy standard (commit + push + build + restart)

```bash
./deploy.sh "descrizione delle modifiche"
```

### Deploy con aggiornamento versione

```bash
# Bug fix (2.6.0 → 2.6.1)
./deploy.sh --bump patch "fix calcolo metriche audit"

# Nuova funzionalita (2.6.0 → 2.7.0)
./deploy.sh --bump minor "aggiunto export CSV"

# Breaking change (2.6.0 → 3.0.0)
./deploy.sh --bump major "redesign dashboard completo"
```

Il flag `--bump` aggiorna automaticamente la versione in:
- `frontend/package.json`
- `deploy.sh` (header + variabile APP_VERSION)
- `DEPLOY.md` (questo file)

---

## Cosa fa deploy.sh (7 step)

| Step | Azione | Dettaglio |
|------|--------|-----------|
| 0 | **Versioning** (opzionale) | Se `--bump`, aggiorna versione in tutti i file |
| 1 | **Verifica Git** | Controlla modifiche locali e branch corretto |
| 2 | **Commit** | `git add .` + `git commit -m "messaggio"` |
| 3 | **Push** | `git push origin main` |
| 4 | **Pull + Install** | Sul VPS: `git pull` + `npm install` (frontend + backend) |
| 5 | **Build Frontend** | Sul VPS: `npm run build` + copia in `/public/` |
| 6 | **Build Backend** | Sul VPS: `npm run build` |
| 7 | **Restart** | `pm2 restart gads-audit --update-env` |

---

## Comandi Manuali

### Deploy manuale (senza script)

```bash
# 1. Push locale
git add . && git commit -m "messaggio" && git push origin main

# 2. Sul server
ssh root@185.192.97.108
cd /var/www/gads-audit-2
git pull origin main

# 3. Build frontend
cd frontend && npm install && npm run build
cp -r dist/* /var/www/gads-audit-2/public/
cd ..

# 4. Build backend
cd backend && npm install && npm run build
cd ..

# 5. Restart backend
pm2 restart gads-audit --update-env
```

### Solo Restart

```bash
ssh root@185.192.97.108 'pm2 restart gads-audit'
```

### Verifica Logs

```bash
ssh root@185.192.97.108 'pm2 logs gads-audit --lines 20 --nostream'
```

### Verifica Status

```bash
ssh root@185.192.97.108 'pm2 show gads-audit'
```

### Verifica Nginx

```bash
ssh root@185.192.97.108 'nginx -t && systemctl reload nginx'
```

---

## Regole per deploy.sh

Lo script `deploy.sh` deve sempre contenere nella sezione CONFIGURAZIONE:

```bash
APP_NAME="KW GADS Audit"            # Nome app
APP_VERSION="X.Y.Z"                 # Versione corrente (semantic versioning)
VPS_HOST="root@185.192.97.108"      # Accesso VPS
VPS_PATH="/var/www/gads-audit-2"    # Path sul server
BRANCH="main"                       # Branch Git
PM2_PROCESS="gads-audit"            # Nome processo PM2
LOCAL_PORT_FRONTEND=5173             # Porta frontend in sviluppo locale
LOCAL_PORT_BACKEND=3001              # Porta backend in sviluppo locale
SERVER_PORT=3001                     # Porta backend sul server
PUBLIC_URL="https://gads.karalisdemo.it"  # URL pubblico
NGINX_CONFIG="/etc/nginx/sites-available/gads-audit"  # Config Nginx
```

L'header ASCII dello script deve riportare tutte queste informazioni come riferimento rapido.

---

## Versioning

Formato: **Semantic Versioning** `vMAJOR.MINOR.PATCH`

- **MAJOR**: breaking changes, redesign completo
- **MINOR**: nuove funzionalita
- **PATCH**: bug fix, correzioni minori

La versione va tenuta sincronizzata in:

| File | Campo | Esempio |
|------|-------|---------|
| `frontend/package.json` | `"version"` | `"2.6.0"` |
| `deploy.sh` | `APP_VERSION` + header | `APP_VERSION="2.6.0"` |
| `DEPLOY.md` | Intestazione | `Versione attuale: **2.7.0**` |
| **Sidebar UI** | Header app | `v2.6.0` |
| **Login page** | Footer | `v2.6.0` |

Per aggiornare tutto in automatico usare `--bump`:
```bash
./deploy.sh --bump patch "fix bug"
```

---

## File esclusi dal deploy

| File/Cartella | Motivo |
|---------------|--------|
| `.env` | Configurazioni ambiente |
| `node_modules/` | Installate sul server con `npm install` |
| `frontend/dist/` | Rigenerata con `npm run build` |
| `backend/dist/` | Rigenerata con `nest build` |

---

## Architettura Produzione

```
Internet → Nginx (80/443)
                ├─ /api/* → proxy_pass http://localhost:3001 (NestJS backend)
                └─ /* → /var/www/gads-audit-2/public/ (React SPA static files)

Docker Compose:
  ├─ PostgreSQL 16 (porta 5432, solo localhost)
  └─ Redis 7 (porta 6379, solo localhost)

PM2:
  └─ gads-audit (NestJS, porta 3001)
```

---

## Scripts Google Ads

Gli script sono organizzati in due cartelle:

```
scripts/
  ├─ google-ads-download.js          # Template base download
  ├─ google-ads-upload.js             # Template base upload
  ├─ download-remote-db.sh            # Script backup DB
  ├─ download/                        # Script download per account
  │   ├─ google-ads-download-arredi-2000.js
  │   ├─ google-ads-download-casa-bulldog.js
  │   ├─ google-ads-download-colombo-palace.js
  │   ├─ google-ads-download-massimo-borio.js
  │   ├─ google-ads-download-officina-3mt.js
  │   └─ google-ads-download-sardegna-trasferimenti.js
  └─ upload/                          # Script upload (modifier) per account
      ├─ google-ads-upload-arredi-2000.js
      ├─ google-ads-upload-casa-bulldog.js
      ├─ google-ads-upload-colombo-palace.js
      ├─ google-ads-upload-massimo-borio.js
      ├─ google-ads-upload-officina-3mt.js
      └─ google-ads-upload-sardegna-trasferimenti.js
```

**Nota**: L'account Sfrido non ha piu script dedicati (rimosso).

---

## Note Importanti

1. **Build separate**: Frontend (Vite) e Backend (NestJS) hanno build separate. Il frontend produce file statici serviti da Nginx, il backend gira come processo Node.js con PM2.

2. **Database PostgreSQL**: I dati vivono in un volume Docker. Backup regolari consigliati con `pg_dump`.

3. **Rate Limiting SSH**: Il server ha un rate limiter sulle connessioni SSH. Se ricevi errori "Connection closed", aspetta 30-60 secondi.

4. **TypeORM Migrations**: Se ci sono modifiche allo schema del database:
   ```bash
   ssh root@185.192.97.108 'cd /var/www/gads-audit-2/backend && npm run migration:run'
   ```

5. **PM2 fallback**: Se il processo non esiste ancora, lo script lo crea automaticamente:
   ```bash
   pm2 start dist/main.js --name 'gads-audit' && pm2 save
   ```

6. **Docker Compose in produzione**: PostgreSQL e Redis girano in container Docker. Il backend NestJS gira direttamente con PM2 (non containerizzato).

---

## Troubleshooting

### L'app non si avvia
```bash
ssh root@185.192.97.108 'pm2 logs gads-audit --lines 50 --nostream'
```

### Errore durante la build frontend
```bash
ssh root@185.192.97.108 'cd /var/www/gads-audit-2/frontend && npm run build 2>&1 | tail -30'
```

### Errore durante la build backend
```bash
ssh root@185.192.97.108 'cd /var/www/gads-audit-2/backend && npm run build 2>&1 | tail -30'
```

### Verifica container Docker (DB + Redis)
```bash
ssh root@185.192.97.108 'cd /var/www/gads-audit-2 && docker compose ps'
```

### Reinstalla dipendenze da zero
```bash
ssh root@185.192.97.108 'cd /var/www/gads-audit-2/frontend && rm -rf node_modules && npm install && npm run build'
ssh root@185.192.97.108 'cd /var/www/gads-audit-2/backend && rm -rf node_modules && npm install && npm run build && pm2 restart gads-audit'
```

### Verifica porta in uso
```bash
ssh root@185.192.97.108 'lsof -i :3001'
```

### Riavvia Nginx (se problemi di routing)
```bash
ssh root@185.192.97.108 'nginx -t && systemctl reload nginx'
```

---

## Setup Iniziale (solo prima volta)

### 1. Setup Docker (PostgreSQL + Redis)
```bash
ssh root@185.192.97.108
cd /var/www/gads-audit-2
docker compose up -d
```

### 2. Setup Backend
```bash
cd backend
cp .env.example .env.production
# Editare .env.production con i valori corretti
npm install
npm run build
pm2 start dist/main.js --name gads-audit
pm2 save
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run build
cp -r dist/* ../public/
```

### 4. Setup Nginx
```bash
# Creare config
nano /etc/nginx/sites-available/gads-audit

# Abilitare
ln -s /etc/nginx/sites-available/gads-audit /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d gads.karalisdemo.it
```

---

*Ultimo aggiornamento: 2026-02-14*
