import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Проверяет номер так же, как сервер (см. normalizePhone на бэкенде).
 * Принимает: 8 701 123 45 67, +7 (701) 123-45-67, 7011234567.
 * Пустое значение не проверяется: за это отвечает Validators.required.
 */
export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();

  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  let national: string;

  if (value.startsWith('+')) {
    if (digits.length !== 11 || !digits.startsWith('7')) {
      return { phone: true };
    }
    national = digits.slice(1);
  } else if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    national = digits.slice(1);
  } else if (digits.length === 10) {
    national = digits;
  } else {
    return { phone: true };
  }

  return /^[3479]\d{9}$/.test(national) ? null : { phone: true };
}