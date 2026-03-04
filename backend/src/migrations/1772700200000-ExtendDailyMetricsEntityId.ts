import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendDailyMetricsEntityId1772700200000 implements MigrationInterface {
  name = 'ExtendDailyMetricsEntityId1772700200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Search terms can exceed 50 chars, extend entity_id to 255
    await queryRunner.query(`ALTER TABLE "daily_metrics" ALTER COLUMN "entity_id" TYPE character varying(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "daily_metrics" ALTER COLUMN "entity_id" TYPE character varying(50)`);
  }
}
