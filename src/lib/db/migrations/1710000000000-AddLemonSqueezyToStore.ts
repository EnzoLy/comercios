import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLemonSqueezyToStore1710000000000 implements MigrationInterface {
  name = 'AddLemonSqueezyToStore1710000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "store"
      ADD COLUMN IF NOT EXISTS "subscription_plan" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "lemonsqueezy_subscription_id" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "lemonsqueezy_customer_id" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "lemonsqueezy_variant_id" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "lemonsqueezy_status" VARCHAR(50)
    `)

    -- Backfill existing stores with a default plan
    await queryRunner.query(`
      UPDATE "store"
      SET "subscription_plan" = CASE
        WHEN "is_permanent" = true THEN 'PRO'
        WHEN "subscription_end_date" IS NOT NULL THEN 'BASICO'
        ELSE 'FREE'
      END
      WHERE "subscription_plan" IS NULL
    `)

    -- Existing stores classified as FREE (no end date, not permanent) should be
    -- made permanent so the middleware does not start blocking them post-migration
    await queryRunner.query(`
      UPDATE "store"
      SET "is_permanent" = true,
          "subscription_status" = 'PERMANENT'
      WHERE "subscription_plan" = 'FREE'
        AND "is_permanent" = false
        AND "subscription_end_date" IS NULL
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "store"
      DROP COLUMN IF EXISTS "lemonsqueezy_status",
      DROP COLUMN IF EXISTS "lemonsqueezy_variant_id",
      DROP COLUMN IF EXISTS "lemonsqueezy_customer_id",
      DROP COLUMN IF EXISTS "lemonsqueezy_subscription_id",
      DROP COLUMN IF EXISTS "subscription_plan"
    `)
  }
}
