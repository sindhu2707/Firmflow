import { Request, Response } from "express";
import { User } from "../users/user.model";
import { hashPassword, comparePassword } from "../../shared/utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../shared/utils/jwt";
import { catchAsync } from "../../shared/utils/catchAsync";
import { AppError } from "../../middlewares/errorHandler";
import { env } from "../../config/env";
import { serializeUser } from "../../shared/utils/serializeUser";

const REFRESH_COOKIE_NAME = "refreshToken";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export const register = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("Email is already registered", 409);
  }

  const hashed = await hashPassword(password);
  const user = await User.create({ name, email, password: hashed });

  const payload = { userId: user._id.toString(), role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    data: {
      user: serializeUser(user),
      accessToken,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const payload = {
    userId: user._id.toString(),
    role: user.role,
    organizationId: user.organizationId?.toString(),
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  setRefreshCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: serializeUser(user),
      accessToken,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies[REFRESH_COOKIE_NAME];
  if (!token) {
    throw new AppError("No refresh token provided", 401);
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    throw new AppError("User not found", 401);
  }

  const accessToken = signAccessToken({
    userId: user._id.toString(),
    role: user.role,
    organizationId: user.organizationId ? user.organizationId.toString() : undefined,
  });

  res.status(200).json({ success: true, data: { accessToken } });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME);
  res.status(200).json({ success: true, message: "Logged out" });
});

export const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { newPassword } = req.body;
  const userId = req.user!.userId;

  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.password = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  res.status(200).json({ success: true, data: { message: "Password updated" } });
});