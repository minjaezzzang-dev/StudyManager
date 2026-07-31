// =============================================================
// EasyKR Backend — Entry Point
// =============================================================
// Loads environment variables and starts the Express server
// =============================================================

import { env } from './config/env';
import { createApp } from './app';
import { getDb } from './db/sqlite';
import { ensureTextbooksIngested } from './services/textbookRag';
import { ensureUnitCharactersIngested } from './services/unitCharacterRag';
import { seedStoryPersonasFromUnitFiles } from './services/seedStoryPersonas';
import { createLogger, logger, setLogger } from './utils/logger';
import { attachInterpretLiveProxy } from './ws/interpretLive';

setLogger(createLogger(env));

async function startServer(): Promise<void> {
  try {
    getDb();
    const app = createApp(env);
    
    const port = Number(process.env.PORT) || env.BACKEND_PORT;
    const host = env.BACKEND_HOST;
    
    const server = app.listen(port, host, () => {
      logger.info(`EasyKR Backend started`);
      logger.info(`   Environment: ${env.APP_ENV}`);
      logger.info(`   Listening on: http://${host}:${port}`);
      logger.info(`   API Docs: http://${host}:${port}${env.SWAGGER_PATH}`);
      logger.info(`   CORS Origin: ${env.BACKEND_CORS_ORIGIN}`);

      // Defer heavy RAG ingest so the process binds PORT before OOM on small instances.
      setImmediate(() => {
        try {
          ensureTextbooksIngested();
          ensureUnitCharactersIngested();
          seedStoryPersonasFromUnitFiles();
        } catch (err) {
          logger.error({ err }, 'Startup RAG ingest failed (non-fatal)');
        }
      });
    });

    attachInterpretLiveProxy(server);
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();