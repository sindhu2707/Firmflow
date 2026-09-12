import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { requireTenant } from '../../middlewares/tenantScope';
import { validate } from '../../middlewares/validate';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  listProductsQuerySchema,
} from './product.validators';
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
} from './product.controller';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', validate(listProductsQuerySchema), listProducts);
router.get('/:id', validate(productIdParamSchema), getProduct);

router.post(
  '/',
  authorize('org_owner', 'employee'),
  validate(createProductSchema),
  createProduct
);
router.patch(
  '/:id',
  authorize('org_owner', 'employee'),
  validate(updateProductSchema),
  updateProduct
);
router.delete(
  '/:id',
  authorize('org_owner', 'employee'),
  validate(productIdParamSchema),
  deleteProduct
);

export default router;