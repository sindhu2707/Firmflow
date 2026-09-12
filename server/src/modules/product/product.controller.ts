import { Request, Response } from 'express';
import { Product } from './product.model';
import { serializeProduct } from './product.serializer';
import { catchAsync } from '../../shared/utils/catchAsync';
import { AppError } from '../../middlewares/errorHandler';

export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { name, sku, description, price, stock, isActive } = req.body;

  const existing = await Product.findOne({ organizationId, sku: sku.toUpperCase() });
  if (existing) {
    throw new AppError('A product with this SKU already exists in your organization', 409);
  }

  const product = await Product.create({
    organizationId,
    name,
    sku,
    description,
    price,
    stock: stock ?? 0,
    isActive: isActive ?? true,
  });

  res.status(201).json({ product: serializeProduct(product) });
});

export const listProducts = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { isActive, search, page, limit } = req.query as unknown as {
    isActive?: boolean;
    search?: string;
    page: number;
    limit: number;
  };

  const filter: Record<string, unknown> = { organizationId };

  // customers only ever see active products, regardless of query param
  if (req.user!.role === 'customer') {
    filter.isActive = true;
  } else if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    products: products.map(serializeProduct),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getProduct = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const product = await Product.findOne({ _id: req.params.id, organizationId });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (req.user!.role === 'customer' && !product.isActive) {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json({ product: serializeProduct(product) });
});

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const product = await Product.findOne({ _id: req.params.id, organizationId });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (req.body.sku && req.body.sku.toUpperCase() !== product.sku) {
    const existing = await Product.findOne({
      organizationId,
      sku: req.body.sku.toUpperCase(),
      _id: { $ne: product._id },
    });
    if (existing) {
      throw new AppError('A product with this SKU already exists in your organization', 409);
    }
  }

  Object.assign(product, req.body);
  await product.save();

  res.status(200).json({ product: serializeProduct(product) });
});

export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const product = await Product.findOneAndDelete({ _id: req.params.id, organizationId });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.status(204).send();
});