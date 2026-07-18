import { sanitizeLogData } from "@/lib/logging/sanitize-log-data";
import type { LogLevel, LogRecord } from "@/lib/logging/types";
import { SERVICE_NAME } from "@/lib/system/constants";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

function write(level: LogLevel, message: string, extra?: Partial<LogRecord>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel()]) return;
  const record: LogRecord = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: SERVICE_NAME,
    environment: process.env.NODE_ENV ?? "development",
    ...extra,
    data: extra?.data === undefined ? undefined : sanitizeLogData(extra.data),
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, extra?: Partial<LogRecord>) => write("debug", message, extra),
  info: (message: string, extra?: Partial<LogRecord>) => write("info", message, extra),
  warn: (message: string, extra?: Partial<LogRecord>) => write("warn", message, extra),
  error: (message: string, extra?: Partial<LogRecord>) => write("error", message, extra),
};
