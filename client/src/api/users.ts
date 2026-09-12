import { apiClient } from '@/api/axios';
import type { User } from '@/types';
//import { axiosClient } from '@/api/axios';
import type { TeamMember } from '@/types/team';

export interface UpdateProfilePayload {
  name?: string;
  //email?: string;
}

export interface InvitePayload {
  name: string;
  email: string;
  password: string;
  role: 'employee' | 'customer';
}

export const usersApi = {
  getProfile: async () => {
    const { data } = await apiClient.get<{ user: User }>('/users/profile');
    return data;
  },
  updateProfile: async (payload: UpdateProfilePayload) => {
    const { data } = await apiClient.patch<{ user: User }>('/users/profile', payload);
    return data;
  },
  listOrgUsers: async () => {
    const { data } = await apiClient.get<{ users: User[] }>('/users');
    return data;
  },
  inviteUser: async (payload: InvitePayload) => {
    const { data } = await apiClient.post<{ user: User }>('/users/invite', payload);
    return data;
  },
};
