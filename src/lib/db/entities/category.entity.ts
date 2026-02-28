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
  @ManyToOne('store', 'categories', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store!: any

  @ManyToOne('category', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: any

  @OneToMany('product', 'category')
  products!: any[]
}
