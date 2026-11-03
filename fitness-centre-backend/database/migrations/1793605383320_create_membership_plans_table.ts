import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'membership_plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 100).notNullable()
      table.string('slug', 100).notNullable().unique()
      table.integer('duration_months').unsigned().notNullable()
      table.integer('price').unsigned().notNullable() // цена в тенге
      table.jsonb('perks').notNullable().defaultTo('[]')
      table.boolean('is_highlighted').notNullable().defaultTo(false)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}