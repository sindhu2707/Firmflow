import { Request, Response, NextFunction } from 'express';
import { Subscription } from '../modules/subscription/subscription.model';
import { Plan } from '../modules/plan/plan.model';
import { Product } from '../modules/product/product.model';
import { User } from '../modules/users/user.model';
import { logger } from '../config/logger';

// Only resources with a concrete model to count against are enforced here.
// The blueprint's plan table also lists a "firms" limit, but the blueprint
// itself defers multiple-firms-per-organization to Phase 4 ("Teams") —
// Phases 1-3 are explicitly a single-level model where an organization IS
// the firm. There's nothing to count yet, by design, not by oversight.
type LimitedResource = 'products' | 'employees';

// "employees" counts staff seats only (role: 'employee'), not the org_owner —
// the owner isn't a seat you can run out of. Revisit this if the product
// definition of a "seat" should include the owner too.
const COUNTERS: Record<LimitedResource, (organizationId: string) => Promise<number>> = {
  products: (organizationId) => Product.countDocuments({ organizationId }),
  employees: (organizationId) => User.countDocuments({ organizationId, role: 'employee' }),
};

/**
 * Blocks a create action once an org has hit its plan's limit for that
 * resource. `-1` on a plan's limit means unlimited.
 *
 * Placement: after authenticate/requireTenant/authorize/validate, right
 * before the controller — so we only spend a DB count on requests that are
 * already known-valid and known-authorized.
 *
 * If the org has no subscription or the subscription's plan can't be found,
 * this FAILS OPEN (logs a warning, allows the request) rather than blocking.
 * Every real org gets a subscription automatically (on signup, or via the
 * backfill script), so this should only happen from a data gap — and
 * blocking every action for a paying customer over a data gap is worse
 * than temporarily not enforcing a limit. This mirrors how a missing Free
 * plan is already handled in organization.controller.ts.
 */
export function checkPlanLimit(resource: LimitedResource) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId!;

      const subscription = await Subscription.findOne({ organizationId });
      if (!subscription) {
        logger.warn(
          { organizationId, resource },
          'checkPlanLimit: no subscription found for organization — allowing request through unchecked'
        );
        next();
        return;
      }

      const plan = await Plan.findById(subscription.planId);
      if (!plan) {
        logger.warn(
          { organizationId, resource, planId: subscription.planId },
          "checkPlanLimit: organization's plan could not be found — allowing request through unchecked"
        );
        next();
        return;
      }

      const limit = plan.limits[resource];
      if (limit === -1) {
        next();
        return;
      }

      const currentCount = await COUNTERS[resource](organizationId);
      if (currentCount >= limit) {
        res.status(403).json({
          error: 'PLAN_LIMIT_REACHED',
          message: `Your ${plan.name} plan allows up to ${limit} ${resource}. Upgrade your plan to add more.`,
          resource,
          limit,
          currentCount,
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
