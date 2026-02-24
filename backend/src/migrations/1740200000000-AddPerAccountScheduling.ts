import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerAccountScheduling1740200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add per-account scheduling columns
    await queryRunner.query(
      `ALTER TABLE google_ads_accounts ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE google_ads_accounts ADD COLUMN IF NOT EXISTS schedule_days INTEGER[] DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE google_ads_accounts ADD COLUMN IF NOT EXISTS schedule_time VARCHAR(5) DEFAULT '07:00'`,
    );

    // Clean up obsolete global schedule settings (keep only schedule_email_recipients)
    await queryRunner.query(
      `DELETE FROM system_settings WHERE key IN ('schedule_enabled', 'schedule_cron', 'schedule_time', 'schedule_accounts_per_run', 'schedule_last_account_index')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE google_ads_accounts DROP COLUMN IF EXISTS schedule_time`,
    );
    await queryRunner.query(
      `ALTER TABLE google_ads_accounts DROP COLUMN IF EXISTS schedule_days`,
    );
    await queryRunner.query(
      `ALTER TABLE google_ads_accounts DROP COLUMN IF EXISTS schedule_enabled`,
    );
  }
}
