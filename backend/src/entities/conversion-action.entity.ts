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

@Entity('conversion_actions')
@Unique(['accountId', 'runId', 'conversionActionId'])
export class ConversionAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, (account) => account.conversionActions)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  @Column({ name: 'conversion_action_id', length: 50 })
  conversionActionId: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ length: 20, nullable: true })
  status: string;

  @Column({ length: 50, nullable: true })
  type: string;

  @Column({ length: 50, nullable: true })
  category: string;

  @Column({ length: 50, nullable: true })
  origin: string;

  @Column({ name: 'counting_type', length: 30, nullable: true })
  countingType: string;

  @Column({ name: 'default_value', type: 'decimal', precision: 12, scale: 2, nullable: true })
  defaultValue: string;

  @Column({ name: 'always_use_default_value', nullable: true })
  alwaysUseDefaultValue: boolean;

  @Column({ name: 'primary_for_goal', nullable: true })
  primaryForGoal: boolean;

  @Column({ name: 'campaigns_using_count', default: 0 })
  campaignsUsingCount: number;

  @CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
  importedAt: Date;
}
