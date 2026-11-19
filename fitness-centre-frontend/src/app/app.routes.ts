import { Routes } from '@angular/router';
import { LoginPage } from './pages/login-page/login-page';
import { RegisterPage } from './pages/register-page/register-page';
import { MainLayout } from './layout/main-layout/main-layout';
import { HomePage } from './pages/home-page/home-page';
import { PlansPage } from './pages/plans-page/plans-page';
import guestGuard from './modules/auth/guards/guest.guard';
import { roleGuard } from './modules/auth/guards/role.guard';
import { RolesEnum } from './modules/auth/types/auth.types';
import { RouterOutletShell } from './layout/router-outlet-shell/router-outlet-shell';
import { MyMembershipPage } from './pages/my-membership-page/my-membership-page';
import authGuard from './modules/auth/guards/auth.guard';
import { ChangePasswordPage } from './pages/change-password-page/change-password-page';
import changePasswordGuard from './modules/auth/guards/change-password.guard';

export const routes: Routes = [
    {
        path: '',
        component: MainLayout,
        children: [
            {
                path: '',
                component: HomePage
            },
            {
                path: 'plans',
                component: PlansPage
            },
            {
                path: 'my-membership',
                component: MyMembershipPage,
                canActivate: [authGuard]
            },
                        {
                path: 'change-password',
                component: ChangePasswordPage,
                canActivate: [changePasswordGuard]
            },
            {
                path: 'login',
                component: LoginPage,
                canActivate: [guestGuard]
            },
            {
                path: 'register',
                component: RegisterPage,
                canActivate: [guestGuard]
            },
            {
                path: 'admin',
                component: RouterOutletShell,
                canActivate: [roleGuard([RolesEnum.ADMIN])],
                children: [
                    {
                        path: '',
                        redirectTo: 'dashboard',
                        pathMatch: 'full'
                    },
                    {
                        path: 'dashboard',
                        // админка грузится отдельным файлом только при открытии, чтобы не раздувать основной бандл
                        loadComponent: () =>
                            import('./pages/admin-dashboard-page/admin-dashboard-page').then((m) => m.AdminDashboardPage)
                    },
                       {
                        path: 'members/new',
                        loadComponent: () =>
                            import('./pages/admin-member-form-page/admin-member-form-page').then((m) => m.AdminMemberFormPage)
                    }
                ]
            }
        ]
    }
];
