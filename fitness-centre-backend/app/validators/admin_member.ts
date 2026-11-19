import vine from '@vinejs/vine'
import { phoneRule } from './auth.js'

export const membersIndexValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).withoutDecimals().optional(),
    perPage: vine.number().min(1).withoutDecimals().max(100).optional(),
    search: vine.string().trim().maxLength(100).optional(),
    status: vine.enum(['active', 'expiring', 'expired', 'none']).optional(),
  })
)
export const createMemberValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(100),
    email: vine
      .string()
      .trim()
      .email()
      .normalizeEmail()
      .unique(async (db, value) => {
        const user = await db.from('users').select('id').where('email', value).first()
        return !user
      }),
    phone: vine.string().trim().use(phoneRule()),
    iin: vine
      .string()
      .trim()
      .regex(/^\d{12}$/)
      .unique(async (db, value) => {
        const user = await db.from('users').select('id').where('iin', value).first()
        return !user
      })
      .optional(),
    // тариф необязателен: мембера можно создать без абонемента
    planId: vine.number().min(1).withoutDecimals().optional(),
    // способ оплаты нужен, только если выбран тариф
    paymentMethod: vine
      .enum(['kaspi', 'cash'] as const)
      .optional()
      .requiredIfExists('planId'),
  })
)