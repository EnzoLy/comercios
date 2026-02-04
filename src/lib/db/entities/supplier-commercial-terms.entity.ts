import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm'
import type { Supplier } from './supplier.entity'

@Entity('supplier_commercial_terms')
export class SupplierCommercialTerms {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', unique: true })
  @Index()
  supplierId!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  // Payment Terms
  @Column({ type: 'int', nullable: true })
  paymentTermsDays?: number // 30, 60, 90

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentMethod?: string // 'TRANSFER', 'CHECK', 'CASH', 'CREDIT_CARD'

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  earlyPaymentDiscount?: number // Discount percentage for early payment

  @Column({ type: 'int', nullable: true })
  earlyPaymentDays?: number // Days for early payment discount

  // Purchase Conditions
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minimumPurchaseAmount?: number

  @Column({ type: 'int', nullable: true })
  minimumPurchaseQuantity?: number

  // Delivery
  @Column({ type: 'int', nullable: true })
  leadTimeDays?: number // Lead time in days

  @Column({ type: 'varchar', length: 50, nullable: true })
  deliveryFrequency?: string // 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'

  // Financial
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string // ISO 4217

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  creditLimit?: number

  @Column({ type: 'text', nullable: true })
  notes?: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @OneToOne('Supplier', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier

  @OneToMany('SupplierVolumeDiscount', (discount: any) => discount.commercialTerms)
  volumeDiscounts?: any[]
}
