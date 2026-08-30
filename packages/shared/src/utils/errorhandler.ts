import { type Request, type Response, type NextFunction } from "express";
import { logger } from "./logger.js";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error({
    requestId: (req as any).requestId,
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
  });

  res.status(err.status || 500).json({
    message: err.status ? err.message : "Internal server error",
  });
}
