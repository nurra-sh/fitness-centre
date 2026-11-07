/**
 * Приводит номер к виду +7XXXXXXXXXX или возвращает null, если номер неверный.
 * Принимает: 8 701 123 45 67, +7 (701) 123-45-67, 7011234567 и т.п.
 *
 * Правила:
 * - с плюсом: ровно 11 цифр и первая цифра 7 (иначе «+7 701 123 45 6» принялся бы за 10-значный номер);
 * - без плюса: 11 цифр с 7 или 8 в начале, либо 10 цифр;
 * - первая цифра номера без кода страны: 3, 4, 7 или 9 (коды +7: Сибирь, Урал, Казахстан, мобильные РФ).
 */
export function normalizePhone(raw: string): string | null {
  const value = raw.trim()
  const digits = value.replace(/\D/g, '')

  let national: string
  if (value.startsWith('+')) {
    if (digits.length !== 11 || !digits.startsWith('7')) {
      return null
    }
    national = digits.slice(1)
  } else if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    national = digits.slice(1)
  } else if (digits.length === 10) {
    national = digits
  } else {
    return null
  }

  return /^[3479]\d{9}$/.test(national) ? `+7${national}` : null
}