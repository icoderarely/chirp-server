import { type Request, type Response, type NextFunction } from "express";
import { logger } from "./logger.js";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
};
