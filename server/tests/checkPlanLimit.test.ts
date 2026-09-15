import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { Plan } from '../src/modules/plan/plan.model';
import { Subscription } from '../src/modules/subscription/subscription.model';
import { Product } from '../src/modules/product/product.model';
import { User } from '../src/modules/users/user.model';
import { makeToken, makeOrgAndUsers } from './helpers';

describe('checkPlanLimit middleware', () => {
  let ctx: ReturnType<typeof makeOrgAndUsers>;
  let ownerToken: string;

  beforeEach(() => {
    ctx = makeOrgAndUsers();
    ownerToken = makeToken(ctx.owner);
  });

  async function givePlan(limits: { firms: number; products: number; employees: number }) {
    const plan = await Plan.create({
      name: 'Test Plan',
      slug: `test-${Date.now()}-${Math.random()}`,
      billingCycle: 'monthly',
      price: 0,
      currency: 'INR',
      limits,
    });
    await Subscription.create({
      organizationId: ctx.organizationId,
      planId: plan._id,
      status: 'active',
    });
    return plan;
  }

  it('blocks product creation with a clear error once the plan limit is hit', async () => {
    await givePlan({ firms: 1, products: 1, employees: 5 });
    await Product.create({
      organizationId: ctx.organizationId,
      name: 'Existing',
      sku: 'EXIST-1',
      price: 100,
      stock: 1,
    });

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'One Too Many', sku: 'NEW-1', price: 100, stock: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PLAN_LIMIT_REACHED');
    expect(res.body.resource).toBe('products');
  });

  it('allows product creation when comfortably under the limit', async () => {
    await givePlan({ firms: 1, products: 20, employees: 5 });

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Room To Spare', sku: 'ROOM-1', price: 100, stock: 1 });

    expect(res.status).toBe(201);
  });

  it('never blocks creation on an unlimited (-1) plan, however many exist', async () => {
    await givePlan({ firms: -1, products: -1, employees: -1 });
    for (let i = 0; i < 5; i++) {
      await Product.create({
        organizationId: ctx.organizationId,
        name: `Item ${i}`,
        sku: `SKU-${i}`,
        price: 100,
        stock: 1,
      });
    }

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Item 6', sku: 'SKU-6', price: 100, stock: 1 });

    expect(res.status).toBe(201);
  });

  it('blocks a new employee invite once the employee seat limit is reached', async () => {
    await givePlan({ firms: 1, products: 20, employees: 1 });
    await User.create({
      organizationId: ctx.organizationId,
      name: 'Existing Employee',
      email: 'existing-employee@example.com',
      password: 'hashedpw',
      role: 'employee',
    });

    const res = await request(app)
      .post('/api/users/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'New Hire', email: 'new-hire@example.com', password: 'password123', role: 'employee' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PLAN_LIMIT_REACHED');
    expect(res.body.resource).toBe('employees');
  });

  it('does not count the org_owner against the employee seat limit', async () => {
    // owner already exists (from makeOrgAndUsers' JWT — no DB row needed for
    // this check, since the counter only queries role: 'employee').
    await givePlan({ firms: 1, products: 20, employees: 1 });

    const res = await request(app)
      .post('/api/users/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'First Hire', email: 'first-hire@example.com', password: 'password123', role: 'employee' });

    expect(res.status).toBe(201);
  });

  it('fails open (allows the request) when the organization has no subscription at all', async () => {
    // no givePlan() call — organization has zero subscription docs.
    // This matches every pre-Phase-3 test/org that predates subscriptions
    // existing — blocking them entirely would be a worse outcome than
    // temporarily not enforcing a limit that can't be determined.
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Orphan Product', sku: 'ORPHAN-1', price: 100, stock: 1 });

    expect(res.status).toBe(201);
  });
});
