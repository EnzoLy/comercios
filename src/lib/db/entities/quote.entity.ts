import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm'
import { Store } from './store.entity'

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

@Entity('quote')
@Index(['storeId', 'status'])
@Index(['storeId', 'createdAt'])
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid', { name: 'store_id' })
  storeId: string

  @Column('varchar', { length: 50, name: 'quote_number' })
  quoteNumber: string

  @Column('varchar', { length: 255, name: 'client_name' })
  clientName: string

  @Column('varchar', { length: 50, name: 'client_phone', nullable: true })
  clientPhone: string | null

  @Column('varchar', { length: 255, name: 'client_email', nullable: true })
  clientEmail: string | null

  @Column('enum', {
    enum: QuoteStatus,
    default: QuoteStatus.DRAFT,
  })
  status: QuoteStatus

  @Column('text', { nullable: true })
  notes: string | null

  @Column('timestamp', { name: 'expires_at', nullable: true })
  expiresAt: Date | null

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  tax: number

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount: number

  @Column('decimal', { precision: 10, scale: 2 })
  total: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column('varchar', { length: 255, name: 'access_token', unique: true })
  accessToken: string

  @Column('int', { name: 'view_count', default: 0 })
  viewCount: number

  @Column('timestamp', { name: 'last_viewed_at', nullable: true })
  lastViewedAt: Date | null

  // Relationships
  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store

  @OneToMany('QuoteItem', (item: any) => item.quote, { cascade: true })
  items: any[]
}
