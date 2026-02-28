import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm'

export enum QuoteItemType {
  PRODUCT = 'product',
  SERVICE = 'service',
  CUSTOM = 'custom',
}

@Entity('quote_item')
@Index(['quoteId'])
export class QuoteItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid', { name: 'quote_id' })
  quoteId!: string

  @Column('enum', {
    enum: QuoteItemType,
    default: QuoteItemType.CUSTOM,
    name: 'item_type',
  })
  itemType!: QuoteItemType

  @Column('uuid', { name: 'product_id', nullable: true })
  productId!: string | null

  @Column('uuid', { name: 'service_id', nullable: true })
  serviceId!: string | null

  @Column('varchar', { length: 255 })
  name!: string

  @Column('int', { default: 1 })
  quantity!: number

  @Column('decimal', { precision: 10, scale: 2, name: 'unit_price' })
  unitPrice!: number

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal!: number

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount!: number

  @Column('decimal', { precision: 10, scale: 2 })
  total!: number

  @Column('decimal', { precision: 5, scale: 2, default: 0, name: 'tax_rate' })
  taxRate!: number

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'tax_amount' })
  taxAmount!: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  // Relationships
  @ManyToOne('quote', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote!: any

  @ManyToOne('product', { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: any

  @ManyToOne('service', { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'service_id' })
  service?: any
}
