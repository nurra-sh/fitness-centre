import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatTenge, PLANS, pricePerMonth, savingPercent } from '../../modules/plans/plans.data';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  readonly plans = PLANS;

  readonly formatTenge = formatTenge;
  readonly pricePerMonth = pricePerMonth;
  readonly savingPercent = savingPercent;

  readonly benefits = [
    { title: 'Современный зал', text: 'Свежее оборудование для силовых и кардио тренировок, просторные зоны для разминки.' },
    { title: 'Опытные тренеры', text: 'Помогут составить программу под вашу цель и поправят технику.' },
    { title: 'Оплата онлайн', text: 'Выберите абонемент на сайте и оплатите картой, без очередей на ресепшене.' },
    { title: 'Личный кабинет', text: 'Видно статус абонемента, дату окончания и сколько дней осталось.' },
  ];

  readonly steps = [
    { title: 'Выберите абонемент', text: 'Четыре варианта: на 1, 3, 6 или 12 месяцев.' },
    { title: 'Оплатите онлайн', text: 'Безопасная оплата банковской картой через Stripe.' },
    { title: 'Занимайтесь', text: 'Абонемент активируется сразу после оплаты, остаток дней виден в кабинете.' },
  ];
}