import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('import_chunks')
@Unique(['runId', 'datasetName', 'chunkIndex'])
export class ImportChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'run_id', length: 100 })
  runId: string;

  @Column({ name: 'dataset_name', length: 50 })
  datasetName: string;

  @Column({ name: 'chunk_index' })
  chunkIndex: number;

  @Column({ name: 'chunk_total', nullable: true })
  chunkTotal: number;

  @Column({ name: 'row_count', nullable: true })
  rowCount: number;

  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;
}
