import type { Request, Response, NextFunction } from "express";
import { env } from "@/config/env.js";

function headerValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function trustGateway(req: Request, res: Response, next: NextFunction) {
  const internalSecret = headerValue(req.headers["x-internal-secret"]);
  const userId = headerValue(req.headers["x-user-id"]);

  if (internalSecret !== env.INTERNAL_SECRET) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  req.user = { userId };
  next();
}
