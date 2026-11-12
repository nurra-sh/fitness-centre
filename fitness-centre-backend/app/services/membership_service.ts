import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import Membership from '#models/membership'
import MembershipPlan from '#models/membership_plan'
import Payment from '#models/payment'
import User from '#models/user'
import { PaymentMethod, PaymentStatus } from '#enums/payment_enums'
import { ensureCardNumber } from '#services/card_service'
import Stripe from 'stripe'

const TIME_ZONE = 'Asia/Almaty'

/** Защита от двойного клика: тот же тариф нельзя оплатить дважды подряд за это время */
const DUPLICATE_WINDOW_SECONDS = 10

export type MembershipStatus = 'active' | 'upcoming' | 'expired'

/** Сегодняшняя дата в Алматы в формате YYYY-MM-DD */
export function todayIso(): string {
  return DateTime.now().setZone(TIME_ZONE).toISODate()!
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = DateTime.fromISO(fromIso, { zone: 'utc' })
  const to = DateTime.fromISO(toIso, { zone: 'utc' })
  return Math.round(to.diff(from, 'days').days)
}

/**
 * Статус и остаток дней считаются по датам, а не хранятся в БД,
 * поэтому фоновые задачи для «абонемент истёк» не нужны.
 */
export function describeMembership(membership: Membership, today: string) {
  const start = membership.startDate.toISODate()!
  const end = membership.endDate.toISODate()!

  let status: MembershipStatus
  let daysLeft: number
  let daysUntilStart = 0

  if (today > end) {
    status = 'expired'
    daysLeft = 0
  } else if (today < start) {
    status = 'upcoming'
    daysLeft = daysBetween(start, end) + 1
    daysUntilStart = daysBetween(today, start)
  } else {
    status = 'active'
    daysLeft = daysBetween(today, end) + 1 // последний день тоже считается
  }

  return {
    id: membership.id,
    plan: membership.plan
      ? {
          id: membership.plan.id,
          name: membership.plan.name,
          months: membership.plan.durationMonths,
        }
      : null,
    startDate: start,
    endDate: end,
    status,
    daysLeft,
    daysUntilStart,
  }
}

/**
 * Если у человека уже есть действующий (или оплаченный наперёд) абонемент,
 * новый начинается на следующий день после его окончания, иначе с сегодняшнего дня.
 */
async function calculatePeriod(
  userId: number,
  durationMonths: number,
  trx: TransactionClientContract
) {
  const today = todayIso()

  const last = await Membership.query({ client: trx })
    .where('user_id', userId)
    .where('end_date', '>=', today)
    .orderBy('end_date', 'desc')
    .first()

  const startIso = last
    ? DateTime.fromISO(last.endDate.toISODate()!, { zone: 'utc' }).plus({ days: 1 }).toISODate()!
    : today

  const endIso = DateTime.fromISO(startIso, { zone: 'utc' })
    .plus({ months: durationMonths })
    .minus({ days: 1 })
    .toISODate()!

  return { startIso, endIso }
}

/**
 * Создаёт абонемент для оплаченного платежа и выдаёт карту, если её ещё нет.
 * Вызывать только внутри транзакции.
 */
export async function grantMembership(
  trx: TransactionClientContract,
  payment: Payment,
  plan: MembershipPlan
) {
  // блокируем строку пользователя: параллельные оплаты выстроятся в очередь
  // и не посчитают одинаковый период
  await User.query({ client: trx }).where('id', payment.userId).forUpdate().first()

  const { startIso, endIso } = await calculatePeriod(payment.userId, plan.durationMonths, trx)

  const membership = await Membership.create(
    {
      userId: payment.userId,
      planId: plan.id,
      paymentId: payment.id,
      startDate: DateTime.fromISO(startIso, { zone: 'utc' }),
      endDate: DateTime.fromISO(endIso, { zone: 'utc' }),
    },
    { client: trx }
  )

  await ensureCardNumber(trx, payment.userId)

  return membership
}

/** Помечает платёж оплаченным и выдаёт абонемент. Платёж уже должен быть заблокирован в этой транзакции. */
async function activatePayment(
  trx: TransactionClientContract,
  payment: Payment,
  status: PaymentStatus.PAID | PaymentStatus.CONFIRMED,
  extra: { stripePaymentIntentId?: string } = {}
) {
  payment.useTransaction(trx)
  payment.merge({
    status,
    paidAt: DateTime.now(),
    ...(extra.stripePaymentIntentId && { stripePaymentIntentId: extra.stripePaymentIntentId }),
  })
  await payment.save()

  const plan = await MembershipPlan.findOrFail(payment.planId, { client: trx })

  return grantMembership(trx, payment, plan)
}

export type CompleteResult = 'activated' | 'already_processed' | 'cancelled' | 'not_found'

/**
 * Завершает существующий платёж (pending) и выдаёт абонемент.
 * Безопасна при повторном вызове: второй вызов вернёт 'already_processed' и ничего не создаст.
 * Её вызовет вебхук Stripe со статусом PAID.
 */
export async function completePayment(
  paymentId: number,
  status: PaymentStatus.PAID | PaymentStatus.CONFIRMED,
  extra: { stripePaymentIntentId?: string } = {}
): Promise<CompleteResult> {
  return db.transaction(async (trx) => {
    const payment = await Payment.query({ client: trx }).where('id', paymentId).forUpdate().first()

    if (!payment) return 'not_found'
    if (payment.status === PaymentStatus.PAID || payment.status === PaymentStatus.CONFIRMED) {
      return 'already_processed'
    }
    if (payment.status === PaymentStatus.CANCELLED) return 'cancelled'

    await activatePayment(trx, payment, status, extra)
    return 'activated'
  })
}

/** Отменяет платёж, который ещё ждёт оплаты (например, сессия Stripe истекла). */
export async function cancelPayment(paymentId: number): Promise<boolean> {
  const updated = await Payment.query()
    .where('id', paymentId)
    .where('status', PaymentStatus.PENDING)
    .update({ status: PaymentStatus.CANCELLED })

  return Number(updated[0]) > 0
}

export type KaspiResult = { ok: true; paymentId: number } | { ok: false; reason: 'duplicate' }

export type StripeSessionResult =
  CompleteResult | 'payment_not_found' | 'not_paid_yet' | 'amount_mismatch'

/**
 * Обработка оплаченной сессии Stripe (checkout.session.completed).
 * Платёж ищем по id сессии, а сумму и валюту сверяем с тем, что мы сами записали при создании сессии.
 */
export async function completeStripePayment(
  session: Stripe.Checkout.Session
): Promise<StripeSessionResult> {
  const payment = await Payment.findBy('stripe_session_id', session.id)

  // чужая сессия (например, от другого проекта на том же аккаунте Stripe)
  if (!payment) return 'payment_not_found'

  // для отложенных способов оплаты статус станет paid позже (async_payment_succeeded)
  if (session.payment_status !== 'paid') return 'not_paid_yet'

  if (session.amount_total !== payment.stripeAmount || session.currency !== payment.currency) {
    return 'amount_mismatch'
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id

  return completePayment(payment.id, PaymentStatus.PAID, {
    stripePaymentIntentId: paymentIntentId,
  })
}

/** Сессия Stripe истекла или оплата не прошла: отменяем платёж. */
export async function failStripePayment(sessionId: string): Promise<boolean> {
  const payment = await Payment.findBy('stripe_session_id', sessionId)
  if (!payment) return false

  return cancelPayment(payment.id)
}

/**
 * Имитация оплаты через Kaspi (как cash_on_delivery в Scoville): платёж сразу получает статус
 * confirmed и человек получает абонемент. Всё в одной транзакции под блокировкой пользователя,
 * поэтому двойной клик не создаст два абонемента.
 */
export async function payWithKaspi(userId: number, plan: MembershipPlan): Promise<KaspiResult> {
  return db.transaction(async (trx) => {
    await User.query({ client: trx }).where('id', userId).forUpdate().first()

    const recent = await Payment.query({ client: trx })
      .where('user_id', userId)
      .where('plan_id', plan.id)
      .whereIn('status', [PaymentStatus.PAID, PaymentStatus.CONFIRMED])
      .where(
        'created_at',
        '>',
        DateTime.now().minus({ seconds: DUPLICATE_WINDOW_SECONDS }).toSQL()!
      )
      .first()

    if (recent) {
      return { ok: false, reason: 'duplicate' } as const
    }

    const payment = await Payment.create(
      {
        userId,
        planId: plan.id,
        amount: plan.price,
        method: PaymentMethod.KASPI,
        status: PaymentStatus.PENDING,
      },
      { client: trx }
    )

    await activatePayment(trx, payment, PaymentStatus.CONFIRMED)

    return { ok: true, paymentId: payment.id } as const
  })
}