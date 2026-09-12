import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { authApi, type LoginPayload, type RegisterPayload } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/lib/errors';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.mustChangePassword);
      if (data.mustChangePassword) {
        navigate('/change-password');
      } else {
        toast.success(`Welcome back, ${data.user.name.split(' ')[0]}`);
        navigate(data.user.organizationId ? '/dashboard' : '/organization/create');
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not log in'));
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, false);
      toast.success('Account created');
      navigate('/organization/create');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not create account'));
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logout();
      navigate('/login');
    },
    // No success/error toast here on purpose — the redirect to /login
    // is immediate confirmation enough, and a toast would just be noise
    // firing on the page the user is leaving.
  });
}

export function useChangePassword() {
  const clearMustChangePassword = useAuthStore((s) => s.clearMustChangePassword);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (newPassword: string) => authApi.changePassword(newPassword),
    onSuccess: () => {
      clearMustChangePassword();
      toast.success('Password updated');
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not update password'));
    },
  });
}