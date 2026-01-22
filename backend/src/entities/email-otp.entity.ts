import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('email_otps')
@Index(['email', 'expiresAt'])
export class EmailOtp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  @Index()
  email: string;

  @Column({ name: 'code_hash', length: 255 })
  codeHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used', default: false })
  used: boolean;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date;

  @Column({ length: 20 })
  type: 'login' | 'password_reset';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
