/**
 * One-time backfill: every user created before isActive existed on the
 * schema has no isActive field in the database at all (not false — missing).
 * This sets isActive: true on all of them, matching the intended default
 * for existing accounts that were never deactivated.
 *
 * Safe to re-run — it only touches users where isActive doesn't exist yet.
 *
 * Run with: npx tsx src/scripts/backfillActiveUsers.ts
 */
import dns from 'dns';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/users/user.model';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function backfill() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB — backfilling isActive...');

  const result = await User.updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } }
  );

  console.log(`Done. Updated ${result.modifiedCount} user(s).`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});