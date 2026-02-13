/**
 * Run Subscription Management Migration
 *
 * Executes the subscription management SQL migration in safe, sequential steps.
 * Run with: pnpm db:migrate-subscription
 */

import 'reflect-metadata'
import { DataSource } from 'typeorm'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

async function runMigration() {
  console.log('🚀 Running Subscription Management Migration...\n')

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env')
    process.exit(1)
  }

  // Create DataSource
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    synchronize: false,
    logging: false,
    entities: [],
  })

  try {
    console.log('🔌 Connecting to database...')
    await dataSource.initialize()
    console.log('✅ Connected!\n')

    // Step 1: Add subscription columns to store table
    console.log('📝 Step 1/5: Adding subscription columns to store table...')
    await dataSource.query(`
      ALTER TABLE store
      ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS subscription_price DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS subscription_period_type VARCHAR(20) DEFAULT 'MONTHLY';
    `)
    console.log('   ✅ Columns added\n')

    // Step 2: Create indexes
    console.log('📝 Step 2/5: Creating indexes...')
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_store_subscription_status ON store(subscription_status);
    `)
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_store_subscription_end_date ON store(subscription_end_date);
    `)
    console.log('   ✅ Indexes created\n')

    // Step 3: Update existing stores with trial subscriptions
    console.log('📝 Step 3/5: Setting up trial subscriptions for existing stores...')
    const updateResult = await dataSource.query(`
      UPDATE store
      SET
        subscription_status = 'ACTIVE',
        subscription_start_date = CURRENT_TIMESTAMP,
        subscription_end_date = CURRENT_TIMESTAMP + INTERVAL '90 days',
        is_permanent = FALSE,
        subscription_period_type = 'MONTHLY'
      WHERE subscription_start_date IS NULL;
    `)
    const rowsUpdated = updateResult[1] || 0
    console.log(`   ✅ Updated ${rowsUpdated} store(s) with 90-day trial\n`)

    // Step 4: Create subscription_payment table
    console.log('📝 Step 4/5: Creating subscription_payment table...')
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS subscription_payment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        reference_number VARCHAR(255),
        payment_date DATE NOT NULL,
        duration_months INTEGER NOT NULL,
        period_start_date DATE NOT NULL,
        period_end_date DATE NOT NULL,
        recorded_by_user_id UUID NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

        CONSTRAINT fk_subscription_payment_store
          FOREIGN KEY (store_id)
          REFERENCES store(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_subscription_payment_user
          FOREIGN KEY (recorded_by_user_id)
          REFERENCES "user"(id)
          ON DELETE RESTRICT,

        CONSTRAINT chk_subscription_payment_amount_positive
          CHECK (amount > 0),

        CONSTRAINT chk_subscription_payment_duration_positive
          CHECK (duration_months > 0),

        CONSTRAINT chk_subscription_payment_method
          CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'OTHER'))
      );
    `)

    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_payment_store ON subscription_payment(store_id);
    `)
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_payment_date ON subscription_payment(payment_date);
    `)
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_payment_recorded_by ON subscription_payment(recorded_by_user_id);
    `)
    console.log('   ✅ Table and indexes created\n')

    // Step 5: Create trigger for updated_at
    console.log('📝 Step 5/5: Creating trigger for automatic timestamp updates...')
    await dataSource.query(`
      CREATE OR REPLACE FUNCTION update_subscription_payment_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `)

    await dataSource.query(`
      DROP TRIGGER IF EXISTS trigger_update_subscription_payment_timestamp ON subscription_payment;
    `)

    await dataSource.query(`
      CREATE TRIGGER trigger_update_subscription_payment_timestamp
      BEFORE UPDATE ON subscription_payment
      FOR EACH ROW
      EXECUTE FUNCTION update_subscription_payment_updated_at();
    `)
    console.log('   ✅ Trigger created\n')

    // Verification
    console.log('🔍 Verifying migration...')

    const storeColumns = await dataSource.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'store'
        AND (column_name LIKE '%subscription%' OR column_name = 'is_permanent')
      ORDER BY ordinal_position;
    `)
    console.log(`   ✅ Store table has ${storeColumns.length} subscription columns`)

    const paymentColumns = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_name = 'subscription_payment';
    `)
    console.log(`   ✅ subscription_payment table has ${paymentColumns[0].count} columns`)

    const storeStats = await dataSource.query(`
      SELECT
        COUNT(*) as total_stores,
        COUNT(CASE WHEN subscription_status = 'ACTIVE' THEN 1 END) as active,
        COUNT(CASE WHEN is_permanent = TRUE THEN 1 END) as permanent
      FROM store;
    `)

    const stats = storeStats[0]
    console.log(`   📊 Stores: ${stats.total_stores} total, ${stats.active} active, ${stats.permanent} permanent\n`)

    // Close connection
    await dataSource.destroy()
    console.log('✅ Connection closed')
    console.log('\n🎉 Migration completed successfully!')
    console.log('\n📋 Summary:')
    console.log(`   - Added 6 subscription columns to store table`)
    console.log(`   - Created subscription_payment table with constraints`)
    console.log(`   - Set up ${rowsUpdated} store(s) with 90-day trial subscriptions`)
    console.log(`   - Created indexes and triggers for automatic updates`)
    console.log('\n💡 Next steps:')
    console.log('   1. Restart your dev server (pnpm dev)')
    console.log('   2. Access /admin/stores to manage subscriptions')
    console.log('   3. Set up permanent subscriptions or adjust trial periods as needed\n')

  } catch (error: any) {
    console.error('\n❌ Migration failed!\n')
    console.error('Error:', error.message)

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.log('\n💡 Connection issue - check if Supabase is running')
    } else if (error.code === '42P07') {
      console.log('\n💡 Table or column already exists - migration may have run before')
    } else if (error.code === '42703') {
      console.log('\n💡 Column does not exist - check table structure')
    } else {
      console.log('\n💡 Full error details:')
      console.error(error)
    }

    await dataSource.destroy().catch(() => {})
    process.exit(1)
  }
}

// Run migration
runMigration().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
