import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aggiunge `goal_biddable` alle azioni di conversione: rappresenta lo stato
 * Primario/Secondario a LIVELLO OBIETTIVO (customer_conversion_goal.biddable),
 * cioè se Google ottimizza/fa offerte verso quella conversione.
 *
 * Serve perché conversion_action.primary_for_goal (già importato) indica solo
 * il primario "dentro" l'obiettivo e da solo faceva concludere all'AI
 * "assenza di conversioni primarie" anche quando l'obiettivo è biddable.
 *
 * Nullable: le righe esistenti restano NULL finché non si ri-scarica con lo
 * script di download aggiornato.
 */
export class AddConversionGoalBiddable1773000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversion_actions"
      ADD COLUMN IF NOT EXISTS "goal_biddable" boolean
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversion_actions" DROP COLUMN IF EXISTS "goal_biddable"
    `);
  }
}
