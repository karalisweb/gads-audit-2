import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GoogleAdsAccount } from './google-ads-account.entity';

@Entity('negative_keywords')
export class NegativeKeyword {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, (account) => account.negativeKeywords)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  @Column({ name: 'negative_keyword_id', length: 50, nullable: true })
  negativeKeywordId: string;

  @Column({ name: 'keyword_text', length: 500 })
  keywordText: string;

  @Column({ name: 'match_type', length: 20, nullable: true })
  matchType: string;

  @Column({ length: 20, nullable: true })
  level: string;

  @Column({ name: 'campaign_id', length: 50, nullable: true })
  campaignId: string;

  @Column({ name: 'campaign_name', length: 255, nullable: true })
  campaignName: string;

  @Column({ name: 'ad_group_id', length: 50, nullable: true })
  adGroupId: string;

  @Column({ name: 'ad_group_name', length: 255, nullable: true })
  adGroupName: string;

  @Column({ name: 'shared_set_id', length: 50, nullable: true })
  sharedSetId: string;

  @Column({ name: 'shared_set_name', length: 255, nullable: true })
  sharedSetName: string;

  @CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
  importedAt: Date;
}
