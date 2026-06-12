import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aggiunge la colonna `kind` alle modifiche per distinguere le modifiche
 * concrete (applicabili via script: budget, stato, offerte, negative, URL...)
 * dalle raccomandazioni advisory/manuali (es. "migliora pertinenza annuncio").
 *
 * Backfill delle righe esistenti: sono raccomandazioni quelle prodotte dai rami
 * "advisory" del mapping AI, riconoscibili perche' il loro after_value contiene
 * una chiave `action` ma nessun payload eseguibile concreto.
 */
export class AddModificationKind1772900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "modifications"
      ADD COLUMN IF NOT EXISTS "kind" varchar(20) NOT NULL DEFAULT 'modification'
    `);

    // Azioni puramente advisory (non producono mai una modifica eseguibile)
    const advisoryActions = [
      'scale', 'restructure', 'merge', 'optimize', 'improve_ctr',
      'improve_conversion_rate', 'optimize_quality', 'improve_quality',
      'improve_quality_score', 'add_keyword_to_headline', 'restructure_ad_group',
      'optimize_landing_page', 'consolidate_urls',
      'add_call_extension', 'add_message_extension', 'optimize_schedule',
      'enable_tracking', 'check_tracking', 'optimize_for_calls',
      'optimize_for_leads', 'enable_consent_mode', 'verify_tags',
      'check_implementation', 'create_variant', 'exclude', 'set_bid_modifier',
      'add_schedule', 'remove', 'replace', 'add_new',
      'improve_relevance', 'improve_ad_relevance', 'add_negative',
    ];

    // Chiavi che identificano un payload eseguibile (=> modifica concreta)
    const executionKeys = [
      'budget', 'budgetMicros', 'cpcBid', 'cpcBidMicros', 'targetCpa',
      'targetRoas', 'finalUrl', 'status', 'headlines', 'descriptions',
      'biddingStrategy', 'removed', 'keyword', 'value', 'matchType',
    ];

    await queryRunner.query(
      `
      UPDATE "modifications"
      SET "kind" = 'recommendation'
      WHERE (
        ("after_value"->>'action') = ANY($1)
        OR (
          jsonb_exists("after_value", 'action')
          AND NOT jsonb_exists_any("after_value", $2)
        )
      )
    `,
      [advisoryActions, executionKeys],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "modifications" DROP COLUMN IF EXISTS "kind"
    `);
  }
}
