import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiProviderToReports1772800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_reports"
      ADD COLUMN IF NOT EXISTS "ai_provider" varchar(20) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "ai_model" varchar(50) DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_reports"
      DROP COLUMN IF EXISTS "ai_provider",
      DROP COLUMN IF EXISTS "ai_model"
    `);
  }
}
