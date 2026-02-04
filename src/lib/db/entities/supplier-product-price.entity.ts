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
import { Supplier } from './supplier.entity'
import { Product } from './product.entity'

@Entity('supplier_product_price')
@Index(['supplierId', 'productId', 'effectiveDate'])
@Index(['productId', 'endDate'])
@Index(['supplierId', 'productId', 'endDate'])
export class SupplierProductPrice {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  supplierId!: string

  @Column({ type: 'uuid' })
  @Index()
  productId!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string // ISO 4217

  @Column({ type: 'date' })
  effectiveDate!: Date // When this price started

  @Column({ type: 'date', nullable: true })
  endDate?: Date // When this price ended, null = current price

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string // Supplier's SKU for this product

  @Column({ type: 'int', nullable: true })
  minimumOrderQuantity?: number

  @Column({ type: 'int', nullable: true })
  packSize?: number // Units per pack

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string // User who created this price record

  @Column({ type: 'boolean', default: false })
  hasAlert!: boolean // Flag for price increase alerts

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  changePercentage?: number // Percentage change from previous price

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: Product
}
