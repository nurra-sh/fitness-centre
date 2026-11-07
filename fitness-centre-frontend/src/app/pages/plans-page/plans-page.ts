import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PlansApi } from '../../modules/plans/services/plans-api';
import { Plan } from '../../modules/plans/types/plans.types';
import { calcSavingPercent, formatTenge, pricePerMonth } from '../../modules/plans/utils/plans.utils';

@Component({
  selector: 'app-plans-page',
  imports: [RouterLink],
  templateUrl: './plans-page.html',
  styleUrl: './plans-page.scss',
})
export class PlansPage {
  readonly plans = signal<Plan[]>([]);
  readonly plansLoading = signal(true);
  readonly plansError = signal(false);

  readonly formatTenge = formatTenge;
  readonly pricePerMonth = pricePerMonth;

  readonly faq = [
    {
      q: 'Когда начинается мой абонемент?',
      a: 'Сразу после успешной оплаты. Если у вас уже есть действующий абонемент, новый начнётся на следующий день после окончания текущего.',
    },
    {
      q: 'Где посмотреть, сколько дней осталось?',
      a: 'После входа откройте страницу «Мой абонемент»: там указаны дата окончания и количество оставшихся дней.',
    },
    {
      q: 'Как можно оплатить?',
      a: 'Банковской картой онлайн через Stripe или наличными на ресепшене фитнес-центра.',
    },
    {
      q: 'Можно ли вернуть деньги?',
      a: 'Обратитесь на ресепшен или напишите нам через страницу контактов, мы рассмотрим вашу ситуацию.',
    },
  ];

  constructor() {
    inject(PlansApi)
      .getPlans()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (plans) => {
          this.plans.set(plans);
          this.plansLoading.set(false);
        },
        error: () => {
          this.plansError.set(true);
          this.plansLoading.set(false);
        },
      });
  }

  savingPercent(plan: Plan): number {
    return calcSavingPercent(plan, this.plans());
  }

  onBuy(plan: Plan): void {
    // TODO: если пользователь не вошёл, отправить на /login;
    // иначе POST /memberships/checkout { planId } и редирект на ссылку Stripe
    console.log('Покупка абонемента', plan.id);
  }
}