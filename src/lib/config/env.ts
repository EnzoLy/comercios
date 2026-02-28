/**
 * Environment variable validation
 * Ensures all required env vars are present at startup
 */

interface EnvConfig {
  // Database
  DATABASE_URL: string

  // NextAuth
  NEXTAUTH_SECRET: string
  NEXTAUTH_URL: string

  // Optional: File storage
  STORAGE_PATH?: string

  // Optional: Email
  EMAIL_FROM?: string
  EMAIL_PROVIDER?: string
}

/**
 * Validate environment variables
 * Throws error if critical vars are missing
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = []

  // Check required variables
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ]

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`)
    }
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
      errors.push('DATABASE_URL must be a PostgreSQL connection string')
    }
  }

  // Validate NEXTAUTH_SECRET strength
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push('NEXTAUTH_SECRET must be at least 32 characters long')
  }

  // Validate NEXTAUTH_URL format
  if (process.env.NEXTAUTH_URL) {
    try {
      new URL(process.env.NEXTAUTH_URL)
    } catch {
      errors.push('NEXTAUTH_URL must be a valid URL')
    }
  }

  // If errors, throw and prevent startup
  if (errors.length > 0) {
    const message = `Environment validation failed:\n${errors.join('\n')}`
    console.error(message)
    throw new Error(message)
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
    STORAGE_PATH: process.env.STORAGE_PATH,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  }
}

/**
 * Get validated environment config
 * Call this at application startup
 */
let cachedConfig: EnvConfig | null = null

export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnv()
  }
  return cachedConfig
}

/**
 * Get environment info for health checks
 * Returns safe info (no secrets)
 */
export function getEnvInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    databaseConfigured: !!process.env.DATABASE_URL,
  }
}
