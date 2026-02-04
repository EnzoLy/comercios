import 'reflect-metadata'
import { DataSource } from 'typeorm'

// Import entities
import { User } from '@/lib/db/entities/user.entity'
import { Store } from '@/lib/db/entities/store.entity'
import { Employment } from '@/lib/db/entities/employment.entity'
import { Category } from '@/lib/db/entities/category.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { ProductBarcode } from '@/lib/db/entities/product-barcode.entity'
import { StockMovement } from '@/lib/db/entities/stock-movement.entity'
import { Sale } from '@/lib/db/entities/sale.entity'
import { SaleItem } from '@/lib/db/entities/sale-item.entity'
import { EmployeeShift } from '@/lib/db/entities/employee-shift.entity'
import { ShiftClose } from '@/lib/db/entities/shift-close.entity'
import { AuditLog } from '@/lib/db/entities/audit-log.entity'
import { EmploymentAccessToken } from '@/lib/db/entities/employment-access-token.entity'
import { SupplierContact } from '@/lib/db/entities/supplier-contact.entity'
import { SupplierCommercialTerms } from '@/lib/db/entities/supplier-commercial-terms.entity'
import { SupplierVolumeDiscount } from '@/lib/db/entities/supplier-volume-discount.entity'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { SupplierDeliverySchedule } from '@/lib/db/entities/supplier-delivery-schedule.entity'
import { SupplierDocument } from '@/lib/db/entities/supplier-document.entity'
import { SupplierProduct } from '@/lib/db/entities/supplier-product.entity'
import { PurchaseOrder } from '@/lib/db/entities/purchase-order.entity'
import { PurchaseOrderItem } from '@/lib/db/entities/purchase-order-item.entity'
import { DigitalInvoice } from '@/lib/db/entities/digital-invoice.entity'

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
        synchronize: false, // Use manual migrations for Supabase
        logging: false, // Disable SQL query logging
        entities: [
          User,
          Store,
          Employment,
          EmploymentAccessToken,
          AuditLog,
          Category,
          Supplier,
          SupplierContact,
          SupplierCommercialTerms,
          SupplierVolumeDiscount,
          SupplierProductPrice,
          SupplierDeliverySchedule,
          SupplierDocument,
          SupplierProduct,
          Product,
          ProductBarcode,
          StockMovement,
          Sale,
          SaleItem,
          EmployeeShift,
          ShiftClose,
          PurchaseOrder,
          PurchaseOrderItem,
          DigitalInvoice,
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
          AuditLog,
          Category,
          Supplier,
          SupplierContact,
          SupplierCommercialTerms,
          SupplierVolumeDiscount,
          SupplierProductPrice,
          SupplierDeliverySchedule,
          SupplierDocument,
          SupplierProduct,
          Product,
          ProductBarcode,
          StockMovement,
          Sale,
          SaleItem,
          EmployeeShift,
          ShiftClose,
          PurchaseOrder,
          PurchaseOrderItem,
          DigitalInvoice,
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
