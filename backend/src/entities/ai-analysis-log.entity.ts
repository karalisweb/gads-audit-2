import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GoogleAdsAccount } from './google-ads-account.entity';
import { User } from './user.entity';

export enum AnalysisTriggerType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
}

export enum AnalysisStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('ai_analysis_logs')
@Index(['accountId', 'startedAt'])
export class AIAnalysisLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ name: 'triggered_by_id', type: 'uuid', nullable: true })
  triggeredById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'triggered_by_id' })
  triggeredBy: User;

  @Column({
    name: 'trigger_type',
    type: 'varchar',
    length: 20,
    default: AnalysisTriggerType.MANUAL,
  })
  triggerType: AnalysisTriggerType;

  @Column({ name: 'modules_analyzed', type: 'simple-array', nullable: true })
  modulesAnalyzed: number[];

  @Column({ name: 'total_recommendations', type: 'int', default: 0 })
  totalRecommendations: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: AnalysisStatus.RUNNING,
  })
  status: AnalysisStatus;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'module_results', type: 'jsonb', nullable: true })
  moduleResults: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
