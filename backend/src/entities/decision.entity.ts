import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GoogleAdsAccount } from './google-ads-account.entity';
import { Audit } from './audit.entity';
import { User } from './user.entity';
import { ChangeSet } from './change-set.entity';

export enum DecisionStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  EXPORTED = 'exported',
  APPLIED = 'applied',
  ROLLED_BACK = 'rolled_back',
}

@Entity('decisions')
export class Decision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'audit_id', type: 'uuid', nullable: true })
  auditId: string;

  @ManyToOne(() => Audit, (audit) => audit.decisions, { nullable: true })
  @JoinColumn({ name: 'audit_id' })
  audit: Audit;

  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, { nullable: true })
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  // Versioning
  @Column({ name: 'decision_group_id', type: 'uuid' })
  decisionGroupId: string;

  @Column({ default: 1 })
  version: number;

  @Column({ name: 'is_current', default: true })
  isCurrent: boolean;

  @Column({ name: 'superseded_by', type: 'uuid', nullable: true })
  supersededBy: string | null;

  // Contenuto
  @Column({ name: 'module_id' })
  moduleId: number;

  @Column({ name: 'entity_type', length: 30 })
  entityType: string;

  @Column({ name: 'entity_id', length: 50 })
  entityId: string;

  @Column({ name: 'entity_name', length: 500, nullable: true })
  entityName: string;

  @Column({ name: 'action_type', length: 50 })
  actionType: string;

  @Column({ name: 'before_value', type: 'jsonb', nullable: true })
  beforeValue: Record<string, unknown>;

  @Column({ name: 'after_value', type: 'jsonb', nullable: true })
  afterValue: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  rationale: string;

  @Column({ type: 'jsonb', nullable: true })
  evidence: Record<string, unknown>;

  // Stato
  @Column({ type: 'varchar', length: 20, default: DecisionStatus.DRAFT })
  status: DecisionStatus;

  // Export
  @Column({ name: 'change_set_id', type: 'uuid', nullable: true })
  changeSetId: string | null;

  @ManyToOne(() => ChangeSet, (changeSet) => changeSet.decisions, { nullable: true })
  @JoinColumn({ name: 'change_set_id' })
  changeSet: ChangeSet;

  @Column({ name: 'exported_at', type: 'timestamptz', nullable: true })
  exportedAt: Date;

  @Column({ name: 'applied_at', type: 'timestamptz', nullable: true })
  appliedAt: Date;

  // Audit
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string;

  @ManyToOne(() => User, (user) => user.decisions, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
