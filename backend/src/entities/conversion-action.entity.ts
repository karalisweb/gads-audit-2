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

  // Livello OBIETTIVO (customer_conversion_goal.biddable): true = l'obiettivo è
  // primario, cioè Google ottimizza/fa offerte verso questa conversione.
  // È il vero segnale "Primario/Secondario" nel modello obiettivi di Google,
  // distinto da primaryForGoal (primario DENTRO l'obiettivo).
  @Column({ name: 'goal_biddable', nullable: true })
  goalBiddable: boolean;

  // Conversioni registrate negli ultimi 30 giorni (metrics.all_conversions).
  // Serve a rilevare le azioni "Inattive": primaria ENABLED con 0 conversioni
  // recenti = il tracciamento non sta registrando (problema reale dell'account).
  @Column({ name: 'recent_conversions', type: 'real', nullable: true })
  recentConversions: number;

  @Column({ name: 'campaigns_using_count', default: 0 })
  campaignsUsingCount: number;

  @CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
  importedAt: Date;
}
