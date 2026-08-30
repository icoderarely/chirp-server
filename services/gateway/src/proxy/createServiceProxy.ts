import { createProxyMiddleware } from "http-proxy-middleware";
import type { ServiceConfig } from "@/config/services.js";
import { logger } from "@server/shared";
import { env } from "@/config/env.js";

export function createServiceProxy(service: ServiceConfig) {
  return createProxyMiddleware({
    // Express strips pathPrefix from req.url; prepend rewriteTo so
    // /api/users/login reaches the user service at /users/login.
    target: `${service.target}${service.rewriteTo}`,
    changeOrigin: true,
    xfwd: true,
    timeout: env.DEFAULT_TIMEOUT,
    proxyTimeout: env.DEFAULT_TIMEOUT,
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader("x-request-id", (req as any).requestId);
        proxyReq.setHeader("x-internal-secret", env.INTERNAL_SECRET);
        // forward the authenticated user id downstream, if present
        const userId = (req as any).userId;
        if (userId) {
          proxyReq.setHeader("x-user-id", userId);
        }
      },
      proxyRes: (proxyRes) => {
        // Downstream CORS (user service still has its own) would overwrite
        // the gateway's ACAO and break browser clients on CLIENT_ORIGIN.
        proxyRes.headers["access-control-allow-origin"] = env.CLIENT_ORIGIN;
        proxyRes.headers["access-control-allow-credentials"] = "true";
      },
      error: (err, _req, res) => {
        logger.error(`Proxy error for ${service.name}: ${err.message}`);
        if ("writeHead" in res) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ message: `${service.name} service unavailable` }),
          );
        }
      },
    },
  });
}
