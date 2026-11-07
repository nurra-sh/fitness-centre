import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Plan, PlansResponse } from '../types/plans.types';

@Injectable({
  providedIn: 'root',
})
export class PlansApi {
  private readonly http = inject(HttpClient)

  getPlans() {
    return this.http.get<PlansResponse>(`${environment.apiUrl}/plans`).pipe(
      map((response): Plan[] => response.plans)
    )
  }
}