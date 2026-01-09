# Configurazione Infrastruttura GADS Audit 2

## Server Remoto (Produzione)

**Host:** `vmi2996361.contaboserver.net`
**Accesso SSH:** `root@vmi2996361.contaboserver.net`
**Path progetto:** `~/gads-audit-2`

### PostgreSQL Remoto
| Parametro | Valore |
|-----------|--------|
| Host | localhost |
| Port | 5432 |
| Database | `gadsaudit` |
| User | `gadsaudit` |
| Password | `GadsAudit2024` |
| URL | `postgres://gadsaudit:GadsAudit2024@localhost:5432/gadsaudit` |

### Ruoli PostgreSQL
- `gadsaudit` - utente applicazione
- `postgres` - superuser

---

## Ambiente Locale (Sviluppo)

**Path progetto:** `/Users/alessio/Desktop/Sviluppo App Claude Code/GADS Audit 2`

### PostgreSQL Locale
| Parametro | Valore |
|-----------|--------|
| Host | localhost |
| Port | 5432 |
| Database | `google_ads_audit` |
| User | `audit` |
| Password | `dev_password` |
| Installazione | Homebrew PostgreSQL@15 |
| Binari | `/usr/local/opt/postgresql@15/bin/` |
| Data dir | `/usr/local/var/postgresql@15` |

---

## Differenze Locale vs Remoto

| Parametro | Locale | Remoto |
|-----------|--------|--------|
| Database name | `google_ads_audit` | `gadsaudit` |
| User | `audit` | `gadsaudit` |
| Password | `dev_password` | `GadsAudit2024` |

---

## Comandi Utili

### Verificare stato PostgreSQL locale
```bash
/usr/local/opt/postgresql@15/bin/pg_ctl status -D /usr/local/var/postgresql@15
```

### Avviare PostgreSQL locale
```bash
brew services start postgresql@15
```

### Connessione al DB locale
```bash
/usr/local/opt/postgresql@15/bin/psql -h localhost -U audit -d google_ads_audit
```

### Connessione al DB remoto (via SSH)
```bash
ssh root@vmi2996361.contaboserver.net "PGPASSWORD=GadsAudit2024 psql -h localhost -U gadsaudit -d gadsaudit"
```

### Dump database remoto
```bash
ssh root@vmi2996361.contaboserver.net "PGPASSWORD=GadsAudit2024 pg_dump -h localhost -U gadsaudit gadsaudit > /tmp/dump.sql"
```

---

## File .env

### Backend Locale (`backend/.env`)
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=audit
DATABASE_PASSWORD=dev_password
DATABASE_NAME=google_ads_audit
```

### Backend Remoto (`~/gads-audit-2/backend/.env`)
```
DATABASE_URL=postgres://gadsaudit:GadsAudit2024@localhost:5432/gadsaudit
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=gadsaudit
DATABASE_PASSWORD=GadsAudit2024
DATABASE_NAME=gadsaudit
```
