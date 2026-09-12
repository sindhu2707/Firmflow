import { Request, Response } from 'express';
import { Address } from './address.model';
import { serializeAddress } from './address.serializer';
import { catchAsync } from '../../shared/utils/catchAsync';
import { AppError } from '../../middlewares/errorHandler';

// customers manage only their own; staff can view any customer's within their org
function targetCustomerId(req: Request): string | undefined {
  if (req.user!.role === 'customer') {
    return req.user!.userId;
  }

  return (req.query.customerId as string) || (req.body?.customerId as string);
}

export const createAddress = catchAsync(async (req: Request, res: Response) => {
  if (req.user!.role !== 'customer') {
    throw new AppError('Only customers can create their own addresses', 403);
  }

  const organizationId = req.user!.organizationId;
  const customerId = req.user!.userId;

  if (req.body.isDefault) {
    await Address.updateMany({ organizationId, customerId }, { isDefault: false });
  }

  const address = await Address.create({ ...req.body, organizationId, customerId });
  res.status(201).json({ address: serializeAddress(address) });
});

export const listAddresses = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const customerId = targetCustomerId(req);

  if (!customerId) {
    throw new AppError('customerId query parameter is required', 400);
  }

  const addresses = await Address.find({ organizationId, customerId }).sort({ isDefault: -1, createdAt: -1 });
  res.status(200).json({ addresses: addresses.map(serializeAddress) });
});

export const updateAddress = catchAsync(async (req: Request, res: Response) => {
  if (req.user!.role !== 'customer') {
    throw new AppError('Only the address owner can update it', 403);
  }

  const organizationId = req.user!.organizationId;
  const address = await Address.findOne({
    _id: req.params.id,
    organizationId,
    customerId: req.user!.userId,
  });

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  if (req.body.isDefault) {
    await Address.updateMany(
      { organizationId, customerId: address.customerId, _id: { $ne: address._id } },
      { isDefault: false }
    );
  }

  Object.assign(address, req.body);
  await address.save();

  res.status(200).json({ address: serializeAddress(address) });
});

export const deleteAddress = catchAsync(async (req: Request, res: Response) => {
  if (req.user!.role !== 'customer') {
    throw new AppError('Only the address owner can delete it', 403);
  }

  const organizationId = req.user!.organizationId;
  const address = await Address.findOneAndDelete({
    _id: req.params.id,
    organizationId,
    customerId: req.user!.userId,
  });

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  res.status(204).send();
});