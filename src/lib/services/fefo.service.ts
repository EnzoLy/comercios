import { EntityManager, LessThan, MoreThan } from 'typeorm'
import { ProductBatch } from '@/lib/db/entities/product-batch.entity'

export interface BatchAllocation {
  batchId: string
  quantity: number
  expirationDate: Date
  isExpired: boolean
}

export class FEFOService {
  /**
   * Selecciona lotes para cumplir con la cantidad solicitada usando algoritmo FEFO
   * (First Expired, First Out - primero vencido, primero sale)
   *
   * @param productId - ID del producto
   * @param requestedQuantity - Cantidad solicitada
   * @param manager - EntityManager para ejecutar queries en transacción
   * @param includeExpired - Si incluir lotes vencidos (default: false)
   * @returns Array de asignaciones de lotes
   * @throws Error si no hay suficiente stock disponible
   */
  async selectBatchesForQuantity(
    productId: string,
    requestedQuantity: number,
    manager: EntityManager,
    includeExpired: boolean = false
  ): Promise<BatchAllocation[]> {
    const now = new Date()

    // 1. Obtener lotes disponibles ordenados por fecha de vencimiento (FEFO)
    const whereCondition: any = {
      productId,
      currentQuantity: MoreThan(0),
    }

    // Si no incluimos vencidos, filtrar por fecha
    if (!includeExpired) {
      whereCondition.expirationDate = MoreThan(now)
    }

    const availableBatches = await manager.find(ProductBatch, {
      where: whereCondition,
      order: {
        expirationDate: 'ASC', // Los que vencen primero salen primero
      },
    })

    // 2. Calcular stock disponible total
    const totalAvailableStock = availableBatches.reduce(
      (sum, batch) => sum + batch.currentQuantity,
      0
    )

    // 3. Si no hay suficiente stock, lanzar error
    if (totalAvailableStock < requestedQuantity) {
      // Si no estábamos incluyendo vencidos, verificar si hay stock vencido
      if (!includeExpired) {
        const expiredBatches = await manager.find(ProductBatch, {
          where: {
            productId,
            currentQuantity: MoreThan(0),
            expirationDate: LessThan(now),
          },
        })

        const expiredStock = expiredBatches.reduce(
          (sum, batch) => sum + batch.currentQuantity,
          0
        )

        if (expiredStock > 0) {
          throw new Error(
            `Stock vigente insuficiente. Disponible: ${totalAvailableStock}, Requerido: ${requestedQuantity}. ` +
            `Hay ${expiredStock} unidades en lotes vencidos.`
          )
        }
      }

      throw new Error(
        `Stock insuficiente. Disponible: ${totalAvailableStock}, Requerido: ${requestedQuantity}`
      )
    }

    // 4. Asignar lotes usando FEFO
    const allocations: BatchAllocation[] = []
    let remainingQuantity = requestedQuantity

    for (const batch of availableBatches) {
      if (remainingQuantity <= 0) break

      const quantityFromThisBatch = Math.min(batch.currentQuantity, remainingQuantity)

      allocations.push({
        batchId: batch.id,
        quantity: quantityFromThisBatch,
        expirationDate: batch.expirationDate,
        isExpired: batch.expirationDate < now,
      })

      remainingQuantity -= quantityFromThisBatch
    }

    return allocations
  }

  /**
   * Verifica si hay suficiente stock disponible para la cantidad solicitada
   */
  async hasAvailableStock(
    productId: string,
    requestedQuantity: number,
    manager: EntityManager,
    includeExpired: boolean = false
  ): Promise<boolean> {
    const now = new Date()
    const whereCondition: any = {
      productId,
      currentQuantity: MoreThan(0),
    }

    if (!includeExpired) {
      whereCondition.expirationDate = MoreThan(now)
    }

    const availableBatches = await manager.find(ProductBatch, {
      where: whereCondition,
    })

    const totalAvailableStock = availableBatches.reduce(
      (sum, batch) => sum + batch.currentQuantity,
      0
    )

    return totalAvailableStock >= requestedQuantity
  }

  /**
   * Obtiene el próximo lote a vencer para un producto
   */
  async getNextExpiringBatch(
    productId: string,
    manager: EntityManager
  ): Promise<ProductBatch | null> {
    const batch = await manager.findOne(ProductBatch, {
      where: {
        productId,
        currentQuantity: MoreThan(0),
      },
      order: {
        expirationDate: 'ASC',
      },
    })

    return batch
  }
}
