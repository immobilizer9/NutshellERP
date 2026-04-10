/**
 * Structured logger using pino.
 * Import this instead of console.error / console.log in API routes.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.error({ err, userId }, "Login failed");
 *   logger.info({ orderId }, "Order created");
 */
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, ignore: "pid,hostname" },
    },
  }),
});
