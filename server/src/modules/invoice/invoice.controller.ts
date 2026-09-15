import { Request, Response } from 'express';
import { Invoice } from './invoice.model';
import { serializeInvoice } from './invoice.serializer';
import { catchAsync } from '../../shared/utils/catchAsync';
import { AppError } from '../../middlewares/errorHandler';

export const listInvoices = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const invoices = await Invoice.find({ organizationId }).sort({ createdAt: -1 });
  res.status(200).json({ invoices: invoices.map(serializeInvoice) });
});

export const getInvoice = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const invoice = await Invoice.findOne({ _id: req.params.id, organizationId });
  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }
  res.status(200).json({ invoice: serializeInvoice(invoice) });
});
