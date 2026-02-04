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
import { Store } from './store.entity'
import { User } from './user.entity'

export enum ShiftStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum ShiftType {
  REGULAR = 'REGULAR',      // Turno normal (hora a hora en el mismo día)
  SPECIAL = 'SPECIAL',      // Turno especial (abarca múltiples fechas, ej: día libre)
}

@Entity('employee_shift')
@Index(['storeId', 'employeeId', 'date'])
@Index(['storeId', 'date'])
export class EmployeeShift {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', name: 'storeId' })
  @Index()
  storeId!: string

  @Column({ type: 'uuid', name: 'employeeId' })
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
    enum: ShiftType,
    default: ShiftType.REGULAR,
  })
  type!: ShiftType

  @Column({ type: 'date', nullable: true })
  endDate?: Date

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
  @ManyToOne(() => Store, (store: any) => store.employeeShifts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store!: any

  @ManyToOne(() => User, (user: any) => user.shifts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee!: any
}
