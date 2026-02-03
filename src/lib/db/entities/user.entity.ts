import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm'
import type { Store } from './store.entity'
import type { Employment } from './employment.entity'

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STORE_OWNER = 'STORE_OWNER',
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index('idx_user_email')
  email!: string

  @Column({ type: 'varchar', length: 255 })
  password!: string

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STORE_OWNER,
  })
  role!: UserRole

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'boolean', default: false })
  mustChangePassword!: boolean

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'owner_pin' })
  ownerPin?: string

  @Column({ type: 'varchar', length: 50, default: 'lavender', name: 'color_theme' })
  colorTheme!: string

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  // Relationships
  @OneToMany('store', (store: any) => store.owner)
  ownedStores!: any[]

  @OneToMany('employment', (employment: any) => employment.user)
  employments!: any[]
}
