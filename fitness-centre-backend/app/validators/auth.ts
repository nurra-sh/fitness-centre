import vine from '@vinejs/vine'
import { normalizePhone } from '#services/phone_service'

// Проверяет номер и сохраняет его в едином виде +7XXXXXXXXXX
const phoneRule = vine.createRule((value, _options, field) => {
  if (typeof value !== 'string') {
    return
  }

  const normalized = normalizePhone(value)
  if (!normalized) {
    field.report('Введите номер в формате +7 XXX XXX XX XX', 'phone', field)
    return
  }

  field.mutate(normalized, field)
})

export const loginValidator = vine.compile(
  vine.object({email: vine.string().email().normalizeEmail(),
  password: vine.string(),
})
)

export const registerValidator = vine.compile(
  vine.object({
    email: vine
    .string()
    .trim()
    .email()
    .normalizeEmail()
    .unique(async (db, value) => {
        const matchedUser = await db.from('users').select('id').where('email', value).first()
        return !matchedUser
    }),
    password: vine
    .string()
    .trim()
    .minLength(8)
    .maxLength(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .confirmed(),
    fullName: vine.string().trim(),
    phone: vine.string().trim().use(phoneRule()),
  })
  
)