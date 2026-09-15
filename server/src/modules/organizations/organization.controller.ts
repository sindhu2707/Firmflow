import { Request, Response } from "express";
import { Organization } from "./organization.model";
import { User } from "../users/user.model";
import { Plan } from "../plan/plan.model";
import { Subscription } from "../subscription/subscription.model";
import { generateSlug } from "../../shared/utils/slug";
import { catchAsync } from "../../shared/utils/catchAsync";
import { AppError } from "../../middlewares/errorHandler";
import { signAccessToken } from "../../shared/utils/jwt";

export const createOrganization = catchAsync(async (req: Request, res: Response) => {
  const { name } = req.body;
  const userId = req.user!.userId;

  const existingUser = await User.findById(userId);
  if (!existingUser) {
    throw new AppError("User not found", 404);
  }
  if (existingUser.organizationId) {
    throw new AppError("User already belongs to an organization", 409);
  }

  let slug = generateSlug(name);
  const slugExists = await Organization.findOne({ slug });
  if (slugExists) {
    slug = `${slug}-${Date.now()}`;
  }

  const organization = await Organization.create({
    name,
    slug,
    ownerId: userId,
  });

  existingUser.organizationId = organization.id as any;
  existingUser.role = "org_owner";
  await existingUser.save();

  // Every organization starts on the Free plan. If the Free plan hasn't been
  // seeded yet (fresh environment, seed script not run), don't block signup —
  // log it and move on; the org just won't have a subscription doc until
  // someone runs the seed and re-syncs, same as any other seed-data gap.
  const freePlan = await Plan.findOne({ slug: "free", isActive: true });
  if (freePlan) {
    await Subscription.create({
      organizationId: organization._id,
      planId: freePlan._id,
      status: "active",
    });
  } else {
    console.warn("No active 'free' plan found — skipping subscription creation for new org. Run the seedPlans script.");
  }

  // Re-issue access token so it carries the new organizationId
  const accessToken = signAccessToken({
    userId: existingUser._id.toString(),
    role: existingUser.role,
    organizationId: organization.id.toString(),
  });

  res.status(201).json({
    success: true,
    data: {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        ownerId: organization.ownerId,
        firmId: organization.firmId,
      },
      accessToken,
    },
  });
});

export const getMyOrganization = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  if (!organizationId) {
    throw new AppError("No organization found for this user", 404);
  }

  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        ownerId: organization.ownerId,
        firmId: organization.firmId,
      },
    },
  });
});