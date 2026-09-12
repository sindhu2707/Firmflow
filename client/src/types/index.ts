export type Role = 'super_admin' | 'org_owner' | 'employee' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string | null;
  createdAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  firmId: string | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  mustChangePassword: boolean;
}

// Matches GET /organizations/dashboard exactly:
// { organization: { id, name, slug }, stats: { memberCount, createdAt } }
export interface DashboardData {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  stats: {
    memberCount: number;
    createdAt: string;
  };
}

// Generic shape for your backend's error responses (AppError-based)
export interface ApiErrorPayload {
  status: string;
  message: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TeamResponse {
  users: TeamMember[];
}