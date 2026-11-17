import type { HttpContext } from '@adonisjs/core/http'
import { getDashboardStats } from '#services/admin_member_service'

export default class AdminDashboardsController {
  /** GET /admin/dashboard-stats */
  async stats({ response }: HttpContext) {
    return response.ok(await getDashboardStats())
  }
}