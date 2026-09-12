export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'org_owner' | 'employee' | 'customer';
}

export interface TeamResponse {
  users: TeamMember[];
}