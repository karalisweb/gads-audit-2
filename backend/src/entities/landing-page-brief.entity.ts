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

export enum LandingPageBriefStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed',
}

@Entity('landing_page_briefs')
export class LandingPageBrief {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'source_url', length: 2048, nullable: true })
  sourceUrl: string;

  @Column({ name: 'primary_keyword', length: 500, nullable: true })
  primaryKeyword: string;

  @Column({ name: 'keyword_cluster', type: 'jsonb', nullable: true })
  keywordCluster: {
    keywordText: string;
    keywordId?: string;
    impressions?: number;
    clicks?: number;
    cost?: number;
    conversions?: number;
    qualityScore?: number;
    matchType?: string;
  }[];

  @Column({ name: 'scraped_content', type: 'jsonb', nullable: true })
  scrapedContent: {
    metaTitle?: string;
    metaDescription?: string;
    headings?: { level: number; text: string }[];
    paragraphs?: string[];
    images?: { src: string; alt: string }[];
    links?: { href: string; text: string; internal?: boolean }[];
    structureSummary?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  brief: {
    pagePurpose?: string;
    targetAudience?: string;
    metaTitle?: string;
    metaDescription?: string;
    sections?: {
      type: string;
      title: string;
      instructions: string;
      keyPoints: string[];
    }[];
    seoNotes?: string[];
    currentLpIssues?: string[];
  };

  @Column({
    type: 'enum',
    enum: LandingPageBriefStatus,
    default: LandingPageBriefStatus.DRAFT,
  })
  status: LandingPageBriefStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
