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
import type { User } from './user.entity'
import type { Employment } from './employment.entity'
import type { Category } from './category.entity'
import type { Product } from './product.entity'
import type { Sale } from './sale.entity'
import type { Supplier } from './supplier.entity'

@Entity('store')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index('idx_store_slug')
  slug!: string

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string

  @Column({ type: 'text', nullable: true })
  address?: string

  /*
  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  zipCode?: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency!: string

  @Column({ type: 'varchar', length: 50, default: 'en-US' })
  locale!: string

  @Column({ type: 'varchar', length: 100, default: 'UTC' })
  timezone!: string
  */

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  // Tax Configuration
  @Column({ type: 'boolean', default: false })
  taxEnabled!: boolean

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  defaultTaxRate!: number

  @Column({ type: 'varchar', length: 100, nullable: true })
  taxName?: string

  @Column({ type: 'uuid' })
  @Index('idx_store_owner')
  ownerId!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne('User', (user: User) => user.ownedStores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User

  @OneToMany('Employment', (employment: Employment) => employment.store)
  employments!: Employment[]

  @OneToMany('Category', (category: Category) => category.store)
  categories!: Category[]

  @OneToMany('Product', (product: Product) => product.store)
  products!: Product[]

  @OneToMany('Sale', (sale: Sale) => sale.store)
  sales!: Sale[]

  @OneToMany('Supplier', (supplier: Supplier) => supplier.store)
  suppliers!: Supplier[]
}
