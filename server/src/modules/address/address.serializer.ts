import { IAddress } from './address.model';

export function serializeAddress(address: IAddress) {
  return {
    id: address._id.toString(),
    organizationId: address.organizationId.toString(),
    customerId: address.customerId.toString(),
    label: address.label ?? null,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    state: address.state ?? null,
    postalCode: address.postalCode,
    country: address.country,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}