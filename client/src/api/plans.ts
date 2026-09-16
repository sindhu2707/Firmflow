import { apiClient } from '@/api/axios';
import type { Plan } from '@/types';

export const plansApi = {
  // Public endpoint — no auth required, safe to call from the pricing page
  // before login.
  list: async () => {
    const { data } = await apiClient.get<{ plans: Plan[] }>('/plans');
    return data;
  },
};
