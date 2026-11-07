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
    
  }).prefix('auth')
  router.get('plans', [PlansController, 'index'])
}).prefix('/api/v1')
// Админские маршруты: сначала проверка токена, потом проверка роли
router
  .group(() => {
    router.get('ping', async () => ({ message: 'pong, у вас права администратора' }))
  })
  .prefix('/api/v1/admin')
  .use([middleware.auth({ guards: ['api'] }), middleware.role([RolesEnum.ADMIN])])