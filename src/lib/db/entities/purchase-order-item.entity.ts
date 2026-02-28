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

@Entity('purchase_order_item')
@Index(['purchaseOrderId', 'productId'])
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  purchaseOrderId!: string

  @Column({ type: 'uuid' })
  @Index()
  productId!: string

  @Column({ type: 'int' })
  quantityOrdered!: number

  @Column({ type: 'int', default: 0 })
  quantityReceived!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercentage!: number

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  taxRate?: number

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalPrice!: number // Calculated: (quantity * unitPrice * (1 - discount/100))

  @Column({ type: 'text', nullable: true })
  notes?: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne('purchase_order', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder!: any

  @ManyToOne('product', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product!: any
}
