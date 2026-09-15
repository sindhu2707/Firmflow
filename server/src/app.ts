import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import organizationRoutes from "./modules/organizations/organization.routes";
import userRoutes from "./modules/users/user.routes";
import productRoutes from './modules/product/product.routes';
import orderRoutes from './modules/order/order.routes';
import categoryRoutes from './modules/category/category.routes';
import addressRoutes from './modules/address/address.routes';
import planRoutes from './modules/plan/plan.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes';
import webhookRoutes from './modules/webhook/webhook.routes';
import invoiceRoutes from './modules/invoice/invoice.routes';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(pinoHttp({ logger }));

// Must come BEFORE express.json() below — signature verification needs the
// exact raw bytes Razorpay sent. If express.json() ran first, it would
// already have parsed (and consumed) the body by the time this route saw it.
// (Deliberately also before the rate limiter further down: Razorpay's own
// servers make these calls, not a end user, so they shouldn't share the
// per-IP API limit meant for user traffic.)
app.use('/api/webhooks', webhookRoutes);

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/users", userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invoices', invoiceRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;