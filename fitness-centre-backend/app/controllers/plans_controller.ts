import type { HttpContext } from '@adonisjs/core/http'
import MembershipPlan from '#models/membership_plan'

export default class PlansController {
  async index({ response }: HttpContext) {
    const plans = await MembershipPlan.query().where('is_active', true).orderBy('sort_order')

    return response.ok({
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        months: plan.durationMonths,
        price: plan.price,
        highlight: plan.isHighlighted,
        perks: plan.perks,
      })),
    })
  }
}