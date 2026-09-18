import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { productsApi, type ListProductsParams, type ProductPayload } from '@/api/products';
import { getErrorMessage, getPlanLimitError } from '@/lib/errors';

export function useProducts(params: ListProductsParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.list(params),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: ProductPayload) => productsApi.create(payload),
    onError: (error) => {
      const planLimit = getPlanLimitError(error);
      if (planLimit) {
        toast.error(planLimit.message, {
          action: { label: 'Upgrade plan', onClick: () => navigate('/billing/plans') },
        });
        return;
      }
      toast.error(getErrorMessage(error, 'Could not create product'));
    },
    onSuccess: () => toast.success('Product created'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProductPayload> }) =>
      productsApi.update(id, payload),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update product')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete product')),
    onSuccess: () => toast.success('Product deleted'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}