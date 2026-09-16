import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { CreateOrganizationPage } from '@/pages/organization/CreateOrganizationPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { TeamPage } from '@/pages/team/TeamPage';
import { ChangePasswordPage } from '@/pages/auth/ChangePasswordPage';
import { BillingPage } from '@/pages/billing/BillingPage';
import { PricingPage } from '@/pages/billing/PricingPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      { path: '/organization/create', element: <CreateOrganizationPage /> },
    ],
  },

  {
    element: <ProtectedRoute requireOrg />,
    children: [
      {
        element: <AppLayout />,
        children: [{ path: '/dashboard', element: <DashboardPage /> }],
      },
    ],
  },

  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },

  {
  element: <ProtectedRoute />,
    children: [
      { path: '/organization/create', element: <CreateOrganizationPage /> },
      { path: '/change-password', element: <ChangePasswordPage /> },
    ],
  },

  {
    element: <ProtectedRoute requireOrg />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/profile', element: <ProfilePage /> },
          {
            element: <ProtectedRoute allowedRoles={['org_owner', 'employee']} />,
            children: [
              { path: '/team', element: <TeamPage /> },
              { path: '/billing', element: <BillingPage /> },
              { path: '/billing/plans', element: <PricingPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
