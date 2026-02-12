# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Commerce Management System - A multi-tenant POS and inventory management system built with Next.js 16, TypeScript, TypeORM, and PostgreSQL (Supabase). Features offline-first POS capabilities, barcode scanning, QR code authentication, and comprehensive role-based access control.

## Development Commands

```bash
# Development
pnpm dev                    # Start dev server on localhost:3000
pnpm build                  # Production build
pnpm start                  # Start production server
pnpm lint                   # Run ESLint

# Database Scripts
pnpm db:test                # Test database connection
pnpm db:create-admin        # Create admin user interactively
pnpm db:seed-products       # Seed products with sample data
```

## Environment Setup

Copy `.env.local.example` to `.env` and configure:
- `DATABASE_URL` - Supabase connection string (use pooler port 6543)
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - Application URL (http://localhost:3000 for dev)

## Architecture

### Multi-Tenant Structure

The system is multi-tenant with a store-centric architecture:
- Users can be associated with multiple stores via `Employment` entities
- Each store has independent products, inventory, sales, and employees
- Store access is controlled through the `Employment` entity which defines roles

### Authentication & Authorization

**NextAuth v5 (beta)** with credential-based authentication:
- Configuration: `src/lib/auth/auth.config.ts`
- Session strategy: JWT, 30-day expiration
- Two login methods:
  - Standard email/password (ADMIN and OWNER roles only)
  - QR code authentication (all roles, for POS terminals)

**Role Hierarchy:**
1. `SUPER_ADMIN` - Platform administrator (access to `/admin` routes)
2. `ADMIN` - Store administrator or owner (full store access)
3. `MANAGER` - Manager (POS, employees, analytics, reports)
4. `STOCK_KEEPER` - Stock keeper (POS, inventory)
5. `CASHIER` - Cashier (POS only)

**Middleware Protection** (`middleware.ts`):
- All `/dashboard` and `/api/stores` routes require authentication
- Store-scoped routes verify user access via Employment relationship
- Role-based route filtering (e.g., CASHIER can only access POS)
- Headers injected: `x-store-id`, `x-store-slug`, `x-user-id`, `x-employment-role`

### Database (TypeORM)

**Configuration:** `src/lib/db/data-source.ts`
- Singleton pattern to prevent multiple connections in Next.js hot reload
- Supports both Supabase connection string and local PostgreSQL
- Connection pooling configured for Supabase (max 10 connections)
- **IMPORTANT:** `synchronize: false` in production - use manual migrations

**Core Entities** (`src/lib/db/entities/`):
- **User** - Platform users with system-level role
- **Store** - Tenant stores
- **Employment** - User-Store relationship with role and PIN for POS access
- **EmploymentAccessToken** - QR code tokens for POS authentication
- **Product** - Store products with pricing and inventory tracking
- **ProductBarcode** - Multiple barcodes per product (EAN-13, UPC-A, etc.)
- **Category** - Product categories
- **Supplier** - Supplier management with contacts, terms, and documents
- **Sale/SaleItem** - POS transactions
- **StockMovement** - Inventory tracking
- **EmployeeShift/ShiftClose** - Employee shift management and cash reconciliation
- **PurchaseOrder/PurchaseOrderItem** - Purchase order management
- **DigitalInvoice** - Digital invoice generation

**Helper Functions:**
```typescript
import { getRepository } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'

const productRepo = await getRepository(Product)
```

### Routing Structure

**App Router** (`src/app/`):
- `/` - Landing page
- `/auth/signin`, `/auth/signup` - Authentication
- `/dashboard` - Redirects to store selection or single store
- `/dashboard/select-store` - Multi-store selector
- `/dashboard/[storeSlug]/*` - Store-scoped dashboard pages
  - `pos` - Point of Sale
  - `products` - Product management
  - `categories` - Category management
  - `inventory` - Stock movements
  - `suppliers` - Supplier management
  - `purchase-orders` - Purchase orders
  - `employees` - Employee management
  - `shifts` - Shift management
  - `sales` - Sales history
  - `analytics` - Analytics dashboard
  - `reports` - Reports
  - `settings` - Store settings
  - `my-access` - Employee QR code access
- `/admin/*` - Super admin routes
- `/pos/[storeSlug]` - Standalone POS terminal
- `/invoice/[invoiceId]` - Digital invoice view/print

**API Routes** (`src/app/api/`):
- `/api/auth/*` - Authentication endpoints
- `/api/stores/[storeId]/*` - Store-scoped API routes
  - All routes protected by middleware
  - Automatically validates store access via Employment
  - Headers available: `x-store-id`, `x-store-slug`, `x-user-id`, `x-employment-role`
- `/api/admin/*` - Super admin API routes
- `/api/upload` - File upload handler

### Offline Support

**Key Files:**
- `src/lib/offline/queue.ts` - Offline operation queue manager
- `src/lib/offline/products-cache.ts` - Product caching for offline POS
- `src/hooks/use-offline-pos.ts` - React hook for offline POS operations

**Offline Queue:**
- Operations stored in localStorage when offline
- Automatic retry with exponential backoff
- Supports: CREATE_SALE, UPDATE_PRODUCT, CREATE_PRODUCT
- Syncs automatically when connection restored

### Context Providers

**ActiveEmployeeContext** (`src/contexts/active-employee-context.tsx`):
- Critical for POS operations
- Tracks currently logged-in employee for shift management
- Uses Employment PIN authentication
- Stores active employment ID in localStorage

**ThemeContext** (`src/contexts/theme-context.tsx`):
- Per-user color theme preferences
- Syncs with user.colorTheme in database

### Custom Hooks

- `use-offline-pos` - Offline POS operations with queue management
- `use-store` - Extract storeSlug from URL params
- `use-permission` - Check user permissions based on role
- `use-theme` - Theme management
- `use-debounce` - Debounce utility

## Key Development Patterns

### Store-Scoped API Routes

Always validate store access in API routes under `/api/stores/[storeId]`:

```typescript
// Middleware automatically validates access and sets headers
// Read headers in your route handler:
const storeId = request.headers.get('x-store-id')
const userId = request.headers.get('x-user-id')
const role = request.headers.get('x-employment-role')
```

### TypeORM Repository Pattern

```typescript
import { getRepository } from '@/lib/db'
import { Product } from '@/lib/db/entities/product.entity'

// In server components or API routes
const productRepo = await getRepository(Product)
const products = await productRepo.find({
  where: { storeId },
  relations: ['category', 'barcodes']
})
```

### Role-Based Access

Check permissions in components:
```typescript
import { usePermission } from '@/hooks/use-permission'

const canManageProducts = usePermission(['ADMIN'])
const canAccessInventory = usePermission(['ADMIN', 'STOCK_KEEPER'])
```

### Offline Operations

For POS operations that need offline support:
```typescript
import { useOfflinePOS } from '@/hooks/use-offline-pos'

const { createSale, isOnline } = useOfflinePOS(storeId)
// createSale automatically queues if offline
```

## Important Considerations

### Database Migrations

- Migrations are in `src/lib/db/migrations/`
- `synchronize` is disabled in production
- Run migrations manually via TypeORM CLI or scripts

### Multi-Store Context

- Always scope queries by `storeId` when working with store-specific data
- Product IDs, Category IDs, etc. are globally unique but should be filtered by store
- Employment relationships define which stores a user can access

### Authentication Flow

- Standard login requires ADMIN or OWNER role
- QR code login allows all employment roles (for POS terminals)
- `mustChangePassword` flag forces password change on next login
- Middleware enforces authentication on all protected routes

### Barcode System

- Products support multiple barcodes via `ProductBarcode` entity
- Supports EAN-13, UPC-A, CODE-128, CODE-39, etc.
- `@ericblade/quagga2` for barcode scanning in POS
- Weighted products (sold by weight) have special barcode format

### POS System

- Standalone POS route: `/pos/[storeSlug]`
- Requires active employee context (PIN authentication)
- Supports offline operation via queue system
- Cash drawer reconciliation via ShiftClose entity

### Invoice System

- Digital invoices generated per sale
- QR code on invoice for verification
- Print-friendly view at `/invoice/[invoiceId]`
- Uses `react-to-print` for printing

## UI Components

Built with Radix UI primitives and Tailwind CSS v4:
- `src/components/ui/` - Reusable UI components (buttons, dialogs, forms, etc.)
- shadcn/ui compatible component structure
- `components.json` - Component configuration
- Icons: `lucide-react`
- Toast notifications: `sonner`
- Charts: `recharts`

## Testing Database Connection

```bash
pnpm db:test
```

This script validates the database connection and lists all tables.

## Creating Initial Admin User

```bash
pnpm db:create-admin
```

Follow prompts to create a user with a store and ADMIN employment.
