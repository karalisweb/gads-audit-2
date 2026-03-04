import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDailyMetrics1772700100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS daily_metrics (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        account_id UUID NOT NULL REFERENCES google_ads_accounts(id) ON DELETE CASCADE,
        run_id VARCHAR(100) NOT NULL,
        entity_type VARCHAR(30) NOT NULL,
        entity_id VARCHAR(50) NOT NULL,
        entity_name VARCHAR(500),
        campaign_id VARCHAR(50),
        date DATE NOT NULL,
        impressions BIGINT DEFAULT 0,
        clicks BIGINT DEFAULT 0,
        cost_micros BIGINT DEFAULT 0,
        conversions DECIMAL(12,2) DEFAULT 0,
        conversions_value DECIMAL(14,2) DEFAULT 0,
        ctr DECIMAL(8,4) DEFAULT 0,
        average_cpc_micros BIGINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT UQ_daily_metrics_composite UNIQUE (account_id, run_id, entity_type, entity_id, date)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_daily_metrics_account_date
      ON daily_metrics (account_id, date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_daily_metrics_account_type_date
      ON daily_metrics (account_id, entity_type, date)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS daily_metrics`);
  }
}
