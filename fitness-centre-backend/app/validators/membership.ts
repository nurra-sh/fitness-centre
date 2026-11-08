import vine from '@vinejs/vine'
import { PaymentMethod } from '#enums/payment_enums'

export const purchaseValidator = vine.compile(
  vine.object({
    planId: vine.number().positive().withoutDecimals(),
    paymentMethod: vine.enum(Object.values(PaymentMethod)),
  })
)