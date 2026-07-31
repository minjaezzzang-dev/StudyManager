// =============================================================
// EasyKR Backend — Authentication Middleware (JWT)
// =============================================================

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { verifyAccessToken } from '../services/authTokens';
import { findUserById } from '../services/users';
import { logger } from '../utils/logger';
import { AppError } from './errorHandler';

export type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
    role: string;
  };
};

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication token required'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token, env.JWT_SECRET);
    const user = findUserById(payload.sub);

    if (!user) {
      return next(AppError.unauthorized('Invalid or expired token'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    logger.warn({
      requestId: req.requestId,
      error: err instanceof Error ? err.message : String(err),
    }, 'Token verification failed');
    next(AppError.unauthorized('Invalid or expired token'));
  }
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    await authenticateToken(req, res, next);
  } catch {
    next();
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      throw AppError.unauthorized('Authentication required');
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      throw AppError.forbidden(`Requires one of roles: ${allowedRoles.join(', ')}`);
    }

    next();
  };
}

export const requireTeacher = requireRole('teacher', 'admin');
export const requireAdmin = requireRole('admin');
