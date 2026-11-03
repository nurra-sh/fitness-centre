import { Component, inject } from '@angular/core';
import { Auth } from '../../modules/auth/services/auth';

@Component({
  selector: 'app-admin-dashboard-page',
  templateUrl: './admin-dashboard-page.html',
  styleUrl: './admin-dashboard-page.scss',
})
export class AdminDashboardPage {
  readonly user = inject(Auth).currentUser;
}