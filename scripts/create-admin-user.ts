/**
 * Create Admin User Script
 *
 * Creates a superadmin user with a store for testing
 * Run: npx ts-node scripts/create-admin-user.ts
 */

import 'reflect-metadata'
import { DataSource } from 'typeorm'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as bcrypt from 'bcryptjs'
import * as readline from 'readline'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Import entities
import { User, UserRole } from '../src/lib/db/entities/user.entity'
import { Store } from '../src/lib/db/entities/store.entity'
import { Employment, EmploymentRole } from '../src/lib/db/entities/employment.entity'
import { Category } from '../src/lib/db/entities/category.entity'
import { Product } from '../src/lib/db/entities/product.entity'
import { Sale } from '../src/lib/db/entities/sale.entity'
import { SaleItem } from '../src/lib/db/entities/sale-item.entity'
import { Supplier } from '../src/lib/db/entities/supplier.entity'
import { StockMovement } from '../src/lib/db/entities/stock-movement.entity'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function createAdminUser() {
  console.log('🔧 Create Admin User\n')

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env.local')
    process.exit(1)
  }

  // Get user input
  const email = await question('Email: ')
  const name = await question('Name: ')
  const password = await question('Password: ')
  const storeName = await question('Store Name: ')

  if (!email || !name || !password || !storeName) {
    console.error('❌ All fields are required')
    rl.close()
    process.exit(1)
  }

  console.log('\n🔌 Connecting to database...')

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    synchronize: false, // Disable sync to use existing schema
    logging: false,
    entities: [
      User,
      Store,
      Employment,
      Category,
      Product,
      Sale,
      SaleItem,
      Supplier,
      StockMovement
    ],
  })

  try {
    await dataSource.initialize()
    console.log('✅ Connected\n')

    // Check if user exists
    const userRepo = dataSource.getRepository(User)
    const existing = await userRepo.findOne({ where: { email } })

    if (existing) {
      console.error(`❌ User with email ${email} already exists`)
      rl.close()
      await dataSource.destroy()
      process.exit(1)
    }

    // Hash password
    console.log('🔐 Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user, store, and employment in transaction
    console.log('💾 Creating user and store...')

    await dataSource.transaction(async (manager) => {
      // Create user
      const user = manager.create(User, {
        email,
        name,
        password: hashedPassword,
        role: UserRole.STORE_OWNER,
      })
      await manager.save(user)

      // Create store
      const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const store = manager.create(Store, {
        name: storeName,
        slug,
        ownerId: user.id,
        isActive: true,
      })
      await manager.save(store)

      // Create employment
      const employment = manager.create(Employment, {
        userId: user.id,
        storeId: store.id,
        role: EmploymentRole.ADMIN,
        isActive: true,
        startDate: new Date(),
      })
      await manager.save(employment)

      console.log('\n✅ User created successfully!')
      console.log('\n📋 Details:')
      console.log(`Email: ${email}`)
      console.log(`Name: ${name}`)
      console.log(`Role: ${UserRole.STORE_OWNER}`)
      console.log(`Store: ${storeName} (${slug})`)
      console.log(`Store ID: ${store.id}`)
      console.log(`User ID: ${user.id}`)
    })

    console.log('\n🎉 Setup complete!')
    console.log('\nYou can now sign in at: http://localhost:3000/auth/signin')
    console.log(`Email: ${email}`)
    console.log(`Password: [the password you entered]\n`)

    rl.close()
    await dataSource.destroy()
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    rl.close()
    if (dataSource.isInitialized) {
      await dataSource.destroy()
    }
    process.exit(1)
  }
}

createAdminUser()
