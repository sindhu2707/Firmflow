import Razorpay from 'razorpay';
import { env } from '../../config/env';
import { AppError } from '../../middlewares/errorHandler';

let client: Razorpay | null = null;

// Lazily constructed so the whole app doesn't fail to boot just because
// Razorpay keys aren't set yet (e.g. before you've created a Razorpay account,
// or in any environment that only ever sells the Free plan).
export function getRazorpayClient(): Razorpay {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw new AppError(
      'Razorpay is not configured on this server (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)',
      500
    );
  }

  if (!client) {
    client = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }

  return client;
}
