-- Supplier Management System Migration
-- Run this in Supabase SQL Editor

-- 1. Update Supplier table with new columns
ALTER TABLE supplier
ADD COLUMN IF NOT EXISTS "taxId" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "website" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS "rating" DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS "isPreferred" BOOLEAN DEFAULT false;

-- Add comments for deprecated columns
COMMENT ON COLUMN supplier."contactPerson" IS 'Deprecated: use supplier_contact table';
COMMENT ON COLUMN supplier."email" IS 'Deprecated: use supplier_contact table';
COMMENT ON COLUMN supplier."phone" IS 'Deprecated: use supplier_contact table';

-- 2. Create SupplierContact table
CREATE TABLE IF NOT EXISTS supplier_contact (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplierId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "position" VARCHAR(100),
  "email" VARCHAR(255),
  "phone" VARCHAR(20),
  "mobilePhone" VARCHAR(20),
  "isPrimary" BOOLEAN DEFAULT false,
  "isActive" BOOLEAN DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("supplierId") REFERENCES supplier("id") ON DELETE CASCADE,
  FOREIGN KEY ("storeId") REFERENCES store("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_supplier_contact_supplier" ON supplier_contact("supplierId");
CREATE INDEX IF NOT EXISTS "idx_supplier_contact_store" ON supplier_contact("storeId");
CREATE INDEX IF NOT EXISTS "idx_supplier_contact_primary" ON supplier_contact("supplierId", "isPrimary");

-- 3. Create SupplierCommercialTerms table
CREATE TABLE IF NOT EXISTS supplier_commercial_terms (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplierId" UUID NOT NULL UNIQUE,
  "storeId" UUID NOT NULL,
  "paymentTermsDays" INTEGER,
  "paymentMethod" VARCHAR(100),
  "earlyPaymentDiscount" DECIMAL(5,2),
  "earlyPaymentDays" INTEGER,
  "minimumPurchaseAmount" DECIMAL(12,2),
  "minimumPurchaseQuantity" INTEGER,
  "leadTimeDays" INTEGER,
  "deliveryFrequency" VARCHAR(50),
  "currency" VARCHAR(3) DEFAULT 'USD',
  "creditLimit" DECIMAL(12,2),
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("supplierId") REFERENCES supplier("id") ON DELETE CASCADE,
  FOREIGN KEY ("storeId") REFERENCES store("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_supplier_commercial_terms_supplier" ON supplier_commercial_terms("supplierId");
CREATE INDEX IF NOT EXISTS "idx_supplier_commercial_terms_store" ON supplier_commercial_terms("storeId");

-- 4. Create SupplierVolumeDiscount table
CREATE TABLE IF NOT EXISTS supplier_volume_discount (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "commercialTermsId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "minimumQuantity" INTEGER,
  "minimumAmount" DECIMAL(12,2),
  "discountPercentage" DECIMAL(5,2) NOT NULL,
  "description" VARCHAR(255),
  "validFrom" DATE,
  "validUntil" DATE,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("commercialTermsId") REFERENCES supplier_commercial_terms("id") ON DELETE CASCADE,
  FOREIGN KEY ("storeId") REFERENCES store("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_supplier_volume_discount_terms" ON supplier_volume_discount("commercialTermsId");
CREATE INDEX IF NOT EXISTS "idx_supplier_volume_discount_store" ON supplier_volume_discount("storeId");
CREATE INDEX IF NOT EXISTS "idx_supplier_volume_discount_active" ON supplier_volume_discount("commercialTermsId", "isActive");

-- 5. Create SupplierProduct table (junction table)
CREATE TABLE IF NOT EXISTS supplier_product (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplierId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "supplierSku" VARCHAR(100),
  "isPreferred" BOOLEAN DEFAULT false,
  "lastPurchaseDate" DATE,
  "lastPurchasePrice" DECIMAL(10,2),
  "isActive" BOOLEAN DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("supplierId") REFERENCES supplier("id") ON DELETE CASCADE,
  FOREIGN KEY ("productId") REFERENCES product("id") ON DELETE CASCADE,
  FOREIGN KEY ("storeId") REFERENCES store("id") ON DELETE CASCADE,
  UNIQUE ("supplierId", "productId")
);

CREATE INDEX IF NOT EXISTS "idx_supplier_product_supplier" ON supplier_product("supplierId");
CREATE INDEX IF NOT EXISTS "idx_supplier_product_product" ON supplier_product("productId");
CREATE INDEX IF NOT EXISTS "idx_supplier_product_store" ON supplier_product("storeId");
CREATE INDEX IF NOT EXISTS "idx_supplier_product_preferred" ON supplier_product("supplierId", "isPreferred");
CREATE INDEX IF NOT EXISTS "idx_supplier_product_active" ON supplier_product("productId", "isActive");

-- 6. Create SupplierProductPrice table (critical for price history)
CREATE TABLE IF NOT EXISTS supplier_product_price (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplierId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "currency" VARCHAR(3) DEFAULT 'USD',
  "effectiveDate" DATE NOT NULL,
  "endDate" DATE,
  "sku" VARCHAR(100),
  "minimumOrderQuantity" INTEGER,
  "packSize" INTEGER,
  "createdBy" UUID,
  "hasAlert" BOOLEAN DEFAULT false,
  "changePercentage" DECIMAL(5,2),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("supplierId") REFERENCES supplier("id") ON DELETE CASCADE,
  FOREIGN KEY ("productId") REFERENCES product("id") ON DELETE CASCADE,
  FOREIGN KEY ("storeId") REFERENCES store("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_supplier_product_price_supplier_product_date" ON supplier_product_price("supplierId", "productId", "effectiveDate");
CREATE INDEX IF NOT EXISTS "idx_supplier_product_price_product_end" ON supplier_product_price("productId", "endDate");
CREATE INDEX IF NOT EXISTS "idx_supplier_product_price_current" ON supplier_product_price("supplierId", "productId", "endDate") WHERE "endDate" IS NULL;

-- 7. Create SupplierDeliverySchedule table
CREATE TABLE IF NOT EXISTS supplier_delivery_schedule (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplierId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "dayOfWeek" INTEGER NOT NULL CHECK ("dayOfWeek" >= 0 AND "dayOfWeek" <= 6),
  "deliveryTime" TIME,
  "deliveryTimeEnd" TIME,
  "isActive" BOOLEAN DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("supplierId") REFERENCES supplier("id") ON DELETE CASCADE,
  FOREIGN KEY ("storeId") REFERENCES store("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_supplier_delivery_schedule_supplier" ON supplier_delivery_schedule("supplierId");
CREATE INDEX IF NOT EXISTS "idx_supplier_delivery_schedule_store" ON supplier_delivery_schedule("storeId");
CREATE INDEX IF NOT EXISTS "idx_supplier_delivery_schedule_day" ON supplier_delivery_schedule("supplierId", "dayOfWeek", "isActive");

-- 8. Create SupplierDocument table
CREATE TABLE IF NOT EXISTS supplier_document (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplierId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "documentType" VARCHAR(50) DEFAULT 'OTHER',
  "fileName" VARCHAR(255) NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER,
  "mimeType" VARCHAR(100),
  "uploadedBy" UUID,
  "validFrom" DATE,
  "validUntil" DATE,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("supplierId") REFERENCES supplier("id") ON DELETE CASCADE,
  FOREIGN KEY ("storeId") REFERENCES store("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_supplier_document_supplier" ON supplier_document("supplierId");
CREATE INDEX IF NOT EXISTS "idx_supplier_document_store" ON supplier_document("storeId");
CREATE INDEX IF NOT EXISTS "idx_supplier_document_type" ON supplier_document("supplierId", "documentType", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_supplier_document_active" ON supplier_document("supplierId", "isActive");

-- 9. Create PurchaseOrder table
CREATE TABLE IF NOT EXISTS purchase_order (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "storeId" UUID NOT NULL,
  "supplierId" UUID NOT NULL,
  "orderNumber" VARCHAR(50) NOT NULL UNIQUE,
  "orderDate" DATE NOT NULL,
  "expectedDeliveryDate" DATE,
  "actualDeliveryDate" DATE,
  "status" VARCHAR(50) DEFAULT 'DRAFT',
  "subtotal" DECIMAL(12,2) NOT NULL,
  "taxAmount" DECIMAL(12,2),
  "shippingCost" DECIMAL(10,2),
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "createdBy" UUID NOT NULL,
  "approvedBy" UUID,
  "approvedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("storeId") REFERENCES store("id") ON DELETE CASCADE,
  FOREIGN KEY ("supplierId") REFERENCES supplier("id") ON DELETE RESTRICT,
  FOREIGN KEY ("createdBy") REFERENCES "user"("id")
);

CREATE INDEX IF NOT EXISTS "idx_purchase_order_store_status" ON purchase_order("storeId", "status", "orderDate");
CREATE INDEX IF NOT EXISTS "idx_purchase_order_supplier" ON purchase_order("supplierId", "status");
CREATE INDEX IF NOT EXISTS "idx_purchase_order_number" ON purchase_order("orderNumber");

-- 10. Create PurchaseOrderItem table
CREATE TABLE IF NOT EXISTS purchase_order_item (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchaseOrderId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "quantityOrdered" INTEGER NOT NULL,
  "quantityReceived" INTEGER DEFAULT 0,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "discountPercentage" DECIMAL(5,2) DEFAULT 0,
  "taxRate" DECIMAL(5,2),
  "totalPrice" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("purchaseOrderId") REFERENCES purchase_order("id") ON DELETE CASCADE,
  FOREIGN KEY ("productId") REFERENCES product("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_purchase_order_item_order" ON purchase_order_item("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "idx_purchase_order_item_product" ON purchase_order_item("productId");
CREATE INDEX IF NOT EXISTS "idx_purchase_order_item_order_product" ON purchase_order_item("purchaseOrderId", "productId");

-- 11. Update Product table to add comment for supplierId
COMMENT ON COLUMN product."supplierId" IS 'Deprecated: primary supplier, use supplier_product for multi-supplier support';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Supplier Management System migration completed successfully!';
END $$;
