-- =============================================
-- RLS Policies for Multi-Tenant Commerce System
-- Run this script to enable Row Level Security
-- =============================================

-- =============================================
-- Store table: no RLS needed (root entity)
-- User table: no RLS needed (global users)

-- =============================================
-- Employment
-- =============================================
ALTER TABLE employment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own employments" ON employment;
CREATE POLICY "Users can see their own employments"
ON employment FOR ALL
USING (
  user_id = current_setting('app.current_user_id', true)::uuid
  OR 
  EXISTS (
    SELECT 1 FROM store WHERE store.id = employment.store_id 
    AND store.owner_id = current_setting('app.current_user_id', true)::uuid
  )
);

-- =============================================
-- Category (storeId)
-- =============================================
ALTER TABLE category ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see categories of their stores" ON category;
CREATE POLICY "Users can only see categories of their stores"
ON category FOR ALL
USING (
  category."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Product (storeId)
-- =============================================
ALTER TABLE product ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see products of their stores" ON product;
CREATE POLICY "Users can only see products of their stores"
ON product FOR ALL
USING (
  product."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Product Barcode (productId -> product)
-- =============================================
ALTER TABLE product_barcode ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see barcodes of their store products" ON product_barcode;
CREATE POLICY "Users can only see barcodes of their store products"
ON product_barcode FOR ALL
USING (
  product_barcode."productId" IN (
    SELECT p.id FROM product p WHERE p."storeId"::text IN (
      SELECT e.store_id::text FROM employment e
      WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
      AND e.is_active = true
    )
  )
);

-- =============================================
-- Product Batch (productId -> product)
-- =============================================
ALTER TABLE product_batch ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see batches of their store products" ON product_batch;
CREATE POLICY "Users can only see batches of their store products"
ON product_batch FOR ALL
USING (
  product_batch."productId" IN (
    SELECT p.id FROM product p WHERE p."storeId"::text IN (
      SELECT e.store_id::text FROM employment e
      WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
      AND e.is_active = true
    )
  )
);

-- =============================================
-- Supplier (storeId)
-- =============================================
ALTER TABLE supplier ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see suppliers of their stores" ON supplier;
CREATE POLICY "Users can only see suppliers of their stores"
ON supplier FOR ALL
USING (
  supplier."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Supplier Contact (storeId)
-- =============================================
ALTER TABLE supplier_contact ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see contacts of their store suppliers" ON supplier_contact;
CREATE POLICY "Users can only see contacts of their store suppliers"
ON supplier_contact FOR ALL
USING (
  supplier_contact."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Supplier Document (storeId)
-- =============================================
ALTER TABLE supplier_document ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see documents of their store suppliers" ON supplier_document;
CREATE POLICY "Users can only see documents of their store suppliers"
ON supplier_document FOR ALL
USING (
  supplier_document."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Supplier Product (storeId)
-- =============================================
ALTER TABLE supplier_product ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see products of their store suppliers" ON supplier_product;
CREATE POLICY "Users can only see products of their store suppliers"
ON supplier_product FOR ALL
USING (
  supplier_product."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Supplier Product Price (storeId)
-- =============================================
ALTER TABLE supplier_product_price ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see prices of their store supplier products" ON supplier_product_price;
CREATE POLICY "Users can only see prices of their store supplier products"
ON supplier_product_price FOR ALL
USING (
  supplier_product_price."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Supplier Delivery Schedule (supplierId -> supplier)
-- =============================================
ALTER TABLE supplier_delivery_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see schedules of their store suppliers" ON supplier_delivery_schedule;
CREATE POLICY "Users can only see schedules of their store suppliers"
ON supplier_delivery_schedule FOR ALL
USING (
  supplier_delivery_schedule."supplierId" IN (
    SELECT s.id FROM supplier s WHERE s."storeId"::text IN (
      SELECT e.store_id::text FROM employment e
      WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
      AND e.is_active = true
    )
  )
);

-- =============================================
-- Supplier Commercial Terms (storeId)
-- =============================================
ALTER TABLE supplier_commercial_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see terms of their store suppliers" ON supplier_commercial_terms;
CREATE POLICY "Users can only see terms of their store suppliers"
ON supplier_commercial_terms FOR ALL
USING (
  supplier_commercial_terms."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Supplier Volume Discount (storeId)
-- =============================================
ALTER TABLE supplier_volume_discount ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see discounts of their store suppliers" ON supplier_volume_discount;
CREATE POLICY "Users can only see discounts of their store suppliers"
ON supplier_volume_discount FOR ALL
USING (
  supplier_volume_discount."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Sale (storeId)
-- =============================================
ALTER TABLE sale ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see sales of their stores" ON sale;
CREATE POLICY "Users can only see sales of their stores"
ON sale FOR ALL
USING (
  sale."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Sale Item (saleId -> sale)
-- =============================================
ALTER TABLE sale_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see items of their store sales" ON sale_item;
CREATE POLICY "Users can only see items of their store sales"
ON sale_item FOR ALL
USING (
  sale_item."saleId" IN (
    SELECT s.id FROM sale s WHERE s."storeId"::text IN (
      SELECT e.store_id::text FROM employment e
      WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
      AND e.is_active = true
    )
  )
);

-- =============================================
-- Stock Movement (productId -> product)
-- =============================================
ALTER TABLE stock_movement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see movements of their store products" ON stock_movement;
CREATE POLICY "Users can only see movements of their store products"
ON stock_movement FOR ALL
USING (
  stock_movement."productId" IN (
    SELECT p.id FROM product p WHERE p."storeId"::text IN (
      SELECT e.store_id::text FROM employment e
      WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
      AND e.is_active = true
    )
  )
);

-- =============================================
-- Batch Stock Movement (batchId -> product_batch -> product)
-- =============================================
ALTER TABLE batch_stock_movement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see batch movements of their store products" ON batch_stock_movement;
CREATE POLICY "Users can only see batch movements of their store products"
ON batch_stock_movement FOR ALL
USING (
  batch_stock_movement."batchId" IN (
    SELECT pb.id FROM product_batch pb
    INNER JOIN product p ON p.id = pb."productId"
    WHERE p."storeId"::text IN (
      SELECT e.store_id::text FROM employment e
      WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
      AND e.is_active = true
    )
  )
);

-- =============================================
-- Purchase Order (storeId)
-- =============================================
ALTER TABLE purchase_order ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see purchase orders of their stores" ON purchase_order;
CREATE POLICY "Users can only see purchase orders of their stores"
ON purchase_order FOR ALL
USING (
  purchase_order."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Purchase Order Item (purchaseOrderId -> purchase_order)
-- =============================================
ALTER TABLE purchase_order_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see items of their store purchase orders" ON purchase_order_item;
CREATE POLICY "Users can only see items of their store purchase orders"
ON purchase_order_item FOR ALL
USING (
  purchase_order_item."purchaseOrderId" IN (
    SELECT po.id FROM purchase_order po WHERE po."storeId"::text IN (
      SELECT e.store_id::text FROM employment e
      WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
      AND e.is_active = true
    )
  )
);

-- =============================================
-- Employee Shift (storeId)
-- =============================================
ALTER TABLE employee_shift ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see shifts of their stores" ON employee_shift;
CREATE POLICY "Users can only see shifts of their stores"
ON employee_shift FOR ALL
USING (
  employee_shift."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Shift Close (storeId)
-- =============================================
ALTER TABLE shift_close ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see shift closes of their stores" ON shift_close;
CREATE POLICY "Users can only see shift closes of their stores"
ON shift_close FOR ALL
USING (
  shift_close."storeId"::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Digital Invoice (store_id)
-- =============================================
ALTER TABLE digital_invoice ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see invoices of their store sales" ON digital_invoice;
CREATE POLICY "Users can only see invoices of their store sales"
ON digital_invoice FOR ALL
USING (
  digital_invoice.store_id::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Employment Access Token (employment_id -> employment)
-- =============================================
ALTER TABLE employment_access_token ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see tokens of their own employments" ON employment_access_token;
CREATE POLICY "Users can only see tokens of their own employments"
ON employment_access_token FOR ALL
USING (
  employment_access_token.employment_id IN (
    SELECT e.id FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid
  )
);

-- =============================================
-- Subscription Payment (store_id)
-- =============================================
ALTER TABLE subscription_payment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see payments of their stores" ON subscription_payment;
CREATE POLICY "Users can only see payments of their stores"
ON subscription_payment FOR ALL
USING (
  subscription_payment.store_id::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Audit Log (store_id)
-- =============================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only see audit logs of their stores" ON audit_log;
CREATE POLICY "Users can only see audit logs of their stores"
ON audit_log FOR ALL
USING (
  audit_log.store_id::text IN (
    SELECT e.store_id::text FROM employment e
    WHERE e.user_id = current_setting('app.current_user_id', true)::uuid 
    AND e.is_active = true
  )
);

-- =============================================
-- Create function to set user context
-- =============================================
CREATE OR REPLACE FUNCTION set_tenant_context(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
