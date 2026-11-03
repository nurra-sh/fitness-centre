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
import { AdminDashboardPage } from './pages/admin-dashboard-page/admin-dashboard-page';

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
                        component: AdminDashboardPage
                    }
                ]
            }
        ]
    }
];
