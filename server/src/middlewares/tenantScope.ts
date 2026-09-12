import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

/**
 * Ensures the authenticated user belongs to an organization,
 * and exposes it on req.tenant for downstream use.
 * Must run after `authenticate`.
 */
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.organizationId) {
    return next(new AppError("No organization context found for this user", 403));
  }
  next();
}