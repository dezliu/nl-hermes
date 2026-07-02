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
