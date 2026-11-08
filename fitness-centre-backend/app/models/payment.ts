import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { PaymentMethod, PaymentStatus } from '#enums/payment_enums'
import MembershipPlan from '#models/membership_plan'
import User from '#models/user'

export default class Payment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare planId: number

  /** Цена в тенге на момент покупки */
  @column()
  declare amount: number

  @column()
  declare method: PaymentMethod

  @column()
  declare status: PaymentStatus

  @column()
  declare currency: string

  /** Сумма в минимальных единицах валюты Stripe (bigint приходит строкой, приводим к числу) */
  @column({ consume: (value: string | number | null) => (value === null ? null : Number(value)) })
  declare stripeAmount: number | null

  @column()
  declare stripeSessionId: string | null

  @column()
  declare stripePaymentIntentId: string | null

  @column.dateTime()
  declare paidAt: DateTime | null

  @column()
  declare createdByAdminId: number | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => MembershipPlan, { foreignKey: 'planId' })
  declare plan: BelongsTo<typeof MembershipPlan>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}