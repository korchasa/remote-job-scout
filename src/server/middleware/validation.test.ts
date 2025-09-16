/**
 * Tests for validation middleware
 * Ensures middleware correctly validates requests and returns standardized error responses
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ValidationError,
  validateRequest,
  validateSessionIdParam,
  validateJobIdParam,
  handleValidationError,
} from './validation';

// Mock express types
const mockRequest = (body = {}, query = {}, params = {}) =>
  ({
    body,
    query,
    params,
  }) as Request;

const mockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn() as NextFunction;

describe('Validation Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('should validate and store valid data in request', () => {
      const schema = z.object({ name: z.string().min(1) });
      const middleware = validateRequest(schema, 'body');
      const req = mockRequest({ name: 'test' });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(req.validatedBody).toEqual({ name: 'test' });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle validation errors and call next with ValidationError', () => {
      const schema = z.object({ name: z.string().min(5) });
      const middleware = validateRequest(schema, 'body');
      const req = mockRequest({ name: 'hi' }); // too short
      const res = mockResponse();
      let capturedError: ValidationError | undefined;

      const mockNextCapture = vi.fn((error) => {
        capturedError = error as ValidationError;
      });

      middleware(req, res, mockNextCapture);

      expect(mockNextCapture).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(capturedError).toBeDefined();
      expect(capturedError?.details).toHaveLength(1);
      expect(capturedError?.details[0].field).toBe('name');
    });

    it('should validate query parameters', () => {
      const schema = z.object({ limit: z.coerce.number().min(1) });
      const middleware = validateRequest(schema, 'query');
      const req = mockRequest({}, { limit: '10' });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(req.validatedQuery).toEqual({ limit: 10 });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate URL parameters', () => {
      const schema = z.object({ id: z.string().uuid() });
      const middleware = validateRequest(schema, 'params');
      const req = mockRequest({}, {}, { id: '123e4567-e89b-12d3-a456-426614174000' });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(req.validatedParams).toEqual({ id: '123e4567-e89b-12d3-a456-426614174000' });
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateSessionIdParam', () => {
    it('should validate session ID parameters', () => {
      const middleware = validateSessionIdParam();
      const req = mockRequest({}, {}, { sessionId: 'test-session-123' });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(req.validatedParams).toEqual({ sessionId: 'test-session-123' });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid session IDs', () => {
      const middleware = validateSessionIdParam();
      const req = mockRequest({}, {}, { sessionId: 'invalid@session' });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('validateJobIdParam', () => {
    it('should validate job ID parameters', () => {
      const middleware = validateJobIdParam();
      const req = mockRequest({}, {}, { id: '123e4567-e89b-12d3-a456-426614174000' });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(req.validatedParams).toEqual({ id: '123e4567-e89b-12d3-a456-426614174000' });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid job IDs', () => {
      const middleware = validateJobIdParam();
      const req = mockRequest({}, {}, { id: 'not-a-uuid' });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('handleValidationError', () => {
    it('should handle ValidationError and return standardized response', () => {
      const validationError = new ValidationError([
        { field: 'name', message: 'Required', received: undefined },
        { field: 'email', message: 'Invalid email format', received: 'invalid-email' },
      ]);
      const res = mockResponse();

      const handled = handleValidationError(validationError, res);

      expect(handled).toBe(true);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [
          { field: 'name', message: 'Required', received: undefined },
          { field: 'email', message: 'Invalid email format', received: 'invalid-email' },
        ],
      });
    });

    it('should return false for non-ValidationError', () => {
      const regularError = new Error('Regular error');
      const res = mockResponse();

      const handled = handleValidationError(regularError, res);

      expect(handled).toBe(false);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('ValidationError class', () => {
    it('should create ValidationError with correct properties', () => {
      const details = [{ field: 'test', message: 'Test error' }];
      const error = new ValidationError(details, 'Custom message');

      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.details).toBe(details);
      expect(error.message).toBe('Custom message');
    });

    it('should use default message if not provided', () => {
      const details = [{ field: 'test', message: 'Test error' }];
      const error = new ValidationError(details);

      expect(error.message).toBe('Validation failed');
    });
  });
});
