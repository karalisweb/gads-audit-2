import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GoogleAdsAccount } from './google-ads-account.entity';
import { User } from './user.entity';

export enum ModificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  APPLIED = 'applied',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ModificationEntityType {
  CAMPAIGN = 'campaign',
  AD_GROUP = 'ad_group',
  AD = 'ad',
  KEYWORD = 'keyword',
  NEGATIVE_KEYWORD = 'negative_keyword',
  CONVERSION_ACTION = 'conversion_action',
}

export enum ModificationType {
  // Campaign modifications
  CAMPAIGN_BUDGET = 'campaign.budget',
  CAMPAIGN_STATUS = 'campaign.status',
  CAMPAIGN_TARGET_CPA = 'campaign.target_cpa',
  CAMPAIGN_TARGET_ROAS = 'campaign.target_roas',

  // Ad Group modifications
  AD_GROUP_STATUS = 'ad_group.status',
  AD_GROUP_CPC_BID = 'ad_group.cpc_bid',

  // Ad modifications
  AD_STATUS = 'ad.status',
  AD_HEADLINES = 'ad.headlines',
  AD_DESCRIPTIONS = 'ad.descriptions',
  AD_FINAL_URL = 'ad.final_url',

  // Keyword modifications
  KEYWORD_STATUS = 'keyword.status',
  KEYWORD_CPC_BID = 'keyword.cpc_bid',
  KEYWORD_FINAL_URL = 'keyword.final_url',

  // Negative keyword modifications
  NEGATIVE_KEYWORD_ADD = 'negative_keyword.add',
  NEGATIVE_KEYWORD_REMOVE = 'negative_keyword.remove',

  // Conversion action modifications
  CONVERSION_PRIMARY = 'conversion.primary',
  CONVERSION_DEFAULT_VALUE = 'conversion.default_value',
}

@Entity('modifications')
export class Modification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, { nullable: false })
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  // Target entity
  @Column({
    name: 'entity_type',
    type: 'varchar',
    length: 30,
  })
  entityType: ModificationEntityType;

  @Column({ name: 'entity_id', length: 50 })
  entityId: string;

  @Column({ name: 'entity_name', length: 500, nullable: true })
  entityName: string;

  // Modification details
  @Column({
    name: 'modification_type',
    type: 'varchar',
    length: 50,
  })
  modificationType: ModificationType;

  @Column({ name: 'before_value', type: 'jsonb', nullable: true })
  beforeValue: Record<string, unknown>;

  @Column({ name: 'after_value', type: 'jsonb' })
  afterValue: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Status
  @Column({
    type: 'varchar',
    length: 20,
    default: ModificationStatus.PENDING,
  })
  status: ModificationStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  // Result (populated by Google Ads script)
  @Column({ name: 'applied_at', type: 'timestamptz', nullable: true })
  appliedAt: Date;

  @Column({ name: 'result_message', type: 'text', nullable: true })
  resultMessage: string;

  @Column({ name: 'result_details', type: 'jsonb', nullable: true })
  resultDetails: Record<string, unknown>;

  // Audit trail
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedBy: User;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
