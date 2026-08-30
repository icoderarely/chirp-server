import type { Express, NextFunction, Request, Response } from "express";
import { services } from "@/config/services.js";
import { createServiceProxy } from "@/proxy/createServiceProxy.js";
import { authMiddleware } from "@/middlewares/auth.js";

function authUnlessPublic(publicPaths: string[]) {
  const skip = new Set(publicPaths);
  return (req: Request, res: Response, next: NextFunction) => {
    if (skip.has(req.path)) {
      next();
      return;
    }
    authMiddleware(req, res, next);
  };
}

export function mountProxies(app: Express) {
  for (const service of services) {
    const middlewares = service.requiresAuth
      ? [
          service.publicPaths?.length
            ? authUnlessPublic(service.publicPaths)
            : authMiddleware,
        ]
      : [];
    app.use(service.pathPrefix, ...middlewares, createServiceProxy(service));
  }
}
