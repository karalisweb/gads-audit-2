# Technical Changelog - KW GADS Audit

Log tecnico delle modifiche al software, auto-generato dal deploy script.

---

| Versione | Data | Commit |
|----------|------|--------|
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
