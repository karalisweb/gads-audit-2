import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduleFrequency1740300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE google_ads_accounts ADD COLUMN IF NOT EXISTS schedule_frequency VARCHAR(10) NOT NULL DEFAULT 'weekly'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE google_ads_accounts DROP COLUMN IF EXISTS schedule_frequency`,
    );
  }
}
