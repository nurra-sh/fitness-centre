import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator } from '#validators/auth'
import hash from '@adonisjs/core/services/hash'
import { changePasswordValidator, registerValidator } from '#validators/auth'

export default class AuthController {
    async login({ request, response }: HttpContext) {
        const { email, password } = await request.validateUsing(loginValidator)

        const user = await User.verifyCredentials(email, password)

        const token = await User.accessTokens.create(user)

        return response.ok({
            type: 'bearer',
            token: token.value!.release(),
            user: user.serialize(),
            message: `Welcome back, ${user.fullName}!`,
        })
    }

    async register({ request, response }: HttpContext) {
        const payload = await request.validateUsing(registerValidator)

        await User.create(payload)

        return response.created({
            message: 'User registered successfully',
        })
    }

    async me({ auth, response }: HttpContext) {
        await auth.check()

        response.ok({
            user: auth.user
        })
    }
      /**
   * POST /auth/change-password { currentPassword, password, password_confirmation }
   * Смена пароля. Снимает флаг обязательной смены после временного пароля от админа.
   */
  async changePassword({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { currentPassword, password } = await request.validateUsing(changePasswordValidator)

    if (!(await hash.verify(user.password, currentPassword))) {
      return response.unprocessableEntity({
        errors: [{ field: 'currentPassword', message: 'Текущий пароль указан неверно' }],
      })
    }

    if (currentPassword === password) {
      return response.unprocessableEntity({
        errors: [{ field: 'password', message: 'Новый пароль должен отличаться от текущего' }],
      })
    }

    user.password = password
    user.mustChangePassword = false
    await user.save()

    return response.ok({ message: 'Пароль изменён', user: user.serialize() })
  }
}