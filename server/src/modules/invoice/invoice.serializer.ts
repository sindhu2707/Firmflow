import { IInvoice } from './invoice.model';

export function serializeInvoice(invoice: IInvoice) {
  return {
    id: invoice._id.toString(),
    organizationId: invoice.organizationId.toString(),
    subscriptionId: invoice.subscriptionId.toString(),
    planId: invoice.planId.toString(),
    amount: invoice.amount,
    currency: invoice.currency,
    status: invoice.status,
    periodStart: invoice.periodStart ?? null,
    periodEnd: invoice.periodEnd ?? null,
    pdfUrl: invoice.pdfUrl ?? null,
    createdAt: invoice.createdAt,
  };
}
