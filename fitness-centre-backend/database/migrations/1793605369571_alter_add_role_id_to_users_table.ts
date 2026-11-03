import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('role_id')
        .unsigned()
        .notNullable()
        .defaultTo(1) // 1 = USER
        .references('id')
        .inTable('roles')
        .onDelete('RESTRICT') // нельзя удалить роль, если к ней привязаны пользователи
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['role_id'])
      table.dropColumn('role_id')
    })
  }
}