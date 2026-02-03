import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import type { Product } from './product.entity'

@Entity('product_barcode')
@Index(['productId'])
@Index(['barcode'])
export class ProductBarcode {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  productId!: string

  @Column({ type: 'varchar', length: 100 })
  barcode!: string

  /**
   * Para productos por peso (prefijos 20-29):
   * Este código incluye peso/precio y se genera dinámicamente
   */
  @Column({ type: 'boolean', default: false })
  isWeightBased!: boolean

  /**
   * Para productos por peso: indica si este es el código base (plantilla)
   * Los códigos reales se generan a partir de este
   */
  @Column({ type: 'boolean', default: true })
  isPrimary!: boolean

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne('product', (product: any) => product.barcodes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product!: any
}
