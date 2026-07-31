import { Router } from 'express';
import { env } from '../config/env';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'easykr-backend',
    debug: env.DEBUG === 'true' || env.APP_ENV === 'development',
    timestamp: new Date().toISOString(),
  });
});
