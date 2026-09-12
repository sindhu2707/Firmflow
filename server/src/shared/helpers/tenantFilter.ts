import { Request } from "express";
import { AppError } from "../../middlewares/errorHandler";

/**
 * Returns a base Mongo filter scoped to the current user's organization.
 * Use this as the starting point for every tenant-owned query —
 * never query a tenant-owned collection without it.
 */
export function tenantFilter(req: Request): { organizationId: string } {
  if (!req.user?.organizationId) {
    throw new AppError("No organization context found for this user", 403);
  }
  return { organizationId: req.user.organizationId };
}