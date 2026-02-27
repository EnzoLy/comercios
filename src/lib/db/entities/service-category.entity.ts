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
import { Service } from './service.entity'

@Entity('service_category')
@Index(['storeId'])
@Index(['storeId', 'name'], { unique: true })
export class ServiceCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid', { name: 'store_id' })
  storeId: string

  @Column('varchar', { length: 255 })
  name: string

  @Column('text', { nullable: true })
  description: string

  @Column('varchar', { length: 7, default: '#3b82f6' })
  color: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store

  @OneToMany(() => Service, (service) => service.category, { cascade: true })
  services: Service[]
}
