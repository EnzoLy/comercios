import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm'
import { User } from './user.entity'
import { Store } from './store.entity'

export enum EmploymentRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  STOCK_KEEPER = 'STOCK_KEEPER',
}

@Entity('employment')
@Unique(['userId', 'storeId'])
@Index(['storeId', 'isActive'])
export class Employment {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId!: string

  @Column({ type: 'uuid', name: 'store_id' })
  @Index()
  storeId!: string

  @Column({
    type: 'enum',
    enum: EmploymentRole,
    default: EmploymentRole.CASHIER,
  })
  role!: EmploymentRole

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean

  @Column({ type: 'timestamp', nullable: true, name: 'start_date' })
  startDate?: Date

  @Column({ type: 'timestamp', nullable: true, name: 'end_date' })
  endDate?: Date

  @Column({ type: 'varchar', length: 255, nullable: true })
  pin?: string

  @Column({ type: 'boolean', default: false, name: 'requires_pin' })
  requiresPin!: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date

  // Relationships
  @ManyToOne(() => User, (user: any) => user.employments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: any

  @ManyToOne(() => Store, (store: any) => store.employments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: any
}
