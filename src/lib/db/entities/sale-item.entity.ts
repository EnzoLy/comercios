import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'

@Entity('sale_item')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  saleId!: string

  @Column({ type: 'uuid', nullable: true })
  productId?: string | null

  @Column({ type: 'uuid', nullable: true })
  serviceId?: string | null

  @Column({ type: 'varchar', length: 255 })
  productName!: string

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  productSku?: string | null

  @Column({ type: 'int' })
  quantity!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total!: number

  // Tax information
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount!: number

  @CreateDateColumn()
  createdAt!: Date

  // Relationships
  @ManyToOne('sale', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saleId' })
  sale!: any

  @ManyToOne('product', 'saleItems', { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'productId' })
  product?: any

  @ManyToOne('service', 'saleItems', { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'serviceId' })
  service?: any
}
