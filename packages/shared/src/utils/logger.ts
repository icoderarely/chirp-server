import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",

  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:dd-mm-yyyy HH:MM:ss",
        ignore: "pid,hostname,service",
      },
    },
  }),

  base: {
    service: process.env.SERVICE_NAME ?? "server",
  },
});

export default logger;
