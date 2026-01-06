import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type IssueCategory =
  | 'performance'
  | 'quality'
  | 'structure'
  | 'budget'
  | 'targeting'
  | 'conversion'
  | 'opportunity';
export type IssueStatus = 'open' | 'acknowledged' | 'resolved' | 'ignored';

@Entity('audit_issues')
@Index(['accountId', 'runId'])
@Index(['accountId', 'severity'])
@Index(['accountId', 'category'])
export class AuditIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  accountId: string;

  @Column('uuid')
  runId: string;

  // Issue identification
  @Column({ length: 100 })
  ruleId: string;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  severity: IssueSeverity;

  @Column({
    type: 'varchar',
    length: 30,
  })
  category: IssueCategory;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'open',
  })
  status: IssueStatus;

  // Affected entity reference
  @Column({ type: 'varchar', length: 50, nullable: true })
  entityType: string | null; // campaign, adGroup, keyword, ad, searchTerm, asset

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entityName: string | null;

  // Impact metrics
  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  potentialSavings: number | null; // In account currency

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  potentialGain: number | null; // In account currency

  @Column('int', { nullable: true })
  affectedImpressions: number | null;

  @Column('int', { nullable: true })
  affectedClicks: number | null;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  affectedCost: number | null;

  // Recommendation
  @Column('text', { nullable: true })
  recommendation: string | null;

  @Column('text', { nullable: true })
  actionSteps: string | null; // JSON array of steps

  // Additional context
  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;
}
