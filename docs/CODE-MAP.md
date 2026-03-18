# Code Map - KW GADS Audit

Mappa visuale dell'architettura, dei moduli e delle dipendenze del progetto.

---

## Mappa Moduli Backend

```
┌─────────────────────────────────────────────────────────────┐
│                        AppModule                             │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  AuthModule  │  │  UsersModule │  │  SettingsModule    │ │
│  │  - login     │  │  - CRUD      │  │  - AI config       │ │
│  │  - JWT       │  │  - roles     │  │  - scheduling      │ │
│  │  - 2FA/OTP   │  │  - invite    │  │  - API keys (enc)  │ │
│  │  - password  │  │              │  │                    │ │
│  └──────┬───────┘  └──────────────┘  └────────┬───────────┘ │
│         │                                      │             │
│  ┌──────┴──────────────────────────────────────┴───────────┐│
│  │                 IntegrationsModule                        ││
│  │  - ingest (download script → DB)                         ││
│  │  - HMAC auth guard                                       ││
│  │  - modifications endpoint (upload script)                ││
│  └──────┬───────────────────────────────────────────────────┘│
│         │                                                    │
│  ┌──────┴───────┐  ┌──────────────┐  ┌────────────────────┐│
│  │  AuditModule │  │   AIModule   │  │ModificationsModule ││
│  │  - dashboard │──│  - analyze   │──│  - workflow         ││
│  │  - entities  │  │  - report    │  │  - approve/reject   ││
│  │  - KPIs      │  │  - chat      │  │  - bulk ops         ││
│  │  - issues    │  │  - OpenAI    │  │  - from-ai          ││
│  │  - health    │  │  - Gemini    │  │                    ││
│  └──────────────┘  └──────────────┘  └────────────────────┘│
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐│
│  │ DecisionsModule│ │ ExportModule │  │   EmailModule      ││
│  │  - approve/   │  │  - CSV       │  │  - OTP email       ││
│  │    reject log │  │  - Excel     │  │  - report email    ││
│  └──────────────┘  └──────────────┘  │  - invite email    ││
│                                       └────────────────────┘│
│  ┌────────────────────────────────────────────────────────┐ │
│  │              LandingPagesModule                         │ │
│  │  - keyword clustering                                   │ │
│  │  - AI brief generation                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema (30 entita)

```
┌──────────────────┐     ┌──────────────────┐
│      users       │────→│  refresh_tokens  │
│  - id (uuid)     │     │  - tokenHash     │
│  - email         │     │  - expiresAt     │
│  - passwordHash  │     └──────────────────┘
│  - role          │
│  - twoFactorEnabled│    ┌──────────────────┐
│  - failedAttempts│────→│   audit_logs     │
└────────┬─────────┘     └──────────────────┘
         │ M:N
┌────────┴─────────┐     ┌──────────────────┐
│google_ads_accounts│────→│   import_runs    │
│  - customerId    │     │  - runId         │
│  - customerName  │     │  - status        │
│  - sharedSecret  │     │  - completedAt   │
│  - businessType  │     └────────┬─────────┘
│  - primaryObjective│            │
└────────┬─────────┘     ┌────────┴─────────┐
         │               │  import_chunks   │
         │               │  - datasetName   │
         │               │  - chunkIndex    │
         │               └──────────────────┘
         │
    ┌────┴────┬──────────┬───────────┬──────────┐
    ▼         ▼          ▼           ▼          ▼
campaigns  ad_groups    ads       keywords  search_terms
    │                                │
    ├── negative_keywords            ├── daily_metrics
    ├── assets                       │
    ├── conversion_actions           │
    ├── geo_performance              │
    └── device_performance           │
                                     │
                              ┌──────┴──────┐
                              │modifications │
                              │  - status    │
                              │  - entityType│
                              │  - before/   │
                              │    afterValue│
                              └─────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ai_analysis_logs │  │  audit_reports   │  │  audit_issues    │
│  - moduleResults │  │  - content       │  │  - severity      │
│  - aiProvider    │  │  - status        │  │  - entityType    │
│  - tokenCount    │  │                  │  │  - description   │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│    decisions     │  │  email_otps      │  │ system_settings  │
│  - action        │  │  - codeHash      │  │  - key/value     │
│  - reason        │  │  - type          │  │  - encrypted     │
└──────────────────┘  │  - expiresAt     │  └──────────────────┘
                      └──────────────────┘
```

---

## Frontend - Mappa Pagine e Componenti

```
App.tsx
├── /login                → LoginPage
├── /accept-invite        → AcceptInvitePage
├── /forgot-password      → ForgotPasswordPage
│
├── / (AuthLayout)
│   ├── /dashboard        → DashboardPage (panoramica tutti gli account)
│   ├── /accounts         → AccountsPage (gestione account)
│   │
│   ├── /audit/:id (AuditLayout)
│   │   ├── /dashboard    → AuditDashboardPage (KPI, grafici, health score)
│   │   ├── /campaigns    → CampaignsPage (tabella campagne)
│   │   ├── /ad-groups    → AdGroupsPage
│   │   ├── /ads          → AdsPage
│   │   ├── /keywords     → KeywordsPage
│   │   ├── /search-terms → SearchTermsPage
│   │   ├── /negative-kw  → NegativeKeywordsPage
│   │   ├── /assets       → AssetsPage
│   │   ├── /conversions  → ConversionsPage
│   │   ├── /landing-pages→ LandingPagesPage
│   │   ├── /issues       → IssuesPage
│   │   └── /modifications→ ModificationsPage
│   │
│   ├── /modifications    → GlobalModificationsPage
│   ├── /settings         → SettingsPage (profilo, password, 2FA, AI, schedule)
│   ├── /admin/users      → UsersPage (gestione utenti)
│   └── /profile          → ProfilePage
```

---

## Dipendenze principali

### Backend

| Pacchetto | Uso |
|-----------|-----|
| `@nestjs/core` 11 | Framework backend |
| `typeorm` 0.3 | ORM PostgreSQL |
| `@nestjs/jwt` | Autenticazione JWT |
| `bcrypt` | Hashing password |
| `openai` 6.x | Client OpenAI (GPT) |
| `@google/genai` | Client Google Gemini |
| `nodemailer` | Invio email |
| `helmet` | Security headers |
| `class-validator` | Validazione DTO |
| `archiver` | Export ZIP |

### Frontend

| Pacchetto | Uso |
|-----------|-----|
| `react` 19 | UI framework |
| `vite` 7 | Build tool |
| `tailwindcss` | Styling |
| `@radix-ui/*` | Componenti UI accessibili |
| `zustand` | State management |
| `@tanstack/react-query` | Data fetching + cache |
| `@tanstack/react-table` | Tabelle avanzate |
| `recharts` | Grafici |
| `lucide-react` | Icone |

---

## File chiave per area

| Area | File principali |
|------|----------------|
| **Auth** | `auth.service.ts`, `auth.controller.ts`, `jwt-auth.guard.ts`, `hmac-auth.guard.ts` |
| **AI** | `ai.service.ts`, `ai.controller.ts`, `prompts/module-prompts.ts` |
| **Modifications** | `modifications.service.ts`, `modifications.controller.ts`, `modification.entity.ts` |
| **Ingest** | `integrations.service.ts`, `integrations.controller.ts` |
| **Audit** | `audit.service.ts`, `audit.controller.ts` |
| **Frontend API** | `frontend/src/api/client.ts` |
| **State** | `frontend/src/stores/` (auth, audit, modifications) |
| **Deploy** | `deploy.sh`, `DEPLOY.md` |
| **Scripts GAS** | `scripts/download/*.js`, `scripts/upload/*.js` |
