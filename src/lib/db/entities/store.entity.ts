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
import { User } from './user.entity'
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

  // Security Configuration
  @Column({ type: 'boolean', default: true })
  requireEmployeePin!: boolean

  @Column({ type: 'uuid' })
  @Index('idx_store_owner')
  ownerId!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne(() => User, (user: any) => user.ownedStores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: any

  @OneToMany(() => Employment, (employment: any) => employment.store)
  employments!: any[]

  @OneToMany(() => Category, (category: any) => category.store)
  categories!: any[]

  @OneToMany(() => Product, (product: any) => product.store)
  products!: any[]

  @OneToMany(() => Sale, (sale: any) => sale.store)
  sales!: any[]

  @OneToMany(() => Supplier, (supplier: any) => supplier.store)
  suppliers!: any[]
}
