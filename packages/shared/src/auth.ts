import type { NextFunction, Request, Response } from 'express';
import { HTTP_HEADERS, PUBLIC_SERVICE_PATHS } from './constants.js';

export type ServiceAuthOptions = {
  /** Shared secret for inter-service calls; disabled when empty */
  serviceToken?: string;
  /** Additional paths to skip auth (e.g. GraphQL playground) */
  publicPaths?: string[];
  /** Path prefix requiring service token; default `/v1` */
  protectedPrefix?: string;
};

function isPublicPath(path: string, publicPaths: string[]): boolean {
  return PUBLIC_SERVICE_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
    || publicPaths.some((p) => path === p || path.startsWith(`${p}/`));
}

function isProtectedPath(path: string, protectedPrefix: string): boolean {
  return path === protectedPrefix || path.startsWith(`${protectedPrefix}/`);
}

export function serviceAuthMiddleware(options: ServiceAuthOptions = {}) {
  const serviceToken = options.serviceToken ?? process.env.SERVICE_TOKEN ?? '';
  const publicPaths = options.publicPaths ?? [];
  const protectedPrefix = options.protectedPrefix ?? '/v1';

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!serviceToken) {
      next();
      return;
    }

    if (isPublicPath(req.path, publicPaths) || !isProtectedPath(req.path, protectedPrefix)) {
      next();
      return;
    }

    const token = req.header(HTTP_HEADERS.SERVICE_TOKEN);
    if (token !== serviceToken) {
      req.ctx?.logger.warn('auth.service.rejected', {
        path: req.path,
        method: req.method,
      });
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED_SERVICE',
          message: 'Invalid or missing service token',
        },
        traceId: req.ctx?.traceId,
      });
      return;
    }

    next();
  };
}

export function getServiceAuthHeaders(serviceName?: string): Record<string, string> {
  const token = process.env.SERVICE_TOKEN;
  const headers: Record<string, string> = {};
  if (token) {
    headers[HTTP_HEADERS.SERVICE_TOKEN] = token;
  }
  if (serviceName) {
    headers[HTTP_HEADERS.SERVICE_NAME] = serviceName;
  }
  return headers;
}

export function withServiceAuth(
  headers: Record<string, string> = {},
  serviceName?: string,
): Record<string, string> {
  return { ...headers, ...getServiceAuthHeaders(serviceName) };
}
