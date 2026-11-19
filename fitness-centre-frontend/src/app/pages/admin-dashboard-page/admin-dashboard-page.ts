import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { BehaviorSubject, catchError, debounceTime, distinctUntilChanged, EMPTY, map, switchMap, tap } from 'rxjs';
import { PaginationMeta } from '../../core/types/global.types';
import { AdminMembersApi } from '../../modules/admin/services/admin-members-api';
import { DashboardStats, MemberRow, MemberStatusFilter } from '../../modules/admin/types/admin.types';
import { formatCardNumber, formatDate, pluralDays } from '../../modules/memberships/utils/memberships.utils';
import { Pagination } from '../../shared/ui/pagination/pagination';
import { RouterLink } from '@angular/router';

const PER_PAGE = 10;

interface MembersQuery {
  page: number;
  search: string;
  status: MemberStatusFilter | null;
  refresh: number; // увеличивается кнопкой «Обновить», чтобы запрос повторился
}

interface CardCheck {
  severity: 'success' | 'warn' | 'error';
  text: string;
}

type TagSeverity = 'success' | 'warn' | 'info' | 'danger' | 'secondary';

/** 12 цифр (возможно, с пробелами или дефисами): так вводят номер карты */
function isCardNumber(search: string): boolean {
  return /^[\d\s-]+$/.test(search) && search.replace(/\D/g, '').length === 12;
}

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [
    DatePipe, RouterLink,ReactiveFormsModule, ButtonModule, IconFieldModule, InputIconModule,
    InputTextModule, MessageModule, SelectModule, TagModule, Pagination,
  ],
  templateUrl: './admin-dashboard-page.html',
  styleUrl: './admin-dashboard-page.scss',
})
export class AdminDashboardPage {
  private readonly api = inject(AdminMembersApi);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl<MemberStatusFilter | null>(null);

  readonly statusOptions: { label: string; value: MemberStatusFilter }[] = [
    { label: 'Действующие', value: 'active' },
    { label: 'Заканчиваются за 7 дней', value: 'expiring' },
    { label: 'Закончились', value: 'expired' },
    { label: 'Без абонемента', value: 'none' },
  ];

  readonly stats = signal<DashboardStats | null>(null);
  readonly statsError = signal(false);

  readonly members = signal<MemberRow[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly loadedSearch = signal(''); // поиск, для которого пришёл текущий список

  readonly skeletonRows = Array.from({ length: PER_PAGE }, (_, i) => i);

  readonly formatCardNumber = formatCardNumber;
  readonly formatDate = formatDate;
  readonly pluralDays = pluralDays;

  private readonly query = new BehaviorSubject<MembersQuery>({ page: 1, search: '', status: null, refresh: 0 });

  /** Быстрая проверка карты: если в поиск ввели 12 цифр, показываем решение «пропускать или нет» */
  readonly cardCheck = computed<CardCheck | null>(() => {
    const search = this.loadedSearch();
    if (this.loading() || this.error() || !isCardNumber(search)) {
      return null;
    }

    const card = search.replace(/\D/g, '');
    const member = this.members().find((item) => item.cardNumber === card);

    if (!member) {
      return { severity: 'error', text: `Карта ${formatCardNumber(card)} не найдена` };
    }

    const name = member.fullName || 'без имени';
    const { status, endDate, startDate, daysLeft, expiringSoon } = member.membership;
    const left = `${daysLeft} ${pluralDays(daysLeft)}`;

    switch (status) {
      case 'active':
        return expiringSoon
          ? { severity: 'warn', text: `Допуск разрешён, но абонемент скоро закончится: ${name}. Действует до ${formatDate(endDate!)}, осталось ${left}` }
          : { severity: 'success', text: `Допуск разрешён: ${name}. Абонемент до ${formatDate(endDate!)}, осталось ${left}` };
      case 'upcoming':
        return { severity: 'warn', text: `Абонемент ещё не начался: ${name}. Начнётся ${formatDate(startDate!)}` };
      case 'expired':
        return { severity: 'error', text: `Абонемент закончился ${formatDate(endDate!)}: ${name}` };
      default:
        return { severity: 'error', text: `Абонемента нет: ${name}` };
    }
  });

  constructor() {
    this.api
      .getStats()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (stats) => this.stats.set(stats), error: () => this.statsError.set(true) });

    this.query
      .pipe(
        distinctUntilChanged(
          (a, b) => a.page === b.page && a.search === b.search && a.status === b.status && a.refresh === b.refresh,
        ),
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        // switchMap отменяет прошлый запрос: медленный ответ не перезапишет более свежий
        switchMap((query) =>
          this.api
            .getMembers({
              page: query.page,
              perPage: PER_PAGE,
              search: query.search || undefined,
              // при проверке карты фильтр статуса не применяем, иначе карта могла бы «не найтись»
              status: isCardNumber(query.search) ? undefined : (query.status ?? undefined),
            })
            .pipe(
              map((response) => ({ response, query })),
              catchError(() => {
                this.error.set(true);
                this.loading.set(false);
                return EMPTY;
              }),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ response, query }) => {
        this.members.set(response.data);
        this.meta.set(response.meta);
        this.loadedSearch.set(query.search);
        this.loading.set(false);
      });

    this.searchControl.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((value) => this.setQuery({ search: value.trim(), page: 1 }));

    this.statusControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((status) => this.setQuery({ status, page: 1 }));
  }

  /** Enter в поле поиска: не ждём паузы после набора (удобно при вводе номера карты) */
  searchNow() {
    this.setQuery({ search: this.searchControl.value.trim(), page: 1 });
  }

  goToPage(page: number) {
    const lastPage = this.meta()?.lastPage ?? 1;
    if (page < 1 || page > lastPage || page === this.query.value.page) {
      return;
    }
    this.setQuery({ page });
  }

  refresh() {
    this.setQuery({ refresh: this.query.value.refresh + 1 });
    this.api.getStats().subscribe({ next: (stats) => this.stats.set(stats) });
  }

  statusLabel(member: MemberRow): string {
    switch (member.membership.status) {
      case 'active':
        return member.membership.expiringSoon ? 'Заканчивается' : 'Действует';
      case 'upcoming':
        return 'Ещё не начался';
      case 'expired':
        return 'Закончился';
      default:
        return 'Нет абонемента';
    }
  }

  statusSeverity(member: MemberRow): TagSeverity {
    switch (member.membership.status) {
      case 'active':
        return member.membership.expiringSoon ? 'warn' : 'success';
      case 'upcoming':
        return 'info';
      case 'expired':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  private setQuery(patch: Partial<MembersQuery>) {
    this.query.next({ ...this.query.value, ...patch });
  }
}