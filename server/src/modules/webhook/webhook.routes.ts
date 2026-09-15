import { Router } from 'express';
import express from 'express';
import { handleRazorpayWebhook } from './webhook.controller';

const router = Router();

// `express.raw` here, NOT the app-wide `express.json()` — signature
// verification needs the exact bytes Razorpay sent. This route must be
// mounted in app.ts BEFORE the global express.json() middleware, or that
// middleware will have already consumed and parsed the body first.
router.post('/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

export default router;
