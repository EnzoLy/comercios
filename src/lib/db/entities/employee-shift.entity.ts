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
import type { Store } from './store.entity'
import type { User } from './user.entity'

export enum ShiftStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
}

@Entity('employee_shift')
@Index(['storeId', 'employeeId', 'startTime'])
@Index(['storeId', 'date'])
export class EmployeeShift {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid' })
  @Index()
  storeId!: string

  @Column({ type: 'uuid' })
  @Index()
  employeeId!: string

  @Column({ type: 'date' })
  date!: Date

  @Column({ type: 'time' })
  startTime!: string

  @Column({ type: 'time', nullable: true })
  endTime?: string

  @Column({
    type: 'enum',
    enum: ShiftStatus,
    default: ShiftStatus.ACTIVE,
  })
  status!: ShiftStatus

  @Column({ type: 'text', nullable: true })
  notes?: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @ManyToOne('store', (store: any) => store.employeeShifts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store!: any

  @ManyToOne('user', (user: any) => user.shifts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee!: any
}
