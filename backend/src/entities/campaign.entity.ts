import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { GoogleAdsAccount } from './google-ads-account.entity';

@Entity('campaigns')
@Unique(['accountId', 'runId', 'campaignId'])
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, (account) => account.campaigns)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  @Column({ name: 'campaign_id', length: 50 })
  campaignId: string;

  @Column({ name: 'campaign_name', length: 255, nullable: true })
  campaignName: string;

  @Column({ length: 20, nullable: true })
  status: string;

  @Column({ name: 'advertising_channel_type', length: 50, nullable: true })
  advertisingChannelType: string;

  @Column({ name: 'bidding_strategy_type', length: 50, nullable: true })
  biddingStrategyType: string;

  @Column({ name: 'target_cpa_micros', type: 'bigint', nullable: true })
  targetCpaMicros: string;

  @Column({ name: 'target_roas', type: 'decimal', precision: 10, scale: 4, nullable: true })
  targetRoas: string;

  @Column({ name: 'budget_micros', type: 'bigint', nullable: true })
  budgetMicros: string;

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

  @Column({ name: 'search_impression_share', type: 'decimal', precision: 6, scale: 4, nullable: true })
  searchImpressionShare: string;

  @Column({ name: 'search_impression_share_lost_rank', type: 'decimal', precision: 6, scale: 4, nullable: true })
  searchImpressionShareLostRank: string;

  @Column({ name: 'search_impression_share_lost_budget', type: 'decimal', precision: 6, scale: 4, nullable: true })
  searchImpressionShareLostBudget: string;

  @Column({ name: 'search_top_impression_share', type: 'decimal', precision: 6, scale: 4, nullable: true })
  searchTopImpressionShare: string;

  @Column({ name: 'search_absolute_top_impression_share', type: 'decimal', precision: 6, scale: 4, nullable: true })
  searchAbsoluteTopImpressionShare: string;

  @Column({ name: 'top_impression_percentage', type: 'decimal', precision: 6, scale: 4, nullable: true })
  topImpressionPercentage: string;

  @Column({ name: 'absolute_top_impression_percentage', type: 'decimal', precision: 6, scale: 4, nullable: true })
  absoluteTopImpressionPercentage: string;

  @Column({ name: 'phone_calls', default: 0 })
  phoneCalls: number;

  @Column({ name: 'phone_impressions', default: 0 })
  phoneImpressions: number;

  @Column({ name: 'message_chats', default: 0 })
  messageChats: number;

  @Column({ name: 'message_impressions', default: 0 })
  messageImpressions: number;

  @Column({ name: 'data_date_start', type: 'date', nullable: true })
  dataDateStart: Date;

  @Column({ name: 'data_date_end', type: 'date', nullable: true })
  dataDateEnd: Date;

  @CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
  importedAt: Date;
}
