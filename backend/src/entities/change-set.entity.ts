import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { GoogleAdsAccount } from './google-ads-account.entity';
import { Audit } from './audit.entity';
import { User } from './user.entity';
import { Decision } from './decision.entity';

export enum ChangeSetStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  EXPORTED = 'exported',
  APPLIED = 'applied',
}

@Entity('change_sets')
export class ChangeSet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'audit_id', type: 'uuid', nullable: true })
  auditId: string;

  @ManyToOne(() => Audit, (audit) => audit.changeSets, { nullable: true })
  @JoinColumn({ name: 'audit_id' })
  audit: Audit;

  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, { nullable: true })
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, default: ChangeSetStatus.DRAFT })
  status: ChangeSetStatus;

  @Column({ name: 'export_files', type: 'jsonb', nullable: true })
  exportFiles: Array<{ filename: string; rows: number }> | null;

  @Column({ name: 'export_hash', length: 64, nullable: true })
  exportHash: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ name: 'exported_at', type: 'timestamptz', nullable: true })
  exportedAt: Date;

  @OneToMany(() => Decision, (decision) => decision.changeSet)
  decisions: Decision[];
}
