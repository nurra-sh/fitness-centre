import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import env from '#start/env'
import Membership from '#models/membership'
import MembershipPlan from '#models/membership_plan'
import Payment from '#models/payment'
import { PaymentMethod, PaymentStatus } from '#enums/payment_enums'
import { purchaseValidator } from '#validators/membership'
import { describeMembership, payWithKaspi, todayIso } from '#services/membership_service'

/** Имитация оплаты включена всегда, кроме production: там её нужно разрешить в .env */
function simulatedPaymentsAllowed(): boolean {
  return !app.inProduction || env.get('ALLOW_SIMULATED_PAYMENTS') === true
}

export default class MembershipsController {
  /**
   * GET /memberships/me
   * Данные для страницы «Мой абонемент»: карта, текущий абонемент, остаток дней, очередь и история.
   */
  async me({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const today = todayIso()

    const memberships = await Membership.query()
      .where('user_id', user.id)
      .preload('plan')
      .orderBy('start_date', 'desc')

    const items = memberships.map((membership) => describeMembership(membership, today))

    const current = items.find((item) => item.status === 'active') ?? null
    const upcoming = items.filter((item) => item.status === 'upcoming').reverse()
    const history = items.filter((item) => item.status === 'expired')

    // общий остаток дней с учётом оплаченных наперёд абонементов
    const lastEnd = items
      .filter((item) => item.status !== 'expired')
      .map((item) => item.endDate)
      .sort()
      .pop()
    const totalDaysLeft = lastEnd
      ? Math.round(
          DateTime.fromISO(lastEnd, { zone: 'utc' }).diff(
            DateTime.fromISO(today, { zone: 'utc' }),
            'days'
          ).days
        ) + 1
      : 0

    // есть ли недавний платёж, который ещё ждёт оплаты (понадобится фронтенду после возврата со Stripe)
    const pendingPayment = await Payment.query()
      .where('user_id', user.id)
      .where('status', PaymentStatus.PENDING)
      .where('created_at', '>', DateTime.now().minus({ hours: 1 }).toSQL()!)
      .first()

    const payments = await Payment.query()
      .where('user_id', user.id)
      .preload('plan')
      .orderBy('created_at', 'desc')
      .limit(20)

    return response.ok({
      cardNumber: user.cardNumber,
      current,
      upcoming,
      history,
      totalDaysLeft,
      hasPendingPayment: Boolean(pendingPayment),
      payments: payments.map((payment) => ({
        id: payment.id,
        planName: payment.plan.name,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        createdAt: payment.createdAt.toISO(),
        paidAt: payment.paidAt?.toISO() ?? null,
      })),
    })
  }

  /**
   * POST /memberships/purchase { planId, paymentMethod }
   * Покупка абонемента самим пользователем. Цену берём из БД, а не от клиента.
   */
  async purchase({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { planId, paymentMethod } = await request.validateUsing(purchaseValidator)

    const plan = await MembershipPlan.query().where('id', planId).where('is_active', true).first()
    if (!plan) {
      return response.notFound({ message: 'Абонемент не найден' })
    }

    if (paymentMethod === PaymentMethod.KASPI) {
      if (!simulatedPaymentsAllowed()) {
        return response.forbidden({ message: 'Имитация оплаты отключена на этом сервере' })
      }

      const result = await payWithKaspi(user.id, plan)
      if (!result.ok) {
        return response.conflict({
          message: 'Платёж только что оформлен. Проверьте страницу «Мой абонемент».',
        })
      }

      return response.created({ paymentId: result.paymentId, status: PaymentStatus.CONFIRMED })
    }

    // PaymentMethod.DEBIT_CARD: сюда добавится Stripe. Нужно будет создать Payment со статусом pending,
    // сохранить сумму в stripeAmount, создать сессию Checkout и вернуть её url,
    // а завершит платёж вебхук через completePayment(paymentId, PaymentStatus.PAID).
    return response.notImplemented({ message: 'Оплата банковской картой скоро будет доступна' })
  }
}