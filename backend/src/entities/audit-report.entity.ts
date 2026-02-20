import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { GoogleAdsAccount } from './google-ads-account.entity';
import { AuditReportMessage } from './audit-report-message.entity';

export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('audit_reports')
@Index(['accountId', 'generatedAt'])
export class AuditReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: ReportStatus.GENERATING,
  })
  status: ReportStatus;

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt: Date;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => AuditReportMessage, (msg) => msg.report)
  messages: AuditReportMessage[];
}
