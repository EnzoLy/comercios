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
import type { User } from './user.entity'
import type { Store } from './store.entity'

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

  @Column({ type: 'uuid' })
  @Index()
  userId!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  @Column({
    type: 'enum',
    enum: EmploymentRole,
    default: EmploymentRole.CASHIER,
  })
  role!: EmploymentRole

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne('User', (user: User) => user.employments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User

  @ManyToOne('Store', (store: Store) => store.employments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store!: Store
}
