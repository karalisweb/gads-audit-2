import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { GoogleAdsAccount } from './google-ads-account.entity';

@Entity('daily_metrics')
@Unique('UQ_daily_metrics_composite', ['accountId', 'runId', 'entityType', 'entityId', 'date'])
@Index('IDX_daily_metrics_account_date', ['accountId', 'date'])
@Index('IDX_daily_metrics_account_type_date', ['accountId', 'entityType', 'date'])
export class DailyMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  // campaign, ad_group, keyword, ad, search_term
  @Column({ name: 'entity_type', length: 30 })
  entityType: string;

  @Column({ name: 'entity_id', length: 50 })
  entityId: string;

  @Column({ name: 'entity_name', length: 500, nullable: true })
  entityName: string;

  @Column({ name: 'campaign_id', length: 50, nullable: true })
  campaignId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'bigint', default: 0 })
  impressions: string;

  @Column({ type: 'bigint', default: 0 })
  clicks: string;

  @Column({ name: 'cost_micros', type: 'bigint', default: 0 })
  costMicros: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  conversions: string;

  @Column({ name: 'conversions_value', type: 'decimal', precision: 14, scale: 2, default: 0 })
  conversionsValue: string;

  @Column({ type: 'decimal', precision: 8, scale: 4, default: 0 })
  ctr: string;

  @Column({ name: 'average_cpc_micros', type: 'bigint', default: 0 })
  averageCpcMicros: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
