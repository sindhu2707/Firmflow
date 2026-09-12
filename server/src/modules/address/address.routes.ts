import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireTenant } from '../../middlewares/tenantScope';
import { validate } from '../../middlewares/validate';
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from './address.validators';
import {
  createAddress,
  listAddresses,
  updateAddress,
  deleteAddress,
} from './address.controller';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', listAddresses);
router.post('/', validate(createAddressSchema), createAddress);
router.patch('/:id', validate(updateAddressSchema), updateAddress);
router.delete('/:id', validate(addressIdParamSchema), deleteAddress);

export default router;