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
  eventType!: string // 'PIN_FAILED', 'PIN_SUCCESS', 'ACCESS_DENIED', etc.

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId!: string | null

  @Column({ type: 'uuid', nullable: true, name: 'store_id' })
  storeId!: string | null

  @Column({ type: 'uuid', nullable: true, name: 'employment_id' })
  employmentId!: string | null

  @Column({ type: 'text', nullable: true })
  details!: string | null // JSON serialized with metadata

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress!: string | null

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  // Relations
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User

  @ManyToOne(() => Store, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store?: Store

  @ManyToOne(() => Employment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employmentId' })
  employment?: Employment
}
