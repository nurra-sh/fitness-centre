import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { MyMembershipResponse, PurchaseBody, PurchaseResponse } from '../types/memberships.types';

@Injectable({
  providedIn: 'root',
})
export class MembershipsApi {
  private readonly http = inject(HttpClient)

  getMine() {
    return this.http.get<MyMembershipResponse>(`${environment.apiUrl}/memberships/me`)
  }

  purchase(body: PurchaseBody) {
    return this.http.post<PurchaseResponse>(`${environment.apiUrl}/memberships/purchase`, body)
  }
}