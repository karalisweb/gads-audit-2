import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1736164800000 implements MigrationInterface {
  name = 'InitialSchema1736164800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255),
        "role" varchar(20) NOT NULL DEFAULT 'user',
        "totp_secret" varchar(255),
        "totp_enabled" boolean NOT NULL DEFAULT false,
        "backup_codes" jsonb,
        "is_active" boolean NOT NULL DEFAULT false,
        "email_verified" boolean NOT NULL DEFAULT false,
        "invite_token" varchar(255),
        "invite_expires_at" timestamptz,
        "last_login_at" timestamptz,
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Refresh tokens table
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "revoked_at" timestamptz,
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Audit logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "action" varchar(50) NOT NULL,
        "entity_type" varchar(50),
        "entity_id" varchar(100),
        "ip_address" inet,
        "user_agent" text,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Google Ads Accounts table
    await queryRunner.query(`
      CREATE TABLE "google_ads_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_id" varchar(20) NOT NULL,
        "customer_name" varchar(255),
        "currency_code" varchar(3) NOT NULL DEFAULT 'EUR',
        "time_zone" varchar(50) NOT NULL DEFAULT 'Europe/Rome',
        "shared_secret" varchar(64) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_google_ads_accounts_customer_id" UNIQUE ("customer_id"),
        CONSTRAINT "PK_google_ads_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_google_ads_accounts_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // User accounts junction table
    await queryRunner.query(`
      CREATE TABLE "user_accounts" (
        "user_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        CONSTRAINT "PK_user_accounts" PRIMARY KEY ("user_id", "account_id"),
        CONSTRAINT "FK_user_accounts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_accounts_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE
      )
    `);

    // Import runs table
    await queryRunner.query(`
      CREATE TABLE "import_runs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "run_id" varchar(100) NOT NULL,
        "account_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'in_progress',
        "started_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz,
        "datasets_expected" integer,
        "datasets_received" integer NOT NULL DEFAULT 0,
        "total_rows" integer NOT NULL DEFAULT 0,
        "error_message" text,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "UQ_import_runs_run_id" UNIQUE ("run_id"),
        CONSTRAINT "PK_import_runs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_import_runs_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE
      )
    `);

    // Import chunks table
    await queryRunner.query(`
      CREATE TABLE "import_chunks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "run_id" varchar(100) NOT NULL,
        "dataset_name" varchar(50) NOT NULL,
        "chunk_index" integer NOT NULL,
        "chunk_total" integer,
        "row_count" integer,
        "received_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_import_chunks" UNIQUE ("run_id", "dataset_name", "chunk_index"),
        CONSTRAINT "PK_import_chunks" PRIMARY KEY ("id")
      )
    `);

    // Campaigns table
    await queryRunner.query(`
      CREATE TABLE "campaigns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "run_id" varchar(100) NOT NULL,
        "campaign_id" varchar(50) NOT NULL,
        "campaign_name" varchar(255),
        "status" varchar(20),
        "advertising_channel_type" varchar(50),
        "bidding_strategy_type" varchar(50),
        "target_cpa_micros" bigint,
        "target_roas" decimal(10,4),
        "budget_micros" bigint,
        "impressions" bigint NOT NULL DEFAULT 0,
        "clicks" bigint NOT NULL DEFAULT 0,
        "cost_micros" bigint NOT NULL DEFAULT 0,
        "conversions" decimal(12,2) NOT NULL DEFAULT 0,
        "conversions_value" decimal(14,2) NOT NULL DEFAULT 0,
        "ctr" decimal(8,4) NOT NULL DEFAULT 0,
        "average_cpc_micros" bigint NOT NULL DEFAULT 0,
        "search_impression_share" decimal(6,4),
        "search_impression_share_lost_rank" decimal(6,4),
        "search_impression_share_lost_budget" decimal(6,4),
        "search_top_impression_share" decimal(6,4),
        "search_absolute_top_impression_share" decimal(6,4),
        "top_impression_percentage" decimal(6,4),
        "absolute_top_impression_percentage" decimal(6,4),
        "phone_calls" integer NOT NULL DEFAULT 0,
        "phone_impressions" integer NOT NULL DEFAULT 0,
        "message_chats" integer NOT NULL DEFAULT 0,
        "message_impressions" integer NOT NULL DEFAULT 0,
        "data_date_start" date,
        "data_date_end" date,
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_campaigns" UNIQUE ("account_id", "run_id", "campaign_id"),
        CONSTRAINT "PK_campaigns" PRIMARY KEY ("id"),
        CONSTRAINT "FK_campaigns_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE
      )
    `);

    // Ad groups table
    await queryRunner.query(`
      CREATE TABLE "ad_groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "run_id" varchar(100) NOT NULL,
        "ad_group_id" varchar(50) NOT NULL,
        "ad_group_name" varchar(255),
        "campaign_id" varchar(50) NOT NULL,
        "campaign_name" varchar(255),
        "status" varchar(20),
        "type" varchar(50),
        "cpc_bid_micros" bigint,
        "target_cpa_micros" bigint,
        "impressions" bigint NOT NULL DEFAULT 0,
        "clicks" bigint NOT NULL DEFAULT 0,
        "cost_micros" bigint NOT NULL DEFAULT 0,
        "conversions" decimal(12,2) NOT NULL DEFAULT 0,
        "conversions_value" decimal(14,2) NOT NULL DEFAULT 0,
        "ctr" decimal(8,4) NOT NULL DEFAULT 0,
        "average_cpc_micros" bigint NOT NULL DEFAULT 0,
        "search_impression_share" decimal(6,4),
        "search_impression_share_lost_rank" decimal(6,4),
        "search_impression_share_lost_budget" decimal(6,4),
        "phone_calls" integer NOT NULL DEFAULT 0,
        "message_chats" integer NOT NULL DEFAULT 0,
        "data_date_start" date,
        "data_date_end" date,
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_ad_groups" UNIQUE ("account_id", "run_id", "ad_group_id"),
        CONSTRAINT "PK_ad_groups" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ad_groups_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE
      )
    `);

    // Ads table
    await queryRunner.query(`
      CREATE TABLE "ads" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "run_id" varchar(100) NOT NULL,
        "ad_id" varchar(50) NOT NULL,
        "ad_group_id" varchar(50) NOT NULL,
        "ad_group_name" varchar(255),
        "campaign_id" varchar(50) NOT NULL,
        "campaign_name" varchar(255),
        "ad_type" varchar(50),
        "status" varchar(20),
        "approval_status" varchar(30),
        "ad_strength" varchar(20),
        "headlines" jsonb,
        "descriptions" jsonb,
        "final_urls" jsonb,
        "path1" varchar(50),
        "path2" varchar(50),
        "impressions" bigint NOT NULL DEFAULT 0,
        "clicks" bigint NOT NULL DEFAULT 0,
        "cost_micros" bigint NOT NULL DEFAULT 0,
        "conversions" decimal(12,2) NOT NULL DEFAULT 0,
        "conversions_value" decimal(14,2) NOT NULL DEFAULT 0,
        "ctr" decimal(8,4) NOT NULL DEFAULT 0,
        "average_cpc_micros" bigint NOT NULL DEFAULT 0,
        "phone_calls" integer NOT NULL DEFAULT 0,
        "message_chats" integer NOT NULL DEFAULT 0,
        "data_date_start" date,
        "data_date_end" date,
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_ads" UNIQUE ("account_id", "run_id", "ad_id"),
        CONSTRAINT "PK_ads" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ads_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE
      )
    `);

    // Keywords table
    await queryRunner.query(`
      CREATE TABLE "keywords" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "run_id" varchar(100) NOT NULL,
        "keyword_id" varchar(50) NOT NULL,
        "keyword_text" varchar(500) NOT NULL,
        "match_type" varchar(20),
        "ad_group_id" varchar(50) NOT NULL,
        "ad_group_name" varchar(255),
        "campaign_id" varchar(50) NOT NULL,
        "campaign_name" varchar(255),
        "status" varchar(20),
        "approval_status" varchar(30),
        "cpc_bid_micros" bigint,
        "final_url" varchar(2048),
        "quality_score" integer,
        "creative_relevance" varchar(20),
        "landing_page_experience" varchar(20),
        "expected_ctr" varchar(20),
        "impressions" bigint NOT NULL DEFAULT 0,
        "clicks" bigint NOT NULL DEFAULT 0,
        "cost_micros" bigint NOT NULL DEFAULT 0,
        "conversions" decimal(12,2) NOT NULL DEFAULT 0,
        "conversions_value" decimal(14,2) NOT NULL DEFAULT 0,
        "ctr" decimal(8,4) NOT NULL DEFAULT 0,
        "average_cpc_micros" bigint NOT NULL DEFAULT 0,
        "search_impression_share" decimal(6,4),
        "search_impression_share_lost_rank" decimal(6,4),
        "search_impression_share_lost_budget" decimal(6,4),
        "phone_calls" integer NOT NULL DEFAULT 0,
        "data_date_start" date,
        "data_date_end" date,
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_keywords" UNIQUE ("account_id", "run_id", "keyword_id"),
        CONSTRAINT "PK_keywords" PRIMARY KEY ("id"),
        CONSTRAINT "FK_keywords_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE
      )
    `);

    // Search terms table
    await queryRunner.query(`
      CREATE TABLE "search_terms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "run_id" varchar(100) NOT NULL,
        "search_term" varchar(500) NOT NULL,
        "keyword_id" varchar(50),
        "keyword_text" varchar(500),
        "match_type_triggered" varchar(20),
        "ad_group_id" varchar(50) NOT NULL,
        "ad_group_name" varchar(255),
        "campaign_id" varchar(50) NOT NULL,
        "campaign_name" varchar(255),
        "impressions" bigint NOT NULL DEFAULT 0,
        "clicks" bigint NOT NULL DEFAULT 0,
        "cost_micros" bigint NOT NULL DEFAULT 0,
        "conversions" decimal(12,2) NOT NULL DEFAULT 0,
        "conversions_value" decimal(14,2) NOT NULL DEFAULT 0,
        "ctr" decimal(8,4) NOT NULL DEFAULT 0,
        "average_cpc_micros" bigint NOT NULL DEFAULT 0,
        "data_date_start" date,
        "data_date_end" date,
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_search_terms" PRIMARY KEY ("id"),
        CONSTRAINT "FK_search_terms_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE
      )
    `);

    // Negative keywords table
    await queryRunner.query(`
      CREATE TABLE "negative_keywords" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "run_id" varchar(100) NOT NULL,
        "negative_keyword_id" varchar(50),
        "keyword_text" varchar(500) NOT NULL,
        "match_type" varchar(20),
        "level" varchar(20),
        "campaign_id" varchar(50),
        "campaign_name" varchar(255),
        "ad_group_id" varchar(50),
        "ad_group_name" varchar(255),
        "shared_set_id" varchar(50),
        "shared_set_name" varchar(255),
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_negative_keywords" PRIMARY KEY ("id"),
        CONSTRAINT "FK_negative_keywords_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE
      )
    `);

    // Assets table
    await queryRunner.query(`
      CREATE TABLE "assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "run_id" varchar(100) NOT NULL,
        "asset_id" varchar(50) NOT NULL,
        "asset_type" varchar(50),
        "asset_text" varchar(255),
        "description1" varchar(255),
        "description2" varchar(255),
        "final_url" varchar(2048),
        "phone_number" varchar(30),
        "status" varchar(20),
        "performance_label" varchar(20),
        "source" varchar(30),
        "linked_level" varchar(20),
        "campaign_id" varchar(50),
        "ad_group_id" varchar(50),
        "impressions" bigint NOT NULL DEFAULT 0,
        "clicks" bigint NOT NULL DEFAULT 0,
        "cost_micros" bigint NOT NULL DEFAULT 0,
        "conversions" decimal(12,2) NOT NULL DEFAULT 0,
        "ctr" decimal(8,4) NOT NULL DEFAULT 0,
        "data_date_start" date,
        "data_date_end" date,
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_assets" UNIQUE ("account_id", "run_id", "asset_id"),
        CONSTRAINT "PK_assets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_assets_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE
      )
    `);

    // Conversion actions table
    await queryRunner.query(`
      CREATE TABLE "conversion_actions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "run_id" varchar(100) NOT NULL,
        "conversion_action_id" varchar(50) NOT NULL,
        "name" varchar(255),
        "status" varchar(20),
        "type" varchar(50),
        "category" varchar(50),
        "origin" varchar(50),
        "counting_type" varchar(30),
        "default_value" decimal(12,2),
        "always_use_default_value" boolean,
        "primary_for_goal" boolean,
        "campaigns_using_count" integer NOT NULL DEFAULT 0,
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_conversion_actions" UNIQUE ("account_id", "run_id", "conversion_action_id"),
        CONSTRAINT "PK_conversion_actions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversion_actions_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE
      )
    `);

    // Geo performance table
    await queryRunner.query(`
      CREATE TABLE "geo_performance" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "run_id" varchar(100) NOT NULL,
        "campaign_id" varchar(50) NOT NULL,
        "campaign_name" varchar(255),
        "location_id" varchar(50),
        "location_name" varchar(255),
        "location_type" varchar(50),
        "is_targeted" boolean,
        "bid_modifier" decimal(6,4),
        "impressions" bigint NOT NULL DEFAULT 0,
        "clicks" bigint NOT NULL DEFAULT 0,
        "cost_micros" bigint NOT NULL DEFAULT 0,
        "conversions" decimal(12,2) NOT NULL DEFAULT 0,
        "data_date_start" date,
        "data_date_end" date,
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_geo_performance" UNIQUE ("account_id", "run_id", "campaign_id", "location_id"),
        CONSTRAINT "PK_geo_performance" PRIMARY KEY ("id"),
        CONSTRAINT "FK_geo_performance_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE
      )
    `);

    // Device performance table
    await queryRunner.query(`
      CREATE TABLE "device_performance" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "run_id" varchar(100) NOT NULL,
        "campaign_id" varchar(50) NOT NULL,
        "campaign_name" varchar(255),
        "device" varchar(20),
        "bid_modifier" decimal(6,4),
        "impressions" bigint NOT NULL DEFAULT 0,
        "clicks" bigint NOT NULL DEFAULT 0,
        "cost_micros" bigint NOT NULL DEFAULT 0,
        "conversions" decimal(12,2) NOT NULL DEFAULT 0,
        "data_date_start" date,
        "data_date_end" date,
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_device_performance" UNIQUE ("account_id", "run_id", "campaign_id", "device"),
        CONSTRAINT "PK_device_performance" PRIMARY KEY ("id"),
        CONSTRAINT "FK_device_performance_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE
      )
    `);

    // Audits table
    await queryRunner.query(`
      CREATE TABLE "audits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "run_id" varchar(100) NOT NULL,
        "name" varchar(255),
        "status" varchar(20) NOT NULL DEFAULT 'in_progress',
        "modules_completed" integer[] NOT NULL DEFAULT '{}',
        "current_module" integer NOT NULL DEFAULT 1,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz,
        "notes" text,
        CONSTRAINT "PK_audits" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audits_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_audits_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Change sets table
    await queryRunner.query(`
      CREATE TABLE "change_sets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "audit_id" uuid,
        "account_id" uuid,
        "name" varchar(255),
        "description" text,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "export_files" jsonb,
        "export_hash" varchar(64),
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "approved_at" timestamptz,
        "exported_at" timestamptz,
        CONSTRAINT "PK_change_sets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_change_sets_audit" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_change_sets_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_change_sets_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Decisions table
    await queryRunner.query(`
      CREATE TABLE "decisions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "audit_id" uuid,
        "account_id" uuid,
        "decision_group_id" uuid NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "is_current" boolean NOT NULL DEFAULT true,
        "superseded_by" uuid,
        "module_id" integer NOT NULL,
        "entity_type" varchar(30) NOT NULL,
        "entity_id" varchar(50) NOT NULL,
        "entity_name" varchar(500),
        "action_type" varchar(50) NOT NULL,
        "before_value" jsonb,
        "after_value" jsonb,
        "rationale" text,
        "evidence" jsonb,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "change_set_id" uuid,
        "exported_at" timestamptz,
        "applied_at" timestamptz,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_decisions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_decisions_audit" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_decisions_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_decisions_change_set" FOREIGN KEY ("change_set_id") REFERENCES "change_sets"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_decisions_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Audit issues table
    await queryRunner.query(`
      CREATE TABLE "audit_issues" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "accountId" uuid NOT NULL,
        "runId" uuid NOT NULL,
        "ruleId" varchar(100) NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "severity" varchar(20) NOT NULL,
        "category" varchar(30) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'open',
        "entityType" varchar(50),
        "entityId" varchar(100),
        "entityName" varchar(255),
        "potentialSavings" decimal(15,2),
        "potentialGain" decimal(15,2),
        "affectedImpressions" integer,
        "affectedClicks" integer,
        "affectedCost" decimal(15,2),
        "recommendation" text,
        "actionSteps" text,
        "metadata" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "acknowledgedAt" timestamptz,
        "resolvedAt" timestamptz,
        CONSTRAINT "PK_audit_issues" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for audit_issues
    await queryRunner.query(`CREATE INDEX "IDX_audit_issues_accountId" ON "audit_issues" ("accountId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_issues_accountId_runId" ON "audit_issues" ("accountId", "runId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_issues_accountId_severity" ON "audit_issues" ("accountId", "severity")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_issues_accountId_category" ON "audit_issues" ("accountId", "category")`);

    // Enable uuid-ossp extension for uuid_generate_v4()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_audit_issues_accountId_category"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_issues_accountId_severity"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_issues_accountId_runId"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_issues_accountId"`);
    await queryRunner.query(`DROP TABLE "audit_issues"`);
    await queryRunner.query(`DROP TABLE "decisions"`);
    await queryRunner.query(`DROP TABLE "change_sets"`);
    await queryRunner.query(`DROP TABLE "audits"`);
    await queryRunner.query(`DROP TABLE "device_performance"`);
    await queryRunner.query(`DROP TABLE "geo_performance"`);
    await queryRunner.query(`DROP TABLE "conversion_actions"`);
    await queryRunner.query(`DROP TABLE "assets"`);
    await queryRunner.query(`DROP TABLE "negative_keywords"`);
    await queryRunner.query(`DROP TABLE "search_terms"`);
    await queryRunner.query(`DROP TABLE "keywords"`);
    await queryRunner.query(`DROP TABLE "ads"`);
    await queryRunner.query(`DROP TABLE "ad_groups"`);
    await queryRunner.query(`DROP TABLE "campaigns"`);
    await queryRunner.query(`DROP TABLE "import_chunks"`);
    await queryRunner.query(`DROP TABLE "import_runs"`);
    await queryRunner.query(`DROP TABLE "user_accounts"`);
    await queryRunner.query(`DROP TABLE "google_ads_accounts"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
