import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { catchError, map, of } from "rxjs";
import { Auth } from "../services/auth";
import { AuthApi } from "../services/auth-api";

/** Страница смены пароля: нужен только вход (без перенаправления самой на себя, как в authGuard) */
const changePasswordGuard: CanActivateFn = () => {
    const authApi = inject(AuthApi)
    const authService = inject(Auth)
    const router = inject(Router)

    if (authService.isAuthenticated()) {
        return true
    }

    if (authService.token()) {
        return authApi.me().pipe(
            map(() => true),
            catchError(() => of(router.createUrlTree(['/login'])))
        )
    }

    return router.createUrlTree(['/login'])
}

export default changePasswordGuard