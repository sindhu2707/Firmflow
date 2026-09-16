import { apiClient } from '@/api/axios';
import type { Invoice } from '@/types';

export const invoicesApi = {
  list: async () => {
    const { data } = await apiClient.get<{ invoices: Invoice[] }>('/invoices');
    return data;
  },
};
