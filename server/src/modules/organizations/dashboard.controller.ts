import { Request, Response } from "express";
import { Organization } from "./organization.model";
import { User } from "../users/user.model";
import { catchAsync } from "../../shared/utils/catchAsync";
import { AppError } from "../../middlewares/errorHandler";

export const getDashboardSummary = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  if (!organizationId) {
    throw new AppError("No organization context found", 403);
  }

  const [organization, memberCount] = await Promise.all([
    Organization.findById(organizationId),
    User.countDocuments({ organizationId }),
  ]);

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      organization: { id: organization.id, name: organization.name, slug: organization.slug },
      stats: {
        memberCount,
        createdAt: organization.createdAt,
      },
    },
  });
});