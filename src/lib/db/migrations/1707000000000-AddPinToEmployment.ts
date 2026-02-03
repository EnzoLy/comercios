import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm'

export class AddPinToEmployment1707000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add pin column
    await queryRunner.addColumn(
      'employment',
      new TableColumn({
        name: 'pin',
        type: 'varchar',
        length: '255',
        isNullable: true,
        default: null,
      })
    )

    // Add requiresPin column
    await queryRunner.addColumn(
      'employment',
      new TableColumn({
        name: 'requiresPin',
        type: 'boolean',
        default: false,
      })
    )

    // Create index on requiresPin
    await queryRunner.createIndex(
      'employment',
      new TableIndex({
        name: 'idx_employment_requires_pin',
        columnNames: ['requiresPin'],
      })
    )

    // Set requiresPin = true for CASHIER, STOCK_KEEPER, MANAGER
    await queryRunner.query(`
      UPDATE "employment"
      SET "requiresPin" = true
      WHERE "role" IN ('CASHIER', 'STOCK_KEEPER', 'MANAGER')
    `)

    // Set requiresPin = false for ADMIN
    await queryRunner.query(`
      UPDATE "employment"
      SET "requiresPin" = false
      WHERE "role" = 'ADMIN'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('employment', 'idx_employment_requires_pin')

    // Drop columns
    await queryRunner.dropColumn('employment', 'requiresPin')
    await queryRunner.dropColumn('employment', 'pin')
  }
}
