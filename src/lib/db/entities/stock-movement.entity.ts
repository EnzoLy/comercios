import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'

export enum MovementType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
  DAMAGE = 'DAMAGE',
}

@Entity('stock_movement')
@Index(['productId', 'createdAt'])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  productId!: string

  @Column({
    type: 'enum',
    enum: MovementType,
  })
  type!: MovementType

  @Column({ type: 'int' })
  quantity!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice?: number

  @Column({ type: 'text', nullable: true })
  notes?: string

  @Column({ type: 'uuid', nullable: true })
  userId?: string

  @Column({ type: 'uuid', nullable: true })
  saleId?: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference?: string

  @CreateDateColumn()
  createdAt!: Date

  // Relationships
  @ManyToOne('product', 'stockMovements', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: any

  @ManyToOne('user', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: any

  @ManyToOne('sale', 'stockMovements', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saleId' })
  sale?: any
}
