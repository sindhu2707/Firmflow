import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { Product } from '../src/modules/product/product.model';
import { makeToken, makeOrgAndUsers } from './helpers';

describe('Product API', () => {
  let ctx: ReturnType<typeof makeOrgAndUsers>;
  let ownerToken: string;
  let customerToken: string;
  let otherOrgToken: string;

  beforeEach(() => {
    ctx = makeOrgAndUsers();
    ownerToken = makeToken(ctx.owner);
    customerToken = makeToken(ctx.customer);
    otherOrgToken = makeToken(ctx.otherOrgOwner);
  });

  it('creates a product as org_owner', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Widget', sku: 'WID-1', price: 2500, stock: 10 });

    expect(res.status).toBe(201);
    expect(res.body.product.name).toBe('Widget');
    expect(res.body.product.sku).toBe('WID-1');
  });

  it('rejects product creation from a customer', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Widget', sku: 'WID-2', price: 2500, stock: 10 });

    expect(res.status).toBe(403);
  });

  it('customer only sees active products', async () => {
    await Product.create({ organizationId: ctx.organizationId, name: 'Active', sku: 'A-1', price: 100, stock: 5, isActive: true });
    await Product.create({ organizationId: ctx.organizationId, name: 'Inactive', sku: 'I-1', price: 100, stock: 5, isActive: false });

    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].name).toBe('Active');
  });

  it('staff sees inactive products too', async () => {
    await Product.create({ organizationId: ctx.organizationId, name: 'Inactive', sku: 'I-2', price: 100, stock: 5, isActive: false });

    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
  });

  it('returns 404 for a product in a different organization', async () => {
    const product = await Product.create({ organizationId: ctx.otherOrganizationId, name: 'Foreign', sku: 'F-1', price: 100, stock: 5 });

    const res = await request(app)
      .get(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
  });

  it('rejects duplicate SKU within the same organization', async () => {
    await Product.create({ organizationId: ctx.organizationId, name: 'First', sku: 'DUP-1', price: 100, stock: 5 });

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Second', sku: 'DUP-1', price: 200, stock: 3 });

    expect(res.status).toBe(409);
  });

  it('allows the same SKU across different organizations', async () => {
    await Product.create({ organizationId: ctx.otherOrganizationId, name: 'Elsewhere', sku: 'SAME-SKU', price: 100, stock: 5 });

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Here', sku: 'SAME-SKU', price: 200, stock: 3 });

    expect(res.status).toBe(201);
  });
});