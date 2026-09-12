import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { Product } from '../src/modules/product/product.model';
import { makeToken, makeOrgAndUsers } from './helpers';
import { Address } from '../src/modules/address/address.model';

describe('Order API', () => {
  let ctx: ReturnType<typeof makeOrgAndUsers>;
  let ownerToken: string;
  let customerToken: string;

  beforeEach(() => {
    ctx = makeOrgAndUsers();
    ownerToken = makeToken(ctx.owner);
    customerToken = makeToken(ctx.customer);
  });

  it('creates an order as a customer, deriving customerId from the token', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'W-1',
      price: 2500,
      stock: 10,
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.order.customerId).toBe(ctx.customer.userId);
    expect(res.body.order.createdBy).toBe(ctx.customer.userId);
    expect(res.body.order.items[0].lineTotal).toBe(5000);
    expect(res.body.order.totalAmount).toBe(5000);
  });

  it('decrements stock on successful order', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'W-2',
      price: 1000,
      stock: 10,
    });

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 3 }] });

    const updated = await Product.findById(product._id);
    expect(updated!.stock).toBe(7);
  });

  it('snapshots product name and price at order time', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Original Name',
      sku: 'W-3',
      price: 1000,
      stock: 10,
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 1 }] });

    // price changes after the order was placed
    await Product.findByIdAndUpdate(product._id, { price: 9999, name: 'Renamed' });

    const getRes = await request(app)
      .get(`/api/orders/${orderRes.body.order.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(getRes.body.order.items[0].nameSnapshot).toBe('Original Name');
    expect(getRes.body.order.items[0].unitPriceSnapshot).toBe(1000);
    expect(getRes.body.order.totalAmount).toBe(1000);
  });

  it('rejects ordering an inactive product and does not touch stock', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Inactive Widget',
      sku: 'W-4',
      price: 1000,
      stock: 10,
      isActive: false,
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 1 }] });

    expect(res.status).toBe(400);

    const unchanged = await Product.findById(product._id);
    expect(unchanged!.stock).toBe(10);
  });

  it('rejects ordering more than available stock and does not touch stock', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Scarce Widget',
      sku: 'W-5',
      price: 1000,
      stock: 2,
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 5 }] });

    expect(res.status).toBe(400);

    const unchanged = await Product.findById(product._id);
    expect(unchanged!.stock).toBe(2);
  });

  it('staff can create an order on behalf of a customer', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'W-6',
      price: 1000,
      stock: 10,
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerId: ctx.customer.userId,
        items: [{ productId: product._id.toString(), quantity: 1 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.order.customerId).toBe(ctx.customer.userId);
    expect(res.body.order.createdBy).toBe(ctx.owner.userId);
  });

  it('staff must provide customerId or the request is rejected', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'W-7',
      price: 1000,
      stock: 10,
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 1 }] });

    expect(res.status).toBe(400);
  });

  it('customer only sees their own orders', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'W-8',
      price: 1000,
      stock: 10,
    });

    // customer's own order
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 1 }] });

    // staff creates an order for a *different* fictional customer
    const otherCustomerId = ctx.employee.userId; // reuse a different real userId as a stand-in customer
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        customerId: otherCustomerId,
        items: [{ productId: product._id.toString(), quantity: 1 }],
      });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].customerId).toBe(ctx.customer.userId);
  });

  it('staff sees all orders in the org', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'W-9',
      price: 1000,
      stock: 10,
    });

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 1 }] });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
  });

  it('staff can update order status', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'W-10',
      price: 1000,
      stock: 10,
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 1 }] });

    const res = await request(app)
      .patch(`/api/orders/${orderRes.body.order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('confirmed');
  });

  it('customer cannot update order status', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'W-11',
      price: 1000,
      stock: 10,
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 1 }] });

    const res = await request(app)
      .patch(`/api/orders/${orderRes.body.order.id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(403);
  });

    it('restores stock when an order is cancelled', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'W-12',
      price: 1000,
      stock: 10,
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 3 }] });

    // stock should now be 7
    let current = await Product.findById(product._id);
    expect(current!.stock).toBe(7);

    await request(app)
      .patch(`/api/orders/${orderRes.body.order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'cancelled' });

    current = await Product.findById(product._id);
    expect(current!.stock).toBe(10);
  });

  it('does not double-restore stock if cancelled twice', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'W-13',
      price: 1000,
      stock: 10,
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 3 }] });

    await request(app)
      .patch(`/api/orders/${orderRes.body.order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'cancelled' });

    // cancel again (idempotent retry)
    await request(app)
      .patch(`/api/orders/${orderRes.body.order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'cancelled' });

    const current = await Product.findById(product._id);
    expect(current!.stock).toBe(10); // not 13
  });

    it('rejects cancelling a fulfilled order and does not touch stock', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'W-14',
      price: 1000,
      stock: 10,
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 3 }] });

    // move to fulfilled first
    await request(app)
      .patch(`/api/orders/${orderRes.body.order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'fulfilled' });

    const res = await request(app)
      .patch(`/api/orders/${orderRes.body.order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(400);

    const current = await Product.findById(product._id);
    expect(current!.stock).toBe(7); // unchanged, no restore happened
  });

  it('allows cancelling from confirmed', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId,
      name: 'Widget',
      sku: 'W-15',
      price: 1000,
      stock: 10,
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 3 }] });

    await request(app)
      .patch(`/api/orders/${orderRes.body.order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'confirmed' });

    const res = await request(app)
      .patch(`/api/orders/${orderRes.body.order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(200);

    const current = await Product.findById(product._id);
    expect(current!.stock).toBe(10);
  });

    it('snapshots the shipping address at order time', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId, name: 'Widget', sku: 'ADDR-1', price: 1000, stock: 10,
    });
    const address = await Address.create({
      organizationId: ctx.organizationId,
      customerId: ctx.customer.userId,
      line1: '123 Main St',
      city: 'Springfield',
      postalCode: '12345',
      country: 'USA',
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: product._id.toString(), quantity: 1 }],
        shippingAddressId: address._id.toString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.order.shippingAddressSnapshot.city).toBe('Springfield');

    // change the saved address after the order was placed
    await Address.findByIdAndUpdate(address._id, { city: 'Shelbyville' });

    const getRes = await request(app)
      .get(`/api/orders/${res.body.order.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(getRes.body.order.shippingAddressSnapshot.city).toBe('Springfield'); // unchanged
  });

  it('rejects an order using another customer\'s address', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId, name: 'Widget', sku: 'ADDR-2', price: 1000, stock: 10,
    });
    const foreignAddress = await Address.create({
      organizationId: ctx.organizationId,
      customerId: ctx.employee.userId, // belongs to a different user
      line1: '456 Other St',
      city: 'Capital City',
      postalCode: '99999',
      country: 'USA',
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: product._id.toString(), quantity: 1 }],
        shippingAddressId: foreignAddress._id.toString(),
      });

    expect(res.status).toBe(404);
  });

  it('creates an order without a shipping address (still optional)', async () => {
    const product = await Product.create({
      organizationId: ctx.organizationId, name: 'Widget', sku: 'ADDR-3', price: 1000, stock: 10,
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 1 }] });

    expect(res.status).toBe(201);
    expect(res.body.order.shippingAddressSnapshot).toBeNull();
  });
});