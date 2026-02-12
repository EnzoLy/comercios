import { EntityManager, MoreThan, LessThan, Between } from 'typeorm'
import { ProductBatch } from '@/lib/db/entities/product-batch.entity'
import { Product } from '@/lib/db/entities/product.entity'
import { StockMovement, MovementType } from '@/lib/db/entities/stock-movement.entity'
import { BatchStockMovement } from '@/lib/db/entities/batch-stock-movement.entity'

export interface CreateBatchData {
  productId: string
  batchNumber?: string
  expirationDate: Date
  initialQuantity: number
  unitCost: number
  purchaseOrderId?: string
  purchaseOrderItemId?: string
  userId?: string
}

export interface BatchQueryOptions {
  productId?: string
  showExpired?: boolean
  expiringInDays?: number
  skip?: number
  take?: number
  sortBy?: 'expirationDate' | 'createdAt' | 'currentQuantity'
  sortOrder?: 'ASC' | 'DESC'
}

export interface ExpiringProductBatch {
  product: Product
  batches: Array<{
    id: string
    batchNumber?: string
    expirationDate: Date
    currentQuantity: number
    daysUntilExpiration: number
  }>
}

export class BatchManagementService {
  /**
   * Crea un nuevo lote y actualiza el stock del producto
   */
  async createBatch(
    batchData: CreateBatchData,
    manager: EntityManager
  ): Promise<ProductBatch> {
    const { productId, userId, ...batchFields } = batchData

    // 1. Verificar que el producto existe y tiene trackExpirationDates habilitado
    const product = await manager.findOne(Product, {
      where: { id: productId },
    })

    if (!product) {
      throw new Error('Producto no encontrado')
    }

    if (!product.trackExpirationDates) {
      throw new Error('Este producto no tiene seguimiento de vencimientos habilitado')
    }

    // 2. Crear el lote
    const batch = manager.create(ProductBatch, {
      ...batchFields,
      productId,
      currentQuantity: batchFields.initialQuantity,
    })

    await manager.save(batch)

    // 3. Crear movimiento de stock agregado
    const stockMovement = manager.create(StockMovement, {
      productId,
      type: MovementType.ADJUSTMENT,
      quantity: batchFields.initialQuantity,
      unitPrice: batchFields.unitCost,
      userId,
      notes: `Lote creado: ${batchFields.batchNumber || batch.id}`,
    })

    await manager.save(stockMovement)

    // 4. Crear movimiento a nivel de lote
    const batchMovement = manager.create(BatchStockMovement, {
      batchId: batch.id,
      productId,
      stockMovementId: stockMovement.id,
      type: MovementType.ADJUSTMENT,
      quantity: batchFields.initialQuantity,
      unitPrice: batchFields.unitCost,
      userId,
    })

    await manager.save(batchMovement)

    // 5. Actualizar stock del producto
    if (product.trackStock) {
      await manager.increment(
        Product,
        { id: productId },
        'currentStock',
        batchFields.initialQuantity
      )
    }

    return batch
  }

  /**
   * Obtiene lotes con filtros y paginación
   */
  async getBatchesByProduct(
    options: BatchQueryOptions,
    manager: EntityManager
  ): Promise<{ batches: ProductBatch[]; total: number }> {
    const {
      productId,
      showExpired = false,
      expiringInDays,
      skip = 0,
      take = 20,
      sortBy = 'expirationDate',
      sortOrder = 'ASC',
    } = options

    const now = new Date()
    const whereConditions: any = {}

    if (productId) {
      whereConditions.productId = productId
    }

    // Filtrar por vencimiento
    if (!showExpired && !expiringInDays) {
      // Solo lotes vigentes
      whereConditions.expirationDate = MoreThan(now)
    } else if (!showExpired && expiringInDays) {
      // Lotes que vencen en los próximos X días
      const futureDate = new Date(now)
      futureDate.setDate(futureDate.getDate() + expiringInDays)
      whereConditions.expirationDate = Between(now, futureDate)
    } else if (expiringInDays) {
      // Lotes que vencen en los próximos X días (incluyendo ya vencidos)
      const futureDate = new Date(now)
      futureDate.setDate(futureDate.getDate() + expiringInDays)
      whereConditions.expirationDate = LessThan(futureDate)
    }

    const [batches, total] = await manager.findAndCount(ProductBatch, {
      where: whereConditions,
      relations: ['product', 'product.category'],
      order: {
        [sortBy]: sortOrder,
      },
      skip,
      take,
    })

    return { batches, total }
  }

  /**
   * Obtiene productos con lotes próximos a vencer
   */
  async getExpiringBatches(
    storeId: string,
    daysThreshold: number,
    manager: EntityManager
  ): Promise<ExpiringProductBatch[]> {
    const now = new Date()
    const futureDate = new Date(now)
    futureDate.setDate(futureDate.getDate() + daysThreshold)

    // Obtener lotes que vencen en los próximos X días
    const batches = await manager
      .createQueryBuilder(ProductBatch, 'batch')
      .innerJoinAndSelect('batch.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.storeId = :storeId', { storeId })
      .andWhere('product.trackExpirationDates = :track', { track: true })
      .andWhere('batch.currentQuantity > 0')
      .andWhere('batch.expirationDate <= :futureDate', { futureDate })
      .orderBy('batch.expirationDate', 'ASC')
      .getMany()

    // Agrupar por producto
    const productMap = new Map<string, ExpiringProductBatch>()

    for (const batch of batches) {
      const productId = batch.productId
      const daysUntilExpiration = Math.ceil(
        (batch.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product: batch.product,
          batches: [],
        })
      }

      productMap.get(productId)!.batches.push({
        id: batch.id,
        batchNumber: batch.batchNumber,
        expirationDate: batch.expirationDate,
        currentQuantity: batch.currentQuantity,
        daysUntilExpiration,
      })
    }

    return Array.from(productMap.values())
  }

  /**
   * Reconcilia el stock del producto con la suma de sus lotes
   * Útil para corregir inconsistencias
   */
  async reconcileProductStock(
    productId: string,
    manager: EntityManager
  ): Promise<{ oldStock: number; newStock: number; difference: number }> {
    const product = await manager.findOne(Product, {
      where: { id: productId },
    })

    if (!product) {
      throw new Error('Producto no encontrado')
    }

    if (!product.trackExpirationDates) {
      throw new Error('Este producto no tiene seguimiento de vencimientos')
    }

    // Calcular stock real basado en lotes
    const batches = await manager.find(ProductBatch, {
      where: { productId },
    })

    const totalBatchStock = batches.reduce(
      (sum, batch) => sum + batch.currentQuantity,
      0
    )

    const oldStock = product.currentStock
    const difference = totalBatchStock - oldStock

    // Actualizar stock del producto
    await manager.update(Product, { id: productId }, { currentStock: totalBatchStock })

    return {
      oldStock,
      newStock: totalBatchStock,
      difference,
    }
  }

  /**
   * Actualiza la cantidad de un lote y crea un movimiento de ajuste
   */
  async adjustBatchQuantity(
    batchId: string,
    quantityAdjustment: number,
    userId: string,
    notes: string | undefined,
    manager: EntityManager
  ): Promise<ProductBatch> {
    const batch = await manager.findOne(ProductBatch, {
      where: { id: batchId },
      relations: ['product'],
    })

    if (!batch) {
      throw new Error('Lote no encontrado')
    }

    const newQuantity = batch.currentQuantity + quantityAdjustment

    if (newQuantity < 0) {
      throw new Error(
        `El ajuste resultaría en cantidad negativa. Cantidad actual: ${batch.currentQuantity}, Ajuste: ${quantityAdjustment}`
      )
    }

    // Actualizar cantidad del lote
    batch.currentQuantity = newQuantity
    await manager.save(batch)

    // Crear movimiento de stock agregado
    const stockMovement = manager.create(StockMovement, {
      productId: batch.productId,
      type: MovementType.ADJUSTMENT,
      quantity: quantityAdjustment,
      unitPrice: batch.unitCost,
      userId,
      notes: notes || `Ajuste de lote ${batch.batchNumber || batch.id}`,
    })

    await manager.save(stockMovement)

    // Crear movimiento a nivel de lote
    const batchMovement = manager.create(BatchStockMovement, {
      batchId: batch.id,
      productId: batch.productId,
      stockMovementId: stockMovement.id,
      type: MovementType.ADJUSTMENT,
      quantity: quantityAdjustment,
      unitPrice: batch.unitCost,
      userId,
      notes,
    })

    await manager.save(batchMovement)

    // Actualizar stock del producto
    if (batch.product.trackStock) {
      await manager.increment(
        Product,
        { id: batch.productId },
        'currentStock',
        quantityAdjustment
      )
    }

    return batch
  }
}
