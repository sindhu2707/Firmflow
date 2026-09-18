import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useProducts, useCreateProduct } from '@/hooks/useProducts';
import {
  productsApi,
  type ProductPayload,
} from '@/api/products';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/format';
import type { Product } from '@/types';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  price: z
    .number()
    .int('Price must be a whole number (paise)')
    .min(0, 'Price must be 0 or greater'),
  stock: z.number().int().min(0, 'Stock must be 0 or greater'),
  isActive: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function ProductsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useProducts();
  const createProduct = useCreateProduct();

  const updateProduct = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ProductPayload;
    }) => productsApi.update(id, payload),

    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not update product'));
    },

    onSuccess: () => {
      toast.success('Product updated');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),

    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not delete product'));
    },

    onSuccess: () => {
      toast.success('Product deleted');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      price: 0,
      stock: 0,
      isActive: true,
    },
  });

  const onSubmit = (values: ProductFormValues) => {
    const payload: ProductPayload = {
      name: values.name,
      sku: values.sku,
      description: values.description || undefined,
      price: values.price,
      stock: values.stock,
      isActive: values.isActive,
    };

    createProduct.mutate(payload, {
      onSuccess: () => {
        reset();
      },
    });
  };

  const handleEdit = (product: Product) => {
    const name = window.prompt('Product name', product.name);
    if (name === null) return;

    const sku = window.prompt('SKU', product.sku);
    if (sku === null) return;

    const description = window.prompt(
      'Description',
      product.description ?? '',
    );
    if (description === null) return;

    const priceInput = window.prompt(
      'Price in paise',
      String(product.price),
    );
    if (priceInput === null) return;

    const stockInput = window.prompt(
      'Stock',
      String(product.stock),
    );
    if (stockInput === null) return;

    const price = Number(priceInput);
    const stock = Number(stockInput);

    if (!Number.isFinite(price) || price < 0) {
      toast.error('Price must be a valid non-negative number');
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      toast.error('Stock must be a valid non-negative number');
      return;
    }

    const payload: ProductPayload = {
      name,
      sku,
      description,
      price,
      stock: Math.floor(stock),
      isActive: product.isActive,
    };

    updateProduct.mutate({
      id: product.id,
      payload,
    });
  };

  const handleDelete = (product: Product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    deleteProduct.mutate(product.id);
  };

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading products…
      </p>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        Could not load products.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Product list */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            Products
          </h1>

          <span className="text-sm text-muted-foreground">
            {data.products.length}{' '}
            {data.products.length === 1 ? 'product' : 'products'}
          </span>
        </div>

        {data.products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              No products yet
            </p>

            <p className="text-sm text-muted-foreground">
              Create your first product using the form below.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Name
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    SKU
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Price
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Stock
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {data.products.map((product) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 text-sm text-foreground">
                        {product.name}
                      </td>

                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {product.sku}
                      </td>

                      <td className="px-4 py-3 text-sm text-foreground">
                        {formatMoney(product.price, 'INR')}
                      </td>

                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {product.stock}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <span
                          className={
                            product.isActive
                              ? 'text-green-600'
                              : 'text-muted-foreground'
                          }
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                            disabled={
                              updateProduct.isPending ||
                              deleteProduct.isPending
                            }
                          >
                            Edit
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDelete(product)}
                            disabled={
                              updateProduct.isPending ||
                              deleteProduct.isPending
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create product form */}
      <div className="max-w-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Create a product
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <TextField
            label="Name"
            error={errors.name?.message}
            {...register('name')}
          />

          <TextField
            label="SKU"
            error={errors.sku?.message}
            {...register('sku')}
          />

          <TextField
            label="Description"
            error={errors.description?.message}
            {...register('description')}
          />

          <TextField
            label="Price (paise)"
            type="number"
            min="0"
            step="1"
            error={errors.price?.message}
            {...register('price', { valueAsNumber: true })}
          />

          <TextField
            label="Stock"
            type="number"
            min="0"
            step="1"
            error={errors.stock?.message}
            {...register('stock', { valueAsNumber: true })}
          />

          <div className="flex items-center gap-3">
            <input
              id="isActive"
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              {...register('isActive')}
            />

            <label
              htmlFor="isActive"
              className="text-sm font-medium text-foreground"
            >
              Active
            </label>
          </div>

          <Button
            type="submit"
            isLoading={createProduct.isPending}
            className="mt-2"
          >
            Create product
          </Button>
        </form>
      </div>
    </div>
  );
}