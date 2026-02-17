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
  private readonly SYNC_INTERVAL_MS = 15000 // retry pending ops every 15s while online
  private isOnline: boolean = true
  private isProcessing: boolean = false
  private syncCallbacks: Set<(operation: OfflineOperation) => void> = new Set()
  private syncCompleteCallbacks: Set<(synced: number, failed: number) => void> = new Set()
  private syncInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      window.addEventListener('online', () => this.handleOnline())
      window.addEventListener('offline', () => this.handleOffline())
      // Reset any operations stuck in 'syncing' state (e.g. after page refresh mid-sync)
      this.resetStuckSyncingOps()
      // If we start online with pending ops, begin the interval
      if (this.isOnline) this.startSyncInterval()
    }
  }

  /**
   * Reset operations stuck in 'syncing' state back to 'pending'.
   * This can happen if the browser is closed or the page refreshed during a sync.
   */
  private async resetStuckSyncingOps(): Promise<void> {
    try {
      const syncingOps = await getQueueOperationsByStatus('syncing')
      for (const op of syncingOps) {
        await updateQueueOperation(op.id, { status: 'pending' })
      }
      if (syncingOps.length > 0) {
        console.log(`Reset ${syncingOps.length} stuck syncing operation(s) to pending`)
      }
    } catch (error) {
      console.error('Error resetting stuck syncing operations:', error)
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

    // Try to sync immediately if online and start interval to handle retries
    if (this.isOnline) {
      this.processQueue()
      this.startSyncInterval()
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
    let synced = 0
    let failed = 0

    try {
      const pendingOps = await getQueueOperationsByStatus('pending')
      if (pendingOps.length === 0) return

      for (const operation of pendingOps) {
        const result = await this.processOperation(operation)
        if (result === 'synced') synced++
        else if (result === 'failed') failed++
        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (synced > 0 || failed > 0) {
        this.syncCompleteCallbacks.forEach(cb => {
          try { cb(synced, failed) } catch {}
        })
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: OfflineOperation): Promise<'synced' | 'failed' | 'retry'> {
    const now = Date.now()
    const retryDelay = this.RETRY_DELAY * Math.pow(2, operation.retries)

    // Check if we should retry yet
    if (operation.lastRetry && now - operation.lastRetry < retryDelay) {
      return 'retry'
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
        return 'synced'
      } else {
        // Read the response body to get the actual error message from the server
        const body = await response.json().catch(() => ({}))
        const serverMessage = body?.error || body?.message || ''
        const errorMessage = serverMessage
          ? `HTTP ${response.status}: ${serverMessage}`
          : `HTTP ${response.status}`

        // 4xx errors (except 408 Request Timeout and 429 Too Many Requests) will never
        // succeed on retry — mark as failed immediately to avoid burning all retries.
        const isNonRetryable =
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 408 &&
          response.status !== 429
        if (isNonRetryable) {
          await this.updateStatus(operation.id, 'failed', errorMessage)
          console.error(`Non-retryable error for operation ${operation.id}:`, errorMessage)
          this.notifyCallbacks({ ...operation, status: 'failed', error: errorMessage })
          return 'failed'
        }
        throw new Error(errorMessage)
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
        this.notifyCallbacks({ ...operation, error: errorMessage })
        return 'retry'
      } else {
        await this.updateStatus(operation.id, 'failed', errorMessage)
        console.error(`Failed to sync operation after ${this.MAX_RETRIES} retries:`, operation)
        this.notifyCallbacks({ ...operation, error: errorMessage })
        return 'failed'
      }
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
   * Register callback for when the full queue finishes processing.
   * Receives the count of successfully synced and failed operations.
   */
  onSyncComplete(callback: (synced: number, failed: number) => void): () => void {
    this.syncCompleteCallbacks.add(callback)
    return () => {
      this.syncCompleteCallbacks.delete(callback)
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
    this.startSyncInterval()
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    this.isOnline = false
    console.log('Device is offline - queueing operations')
    this.stopSyncInterval()
  }

  private startSyncInterval(): void {
    if (this.syncInterval) return
    this.syncInterval = setInterval(() => {
      if (this.isOnline) this.processQueue()
    }, this.SYNC_INTERVAL_MS)
  }

  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  /**
   * Reset all failed operations back to pending so they can be retried.
   */
  async retryFailed(): Promise<void> {
    const failedOps = await getQueueOperationsByStatus('failed')
    for (const op of failedOps) {
      await updateQueueOperation(op.id, {
        status: 'pending',
        retries: 0,
        lastRetry: undefined,
        error: undefined,
      })
    }
    if (failedOps.length > 0 && this.isOnline) {
      this.processQueue()
    }
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
