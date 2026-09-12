import { Request, Response } from "express";
import { User } from "./user.model";
import { catchAsync } from "../../shared/utils/catchAsync";
import { AppError } from "../../middlewares/errorHandler";
import { serializeUser } from "../../shared/utils/serializeUser";
import { tenantFilter } from "../../shared/helpers/tenantFilter";
import { hashPassword } from "../../shared/utils/password";

export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
      },
    },
  }); 
});

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const { name } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user!.userId,
    { name },
    { new: true, runValidators: true }
  );
  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      user: serializeUser(user),
    },
  });
});

export const listOrgUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await User.find(tenantFilter(req)).sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    data: {
      users: users.map(serializeUser),
    },
  });
});

export const inviteUser = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  const organizationId = req.user!.organizationId;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("A user with this email already exists", 409);
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    organizationId,
    mustChangePassword: true,
  });

  res.status(201).json({
    success: true,
    data: { user: serializeUser(newUser) },
  });
});