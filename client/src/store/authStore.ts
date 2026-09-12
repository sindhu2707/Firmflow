import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  setAuth: (user: User, accessToken: string, mustChangePassword: boolean) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  clearMustChangePassword: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      mustChangePassword: false,
      setAuth: (user, accessToken, mustChangePassword) =>
        set({ user, accessToken, isAuthenticated: true, mustChangePassword }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) =>
        set((state) => ({ user: state.user ? { ...state.user, ...user } : user })),
      clearMustChangePassword: () => set({ mustChangePassword: false }),
      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false, mustChangePassword: false }),
    }),
    {
      name: 'firmflow-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword,
      }),
    },
  ),
);
