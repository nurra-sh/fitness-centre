import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'memberships'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('plan_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('membership_plans')
        .onDelete('RESTRICT')
      // unique: один платёж даёт ровно один абонемент, повторная обработка платежа ничего не задублирует
      table
        .integer('payment_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('payments')
        .onDelete('CASCADE')

      table.date('start_date').notNullable() // первый день действия
      table.date('end_date').notNullable() // последний день действия, включительно

      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()

      table.index(['user_id', 'end_date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}