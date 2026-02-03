import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'
import { Store } from './store.entity'
import { Employment } from './employment.entity'

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  event_type!: string

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  user_id!: string | null

  @Column({ type: 'uuid', nullable: true, name: 'store_id' })
  store_id!: string | null

  @Column({ type: 'uuid', nullable: true, name: 'employment_id' })
  employment_id!: string | null

  @Column({ type: 'text', nullable: true })
  details!: string | null

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ip_address!: string | null

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  user_agent!: string | null

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date

  // Relations
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User

  @ManyToOne(() => Store, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store?: Store

  @ManyToOne(() => Employment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employment_id' })
  employment?: Employment
}
