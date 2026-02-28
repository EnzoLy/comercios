import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'

@Entity('sale_return_item')
export class SaleReturnItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', name: 'sale_return_id' })
  @Index()
  saleReturnId!: string

  @Column({ type: 'uuid', name: 'sale_item_id' })
  @Index()
  saleItemId!: string

  @Column({ type: 'int' })
  quantity!: number

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' })
  unitPrice!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total!: number

  @Column({ type: 'boolean', default: true, name: 'restock_item' })
  restockItem!: boolean

  // Relationships
  @ManyToOne('sale_return', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_return_id' })
  saleReturn!: any

  @ManyToOne('sale_item', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sale_item_id' })
  saleItem!: any
}
