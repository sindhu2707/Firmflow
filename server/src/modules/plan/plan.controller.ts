import { Request, Response } from 'express';
import { Plan } from './plan.model';
import { serializePlan, serializePlanAdmin } from './plan.serializer';
import { catchAsync } from '../../shared/utils/catchAsync';
import { AppError } from '../../middlewares/errorHandler';

// GET /api/plans — public pricing page. Only ever returns active plans,
// so a plan taken off sale disappears without needing a frontend deploy.
export const listPlans = catchAsync(async (req: Request, res: Response) => {
  const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
  res.status(200).json({ plans: plans.map(serializePlan) });
});

// GET /api/plans/:id — public plan detail (e.g. deep-linked from a pricing card)
export const getPlan = catchAsync(async (req: Request, res: Response) => {
  const plan = await Plan.findOne({ _id: req.params.id, isActive: true });
  if (!plan) {
    throw new AppError('Plan not found', 404);
  }
  res.status(200).json({ plan: serializePlan(plan) });
});

// GET /api/plans/admin/all — super_admin only, includes inactive/legacy plans
// (existing subscriptions may still reference a plan that's off the pricing page)
export const listAllPlans = catchAsync(async (req: Request, res: Response) => {
  const plans = await Plan.find().sort({ slug: 1, billingCycle: 1 });
  res.status(200).json({ plans: plans.map(serializePlanAdmin) });
});

export const createPlan = catchAsync(async (req: Request, res: Response) => {
  const { slug, billingCycle } = req.body;

  const existing = await Plan.findOne({ slug, billingCycle });
  if (existing) {
    throw new AppError(`A ${billingCycle} plan with slug "${slug}" already exists`, 409);
  }

  const plan = await Plan.create(req.body);
  res.status(201).json({ plan: serializePlanAdmin(plan) });
});

export const updatePlan = catchAsync(async (req: Request, res: Response) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) {
    throw new AppError('Plan not found', 404);
  }

  Object.assign(plan, req.body);
  await plan.save();

  res.status(200).json({ plan: serializePlanAdmin(plan) });
});

// Plans are never hard-deleted — active subscriptions and past invoices
// reference them by id. Deactivating just pulls them off the pricing page.
export const deactivatePlan = catchAsync(async (req: Request, res: Response) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) {
    throw new AppError('Plan not found', 404);
  }

  plan.isActive = false;
  await plan.save();

  res.status(200).json({ plan: serializePlanAdmin(plan) });
});
