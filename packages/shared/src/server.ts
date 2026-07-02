import express, { type Express, type Router } from 'express';
import { serviceAuthMiddleware, type ServiceAuthOptions } from './auth.js';
import { browserCorsMiddleware } from './cors.js';
import { loadEnv } from './load-env.js';
import { createLogger } from './logger.js';
import { requestLoggingMiddleware } from './middleware.js';
import { traceIdMiddleware } from './trace.js';

export type ServiceAppOptions = {
  /** Additional paths exempt from service token validation */
  publicPaths?: string[];
  /** Override SERVICE_TOKEN env; pass empty string to disable auth */
  serviceToken?: string;
  /** Disable service-to-service auth middleware */
  enableServiceAuth?: boolean;
};

export function createServiceApp(serviceName: string, options: ServiceAppOptions = {}): Express {
  loadEnv();
  const app = express();
  const logger = createLogger({ service: serviceName });

  app.use(browserCorsMiddleware());
  // #region agent log
  app.use((req, _res, next) => {
    if (req.method === 'OPTIONS' && req.headers['access-control-request-headers']) {
      fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4170da' },
        body: JSON.stringify({
          sessionId: '4170da',
          runId: 'cors-preflight',
          hypothesisId: 'A',
          location: 'shared/server.ts:options-preflight',
          message: 'CORS preflight received',
          data: {
            service: serviceName,
            path: req.path,
            origin: req.headers.origin ?? null,
            requestedHeaders: req.headers['access-control-request-headers'],
            allowedHeaders: [
              'Content-Type',
              'Authorization',
              'x-trace-id',
              'x-service-token',
              'x-service-name',
            ],
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    next();
  });
  // #endregion
  app.use(express.json());
  app.use(traceIdMiddleware({ logger }));
  app.use(requestLoggingMiddleware());

  const authOptions: ServiceAuthOptions = {
    serviceToken: options.serviceToken,
    publicPaths: options.publicPaths,
  };
  if (options.enableServiceAuth !== false) {
    app.use(serviceAuthMiddleware(authOptions));
  }

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: serviceName,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', (_req, res) => {
    res.json({ ready: true, service: serviceName });
  });

  return app;
}

/** Mount authenticated internal API routes under a prefix */
export function createInternalRouter(): Router {
  return express.Router();
}

export { createLogger } from './logger.js';
