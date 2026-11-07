export interface Plan {
    id: number
    name: string
    months: number
    price: number // в тенге
    highlight: boolean
    perks: string[]
}

export interface PlansResponse {
    plans: Plan[]
}