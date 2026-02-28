import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm'
import { Store } from './store.entity'
import { Supplier } from './supplier.entity'
import { User } from './user.entity'

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED'
}

@Entity('purchase_order')
@Index(['storeId', 'status', 'orderDate'])
@Index(['supplierId', 'status'])
@Index(['orderNumber'], { unique: true })
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  @Column({ type: 'uuid' })
  @Index()
  supplierId!: string

  @Column({ type: 'varchar', length: 50, unique: true })
  orderNumber!: string // Auto-generated: PO-2024-0001

  @Column({ type: 'date' })
  orderDate!: Date

  @Column({ type: 'date', nullable: true })
  expectedDeliveryDate?: Date

  @Column({ type: 'date', nullable: true })
  actualDeliveryDate?: Date

  @Column({
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.DRAFT
  })
  status!: PurchaseOrderStatus

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  taxAmount?: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  shippingCost?: number

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number

  @Column({ type: 'text', nullable: true })
  notes?: string

  @Column({ type: 'uuid' })
  createdBy!: string // User who created the order

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string // User who approved the order

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store!: Store

  @ManyToOne(() => Supplier, (supplier: any) => supplier.purchaseOrders, {
    onDelete: 'RESTRICT'
  })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdByUser?: User

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approvedBy' })
  approvedByUser?: User

  @OneToMany('purchase_order_item', (item: any) => item.purchaseOrder, {
    cascade: true
  })
  items?: any[]
}
