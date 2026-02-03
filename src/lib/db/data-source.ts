import 'reflect-metadata'
import { DataSource } from 'typeorm'

// Import entities (will be created next)
import { User } from './entities/user.entity'
import { Store } from './entities/store.entity'
import { Employment } from './entities/employment.entity'
import { Category } from './entities/category.entity'
import { Supplier } from './entities/supplier.entity'
import { Product } from './entities/product.entity'
import { ProductBarcode } from './entities/product-barcode.entity'
import { StockMovement } from './entities/stock-movement.entity'
import { Sale } from './entities/sale.entity'
import { SaleItem } from './entities/sale-item.entity'
import { EmployeeShift } from './entities/employee-shift.entity'
import { ShiftClose } from './entities/shift-close.entity'
import { EmploymentAccessToken } from './entities/employment-access-token.entity'

// Import migrations
import { AddPinToEmployment1707000000000 } from './migrations/1707000000000-AddPinToEmployment'

// Singleton instance to prevent multiple connections in Next.js hot reload
let dataSource: DataSource | null = null

export async function getDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource
  }

  if (dataSource && !dataSource.isInitialized) {
    await dataSource.initialize()
    return dataSource
  }

  // Create new DataSource
  // Support both connection string (Supabase) and individual parameters
  const useConnectionString = !!process.env.DATABASE_URL

  dataSource = new DataSource(
    useConnectionString
      ? {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // Required for Supabase
        synchronize: false,
        logging: false, // Disable SQL query logging
        entities: [
          User,
          Store,
          Employment,
          EmploymentAccessToken,
          Category,
          Supplier,
          Product,
          ProductBarcode,
          StockMovement,
          Sale,
          SaleItem,
          EmployeeShift,
          ShiftClose,
        ],
        subscribers: [],
        migrations: [],
        // Connection pooling settings for Supabase
        extra: {
          max: 10, // Maximum connections
          idleTimeoutMillis: 30000, // Close idle connections after 30s
          connectionTimeoutMillis: 2000, // Timeout for getting a connection
        },
      }
      : {
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || '',
        database: process.env.DATABASE_NAME || 'commerce',
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
        synchronize: process.env.NODE_ENV === 'development',
        logging: false, // Disable SQL query logging
        entities: [
          User,
          Store,
          Employment,
          EmploymentAccessToken,
          Category,
          Supplier,
          Product,
          ProductBarcode,
          StockMovement,
          Sale,
          SaleItem,
          EmployeeShift,
          ShiftClose,
        ],
        subscribers: [],
        migrations: [],
      }
  )

  await dataSource.initialize()

  console.log('✅ Database connection established')

  return dataSource
}

// Graceful shutdown
export async function closeDataSource(): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy()
    dataSource = null
    console.log('Database connection closed')
  }
}

// Helper to get repository
export async function getRepository<T>(entity: new () => T) {
  const ds = await getDataSource()
  return ds.getRepository(entity)
}
