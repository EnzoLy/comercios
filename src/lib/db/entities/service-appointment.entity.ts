import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm'
import { Store } from './store.entity'
import { Service } from './service.entity'

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('service_appointment')
@Index(['storeId'])
@Index(['storeId', 'scheduledAt'])
@Index(['serviceId'])
export class ServiceAppointment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid', { name: 'store_id' })
  storeId: string

  @Column('uuid', { name: 'service_id' })
  serviceId: string

  @Column('varchar', { name: 'client_name', length: 255 })
  clientName: string

  @Column('varchar', { name: 'client_phone', length: 20, nullable: true })
  clientPhone: string | null

  @Column('varchar', { name: 'client_email', length: 255, nullable: true })
  clientEmail: string | null

  @Column('timestamp', { name: 'scheduled_at' })
  scheduledAt: Date

  @Column('enum', { name: 'status', enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  status: AppointmentStatus

  @Column('text', { nullable: true })
  notes: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store

  @ManyToOne(() => Service, (service) => service.appointments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'service_id' })
  service: Service
}
