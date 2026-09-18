import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../shared/utils/jwt";
import { AppError } from "./errorHandler";
import { User } from '../modules/users/user.model'; 

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authentication required", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    // 1. Verify the JWT token
    const payload = verifyAccessToken(token);

    // 2. Query the database to check the user's live status
    const user = await User.findById(payload.userId);

    if (!user) {
      return next(new AppError("User not found", 401));
    }

    // 3. Reject immediately if deactivated (revokes access on the spot)
    if (!user.isActive) {
      return next(new AppError("Your account has been deactivated", 403));
    }

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError("Invalid or expired token", 401));
  }
}