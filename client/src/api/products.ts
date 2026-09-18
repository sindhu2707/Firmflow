import { apiClient } from '@/api/axios';
import type { Product, ProductsResponse } from '@/types';

export interface ListProductsParams {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProductPayload {
  name: string;
  sku: string;
  description?: string;
  price: number; // paise/cents — integer
  stock?: number;
  isActive?: boolean;
}

export const productsApi = {
  list: async (params: ListProductsParams = {}) => {
    const { data } = await apiClient.get<ProductsResponse>('/products', { params });
    return data;
  },
  create: async (payload: ProductPayload) => {
    const { data } = await apiClient.post<{ product: Product }>('/products', payload);
    return data;
  },
  update: async (id: string, payload: Partial<ProductPayload>) => {
    const { data } = await apiClient.patch<{ product: Product }>(`/products/${id}`, payload);
    return data;
  },
  remove: async (id: string) => {
    await apiClient.delete(`/products/${id}`);
  },
};