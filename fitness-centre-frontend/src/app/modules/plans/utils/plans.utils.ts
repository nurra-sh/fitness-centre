import { Plan } from '../types/plans.types';

export function formatTenge(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₸`;
}

export function pricePerMonth(plan: Plan): number {
  return plan.price / plan.months;
}

/**
 * Выгода в процентах относительно самого короткого абонемента из списка,
 * купленного нужное число раз подряд. У самого короткого тарифа выгоды нет (0).
 */
export function calcSavingPercent(plan: Plan, plans: Plan[]): number {
  if (plans.length === 0) {
    return 0;
  }

  const base = plans.reduce((shortest, item) => (item.months < shortest.months ? item : shortest));
  const fullPrice = pricePerMonth(base) * plan.months;

  return Math.max(0, Math.round((1 - plan.price / fullPrice) * 100));
}