import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import type { Employment } from './employment.entity'
import type { User } from './user.entity'

@Entity('employment_access_token')
@Index(['token'], { unique: true })
@Index(['employmentId'])
@Index(['expiresAt'])
export class EmploymentAccessToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 64, unique: true })
  @Index()
  token!: string // Generated with crypto.randomBytes(32).toString('hex')

  @Column({ name: 'employment_id', type: 'uuid' })
  @Index()
  employmentId!: string

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string // Admin/Manager that generated the token

  @Column({ name: 'expires_at', type: 'timestamp' })
  @Index()
  expiresAt!: Date

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt!: Date | null // To track usage

  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  isRevoked!: boolean

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null

  @Column({ name: 'allow_multiple_uses', type: 'boolean', default: false })
  allowMultipleUses!: boolean // If false, can only be used once

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  // Relationships
  @ManyToOne('employment', (employment: any) => employment.accessTokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employment_id' })
  employment!: any

  @ManyToOne('user', (user: any) => user.createdAccessTokens, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_by' })
  creator!: any
}
