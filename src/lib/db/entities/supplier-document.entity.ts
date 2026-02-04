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
import type { Supplier } from './supplier.entity'

export enum DocumentType {
  PRICE_LIST = 'PRICE_LIST',
  CATALOG = 'CATALOG',
  CONTRACT = 'CONTRACT',
  CERTIFICATE = 'CERTIFICATE',
  TAX_DOCUMENT = 'TAX_DOCUMENT',
  OTHER = 'OTHER'
}

@Entity('supplier_document')
@Index(['supplierId', 'documentType', 'createdAt'])
@Index(['supplierId', 'isActive'])
export class SupplierDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  supplierId!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.OTHER
  })
  documentType!: DocumentType

  @Column({ type: 'varchar', length: 255 })
  fileName!: string

  @Column({ type: 'text' })
  fileUrl!: string

  @Column({ type: 'int', nullable: true })
  fileSize?: number // Size in bytes

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType?: string

  @Column({ type: 'uuid', nullable: true })
  uploadedBy?: string // User who uploaded

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
  @ManyToOne('supplier', (supplier: any) => supplier.documents, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier
}
