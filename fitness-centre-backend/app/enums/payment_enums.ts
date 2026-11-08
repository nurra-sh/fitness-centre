export enum PaymentStatus {
  PENDING = 'pending', // платёж создан, ждём оплату (например, ответ Stripe)
  PAID = 'paid', // деньги получены онлайн (Stripe)
  CONFIRMED = 'confirmed', // принят без онлайн-оплаты (Kaspi)
  CANCELLED = 'cancelled', // отменён или истёк
}

export enum PaymentMethod {
  DEBIT_CARD = 'debit_card', // банковская карта через Stripe
  KASPI = 'kaspi', // оплата через Kaspi Терминал на рецепшионе, пока имитация
}