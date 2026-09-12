import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { requireTenant } from '../../middlewares/tenantScope';
import { validate } from '../../middlewares/validate';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderIdParamSchema,
  listOrdersQuerySchema,
} from './order.validators';
import {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
} from './order.controller';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', validate(listOrdersQuerySchema), listOrders);
router.get('/:id', validate(orderIdParamSchema), getOrder);
router.post('/', validate(createOrderSchema), createOrder);

router.patch(
  '/:id/status',
  authorize('org_owner', 'employee'),
  validate(updateOrderStatusSchema),
  updateOrderStatus
);

export default router;