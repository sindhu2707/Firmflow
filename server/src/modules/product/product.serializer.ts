import { IProduct } from './product.model';

export function serializeProduct(product: IProduct) {
  return {
    id: product._id.toString(),
    organizationId: product.organizationId.toString(),
    categoryId: product.categoryId?.toString() ?? null,
    name: product.name,
    sku: product.sku,
    description: product.description ?? '',
    price: product.price,
    stock: product.stock,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}