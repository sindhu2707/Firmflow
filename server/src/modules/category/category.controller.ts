import { Request, Response } from 'express';
import { Category } from './category.model';
import { Product } from '../product/product.model';
import { serializeCategory } from './category.serializer';
import { catchAsync } from '../../shared/utils/catchAsync';
import { AppError } from '../../middlewares/errorHandler';

export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { name } = req.body;

  const existing = await Category.findOne({ organizationId, name });
  if (existing) {
    throw new AppError('A category with this name already exists', 409);
  }

  const category = await Category.create({ organizationId, name });
  res.status(201).json({ category: serializeCategory(category) });
});

export const listCategories = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const categories = await Category.find({ organizationId }).sort({ name: 1 });
  res.status(200).json({ categories: categories.map(serializeCategory) });
});

export const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const category = await Category.findOne({ _id: req.params.id, organizationId });
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  if (req.body.name !== category.name) {
    const existing = await Category.findOne({
      organizationId,
      name: req.body.name,
      _id: { $ne: category._id },
    });
    if (existing) {
      throw new AppError('A category with this name already exists', 409);
    }
  }

  category.name = req.body.name;
  await category.save();

  res.status(200).json({ category: serializeCategory(category) });
});

export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const category = await Category.findOne({ _id: req.params.id, organizationId });
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // unassign this category from any products using it, rather than blocking deletion
  await Product.updateMany(
    { organizationId, categoryId: category._id },
    { $unset: { categoryId: '' } }
  );

  await category.deleteOne();
  res.status(204).send();
});