import { env } from "@/config/env.js";

export interface ServiceConfig {
  name: string;
  target: string;
  pathPrefix: string;
  /** Downstream mount path. Express strips pathPrefix from req.url; HPM prepends this onto the target. */
  rewriteTo: string;
  requiresAuth: boolean;
  /** Paths relative to pathPrefix that skip JWT auth (e.g. login). */
  publicPaths?: string[];
}

export const services: ServiceConfig[] = [
  {
    name: "user",
    target: env.USER_SERVICE_URL,
    pathPrefix: "/api/users",
    rewriteTo: "/users",
    requiresAuth: true,
    publicPaths: ["/login", "/register", "/verify-otp"],
  },
  {
    name: "chat",
    target: env.CHAT_SERVICE_URL,
    pathPrefix: "/api/chats",
    rewriteTo: "/chat",
    requiresAuth: true,
  },
  {
    name: "chat",
    target: env.CHAT_SERVICE_URL,
    pathPrefix: "/api/messages",
    rewriteTo: "/messages",
    requiresAuth: true,
  },
];
