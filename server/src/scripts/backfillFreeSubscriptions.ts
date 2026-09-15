/**
 * One-time backfill: every organization created before Phase 3 has no
 * subscription doc at all. This gives each of them an active Free-plan
 * subscription, matching what new signups get automatically now.
 *
 * Safe to re-run — it only touches organizations that don't already have
 * a subscription, so running it twice is a no-op the second time.
 *
 * Run with: npx tsx src/scripts/backfillFreeSubscriptions.ts
 */
import dns from 'dns';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { Organization } from '../modules/organizations/organization.model';
import { Plan } from '../modules/plan/plan.model';
import { Subscription } from '../modules/subscription/subscription.model';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function backfill() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB — backfilling Free subscriptions...');

  const freePlan = await Plan.findOne({ slug: 'free' });
  if (!freePlan) {
    console.error("No 'free' plan found — run seedPlans.ts first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const organizations = await Organization.find();
  let created = 0;
  let skipped = 0;

  for (const org of organizations) {
    const existing = await Subscription.findOne({ organizationId: org._id });
    if (existing) {
      skipped++;
      continue;
    }

    await Subscription.create({
      organizationId: org._id,
      planId: freePlan._id,
      status: 'active',
    });
    created++;
    console.log(`  ✓ ${org.name} (${org._id}) → Free plan`);
  }

  console.log(`Done. Created ${created} subscription(s), skipped ${skipped} (already had one).`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
