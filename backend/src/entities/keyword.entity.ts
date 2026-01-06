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

@Entity('keywords')
@Unique(['accountId', 'runId', 'keywordId'])
export class Keyword {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, (account) => account.keywords)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  @Column({ name: 'keyword_id', length: 50 })
  keywordId: string;

  @Column({ name: 'keyword_text', length: 500 })
  keywordText: string;

  @Column({ name: 'match_type', length: 20, nullable: true })
  matchType: string;

  @Column({ name: 'ad_group_id', length: 50 })
  adGroupId: string;

  @Column({ name: 'ad_group_name', length: 255, nullable: true })
  adGroupName: string;

  @Column({ name: 'campaign_id', length: 50 })
  campaignId: string;

  @Column({ name: 'campaign_name', length: 255, nullable: true })
  campaignName: string;

  @Column({ length: 20, nullable: true })
  status: string;

  @Column({ name: 'approval_status', length: 30, nullable: true })
  approvalStatus: string;

  @Column({ name: 'cpc_bid_micros', type: 'bigint', nullable: true })
  cpcBidMicros: string;

  @Column({ name: 'final_url', length: 2048, nullable: true })
  finalUrl: string;

  @Column({ name: 'quality_score', nullable: true })
  qualityScore: number;

  @Column({ name: 'creative_relevance', length: 20, nullable: true })
  creativeRelevance: string;

  @Column({ name: 'landing_page_experience', length: 20, nullable: true })
  landingPageExperience: string;

  @Column({ name: 'expected_ctr', length: 20, nullable: true })
  expectedCtr: string;

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

  @Column({ name: 'phone_calls', default: 0 })
  phoneCalls: number;

  @Column({ name: 'data_date_start', type: 'date', nullable: true })
  dataDateStart: Date;

  @Column({ name: 'data_date_end', type: 'date', nullable: true })
  dataDateEnd: Date;

  @CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
  importedAt: Date;
}
