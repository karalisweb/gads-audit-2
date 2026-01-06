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

@Entity('assets')
@Unique(['accountId', 'runId', 'assetId'])
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, (account) => account.assets)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  @Column({ name: 'asset_id', length: 50 })
  assetId: string;

  @Column({ name: 'asset_type', length: 50, nullable: true })
  assetType: string;

  @Column({ name: 'asset_text', length: 255, nullable: true })
  assetText: string;

  @Column({ length: 255, nullable: true })
  description1: string;

  @Column({ length: 255, nullable: true })
  description2: string;

  @Column({ name: 'final_url', length: 2048, nullable: true })
  finalUrl: string;

  @Column({ name: 'phone_number', length: 30, nullable: true })
  phoneNumber: string;

  @Column({ length: 20, nullable: true })
  status: string;

  @Column({ name: 'performance_label', length: 20, nullable: true })
  performanceLabel: string;

  @Column({ length: 30, nullable: true })
  source: string;

  @Column({ name: 'linked_level', length: 20, nullable: true })
  linkedLevel: string;

  @Column({ name: 'campaign_id', length: 50, nullable: true })
  campaignId: string;

  @Column({ name: 'ad_group_id', length: 50, nullable: true })
  adGroupId: string;

  @Column({ type: 'bigint', default: 0 })
  impressions: string;

  @Column({ type: 'bigint', default: 0 })
  clicks: string;

  @Column({ name: 'cost_micros', type: 'bigint', default: 0 })
  costMicros: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  conversions: string;

  @Column({ type: 'decimal', precision: 8, scale: 4, default: 0 })
  ctr: string;

  @Column({ name: 'data_date_start', type: 'date', nullable: true })
  dataDateStart: Date;

  @Column({ name: 'data_date_end', type: 'date', nullable: true })
  dataDateEnd: Date;

  @CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
  importedAt: Date;
}
