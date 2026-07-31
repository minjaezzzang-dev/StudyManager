// =============================================================
// EasyKR Backend — App Factory
// =============================================================
// Creates and configures the Express application
// =============================================================

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createSwaggerSpec, swaggerUiMiddleware } from './swagger';
import { authRouter } from './routes/auth';
import { translationRouter } from './routes/translation';
import { personaRouter } from './routes/persona';
import { debateRouter } from './routes/debate';
import { noticeRouter } from './routes/notice';
import { textbookRouter } from './routes/textbook';
import { userRouter } from './routes/user';
import { healthRouter } from './routes/health';
import { aiRelayRouter } from './routes/aiRelay';
import { interpretRouter } from './routes/interpret';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authenticateToken } from './middleware/auth';
import { EnvConfig } from '@dahamkee/shared/env';
import { logger } from './utils/logger';

export function createApp(env: EnvConfig): Express {
  const app = express();
  
  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);
  
  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.APP_ENV === 'production' ? undefined : false,
  }));
  
  // CORS configuration
  const corsOrigins = env.BACKEND_CORS_ORIGIN.split(',').map(o => o.trim());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // Treat localhost and 127.0.0.1 as equivalent for local web
      const normalized = origin.replace('://127.0.0.1', '://localhost');
      const allowed = new Set([
        ...corsOrigins,
        ...corsOrigins.map((o) => o.replace('://localhost', '://127.0.0.1')),
      ]);
      if (
        allowed.has(origin) ||
        allowed.has(normalized) ||
        corsOrigins.includes('*')
      ) {
        return callback(null, true);
      }
      // Do not throw — throwing becomes HTTP 500 and surfaces as "Failed to fetch"
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'Apikey'],
  }));
  
  // Compression
  app.use(compression());
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Request logging
  app.use(requestLogger);
  
  // Rate limiting
  const globalLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith('/health'),
  });
  app.use(globalLimiter);
  
  // Stricter rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_AUTH_MAX_REQUESTS,
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Health check (no auth, no rate limit)
  app.use('/health', healthRouter);
  
  // API Documentation
  if (env.ENABLE_SWAGGER_UI) {
    const swaggerSpec = createSwaggerSpec(env);
    app.use(env.SWAGGER_PATH, ...swaggerUiMiddleware(swaggerSpec));
  }
  
  // API Routes
  const apiRouter = express.Router();
  
  // Public auth routes (with auth rate limiting)
  apiRouter.use('/auth', authLimiter, authRouter);
  
  // Protected routes (require authentication)
  apiRouter.use('/translations', authenticateToken, translationRouter);
  apiRouter.use('/personas', authenticateToken, personaRouter);
  apiRouter.use('/debates', authenticateToken, debateRouter);
  apiRouter.use('/notices', authenticateToken, noticeRouter);
  apiRouter.use('/textbooks', authenticateToken, textbookRouter);
  apiRouter.use('/users', authenticateToken, userRouter);
  apiRouter.use('/ai', authenticateToken, aiRelayRouter);
  apiRouter.use('/interpret', authenticateToken, interpretRouter);
  
  app.use('/api', apiRouter);
  
  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ 
      error: 'Not Found', 
      message: `Route ${req.method} ${req.path} not found` 
    });
  });
  
  // Global error handler
  app.use(errorHandler);
  
  return app;
}