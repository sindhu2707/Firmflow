import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requireTenant } from '../../middlewares/tenantScope';
import { listInvoices, getInvoice } from './invoice.controller';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', listInvoices);
router.get('/:id', getInvoice);

export default router;
