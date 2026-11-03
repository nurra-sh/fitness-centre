import { BaseSeeder } from '@adonisjs/lucid/seeders'
import MembershipPlan from '#models/membership_plan'

export default class extends BaseSeeder {
  async run() {
    await MembershipPlan.updateOrCreateMany('slug', [
      {
        slug: 'month-1',
        name: '1 месяц',
        durationMonths: 1,
        price: 22000,
        perks: ['Безлимитное посещение зала', 'Раздевалка и душевые', 'Вводная консультация тренера'],
        isHighlighted: false,
        sortOrder: 1,
      },
      {
        slug: 'month-3',
        name: '3 месяца',
        durationMonths: 3,
        price: 57000,
        perks: ['Безлимитное посещение зала', 'Групповые занятия', 'Раздевалка и душевые'],
        isHighlighted: false,
        sortOrder: 2,
      },
      {
        slug: 'month-6',
        name: '6 месяцев',
        durationMonths: 6,
        price: 105000,
        perks: ['Безлимитное посещение зала', 'Групповые занятия', '1 персональная тренировка'],
        isHighlighted: false,
        sortOrder: 3,
      },
      {
        slug: 'month-12',
        name: '12 месяцев',
        durationMonths: 12,
        price: 190000,
        perks: ['Безлимитное посещение зала', 'Групповые занятия', '3 персональные тренировки'],
        isHighlighted: true,
        sortOrder: 4,
      },
    ])
  }
}