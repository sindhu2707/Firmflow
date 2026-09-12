import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { organizationsApi, type CreateOrgPayload } from '@/api/organizations';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/lib/errors';

export function useCreateOrganization() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: CreateOrgPayload) => organizationsApi.create(payload),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      if (user) {
        setUser({ ...user, organizationId: data.organization.id });
      }
      toast.success(`${data.organization.name} is ready`);
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not create organization'));
    },
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: organizationsApi.getDashboard,
    // No toast here — a query's onError firing every background
    // refetch would be noisy. Keep the isError branch you already
    // have in DashboardPage for query failures.
  });
}