import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 50).notNullable().unique()
      table.string('description', 255).nullable()
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })

    this.defer(async (db) => {
      await db.table(this.tableName).insert([
        { id: 1, name: 'USER', description: 'Обычный пользователь', created_at: new Date() },
        { id: 2, name: 'ADMIN', description: 'Администратор', created_at: new Date() },
      ])
      await db.rawQuery(
        `SELECT setval(pg_get_serial_sequence('roles', 'id'), (SELECT MAX(id) FROM roles))`
      )
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}