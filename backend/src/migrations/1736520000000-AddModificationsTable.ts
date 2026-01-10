import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModificationsTable1736520000000 implements MigrationInterface {
  name = 'AddModificationsTable1736520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "modifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "entity_type" varchar(30) NOT NULL,
        "entity_id" varchar(50) NOT NULL,
        "entity_name" varchar(500),
        "modification_type" varchar(50) NOT NULL,
        "before_value" jsonb,
        "after_value" jsonb NOT NULL,
        "notes" text,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "rejection_reason" text,
        "applied_at" timestamptz,
        "result_message" text,
        "result_details" jsonb,
        "created_by" uuid,
        "approved_by" uuid,
        "approved_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_modifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_modifications_account" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_modifications_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_modifications_approved_by" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_modifications_account_id" ON "modifications" ("account_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_modifications_status" ON "modifications" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_modifications_account_status" ON "modifications" ("account_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_modifications_entity" ON "modifications" ("entity_type", "entity_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_modifications_entity"`);
    await queryRunner.query(`DROP INDEX "IDX_modifications_account_status"`);
    await queryRunner.query(`DROP INDEX "IDX_modifications_status"`);
    await queryRunner.query(`DROP INDEX "IDX_modifications_account_id"`);
    await queryRunner.query(`DROP TABLE "modifications"`);
  }
}
