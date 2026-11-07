import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('phone', 16).nullable() // формат +7XXXXXXXXXX
      table.string('iin', 12).nullable().unique() // строка, а не число: ведущие нули и 12 цифр
      table.string('card_number', 12).nullable().unique() // номер карты клуба; у админов пусто
      table.boolean('is_active').notNullable().defaultTo(true)
      table.boolean('must_change_password').notNullable().defaultTo(false)
      table
        .integer('created_by_admin_id')
        .unsigned()
        .nullable() // пусто, если человек зарегистрировался сам
        .references('id')
        .inTable(this.tableName)
        .onDelete('SET NULL')

      table.index(['phone'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['phone'])
      table.dropForeign(['created_by_admin_id'])
      table.dropColumns(
        'phone',
        'iin',
        'card_number',
        'is_active',
        'must_change_password',
        'created_by_admin_id'
      )
    })
  }
}