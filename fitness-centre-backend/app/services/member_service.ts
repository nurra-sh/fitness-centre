import { randomInt } from 'node:crypto'
import User from '#models/user'

const MAX_ATTEMPTS = 5

export type NewMemberData = {
  fullName: string
  email: string
  password: string
  phone: string
  iin?: string | null
  mustChangePassword?: boolean
  createdByAdminId?: number | null
}

/** Случайный 12-значный номер карты (первая цифра не 0, чтобы номер выглядел ровно) */
export function generateCardNumber(): string {
  return String(randomInt(100_000_000_000, 1_000_000_000_000))
}

function isCardNumberConflict(error: unknown): boolean {
  const pgError = error as { code?: string; constraint?: string }
  return pgError?.code === '23505' && String(pgError.constraint).includes('card_number')
}

/**
 * Единое место создания мембера: и регистрация на сайте, и админка вызывают эту функцию,
 * поэтому у каждого мембера гарантированно есть карта.
 *
 * Номер не проверяется заранее запросом, потому что между проверкой и вставкой его успеет занять
 * другой запрос. Мы вставляем сразу, а при конфликте уникального индекса пробуем другой номер.
 * Роль не указываем: по умолчанию в БД role_id = 1 (USER).
 */
export async function createMember(
  data: NewMemberData,
  generator: () => string = generateCardNumber
): Promise<User> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await User.create({ ...data, cardNumber: generator() })
    } catch (error) {
      // повторяем только при совпадении номера карты, остальные ошибки (например, почта занята) пробрасываем
      if (!isCardNumberConflict(error) || attempt === MAX_ATTEMPTS) {
        throw error
      }
    }
  }

  throw new Error('Не удалось выдать номер карты')
}