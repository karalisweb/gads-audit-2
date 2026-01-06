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
import { User } from './user.entity';
import { Decision } from './decision.entity';
import { ChangeSet } from './change-set.entity';

export enum AuditStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

@Entity('audits')
export class Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => GoogleAdsAccount, (account) => account.audits)
  @JoinColumn({ name: 'account_id' })
  account: GoogleAdsAccount;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 20, default: AuditStatus.IN_PROGRESS })
  status: AuditStatus;

  @Column({ name: 'modules_completed', type: 'int', array: true, default: [] })
  modulesCompleted: number[];

  @Column({ name: 'current_module', default: 1 })
  currentModule: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string;

  @ManyToOne(() => User, (user) => user.audits, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => Decision, (decision) => decision.audit)
  decisions: Decision[];

  @OneToMany(() => ChangeSet, (changeSet) => changeSet.audit)
  changeSets: ChangeSet[];
}
