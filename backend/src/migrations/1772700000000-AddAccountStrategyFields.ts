import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountStrategyFields1772700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE google_ads_accounts
      ADD COLUMN IF NOT EXISTS business_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS primary_objective VARCHAR(50),
      ADD COLUMN IF NOT EXISTS strategy_notes TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE google_ads_accounts
      DROP COLUMN IF EXISTS strategy_notes,
      DROP COLUMN IF EXISTS primary_objective,
      DROP COLUMN IF EXISTS business_type
    `);
  }
}
