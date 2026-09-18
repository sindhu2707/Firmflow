import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizePermission } from '../../middlewares/authorizePermission';
import { requireTenant } from '../../middlewares/tenantScope';
import { checkPlanLimit } from '../../middlewares/checkPlanLimit';
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
  authorizePermission('products:create'),
  validate(createProductSchema),
  checkPlanLimit('products'),
  createProduct
);

router.patch(
  '/:id',
  authorizePermission('products:update'),
  validate(updateProductSchema),
  updateProduct
);

router.delete(
  '/:id',
  authorizePermission('products:delete'),
  validate(productIdParamSchema),
  deleteProduct
);

export default router;