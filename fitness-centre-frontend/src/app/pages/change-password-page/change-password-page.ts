import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { finalize } from 'rxjs';
import { Auth } from '../../modules/auth/services/auth';
import { AuthApi } from '../../modules/auth/services/auth-api';
import { mustMatch } from '../../shared/validators/must-watch.validator';

// те же требования, что на сервере: строчная, заглавная, цифра и спецсимвол @$!%*?&
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

@Component({
  selector: 'app-change-password-page',
  imports: [ReactiveFormsModule, CardModule, ButtonModule, MessageModule, PasswordModule],
  templateUrl: './change-password-page.html',
  styleUrl: './change-password-page.scss',
})
export class ChangePasswordPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  // пришёл сюда после входа с временным паролем от админа
  readonly isForced = computed(() => Boolean(this.authService.currentUser()?.mustChangePassword));

  readonly form = this.formBuilder.group(
    {
      currentPassword: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      password_confirmation: ['', [Validators.required]],
    },
    { validators: mustMatch('password', 'password_confirmation') }
  );

  onSubmit() {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authApi
      .changePassword(this.form.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl('/my-membership'),
      });
  }
}