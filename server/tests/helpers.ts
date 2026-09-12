import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface TestUserPayload {
  userId: string;
  role: 'super_admin' | 'org_owner' | 'employee' | 'customer';
  organizationId?: string;
}

export function makeToken(payload: TestUserPayload): string {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, { expiresIn: '15m' });
}

export function makeOrgAndUsers() {
  const organizationId = new Types.ObjectId().toString();
  const otherOrganizationId = new Types.ObjectId().toString();

  const owner: TestUserPayload = { userId: new Types.ObjectId().toString(), organizationId, role: 'org_owner' };
  const employee: TestUserPayload = { userId: new Types.ObjectId().toString(), organizationId, role: 'employee' };
  const customer: TestUserPayload = { userId: new Types.ObjectId().toString(), organizationId, role: 'customer' };
  const otherOrgOwner: TestUserPayload = { userId: new Types.ObjectId().toString(), organizationId: otherOrganizationId, role: 'org_owner' };

  return { organizationId, otherOrganizationId, owner, employee, customer, otherOrgOwner };
}