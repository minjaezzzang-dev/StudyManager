// =============================================================
// EasyKR Backend — Error Handler Middleware
// =============================================================
// Centralized error handling with proper HTTP status codes
// =============================================================

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
  
  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }
  
  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(401, message, 'UNAUTHORIZED');
  }
  
  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(403, message, 'FORBIDDEN');
  }
  
  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(404, message, 'NOT_FOUND');
  }
  
  static conflict(message: string): AppError {
    return new AppError(409, message, 'CONFLICT');
  }
  
  static tooManyRequests(message: string = 'Too many requests'): AppError {
    return new AppError(429, message, 'TOO_MANY_REQUESTS');
  }
  
  static internal(message: string = 'Internal server error'): AppError {
    return new AppError(500, message, 'INTERNAL_ERROR');
  }
  
  static serviceUnavailable(message: string = 'Service temporarily unavailable'): AppError {
    return new AppError(503, message, 'SERVICE_UNAVAILABLE');
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req as Request & { requestId?: string }).requestId;
  
  // Log error
  logger.error({
    requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
    method: req.method,
    url: req.url,
  }, 'Request error');
  
  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
    
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details,
      requestId,
    });
    return;
  }
  
  // App errors (known operational errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
      requestId,
    });
    return;
  }
  
  // Supabase errors
  if (err.message?.includes('JWT')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
      requestId,
    });
    return;
  }
  
  if (err.message?.includes('duplicate key')) {
    res.status(409).json({
      error: 'CONFLICT',
      message: 'Resource already exists',
      requestId,
    });
    return;
  }
  
  // Unknown errors - don't leak details in production
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: isProduction ? 'An unexpected error occurred' : err.message,
    requestId,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.url} not found`,
    requestId: (req as Request & { requestId?: string }).requestId,
  });
}