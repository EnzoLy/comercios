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
import type { SupplierCommercialTerms } from './supplier-commercial-terms.entity'

@Entity('supplier_volume_discount')
@Index(['commercialTermsId', 'isActive'])
export class SupplierVolumeDiscount {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  commercialTermsId!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  @Column({ type: 'int', nullable: true })
  minimumQuantity?: number

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minimumAmount?: number

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  discountPercentage!: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string

  @Column({ type: 'date', nullable: true })
  validFrom?: Date

  @Column({ type: 'date', nullable: true })
  validUntil?: Date

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne('SupplierCommercialTerms', (terms: any) => terms.volumeDiscounts, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'commercialTermsId' })
  commercialTerms!: SupplierCommercialTerms
}
