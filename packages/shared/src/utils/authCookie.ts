import type { Response } from "express";

export const AUTH_COOKIE_NAME = "chirp_token";

const ONE_HOUR_MS = 60 * 60 * 1000;

export function setAuthCookie(
  res: Response,
  token: string,
  maxAgeMs = ONE_HOUR_MS,
) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeMs,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}
