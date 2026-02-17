/**
 * Offline operation queue using IndexedDB.
 * Stores pending operations persistently and syncs when online.
 */

import {
  addQueueOperation,
  getQueueOperations,
  getQueueOperationsByStatus,
  updateQueueOperation,
  removeQueueOperation,
  clearQueueByStatus,
  clearAllQueue,
} from './indexed-db'

/**
 * Offline operation types
 */
export interface OfflineOperation {
  id: string
  type: 'CREATE_SALE' | 'UPDATE_PRODUCT' | 'CREATE_PRODUCT'
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH'
  body: any
  timestamp: number
  retries: number
  lastRetry?: number
  status: 'pending' | 'syncing' | 'failed'
  error?: string
}

/**
 * Offline queue manager using IndexedDB
 */
class OfflineQueueManager {
  private readonly MAX_RETRIES = 5
  private readonly RETRY_DELAY = 1000
  private isOnline: boolean = true
  private isProcessing: boolean = false
  private syncCallbacks: Set<(operation: OfflineOperation) => void> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      window.addEventListener('online', () => this.handleOnline())
      window.addEventListener('offline', () => this.handleOffline())
    }
  }

  /**
   * Check if currently online
   */
  getStatus(): boolean {
    return this.isOnline
  }

  /**
   * Get all queued operations
   */
  async getQueue(): Promise<OfflineOperation[]> {
    if (typeof window === 'undefined') return []

    try {
      return await getQueueOperations()
    } catch (error) {
      console.error('Error reading queue:', error)
      return []
    }
  }

  /**
   * Get count of pending operations
   */
  async getPendingCount(): Promise<number> {
    try {
      const pending = await getQueueOperationsByStatus('pending')
      return pending.length
    } catch {
      return 0
    }
  }

  /**
   * Add operation to queue
   */
  async add(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<string> {
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const newOperation: OfflineOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    }

    await addQueueOperation(newOperation)

    // Try to sync immediately if online
    if (this.isOnline) {
      this.processQueue()
    }

    return id
  }

  /**
   * Remove operation from queue
   */
  async remove(operationId: string): Promise<void> {
    await removeQueueOperation(operationId)
  }

  /**
   * Update operation status
   */
  async updateStatus(operationId: string, status: OfflineOperation['status'], error?: string): Promise<void> {
    const updates: Record<string, any> = { status }
    if (error) updates.error = error

    await updateQueueOperation(operationId, updates)
  }

  /**
   * Process queued operations
   */
  async processQueue(): Promise<void> {
    if (!this.isOnline || this.isProcessing) {
      return
    }

    this.isProcessing = true

    try {
      const pendingOps = await getQueueOperationsByStatus('pending')

      for (const operation of pendingOps) {
        await this.processOperation(operation)
        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: OfflineOperation): Promise<void> {
    const now = Date.now()
    const retryDelay = this.RETRY_DELAY * Math.pow(2, operation.retries)

    // Check if we should retry yet
    if (operation.lastRetry && now - operation.lastRetry < retryDelay) {
      return
    }

    await this.updateStatus(operation.id, 'syncing')
    this.notifyCallbacks({ ...operation, status: 'syncing' })

    try {
      const response = await fetch(operation.endpoint, {
        method: operation.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation.body),
      })

      if (response.ok) {
        await this.remove(operation.id)
        console.log(`Synced operation: ${operation.id}`)
        this.notifyCallbacks({ ...operation, status: 'pending' }) // trigger UI refresh
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (operation.retries < this.MAX_RETRIES) {
        await updateQueueOperation(operation.id, {
          retries: operation.retries + 1,
          lastRetry: now,
          status: 'pending',
          error: errorMessage,
        })
      } else {
        await this.updateStatus(operation.id, 'failed', errorMessage)
        console.error(`Failed to sync operation after ${this.MAX_RETRIES} retries:`, operation)
      }

      this.notifyCallbacks({ ...operation, error: errorMessage })
    }
  }

  /**
   * Register callback for operation updates
   */
  onSync(callback: (operation: OfflineOperation) => void): () => void {
    this.syncCallbacks.add(callback)
    return () => {
      this.syncCallbacks.delete(callback)
    }
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(operation: OfflineOperation): void {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(operation)
      } catch (error) {
        console.error('Error in sync callback:', error)
      }
    })
  }

  /**
   * Handle coming online
   */
  private handleOnline(): void {
    this.isOnline = true
    console.log('Device is online - syncing queue')
    this.processQueue()
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    this.isOnline = false
    console.log('Device is offline - queueing operations')
  }

  /**
   * Clear all failed operations
   */
  async clearFailed(): Promise<void> {
    await clearQueueByStatus('failed')
  }

  /**
   * Clear all operations (use with caution)
   */
  async clearAll(): Promise<void> {
    await clearAllQueue()
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueManager()
