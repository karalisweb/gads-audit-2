# GADS Audit - Design System

> Guida di riferimento per uniformare la grafica dell'app GADS Audit.
> Basato sul **Karalisweb Design System** (CashFlow v2.1.0).

---

## 1. Tema Generale

**Dark theme** con sfondo navy/blu scuro, accenti oro/arancione e tipografia moderna.

L'interfaccia trasmette un senso di **professionalita**, **pulizia** e **modernita**, con ampio uso di whitespace e contrasto elevato tra sfondi scuri e testo chiaro.

---

## 2. Palette Colori

### 2.1 Sfondi

| Token                | Hex         | HSL (Tailwind)        | Uso                                      |
|----------------------|-------------|------------------------|------------------------------------------|
| `--bg-primary`       | `#0d1521`   | `220 25% 8%`          | Sfondo principale dell'app               |
| `--bg-secondary`     | `#132032`   | `220 25% 12%`         | Card, sidebar, header, modali            |
| `--bg-tertiary`      | `#1a2d44`   | `220 25% 18%`         | Input, elementi annidati, item di lista  |
| `--bg-hover`         | `#234058`   | `220 25% 24%`         | Stato hover su elementi interattivi      |

### 2.2 Accenti (Brand Karalisweb)

| Token                      | Hex         | Uso                                    |
|----------------------------|-------------|----------------------------------------|
| `--accent-primary`         | `#d4a726`   | Colore brand principale (oro/giallo)   |
| `--accent-primary-hover`   | `#e6b82e`   | Hover sull'accento primario            |
| `--accent-secondary`       | `#2d7d9a`   | Badge, accenti secondari (blu/teal)    |
| `--accent-tertiary`        | `#1e5c7a`   | Accenti blu scuro                      |

### 2.3 Testo

| Token              | Hex         | Uso                                        |
|--------------------|-------------|--------------------------------------------|
| `--text-primary`   | `#f5f5f7`   | Testo principale (titoli, contenuti)       |
| `--text-secondary` | `#a1a1aa`   | Testo secondario (meta info, descrizioni)  |
| `--text-muted`     | `#71717a`   | Testo meno importante (hint, placeholder)  |

### 2.4 Bordi

| Token              | Hex         | Uso                       |
|--------------------|-------------|---------------------------|
| `--border-color`   | `#2a2a35`   | Bordo standard            |
| `--border-hover`   | `#3a3a45`   | Bordo hover (piu chiaro)  |

### 2.5 Colori di Stato

| Token         | Hex         | Uso           |
|---------------|-------------|---------------|
| `--success`   | `#22c55e`   | Successo      |
| `--warning`   | `#eab308`   | Attenzione    |
| `--error`     | `#ef4444`   | Errore        |
| `--info`      | `#3b82f6`   | Informativo   |

### 2.6 Colori Audit Specifici

| Tipo contenuto               | Colore      | Uso                          |
|------------------------------|-------------|------------------------------|
| Campagne attive              | `#22c55e`   | Badge campagna attiva        |
| Campagne in pausa            | `#eab308`   | Badge campagna in pausa      |
| Campagne rimosse             | `#ef4444`   | Badge campagna rimossa       |
| Issues critiche              | `#ef4444`   | Severity alta                |
| Issues moderate              | `#eab308`   | Severity media               |
| Issues informative           | `#3b82f6`   | Severity bassa               |
| Conversioni                  | `#d4a726`   | Metriche conversioni         |

---

## 3. Tipografia

### 3.1 Font

| Ruolo         | Font             | Pesi disponibili     | Importazione |
|---------------|------------------|----------------------|--------------|
| **UI/Testo**  | Space Grotesk    | 300, 400, 500, 600, 700 | Google Fonts |
| **Codice/Dati** | JetBrains Mono | 400, 500             | Google Fonts |

```
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

### 3.2 Font Stack

```css
font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
```

### 3.3 Scala Tipografica

| Elemento             | Scala Tailwind | Dimensione  | Font Weight | Note                               |
|----------------------|----------------|-------------|-------------|-------------------------------------|
| h1 / Titolo pagina   | `text-2xl`    | 24px        | 600         | --                                  |
| h1 Login             | `text-3xl`    | 30px        | 600         | Gradiente oro > teal                |
| Card title / h2-h3   | `text-lg`     | 18px        | 600         | --                                  |
| h4 / Sezione         | `text-base`   | 16px        | 500-600     | --                                  |
| Body text             | `text-sm`     | 14px        | 400         | Colore `--text-primary`             |
| Testo secondario      | `text-sm`     | 14px        | 400         | Colore `--text-secondary`           |
| Label form            | `text-sm`     | 14px        | 500         | Colore `--text-secondary`           |
| Nav item              | `text-sm`     | 14px        | 400-500     | --                                  |
| Badge                 | `text-xs`     | 12px        | 500         | --                                  |
| Section title nav     | `text-xs`     | 12px        | 600         | UPPERCASE, letter-spacing 0.05em    |
| Hint / Meta           | `text-xs`     | 12px        | 400         | Colore `--text-muted`               |
| Stat value (grande)   | `text-3xl`    | 30px        | 600         | Colore `--accent-primary`           |

---

## 4. Spacing & Layout

### 4.1 Design Tokens

| Token               | Valore   |
|----------------------|----------|
| `--sidebar-width`    | `260px`  |
| `--header-height`    | `64px`   |
| `--radius-sm`        | `6px`    |
| `--radius-md`        | `8px`    |
| `--radius-lg`        | `12px`   |

### 4.2 Ombre

| Token           | Valore                             |
|-----------------|------------------------------------|
| `--shadow-sm`   | `0 2px 4px rgba(0, 0, 0, 0.3)`    |
| `--shadow-md`   | `0 4px 12px rgba(0, 0, 0, 0.4)`   |
| `--shadow-lg`   | `0 8px 24px rgba(0, 0, 0, 0.5)`   |

### 4.3 Layout Principale

La sidebar si apre/chiude con hamburger menu. Il contenuto usa **sempre l'intera larghezza** perche le tabelle dati audit necessitano di tutto lo spazio disponibile.

```
SIDEBAR CHIUSA (default):
+-------------------------------------------------------------+
|  [☰] GADS Audit        Titolo Pagina           [User]       |
+-------------------------------------------------------------+
|                                                              |
|                    MAIN CONTENT                              |
|                    (full width, padding 1.5rem)              |
|                                                              |
+-------------------------------------------------------------+

SIDEBAR APERTA (overlay):
+------------------+------------------------------------------+
|                  |  (overlay scuro)                          |
|    SIDEBAR       |                                          |
|    (260px)       |                                          |
|    overlay       |                                          |
|                  |                                          |
+------------------+------------------------------------------+
```

- **Sidebar**: overlay, larghezza 260px, si apre da sinistra con hamburger
- **Header**: fisso in alto, altezza 64px, hamburger a sinistra
- **Contenuto**: sempre full width (nessun margin-left), padding 1.5rem

---

## 5. Componenti

### 5.1 Bottoni

#### Varianti

| Variante        | Background                                            | Colore testo | Hover                                               |
|-----------------|-------------------------------------------------------|--------------|------------------------------------------------------|
| **Primary**     | `linear-gradient(135deg, #d4a726, #ff8f65)`           | `white`      | translateY(-2px), box-shadow arancione               |
| **Secondary**   | `#1a2d44` + bordo `#2a2a35`                           | `#f5f5f7`    | Background piu chiaro, bordo piu chiaro              |
| **Success**     | `linear-gradient(135deg, #22c55e, #34d399)`           | `white`      | --                                                   |
| **Danger**      | `linear-gradient(135deg, #ef4444, #f87171)`           | `white`      | --                                                   |

### 5.2 Card

```css
background: #132032;       /* --bg-secondary */
border: 1px solid #2a2a35; /* --border-color */
border-radius: 12px;       /* --radius-lg */
padding: 1.5rem;
transition: border-color 0.2s;
/* Hover: border-color #3a3a45 */
```

### 5.3 Badge (Stato Audit)

Principio: background al 15% di opacita del colore del testo.

| Variante            | Background                      | Colore testo   |
|---------------------|---------------------------------|----------------|
| `.badge-active`     | `rgba(34, 197, 94, 0.15)`      | `#22c55e`      |
| `.badge-paused`     | `rgba(234, 179, 8, 0.15)`      | `#eab308`      |
| `.badge-removed`    | `rgba(239, 68, 68, 0.15)`      | `#ef4444`      |
| `.badge-info`       | `rgba(59, 130, 246, 0.15)`     | `#3b82f6`      |

### 5.4 Form Input

```css
background: #1a2d44;       /* --bg-tertiary */
border: 1px solid #2a2a35; /* --border-color */
border-radius: 8px;        /* --radius-md */
/* Focus: border #d4a726, glow rgba(255, 107, 53, 0.1) */
```

---

## 6. Navigazione

### 6.1 Sidebar (Overlay con Hamburger Toggle)

La sidebar e un **overlay** che si apre/chiude con il pulsante hamburger nel header. Non e mai visibile di default: il contenuto usa sempre il 100% della larghezza perche le pagine audit (tabelle dati, metriche) necessitano di tutto lo spazio.

```css
position: fixed;
width: 260px;
height: 100vh;
background: #132032;              /* --bg-secondary */
border-right: 1px solid #2a2a35;  /* --border-color */
z-index: 40;
transform: translateX(-100%);     /* Nascosta di default */
transition: transform 0.3s;
/* Aperta: transform: translateX(0) */
```

La sidebar e divisa in **4 zone verticali**:

```
+------------------------------------------+
|  ZONA 1 - HEADER APP                    |
|  [Icona Audit] KW GADS Audit   v2.6.0   |
+------------------------------------------+
|  ZONA 2 - NAVIGAZIONE PRINCIPALE        |
|  PRINCIPALE                              |
|    Dashboard                             |
|    Account                               |
|  ----------------------------------------|
|  AUDIT (visibile solo se in audit page)  |
|    Campagne | Ad Groups | Keywords | ... |
+------------------------------------------+
|          (spazio flessibile)             |
+------------------------------------------+
|  ZONA 3 - NAVIGAZIONE FISSA             |
|  Profilo | Impostazioni | Guida | Esci  |
+------------------------------------------+
```

#### Zona 1 - Header App

```css
/* Container */
padding: 1.25rem 1.5rem;
border-bottom: 1px solid #2a2a35;
display: flex;
align-items: center;
gap: 0.75rem;

/* Icona app */
width: 40px;
height: 40px;
background: #0d1521;            /* --bg-primary */
border-radius: 8px;
color: #d4a726;                 /* --accent-primary */
/* Icona Lucide: BarChart3 o Target (audit) */

/* Nome: "KW GADS Audit" - font-size 0.95rem, weight 600 */
/* Versione: "v2.6.0" - font-size 0.75rem, color #71717a */
```

#### Zona 2 - Item Navigazione

```css
/* Item attivo */
background: rgba(255, 107, 53, 0.1);   /* Tinta arancione */
color: #d4a726;                          /* --accent-primary */

/* Item inattivo */
color: #a1a1aa;            /* --text-secondary */
/* Hover: background #1a2d44, color #f5f5f7 */
```

Sezioni separate da titoli UPPERCASE (font-size 0.7rem, weight 600, color #71717a, letter-spacing 0.05em).

#### Zona 3 - Footer Fisso (Obbligatorio)

| Voce            | Icona Lucide     |
|-----------------|------------------|
| **Profilo**     | `User`           |
| **Impostazioni**| `Settings`       |
| **Guida**       | `BookOpen`       |
| **Esci**        | `LogOut`         |

### 6.2 Header Desktop

```css
position: sticky;
height: 64px;
background: #132032;              /* --bg-secondary */
border-bottom: 1px solid #2a2a35;
z-index: 10;
```

Struttura:
```
+-------------------------------------------------------------+
|  [☰ Hamburger]  Titolo Pagina    [Info utente / Azioni]     |
+-------------------------------------------------------------+
```

- Hamburger: a sinistra, apre/chiude la sidebar overlay
- Titolo: nome della pagina corrente
- Destra: info utente o azioni contestuali

### 6.3 Mobile Bottom Nav

Navigazione bottom su mobile (< md breakpoint). Stessa struttura attuale con:
- **Main**: Dashboard, Account, Impostazioni, Profilo
- **Audit**: Campagne, Ad Groups, Keywords, Conversioni + Menu "Altro"

---

## 7. Pagina Login

La pagina di login segue lo standard Karalisweb:

```
+------------------------------------------+
|                                          |
|          KW GADS Audit                   |
|          (gradiente oro > teal)          |
|          Google Ads Audit Tool           |
|                                          |
|   +----------------------------------+   |
|   |  Accedi                          |   |
|   |  Credenziali per continuare      |   |
|   |                                  |   |
|   |  Email                           |   |
|   |  [________________________]      |   |
|   |                                  |   |
|   |  Password      Dimenticata?      |   |
|   |  [________________________]      |   |
|   |                                  |   |
|   |  [====== Accedi ========]        |   |
|   +----------------------------------+   |
|                                          |
|          v2.6.0                          |
+------------------------------------------+
```

- Titolo: gradiente `linear-gradient(135deg, #d4a726, #2d7d9a)`
- Bottone: gradiente oro > arancione (`#d4a726` > `#ff8f65`)
- Box: `bg-secondary`, `border-color`, `radius-lg`, `shadow-lg`

---

## 8. Icone

### 8.1 Libreria: Lucide Icons (esclusivamente)

```bash
# Gia installato: lucide-react
```

### 8.2 Dimensioni per Contesto

| Contesto          | Dimensioni  | Prop `size` (React) |
|-------------------|-------------|----------------------|
| Icone navigazione | `20x20px`   | `size={20}`          |
| Icone bottone     | `16x16px`   | `size={16}`          |
| Icone header      | `24x24px`   | `size={24}`          |
| Icone mobile nav  | `22x22px`   | `size={22}`          |

### 8.3 Icone Specifiche GADS Audit

| Funzione           | Nome Lucide        |
|--------------------|--------------------|
| Dashboard          | `LayoutDashboard`  |
| Account            | `Building2`        |
| Campagne           | `Megaphone`        |
| Ad Groups          | `Layers`           |
| Keywords           | `KeyRound`         |
| Conversioni        | `Target`           |
| Issues             | `AlertTriangle`    |
| Annunci            | `FileText`         |
| Search Terms       | `Search`           |
| Negative Keywords  | `MinusCircle`      |
| Assets             | `Image`            |
| Modifiche          | `Wrench`           |

---

## 9. Pattern Ricorrenti

1. **Bordi sottili**: sempre `1px solid`, mai piu spessi
2. **Background + bordo**: le card/container hanno sempre sia background che bordo
3. **Gerarchie con opacita**: i badge usano il colore al 15% come sfondo
4. **Gradienti 135deg**: tutti i gradienti usano 135 gradi
5. **Whitespace generoso**: padding e gap ampi
6. **Interattivita sottile**: hover leggeri, transizioni 0.2s
7. **Coerenza arancione**: `rgba(255, 107, 53)` come filo conduttore

---

## 10. Responsive Design

| Breakpoint    | Larghezza       | Comportamento                              |
|---------------|-----------------|---------------------------------------------|
| Desktop       | > 768px (md)    | Header con hamburger, sidebar overlay       |
| Mobile        | < 768px         | Mobile header, bottom nav, sidebar overlay  |

Su **tutte le dimensioni** il contenuto principale usa il 100% della larghezza. La sidebar e sempre un overlay attivato dall'hamburger.

---

## 11. Gestione Versioni

Formato: **Semantic Versioning** `vMAJOR.MINOR.PATCH`

La versione va sincronizzata in:

| File | Campo | Esempio |
|------|-------|---------|
| `frontend/package.json` | `"version"` | `"2.6.0"` |
| `deploy.sh` | `APP_VERSION` + header | `APP_VERSION="2.6.0"` |
| `DEPLOY.md` | Intestazione | `Versione attuale: **2.6.0**` |
| **Sidebar UI** | Header app | `v2.6.0` |
| **Login page** | Footer | `v2.6.0` |

---

*Ultimo aggiornamento: 2026-02-08*
