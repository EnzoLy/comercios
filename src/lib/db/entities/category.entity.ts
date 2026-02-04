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
  @ManyToOne(() => Store, (store: any) => store.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store!: any

  @ManyToOne('Category', (category: any) => category.children, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: any

  @OneToMany('Category', (category: any) => category.parent)
  children!: any[]

  @OneToMany(() => Product, (product: any) => product.category)
  products!: any[]
}
