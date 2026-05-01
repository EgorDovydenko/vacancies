import winston from "winston";
import * as path from "node:path";
import * as fs from "node:fs";

const LOGS_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

const TIMESTAMP_FMT = "YYYY-MM-DD HH:mm:ss";

/** Общий формат строки лога */
const lineFormat = winston.format.printf(
  ({ timestamp, level, message, stack }) => {
    const ts = String(timestamp);
    const lvl = String(level).toUpperCase();
    const msg = String(message);
    const stackStr = typeof stack === "string" ? stack : undefined;
    return stackStr
      ? `[${ts}] ${lvl}: ${msg}\n${stackStr}`
      : `[${ts}] ${lvl}: ${msg}`;
  },
);

const logger = winston.createLogger({
  level: process.env["LOG_LEVEL"] ?? "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: TIMESTAMP_FMT }),
    winston.format.errors({ stack: true }),
    lineFormat,
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: TIMESTAMP_FMT }),
        winston.format.colorize({ all: true }),
        lineFormat,
      ),
    }),
    new winston.transports.File({
      filename: path.join(LOGS_DIR, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(LOGS_DIR, "combined.log"),
    }),
  ],
});

export default logger;
