import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Order } from './order.model';
import { Product } from '../product/product.model';
import { serializeOrder } from './order.serializer';
import { catchAsync } from '../../shared/utils/catchAsync';
import { AppError } from '../../middlewares/errorHandler';
import { Address } from '../address/address.model';

interface PreparedOrderItem {
  productId: Types.ObjectId;
  nameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export const createOrder = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const role = req.user!.role;
  const { items } = req.body;

  // customers can only order for themselves; staff must specify customerId
  let customerId: string;
  if (role === 'customer') {
    customerId = req.user!.userId;
  } else {
    if (!req.body.customerId) {
      throw new AppError('customerId is required when creating an order as staff', 400);
    }
    customerId = req.body.customerId;
  }

  let shippingAddressSnapshot;
  if (req.body.shippingAddressId) {
    const address = await Address.findOne({
      _id: req.body.shippingAddressId,
      organizationId,
      customerId, // must belong to the customer this order is FOR, not just anyone in the org
    });

    if (!address) {
      throw new AppError('Shipping address not found for this customer', 404);
    }

    shippingAddressSnapshot = {
      label: address.label,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    };
  }

  const productIds = items.map((i: { productId: string }) => i.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    organizationId,
  });

  if (products.length !== productIds.length) {
    throw new AppError('One or more products were not found in your organization', 404);
  }

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const orderItems: PreparedOrderItem[] = items.map((item: { productId: string; quantity: number }) => {
    const product = productMap.get(item.productId)!;

    if (!product.isActive) {
      throw new AppError(`Product "${product.name}" is not currently active`, 400);
    }
    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for "${product.name}"`, 400);
    }

    const lineTotal = product.price * item.quantity;
    return {
      productId: product._id,
      nameSnapshot: product.name,
      unitPriceSnapshot: product.price,
      quantity: item.quantity,
      lineTotal,
    };
  });

  const totalAmount = orderItems.reduce((sum, i) => sum + i.lineTotal, 0);

  // decrement stock
  await Promise.all(
    orderItems.map((item) =>
      Product.updateOne({ _id: item.productId }, { $inc: { stock: -item.quantity } })
    )
  );

  const order = await Order.create({
    organizationId,
    customerId,
    createdBy: req.user!.userId,
    items: orderItems,
    status: 'pending',
    totalAmount,
    shippingAddressSnapshot,
  });

  res.status(201).json({ order: serializeOrder(order) });
});

export const listOrders = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const role = req.user!.role;
  const { status, page, limit } = req.query as unknown as {
    status?: string;
    page: number;
    limit: number;
  };

  const filter: Record<string, unknown> = { organizationId };

  if (role === 'customer') {
    filter.customerId = req.user!.userId;
  }

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    orders: orders.map(serializeOrder),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getOrder = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const role = req.user!.role;

  const filter: Record<string, unknown> = { _id: req.params.id, organizationId };
  if (role === 'customer') {
    filter.customerId = req.user!.userId;
  }

  const order = await Order.findOne(filter);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  res.status(200).json({ order: serializeOrder(order) });
});

export const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { status } = req.body;

  const order = await Order.findOne({ _id: req.params.id, organizationId });
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const wasAlreadyCancelled = order.status === 'cancelled';
  const isNowCancelled = status === 'cancelled';

  if (isNowCancelled && !wasAlreadyCancelled) {
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new AppError(
        `Cannot cancel an order with status "${order.status}"`,
        400
      );
    }

    await Promise.all(
      order.items.map((item) =>
        Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } })
      )
    );
  }

  order.status = status;
  await order.save();

  res.status(200).json({ order: serializeOrder(order) });
});