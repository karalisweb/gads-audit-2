-- =============================================
-- Google Ads Audit App - Schema Database
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
-- DATI GOOGLE ADS
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
    change_set_id UUID REFERENCES change_sets(id),
    exported_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDICI
-- =============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_invite_token ON users(invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_import_runs_account ON import_runs(account_id);
CREATE INDEX idx_import_runs_status ON import_runs(status);
CREATE INDEX idx_campaigns_account_run ON campaigns(account_id, run_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_ad_groups_campaign ON ad_groups(campaign_id);
CREATE INDEX idx_ad_groups_account_run ON ad_groups(account_id, run_id);
CREATE INDEX idx_ads_ad_group ON ads(ad_group_id);
CREATE INDEX idx_ads_account_run ON ads(account_id, run_id);
CREATE INDEX idx_keywords_ad_group ON keywords(ad_group_id);
CREATE INDEX idx_keywords_account_run ON keywords(account_id, run_id);
CREATE INDEX idx_keywords_quality ON keywords(quality_score);
CREATE INDEX idx_search_terms_campaign ON search_terms(campaign_id);
CREATE INDEX idx_search_terms_account_run ON search_terms(account_id, run_id);
CREATE INDEX idx_negative_keywords_account_run ON negative_keywords(account_id, run_id);
CREATE INDEX idx_assets_account_run ON assets(account_id, run_id);
CREATE INDEX idx_conversion_actions_account_run ON conversion_actions(account_id, run_id);
CREATE INDEX idx_geo_performance_account_run ON geo_performance(account_id, run_id);
CREATE INDEX idx_device_performance_account_run ON device_performance(account_id, run_id);
CREATE INDEX idx_audits_account ON audits(account_id);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_decisions_audit ON decisions(audit_id);
CREATE INDEX idx_decisions_current ON decisions(decision_group_id) WHERE is_current = true;
CREATE INDEX idx_decisions_module ON decisions(module_id);
CREATE INDEX idx_decisions_entity ON decisions(entity_type, entity_id);
CREATE INDEX idx_change_sets_audit ON change_sets(audit_id);
CREATE INDEX idx_change_sets_status ON change_sets(status);

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

-- =============================================
-- FUNZIONE UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_ads_accounts_updated_at BEFORE UPDATE ON google_ads_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON audits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_change_sets_updated_at BEFORE UPDATE ON change_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
