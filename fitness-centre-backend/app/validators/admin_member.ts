import vine from '@vinejs/vine'

export const membersIndexValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).withoutDecimals().optional(),
    perPage: vine.number().min(1).withoutDecimals().max(100).optional(),
    search: vine.string().trim().maxLength(100).optional(),
    status: vine.enum(['active', 'expiring', 'expired', 'none']).optional(),
  })
)