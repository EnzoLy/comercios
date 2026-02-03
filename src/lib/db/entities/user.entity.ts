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
