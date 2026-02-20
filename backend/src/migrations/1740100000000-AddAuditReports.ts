import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddAuditReports1740100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_reports',
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
            name: 'content',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'generating'",
          },
          {
            name: 'generated_at',
            type: 'timestamptz',
          },
          {
            name: 'duration_ms',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'metadata',
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
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'audit_reports',
      new TableIndex({
        name: 'IDX_audit_reports_account_generated',
        columnNames: ['account_id', 'generated_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'audit_report_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'report_id',
            type: 'uuid',
          },
          {
            name: 'role',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['report_id'],
            referencedTableName: 'audit_reports',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'audit_report_messages',
      new TableIndex({
        name: 'IDX_audit_report_messages_report_created',
        columnNames: ['report_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_report_messages');
    await queryRunner.dropTable('audit_reports');
  }
}
