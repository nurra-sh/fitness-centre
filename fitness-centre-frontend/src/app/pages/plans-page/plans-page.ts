import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fromEvent } from 'rxjs';
import { REDIRECT } from '../../core/tokens/redirect.token';
import { Auth } from '../../modules/auth/services/auth';
import { MembershipsApi } from '../../modules/memberships/services/memberships-api';
import { PaymentMethod } from '../../modules/memberships/types/memberships.types';
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

   private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly membershipsApi = inject(MembershipsApi);
    private readonly redirect = inject(REDIRECT);

  // ?payment=cancelled приходит, если человек вернулся со страницы оплаты Stripe, не заплатив
  readonly paymentCancelled = inject(ActivatedRoute).snapshot.queryParamMap.get('payment') === 'cancelled';

  // окно выбора способа оплаты
  readonly selectedPlan = signal<Plan | null>(null);
  readonly purchasing = signal(false);
  readonly purchaseError = signal<string | null>(null);

    readonly methods: { id: PaymentMethod; title: string; hint: string; enabled: boolean }[] = [
    { id: 'debit_card', title: 'Банковская карта', hint: 'Безопасная оплата через Stripe', enabled: true },
    { id: 'kaspi', title: 'Kaspi', hint: 'Имитация оплаты для учебного проекта', enabled: true },
  ];

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
          // Кнопка «Назад» в браузере может вернуть страницу из кеша вместе с зависшим окном оплаты
    fromEvent<PageTransitionEvent>(window, 'pageshow')
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event.persisted) {
          this.purchasing.set(false);
        }
      });
  }

  savingPercent(plan: Plan): number {
    return calcSavingPercent(plan, this.plans());
  }

    onBuy(plan: Plan): void {
    // токен проверяем, а не загруженного пользователя: после обновления страницы он ещё не загружен
    if (!this.auth.token()) {
      this.router.navigate(['/login']);
      return;
    }

    this.purchaseError.set(null);
    this.selectedPlan.set(plan);
  }

  closeModal(): void {
    if (!this.purchasing()) {
      this.selectedPlan.set(null);
    }
  }

  pay(method: PaymentMethod): void {
    const plan = this.selectedPlan();
    if (!plan || this.purchasing()) {
      return;
    }

    this.purchasing.set(true);
    this.purchaseError.set(null);

    this.membershipsApi.purchase({ planId: plan.id, paymentMethod: method }).subscribe({
            next: (response) => {
        if (method === 'debit_card') {
          if (!response.url) {
            this.purchasing.set(false);
            this.purchaseError.set('Не удалось получить ссылку на оплату. Попробуйте ещё раз.');
            return;
          }

          // уходим на страницу оплаты Stripe; purchasing остаётся true, чтобы нельзя было нажать повторно
          this.redirect(response.url);
          return;
        }

        this.purchasing.set(false);
        this.selectedPlan.set(null);
        this.router.navigate(['/my-membership'], { queryParams: { payment: 'success' } });
      },
      error: (error: HttpErrorResponse) => {
        this.purchasing.set(false);
        this.purchaseError.set(error.error?.message ?? 'Не удалось оформить абонемент. Попробуйте ещё раз.');
      },
    });
  }
}