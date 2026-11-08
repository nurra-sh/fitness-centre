import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payments'

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
        .onDelete('RESTRICT') // тариф с покупками удалять нельзя, его можно скрыть (is_active)

      table.integer('amount').unsigned().notNullable() // цена в тенге на момент покупки

      table.enum('method', ['debit_card', 'kaspi']).notNullable()
      table
        .enum('status', ['pending', 'paid', 'confirmed', 'cancelled'])
        .notNullable()
        .defaultTo('pending')

      // Поля под Stripe: пока пустые, заполнятся в шаге подключения Stripe
      table.string('currency', 3).notNullable().defaultTo('kzt')
      table.bigInteger('stripe_amount').nullable() // сумма в минимальных единицах валюты Stripe
      table.string('stripe_session_id').nullable().unique()
      table.string('stripe_payment_intent_id').nullable()

      table.timestamp('paid_at').nullable()
      table
        .integer('created_by_admin_id')
        .unsigned()
        .nullable() // заполнит админка, если платёж оформил администратор
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')

      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()

      table.index(['user_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}