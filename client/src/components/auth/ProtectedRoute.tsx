import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import type { Role } from '@/types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  requireOrg?: boolean;
}

export function ProtectedRoute({ allowedRoles, requireOrg }: ProtectedRouteProps) {
  const { isAuthenticated, user, mustChangePassword } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireOrg && !user.organizationId) {
    return <Navigate to="/organization/create" replace />;
  }

  return <Outlet />;
}