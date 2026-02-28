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
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

@Entity('sale')
@Index(['storeId', 'createdAt'])
@Index(['storeId', 'status'])
@Index(['storeId', 'cashierId'])
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
  @ManyToOne('store', 'sales', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store!: any

  @ManyToOne('user', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cashierId' })
  cashier!: any

  @OneToMany('sale_item', 'sale', { cascade: true })
  items!: any[]

  @OneToMany('stock_movement', 'sale')
  stockMovements!: any[]

  @OneToMany('sale_return', 'sale')
  returns!: any[]
}
