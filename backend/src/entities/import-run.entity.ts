import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GoogleAdsAccount } from './google-ads-account.entity';

export enum ImportStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('import_runs')
export class ImportRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'run_id', unique: true, length: 100 })
  runId: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, (account) => account.importRuns)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ type: 'varchar', length: 20, default: ImportStatus.IN_PROGRESS })
  status: ImportStatus;

  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ name: 'datasets_expected', nullable: true })
  datasetsExpected: number;

  @Column({ name: 'datasets_received', default: 0 })
  datasetsReceived: number;

  @Column({ name: 'total_rows', default: 0 })
  totalRows: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}
