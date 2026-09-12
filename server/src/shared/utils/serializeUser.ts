export function serializeUser(user: {
  _id: any;
  name: string;
  email: string;
  role: string;
  organizationId?: any;
}) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId ?? null,
  };
}