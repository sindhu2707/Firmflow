import { apiClient } from '@/api/axios';
import type { AuthResponse } from '@/types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: async (payload: RegisterPayload) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
    return data;
  },
  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },
  refresh: async () => {
    const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh');
    return data;
  },
  logout: async () => {
    await apiClient.post('/auth/logout');
  },
  changePassword: async (newPassword: string) => {
    await apiClient.post('/auth/change-password', { newPassword });
  },
};
