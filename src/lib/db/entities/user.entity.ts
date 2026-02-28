import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm'

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
  @OneToMany('store', 'owner')
  ownedStores!: any[]

  @OneToMany('employment', 'user')
  employments!: any[]

  @OneToMany('employee_shift', 'employee')
  shifts?: any[]
}
