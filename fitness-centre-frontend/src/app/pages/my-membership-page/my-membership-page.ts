import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MembershipsApi } from '../../modules/memberships/services/memberships-api';
import { MyMembershipResponse } from '../../modules/memberships/types/memberships.types';
import { formatCardNumber, formatDate, pluralDays } from '../../modules/memberships/utils/memberships.utils';

@Component({
  selector: 'app-my-membership-page',
  imports: [RouterLink],
  templateUrl: './my-membership-page.html',
  styleUrl: './my-membership-page.scss',
})
export class MyMembershipPage {
  readonly data = signal<MyMembershipResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  // ?payment=success приходит после оформления (позже так же вернёт и Stripe)
  readonly justPaid = inject(ActivatedRoute).snapshot.queryParamMap.get('payment') === 'success';

  readonly formatCardNumber = formatCardNumber;
  readonly formatDate = formatDate;
  readonly pluralDays = pluralDays;

  constructor() {
    inject(MembershipsApi)
      .getMine()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }
}