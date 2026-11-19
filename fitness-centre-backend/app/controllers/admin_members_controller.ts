import type { HttpContext } from '@adonisjs/core/http'
import { createMemberValidator, membersIndexValidator } from '#validators/admin_member'
import { createMember, listMembers } from '#services/admin_member_service'

export default class AdminMembersController {
  /**
   * GET /admin/members?page=&perPage=&search=&status=
   * Список мемберов: поиск по имени, почте, телефону, номеру карты, фильтр по статусу абонемента.
   */
  async index({ request, response }: HttpContext) {
    const { page, perPage, search, status } = await request.validateUsing(membersIndexValidator)

    const members = await listMembers({
      page: page ?? 1,
      perPage: perPage ?? 10,
      search: search || undefined,
      status,
    })

    return response.ok(members)
  }
    /**
   * POST /admin/members
   * Админ создаёт мембера (и по желанию сразу выдаёт абонемент за Kaspi или наличные).
   * Временный пароль возвращается только в этом ответе: в базе он хранится лишь в виде хэша.
   */
  async store({ auth, request, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const payload = await request.validateUsing(createMemberValidator)

    let result
    try {
      result = await createMember(payload, admin.id)
    } catch (error) {
      // два одинаковых запроса одновременно (двойной клик): валидатор проверил почту до того,
      // как первый запрос её записал, и второй упирается в уникальный индекс базы
      const pgError = error as { code?: string; constraint?: string }
      if (pgError.code === '23505') {
        const field = String(pgError.constraint).includes('iin') ? 'iin' : 'email'
        return response.unprocessableEntity({
          errors: [{ field, message: 'Такой мембер уже создан' }],
        })
      }
      throw error
    }

    if (!result.ok) {
      return response.notFound({ message: 'Абонемент не найден' })
    }

    return response.created({
      member: {
        id: result.member.id,
        fullName: result.member.fullName,
        email: result.member.email,
        phone: result.member.phone,
        cardNumber: result.member.cardNumber ?? null, // без оплаты карты ещё нет
      },
      membership: result.membership,
      temporaryPassword: result.temporaryPassword,
    })
  }
}