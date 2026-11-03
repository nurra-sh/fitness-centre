import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { catchError, map, of } from "rxjs";
import { Auth } from "../services/auth";
import { AuthApi } from "../services/auth-api";
import { RolesEnum } from "../types/auth.types";

export const roleGuard = (roles: RolesEnum[]): CanActivateFn => {
  return () => {
    const authService = inject(Auth)
    const authApi = inject(AuthApi)
    const router = inject(Router)

    const check = () => authService.hasRoles(roles) ? true : router.createUrlTree(['/'])

    if (authService.currentUser()) {
      return check()
    }

    if (authService.token()) {
      return authApi.me().pipe(
        map(() => check()),
        catchError(() => of(router.createUrlTree(['/login'])))
      )
    }

    return router.createUrlTree(['/login'])
  }
}