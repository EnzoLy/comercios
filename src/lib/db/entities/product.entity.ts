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
  Unique,
} from 'typeorm'
import { Store } from './store.entity'
import { Category } from './category.entity'
import { Supplier } from './supplier.entity'
import type { StockMovement } from './stock-movement.entity'
import type { SaleItem } from './sale-item.entity'
import type { ProductBarcode } from './product-barcode.entity'
import type { SupplierProduct } from './supplier-product.entity'

@Entity('product')
@Unique(['storeId', 'sku'])
@Index(['storeId', 'barcode'])
@Index(['storeId', 'sku'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({ type: 'varchar', length: 100, unique: false })
  sku!: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode?: string

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string

  @Column({ type: 'uuid', nullable: true })
  supplierId?: string // Deprecated: primary supplier, use supplierProducts for multi-supplier support

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  costPrice!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  sellingPrice!: number

  @Column({ type: 'int', default: 0 })
  currentStock!: number

  /**
   * Indica si este es un producto que se vende por peso (frutas, verduras, carnes, etc.)
   * Los productos por peso usan códigos de barras especiales (prefijos 20-29)
   */
  @Column({ type: 'boolean', default: false })
  isWeighedProduct!: boolean

  /**
   * Para productos por peso: unidad de medida (kg, g, lb, oz)
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  weightUnit?: string

  @Column({ type: 'int', default: 10 })
  minStockLevel!: number

  @Column({ type: 'int', nullable: true })
  maxStockLevel?: number

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit?: string

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl?: string

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'boolean', default: true })
  trackStock!: boolean

  /**
   * Indica si este producto requiere seguimiento de fechas de vencimiento
   * Para productos perecederos como alimentos, medicinas, cosméticos, etc.
   */
  @Column({ type: 'boolean', default: false })
  trackExpirationDates!: boolean

  // Tax Configuration
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  taxRate?: number

  @Column({ type: 'boolean', default: false })
  overrideTaxRate!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne(() => Store, (store: any) => store.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store!: any

  @ManyToOne(() => Category, (category: any) => category.products, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category?: any

  @ManyToOne(() => Supplier, (supplier: any) => supplier.products, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplierId' })
  supplier?: any

  @OneToMany('stock_movement', (movement: any) => movement.product)
  stockMovements!: any[]

  @OneToMany('sale_item', (saleItem: any) => saleItem.product)
  saleItems!: any[]

  @OneToMany('product_barcode', (barcode: any) => barcode.product)
  barcodes!: any[]

  @OneToMany('supplier_product', (sp: any) => sp.product)
  supplierProducts?: any[]

  @OneToMany('product_batch', (batch: any) => batch.product)
  batches!: any[]
}
