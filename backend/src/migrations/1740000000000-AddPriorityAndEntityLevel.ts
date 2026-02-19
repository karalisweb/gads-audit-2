import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriorityAndEntityLevel1740000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add priority column
    await queryRunner.query(
      `ALTER TABLE modifications ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT NULL`,
    );

    // Add entity_level column
    await queryRunner.query(
      `ALTER TABLE modifications ADD COLUMN IF NOT EXISTS entity_level SMALLINT DEFAULT NULL`,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_modifications_priority ON modifications(priority)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_modifications_entity_level ON modifications(entity_level)`,
    );

    // Backfill priority from notes field
    await queryRunner.query(
      `UPDATE modifications SET priority = 'high' WHERE notes LIKE '%[AI - Priorita: high]%' AND priority IS NULL`,
    );
    await queryRunner.query(
      `UPDATE modifications SET priority = 'medium' WHERE notes LIKE '%[AI - Priorita: medium]%' AND priority IS NULL`,
    );
    await queryRunner.query(
      `UPDATE modifications SET priority = 'low' WHERE notes LIKE '%[AI - Priorita: low]%' AND priority IS NULL`,
    );

    // Backfill entity_level from entity_type
    await queryRunner.query(`
      UPDATE modifications SET entity_level = CASE
        WHEN entity_type = 'campaign' THEN 1
        WHEN entity_type = 'ad_group' THEN 2
        WHEN entity_type = 'ad' THEN 3
        WHEN entity_type = 'keyword' THEN 4
        WHEN entity_type = 'negative_keyword' THEN 5
        WHEN entity_type = 'conversion_action' THEN 6
        ELSE NULL
      END
      WHERE entity_level IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_modifications_entity_level`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_modifications_priority`);
    await queryRunner.query(
      `ALTER TABLE modifications DROP COLUMN IF EXISTS entity_level`,
    );
    await queryRunner.query(
      `ALTER TABLE modifications DROP COLUMN IF EXISTS priority`,
    );
  }
}
