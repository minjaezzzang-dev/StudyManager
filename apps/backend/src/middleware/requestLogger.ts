// =============================================================
// EasyKR Backend — Request Logger Middleware
// =============================================================
// Logs incoming requests with timing
// =============================================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to request for downstream use
  (req as Request & { requestId: string }).requestId = requestId;
  
  // Log request
  logger.info({
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }, 'Incoming request');
  
  // Capture response
  const originalSend = res.send;
  res.send = function (body?: unknown): Response {
    const duration = Date.now() - startTime;
    
    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    }, 'Request completed');
    
    return originalSend.call(this, body);
  };
  
  next();
}