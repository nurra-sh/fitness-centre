/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import AuthController from '#controllers/auth_controller'
import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import { RolesEnum } from '#enums/role_enums'
import PlansController from '#controllers/plans_controller'
import MembershipsController from '#controllers/memberships_controller'
import WebhooksController from '#controllers/webhooks_controller'
import AdminDashboardsController from '#controllers/admin_dashboards_controller'
import AdminMembersController from '#controllers/admin_members_controller'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})
router.group(() => {
  router.group(() => {
    router.post('login', [AuthController, 'login'])
    router.post('register', [AuthController, 'register'])
    router.get('/me', [AuthController, 'me']).use(middleware.auth({ guards: ['api'] }))
    router.post('change-password', [AuthController, 'changePassword']).use(middleware.auth({ guards: ['api'] }))

  }).prefix('auth')
  router.get('plans', [PlansController, 'index'])
  router
    .group(() => {
      router.get('me', [MembershipsController, 'me'])
      router.post('purchase', [MembershipsController, 'purchase'])
    })
    .prefix('memberships')
    .use(middleware.auth({ guards: ['api'] }))
  // вызывается самим Stripe, без токена пользователя: подлинность проверяется по подписи
  router.post('webhooks/stripe', [WebhooksController, 'stripe'])
}).prefix('/api/v1')
// Админские маршруты: сначала проверка токена, потом проверка роли
router
  .group(() => {
    router.get('ping', async () => ({ message: 'pong, у вас права администратора' }))
    router.get('dashboard-stats', [AdminDashboardsController, 'stats'])
    router.get('members', [AdminMembersController, 'index'])
    router.post('members', [AdminMembersController, 'store'])
  })

  .prefix('/api/v1/admin')
  .use([middleware.auth({ guards: ['api'] }), middleware.role([RolesEnum.ADMIN])])