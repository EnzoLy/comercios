import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm'

export enum RefundMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  QR = 'QR',
  STORE_CREDIT = 'STORE_CREDIT',
}

@Entity('sale_return')
export class SaleReturn {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', name: 'sale_id' })
  @Index()
  saleId!: string

  @Column({ type: 'uuid', name: 'store_id' })
  @Index()
  storeId!: string

  @Column({ type: 'uuid', name: 'processed_by_id' })
  processedById!: string

  @Column({ type: 'varchar', length: 20, name: 'refund_method' })
  refundMethod!: RefundMethod

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'refund_amount' })
  refundAmount!: number

  @Column({ type: 'text', nullable: true })
  notes!: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  // Relationships
  @OneToMany('sale_return_item', (item: any) => item.saleReturn, { cascade: true })
  items!: any[]

  @ManyToOne('sale', (sale: any) => sale.returns, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sale_id' })
  sale!: any
}
