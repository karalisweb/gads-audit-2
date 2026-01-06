# PROMPT CLAUDE CODE - Google Ads Audit App v2.0

---

## PRIMA DI TUTTO

Leggi il file `audit_mapping.md` nella cartella corrente. Contiene:
- Mapping completo dei 23 moduli di audit
- Schema di tutti i dataset da estrarre
- Template CSV per Google Ads Editor
- Preset colonne per ogni vista

---

## CONTESTO

Sto costruendo la **versione 2.0** di un'app per audit Google Ads. La v1 mi è servita per capire i requisiti, ora riparto da zero con architettura pulita.

**Il problema**: l'approvazione API Google Ads richiede settimane.

**La soluzione**: bypassarla completamente.

```
[Google Ads Script] --HTTPS POST--> [App] --CSV--> [Google Ads Editor]
     (nel mio MCC)                (mio server)      (applico modifiche)
```

1. **Google Ads Script** estrae dati dal mio MCC e li invia alla mia app
2. **L'app** visualizza i dati, mi guida in 23 moduli di audit, salva le mie decisioni
3. **L'app** genera CSV compatibili con Google Ads Editor
4. **Io** importo i CSV in Editor e applico le modifiche

---

## CONFIGURAZIONE AMBIENTI

### Produzione
- **Dominio**: `gads.karalisweb.it`
- **Server**: self-hosted Docker
- **SSL**: Let's Encrypt (certbot)

### Sviluppo
- **URL**: `http://localhost:3000` (frontend) + `http://localhost:3001` (API)
- **Database**: PostgreSQL locale via Docker

### Email/SMTP
- **Server**: `smtp.karalisweb.net`
- **Dominio email**: solo `@karalisweb.net`
- **Uso**: 2FA recovery, notifiche, inviti utenti

---

## STACK TECNOLOGICO

- **Backend**: NestJS (Node.js 20)
- **Database**: PostgreSQL 16
- **Cache/Session**: Redis
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Tabelle**: TanStack Table (stile Google Ads)
- **Auth**: JWT + TOTP 2FA
- **Deploy**: Docker + Docker Compose
- **Reverse Proxy**: Traefik o nginx (SSL termination)

---

## SICUREZZA (PRIORITÀ ALTA)

### 1. Autenticazione Utente

```
Flusso registrazione:
1. Admin invita utente via email @karalisweb.net
2. Utente clicca link, imposta password
3. Utente configura 2FA (TOTP obbligatorio)
4. Account attivo

Flusso login:
1. Email + password
2. Codice TOTP (Google Authenticator / Authy)
3. JWT access token (15 min) + refresh token (7 giorni)
4. Refresh token rotation ad ogni utilizzo
```

**Regole password**:
- Minimo 12 caratteri
- Almeno 1 maiuscola, 1 minuscola, 1 numero, 1 speciale
- bcrypt con cost factor 12
- No password comuni (lista blacklist)

**2FA TOTP**:
- Libreria: `otplib`
- QR code per setup iniziale
- 6 cifre, 30 secondi
- Backup codes (10 codici monouso)

### 2. Protezione API

```typescript
// Middleware da applicare
- AuthGuard: verifica JWT valido
- TwoFactorGuard: verifica 2FA completato
- RateLimitGuard: 100 req/min per utente, 20 req/min per IP non auth
- RolesGuard: admin vs user

// Headers sicurezza (Helmet.js)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security: max-age=31536000
- Content-Security-Policy: configurato

// CORS
- Origin: solo https://gads.karalisweb.it (prod) o localhost:3000 (dev)
```

### 3. Endpoint Ingestion (Google Ads Script → App)

```
POST /api/integrations/google-ads/ingest

Headers richiesti:
- X-Timestamp: ISO 8601 (es: 2026-01-06T10:15:00Z)
- X-Signature: HMAC-SHA256(timestamp + body, shared_secret)
- X-Account-Id: customer_id Google Ads

Validazioni:
1. Timestamp entro 5 minuti
2. Firma HMAC valida
3. Account registrato e attivo
4. Idempotenza su (run_id + dataset + chunk_index)
```

### 4. Database

```
- Connessione SSL in produzione
- Password in bcrypt
- Secrets in variabili ambiente (non in codice)
- Prepared statements (no SQL injection)
```

### 5. Audit Log

Logga ogni azione sensibile:
```typescript
interface AuditLog {
  id: UUID;
  user_id: UUID;
  action: string;        // LOGIN, LOGOUT, CREATE_DECISION, EXPORT, etc.
  entity_type: string;   // user, decision, change_set, etc.
  entity_id: string;
  ip_address: string;
  user_agent: string;
  metadata: JSONB;
  created_at: timestamp;
}
```

---

## GESTIONE UTENTI

### Ruoli

| Ruolo | Permessi |
|-------|----------|
| `admin` | Tutto + gestione utenti + gestione account Google Ads |
| `user` | Audit, decisioni, export (solo account assegnati) |

### Modello Utenti

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,  -- solo @karalisweb.net
    password_hash VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    
    -- 2FA
    totp_secret VARCHAR(255),
    totp_enabled BOOLEAN DEFAULT false,
    backup_codes JSONB,  -- array di codici hash
    
    -- Stato
    is_active BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    invite_token VARCHAR(255),
    invite_expires_at TIMESTAMPTZ,
    
    -- Metadata
    last_login_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Associazione utente-account (multi-tenant futuro)
CREATE TABLE user_accounts (
    user_id UUID REFERENCES users(id),
    account_id UUID REFERENCES google_ads_accounts(id),
    PRIMARY KEY (user_id, account_id)
);
```

### Flusso Invito

```
1. Admin va su /admin/users
2. Inserisce email (validata: deve essere @karalisweb.net)
3. Sistema genera invite_token, invia email
4. Utente clicca link → /auth/accept-invite?token=xxx
5. Utente imposta password
6. Utente configura 2FA (obbligatorio)
7. Account attivo
```

---

## VERSIONING DECISIONI

Ogni decisione è **immutabile**. Se modifichi, crei nuova versione:

```sql
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID REFERENCES audits(id),
    
    -- Versioning
    decision_group_id UUID NOT NULL,  -- raggruppa versioni stessa decisione
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT true,
    superseded_by UUID REFERENCES decisions(id),
    
    -- Contenuto
    module_id INTEGER NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    entity_name VARCHAR(500),
    action_type VARCHAR(50) NOT NULL,
    before_value JSONB,
    after_value JSONB,
    rationale TEXT,
    evidence JSONB,
    
    -- Stato
    status VARCHAR(20) DEFAULT 'draft',  -- draft, approved, exported, applied, rolled_back
    
    -- Export
    change_set_id UUID REFERENCES change_sets(id),
    exported_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice per recupero veloce versione corrente
CREATE INDEX idx_decisions_current ON decisions(decision_group_id) WHERE is_current = true;
```

**Logica versioning**:
```typescript
// Quando modifichi una decisione:
1. Imposta is_current = false sulla vecchia
2. Crea nuova riga con version + 1, is_current = true
3. Collega superseded_by

// Quando fai rollback:
1. Imposta is_current = false sulla corrente
2. Crea nuova versione che ripristina before_value
```

**API**:
```
GET  /api/decisions/:groupId/history     → tutte le versioni
POST /api/decisions/:id/rollback         → crea versione rollback
```

---

## SCHEMA DATABASE COMPLETO

```sql
-- =============================================
-- UTENTI E AUTH
-- =============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    totp_secret VARCHAR(255),
    totp_enabled BOOLEAN DEFAULT false,
    backup_codes JSONB,
    is_active BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    invite_token VARCHAR(255),
    invite_expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- GOOGLE ADS ACCOUNTS
-- =============================================

CREATE TABLE google_ads_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(20) NOT NULL UNIQUE,
    customer_name VARCHAR(255),
    currency_code VARCHAR(3) DEFAULT 'EUR',
    time_zone VARCHAR(50) DEFAULT 'Europe/Rome',
    shared_secret VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_accounts (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, account_id)
);

-- =============================================
-- IMPORT
-- =============================================

CREATE TABLE import_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id VARCHAR(100) NOT NULL UNIQUE,
    account_id UUID REFERENCES google_ads_accounts(id),
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    datasets_expected INTEGER,
    datasets_received INTEGER DEFAULT 0,
    total_rows INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE import_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id VARCHAR(100) NOT NULL,
    dataset_name VARCHAR(50) NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_total INTEGER,
    row_count INTEGER,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(run_id, dataset_name, chunk_index)
);

-- =============================================
-- DATI GOOGLE ADS (vedi audit_mapping.md per schema completo)
-- =============================================

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id),
    run_id VARCHAR(100) NOT NULL,
    campaign_id VARCHAR(50) NOT NULL,
    campaign_name VARCHAR(255),
    status VARCHAR(20),
    advertising_channel_type VARCHAR(50),
    bidding_strategy_type VARCHAR(50),
    target_cpa_micros BIGINT,
    target_roas DECIMAL(10,4),
    budget_micros BIGINT,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(12,2) DEFAULT 0,
    conversions_value DECIMAL(14,2) DEFAULT 0,
    ctr DECIMAL(8,4) DEFAULT 0,
    average_cpc_micros BIGINT DEFAULT 0,
    search_impression_share DECIMAL(6,4),
    search_impression_share_lost_rank DECIMAL(6,4),
    search_impression_share_lost_budget DECIMAL(6,4),
    search_top_impression_share DECIMAL(6,4),
    search_absolute_top_impression_share DECIMAL(6,4),
    top_impression_percentage DECIMAL(6,4),
    absolute_top_impression_percentage DECIMAL(6,4),
    phone_calls INTEGER DEFAULT 0,
    phone_impressions INTEGER DEFAULT 0,
    message_chats INTEGER DEFAULT 0,
    message_impressions INTEGER DEFAULT 0,
    data_date_start DATE,
    data_date_end DATE,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, run_id, campaign_id)
);

CREATE TABLE ad_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id),
    run_id VARCHAR(100) NOT NULL,
    ad_group_id VARCHAR(50) NOT NULL,
    ad_group_name VARCHAR(255),
    campaign_id VARCHAR(50) NOT NULL,
    campaign_name VARCHAR(255),
    status VARCHAR(20),
    type VARCHAR(50),
    cpc_bid_micros BIGINT,
    target_cpa_micros BIGINT,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(12,2) DEFAULT 0,
    conversions_value DECIMAL(14,2) DEFAULT 0,
    ctr DECIMAL(8,4) DEFAULT 0,
    average_cpc_micros BIGINT DEFAULT 0,
    search_impression_share DECIMAL(6,4),
    search_impression_share_lost_rank DECIMAL(6,4),
    search_impression_share_lost_budget DECIMAL(6,4),
    phone_calls INTEGER DEFAULT 0,
    message_chats INTEGER DEFAULT 0,
    data_date_start DATE,
    data_date_end DATE,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, run_id, ad_group_id)
);

CREATE TABLE ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id),
    run_id VARCHAR(100) NOT NULL,
    ad_id VARCHAR(50) NOT NULL,
    ad_group_id VARCHAR(50) NOT NULL,
    ad_group_name VARCHAR(255),
    campaign_id VARCHAR(50) NOT NULL,
    campaign_name VARCHAR(255),
    ad_type VARCHAR(50),
    status VARCHAR(20),
    approval_status VARCHAR(30),
    ad_strength VARCHAR(20),
    headlines JSONB,
    descriptions JSONB,
    final_urls JSONB,
    path1 VARCHAR(50),
    path2 VARCHAR(50),
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(12,2) DEFAULT 0,
    conversions_value DECIMAL(14,2) DEFAULT 0,
    ctr DECIMAL(8,4) DEFAULT 0,
    average_cpc_micros BIGINT DEFAULT 0,
    phone_calls INTEGER DEFAULT 0,
    message_chats INTEGER DEFAULT 0,
    data_date_start DATE,
    data_date_end DATE,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, run_id, ad_id)
);

CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id),
    run_id VARCHAR(100) NOT NULL,
    keyword_id VARCHAR(50) NOT NULL,
    keyword_text VARCHAR(500) NOT NULL,
    match_type VARCHAR(20),
    ad_group_id VARCHAR(50) NOT NULL,
    ad_group_name VARCHAR(255),
    campaign_id VARCHAR(50) NOT NULL,
    campaign_name VARCHAR(255),
    status VARCHAR(20),
    approval_status VARCHAR(30),
    cpc_bid_micros BIGINT,
    final_url VARCHAR(2048),
    quality_score INTEGER,
    creative_relevance VARCHAR(20),
    landing_page_experience VARCHAR(20),
    expected_ctr VARCHAR(20),
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(12,2) DEFAULT 0,
    conversions_value DECIMAL(14,2) DEFAULT 0,
    ctr DECIMAL(8,4) DEFAULT 0,
    average_cpc_micros BIGINT DEFAULT 0,
    search_impression_share DECIMAL(6,4),
    search_impression_share_lost_rank DECIMAL(6,4),
    search_impression_share_lost_budget DECIMAL(6,4),
    phone_calls INTEGER DEFAULT 0,
    data_date_start DATE,
    data_date_end DATE,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, run_id, keyword_id)
);

CREATE TABLE search_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id),
    run_id VARCHAR(100) NOT NULL,
    search_term VARCHAR(500) NOT NULL,
    keyword_id VARCHAR(50),
    keyword_text VARCHAR(500),
    match_type_triggered VARCHAR(20),
    ad_group_id VARCHAR(50) NOT NULL,
    ad_group_name VARCHAR(255),
    campaign_id VARCHAR(50) NOT NULL,
    campaign_name VARCHAR(255),
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(12,2) DEFAULT 0,
    conversions_value DECIMAL(14,2) DEFAULT 0,
    ctr DECIMAL(8,4) DEFAULT 0,
    average_cpc_micros BIGINT DEFAULT 0,
    data_date_start DATE,
    data_date_end DATE,
    imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE negative_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id),
    run_id VARCHAR(100) NOT NULL,
    negative_keyword_id VARCHAR(50),
    keyword_text VARCHAR(500) NOT NULL,
    match_type VARCHAR(20),
    level VARCHAR(20),
    campaign_id VARCHAR(50),
    campaign_name VARCHAR(255),
    ad_group_id VARCHAR(50),
    ad_group_name VARCHAR(255),
    shared_set_id VARCHAR(50),
    shared_set_name VARCHAR(255),
    imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id),
    run_id VARCHAR(100) NOT NULL,
    asset_id VARCHAR(50) NOT NULL,
    asset_type VARCHAR(50),
    asset_text VARCHAR(255),
    description1 VARCHAR(255),
    description2 VARCHAR(255),
    final_url VARCHAR(2048),
    phone_number VARCHAR(30),
    status VARCHAR(20),
    performance_label VARCHAR(20),
    source VARCHAR(30),
    linked_level VARCHAR(20),
    campaign_id VARCHAR(50),
    ad_group_id VARCHAR(50),
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(12,2) DEFAULT 0,
    ctr DECIMAL(8,4) DEFAULT 0,
    data_date_start DATE,
    data_date_end DATE,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, run_id, asset_id)
);

CREATE TABLE conversion_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id),
    run_id VARCHAR(100) NOT NULL,
    conversion_action_id VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    status VARCHAR(20),
    type VARCHAR(50),
    category VARCHAR(50),
    origin VARCHAR(50),
    counting_type VARCHAR(30),
    default_value DECIMAL(12,2),
    always_use_default_value BOOLEAN,
    primary_for_goal BOOLEAN,
    campaigns_using_count INTEGER DEFAULT 0,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, run_id, conversion_action_id)
);

CREATE TABLE geo_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id),
    run_id VARCHAR(100) NOT NULL,
    campaign_id VARCHAR(50) NOT NULL,
    campaign_name VARCHAR(255),
    location_id VARCHAR(50),
    location_name VARCHAR(255),
    location_type VARCHAR(50),
    is_targeted BOOLEAN,
    bid_modifier DECIMAL(6,4),
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(12,2) DEFAULT 0,
    data_date_start DATE,
    data_date_end DATE,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, run_id, campaign_id, location_id)
);

CREATE TABLE device_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id),
    run_id VARCHAR(100) NOT NULL,
    campaign_id VARCHAR(50) NOT NULL,
    campaign_name VARCHAR(255),
    device VARCHAR(20),
    bid_modifier DECIMAL(6,4),
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    conversions DECIMAL(12,2) DEFAULT 0,
    data_date_start DATE,
    data_date_end DATE,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, run_id, campaign_id, device)
);

-- =============================================
-- AUDIT E DECISIONI
-- =============================================

CREATE TABLE audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES google_ads_accounts(id),
    run_id VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'in_progress',
    modules_completed INTEGER[] DEFAULT '{}',
    current_module INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID REFERENCES audits(id),
    account_id UUID REFERENCES google_ads_accounts(id),
    
    -- Versioning
    decision_group_id UUID NOT NULL,
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT true,
    superseded_by UUID REFERENCES decisions(id),
    
    -- Contenuto
    module_id INTEGER NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    entity_name VARCHAR(500),
    action_type VARCHAR(50) NOT NULL,
    before_value JSONB,
    after_value JSONB,
    rationale TEXT,
    evidence JSONB,
    
    -- Stato
    status VARCHAR(20) DEFAULT 'draft',
    
    -- Export
    change_set_id UUID,
    exported_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE change_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID REFERENCES audits(id),
    account_id UUID REFERENCES google_ads_accounts(id),
    name VARCHAR(255),
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    export_files JSONB,
    export_hash VARCHAR(64),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    exported_at TIMESTAMPTZ
);

ALTER TABLE decisions 
ADD CONSTRAINT fk_decisions_change_set 
FOREIGN KEY (change_set_id) REFERENCES change_sets(id);

-- =============================================
-- INDICI
-- =============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_import_runs_account ON import_runs(account_id);
CREATE INDEX idx_campaigns_account_run ON campaigns(account_id, run_id);
CREATE INDEX idx_ad_groups_campaign ON ad_groups(campaign_id);
CREATE INDEX idx_keywords_ad_group ON keywords(ad_group_id);
CREATE INDEX idx_keywords_quality ON keywords(quality_score);
CREATE INDEX idx_search_terms_campaign ON search_terms(campaign_id);
CREATE INDEX idx_decisions_audit ON decisions(audit_id);
CREATE INDEX idx_decisions_current ON decisions(decision_group_id) WHERE is_current = true;
CREATE INDEX idx_decisions_module ON decisions(module_id);

-- =============================================
-- VISTA ULTIMO SNAPSHOT
-- =============================================

CREATE VIEW latest_snapshots AS
SELECT DISTINCT ON (account_id)
    account_id,
    run_id,
    completed_at,
    total_rows
FROM import_runs
WHERE status = 'completed'
ORDER BY account_id, completed_at DESC;
```

---

## STRUTTURA PROGETTO

```
google-ads-audit/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   └── local.strategy.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   ├── two-factor.guard.ts
│   │   │   │   │   └── roles.guard.ts
│   │   │   │   └── dto/
│   │   │   ├── users/
│   │   │   ├── ingestion/
│   │   │   ├── audit/
│   │   │   ├── decisions/
│   │   │   └── export/
│   │   ├── entities/
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   ├── interceptors/
│   │   │   └── middleware/
│   │   ├── config/
│   │   └── main.ts
│   ├── test/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           (shadcn)
│   │   │   ├── DataTable/
│   │   │   ├── ProcedurePanel/
│   │   │   ├── DecisionForm/
│   │   │   └── Layout/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── SetupTwoFactor.tsx
│   │   │   │   └── AcceptInvite.tsx
│   │   │   ├── dashboard/
│   │   │   ├── audit/
│   │   │   ├── admin/
│   │   │   └── export/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── api/
│   │   ├── types/
│   │   └── lib/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── scripts/
│   └── google-ads-exporter.js
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
└── README.md
```

---

## DOCKER COMPOSE

### Produzione (docker-compose.yml)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: google_ads_audit
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/google_ads_audit?sslmode=disable
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      SMTP_HOST: smtp.karalisweb.net
      SMTP_PORT: 587
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      SMTP_FROM: noreply@karalisweb.net
      APP_URL: https://gads.karalisweb.it
      CORS_ORIGIN: https://gads.karalisweb.it
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: https://gads.karalisweb.it/api
    restart: unless-stopped

  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@karalisweb.net"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt:/letsencrypt
    restart: unless-stopped
    labels:
      - "traefik.enable=true"

  # Labels per routing
  backend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`gads.karalisweb.it`) && PathPrefix(`/api`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=3001"

  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`gads.karalisweb.it`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"

volumes:
  postgres_data:
  redis_data:
  letsencrypt:
```

### Sviluppo (docker-compose.dev.yml)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: audit
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: google_ads_audit
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_dev:
```

---

## API ENDPOINTS

### Auth
```
POST /api/auth/login              - Login (email + password)
POST /api/auth/2fa/verify         - Verifica codice TOTP
POST /api/auth/refresh            - Refresh token
POST /api/auth/logout             - Logout
POST /api/auth/invite             - [Admin] Invita utente
POST /api/auth/accept-invite      - Accetta invito
POST /api/auth/2fa/setup          - Setup 2FA (genera QR)
POST /api/auth/2fa/enable         - Abilita 2FA (verifica codice)
POST /api/auth/password/change    - Cambia password
POST /api/auth/password/reset     - Richiedi reset password
```

### Users [Admin]
```
GET    /api/users                 - Lista utenti
GET    /api/users/:id             - Dettaglio utente
PATCH  /api/users/:id             - Modifica utente
DELETE /api/users/:id             - Disattiva utente
```

### Google Ads Accounts [Admin]
```
GET    /api/accounts              - Lista account
POST   /api/accounts              - Crea account
GET    /api/accounts/:id          - Dettaglio
PATCH  /api/accounts/:id          - Modifica
DELETE /api/accounts/:id          - Disattiva
POST   /api/accounts/:id/regenerate-secret - Rigenera HMAC secret
```

### Ingestion [HMAC Auth]
```
POST   /api/integrations/google-ads/ingest - Ricevi dati da script
```

### Audit
```
GET    /api/audits                - Lista audit
POST   /api/audits                - Crea audit
GET    /api/audits/:id            - Dettaglio audit
PATCH  /api/audits/:id            - Aggiorna audit
GET    /api/audits/:id/campaigns  - Dati campagne
GET    /api/audits/:id/ad-groups  - Dati ad groups
GET    /api/audits/:id/ads        - Dati annunci
GET    /api/audits/:id/keywords   - Dati keyword
GET    /api/audits/:id/search-terms - Dati search terms
GET    /api/audits/:id/negative-keywords - Dati negative
GET    /api/audits/:id/assets     - Dati assets
GET    /api/audits/:id/kpis       - KPI aggregati
```

### Decisions
```
GET    /api/audits/:id/decisions           - Lista decisioni
POST   /api/audits/:id/decisions           - Crea decisione
GET    /api/decisions/:id                  - Dettaglio
PATCH  /api/decisions/:id                  - Modifica (crea nuova versione)
GET    /api/decisions/:groupId/history     - Storico versioni
POST   /api/decisions/:id/rollback         - Rollback
```

### Change Sets & Export
```
GET    /api/audits/:id/change-sets         - Lista change sets
POST   /api/audits/:id/change-sets         - Crea change set
GET    /api/change-sets/:id                - Dettaglio
PATCH  /api/change-sets/:id                - Modifica
POST   /api/change-sets/:id/approve        - Approva
POST   /api/change-sets/:id/export         - Genera CSV
GET    /api/change-sets/:id/download       - Download ZIP
```

---

## FRONTEND ROUTES

```
/auth/login                    - Login
/auth/2fa                      - Verifica 2FA
/auth/accept-invite            - Accetta invito
/auth/setup-2fa                - Setup 2FA

/                              - Dashboard
/accounts                      - [Admin] Lista account Google Ads
/accounts/:id                  - [Admin] Dettaglio account
/admin/users                   - [Admin] Gestione utenti

/audit/:id                     - Audit corrente (redirect a campaigns)
/audit/:id/campaigns           - Vista campagne
/audit/:id/ad-groups           - Vista ad groups
/audit/:id/ads                 - Vista annunci
/audit/:id/keywords            - Vista keywords
/audit/:id/search-terms        - Vista search terms
/audit/:id/negatives           - Vista negative keywords
/audit/:id/assets              - Vista assets
/audit/:id/decisions           - Decision log
/audit/:id/decisions/:groupId  - Storico decisione
/audit/:id/export              - Export center
```

---

## ORDINE DI IMPLEMENTAZIONE

### STEP 1 - Infrastruttura (Giorno 1-2)
- [ ] Crea struttura cartelle
- [ ] Inizializza NestJS
- [ ] Inizializza React + Vite + TypeScript
- [ ] Configura Tailwind + shadcn/ui
- [ ] Crea docker-compose.dev.yml
- [ ] Crea schema SQL completo
- [ ] Configura TypeORM in NestJS
- [ ] Testa connessione database

### STEP 2 - Auth (Giorno 3-5)
- [ ] Modulo auth NestJS
- [ ] Entity User + RefreshToken
- [ ] Registration (solo via invite)
- [ ] Login + JWT
- [ ] 2FA TOTP (otplib)
- [ ] Backup codes
- [ ] Guards (JWT, 2FA, Roles)
- [ ] Rate limiting
- [ ] Frontend: Login page
- [ ] Frontend: 2FA verification
- [ ] Frontend: Setup 2FA
- [ ] Frontend: Accept invite

### STEP 3 - Ingestion (Giorno 6-7)
- [ ] Modulo ingestion NestJS
- [ ] Validazione HMAC
- [ ] Idempotenza chunks
- [ ] Salvataggio tutti i dataset
- [ ] Google Ads Script completo
- [ ] Test end-to-end

### STEP 4 - API Dati (Giorno 8-9)
- [ ] Modulo audit NestJS
- [ ] Endpoint lettura con filtri/paginazione
- [ ] Endpoint KPI aggregati
- [ ] Test API

### STEP 5 - Frontend Dati (Giorno 10-13)
- [ ] Componente DataTable
- [ ] Preset colonne (da audit_mapping.md)
- [ ] Vista Campaigns
- [ ] Vista Ad Groups
- [ ] Vista Ads
- [ ] Vista Keywords
- [ ] Vista Search Terms
- [ ] Vista Negatives
- [ ] Vista Assets
- [ ] Dashboard con KPI

### STEP 6 - Decisioni (Giorno 14-16)
- [ ] Modulo decisions NestJS
- [ ] CRUD + versioning
- [ ] Storico decisioni
- [ ] Rollback
- [ ] Frontend: Decision form
- [ ] Frontend: Decision log
- [ ] Frontend: History view

### STEP 7 - Export (Giorno 17-19)
- [ ] Modulo export NestJS
- [ ] Generazione CSV (formati da audit_mapping.md)
- [ ] ZIP + README
- [ ] Frontend: Change Set management
- [ ] Frontend: Export center
- [ ] Download

### STEP 8 - Polish (Giorno 20-22)
- [ ] ProcedurePanel (23 moduli)
- [ ] Admin: gestione utenti
- [ ] Admin: gestione account
- [ ] Audit log
- [ ] Error handling globale
- [ ] Loading states
- [ ] Test completo

### STEP 9 - Deploy (Giorno 23-25)
- [ ] docker-compose.yml produzione
- [ ] Traefik + SSL
- [ ] Deploy su server
- [ ] Test produzione
- [ ] Primo import reale

---

## NOTE IMPORTANTI

1. **Niente PMax** - Escludi campagne Performance Max
2. **Solo Search** - Focus su campagne Search
3. **Email @karalisweb.net** - Solo questo dominio per registrazione
4. **2FA obbligatorio** - Nessun accesso senza TOTP configurato
5. **Versioning decisioni** - Mai sovrascrivere, sempre nuova versione
6. **Valori in micros** - Mantieni micros in DB, converti in frontend

---

## COMANDI UTILI

```bash
# Sviluppo
docker-compose -f docker-compose.dev.yml up -d
cd backend && npm run start:dev
cd frontend && npm run dev

# Produzione
docker-compose up -d --build

# Database
docker exec -it google-ads-audit-postgres psql -U audit -d google_ads_audit

# Logs
docker-compose logs -f backend
```

---

## RIFERIMENTI

- **audit_mapping.md** - Schema dataset, CSV templates, colonne preset
- Chiedi conferma prima di scelte architetturali importanti
