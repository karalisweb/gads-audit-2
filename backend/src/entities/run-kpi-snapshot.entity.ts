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

@Entity('run_kpi_snapshots')
@Index(['accountId', 'snapshotDate'])
export class RunKpiSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  @Column({ name: 'import_run_id', type: 'uuid' })
  importRunId: string;

  // Performance metrics
  @Column({ type: 'float', default: 0 })
  cost: number;

  @Column({ type: 'float', default: 0 })
  conversions: number;

  @Column({ name: 'conversions_value', type: 'float', default: 0 })
  conversionsValue: number;

  @Column({ type: 'bigint', default: 0 })
  impressions: number;

  @Column({ type: 'bigint', default: 0 })
  clicks: number;

  @Column({ type: 'float', default: 0 })
  ctr: number;

  @Column({ type: 'float', default: 0 })
  cpa: number;

  @Column({ type: 'float', default: 0 })
  roas: number;

  // Quality
  @Column({ name: 'avg_quality_score', type: 'float', nullable: true })
  avgQualityScore: number | null;

  // Structure
  @Column({ name: 'active_campaigns', type: 'int', default: 0 })
  activeCampaigns: number;

  @Column({ name: 'health_score', type: 'int', nullable: true })
  healthScore: number | null;

  @Column({ name: 'snapshot_date', type: 'timestamptz' })
  snapshotDate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
