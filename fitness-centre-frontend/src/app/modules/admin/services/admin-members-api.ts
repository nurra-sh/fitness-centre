import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { CreateMemberBody, CreateMemberResponse, DashboardStats, MembersFilters, MembersResponse } from '../types/admin.types';

@Injectable({
  providedIn: 'root',
})
export class AdminMembersApi {
  private readonly http = inject(HttpClient)

  getStats() {
    return this.http.get<DashboardStats>(`${environment.apiUrl}/admin/dashboard-stats`)
  }

  getMembers(filters: MembersFilters = {}) {
    let params = new HttpParams()

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value))
      }
    }

    return this.http.get<MembersResponse>(`${environment.apiUrl}/admin/members`, { params })
  }
    createMember(body: CreateMemberBody) {
    return this.http.post<CreateMemberResponse>(`${environment.apiUrl}/admin/members`, body)
  }
}