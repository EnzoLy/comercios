import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'

@Entity('shift_close')
@Index(['storeId', 'createdAt'])
@Index(['storeId', 'employeeId'])
export class ShiftClose {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  @Column({ type: 'uuid' })
  @Index()
  employeeId!: string

  @Column({ type: 'timestamp' })
  shiftStart!: Date

  @Column({ type: 'timestamp', nullable: true })
  shiftEnd?: Date

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  openingCash!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  expectedCash!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  actualCash!: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  variance!: number

  @Column({ type: 'text', nullable: true })
  notes?: string

  @CreateDateColumn()
  createdAt!: Date

  // Relationships
  @ManyToOne('store', 'shiftCloses', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store!: any

  @ManyToOne('user', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employeeId' })
  employee!: any
}
