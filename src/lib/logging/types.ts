export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogRecord = {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  requestId?: string;
  operation?: string;
  durationMs?: number;
  status?: number | string;
  route?: string;
  capability?: string;
  data?: unknown;
};
