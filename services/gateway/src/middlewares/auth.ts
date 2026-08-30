import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env.js";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ message: "Missing or invalid Authorization header" });
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
