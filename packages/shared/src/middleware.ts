import type { NextFunction, Request, Response } from 'express';

export function requestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on('finish', () => {
      req.ctx?.logger.info('http.request.completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      });
    });

    next();
  };
}
