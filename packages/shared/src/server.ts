import express, { type Express } from 'express';
import cors from 'cors';

export function createServiceApp(serviceName: string): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

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
