import type { HttpContext } from '@adonisjs/core/http'
import type { Stripe } from 'stripe'
import env from '#start/env'
import { getStripe } from '#services/stripe_service'
import { completeStripePayment, failStripePayment } from '#services/membership_service'

export default class WebhooksController {
  // Локально: stripe listen --forward-to localhost:3333/api/v1/webhooks/stripe
  async stripe({ request, response, logger }: HttpContext) {
    const signature = request.header('stripe-signature')
    if (!signature) {
      return response.badRequest({ message: 'Нет подписи Stripe' })
    }

    let event: Stripe.Event
    try {
      // подпись проверяется по сырому телу запроса, поэтому request.raw(), а не request.body()
      event = getStripe().webhooks.constructEvent(
        request.raw() ?? '',
        signature,
        env.get('STRIPE_WEBHOOK_SECRET')
      )
    } catch (error) {
      logger.warn({ err: error }, 'Неверная подпись вебхука Stripe')
      return response.badRequest({ message: 'Неверная подпись' })
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object
        const result = await completeStripePayment(session)

        if (result === 'cancelled' || result === 'amount_mismatch') {
          // деньги получены, а абонемент не выдан: нужна ручная проверка и, возможно, возврат в Stripe
          logger.error(
            { eventId: event.id, sessionId: session.id, result },
            'Оплата Stripe не привела к абонементу'
          )
        } else {
          logger.info(
            { eventId: event.id, sessionId: session.id, result },
            'Обработан платёж Stripe'
          )
        }
        break
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        await failStripePayment(event.data.object.id)
        break
      }
      default:
        // остальные события нас не интересуют, но Stripe должен получить 200, иначе будет повторять
        break
    }

    return response.ok({ received: true })
  }
}