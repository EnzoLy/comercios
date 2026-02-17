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
import { User } from './user.entity'
import type { SaleItem } from './sale-item.entity'
import type { StockMovement } from './stock-movement.entity'

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  QR = 'QR',
}

export enum SaleStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

@Entity('sale')
@Index(['storeId', 'createdAt'])
@Index(['storeId', 'status'])
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  @Column({ type: 'uuid' })
  cashierId!: string

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod!: PaymentMethod

  @Column({
    type: 'enum',
    enum: SaleStatus,
    default: SaleStatus.PENDING,
  })
  status!: SaleStatus

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amountPaid?: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'change' })
  change?: number

  @Column({ type: 'text', nullable: true })
  notes?: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerName?: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerEmail?: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  customerPhone?: string

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne(() => Store, (store: any) => store.sales, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store!: any

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cashierId' })
  cashier!: any

  @OneToMany('sale_item', (saleItem: any) => saleItem.sale, { cascade: true })
  items!: any[]

  @OneToMany('stock_movement', (movement: any) => movement.sale)
  stockMovements!: any[]
}
