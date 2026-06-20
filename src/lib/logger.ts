import pino from "pino";
import pretty from "pino-pretty";

const isProduction = process.env.NODE_ENV === "production";

// Sync pretty stream — pino-pretty transport uses worker threads and breaks
// Next.js API routes / long-lived SSE handlers on Windows.
const devStream = isProduction
  ? undefined
  : pretty({
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    });

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
    base: {
      service: "ra",
      env: process.env.NODE_ENV,
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  devStream,
);

export function createRequestLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
