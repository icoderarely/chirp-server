import { verifyToken } from "@server/shared";
import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";

function headerValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const expectedSecret = process.env.INTERNAL_SECRET;
  const internalSecret = headerValue(req.headers["x-internal-secret"]);
  const gatewayUserId = headerValue(req.headers["x-user-id"]);

  if (expectedSecret && internalSecret === expectedSecret && gatewayUserId) {
    req.user = { userId: gatewayUserId };
    next();
    return;
  }

  // Fallback: chat service (and any direct callers) still send a Bearer token.
  const [bearer, token] = req.headers.authorization?.split(" ") ?? [];
  if (bearer !== "Bearer" || !token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const decoded = verifyToken(token) as JwtPayload;
  req.user = { userId: decoded.userId };
  next();
};
