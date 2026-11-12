import { InjectionToken } from '@angular/core';

/**
 * Переход на внешний адрес (страница оплаты Stripe).
 * Вынесен в токен, чтобы в тестах его можно было подменить и не покидать страницу.
 */
export const REDIRECT = new InjectionToken<(url: string) => void>('REDIRECT', {
  providedIn: 'root',
  factory: () => (url: string) => window.location.assign(url),
});