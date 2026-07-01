import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { HTTP_HEADERS } from './constants.js';
import type { Logger } from './logger.js';

export type RequestContext = {
  traceId: string;
  userId?: string;
  serviceName?: string;
  logger: Logger;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ctx: RequestContext;
    }
  }
}

export function generateTraceId(): string {
  return randomUUID();
}

export type TraceMiddlewareOptions = {
  logger: Logger;
};

export function traceIdMiddleware({ logger }: TraceMiddlewareOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.header(HTTP_HEADERS.TRACE_ID);
    const traceId = incoming && incoming.trim().length > 0 ? incoming.trim() : generateTraceId();
    const userId = req.header(HTTP_HEADERS.USER_ID) ?? undefined;
    const serviceName = req.header(HTTP_HEADERS.SERVICE_NAME) ?? undefined;

    req.ctx = {
      traceId,
      userId,
      serviceName,
      logger: logger.child({ traceId, userId, serviceName }),
    };

    res.setHeader(HTTP_HEADERS.TRACE_ID, traceId);
    next();
  };
}

export function getTraceId(req: Request): string {
  return req.ctx?.traceId ?? generateTraceId();
}
