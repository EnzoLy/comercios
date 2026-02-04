import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { Sale } from './sale.entity'
import { Product } from './product.entity'

@Entity('sale_item')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  saleId!: string

  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'varchar', length: 255 })
  productName!: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  productSku?: string

  @Column({ type: 'int' })
  quantity!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total!: number

  // Tax information
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount!: number

  @CreateDateColumn()
  createdAt!: Date

  // Relationships
  @ManyToOne(() => Sale, (sale: any) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saleId' })
  sale!: any

  @ManyToOne(() => Product, (product: any) => product.saleItems, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product!: any
}
