import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ImportRun } from './import-run.entity';
import { Campaign } from './campaign.entity';
import { AdGroup } from './ad-group.entity';
import { Ad } from './ad.entity';
import { Keyword } from './keyword.entity';
import { SearchTerm } from './search-term.entity';
import { NegativeKeyword } from './negative-keyword.entity';
import { Asset } from './asset.entity';
import { ConversionAction } from './conversion-action.entity';
import { GeoPerformance } from './geo-performance.entity';
import { DevicePerformance } from './device-performance.entity';
import { Audit } from './audit.entity';

@Entity('google_ads_accounts')
export class GoogleAdsAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id', unique: true, length: 20 })
  customerId: string;

  @Column({ name: 'customer_name', length: 255, nullable: true })
  customerName: string;

  @Column({ name: 'currency_code', length: 3, default: 'EUR' })
  currencyCode: string;

  @Column({ name: 'time_zone', length: 50, default: 'Europe/Rome' })
  timeZone: string;

  @Column({ name: 'shared_secret', length: 64 })
  sharedSecret: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'schedule_enabled', default: false })
  scheduleEnabled: boolean;

  @Column({ name: 'schedule_days', type: 'int', array: true, default: '{}' })
  scheduleDays: number[];

  @Column({ name: 'schedule_time', length: 5, default: '07:00' })
  scheduleTime: string;

  @Column({ name: 'schedule_frequency', length: 10, default: 'weekly' })
  scheduleFrequency: string; // 'weekly' | 'biweekly' | 'monthly'

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToMany(() => User, (user) => user.accounts)
  users: User[];

  @OneToMany(() => ImportRun, (importRun) => importRun.account)
  importRuns: ImportRun[];

  @OneToMany(() => Campaign, (campaign) => campaign.account)
  campaigns: Campaign[];

  @OneToMany(() => AdGroup, (adGroup) => adGroup.account)
  adGroups: AdGroup[];

  @OneToMany(() => Ad, (ad) => ad.account)
  ads: Ad[];

  @OneToMany(() => Keyword, (keyword) => keyword.account)
  keywords: Keyword[];

  @OneToMany(() => SearchTerm, (searchTerm) => searchTerm.account)
  searchTerms: SearchTerm[];

  @OneToMany(() => NegativeKeyword, (negativeKeyword) => negativeKeyword.account)
  negativeKeywords: NegativeKeyword[];

  @OneToMany(() => Asset, (asset) => asset.account)
  assets: Asset[];

  @OneToMany(() => ConversionAction, (conversionAction) => conversionAction.account)
  conversionActions: ConversionAction[];

  @OneToMany(() => GeoPerformance, (geoPerformance) => geoPerformance.account)
  geoPerformances: GeoPerformance[];

  @OneToMany(() => DevicePerformance, (devicePerformance) => devicePerformance.account)
  devicePerformances: DevicePerformance[];

  @OneToMany(() => Audit, (audit) => audit.account)
  audits: Audit[];
}
