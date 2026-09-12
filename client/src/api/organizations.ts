import { apiClient } from '@/api/axios';
import type { DashboardData, Organization } from '@/types';

export interface CreateOrgPayload {
  name: string;
  slug: string;
}

// Note: creating an org re-issues the access token with organizationId embedded.
// Callers MUST update the auth store with the returned accessToken.
export interface CreateOrgResponse {
  organization: Organization;
  accessToken: string;
}

export const organizationsApi = {
  create: async (payload: CreateOrgPayload) => {
    const { data } = await apiClient.post<CreateOrgResponse>('/organizations', payload);
    return data;
  },
  getMyOrg: async () => {
    const { data } = await apiClient.get<{ organization: Organization }>(
      '/organizations/me',
    );
    return data;
  },
  getDashboard: async () => {
    const { data } = await apiClient.get<DashboardData>('/organizations/dashboard');
    return data;
  },
};
