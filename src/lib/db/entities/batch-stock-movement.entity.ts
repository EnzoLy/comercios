import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { MovementType } from './stock-movement.entity'

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
  @ManyToOne('product_batch', 'movements', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batchId' })
  batch!: any

  @ManyToOne('product', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: any

  @ManyToOne('stock_movement', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stockMovementId' })
  stockMovement?: any

  @ManyToOne('user', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: any

  @ManyToOne('sale', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saleId' })
  sale?: any
}
