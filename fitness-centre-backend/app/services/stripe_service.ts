import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { Stripe } from 'stripe'

let client: Stripe | null = null

export function getStripe(): Stripe {
  const secretKey = env.get('STRIPE_SECRET_KEY')

  // защита от случайной оплаты настоящими деньгами: боевые ключи (sk_live_, rk_live_) только в production
  if (/^(sk|rk)_live_/.test(secretKey) && !app.inProduction) {
    throw new Error(
      'Боевой ключ Stripe нельзя использовать в разработке: возьмите тестовый ключ sk_test_'
    )
  }

  // таймаут и один повтор: если Stripe недоступен, человек не должен ждать минутами
  client ??= new Stripe(secretKey, {
    timeout: 15_000,
    maxNetworkRetries: 1,
  })
  return client
}

/** Валюта, в которой создаётся платёж в Stripe (по умолчанию тенге) */
export function getStripeCurrency(): string {
  return env.get('STRIPE_CURRENCY', 'kzt').toLowerCase()
}

/**
 * Переводит цену в тенге в минимальные единицы валюты Stripe.
 * Для KZT это тиыны (22 000 тг -> 2 200 000).
 * Если аккаунт Stripe не принимает KZT, задайте в .env STRIPE_CURRENCY=usd и STRIPE_KZT_RATE=<тенге за 1 доллар>.
 */
export function toStripeAmount(priceKzt: number): number {
  if (getStripeCurrency() === 'kzt') {
    return priceKzt * 100
  }

  const rate = env.get('STRIPE_KZT_RATE')
  if (!rate) {
    throw new Error('STRIPE_KZT_RATE is required when STRIPE_CURRENCY is not kzt')
  }

  return Math.round((priceKzt / rate) * 100)
}