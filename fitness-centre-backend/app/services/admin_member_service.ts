import db from '@adonisjs/lucid/services/db'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import Membership from '#models/membership'
import User from '#models/user'
import { RolesEnum } from '#enums/role_enums'
import { daysBetween, grantConfirmedPayment, todayIso } from '#services/membership_service'
import { randomInt } from 'node:crypto'
import MembershipPlan from '#models/membership_plan'
import { PaymentMethod } from '#enums/payment_enums'

/** «Заканчивается скоро»: осталось 7 дней или меньше (последний день считается) */
export const EXPIRING_DAYS = 7

export type MemberStatusFilter = 'active' | 'expiring' | 'expired' | 'none'
export type MemberMembershipStatus = 'active' | 'upcoming' | 'expired' | 'none'

/** ИИН в списке показываем только маской: ********1234 */
export function maskIin(iin: string | null): string | null {
  if (!iin) return null
  return iin.length > 4 ? '*'.repeat(iin.length - 4) + iin.slice(-4) : '****'
}

/** В LIKE-шаблоне символы % и _ означают «любые», поэтому их нужно экранировать */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

/** Телефон хранится как +7XXXXXXXXXX: «8701...» при поиске превращаем в «7701...» */
function phoneSearchDigits(digits: string): string {
  return digits.startsWith('8') ? `7${digits.slice(1)}` : digits
}

/** Последний день, при котором абонемент ещё считается «заканчивающимся скоро» */
function expiringLimit(today: string): string {
  return DateTime.fromISO(today, { zone: 'utc' })
    .plus({ days: EXPIRING_DAYS - 1 })
    .toISODate()!
}

// Подзапросы по абонементам пользователя. userRef: 'users.id' (список) или 'u.id' (статистика).
const hasActive = (userRef: string) =>
  `EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = ${userRef} AND m.start_date <= ? AND m.end_date >= ?)`
const hasAny = (userRef: string) =>
  `EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = ${userRef})`
const hasCurrentOrFuture = (userRef: string) =>
  `EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = ${userRef} AND m.end_date >= ?)`
const lastEnd = (userRef: string) =>
  `(SELECT MAX(m.end_date) FROM memberships m WHERE m.user_id = ${userRef})`

function applyStatusFilter(
  query: ModelQueryBuilderContract<typeof User>,
  status: MemberStatusFilter,
  today: string
) {
  switch (status) {
    case 'active':
      query.whereRaw(hasActive('users.id'), [today, today])
      break
    case 'expiring':
      query
        .whereRaw(hasActive('users.id'), [today, today])
        .whereRaw(`${lastEnd('users.id')} <= ?`, [expiringLimit(today)])
      break
    case 'expired':
      // абонементы были, но ни один уже не действует и не начнётся
      query.whereRaw(hasAny('users.id')).whereRaw(`NOT ${hasCurrentOrFuture('users.id')}`, [today])
      break
    case 'none':
      query.whereRaw(`NOT ${hasAny('users.id')}`)
      break
  }
}

function applySearch(query: ModelQueryBuilderContract<typeof User>, search: string) {
  const digits = search.replace(/\D/g, '')
  // цифровой поиск (карта, телефон, ИИН) включаем, только если в запросе нет ничего, кроме цифр и знаков
  // оформления номера: пробелов, +, -, скобок. Иначе «100%» или «abc123» искали бы карты по цифрам.
  const isNumeric = /^[\d\s+()-]+$/.test(search)

  query.where((group) => {
    group
      .whereILike('full_name', `%${escapeLike(search)}%`)
      .orWhereILike('email', `%${escapeLike(search)}%`)

    // цифры ищем в номере карты и телефоне, а полный ИИН (12 цифр) только по точному совпадению
    if (isNumeric && digits.length >= 3) {
      group
        .orWhere('card_number', 'like', `%${digits}%`)
        .orWhere('phone', 'like', `%${phoneSearchDigits(digits)}%`)
    }
    if (isNumeric && digits.length === 12) {
      group.orWhere('iin', digits)
    }
  })
}

/** Итог по абонементам одного мембера: действует ли карта, до какого числа и сколько дней осталось */
function summarize(memberships: Membership[], today: string) {
  if (memberships.length === 0) {
    return {
      status: 'none' as MemberMembershipStatus,
      planName: null,
      startDate: null,
      endDate: null,
      daysLeft: 0,
      expiringSoon: false,
    }
  }

  const iso = (m: Membership) => ({ start: m.startDate.toISODate()!, end: m.endDate.toISODate()! })
  const current = memberships.find((m) => iso(m).start <= today && iso(m).end >= today)
  const notFinished = memberships.filter((m) => iso(m).end >= today)

  if (current) {
    // «до какого числа» считаем с учётом оплаченных наперёд абонементов
    const coverageEnd = notFinished
      .map((m) => iso(m).end)
      .sort()
      .pop()!
    const daysLeft = daysBetween(today, coverageEnd) + 1

    return {
      status: 'active' as MemberMembershipStatus,
      planName: current.plan?.name ?? null,
      startDate: iso(current).start,
      endDate: coverageEnd,
      daysLeft,
      expiringSoon: daysLeft <= EXPIRING_DAYS,
    }
  }

  if (notFinished.length > 0) {
    const next = [...notFinished].sort((a, b) => iso(a).start.localeCompare(iso(b).start))[0]
    return {
      status: 'upcoming' as MemberMembershipStatus,
      planName: next.plan?.name ?? null,
      startDate: iso(next).start,
      endDate: notFinished
        .map((m) => iso(m).end)
        .sort()
        .pop()!,
      daysLeft: 0,
      expiringSoon: false,
    }
  }

  const last = memberships[0] // отсортированы по дате окончания, самая поздняя первой
  return {
    status: 'expired' as MemberMembershipStatus,
    planName: last.plan?.name ?? null,
    startDate: iso(last).start,
    endDate: iso(last).end,
    daysLeft: 0,
    expiringSoon: false,
  }
}

export async function listMembers(params: {
  page: number
  perPage: number
  search?: string
  status?: MemberStatusFilter
}) {
  const today = todayIso()

  // мемберы это пользователи с ролью USER, админы в список не попадают
  const query = User.query().whereHas('role', (role) => role.where('name', RolesEnum.USER))

  if (params.search) applySearch(query, params.search)
  if (params.status) applyStatusFilter(query, params.status, today)

  query.orderBy('created_at', 'desc').orderBy('id', 'desc')

  const paginator = await query.paginate(params.page, params.perPage)
  const users = paginator.all()

  // абонементы всех мемберов страницы одним запросом (без запроса на каждого мембера)
  const ids = users.map((user) => user.id)
  const memberships = ids.length
    ? await Membership.query().whereIn('user_id', ids).preload('plan').orderBy('end_date', 'desc')
    : []

  const byUser = new Map<number, Membership[]>()
  for (const membership of memberships) {
    byUser.set(membership.userId, [...(byUser.get(membership.userId) ?? []), membership])
  }

  return {
    meta: paginator.getMeta(),
    data: users.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      iin: maskIin(user.iin),
      cardNumber: user.cardNumber,
      createdAt: user.createdAt.toISO(),
      membership: summarize(byUser.get(user.id) ?? [], today),
    })),
  }
}

/** Карточки на панели: всего мемберов, с действующим абонементом, заканчивающиеся в ближайшие 7 дней */
export async function getDashboardStats() {
  const today = todayIso()

  const result = await db.rawQuery(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE ${hasActive('u.id')}) AS active,
       COUNT(*) FILTER (WHERE ${hasActive('u.id')} AND ${lastEnd('u.id')} <= ?) AS expiring
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = ?`,
    [today, today, today, today, expiringLimit(today), RolesEnum.USER]
  )

  const row = result.rows[0]
  return {
    totalMembers: Number(row.total),
    activeMembers: Number(row.active),
    expiringMembers: Number(row.expiring),
  }
}
/**
 * Временный пароль, который админ один раз видит и передаёт человеку.
 * Без похожих символов (0/O, 1/l/I) и с теми же требованиями, что и при регистрации:
 * строчная, заглавная, цифра и спецсимвол.
 */
export function generateTemporaryPassword(): string {
  const groups = ['abcdefghjkmnpqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '@$!%*?&']
  const all = groups.join('')
  const pick = (chars: string) => chars[randomInt(chars.length)]

  const chars = [...groups.map(pick), ...Array.from({ length: 6 }, () => pick(all))]

  // перемешиваем, чтобы символ каждой группы не стоял всегда на одном месте
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

export type NewMemberData = {
  fullName: string
  email: string
  phone: string
  iin?: string
  planId?: number
  paymentMethod?: 'kaspi' | 'cash'
}

export type CreateMemberResult =
  | { ok: false; reason: 'plan_not_found' }
  | {
      ok: true
      member: User
      temporaryPassword: string
      membership: { planName: string; startDate: string; endDate: string } | null
    }

/**
 * Админ создаёт мембера. Аккаунт, платёж и абонемент создаются в одной транзакции:
 * если что-то не получится, в базе не останется «полу-мембера».
 */
export async function createMember(
  data: NewMemberData,
  adminId: number
): Promise<CreateMemberResult> {
  const plan = data.planId
    ? await MembershipPlan.query().where('id', data.planId).where('is_active', true).first()
    : null

  if (data.planId && !plan) {
    return { ok: false, reason: 'plan_not_found' }
  }

  const temporaryPassword = generateTemporaryPassword()

  return db.transaction(async (trx) => {
    // роль не указываем: по умолчанию в БД role_id = 1 (USER)
    const member = await User.create(
      {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        iin: data.iin ?? null,
        password: temporaryPassword,
        mustChangePassword: true,
        createdByAdminId: adminId,
      },
      { client: trx }
    )

    let membership: { planName: string; startDate: string; endDate: string } | null = null

    if (plan) {
      const granted = await grantConfirmedPayment(trx, {
        userId: member.id,
        plan,
        method: data.paymentMethod === 'cash' ? PaymentMethod.CASH : PaymentMethod.KASPI,
        adminId,
      })

      membership = {
        planName: plan.name,
        startDate: granted.membership.startDate.toISODate()!,
        endDate: granted.membership.endDate.toISODate()!,
      }

      // карта выдана внутри grantConfirmedPayment, перечитываем пользователя
      await member.refresh()
    }

    return { ok: true, member, temporaryPassword, membership } as const
  })
}