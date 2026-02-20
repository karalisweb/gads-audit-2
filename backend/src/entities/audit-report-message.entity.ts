import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AuditReport } from './audit-report.entity';

@Entity('audit_report_messages')
@Index(['reportId', 'createdAt'])
export class AuditReportMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId: string;

  @ManyToOne(() => AuditReport, (report) => report.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report: AuditReport;

  @Column({ type: 'varchar', length: 10 })
  role: 'user' | 'assistant';

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
