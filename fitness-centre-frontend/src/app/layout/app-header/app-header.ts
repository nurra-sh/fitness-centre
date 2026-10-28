import { Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../modules/auth/services/auth';

@Component({
  imports: [ButtonModule, RouterLink, RouterLinkActive],
  selector: 'app-header',
  styleUrl: './app-header.scss',
  templateUrl: './app-header.html',
})
export class AppHeader {
  private readonly router = inject(Router)
    private readonly authService = inject(Auth)
    readonly isAuthenticated = computed(() => this.authService.isAuthenticated())

    logout() {
      this.authService.clearSession()
      this.router.navigateByUrl('/login')
    }
 }
