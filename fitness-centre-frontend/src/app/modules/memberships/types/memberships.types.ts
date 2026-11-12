export type PaymentMethod = 'debit_card' | 'kaspi'
export type PaymentStatus = 'pending' | 'paid' | 'confirmed' | 'cancelled'
export type MembershipStatus = 'active' | 'upcoming' | 'expired'

export interface MembershipItem {
    id: number
    plan: { id: number; name: string; months: number } | null
    startDate: string // YYYY-MM-DD
    endDate: string // YYYY-MM-DD, последний день включительно
    status: MembershipStatus
    daysLeft: number
    daysUntilStart: number
}

export interface PaymentItem {
    id: number
    planName: string
    amount: number
    method: PaymentMethod
    status: PaymentStatus
    createdAt: string
    paidAt: string | null
}

export interface MyMembershipResponse {
    cardNumber: string | null
    current: MembershipItem | null
    upcoming: MembershipItem[]
    history: MembershipItem[]
    totalDaysLeft: number
    hasPendingPayment: boolean
    payments: PaymentItem[]
}

export interface PurchaseBody {
    planId: number
    paymentMethod: PaymentMethod
}

export interface PurchaseResponse {
    paymentId: number
    status: PaymentStatus
        url?: string | null // адрес страницы оплаты Stripe (только для оплаты картой)
}