import type { Request, Response, NextFunction } from 'express';
import process from 'node:process';
import { handleValidationError } from './validation.js';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Enhanced error handler that supports validation errors and standardized responses
 * Handles validation errors with specific format and other errors with generic format
 */
export const errorHandler = (
  error: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Try to handle validation errors first
  if (handleValidationError(error, res)) {
    return;
  }

  // Handle other types of errors
  const statusCode = error.statusCode ?? 500;
  const message = error.message ?? 'Internal Server Error';

  console.error(`❌ Error ${statusCode}: ${message}`);
  console.error(error.stack);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(isDevelopment && { stack: error.stack }),
      ...(isDevelopment && { details: error }),
    },
    timestamp: new Date().toISOString(),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
  });
};
