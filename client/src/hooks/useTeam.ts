import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/api/users';

export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: usersApi.listOrgUsers,
  });
}