export interface Plan {
  id: number;
  name: string;
  months: number;
  price: number; // в тенге
  highlight?: boolean;
  perks: string[];
}

// TODO: заменить на данные из GET /plans, когда бэкенд будет готов
export const PLANS: Plan[] = [
  {
    id: 1,
    name: '1 месяц',
    months: 1,
    price: 22000,
    perks: ['Безлимитное посещение зала', 'Раздевалка и душевые', 'Вводная консультация тренера'],
  },
  {
    id: 2,
    name: '3 месяца',
    months: 3,
    price: 57000,
    perks: ['Безлимитное посещение зала', 'Групповые занятия', 'Раздевалка и душевые'],
  },
  {
    id: 3,
    name: '6 месяцев',
    months: 6,
    price: 105000,
    perks: ['Безлимитное посещение зала', 'Групповые занятия', '1 персональная тренировка'],
  },
  {
    id: 4,
    name: '12 месяцев',
    months: 12,
    price: 190000,
    highlight: true,
    perks: ['Безлимитное посещение зала', 'Групповые занятия', '3 персональные тренировки'],
  },
];

export function formatTenge(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₸`;
}

export function pricePerMonth(plan: Plan): number {
  return plan.price / plan.months;
}

// Выгода относительно покупки месячного абонемента нужное число раз
export function savingPercent(plan: Plan): number {
  const full = PLANS[0].price * plan.months;
  return Math.round((1 - plan.price / full) * 100);
}