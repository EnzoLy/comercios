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

@Entity('supplier_contact')
@Index(['supplierId', 'isPrimary'])
export class SupplierContact {
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

  @Column({ type: 'varchar', length: 100, nullable: true })
  position?: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  mobilePhone?: string

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'text', nullable: true })
  notes?: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne('supplier', (supplier: any) => supplier.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier
}
