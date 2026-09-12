import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { Category } from '../src/modules/category/category.model';
import { Product } from '../src/modules/product/product.model';
import { makeToken, makeOrgAndUsers } from './helpers';

describe('Category API', () => {
  let ctx: ReturnType<typeof makeOrgAndUsers>;
  let ownerToken: string;
  let customerToken: string;

  beforeEach(() => {
    ctx = makeOrgAndUsers();
    ownerToken = makeToken(ctx.owner);
    customerToken = makeToken(ctx.customer);
  });

  it('creates a category as org_owner', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Electronics' });

    expect(res.status).toBe(201);
    expect(res.body.category.name).toBe('Electronics');
  });

  it('rejects category creation from a customer', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Electronics' });

    expect(res.status).toBe(403);
  });

  it('rejects duplicate category name within the same org', async () => {
    await Category.create({ organizationId: ctx.organizationId, name: 'Electronics' });

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Electronics' });

    expect(res.status).toBe(409);
  });

  it('allows the same category name across different orgs', async () => {
    await Category.create({ organizationId: ctx.otherOrganizationId, name: 'Electronics' });

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Electronics' });

    expect(res.status).toBe(201);
  });

  it('customer can list categories', async () => {
    await Category.create({ organizationId: ctx.organizationId, name: 'Apparel' });

    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(1);
  });

  it('does not list categories from another org', async () => {
    await Category.create({ organizationId: ctx.otherOrganizationId, name: 'Foreign' });

    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(0);
  });

  it('updates a category name', async () => {
    const category = await Category.create({ organizationId: ctx.organizationId, name: 'Old Name' });

    const res = await request(app)
      .patch(`/api/categories/${category._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.category.name).toBe('New Name');
  });

  it('deletes a category and unassigns it from products rather than blocking', async () => {
    const category = await Category.create({ organizationId: ctx.organizationId, name: 'Doomed' });
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'CAT-1',
      price: 500,
      stock: 5,
      categoryId: category._id,
    });

    const res = await request(app)
      .delete(`/api/categories/${category._id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(204);

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct!.categoryId).toBeUndefined();
  });

  it('assigns a valid category to a product on creation', async () => {
    const category = await Category.create({ organizationId: ctx.organizationId, name: 'Books' });

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Novel', sku: 'BOOK-1', price: 1500, stock: 3, categoryId: category._id.toString() });

    expect(res.status).toBe(201);   
    expect(res.body.product.categoryId).toBe(category._id.toString());
  });

  it('rejects assigning a category from another org to a product', async () => {
    const foreignCategory = await Category.create({ organizationId: ctx.otherOrganizationId, name: 'Foreign' });

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Novel', sku: 'BOOK-2', price: 1500, stock: 3, categoryId: foreignCategory._id.toString() });

    expect(res.status).toBe(404);
  });
});