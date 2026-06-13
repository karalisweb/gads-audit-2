import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabella conversion_action_metrics: conversioni per ENTITÀ × CANALE (azione di
 * conversione) negli ultimi 30gg. Permette il breakdown "quale keyword/campagna
 * porta quale canale" (chiamata / WhatsApp / mail / form).
 */
export class AddConversionActionMetrics1773200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversion_action_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_id" uuid NOT NULL,
        "run_id" varchar(100) NOT NULL,
        "entity_type" varchar(20) NOT NULL,
        "entity_id" varchar(50) NOT NULL,
        "entity_name" varchar(512) NOT NULL DEFAULT '',
        "conversion_action_name" varchar(255) NOT NULL,
        "conversions" real NOT NULL DEFAULT 0,
        "imported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversion_action_metrics" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_conversion_action_metrics" UNIQUE ("account_id", "run_id", "entity_type", "entity_id", "conversion_action_name")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_conversion_action_metrics_lookup"
      ON "conversion_action_metrics" ("account_id", "run_id", "entity_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "conversion_action_metrics"`);
  }
}
