import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { Store } from './store.entity'
import { User } from './user.entity'

@Entity('subscription_payment')
export class SubscriptionPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', name: 'store_id' })
  @Index()
  storeId!: string

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'amount' })
  amount!: number

  @Column({ type: 'varchar', length: 3, default: 'USD', name: 'currency' })
  currency!: string

  @Column({ type: 'varchar', length: 50, name: 'payment_method' })
  paymentMethod!: 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'OTHER'

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'reference_number' })
  referenceNumber?: string

  @Column({ type: 'date', name: 'payment_date' })
  paymentDate!: Date

  @Column({ type: 'int', name: 'duration_months' })
  durationMonths!: number

  @Column({ type: 'date', name: 'period_start_date' })
  periodStartDate!: Date

  @Column({ type: 'date', name: 'period_end_date' })
  periodEndDate!: Date

  @Column({ type: 'uuid', name: 'recorded_by_user_id' })
  recordedByUserId!: string

  @Column({ type: 'text', nullable: true })
  notes?: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date

  // Relationships
  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recorded_by_user_id' })
  recordedBy!: User
}
