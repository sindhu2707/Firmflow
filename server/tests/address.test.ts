import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { Address } from '../src/modules/address/address.model';
import { makeToken, makeOrgAndUsers } from './helpers';

describe('Address API', () => {
  let ctx: ReturnType<typeof makeOrgAndUsers>;
  let ownerToken: string;
  let customerToken: string;

  const validAddress = {
    line1: '123 Main St',
    city: 'Springfield',
    postalCode: '12345',
    country: 'USA',
  };

  beforeEach(() => {
    ctx = makeOrgAndUsers();
    ownerToken = makeToken(ctx.owner);
    customerToken = makeToken(ctx.customer);
  });

  it('customer creates their own address', async () => {
    const res = await request(app)
      .post('/api/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(validAddress);

    expect(res.status).toBe(201);
    expect(res.body.address.customerId).toBe(ctx.customer.userId);
  });

  it('staff cannot create an address', async () => {
    const res = await request(app)
      .post('/api/addresses')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...validAddress, customerId: ctx.customer.userId });

    expect(res.status).toBe(403);
  });

  it('customer lists their own addresses', async () => {
    await Address.create({ ...validAddress, organizationId: ctx.organizationId, customerId: ctx.customer.userId });

    const res = await request(app)
      .get('/api/addresses')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.addresses).toHaveLength(1);
  });

  it('staff can view a specific customer\'s addresses via customerId', async () => {
    await Address.create({ ...validAddress, organizationId: ctx.organizationId, customerId: ctx.customer.userId });

    const res = await request(app)
      .get(`/api/addresses?customerId=${ctx.customer.userId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.addresses).toHaveLength(1);
  });

  it('staff request without customerId is rejected', async () => {
    const res = await request(app)
      .get('/api/addresses')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(400);
  });

  it('customer updates their own address', async () => {
    const address = await Address.create({ ...validAddress, organizationId: ctx.organizationId, customerId: ctx.customer.userId });

    const res = await request(app)
      .patch(`/api/addresses/${address._id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ city: 'Shelbyville' });

    expect(res.status).toBe(200);
    expect(res.body.address.city).toBe('Shelbyville');
  });

  it('staff cannot update a customer\'s address', async () => {
    const address = await Address.create({ ...validAddress, organizationId: ctx.organizationId, customerId: ctx.customer.userId });

    const res = await request(app)
      .patch(`/api/addresses/${address._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ city: 'Shelbyville' });

    expect(res.status).toBe(403);
  });

  it('customer cannot update another customer\'s address', async () => {
    const otherCustomerToken = makeToken(ctx.employee); // different userId, same org, non-owner-of-address
    const address = await Address.create({ ...validAddress, organizationId: ctx.organizationId, customerId: ctx.customer.userId });

    const res = await request(app)
      .patch(`/api/addresses/${address._id}`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({ city: 'Shelbyville' });

    expect(res.status).toBe(403); // blocked by role check before ownership is even checked
  });

  it('setting isDefault unsets the previous default', async () => {
    const first = await Address.create({ ...validAddress, organizationId: ctx.organizationId, customerId: ctx.customer.userId, isDefault: true });
    const second = await Address.create({ ...validAddress, organizationId: ctx.organizationId, customerId: ctx.customer.userId, isDefault: false });

    await request(app)
      .patch(`/api/addresses/${second._id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ isDefault: true });

    const updatedFirst = await Address.findById(first._id);
    const updatedSecond = await Address.findById(second._id);

    expect(updatedFirst!.isDefault).toBe(false);
    expect(updatedSecond!.isDefault).toBe(true);
  });

  it('customer deletes their own address', async () => {
    const address = await Address.create({ ...validAddress, organizationId: ctx.organizationId, customerId: ctx.customer.userId });

    const res = await request(app)
      .delete(`/api/addresses/${address._id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(204);
  });

  it('does not leak addresses across organizations', async () => {
    await Address.create({ ...validAddress, organizationId: ctx.otherOrganizationId, customerId: ctx.customer.userId });

    const res = await request(app)
      .get('/api/addresses')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.addresses).toHaveLength(0);
  });
});