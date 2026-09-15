import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { validate } from '../../middlewares/validate';
import { createPlanSchema, updatePlanSchema, planIdParamSchema } from './plan.validators';
import {
  listPlans,
  getPlan,
  listAllPlans,
  createPlan,
  updatePlan,
  deactivatePlan,
} from './plan.controller';

const router = Router();

// Public — pricing page, no auth, no tenant context. Deliberately does NOT
// use `authenticate` + `requireTenant` like the other modules: a super_admin
// has no organizationId, and a visitor evaluating the product isn't logged in at all.
router.get('/', listPlans);

// Registered before "/:id" so it isn't swallowed by the param route.
router.get('/admin/all', authenticate, authorize('super_admin'), listAllPlans);

router.get('/:id', getPlan);

router.post('/', authenticate, authorize('super_admin'), validate(createPlanSchema), createPlan);
router.patch(
  '/:id',
  authenticate,
  authorize('super_admin'),
  validate(updatePlanSchema),
  updatePlan
);
router.delete(
  '/:id',
  authenticate,
  authorize('super_admin'),
  validate(planIdParamSchema),
  deactivatePlan
);

export default router;
