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
import type { Store } from './store.entity'
import type { Product } from './product.entity'

@Entity('supplier')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactPerson?: string // Deprecated: use SupplierContact instead

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string // Deprecated: use SupplierContact instead

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string // Deprecated: use SupplierContact instead

  @Column({ type: 'varchar', length: 100, nullable: true })
  taxId?: string // RFC/Tax ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string

  @Column({ type: 'text', nullable: true })
  address?: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  zipCode?: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string // ISO 4217

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  rating?: number // 1-5

  @Column({ type: 'boolean', default: false })
  isPreferred!: boolean

  @Column({ type: 'text', nullable: true })
  notes?: string

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne('store', (store: any) => store.suppliers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store!: Store

  @OneToMany('product', (product: any) => product.supplier)
  products!: Product[]

  @OneToMany('supplier_contact', (contact: any) => contact.supplier)
  contacts?: any[]

  @OneToMany('supplier_product', (sp: any) => sp.supplier)
  supplierProducts?: any[]

  @OneToMany('supplier_document', (doc: any) => doc.supplier)
  documents?: any[]

  @OneToMany('supplier_delivery_schedule', (schedule: any) => schedule.supplier)
  deliverySchedules?: any[]

  @OneToMany('purchase_order', (po: any) => po.supplier)
  purchaseOrders?: any[]
}
