/**
 * Database query retry helper
 * Handles connection timeouts and transient errors
 */

interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  backoff?: boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 100,
  backoff: true,
}

/**
 * Executes a database query with automatic retry on connection errors
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Retry on connection errors
      const shouldRetry =
        errorMessage.includes('Connection terminated') ||
        errorMessage.includes('Connection timeout') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ETIMEDOUT')

      if (!shouldRetry || attempt === opts.maxAttempts) {
        throw error
      }

      // Calculate delay with exponential backoff if enabled
      const delay = opts.backoff
        ? opts.delayMs * Math.pow(2, attempt - 1)
        : opts.delayMs

      console.warn(
        `Database operation failed (attempt ${attempt}/${opts.maxAttempts}), retrying in ${delay}ms...`,
        errorMessage
      )

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Operation failed after retries')
}
