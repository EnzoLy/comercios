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
 * Offline queue manager using localStorage
 */
class OfflineQueueManager {
  private readonly QUEUE_KEY = 'offline_queue'
  private readonly MAX_RETRIES = 5
  private readonly RETRY_DELAY = 1000 // Start with 1 second
  private isOnline: boolean = true
  private isProcessing: boolean = false
  private syncCallbacks: Set<(operation: OfflineOperation) => void> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine

      // Listen for online/offline events
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
  getQueue(): OfflineOperation[] {
    if (typeof window === 'undefined') return []

    try {
      const queue = localStorage.getItem(this.QUEUE_KEY)
      return queue ? JSON.parse(queue) : []
    } catch (error) {
      console.error('Error reading queue:', error)
      return []
    }
  }

  /**
   * Get count of pending operations
   */
  getPendingCount(): number {
    return this.getQueue().filter(op => op.status === 'pending').length
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

    const queue = this.getQueue()
    queue.push(newOperation)

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue))
    }

    // Try to sync immediately if online
    if (this.isOnline) {
      this.processQueue()
    }

    return id
  }

  /**
   * Remove operation from queue
   */
  remove(operationId: string): void {
    const queue = this.getQueue()
    const filtered = queue.filter(op => op.id !== operationId)

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(filtered))
    }
  }

  /**
   * Update operation status
   */
  updateStatus(operationId: string, status: OfflineOperation['status'], error?: string): void {
    const queue = this.getQueue()
    const operation = queue.find(op => op.id === operationId)

    if (operation) {
      operation.status = status
      if (error) operation.error = error

      if (typeof window !== 'undefined') {
        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue))
      }
    }
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
      const queue = this.getQueue()
      const pendingOps = queue.filter(op => op.status === 'pending')

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

    this.updateStatus(operation.id, 'syncing')
    this.notifyCallbacks(operation)

    try {
      const response = await fetch(operation.endpoint, {
        method: operation.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation.body),
      })

      if (response.ok) {
        // Success - remove from queue
        this.remove(operation.id)
        console.log(`Synced operation: ${operation.id}`)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Check if we should retry
      if (operation.retries < this.MAX_RETRIES) {
        const queue = this.getQueue()
        const op = queue.find(o => o.id === operation.id)

        if (op) {
          op.retries++
          op.lastRetry = now
          op.status = 'pending'
          op.error = errorMessage

          if (typeof window !== 'undefined') {
            localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue))
          }
        }
      } else {
        // Max retries reached - mark as failed
        this.updateStatus(operation.id, 'failed', errorMessage)
        console.error(`Failed to sync operation after ${this.MAX_RETRIES} retries:`, operation)
      }

      this.notifyCallbacks(operation)
    }
  }

  /**
   * Register callback for operation updates
   */
  onSync(callback: (operation: OfflineOperation) => void): () => void {
    this.syncCallbacks.add(callback)

    // Return unsubscribe function
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
  clearFailed(): void {
    const queue = this.getQueue()
    const filtered = queue.filter(op => op.status !== 'failed')

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(filtered))
    }
  }

  /**
   * Clear all operations (use with caution)
   */
  clearAll(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.QUEUE_KEY)
    }
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueManager()
