import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GoogleAdsAccount } from './google-ads-account.entity';

@Entity('search_terms')
export class SearchTerm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, (account) => account.searchTerms)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  @Column({ name: 'search_term', length: 500 })
  searchTerm: string;

  @Column({ name: 'keyword_id', length: 50, nullable: true })
  keywordId: string;

  @Column({ name: 'keyword_text', length: 500, nullable: true })
  keywordText: string;

  @Column({ name: 'match_type_triggered', length: 20, nullable: true })
  matchTypeTriggered: string;

  @Column({ name: 'ad_group_id', length: 50 })
  adGroupId: string;

  @Column({ name: 'ad_group_name', length: 255, nullable: true })
  adGroupName: string;

  @Column({ name: 'campaign_id', length: 50 })
  campaignId: string;

  @Column({ name: 'campaign_name', length: 255, nullable: true })
  campaignName: string;

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

  @Column({ name: 'data_date_start', type: 'date', nullable: true })
  dataDateStart: Date;

  @Column({ name: 'data_date_end', type: 'date', nullable: true })
  dataDateEnd: Date;

  @CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
  importedAt: Date;
}
