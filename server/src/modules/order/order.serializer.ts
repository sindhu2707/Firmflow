import { IOrder } from './order.model';

export function serializeOrder(order: IOrder) {
  return {
    id: order._id.toString(),
    organizationId: order.organizationId.toString(),
    customerId: order.customerId.toString(),
    createdBy: order.createdBy.toString(),
    items: order.items.map((item) => ({
      productId: item.productId.toString(),
      nameSnapshot: item.nameSnapshot,
      unitPriceSnapshot: item.unitPriceSnapshot,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}