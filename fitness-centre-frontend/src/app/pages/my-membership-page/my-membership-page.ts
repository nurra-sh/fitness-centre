import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap, takeWhile, timer } from 'rxjs';
import { MembershipsApi } from '../../modules/memberships/services/memberships-api';
import { MyMembershipResponse } from '../../modules/memberships/types/memberships.types';
import { formatCardNumber, formatDate, pluralDays } from '../../modules/memberships/utils/memberships.utils';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 10; // 10 раз по 2 секунды: столько ждём подтверждение оплаты от Stripe

@Component({
  selector: 'app-my-membership-page',
  imports: [RouterLink],
  templateUrl: './my-membership-page.html',
  styleUrl: './my-membership-page.scss',
})
export class MyMembershipPage {
  private readonly membershipsApi = inject(MembershipsApi);

  readonly data = signal<MyMembershipResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly waiting = signal(false); // идёт ожидание подтверждения оплаты
  readonly stillPending = signal(false); // ждали, но платёж так и не подтвердился

  // ?payment=success приходит после оплаты: Kaspi (сразу) и Stripe (подтверждение придёт чуть позже)
  readonly justPaid = inject(ActivatedRoute).snapshot.queryParamMap.get('payment') === 'success';

  readonly formatCardNumber = formatCardNumber;
  readonly formatDate = formatDate;
  readonly pluralDays = pluralDays;

  constructor() {
    timer(0, POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.membershipsApi.getMine()),
        // повторяем запрос, только если человек вернулся с оплаты, а платёж ещё не подтверждён
        takeWhile((data, index) => this.justPaid && data.hasPendingPayment && index < MAX_POLLS, true),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
          this.waiting.set(this.justPaid && data.hasPendingPayment);
        },
        error: () => {
          // если данные уже были показаны, не заменяем их ошибкой из-за одного неудачного запроса
          if (!this.data()) {
            this.error.set(true);
          }
          this.loading.set(false);
          this.waiting.set(false);
        },
        complete: () => {
          this.waiting.set(false);
          this.stillPending.set(this.justPaid && Boolean(this.data()?.hasPendingPayment));
        },
      });
  }
}