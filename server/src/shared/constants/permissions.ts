export type Permission =
  | 'products:create'
  | 'products:update'
  | 'products:delete'
  | 'users:manage'
  | 'users:deactivate';

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'], // Wildcard for full access
  org_owner: [
    'products:create',
    'products:update',
    'products:delete',
    'users:manage',
    'users:deactivate',
  ],
  employee: [
    'products:create',
    'products:update',
  ],
  customer: [],
};