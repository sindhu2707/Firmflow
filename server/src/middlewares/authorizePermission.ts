import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { ROLE_PERMISSIONS } from '../shared/constants/permissions';

export function authorizePermission(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Ensure user is attached via authenticate middleware
    const user = req.user; 

    if (!user) {
      return next(new AppError('Unauthorized', 401));
    }

    // Grab the permissions list for the user's role
    const permissions = ROLE_PERMISSIONS[user.role] || [];

    // Check if user has the specific permission or a wildcard ('*')
    const hasPermission =
      permissions.includes('*') || permissions.includes(requiredPermission);

    if (!hasPermission) {
      return next(
        new AppError('Forbidden: You do not have permission to perform this action', 403)
      );
    }

    next();
  };
}