-- Test script per verificare l'esclusione delle negative keywords
-- Eseguire questo script sul database per validare la logica

-- ============================================================================
-- 1. Mostra statistiche attuali
-- ============================================================================
SELECT 'STATISTICHE ATTUALI' as section;

SELECT
  'keywords' as entity,
  COUNT(*) as count
FROM keywords
UNION ALL
SELECT
  'negative_keywords' as entity,
  COUNT(*) as count
FROM negative_keywords;

-- ============================================================================
-- 2. Mostra i diversi livelli di negative keywords
-- ============================================================================
SELECT 'LIVELLI NEGATIVE KEYWORDS' as section;

SELECT
  level,
  COUNT(*) as count,
  COUNT(DISTINCT campaign_id) as campaigns,
  COUNT(DISTINCT ad_group_id) as ad_groups
FROM negative_keywords
GROUP BY level
ORDER BY level;

-- ============================================================================
-- 3. Trova keywords che dovrebbero essere escluse per match con negative
-- ============================================================================
SELECT 'KEYWORDS CHE MATCHANO CON NEGATIVE (dovrebbero essere escluse)' as section;

SELECT
  kw.keyword_text,
  kw.campaign_name as kw_campaign,
  kw.ad_group_name as kw_ad_group,
  nk.keyword_text as nk_text,
  nk.level as nk_level,
  nk.campaign_name as nk_campaign,
  nk.ad_group_name as nk_ad_group,
  CASE
    WHEN nk.ad_group_id = kw.ad_group_id THEN 'AD_GROUP_MATCH'
    WHEN nk.campaign_id = kw.campaign_id AND (nk.ad_group_id IS NULL OR nk.ad_group_id = '') THEN 'CAMPAIGN_MATCH'
    WHEN nk.campaign_id IS NULL OR nk.campaign_id = '' THEN 'ACCOUNT_MATCH'
  END as match_type
FROM keywords kw
INNER JOIN negative_keywords nk
  ON LOWER(nk.keyword_text) = LOWER(kw.keyword_text)
  AND nk.account_id = kw.account_id
  AND (
    nk.ad_group_id = kw.ad_group_id
    OR (nk.campaign_id = kw.campaign_id AND (nk.ad_group_id IS NULL OR nk.ad_group_id = ''))
    OR (nk.campaign_id IS NULL OR nk.campaign_id = '')
  )
LIMIT 50;

-- ============================================================================
-- 4. Conta quante keywords verranno escluse per tipo di match
-- ============================================================================
SELECT 'CONTEGGIO ESCLUSIONI PER TIPO' as section;

SELECT
  CASE
    WHEN nk.ad_group_id = kw.ad_group_id THEN 'AD_GROUP_MATCH'
    WHEN nk.campaign_id = kw.campaign_id AND (nk.ad_group_id IS NULL OR nk.ad_group_id = '') THEN 'CAMPAIGN_MATCH'
    WHEN nk.campaign_id IS NULL OR nk.campaign_id = '' THEN 'ACCOUNT_MATCH'
  END as match_type,
  COUNT(DISTINCT kw.id) as keywords_excluded
FROM keywords kw
INNER JOIN negative_keywords nk
  ON LOWER(nk.keyword_text) = LOWER(kw.keyword_text)
  AND nk.account_id = kw.account_id
  AND (
    nk.ad_group_id = kw.ad_group_id
    OR (nk.campaign_id = kw.campaign_id AND (nk.ad_group_id IS NULL OR nk.ad_group_id = ''))
    OR (nk.campaign_id IS NULL OR nk.campaign_id = '')
  )
GROUP BY match_type
ORDER BY keywords_excluded DESC;

-- ============================================================================
-- 5. Verifica query finale (quella usata dall'API)
-- ============================================================================
SELECT 'VERIFICA QUERY API - Keywords filtrate (prime 20)' as section;

SELECT
  kw.keyword_text,
  kw.campaign_name,
  kw.ad_group_name,
  kw.impressions,
  kw.clicks
FROM keywords kw
WHERE NOT EXISTS (
  SELECT 1 FROM negative_keywords nk
  WHERE LOWER(nk.keyword_text) = LOWER(kw.keyword_text)
  AND nk.account_id = kw.account_id
  AND (
    nk.ad_group_id = kw.ad_group_id
    OR (nk.campaign_id = kw.campaign_id AND (nk.ad_group_id IS NULL OR nk.ad_group_id = ''))
    OR (nk.campaign_id IS NULL OR nk.campaign_id = '')
  )
)
ORDER BY CAST(kw.cost_micros AS BIGINT) DESC
LIMIT 20;

-- ============================================================================
-- 6. Confronto totali
-- ============================================================================
SELECT 'CONFRONTO TOTALI' as section;

SELECT
  (SELECT COUNT(*) FROM keywords) as total_keywords,
  (SELECT COUNT(*) FROM keywords kw WHERE NOT EXISTS (
    SELECT 1 FROM negative_keywords nk
    WHERE LOWER(nk.keyword_text) = LOWER(kw.keyword_text)
    AND nk.account_id = kw.account_id
    AND (
      nk.ad_group_id = kw.ad_group_id
      OR (nk.campaign_id = kw.campaign_id AND (nk.ad_group_id IS NULL OR nk.ad_group_id = ''))
      OR (nk.campaign_id IS NULL OR nk.campaign_id = '')
    )
  )) as keywords_after_filter,
  (SELECT COUNT(*) FROM keywords) - (SELECT COUNT(*) FROM keywords kw WHERE NOT EXISTS (
    SELECT 1 FROM negative_keywords nk
    WHERE LOWER(nk.keyword_text) = LOWER(kw.keyword_text)
    AND nk.account_id = kw.account_id
    AND (
      nk.ad_group_id = kw.ad_group_id
      OR (nk.campaign_id = kw.campaign_id AND (nk.ad_group_id IS NULL OR nk.ad_group_id = ''))
      OR (nk.campaign_id IS NULL OR nk.campaign_id = '')
    )
  )) as keywords_excluded;
