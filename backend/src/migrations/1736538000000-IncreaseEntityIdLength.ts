import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseEntityIdLength1736538000000 implements MigrationInterface {
  name = 'IncreaseEntityIdLength1736538000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Increase entity_id length from 50 to 100 characters
    await queryRunner.query(`
      ALTER TABLE "modifications"
      ALTER COLUMN "entity_id" TYPE varchar(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "modifications"
      ALTER COLUMN "entity_id" TYPE varchar(50)
    `);
  }
}
