import { PaginationMeta } from '../../../core/types/global.types';

export type MemberStatusFilter = 'active' | 'expiring' | 'expired' | 'none'
export type MemberMembershipStatus = 'active' | 'upcoming' | 'expired' | 'none'

export interface MemberMembership {
    status: MemberMembershipStatus
    planName: string | null
    startDate: string | null // YYYY-MM-DD
    endDate: string | null // YYYY-MM-DD, последний день включительно (с учётом оплаченных наперёд)
    daysLeft: number
    expiringSoon: boolean
}

export interface MemberRow {
    id: number
    fullName: string | null
    email: string
    phone: string | null
    iin: string | null // только маска, например ********0123
    cardNumber: string | null
    createdAt: string
    membership: MemberMembership
}

export interface MembersResponse {
    meta: PaginationMeta
    data: MemberRow[]
}

export interface MembersFilters {
    page?: number
    perPage?: number
    search?: string
    status?: MemberStatusFilter
}

export interface DashboardStats {
    totalMembers: number
    activeMembers: number
    expiringMembers: number
}