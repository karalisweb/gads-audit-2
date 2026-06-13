# Technical Changelog - KW GADS Audit

Log tecnico delle modifiche al software, auto-generato dal deploy script.

---

| Versione | Data | Commit |
|----------|------|--------|
| 2.18.9 | 2026-06-13 | feat: filtro 'Solo entita attive' nelle modifiche (nasconde quelle su campagne/gruppi/annunci/keyword in pausa o rimossi, con risalita al genitore) + vista Per data impostata come default |
| 2.18.8 | 2026-06-13 | feat: pulsante 'Riporta in Attesa' per annullare un'approvazione fatta per sbaglio (da Approvata torna In Attesa) + nuova vista delle modifiche raggruppata per data (sessione di audit) |
| 2.18.7 | 2026-06-13 | feat: importato il livello obiettivo (customer_conversion_goal.biddable) come goal_biddable sulle conversioni; l'AI ora valuta Primario/Secondario da questo invece che da primary_for_goal, niente piu falsi 'assenza di conversioni primarie' |
| 2.18.6 | 2026-06-13 | fix: l'analisi AI con Gemini falliva con 'Analysis failed' perche il JSON veniva troncato dal thinking di Gemini 3; alzato il budget token a 16k e aggiunto parsing difensivo con errore leggibile in caso di troncamento |
| 2.18.5 | 2026-06-13 | fix: la chat del report mostra un errore chiaro invece di far sparire il messaggio; il backend rimuove la domanda orfana e rilancia un errore leggibile (es. quota AI esaurita) quando il provider fallisce |
| 2.18.4 | 2026-06-12 | feat: i rifiuti ora sono permanenti - una modifica rifiutata non viene riproposta dall'AI finche lo stato attuale del dato resta invariato |
| 2.18.3 | 2026-06-12 | fix: metriche di periodo gonfiate - daily_metrics deduplicate per (entita,giorno) tenendo l'import piu recente, niente piu somma tra run multipli |
| 2.18.2 | 2026-06-12 | feat: card account legate al periodo selezionato con confronto (default 7gg+confronta); Da fare oggi solo modifiche urgenti, rimosse raccomandazioni dalla home |
| 2.18.1 | 2026-06-12 | fix: badge conteggio pending nella sidebar agganciato a /accounts dopo rimozione Dashboard |
| 2.18.0 | 2026-06-12 | feat: pagina Account unificata, split modifiche/raccomandazioni, AI ancorata a fattibilita e chat |
| 2.17.2 | 2026-05-31 | feat: contatore termini netti e negativizzati nella pagina Search Terms |
| 2.17.1 | 2026-05-31 | feat: marca i search term già spostati nelle negative nella pagina Search Terms |
| 2.17.0 | 2026-05-31 | feat: analisi termini di ricerca nel report strategico + selezione multipla search terms con creazione negative in blocco |
| 2.16.0 | 2026-04-04 | feat: login page redesign (PMI style) + Karalisweb logo SVG |
| 2.15.1 | 2026-03-26 | fix: improved report UX - clear new report flow, history pills, compare banner |
| 2.15.0 | 2026-03-26 | feat: 3 AI providers (OpenAI, Gemini, Claude) + report history with comparison + strategic per-report chat |
| 2.14.8 | 2026-03-18 | fix: security hardening (JWT, XSS, rate limiting, TLS, encryption) + test suite + docs |
| 2.14.7 | 2026-03-06 | feat: integrate Gemini 3 Flash as alternative AI provider |
| 2.14.6 | 2026-03-04 | fix: LP Planner excludes already-briefed keywords, persists clusters, prevents cannibalization |
| 2.14.5 | 2026-03-04 | fix: auto-reload on chunk loading failure after deploys |
| 2.14.4 | 2026-03-04 | fix: parse adGroupId~criterionId in keyword modifications for all download scripts |
| 2.14.3 | 2026-03-04 | fix: extend daily_metrics entity_id to varchar(255) for long search terms |
| 2.14.2 | 2026-03-04 | fix: daily_search_terms dedup + HMAC guard GET body mismatch |
| 2.14.1 | 2026-03-04 | feat: add compare mode to entity tables with % change badges |
| 2.14.0 | 2026-03-04 | feat: period filter on all entity tables (campaigns, ad groups, keywords, ads, search terms) |
| 2.13.4 | 2026-03-04 | feat: Performance section uses period-filtered data from daily_metrics |
| 2.13.3 | 2026-03-04 | fix: add missing PeriodSelection import in DashboardPage |
| 2.13.2 | 2026-03-04 | fix: add PeriodSelector to AuditLayout header on all audit pages |
| 2.13.1 | 2026-03-04 | fix: remove old PeriodSelector from AuditLayout |
| 2.13.0 | 2026-03-04 | feat: account strategy + daily metrics + period filter |
| 2.12.1 | 2026-03-04 | refactor: code cleanup, shared OpenAI provider, deploy script improvements |
| 2.12.0 | 2026-03-04 | feat: add LP Planner - keyword clustering + AI brief generation |
| 2.11.2 | 2026-03-03 | feat: run audit rules automatically during scheduled AI analysis |
| 2.11.1 | 2026-03-02 | feat: add modification type filter on modifications page |
| 2.11.0 | 2026-02-24 | feat: per-account AI audit scheduling + enhanced deploy script |

---

*Auto-generato da deploy.sh*
