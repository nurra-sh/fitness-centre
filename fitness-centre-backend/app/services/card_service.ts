import { randomInt } from 'node:crypto'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import User from '#models/user'

const MAX_ATTEMPTS = 5

/** Случайный 12-значный номер карты (первая цифра не 0, чтобы номер выглядел ровно) */
export function generateCardNumber(): string {
  return String(randomInt(100_000_000_000, 1_000_000_000_000))
}

function isCardNumberConflict(error: unknown): boolean {
  const pgError = error as { code?: string; constraint?: string }
  return pgError?.code === '23505' && String(pgError.constraint).includes('card_number')
}

/**
 * Выдаёт номер карты пользователю, если у него ещё нет. Вызывается при первой оплате абонемента.
 * Работает только внутри транзакции: строка пользователя блокируется, поэтому две параллельные
 * оплаты не выдадут две разные карты.
 *
 * Номер не проверяется запросом заранее: между проверкой и записью его успеет занять другой человек.
 * Мы записываем сразу, а при конфликте уникального индекса пробуем другой номер. Каждая попытка идёт
 * в своей вложенной транзакции (savepoint), иначе ошибка PostgreSQL отменила бы всю внешнюю.
 */
export async function ensureCardNumber(
  trx: TransactionClientContract,
  userId: number,
  generator: () => string = generateCardNumber
): Promise<string> {
  const user = await User.query({ client: trx }).where('id', userId).forUpdate().firstOrFail()

  if (user.cardNumber) {
    return user.cardNumber
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await trx.transaction(async (savepoint) => {
        user.useTransaction(savepoint)
        user.cardNumber = generator()
        await user.save()
      })
      return user.cardNumber!
    } catch (error) {
      if (!isCardNumberConflict(error) || attempt === MAX_ATTEMPTS) {
        throw error
      }
    }
  }

  throw new Error('Не удалось выдать номер карты')
}