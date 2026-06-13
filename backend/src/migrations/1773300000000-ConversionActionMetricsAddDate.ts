import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aggiunge la colonna `date` a conversion_action_metrics per rendere il
 * breakdown "conversioni per canale" filtrabile per periodo (come daily_metrics).
 * La tabella è appena nata (solo dati a 30gg aggregati): la svuotiamo e i dati
 * verranno ricaricati per-giorno dallo script download v3.8.
 */
export class ConversionActionMetricsAddDate1773300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // I dati esistenti sono aggregati a 30gg senza giorno: non riutilizzabili.
    await queryRunner.query(`TRUNCATE TABLE "conversion_action_metrics"`);

    await queryRunner.query(
      `ALTER TABLE "conversion_action_metrics" DROP CONSTRAINT IF EXISTS "UQ_conversion_action_metrics"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversion_action_metrics" ADD COLUMN IF NOT EXISTS "date" date NOT NULL DEFAULT CURRENT_DATE`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversion_action_metrics" ALTER COLUMN "date" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversion_action_metrics" ADD CONSTRAINT "UQ_conversion_action_metrics" UNIQUE ("account_id", "run_id", "entity_type", "entity_id", "conversion_action_name", "date")`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_conversion_action_metrics_lookup"`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_conversion_action_metrics_date" ON "conversion_action_metrics" ("account_id", "entity_type", "date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_conversion_action_metrics_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversion_action_metrics" DROP CONSTRAINT IF EXISTS "UQ_conversion_action_metrics"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversion_action_metrics" DROP COLUMN IF EXISTS "date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversion_action_metrics" ADD CONSTRAINT "UQ_conversion_action_metrics" UNIQUE ("account_id", "run_id", "entity_type", "entity_id", "conversion_action_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_conversion_action_metrics_lookup" ON "conversion_action_metrics" ("account_id", "run_id", "entity_type")`,
    );
  }
}
