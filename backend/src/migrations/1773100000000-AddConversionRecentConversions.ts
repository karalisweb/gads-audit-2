import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aggiunge `recent_conversions` alle azioni di conversione: numero di conversioni
 * registrate negli ultimi 30 giorni (metrics.all_conversions). Serve a segnalare
 * le azioni "Inattive" (primaria ENABLED con 0 conversioni recenti = tracciamento
 * che non registra) — il vero problema che Google mostra come "Inattivo".
 *
 * Nullable: resta NULL finché non si ri-scarica con lo script aggiornato.
 */
export class AddConversionRecentConversions1773100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversion_actions"
      ADD COLUMN IF NOT EXISTS "recent_conversions" real
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversion_actions" DROP COLUMN IF EXISTS "recent_conversions"
    `);
  }
}
