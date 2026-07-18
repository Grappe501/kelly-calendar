export type SafeErrorCode =
  | "VALIDATION_ERROR"
  | "CONFIGURATION_ERROR"
  | "AUTHENTICATION_REQUIRED"
  | "PERMISSION_DENIED"
  | "RATE_LIMIT"
  | "NOT_FOUND"
  | "CONFLICT"
  | "EXTERNAL_SERVICE_ERROR"
  | "DATABASE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type SafeErrorBody = {
  ok: false;
  error: {
    code: SafeErrorCode;
    message: string;
    requestId: string;
  };
};

export class AppError extends Error {
  readonly code: SafeErrorCode;
  readonly status: number;
  readonly publicMessage: string;
  readonly severity: "debug" | "info" | "warn" | "error";
  requestId?: string;

  constructor(options: {
    code: SafeErrorCode;
    status: number;
    publicMessage: string;
    internalMessage?: string;
    severity?: "debug" | "info" | "warn" | "error";
    cause?: unknown;
  }) {
    super(options.internalMessage ?? options.publicMessage);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status;
    this.publicMessage = options.publicMessage;
    this.severity = options.severity ?? "error";
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export class ValidationError extends AppError {
  constructor(message = "The request is invalid.", cause?: unknown) {
    super({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: message,
      severity: "warn",
      cause,
    });
    this.name = "ValidationError";
  }
}

export class ConfigurationError extends AppError {
  constructor(message = "The application is not configured for this operation.", cause?: unknown) {
    super({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: message,
      severity: "error",
      cause,
    });
    this.name = "ConfigurationError";
  }
}

export class AuthenticationRequiredError extends AppError {
  constructor(message = "Authentication is required.", cause?: unknown) {
    super({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage: message,
      severity: "warn",
      cause,
    });
    this.name = "AuthenticationRequiredError";
  }
}

export class PermissionDeniedError extends AppError {
  constructor(message = "You do not have permission for this action.", cause?: unknown) {
    super({
      code: "PERMISSION_DENIED",
      status: 403,
      publicMessage: message,
      severity: "warn",
      cause,
    });
    this.name = "PermissionDeniedError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.", cause?: unknown) {
    super({
      code: "RATE_LIMIT",
      status: 429,
      publicMessage: message,
      severity: "warn",
      cause,
    });
    this.name = "RateLimitError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.", cause?: unknown) {
    super({
      code: "NOT_FOUND",
      status: 404,
      publicMessage: message,
      severity: "info",
      cause,
    });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "The request conflicts with the current state.", cause?: unknown) {
    super({
      code: "CONFLICT",
      status: 409,
      publicMessage: message,
      severity: "warn",
      cause,
    });
    this.name = "ConflictError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = "An external service is unavailable.", cause?: unknown) {
    super({
      code: "EXTERNAL_SERVICE_ERROR",
      status: 502,
      publicMessage: message,
      severity: "error",
      cause,
    });
    this.name = "ExternalServiceError";
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor(message = "The database is temporarily unavailable.", cause?: unknown) {
    super({
      code: "DATABASE_UNAVAILABLE",
      status: 503,
      publicMessage: message,
      severity: "error",
      cause,
    });
    this.name = "DatabaseUnavailableError";
  }
}

export function toSafeErrorBody(error: unknown, requestId: string): SafeErrorBody {
  if (error instanceof AppError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.publicMessage,
        requestId: error.requestId ?? requestId,
      },
    };
  }
  return {
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "The request could not be completed.",
      requestId,
    },
  };
}

export function statusFromError(error: unknown): number {
  if (error instanceof AppError) return error.status;
  return 500;
}
