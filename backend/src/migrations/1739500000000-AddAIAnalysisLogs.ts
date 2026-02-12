import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddAIAnalysisLogs1739500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_analysis_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'account_id',
            type: 'uuid',
          },
          {
            name: 'triggered_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'trigger_type',
            type: 'varchar',
            length: '20',
            default: "'manual'",
          },
          {
            name: 'modules_analyzed',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'total_recommendations',
            type: 'int',
            default: 0,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'running'",
          },
          {
            name: 'started_at',
            type: 'timestamptz',
          },
          {
            name: 'completed_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'duration_ms',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'module_results',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['account_id'],
            referencedTableName: 'google_ads_accounts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['triggered_by_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'ai_analysis_logs',
      new TableIndex({
        name: 'IDX_ai_analysis_logs_account_started',
        columnNames: ['account_id', 'started_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_analysis_logs');
  }
}
