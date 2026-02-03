-- =====================================================
-- Multi-Tenant Commerce Management System
-- Supabase Database Schema Setup (FIXED)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'STORE_OWNER', 'ADMIN', 'EMPLOYEE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE employment_role AS ENUM ('ADMIN', 'MANAGER', 'CASHIER', 'STOCK_KEEPER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'DAMAGE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'MOBILE', 'CREDIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE sale_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- TABLE: user
-- =====================================================

CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE: store
-- =====================================================

CREATE TABLE IF NOT EXISTS store (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    "ownerId" UUID NOT NULL,
    description TEXT,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_store_owner FOREIGN KEY ("ownerId")
        REFERENCES "user"(id) ON DELETE RESTRICT
);

-- =====================================================
-- TABLE: employment
-- =====================================================

CREATE TABLE IF NOT EXISTS employment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    role employment_role NOT NULL DEFAULT 'CASHIER',
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "startDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_employment_user FOREIGN KEY ("userId")
        REFERENCES "user"(id) ON DELETE CASCADE,
    CONSTRAINT fk_employment_store FOREIGN KEY ("storeId")
        REFERENCES store(id) ON DELETE CASCADE,
    CONSTRAINT uq_employment_user_store UNIQUE ("userId", "storeId")
);

-- =====================================================
-- TABLE: category
-- =====================================================

CREATE TABLE IF NOT EXISTS category (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "storeId" UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "parentId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_category_store FOREIGN KEY ("storeId")
        REFERENCES store(id) ON DELETE CASCADE,
    CONSTRAINT fk_category_parent FOREIGN KEY ("parentId")
        REFERENCES category(id) ON DELETE SET NULL,
    CONSTRAINT uq_category_store_name UNIQUE ("storeId", name)
);

-- =====================================================
-- TABLE: supplier
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "storeId" UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    "contactPerson" VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_supplier_store FOREIGN KEY ("storeId")
        REFERENCES store(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE: product
-- =====================================================

CREATE TABLE IF NOT EXISTS product (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "storeId" UUID NOT NULL,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "categoryId" UUID,
    "supplierId" UUID,
    "costPrice" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL(10, 2) NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minStockLevel" INTEGER NOT NULL DEFAULT 0,
    "maxStockLevel" INTEGER NOT NULL DEFAULT 1000,
    unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_product_store FOREIGN KEY ("storeId")
        REFERENCES store(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_category FOREIGN KEY ("categoryId")
        REFERENCES category(id) ON DELETE SET NULL,
    CONSTRAINT fk_product_supplier FOREIGN KEY ("supplierId")
        REFERENCES supplier(id) ON DELETE SET NULL,
    CONSTRAINT uq_product_store_sku UNIQUE ("storeId", sku),
    CONSTRAINT uq_product_store_barcode UNIQUE ("storeId", barcode)
);

-- =====================================================
-- TABLE: sale
-- =====================================================

CREATE TABLE IF NOT EXISTS sale (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "storeId" UUID NOT NULL,
    "cashierId" UUID NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    "paymentMethod" payment_method NOT NULL,
    "amountPaid" DECIMAL(10, 2) NOT NULL,
    change DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status sale_status NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    "completedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sale_store FOREIGN KEY ("storeId")
        REFERENCES store(id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_cashier FOREIGN KEY ("cashierId")
        REFERENCES "user"(id) ON DELETE RESTRICT
);

-- =====================================================
-- TABLE: sale_item
-- =====================================================

CREATE TABLE IF NOT EXISTS sale_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "saleId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productName" VARCHAR(255) NOT NULL,
    "productSku" VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    "unitPrice" DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sale_item_sale FOREIGN KEY ("saleId")
        REFERENCES sale(id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_item_product FOREIGN KEY ("productId")
        REFERENCES product(id) ON DELETE RESTRICT
);

-- =====================================================
-- TABLE: stock_movement
-- =====================================================

CREATE TABLE IF NOT EXISTS stock_movement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "storeId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    type movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "unitCost" DECIMAL(10, 2),
    notes TEXT,
    "userId" UUID NOT NULL,
    "saleId" UUID,
    "referenceNumber" VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_stock_movement_store FOREIGN KEY ("storeId")
        REFERENCES store(id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_movement_product FOREIGN KEY ("productId")
        REFERENCES product(id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_movement_user FOREIGN KEY ("userId")
        REFERENCES "user"(id) ON DELETE RESTRICT,
    CONSTRAINT fk_stock_movement_sale FOREIGN KEY ("saleId")
        REFERENCES sale(id) ON DELETE SET NULL
);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- user
DROP TRIGGER IF EXISTS update_updated_at ON "user";
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON "user"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- store
DROP TRIGGER IF EXISTS update_updated_at ON store;
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON store
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- employment
DROP TRIGGER IF EXISTS update_updated_at ON employment;
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON employment
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- category
DROP TRIGGER IF EXISTS update_updated_at ON category;
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON category
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- supplier
DROP TRIGGER IF EXISTS update_updated_at ON supplier;
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON supplier
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- product
DROP TRIGGER IF EXISTS update_updated_at ON product;
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON product
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- sale
DROP TRIGGER IF EXISTS update_updated_at ON sale;
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON sale
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DONE
-- =====================================================

SELECT 'Schema created successfully' AS status;
