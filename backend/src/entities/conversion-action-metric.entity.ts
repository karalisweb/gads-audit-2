import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Conversioni segmentate per ENTITÀ × CANALE (azione di conversione), ultimi 30gg.
 * Es: keyword "taxi elmas" → click_phone 0.5, click_whatsapp 0.67.
 * Permette di vedere quale keyword/campagna porta quale canale.
 */
@Entity('conversion_action_metrics')
@Unique(['accountId', 'runId', 'entityType', 'entityId', 'conversionActionName'])
@Index(['accountId', 'runId', 'entityType'])
export class ConversionActionMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  // 'campaign' | 'ad_group' | 'keyword'
  @Column({ name: 'entity_type', length: 20 })
  entityType: string;

  @Column({ name: 'entity_id', length: 50 })
  entityId: string;

  // Nome leggibile dell'entità (testo keyword, nome campagna, nome ad group)
  @Column({ name: 'entity_name', length: 512, default: '' })
  entityName: string;

  // Nome dell'azione di conversione (= canale): click_phone, click_whatsapp, "Calls from ads", ...
  @Column({ name: 'conversion_action_name', length: 255 })
  conversionActionName: string;

  @Column({ name: 'conversions', type: 'real', default: 0 })
  conversions: number;

  @CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
  importedAt: Date;
}
