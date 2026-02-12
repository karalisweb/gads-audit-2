import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddRunKpiSnapshots1739400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'run_kpi_snapshots',
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
            name: 'run_id',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'import_run_id',
            type: 'uuid',
          },
          {
            name: 'cost',
            type: 'float',
            default: 0,
          },
          {
            name: 'conversions',
            type: 'float',
            default: 0,
          },
          {
            name: 'conversions_value',
            type: 'float',
            default: 0,
          },
          {
            name: 'impressions',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'clicks',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'ctr',
            type: 'float',
            default: 0,
          },
          {
            name: 'cpa',
            type: 'float',
            default: 0,
          },
          {
            name: 'roas',
            type: 'float',
            default: 0,
          },
          {
            name: 'avg_quality_score',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'active_campaigns',
            type: 'int',
            default: 0,
          },
          {
            name: 'health_score',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'snapshot_date',
            type: 'timestamptz',
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
      'run_kpi_snapshots',
      new TableIndex({
        name: 'IDX_run_kpi_snapshots_account_date',
        columnNames: ['account_id', 'snapshot_date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('run_kpi_snapshots');
  }
}
