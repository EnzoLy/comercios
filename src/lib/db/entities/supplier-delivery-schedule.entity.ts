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
import { Supplier } from './supplier.entity'

@Entity('supplier_delivery_schedule')
@Index(['supplierId', 'dayOfWeek', 'isActive'])
export class SupplierDeliverySchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  supplierId!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  @Column({ type: 'int' })
  dayOfWeek!: number // 0-6, Sunday=0

  @Column({ type: 'time', nullable: true })
  deliveryTime?: string // Start of delivery window

  @Column({ type: 'time', nullable: true })
  deliveryTimeEnd?: string // End of delivery window

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'text', nullable: true })
  notes?: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne(() => Supplier, (supplier: any) => supplier.deliverySchedules, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier
}
