import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm'
import type { Sale } from './sale.entity'
import type { Store } from './store.entity'

@Entity('digital_invoice')
@Index(['accessToken'], { unique: true })
@Index(['saleId'], { unique: true })
export class DigitalInvoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', name: 'sale_id' })
  @Index()
  saleId!: string

  @Column({ type: 'uuid', name: 'store_id' })
  @Index()
  storeId!: string

  @Column({ type: 'varchar', length: 64, unique: true, name: 'access_token' })
  accessToken!: string // Token público para acceso sin login

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'invoice_number' })
  invoiceNumber?: string // Número de factura (opcional)

  @Column({ type: 'int', default: 0, name: 'view_count' })
  viewCount!: number // Contador de visualizaciones

  @Column({ type: 'timestamp', nullable: true, name: 'last_viewed_at' })
  lastViewedAt?: Date

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean // Permite desactivar facturas si es necesario

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date

  // Relationships
  @ManyToOne('sale', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale!: Sale

  @ManyToOne('store', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store

  @BeforeInsert()
  generateAccessToken() {
    if (!this.accessToken) {
      // Use Web Crypto API which is available in both Node.js and Edge Runtime
      const bytes = new Uint8Array(32)
      globalThis.crypto.getRandomValues(bytes)
      this.accessToken = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
  }
}
