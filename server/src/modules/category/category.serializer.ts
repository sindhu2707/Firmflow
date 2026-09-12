import { ICategory } from './category.model';

export function serializeCategory(category: ICategory) {
  return {
    id: category._id.toString(),
    organizationId: category.organizationId.toString(),
    name: category.name,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}