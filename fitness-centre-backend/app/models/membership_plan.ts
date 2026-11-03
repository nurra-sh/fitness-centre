import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class MembershipPlan extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare durationMonths: number

  /** Цена в тенге */
  @column()
  declare price: number

  // массив сохраняем как JSON-строку, иначе pg превратит JS-массив в массив PostgreSQL, а не в jsonb
  @column({
    prepare: (value: string[]) => JSON.stringify(value ?? []),
    consume: (value: string | string[]) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare perks: string[]

  @column()
  declare isHighlighted: boolean

  @column()
  declare isActive: boolean

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}