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

@Entity('service_category')
@Index(['storeId'])
@Index(['storeId', 'name'], { unique: true })
export class ServiceCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('uuid', { name: 'store_id' })
  storeId!: string

  @Column('varchar', { length: 255 })
  name!: string

  @Column('text', { nullable: true })
  description!: string

  @Column('varchar', { length: 7, default: '#3b82f6' })
  color!: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date

  @ManyToOne('store', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: any

  @OneToMany('service', 'category', { cascade: true })
  services!: any[]
}
