import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import MembershipPlan from '#models/membership_plan'
import Payment from '#models/payment'
import User from '#models/user'

export default class Membership extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare planId: number

  @column()
  declare paymentId: number

  /** Первый день действия */
  @column.date()
  declare startDate: DateTime

  /** Последний день действия, включительно */
  @column.date()
  declare endDate: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => MembershipPlan, { foreignKey: 'planId' })
  declare plan: BelongsTo<typeof MembershipPlan>

  @belongsTo(() => Payment)
  declare payment: BelongsTo<typeof Payment>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}