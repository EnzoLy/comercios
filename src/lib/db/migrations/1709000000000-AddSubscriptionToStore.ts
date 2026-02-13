import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSubscriptionToStore1709000000000 implements MigrationInterface {
  name = 'AddSubscriptionToStore1709000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "store" 
      ADD COLUMN IF NOT EXISTS "subscription_status" VARCHAR(50) DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS "subscription_start_date" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "subscription_end_date" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "is_permanent" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "subscription_price" DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS "subscription_period_type" VARCHAR(20) DEFAULT 'MONTHLY'
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_store_subscription_status" ON "store" ("subscription_status")
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_store_subscription_end_date" ON "store" ("subscription_end_date")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_subscription_end_date"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_store_subscription_status"`)
    await queryRunner.query(`
      ALTER TABLE "store" 
      DROP COLUMN IF EXISTS "subscription_period_type",
      DROP COLUMN IF EXISTS "subscription_price",
      DROP COLUMN IF EXISTS "is_permanent",
      DROP COLUMN IF EXISTS "subscription_end_date",
      DROP COLUMN IF EXISTS "subscription_start_date",
      DROP COLUMN IF EXISTS "subscription_status"
    `)
  }
}
