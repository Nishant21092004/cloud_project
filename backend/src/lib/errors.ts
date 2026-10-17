/**
 * Application error type — every expected failure in the API becomes an
 * AppError with a stable machine-readable `code`. Unknown errors never
 * leak stack traces to clients (see middleware/error.ts).
 */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (code: string, message: string, details?: unknown) => new AppError(400, code, message, details);
export const unauthorized = (message = "Please sign in to continue") => new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You do not have access to this resource") => new AppError(403, "FORBIDDEN", message);
export const notFound = (message = "Not found") => new AppError(404, "NOT_FOUND", message);
export const conflict = (code: string, message: string, details?: unknown) => new AppError(409, code, message, details);
