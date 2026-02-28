import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm'
import { Store } from './store.entity'
import { ServiceCategory } from './service-category.entity'
import { SaleItem } from './sale-item.entity'

@Entity('service')
@Index(['storeId'])
@Index(['storeId', 'name'])
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid', { name: 'store_id' })
  storeId: string

  @Column('varchar', { length: 255 })
  name: string

  @Column('text', { nullable: true })
  description: string

  @Column('decimal', { precision: 10, scale: 2 })
  price: number

  @Column('uuid', { name: 'category_id', nullable: true })
  categoryId: string | null

  @Column('varchar', { name: 'image_url', length: 500, nullable: true })
  imageUrl: string

  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store

  @ManyToOne(() => ServiceCategory, (category) => category.services, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: ServiceCategory | null

  @OneToMany('ServiceAppointment', 'service', {
    cascade: true,
  })
  appointments: any[]

  @OneToMany(() => SaleItem, (saleItem) => saleItem.service)
  saleItems: SaleItem[]
}
