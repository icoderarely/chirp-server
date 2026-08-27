import { type RequestHandler } from "express";
import { type Request, type Response, type NextFunction } from "express";
import { logger } from "./logger.js";

export const TryCatch = (handler: RequestHandler): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error: unknown) {
      logger.error((error as Error).message);
      res.status(500).json({ message: (error as Error).message });
    }
  };
};
