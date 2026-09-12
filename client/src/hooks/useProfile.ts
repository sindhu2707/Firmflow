import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi, type UpdateProfilePayload } from '@/api/users';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/lib/errors';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: usersApi.getProfile,
  });
}

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => usersApi.updateProfile(payload),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not update profile'));
    },
  });
}