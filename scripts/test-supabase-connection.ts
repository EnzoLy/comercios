/**
 * Test Supabase Database Connection
 *
 * Run this script to verify your Supabase connection is working:
 * npx ts-node scripts/test-supabase-connection.ts
 */

import 'reflect-metadata'
import { DataSource } from 'typeorm'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n')

  // Check environment variables
  console.log('📋 Environment Check:')
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`)
  console.log(`NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Not set'}`)
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}\n`)

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env')
    console.log('\nExpected format:')
    console.log('DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres"\n')
    process.exit(1)
  }

  // Parse connection string
  try {
    const url = new URL(process.env.DATABASE_URL)
    console.log('🔗 Connection Details:')
    console.log(`Host: ${url.hostname}`)
    console.log(`Port: ${url.port}`)
    console.log(`Database: ${url.pathname.slice(1)}`)
    console.log(`Username: ${url.username}`)
    console.log(`Password: ${'*'.repeat(10)}\n`)

    // Verify it's a Supabase URL
    if (url.hostname.includes('supabase.com')) {
      console.log('✅ Supabase URL detected')

      if (url.port === '6543') {
        console.log('✅ Using connection pooler (port 6543) - Recommended!\n')
      } else if (url.port === '5432') {
        console.log('⚠️  Using direct connection (port 5432) - Consider using pooler (6543)\n')
      }
    } else {
      console.log('ℹ️  Not a Supabase URL (local PostgreSQL?)\n')
    }
  } catch (error) {
    console.error('❌ Invalid DATABASE_URL format')
    console.error(error)
    process.exit(1)
  }

  // Create DataSource
  console.log('🔌 Attempting database connection...')

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    synchronize: false, // Don't sync for test
    logging: false,
    entities: [], // No entities needed for test
  })

  try {
    await dataSource.initialize()
    console.log('✅ Connection successful!\n')

    // Test query
    console.log('🧪 Running test query...')
    const result = await dataSource.query('SELECT NOW() as current_time, version() as pg_version')

    console.log('✅ Query successful!')
    console.log(`Current Time: ${result[0].current_time}`)
    console.log(`PostgreSQL Version: ${result[0].pg_version.split(',')[0]}\n`)

    // Check if tables exist
    console.log('📊 Checking for existing tables...')
    const tables = await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    if (tables.length === 0) {
      console.log('ℹ️  No tables found - they will be created on first app run\n')
    } else {
      console.log(`✅ Found ${tables.length} table(s):`)
      tables.forEach((t: any) => console.log(`  - ${t.table_name}`))
      console.log()
    }

    // Check database size
    console.log('💾 Database statistics...')
    const stats = await dataSource.query(`
      SELECT
        pg_database.datname as database_name,
        pg_size_pretty(pg_database_size(pg_database.datname)) as size
      FROM pg_database
      WHERE datname = current_database()
    `)
    console.log(`Database Size: ${stats[0].size}\n`)

    // Close connection
    await dataSource.destroy()
    console.log('✅ Connection closed')
    console.log('\n🎉 All tests passed! Your Supabase connection is ready.')
    console.log('\nNext steps:')
    console.log('1. Run: npm run dev')
    console.log('2. Navigate to: http://localhost:3000/auth/signup')
    console.log('3. Create an account to test database writes\n')

  } catch (error: any) {
    console.error('❌ Connection failed!\n')
    console.error('Error:', error.message)

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:')
      console.log('- Check if your Supabase project is active (not paused)')
      console.log('- Verify the connection string is correct')
      console.log('- Check your internet connection')
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Troubleshooting:')
      console.log('- Verify the host URL is correct')
      console.log('- Check your internet connection')
    } else if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Troubleshooting:')
      console.log('- Verify your database password is correct')
      console.log('- Make sure to URL-encode special characters in password')
      console.log('- Reset password in Supabase dashboard if needed')
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 Troubleshooting:')
      console.log('- Connection timeout - check if Supabase project is running')
      console.log('- Verify firewall settings')
      console.log('- Try using the pooler connection (port 6543)')
    }

    console.log('\nFor more help, see SUPABASE_MIGRATION.md\n')
    process.exit(1)
  }
}

// Run test
testConnection().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
