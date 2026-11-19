import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Добавляет способ оплаты cash (наличные на ресепшене, имитация как kaspi).
 * table.enum() в PostgreSQL создаёт обычную колонку с проверкой (CHECK) списка значений,
 * поэтому список меняем, пересоздавая эту проверку.
 */
export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.raw(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check`)
    this.schema.raw(
      `ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK (method IN ('debit_card', 'kaspi', 'cash'))`
    )
  }

  async down() {
    // откат не сработает, если в таблице уже есть платежи с method = 'cash'
    this.schema.raw(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check`)
    this.schema.raw(
      `ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK (method IN ('debit_card', 'kaspi'))`
    )
  }
}