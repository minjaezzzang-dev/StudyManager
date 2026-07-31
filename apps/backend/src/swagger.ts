import swaggerJSDoc, { type OAS3Definition } from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { RequestHandler } from 'express';
import type { EnvConfig } from '@dahamkee/shared/env';

export function createSwaggerSpec(env: EnvConfig): OAS3Definition {
  return swaggerJSDoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: `${env.APP_NAME} API`,
        version: env.APP_VERSION,
        description: 'EasyKR backend API documentation',
      },
      servers: [{ url: env.BACKEND_URL }],
    },
    apis: ['./src/routes/*.ts'],
  });
}

export function swaggerUiMiddleware(spec: OAS3Definition): RequestHandler[] {
  return [swaggerUi.serve, swaggerUi.setup(spec)] as unknown as RequestHandler[];
}
