import cors from 'cors';
import { HTTP_HEADERS } from './constants.js';

const DEFAULT_BROWSER_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
];

export function createBrowserCorsOptions(): cors.CorsOptions {
  const envOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = envOrigins?.length ? envOrigins : DEFAULT_BROWSER_ORIGINS;

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      HTTP_HEADERS.TRACE_ID,
      HTTP_HEADERS.SERVICE_TOKEN,
      HTTP_HEADERS.SERVICE_NAME,
    ],
  };
}

export function browserCorsMiddleware() {
  return cors(createBrowserCorsOptions());
}
