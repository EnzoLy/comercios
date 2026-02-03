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
  id: string

  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  eventType: string // 'PIN_FAILED', 'PIN_SUCCESS', 'ACCESS_DENIED', etc.

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId?: string

  @Column({ type: 'uuid', nullable: true, name: 'store_id' })
  storeId?: string

  @Column({ type: 'uuid', nullable: true, name: 'employment_id' })
  employmentId?: string

  @Column({ type: 'text', nullable: true })
  details?: string // JSON serialized with metadata

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress?: string

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent?: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

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
