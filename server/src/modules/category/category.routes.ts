import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { requireTenant } from '../../middlewares/tenantScope';
import { validate } from '../../middlewares/validate';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from './category.validators';
import {
  createCategory,
  listCategories,
  updateCategory,
  deleteCategory,
} from './category.controller';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', listCategories); // any authenticated tenant member, including customers, can browse categories

router.post('/', authorize('org_owner', 'employee'), validate(createCategorySchema), createCategory);
router.patch('/:id', authorize('org_owner', 'employee'), validate(updateCategorySchema), updateCategory);
router.delete('/:id', authorize('org_owner', 'employee'), validate(categoryIdParamSchema), deleteCategory);

export default router;