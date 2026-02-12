import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { ProductBatch } from './product-batch.entity'
import { Product } from './product.entity'
import { StockMovement, MovementType } from './stock-movement.entity'
import { User } from './user.entity'
import { Sale } from './sale.entity'

@Entity('batch_stock_movement')
@Index(['batchId', 'createdAt'])
@Index(['productId', 'createdAt'])
export class BatchStockMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  batchId!: string

  @Column({ type: 'uuid' })
  @Index()
  productId!: string

  @Column({ type: 'uuid', nullable: true })
  stockMovementId?: string

  @Column({
    type: 'enum',
    enum: MovementType,
  })
  type!: MovementType

  /**
   * Quantity moved (positive for incoming, negative for outgoing)
   */
  @Column({ type: 'int' })
  quantity!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice?: number

  @Column({ type: 'uuid', nullable: true })
  saleId?: string

  @Column({ type: 'uuid', nullable: true })
  userId?: string

  @Column({ type: 'text', nullable: true })
  notes?: string

  @CreateDateColumn()
  createdAt!: Date

  // Relationships
  @ManyToOne(() => ProductBatch, (batch: any) => batch.movements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batchId' })
  batch!: any

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: any

  @ManyToOne(() => StockMovement, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stockMovementId' })
  stockMovement?: any

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: any

  @ManyToOne(() => Sale, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saleId' })
  sale?: any
}
