import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { getDataSource } from '@/lib/db'
import { In } from 'typeorm'
import { Store } from '@/lib/db/entities/store.entity'
import { Employment } from '@/lib/db/entities/employment.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { ProductBarcode } from '@/lib/db/entities/product-barcode.entity'
import { ProductBatch } from '@/lib/db/entities/product-batch.entity'
import { Category } from '@/lib/db/entities/category.entity'
import { Supplier } from '@/lib/db/entities/supplier.entity'
import { SupplierContact } from '@/lib/db/entities/supplier-contact.entity'
import { SupplierCommercialTerms } from '@/lib/db/entities/supplier-commercial-terms.entity'
import { SupplierVolumeDiscount } from '@/lib/db/entities/supplier-volume-discount.entity'
import { SupplierProductPrice } from '@/lib/db/entities/supplier-product-price.entity'
import { SupplierDeliverySchedule } from '@/lib/db/entities/supplier-delivery-schedule.entity'
import { SupplierDocument } from '@/lib/db/entities/supplier-document.entity'
import { SupplierProduct } from '@/lib/db/entities/supplier-product.entity'
import { Sale } from '@/lib/db/entities/sale.entity'
import { SaleItem } from '@/lib/db/entities/sale-item.entity'
import { StockMovement } from '@/lib/db/entities/stock-movement.entity'
import { BatchStockMovement } from '@/lib/db/entities/batch-stock-movement.entity'
import { EmployeeShift } from '@/lib/db/entities/employee-shift.entity'
import { ShiftClose } from '@/lib/db/entities/shift-close.entity'
import { PurchaseOrder } from '@/lib/db/entities/purchase-order.entity'
import { PurchaseOrderItem } from '@/lib/db/entities/purchase-order-item.entity'
import { DigitalInvoice } from '@/lib/db/entities/digital-invoice.entity'
import { SubscriptionPayment } from '@/lib/db/entities/subscription-payment.entity'
import { EmploymentAccessToken } from '@/lib/db/entities/employment-access-token.entity'
import { AuditLog } from '@/lib/db/entities/audit-log.entity'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const session = await auth()
    const { storeId } = await params

    // Verificar que el usuario sea SUPER_ADMIN
    if (session?.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Solo super administradores pueden eliminar tiendas' },
        { status: 403 }
      )
    }

    const dataSource = await getDataSource()

    // Verificar que la tienda existe
    const store = await dataSource.getRepository(Store).findOne({
      where: { id: storeId },
      relations: ['owner'],
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      )
    }

    // Usar una transacción para asegurar que todo se elimine correctamente
    await dataSource.transaction(async (manager) => {
      console.log(`🗑️ Eliminando tienda: ${store.name} (${store.slug})`)

      // 1. Eliminar DigitalInvoices (facturas digitales)
      const invoiceCount = await manager.getRepository(DigitalInvoice).count({
        where: { storeId },
      })
      if (invoiceCount > 0) {
        await manager.getRepository(DigitalInvoice).delete({ storeId })
        console.log(`   ✓ ${invoiceCount} facturas digitales eliminadas`)
      }

      // 2. Eliminar SaleItems (items de ventas)
      // Primero obtenemos los IDs de las ventas de esta tienda
      const sales = await manager.getRepository(Sale).find({
        where: { storeId },
        select: ['id'],
      })

      if (sales.length > 0) {
        const saleIds = sales.map(s => s.id)
        const saleItemsResult = await manager
          .createQueryBuilder()
          .delete()
          .from(SaleItem)
          .where('saleId IN (:...saleIds)', { saleIds })
          .execute()
        if (saleItemsResult.affected && saleItemsResult.affected > 0) {
          console.log(`   ✓ ${saleItemsResult.affected} items de venta eliminados`)
        }
      }

      // 3. Eliminar Sales (ventas)
      const salesCount = await manager.getRepository(Sale).count({
        where: { storeId },
      })
      if (salesCount > 0) {
        await manager.getRepository(Sale).delete({ storeId })
        console.log(`   ✓ ${salesCount} ventas eliminadas`)
      }

      // 4. Eliminar ShiftClose (cierres de turno)
      const shiftCloseCount = await manager.getRepository(ShiftClose).count({
        where: { storeId },
      })
      if (shiftCloseCount > 0) {
        await manager.getRepository(ShiftClose).delete({ storeId })
        console.log(`   ✓ ${shiftCloseCount} cierres de turno eliminados`)
      }

      // 5. Eliminar EmployeeShift (turnos de empleados)
      const shiftsCount = await manager.getRepository(EmployeeShift).count({
        where: { storeId },
      })
      if (shiftsCount > 0) {
        await manager.getRepository(EmployeeShift).delete({ storeId })
        console.log(`   ✓ ${shiftsCount} turnos eliminados`)
      }

      // 6. Eliminar PurchaseOrderItems
      const purchaseOrders = await manager.getRepository(PurchaseOrder).find({
        where: { storeId },
        select: ['id'],
      })

      if (purchaseOrders.length > 0) {
        const poIds = purchaseOrders.map(po => po.id)
        const poItemsResult = await manager
          .createQueryBuilder()
          .delete()
          .from(PurchaseOrderItem)
          .where('purchaseOrderId IN (:...poIds)', { poIds })
          .execute()
        if (poItemsResult.affected && poItemsResult.affected > 0) {
          console.log(`   ✓ ${poItemsResult.affected} items de orden de compra eliminados`)
        }
      }

      // 7. Eliminar PurchaseOrders
      const poCount = await manager.getRepository(PurchaseOrder).count({
        where: { storeId },
      })
      if (poCount > 0) {
        await manager.getRepository(PurchaseOrder).delete({ storeId })
        console.log(`   ✓ ${poCount} órdenes de compra eliminadas`)
      }

      // 8. Primero obtenemos los productos de la tienda (los necesitamos para múltiples operaciones)
      const products = await manager.getRepository(Product).find({
        where: { storeId },
        select: ['id'],
      })

      // 9. Eliminar BatchStockMovements y StockMovements (relacionados con productos)
      if (products.length > 0) {
        const productIds = products.map(p => p.id)

        // Primero obtenemos los stock movements de estos productos
        const stockMovements = await manager.getRepository(StockMovement).find({
          where: { productId: In(productIds) },
          select: ['id'],
        })

        if (stockMovements.length > 0) {
          const smIds = stockMovements.map(sm => sm.id)

          // Eliminar BatchStockMovements
          const batchMovementsResult = await manager
            .createQueryBuilder()
            .delete()
            .from(BatchStockMovement)
            .where('stockMovementId IN (:...smIds)', { smIds })
            .execute()
          if (batchMovementsResult.affected && batchMovementsResult.affected > 0) {
            console.log(`   ✓ ${batchMovementsResult.affected} movimientos de lote eliminados`)
          }

          // Eliminar StockMovements
          await manager
            .createQueryBuilder()
            .delete()
            .from(StockMovement)
            .where('productId IN (:...productIds)', { productIds })
            .execute()
          console.log(`   ✓ ${stockMovements.length} movimientos de stock eliminados`)
        }
      }

      // 10. Eliminar ProductBatches
      if (products.length > 0) {
        const productIds = products.map(p => p.id)
        const batchesResult = await manager
          .createQueryBuilder()
          .delete()
          .from(ProductBatch)
          .where('productId IN (:...productIds)', { productIds })
          .execute()
        if (batchesResult.affected && batchesResult.affected > 0) {
          console.log(`   ✓ ${batchesResult.affected} lotes de producto eliminados`)
        }

        // 11. Eliminar ProductBarcodes
        const barcodesResult = await manager
          .createQueryBuilder()
          .delete()
          .from(ProductBarcode)
          .where('productId IN (:...productIds)', { productIds })
          .execute()
        if (barcodesResult.affected && barcodesResult.affected > 0) {
          console.log(`   ✓ ${barcodesResult.affected} códigos de barras eliminados`)
        }
      }

      // 12. Eliminar SupplierProducts
      const supplierProductsCount = await manager.getRepository(SupplierProduct).count({
        where: { storeId },
      })
      if (supplierProductsCount > 0) {
        await manager.getRepository(SupplierProduct).delete({ storeId })
        console.log(`   ✓ ${supplierProductsCount} productos de proveedor eliminados`)
      }

      // 13. Eliminar Products
      const productsCount = await manager.getRepository(Product).count({
        where: { storeId },
      })
      if (productsCount > 0) {
        await manager.getRepository(Product).delete({ storeId })
        console.log(`   ✓ ${productsCount} productos eliminados`)
      }

      // 14. Eliminar Categories
      const categoriesCount = await manager.getRepository(Category).count({
        where: { storeId },
      })
      if (categoriesCount > 0) {
        await manager.getRepository(Category).delete({ storeId })
        console.log(`   ✓ ${categoriesCount} categorías eliminadas`)
      }

      // 15. Eliminar datos de proveedores
      const suppliers = await manager
        .getRepository(Supplier)
        .find({ where: { storeId }, select: ['id'] })

      if (suppliers.length > 0) {
        const supplierIds = suppliers.map(s => s.id)

        // Eliminar datos relacionados de proveedores
        await manager.createQueryBuilder().delete().from(SupplierContact).where('supplierId IN (:...supplierIds)', { supplierIds }).execute()
        await manager.createQueryBuilder().delete().from(SupplierCommercialTerms).where('supplierId IN (:...supplierIds)', { supplierIds }).execute()
        await manager.createQueryBuilder().delete().from(SupplierVolumeDiscount).where('supplierId IN (:...supplierIds)', { supplierIds }).execute()
        await manager.createQueryBuilder().delete().from(SupplierProductPrice).where('supplierId IN (:...supplierIds)', { supplierIds }).execute()
        await manager.createQueryBuilder().delete().from(SupplierDeliverySchedule).where('supplierId IN (:...supplierIds)', { supplierIds }).execute()
        await manager.createQueryBuilder().delete().from(SupplierDocument).where('supplierId IN (:...supplierIds)', { supplierIds }).execute()

        await manager.getRepository(Supplier).delete({ storeId })
        console.log(`   ✓ ${suppliers.length} proveedores y sus datos eliminados`)
      }

      // 16. Eliminar EmploymentAccessTokens
      const employments = await manager.getRepository(Employment).find({
        where: { storeId },
        select: ['id'],
      })

      if (employments.length > 0) {
        const employmentIds = employments.map(e => e.id)
        const tokenResult = await manager
          .createQueryBuilder()
          .delete()
          .from(EmploymentAccessToken)
          .where('employmentId IN (:...employmentIds)', { employmentIds })
          .execute()
        if (tokenResult.affected && tokenResult.affected > 0) {
          console.log(`   ✓ ${tokenResult.affected} tokens de acceso eliminados`)
        }
      }

      // 17. Eliminar Employments
      const employmentsCount = await manager.getRepository(Employment).count({
        where: { storeId },
      })
      if (employmentsCount > 0) {
        await manager.getRepository(Employment).delete({ storeId })
        console.log(`   ✓ ${employmentsCount} empleos eliminados`)
      }

      // 18. Eliminar SubscriptionPayments
      const paymentsCount = await manager.getRepository(SubscriptionPayment).count({
        where: { storeId },
      })
      if (paymentsCount > 0) {
        await manager.getRepository(SubscriptionPayment).delete({ storeId })
        console.log(`   ✓ ${paymentsCount} pagos de suscripción eliminados`)
      }

      // 19. Eliminar AuditLogs (usa store_id con guión bajo)
      const auditCount = await manager.getRepository(AuditLog).count({
        where: { store_id: storeId },
      })
      if (auditCount > 0) {
        await manager.getRepository(AuditLog).delete({ store_id: storeId })
        console.log(`   ✓ ${auditCount} logs de auditoría eliminados`)
      }

      // 20. Finalmente, eliminar la tienda
      await manager.getRepository(Store).delete({ id: storeId })
      console.log(`   ✓ Tienda eliminada`)
      console.log(`✅ Eliminación completada: ${store.name}`)
    })

    return NextResponse.json({
      success: true,
      message: `Tienda "${store.name}" y todos sus datos han sido eliminados`,
    })
  } catch (error) {
    console.error('Error deleting store:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la tienda' },
      { status: 500 }
    )
  }
}
