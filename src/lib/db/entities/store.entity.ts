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
import { Employment } from './employment.entity'
import { Category } from './category.entity'
import { Product } from './product.entity'
import { Sale } from './sale.entity'
import { Supplier } from './supplier.entity'

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

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean

  // Subscription Configuration
  @Column({ type: 'varchar', length: 50, default: 'ACTIVE', name: 'subscription_status' })
  @Index('idx_store_subscription_status')
  subscriptionStatus!: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'PERMANENT'

  @Column({ type: 'timestamp', nullable: true, name: 'subscription_start_date' })
  subscriptionStartDate?: Date

  @Column({ type: 'timestamp', nullable: true, name: 'subscription_end_date' })
  @Index('idx_store_subscription_end_date')
  subscriptionEndDate?: Date

  @Column({ type: 'boolean', default: false, name: 'is_permanent' })
  isPermanent!: boolean

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'subscription_price' })
  subscriptionPrice?: number

  @Column({ type: 'varchar', length: 20, default: 'MONTHLY', name: 'subscription_period_type' })
  subscriptionPeriodType!: 'MONTHLY' | 'YEARLY' | 'CUSTOM'

  // Tax Configuration
  @Column({ type: 'boolean', default: false, name: 'tax_enabled' })
  taxEnabled!: boolean

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'default_tax_rate' })
  defaultTaxRate!: number

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'tax_name' })
  taxName?: string

  // Security Configuration
  @Column({ type: 'boolean', default: true, name: 'require_employee_pin' })
  requireEmployeePin!: boolean

  @Column({ type: 'uuid', name: 'owner_id' })
  @Index('idx_store_owner')
  ownerId!: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date

  // Relationships
  @ManyToOne(() => User, (user: any) => user.ownedStores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: any

  @OneToMany(() => Employment, (employment: any) => employment.store)
  @JoinColumn({ name: 'store_id' })
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
