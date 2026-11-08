/** 249827745617 -> 2498 2774 5617 */
export function formatCardNumber(card: string): string {
  return card.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** 1 день, 2 дня, 5 дней, 11 дней, 21 день */
export function pluralDays(count: number): string {
  const n = Math.abs(count) % 100;
  const last = n % 10;

  if (n > 10 && n < 20) return 'дней';
  if (last === 1) return 'день';
  if (last >= 2 && last <= 4) return 'дня';
  return 'дней';
}

/** 2026-12-06 -> 6 декабря 2026 г. (разбираем вручную, чтобы часовой пояс не сдвинул дату) */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}