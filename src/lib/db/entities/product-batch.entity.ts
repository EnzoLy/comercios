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
import { Product } from './product.entity'
import type { BatchStockMovement } from './batch-stock-movement.entity'

@Entity('product_batch')
@Index(['productId', 'expirationDate'])
@Index(['productId', 'currentQuantity'])
export class ProductBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  productId!: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  batchNumber?: string

  @Column({ type: 'timestamp' })
  expirationDate!: Date

  @Column({ type: 'int' })
  initialQuantity!: number

  @Column({ type: 'int' })
  currentQuantity!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitCost!: number

  @Column({ type: 'uuid', nullable: true })
  purchaseOrderId?: string

  @Column({ type: 'uuid', nullable: true })
  purchaseOrderItemId?: string

  /**
   * Computed field to quickly filter expired batches
   * Updated via database trigger or application logic
   */
  @Column({ type: 'boolean', default: false })
  isExpired!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne(() => Product, (product: any) => product.batches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: any

  @OneToMany('BatchStockMovement', (movement: any) => movement.batch)
  movements!: any[]
}
