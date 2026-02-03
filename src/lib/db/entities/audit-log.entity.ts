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

  @Column({ type: 'varchar', length: 100 })
  eventType: string // 'PIN_FAILED', 'PIN_SUCCESS', 'ACCESS_DENIED', etc.

  @Column({ type: 'uuid', nullable: true })
  userId?: string

  @Column({ type: 'uuid', nullable: true })
  storeId?: string

  @Column({ type: 'uuid', nullable: true })
  employmentId?: string

  @Column({ type: 'text', nullable: true })
  details?: string // JSON serialized with metadata

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string

  @Column({ type: 'text', nullable: true })
  userAgent?: string

  @CreateDateColumn()
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
