// =============================================================
// EasyKR Backend — Logger Utility
// =============================================================

import pino, { Logger, LoggerOptions } from 'pino';
import { EnvConfig } from '@dahamkee/shared/env';

let loggerInstance: Logger | null = null;

export function createLogger(env: EnvConfig): Logger {
  const options: LoggerOptions = {
    level: env.LOG_LEVEL,
    formatters: {
      level: (label) => ({ level: label.toUpperCase() }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: 'easykr-backend',
      env: env.APP_ENV,
      version: env.APP_VERSION,
    },
  };

  if (env.LOG_PRETTY && env.APP_ENV !== 'production') {
    const transport = pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    });
    return pino(options, transport);
  }

  return pino(options);
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = pino({
      level: process.env.LOG_LEVEL || 'info',
    });
  }
  return loggerInstance;
}

export function setLogger(logger: Logger): void {
  loggerInstance = logger;
}

type LogFn = (...args: Parameters<Logger['info']>) => void;

export const logger = {
  get: getLogger,
  set: setLogger,
  fatal: ((...args) => getLogger().fatal(...args)) as LogFn,
  error: ((...args) => getLogger().error(...args)) as LogFn,
  warn: ((...args) => getLogger().warn(...args)) as LogFn,
  info: ((...args) => getLogger().info(...args)) as LogFn,
  debug: ((...args) => getLogger().debug(...args)) as LogFn,
  trace: ((...args) => getLogger().trace(...args)) as LogFn,
  child: (bindings: Record<string, unknown>) => getLogger().child(bindings),
};
