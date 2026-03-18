# API Reference - KW GADS Audit

Base URL: `https://gads.karalisdemo.it/api` (produzione) | `http://localhost:3001/api` (locale)

Tutte le rotte richiedono JWT Bearer token tranne quelle marcate `[PUBLIC]`.

---

## Auth

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| POST | `/auth/login` | [PUBLIC] | Login con email/password |
| POST | `/auth/verify-2fa` | [PUBLIC] | Verifica codice OTP 2FA |
| POST | `/auth/refresh` | [PUBLIC] | Refresh token pair |
| POST | `/auth/logout` | JWT | Logout (revoca refresh token) |
| POST | `/auth/logout-all` | JWT | Logout da tutti i dispositivi |
| POST | `/auth/invite` | JWT+ADMIN | Invita utente (@karalisweb.net) |
| POST | `/auth/accept-invite` | [PUBLIC] | Accetta invito e crea password |
| POST | `/auth/change-password` | JWT | Cambia password |
| POST | `/auth/request-password-reset` | [PUBLIC] | Richiedi OTP reset password |
| POST | `/auth/verify-password-reset` | [PUBLIC] | Reset password con OTP |
| PATCH | `/auth/2fa` | JWT | Attiva/disattiva 2FA |
| PATCH | `/auth/profile` | JWT | Aggiorna profilo (nome) |
| GET | `/auth/me` | JWT | Dati utente corrente |

### Login

```json
POST /auth/login
Content-Type: application/json

{ "email": "user@karalisweb.net", "password": "..." }

// Risposta (senza 2FA):
{
  "requiresTwoFactor": false,
  "tokens": { "accessToken": "eyJ...", "refreshToken": "abc..." },
  "user": { "id": "...", "email": "...", "name": "...", "role": "admin" }
}

// Risposta (con 2FA):
{ "requiresTwoFactor": true, "user": { "id": "...", "email": "..." } }
```

---

## AI Analysis

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| POST | `/ai/analyze/:accountId` | JWT | Analizza un modulo specifico |
| POST | `/ai/analyze-all/:accountId` | JWT | Analizza tutti i moduli |
| GET | `/ai/history/:accountId` | JWT | Storico analisi AI |
| GET | `/ai/acceptance-rate/:accountId` | JWT | Tasso accettazione raccomandazioni |
| GET | `/ai/modules` | JWT | Lista moduli supportati |
| POST | `/ai/report/:accountId` | JWT | Genera report audit AI |
| GET | `/ai/report/:accountId` | JWT | Ultimo report generato |
| POST | `/ai/report/:accountId/chat` | JWT | Chat con report (follow-up) |
| GET | `/ai/report/:accountId/messages` | JWT | Messaggi chat report |

### Analizza modulo

```json
POST /ai/analyze/:accountId
Content-Type: application/json

{ "moduleId": 4, "filters": {} }

// moduleId: 1=Campagne, 2=Gruppi, 3=Annunci, 4=Keyword, 5=SearchTerms,
//           6=NegKeywords, 7=Asset, 8=Conversioni, 9=LandingPages
```

---

## Modifications

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| GET | `/modifications/pending-summary` | JWT | Riepilogo pending tutti gli account |
| GET | `/modifications/recent-activity` | JWT | Attivita recente modifiche |
| GET | `/modifications/account/:accountId` | JWT | Lista modifiche (paginata, filtri) |
| GET | `/modifications/account/:accountId/summary` | JWT | Conteggi per stato |
| GET | `/modifications/:id` | JWT | Dettaglio modifica |
| POST | `/modifications` | JWT | Crea modifica manuale |
| POST | `/modifications/:id/approve` | JWT+ADMIN | Approva modifica |
| POST | `/modifications/:id/reject` | JWT+ADMIN | Rifiuta modifica |
| POST | `/modifications/:id/cancel` | JWT | Annulla modifica (solo creatore) |
| POST | `/modifications/bulk-approve` | JWT+ADMIN | Approva in blocco |
| POST | `/modifications/bulk-reject` | JWT+ADMIN | Rifiuta in blocco |
| POST | `/modifications/from-ai` | JWT | Converti raccomandazioni AI in modifiche |

### Filtri lista modifiche

```
GET /modifications/account/:accountId?status=pending&entityType=keyword&page=1&limit=50&sortBy=createdAt&sortOrder=DESC
```

---

## Integrations (Google Ads Scripts)

Autenticazione: **HMAC-SHA256** via headers `X-Signature`, `X-Timestamp`, `X-Account-Id`

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| POST | `/integrations/google-ads/ingest` | HMAC | Ingest dati da script download |
| GET | `/integrations/google-ads/modifications/pending` | HMAC | Modifiche approvate da applicare |
| POST | `/integrations/google-ads/modifications/:id/start` | HMAC | Segna modifica in processing |
| POST | `/integrations/google-ads/modifications/:id/result` | HMAC | Risultato applicazione modifica |
| GET | `/integrations/google-ads/modifications/failed` | HMAC | Lista modifiche fallite |
| DELETE | `/integrations/google-ads/modifications/failed` | HMAC | Elimina modifiche fallite |

### HMAC Signature

```javascript
// Negli script Google Ads:
const timestamp = new Date().toISOString();
const body = JSON.stringify(payload);  // o '' per GET
const signature = Utilities.computeHmacSha256Signature(timestamp + body, SHARED_SECRET)
  .map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');

// Headers:
// X-Timestamp: <timestamp>
// X-Signature: <signature>
// X-Account-Id: <customer_id>
```

---

## Audit Data

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| GET | `/audit/:accountId/dashboard` | JWT | KPI dashboard |
| GET | `/audit/:accountId/campaigns` | JWT | Lista campagne |
| GET | `/audit/:accountId/ad-groups` | JWT | Lista gruppi annunci |
| GET | `/audit/:accountId/ads` | JWT | Lista annunci |
| GET | `/audit/:accountId/keywords` | JWT | Lista keyword |
| GET | `/audit/:accountId/search-terms` | JWT | Lista termini ricerca |
| GET | `/audit/:accountId/negative-keywords` | JWT | Lista negative keywords |
| GET | `/audit/:accountId/assets` | JWT | Lista asset/estensioni |
| GET | `/audit/:accountId/conversions` | JWT | Azioni conversione |
| GET | `/audit/:accountId/geo-performance` | JWT | Performance geografica |
| GET | `/audit/:accountId/device-performance` | JWT | Performance per device |
| GET | `/audit/:accountId/issues` | JWT | Problemi rilevati |
| GET | `/audit/:accountId/health-score` | JWT | Health score account |

---

## Users (Admin only)

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| GET | `/users` | JWT+ADMIN | Lista utenti |
| PATCH | `/users/:id/role` | JWT+ADMIN | Cambia ruolo |
| PATCH | `/users/:id/deactivate` | JWT+ADMIN | Disattiva utente |
| PATCH | `/users/:id/activate` | JWT+ADMIN | Attiva utente |
| DELETE | `/users/:id` | JWT+ADMIN | Elimina utente |

---

## Accounts

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| GET | `/accounts` | JWT | Lista account Google Ads |
| GET | `/accounts/:id` | JWT | Dettaglio account |
| POST | `/accounts` | JWT+ADMIN | Crea account |
| PATCH | `/accounts/:id` | JWT+ADMIN | Aggiorna account |
| DELETE | `/accounts/:id` | JWT+ADMIN | Elimina account |

---

## Export

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| GET | `/export/:accountId/csv/:entity` | JWT | Export CSV per entita |
| GET | `/export/:accountId/excel` | JWT | Export Excel completo |

---

## Error Responses

Tutti gli errori seguono il formato NestJS:

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

| Codice | Significato |
|--------|-------------|
| 400 | Bad Request (validazione fallita, parametri mancanti) |
| 401 | Unauthorized (JWT invalido/scaduto, HMAC invalido) |
| 403 | Forbidden (ruolo insufficiente) |
| 404 | Not Found (risorsa non trovata) |
| 409 | Conflict (duplicato, es. email gia esistente) |
| 429 | Too Many Requests (rate limit OTP) |
