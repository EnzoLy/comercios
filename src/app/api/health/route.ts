import { NextResponse } from 'next/server'
import { getDataSource } from '@/lib/db'

export const runtime = 'nodejs'

/**
 * Health check endpoint for monitoring and load balancers
 * Returns 200 if application is healthy
 * Returns 503 if critical services are down
 */
export async function GET() {
  try {
    // Check database connection
    const dataSource = await getDataSource()
    if (!dataSource.isInitialized) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          reason: 'Database not initialized',
        },
        { status: 503 }
      )
    }

    // Perform a simple query to verify database is responsive
    try {
      await dataSource.query('SELECT 1')
    } catch (error) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          reason: 'Database query failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 503 }
      )
    }

    // All checks passed
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        api: 'ok',
      },
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        reason: 'Internal error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
