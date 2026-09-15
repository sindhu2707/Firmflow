import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { requireTenant } from '../../middlewares/tenantScope';
import { validate } from '../../middlewares/validate';
import { checkoutSchema } from './subscription.validators';
import { getMySubscription, checkout, cancelSubscription } from './subscription.controller';

const router = Router();

router.use(authenticate, requireTenant);

// any tenant member can see what plan their org is on
router.get('/me', getMySubscription);

// only the org owner can change what the org is paying for
router.post('/checkout', authorize('org_owner'), validate(checkoutSchema), checkout);
router.post('/cancel', authorize('org_owner'), cancelSubscription);

export default router;
