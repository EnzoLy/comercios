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
import type { Store } from './store.entity'
import type { Product } from './product.entity'

@Entity('category')
@Unique(['storeId', 'name'])
@Index(['storeId', 'parentId'])
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentId?: string

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne('Store', (store: Store) => store.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store!: Store

  @ManyToOne('Category', (category: Category) => category.children, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: Category

  @OneToMany('Category', (category: Category) => category.parent)
  children!: Category[]

  @OneToMany('Product', (product: Product) => product.category)
  products!: Product[]
}
