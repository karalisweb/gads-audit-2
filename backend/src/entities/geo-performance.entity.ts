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

@Entity('geo_performance')
@Unique(['accountId', 'runId', 'campaignId', 'locationId'])
export class GeoPerformance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, (account) => account.geoPerformances)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  @Column({ name: 'campaign_id', length: 50 })
  campaignId: string;

  @Column({ name: 'campaign_name', length: 255, nullable: true })
  campaignName: string;

  @Column({ name: 'location_id', length: 50, nullable: true })
  locationId: string;

  @Column({ name: 'location_name', length: 255, nullable: true })
  locationName: string;

  @Column({ name: 'location_type', length: 50, nullable: true })
  locationType: string;

  @Column({ name: 'is_targeted', nullable: true })
  isTargeted: boolean;

  @Column({ name: 'bid_modifier', type: 'decimal', precision: 6, scale: 4, nullable: true })
  bidModifier: string;

  @Column({ type: 'bigint', default: 0 })
  impressions: string;

  @Column({ type: 'bigint', default: 0 })
  clicks: string;

  @Column({ name: 'cost_micros', type: 'bigint', default: 0 })
  costMicros: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  conversions: string;

  @Column({ name: 'data_date_start', type: 'date', nullable: true })
  dataDateStart: Date;

  @Column({ name: 'data_date_end', type: 'date', nullable: true })
  dataDateEnd: Date;

  @CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
  importedAt: Date;
}
