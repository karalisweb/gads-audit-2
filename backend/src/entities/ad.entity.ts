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

@Entity('ads')
@Unique(['accountId', 'runId', 'adId'])
export class Ad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, (account) => account.ads)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  @Column({ name: 'ad_id', length: 50 })
  adId: string;

  @Column({ name: 'ad_group_id', length: 50 })
  adGroupId: string;

  @Column({ name: 'ad_group_name', length: 255, nullable: true })
  adGroupName: string;

  @Column({ name: 'campaign_id', length: 50 })
  campaignId: string;

  @Column({ name: 'campaign_name', length: 255, nullable: true })
  campaignName: string;

  @Column({ name: 'ad_type', length: 50, nullable: true })
  adType: string;

  @Column({ length: 20, nullable: true })
  status: string;

  @Column({ name: 'approval_status', length: 30, nullable: true })
  approvalStatus: string;

  @Column({ name: 'ad_strength', length: 20, nullable: true })
  adStrength: string;

  @Column({ type: 'jsonb', nullable: true })
  headlines: { text: string; pinnedField?: string }[];

  @Column({ type: 'jsonb', nullable: true })
  descriptions: { text: string; pinnedField?: string }[];

  @Column({ name: 'final_urls', type: 'jsonb', nullable: true })
  finalUrls: string[];

  @Column({ length: 50, nullable: true })
  path1: string;

  @Column({ length: 50, nullable: true })
  path2: string;

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

  @Column({ name: 'phone_calls', default: 0 })
  phoneCalls: number;

  @Column({ name: 'message_chats', default: 0 })
  messageChats: number;

  @Column({ name: 'data_date_start', type: 'date', nullable: true })
  dataDateStart: Date;

  @Column({ name: 'data_date_end', type: 'date', nullable: true })
  dataDateEnd: Date;

  @CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
  importedAt: Date;
}
