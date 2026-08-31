import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE_NAME } from "@server/shared";
import { env } from "@/config/env.js";

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : undefined;
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return readCookie(req, AUTH_COOKIE_NAME);
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: "Missing or invalid auth token" });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      sub?: string;
      userId?: string;
    };
    // Tokens are issued as { userId }; accept `sub` if present.
    const userId = payload.userId ?? payload.sub;
    if (!userId) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    (req as any).userId = userId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
