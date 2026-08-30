import { required } from "@server/shared";

export const env = {
  SERVICE_NAME: required("SERVICE_NAME"),
  PORT: parseInt(required("PORT")),
  CLIENT_ORIGIN: required("CLIENT_ORIGIN"),
  JWT_SECRET: required("JWT_SECRET"),
  INTERNAL_SECRET: required("INTERNAL_SECRET"),
  INTERNAL_SECRET_EXPIRATION: required("INTERNAL_SECRET_EXPIRATION"),
  RATE_LIMIT_WINDOW: parseInt(required("RATE_LIMIT_WINDOW")),
  RATE_LIMIT_MAX_REQUESTS: parseInt(required("RATE_LIMIT_MAX_REQUESTS")),
  DEFAULT_TIMEOUT: parseInt(required("DEFAULT_TIMEOUT")),
  LOG_LEVEL: required("LOG_LEVEL"),
  USER_SERVICE_URL: required("USER_SERVICE_URL"),
  CHAT_SERVICE_URL: required("CHAT_SERVICE_URL"),
};
