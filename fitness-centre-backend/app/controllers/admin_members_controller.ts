import type { HttpContext } from '@adonisjs/core/http'
import { membersIndexValidator } from '#validators/admin_member'
import { listMembers } from '#services/admin_member_service'

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
}