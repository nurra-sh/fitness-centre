import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatTenge, Plan, PLANS, pricePerMonth, savingPercent } from '../../modules/plans/plans.data';

@Component({
  selector: 'app-plans-page',
  imports: [RouterLink],
  templateUrl: './plans-page.html',
  styleUrl: './plans-page.scss',
})
export class PlansPage {
  readonly plans = PLANS;

  readonly formatTenge = formatTenge;
  readonly pricePerMonth = pricePerMonth;
  readonly savingPercent = savingPercent;

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

  onBuy(plan: Plan): void {
    // TODO: если пользователь не вошёл, отправить на /login;
    // иначе POST /memberships/checkout { planId } и редирект на ссылку Stripe
    console.log('Покупка абонемента', plan.id);
  }
}