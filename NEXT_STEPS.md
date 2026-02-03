# Next Steps - Implementation Guide

This document provides a step-by-step guide to complete the remaining features of the commerce management system.

## Current Status

### ✅ Completed
- Database foundation (TypeORM + 9 entities)
- Authentication (NextAuth v5 + JWT)
- Authorization (middleware + permissions)
- Store management API
- Auth UI (signin/signup pages)
- Store selector page

### 🎯 Next Priority: Complete Core Flow

To get a working end-to-end system, implement in this order:

---

## Step 1: Dashboard Layout (CRITICAL)

Create the main dashboard layout that wraps all store-scoped pages.

### File: `src/app/dashboard/[storeSlug]/layout.tsx`

```typescript
import { notFound } from 'next/navigation'
import { getStoreContext } from '@/lib/auth/store-context'
// Import Sidebar component (create next)

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ storeSlug: string }>
}) {
  const { storeSlug } = await params
  const context = await getStoreContext(storeSlug)

  if (!context) {
    notFound()
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar - create component */}
      <aside className="w-64 border-r">
        <div className="p-4">
          <h2 className="font-bold">{context.slug}</h2>
          {/* Navigation links */}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

### File: `src/components/layout/sidebar.tsx`

Create navigation with:
- Dashboard
- Products
- Categories
- Inventory
- POS
- Sales
- Employees (if has permission)
- Settings (if owner)

---

## Step 2: Simple Dashboard Page

### File: `src/app/dashboard/[storeSlug]/page.tsx`

```typescript
import { getStoreContext } from '@/lib/auth/store-context'

export default async function StoreDashboard({
  params,
}: {
  params: Promise<{ storeSlug: string }>
}) {
  const { storeSlug } = await params
  const context = await getStoreContext(storeSlug)

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p>Welcome to {context?.slug}</p>
      {/* Add widgets later */}
    </div>
  )
}
```

---

## Step 3: Product Management (HIGH PRIORITY)

Products are core to the system. Implement full CRUD.

### A. Product API Routes

#### File: `src/app/api/stores/[storeId]/products/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { requireStoreAccess, getStoreIdFromHeaders } from '@/lib/auth/permissions'
import { getDataSource } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'
import { createProductSchema } from '@/lib/validations/product.schema'

export async function GET(request: Request) {
  try {
    const storeId = getStoreIdFromHeaders(request)
    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)

    // Add pagination, search, filters later
    const products = await productRepo.find({
      where: { storeId },
      relations: ['category', 'supplier'],
      order: { createdAt: 'DESC' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const storeId = getStoreIdFromHeaders(request)
    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
    }

    await requireStoreAccess(storeId)

    const body = await request.json()
    const validated = createProductSchema.parse(body)

    const dataSource = await getDataSource()
    const productRepo = dataSource.getRepository(Product)

    const product = productRepo.create({
      ...validated,
      storeId,
    })

    await productRepo.save(product)

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
```

#### File: `src/app/api/stores/[storeId]/products/[productId]/route.ts`

Implement GET, PATCH, DELETE similar to store routes.

#### File: `src/app/api/stores/[storeId]/products/barcode/[barcode]/route.ts`

```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string; barcode: string }> }
) {
  const { storeId, barcode } = await params
  await requireStoreAccess(storeId)

  const dataSource = await getDataSource()
  const product = await dataSource.getRepository(Product).findOne({
    where: { storeId, barcode },
  })

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json(product)
}
```

### B. Product Pages

#### File: `src/app/dashboard/[storeSlug]/products/page.tsx`

List products with table, search, create button.

#### File: `src/app/dashboard/[storeSlug]/products/new/page.tsx`

Product form for creation.

#### File: `src/app/dashboard/[storeSlug]/products/[productId]/page.tsx`

Product edit form.

### C. Barcode Scanner Component

#### File: `src/components/products/barcode-scanner.tsx`

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import Quagga from '@ericblade/quagga2'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  isOpen: boolean
  onClose: () => void
}

export function BarcodeScanner({ onDetected, isOpen, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !scannerRef.current) return

    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: scannerRef.current,
          constraints: {
            facingMode: 'environment', // Rear camera
          },
        },
        decoder: {
          readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'code_128_reader'],
        },
      },
      (err) => {
        if (err) {
          setError('Failed to initialize camera')
          console.error(err)
          return
        }
        Quagga.start()
      }
    )

    Quagga.onDetected((result) => {
      const code = result.codeResult.code
      if (code) {
        onDetected(code)
        Quagga.stop()
        onClose()
      }
    })

    return () => {
      Quagga.stop()
    }
  }, [isOpen, onDetected, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
        </DialogHeader>
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div ref={scannerRef} className="w-full h-64" />
        )}
        <Button onClick={onClose} variant="outline">
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Step 4: Category Management

Simple hierarchical categories.

### File: `src/app/api/stores/[storeId]/categories/route.ts`

GET and POST for categories. Filter by storeId.

### File: `src/app/dashboard/[storeSlug]/categories/page.tsx`

List categories in tree view with create/edit/delete.

---

## Step 5: POS System (CRITICAL)

The point of sale is the heart of the system.

### A. POS Page

#### File: `src/app/dashboard/[storeSlug]/pos/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { BarcodeScanner } from '@/components/products/barcode-scanner'
// Import Cart, Checkout components

export default function POSPage() {
  const [cart, setCart] = useState([])
  const [scannerOpen, setScannerOpen] = useState(false)

  const handleBarcodeDetected = async (barcode: string) => {
    // Lookup product by barcode
    // Add to cart
  }

  return (
    <div className="h-screen flex">
      {/* Left: Product search/scan */}
      <div className="flex-1 p-4">
        <button onClick={() => setScannerOpen(true)}>
          Scan Barcode
        </button>
        {/* Product search */}
      </div>

      {/* Right: Cart */}
      <div className="w-96 border-l p-4">
        {/* Cart items */}
        {/* Checkout button */}
      </div>

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />
    </div>
  )
}
```

### B. Sales API with Atomic Transaction

#### File: `src/app/api/stores/[storeId]/sales/route.ts`

```typescript
export async function POST(request: Request) {
  const storeId = getStoreIdFromHeaders(request)
  const userId = getUserIdFromHeaders(request)

  await requireStoreAccess(storeId!)

  const body = await request.json()
  const validated = createSaleSchema.parse(body)

  const dataSource = await getDataSource()

  // CRITICAL: Atomic transaction
  const sale = await dataSource.transaction(async (manager) => {
    // 1. Validate stock for all items
    for (const item of validated.items) {
      const product = await manager.findOne(Product, {
        where: { id: item.productId, storeId },
      })

      if (!product || product.currentStock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product?.name}`)
      }
    }

    // 2. Calculate totals
    const subtotal = validated.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice - item.discount,
      0
    )
    const total = subtotal + validated.tax - validated.discount

    // 3. Create sale
    const sale = manager.create(Sale, {
      storeId,
      cashierId: userId,
      paymentMethod: validated.paymentMethod,
      status: SaleStatus.PENDING,
      subtotal,
      tax: validated.tax,
      discount: validated.discount,
      total,
      amountPaid: validated.amountPaid,
      changeGiven: validated.amountPaid ? validated.amountPaid - total : 0,
      notes: validated.notes,
    })
    await manager.save(sale)

    // 4. Create sale items
    for (const item of validated.items) {
      const product = await manager.findOne(Product, {
        where: { id: item.productId },
      })

      const saleItem = manager.create(SaleItem, {
        saleId: sale.id,
        productId: item.productId,
        productName: product!.name,
        productSku: product!.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        subtotal: item.quantity * item.unitPrice,
        total: item.quantity * item.unitPrice - item.discount,
      })
      await manager.save(saleItem)
    }

    // 5. Create stock movements and update stock
    for (const item of validated.items) {
      const movement = manager.create(StockMovement, {
        productId: item.productId,
        type: MovementType.SALE,
        quantity: -item.quantity,
        unitPrice: item.unitPrice,
        userId,
        saleId: sale.id,
      })
      await manager.save(movement)

      await manager.decrement(
        Product,
        { id: item.productId },
        'currentStock',
        item.quantity
      )
    }

    // 6. Mark sale as completed
    sale.status = SaleStatus.COMPLETED
    sale.completedAt = new Date()
    await manager.save(sale)

    return sale
  })

  return NextResponse.json(sale, { status: 201 })
}
```

---

## Step 6: Inventory Management

### File: `src/app/api/stores/[storeId]/inventory/movements/route.ts`

List stock movements with filters.

### File: `src/app/api/stores/[storeId]/inventory/alerts/route.ts`

```typescript
export async function GET(request: Request) {
  const storeId = getStoreIdFromHeaders(request)
  await requireStoreAccess(storeId!)

  const dataSource = await getDataSource()
  const productRepo = dataSource.getRepository(Product)

  // Products below min stock
  const lowStock = await productRepo
    .createQueryBuilder('product')
    .where('product.storeId = :storeId', { storeId })
    .andWhere('product.currentStock <= product.minStockLevel')
    .andWhere('product.isActive = :isActive', { isActive: true })
    .getMany()

  return NextResponse.json({ lowStock })
}
```

### File: `src/app/dashboard/[storeSlug]/inventory/page.tsx`

Show stock alerts, recent movements, stock adjustment form.

---

## Step 7: Dashboard with Widgets

### File: `src/app/dashboard/[storeSlug]/page.tsx` (enhanced)

```typescript
import { getDataSource } from '@/lib/db'
import { Sale, Product } from '@/lib/db'
// Import Card, StatsCard components

export default async function Dashboard({ params }) {
  const { storeSlug } = await params
  const context = await getStoreContext(storeSlug)

  const dataSource = await getDataSource()

  // Today's sales
  const todaySales = await dataSource.getRepository(Sale)
    .createQueryBuilder('sale')
    .where('sale.storeId = :storeId', { storeId: context.storeId })
    .andWhere('DATE(sale.createdAt) = CURRENT_DATE')
    .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
    .getMany()

  const todayRevenue = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0)

  // Low stock count
  const lowStockCount = await dataSource.getRepository(Product)
    .createQueryBuilder('product')
    .where('product.storeId = :storeId', { storeId: context.storeId })
    .andWhere('product.currentStock <= product.minStockLevel')
    .getCount()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Today's Revenue" value={`$${todayRevenue.toFixed(2)}`} />
        <StatsCard title="Transactions" value={todaySales.length} />
        <StatsCard title="Low Stock Items" value={lowStockCount} />
        {/* More stats */}
      </div>

      {/* Charts, recent sales, stock alerts */}
    </div>
  )
}
```

---

## Step 8: Employee Management

### File: `src/app/api/stores/[storeId]/employees/route.ts`

GET employments, POST to invite (requires existing user or create invitation system).

### File: `src/app/dashboard/[storeSlug]/employees/page.tsx`

List employees, invite form, role management.

---

## Step 9: Reports

### File: `src/app/dashboard/[storeSlug]/reports/page.tsx`

Reports hub with links to different report types.

### File: `src/app/dashboard/[storeSlug]/reports/sales/page.tsx`

Sales report with date range, export CSV.

---

## Implementation Tips

### 1. Test Database First

Before starting, ensure database connection works:

```bash
# Create .env.local with real credentials
# Start PostgreSQL
# Run: npm run dev
# Check console for "✅ Database connection established"
```

### 2. Build Incrementally

Test each feature as you build:
1. API route → Test with curl/Postman
2. Page component → Test in browser
3. Integration → Test full flow

### 3. Use Toast Notifications

Always provide feedback:

```typescript
import { toast } from 'sonner'

toast.success('Product created!')
toast.error('Failed to create product')
toast.loading('Creating product...')
```

### 4. Handle Errors

Wrap API calls in try-catch:

```typescript
try {
  const response = await fetch('/api/...')
  if (!response.ok) {
    const error = await response.json()
    toast.error(error.message)
    return
  }
  const data = await response.json()
  toast.success('Success!')
} catch (error) {
  toast.error('An error occurred')
}
```

### 5. Mobile Testing

For barcode scanner, test on actual mobile device:
- Use ngrok or similar for HTTPS (required for camera)
- Test camera permissions
- Test different barcode formats

---

## Priority Order

1. **Dashboard Layout** - Required for all pages
2. **Product Management** - Core feature
3. **POS System** - Main use case
4. **Sales API** - Critical atomic transaction
5. **Inventory** - Stock tracking
6. **Dashboard** - Analytics
7. **Categories** - Organization
8. **Employees** - Team management
9. **Reports** - Business intelligence

---

## Testing Checklist

- [ ] User can register and create store
- [ ] User can sign in and see store selector
- [ ] Dashboard layout renders correctly
- [ ] Can create product via form
- [ ] Can scan barcode in product form
- [ ] Products appear in product list
- [ ] POS can scan product and add to cart
- [ ] Checkout creates sale atomically
- [ ] Stock decrements after sale
- [ ] Sale appears in sales history
- [ ] Dashboard shows today's stats
- [ ] Stock alerts appear for low stock
- [ ] Can invite employee (if implemented)
- [ ] Mobile POS works on phone

---

## Need Help?

Refer to:
- `IMPLEMENTATION_STATUS.md` for progress
- Original plan in conversation history
- TypeORM docs: https://typeorm.io
- NextAuth docs: https://authjs.dev
- Quagga2 docs: https://github.com/ericblade/quagga2
