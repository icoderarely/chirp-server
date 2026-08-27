import { verifyToken } from "@/utils/generateToken.js";
import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const [bearer, token] = req.headers.authorization?.split(" ") ?? [];
  if (bearer !== "Bearer" || !token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const decoded = verifyToken(token) as JwtPayload;
  req.user = { userId: decoded.userId };
  next();
};
