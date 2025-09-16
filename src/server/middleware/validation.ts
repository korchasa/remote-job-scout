/**
 * Validation middleware for API endpoints
 * Provides input validation using Zod schemas with standardized error responses
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { ZodSchema, ZodError } from 'zod';

/**
 * Interface for validation error details
 */
interface ValidationErrorDetail {
  field: string;
  message: string;
  received?: unknown;
}

/**
 * Interface for standardized validation error response
 */
interface ValidationErrorResponse {
  code: 'VALIDATION_ERROR';
  message: string;
  details: ValidationErrorDetail[];
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  public readonly statusCode = 400;
  public readonly isOperational = true;

  constructor(
    public readonly details: ValidationErrorDetail[],
    message = 'Validation failed',
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Converts Zod error to validation error details
 * @param zodError - The Zod validation error
 * @returns Array of validation error details
 */
function zodErrorToDetails(zodError: ZodError): ValidationErrorDetail[] {
  return zodError.errors.map((error) => ({
    field: error.path.join('.'),
    message: error.message,
    received: error.code === 'invalid_type' ? error.received : undefined,
  }));
}

/**
 * Creates validation middleware for a given Zod schema
 * @param schema - Zod schema to validate against
 * @param source - Where to extract data from request ('body', 'query', 'params')
 * @returns Express middleware function
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body',
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Extract data from the appropriate request source
      let dataToValidate: unknown;
      switch (source) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        default:
          throw new ValidationError([
            {
              field: 'request',
              message: 'Invalid validation source',
            },
          ]);
      }

      // Validate the data
      const validatedData = schema.parse(dataToValidate);

      // Store validated data back in request for use in route handlers
      switch (source) {
        case 'body':
          (req as Request & { validatedBody: T }).validatedBody = validatedData;
          break;
        case 'query':
          (req as Request & { validatedQuery: T }).validatedQuery = validatedData;
          break;
        case 'params':
          (req as Request & { validatedParams: T }).validatedParams = validatedData;
          break;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod error to our standardized format
        const details = zodErrorToDetails(error);
        next(new ValidationError(details));
      } else {
        // Re-throw non-Zod errors
        next(error);
      }
    }
  };
}

/**
 * Validates URL parameters using session ID schema
 * @param paramName - Name of the parameter to validate
 * @returns Express middleware function
 */
export function validateSessionIdParam(paramName = 'sessionId') {
  return validateRequest(
    z.object({
      [paramName]: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9_-]+$/),
    }),
    'params',
  );
}

/**
 * Validates job ID parameter
 * @param paramName - Name of the parameter to validate (default: 'id')
 * @returns Express middleware function
 */
export function validateJobIdParam(paramName = 'id') {
  return validateRequest(z.object({ [paramName]: z.string().uuid() }), 'params');
}

/**
 * Handles validation errors and sends standardized error responses
 * This should be used in the error handling middleware
 * @param error - The error to handle
 * @param res - Express response object
 * @returns Whether the error was handled (true) or should be passed to next handler (false)
 */
export function handleValidationError(error: unknown, res: Response): boolean {
  if (error instanceof ValidationError) {
    const response: ValidationErrorResponse = {
      code: 'VALIDATION_ERROR',
      message: error.message,
      details: error.details,
    };

    res.status(400).json(response);
    return true;
  }

  return false;
}

// Type augmentation for validated request properties
declare module 'express' {
  interface Request {
    validatedBody?: unknown;
    validatedQuery?: unknown;
    validatedParams?: unknown;
  }
}
