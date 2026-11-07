import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PlansApi } from '../../modules/plans/services/plans-api';
import { Plan } from '../../modules/plans/types/plans.types';
import { calcSavingPercent, formatTenge, pricePerMonth } from '../../modules/plans/utils/plans.utils';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  readonly plans = signal<Plan[]>([]);
  readonly plansLoading = signal(true);
  readonly plansError = signal(false);

  readonly formatTenge = formatTenge;
  readonly pricePerMonth = pricePerMonth;

  readonly benefits = [
    { title: 'Современный зал', text: 'Свежее оборудование для силовых и кардио тренировок, просторные зоны для разминки.' },
    { title: 'Опытные тренеры', text: 'Помогут составить программу под вашу цель и поправят технику.' },
    { title: 'Оплата онлайн', text: 'Выберите абонемент на сайте и оплатите картой, без очередей на ресепшене.' },
    { title: 'Личный кабинет', text: 'Видно статус абонемента, дату окончания и сколько дней осталось.' },
  ];

  readonly steps = [
    { title: 'Выберите абонемент', text: 'Четыре варианта: на 1, 3, 6 или 12 месяцев.' },
    { title: 'Оплатите онлайн', text: 'Безопасная оплата банковской картой через Stripe.' },
    { title: 'Занимайтесь', text: 'Абонемент активируется сразу после оплаты, остаток дней виден в кабинете.' },
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
}