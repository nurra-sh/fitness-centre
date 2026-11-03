import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { RolesEnum } from '#enums/role_enums'

/**
 * Пропускает только пользователей с одной из разрешённых ролей.
 * Всегда ставится ПОСЛЕ middleware auth: middleware.role([RolesEnum.ADMIN])
 */
export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, allowedRoles: RolesEnum[]) {
    const user = ctx.auth.user

    if (!user) {
      return ctx.response.unauthorized({ message: 'Требуется авторизация' })
    }

    await user.load('role')

    if (!allowedRoles.includes(user.role.name)) {
      return ctx.response.forbidden({ message: 'Недостаточно прав для этого действия' })
    }

    return next()
  }
}