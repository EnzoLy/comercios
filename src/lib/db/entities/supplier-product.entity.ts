import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm'
import type { Supplier } from './supplier.entity'
import type { Product } from './product.entity'

@Entity('supplier_product')
@Unique(['supplierId', 'productId'])
@Index(['productId', 'isActive'])
@Index(['supplierId', 'isPreferred'])
export class SupplierProduct {
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

  @Column({ type: 'varchar', length: 100, nullable: true })
  supplierSku?: string // Supplier's SKU for this product

  @Column({ type: 'boolean', default: false })
  isPreferred!: boolean // Is this the preferred supplier for this product

  @Column({ type: 'date', nullable: true })
  lastPurchaseDate?: Date

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  lastPurchasePrice?: number

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'text', nullable: true })
  notes?: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne('supplier', (supplier: any) => supplier.supplierProducts, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier

  @ManyToOne('product', (product: any) => product.supplierProducts, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'productId' })
  product!: Product
}
