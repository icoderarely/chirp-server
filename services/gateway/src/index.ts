import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";

import { logger, errorHandler } from "@server/shared";
import { env } from "@/config/env.js";
import { requestId } from "@/middlewares/requestId.js";
import { rateLimiter } from "@/middlewares/rateLimiter.js";
import { mountProxies } from "@/proxy/index.js";

const app = express();

// Trust proxy
app.set("trust proxy", 1);

// Security headers
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(requestId);
app.use(rateLimiter);

// Request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      requestId: (req as any).requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      responseTime: `${Date.now() - start}ms`,
    });
  });
  next();
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ message: "OK" });
});

// Proxy mounts
mountProxies(app);

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn(`Resource not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: "Not Found" });
});

// Error handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`Gateway service is running on port ${env.PORT}`);
});
