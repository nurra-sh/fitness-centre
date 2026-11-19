import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { catchError, debounceTime, finalize, map, of, switchMap } from 'rxjs';
import { AdminMembersApi } from '../../modules/admin/services/admin-members-api';
import { CreateMemberBody, CreateMemberResponse, MemberRow, OfflinePaymentMethod } from '../../modules/admin/types/admin.types';
import { formatCardNumber, formatDate } from '../../modules/memberships/utils/memberships.utils';
import { PlansApi } from '../../modules/plans/services/plans-api';
import { formatTenge } from '../../modules/plans/utils/plans.utils';
import { phoneValidator } from '../../shared/validators/phone.validator';

/** Последние 10 цифр номера: так сравниваем «8 701...» и «+7 701...» */
const phoneKey = (phone: string | null) => (phone ?? '').replace(/\D/g, '').slice(-10);

@Component({
  selector: 'app-admin-member-form-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule, SelectModule, SelectButtonModule],
  templateUrl: './admin-member-form-page.html',
  styleUrl: './admin-member-form-page.scss',
})
export class AdminMemberFormPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly adminApi = inject(AdminMembersApi);

  readonly saving = signal(false);
  readonly result = signal<CreateMemberResponse | null>(null);
  readonly samePhone = signal<MemberRow[]>([]); // мемберы с таким же телефоном (семья на один номер)
  readonly copied = signal(false);

  readonly planOptions = signal<{ label: string; value: number }[]>([]);
  readonly paymentOptions: { label: string; value: OfflinePaymentMethod }[] = [
    { label: 'Kaspi', value: 'kaspi' },
    { label: 'Наличные', value: 'cash' },
  ];

  readonly formatCardNumber = formatCardNumber;
  readonly formatDate = formatDate;

  readonly form = this.formBuilder.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, phoneValidator]],
    iin: ['', [Validators.pattern(/^\d{12}$/)]],
    planId: this.formBuilder.control<number | null>(null),
    paymentMethod: this.formBuilder.control<OfflinePaymentMethod | null>(null),
  });

  constructor() {
    inject(PlansApi)
      .getPlans()
      .pipe(takeUntilDestroyed())
      .subscribe((plans) =>
        this.planOptions.set(plans.map((plan) => ({ label: `${plan.name}, ${formatTenge(plan.price)}`, value: plan.id })))
      );

    // способ оплаты обязателен, только если выбран тариф
    this.form.controls.planId.valueChanges.pipe(takeUntilDestroyed()).subscribe((planId) => {
      const payment = this.form.controls.paymentMethod;
      payment.setValidators(planId ? [Validators.required] : []);
      if (!planId) {
        payment.setValue(null);
      }
      payment.updateValueAndValidity();
    });

    // предупреждение, если такой телефон уже есть у другого мембера (создать всё равно можно)
    this.form.controls.phone.valueChanges
      .pipe(
        debounceTime(400),
        switchMap((phone) => {
          if (this.form.controls.phone.invalid) {
            return of([]);
          }
          return this.adminApi.getMembers({ search: phone, perPage: 5 }).pipe(
            map((response) => response.data.filter((member) => phoneKey(member.phone) === phoneKey(phone))),
            catchError(() => of([]))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((members) => this.samePhone.set(members));
  }

  save() {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const body: CreateMemberBody = {
      fullName: value.fullName.trim(),
      email: value.email.trim().toLowerCase(),
      phone: value.phone.trim(),
      ...(value.iin.trim() && { iin: value.iin.trim() }),
      ...(value.planId && { planId: value.planId, paymentMethod: value.paymentMethod! }),
    };

    this.saving.set(true);
    this.adminApi
      .createMember(body)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => this.result.set(response),
        error: (error: HttpErrorResponse) => this.showServerErrors(error),
      });
  }

  copyPassword() {
    const password = this.result()?.temporaryPassword;
    if (!password) {
      return;
    }
    navigator.clipboard?.writeText(password).then(() => this.copied.set(true));
  }

  addAnother() {
    this.result.set(null);
    this.samePhone.set([]);
    this.copied.set(false);
    this.form.reset();
  }

  /** Ошибки сервера (например, «почта уже занята») показываем под нужным полем */
  private showServerErrors(error: HttpErrorResponse) {
    const errors: { field?: string; message?: string }[] = error.error?.errors ?? [];
    for (const item of errors) {
      const control = item.field ? this.form.get(item.field) : null;
      if (control) {
        control.setErrors({ server: item.message ?? 'Ошибка' });
        control.markAsTouched();
      }
    }
  }
}