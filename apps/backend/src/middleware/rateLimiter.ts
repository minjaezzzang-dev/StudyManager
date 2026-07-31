// =============================================================
// EasyKR Backend — Rate Limiting Middleware
// =============================================================
// Configurable rate limiting with Redis fallback to memory
// =============================================================

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

/**
 * Create rate limiter with configuration
 */
export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const defaultConfig: RateLimitConfig = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.ip || 'unknown',
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/ping';
    },
  };
  
  return rateLimit({
    ...defaultConfig,
    ...config,
    handler: (req: Request, res: Response) => {
      logger.warn({
        ip: req.ip,
        path: req.path,
        method: req.method,
      }, 'Rate limit exceeded');
      
      res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        message: config.message || defaultConfig.message,
        retryAfter: Math.ceil((config.windowMs || defaultConfig.windowMs) / 1000),
      });
    },
  });
}

/**
 * General API rate limiter
 */
export const apiRateLimiter = createRateLimiter();

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '10'),
  message: 'Too many authentication attempts, please try again later',
});

/**
 * Lenient rate limiter for read-heavy endpoints
 */
export const readRateLimiter = createRateLimiter({
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100') * 5,
  message: 'Too many requests, please try again later',
});

/**
 * Strict rate limiter for write operations
 */
export const writeRateLimiter = createRateLimiter({
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100') / 2,
  message: 'Too many write operations, please try again later',
});

/**
 * Rate limiter per user (requires authentication)
 */
export function userRateLimiter(maxRequests: number = 100) {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: maxRequests,
    message: 'Too many requests from this user',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const authReq = req as import('./auth').AuthenticatedRequest;
      return authReq.user?.id || req.ip || 'unknown';
    },
    skip: (req: Request) => req.path === '/health' || req.path === '/ping',
  });
}