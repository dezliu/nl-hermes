# Cross-origin issue fix

- **ID**: `4170da1e-b115-42f0-9d57-14d90582966e`
- **创建时间**: 2026-07-02 12:32
- **模式**: debug
- **Agentic**: False

---

## 用户

管理后台，存在跨域问题，帮我fix
包括：
-  http://localhost:4050/v1/prompts/roles net::ERR_FAILED
- http://localhost:4050/v1/datasources net::ERR_FAILED
- http://localhost:4050/v1/prompts net::ERR_FAILED
帮我修复下，确保没有跨域问题了

## 助手

正在排查管理后台的跨域问题，先定位 4050 端口服务与 CORS 配置。

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"4050|CORS|cors|Access-Control\",\"glob\":\"**/*.{ts,tsx,js,env*}\",\"caseInsensitive\":false,\"headLimit\":80,\"multiline\":false,\"toolCallId\":\"tool_2273ad1d-ea5a-4d27-8a29-521c918d0bd\",\"offset\":0}",
  "params": "{\"pattern\":\"4050|CORS|cors|Access-Control\",\"glob\":\"**/*.{ts,tsx,js,env*}\",\"caseInsensitive\":false}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"globPattern\":\"**/web-admin/**\"}",
  "params": "{\"targetDirectory\":\".\",\"globPattern\":\"**/web-admin/**\"}",
  "result": "{\"directories\":[{\"files\":[{\"relPath\":\"apps/web-admin/package.json\"},{\"relPath\":\"apps/web-admin/next.config.mjs\"},{\"relPath\":\"apps/web-admin/app/layout.tsx\"},{\"relPath\":\"apps/web-admin/lib/api.ts\"},{\"relPath\":\"apps/web-admin/next-env.d.ts\"},{\"relPath\":\"apps/web-admin/tsconfig.json\"},{\"relPath\":\"apps/web-admin/app/prompts/page.tsx\"},{\"relPath\":\"apps/web-admin/app/search-test/page.tsx\"},{\"relPath\":\"apps/web-admin/components/AdminLayout.tsx\"},{\"relPath\":\"apps/web-admin/app/page.test.ts\"},{\"relPath\":\"apps/web-admin/app/datasources/page.tsx\"},{\"relPath\":\"apps/web-admin/app/metadata/page.tsx\"},{\"relPath\":\"apps/web-admin/app/page.tsx\"}],\"totalFiles\":13}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"globPattern\":\"**/gateway*/**\"}",
  "params": "{\"targetDirectory\":\".\",\"globPattern\":\"**/gateway*/**\"}",
  "result": "{\"directories\":[{\"files\":[{\"relPath\":\"apps/gateway-api/package.json\"},{\"relPath\":\"apps/gateway-api/src/index.ts\"},{\"relPath\":\"apps/gateway-api/src/index.test.ts\"},{\"relPath\":\"apps/gateway-api/tsconfig.json\"}],\"totalFiles\":4}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/cors.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/cors.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/cors.ts\"}",
  "result": "{\"contents\":\"import cors from 'cors';\\n\\nconst DEFAULT_BROWSER_ORIGINS = [\\n  'http://localhost:3001',\\n  'http://localhost:3002',\\n  'http://localhost:3003',\\n  'http://127.0.0.1:3001',\\n  'http://127.0.0.1:3002',\\n  'http://127.0.0.1:3003',\\n];\\n\\nexport function createBrowserCorsOptions(): cors.CorsOptions {\\n  const envOrigins = process.env.CORS_ORIGINS?.split(',')\\n    .map((origin) => origin.trim())\\n    .filter(Boolean);\\n\\n  const allowedOrigins = envOrigins?.length ? envOrigins : DEFAULT_BROWSER_ORIGINS;\\n\\n  return {\\n    origin(origin, callback) {\\n      if (!origin || allowedOrigins.includes(origin)) {\\n        callback(null, true);\\n        return;\\n      }\\n      callback(new Error(`CORS blocked origin: ${origin}`));\\n    },\\n    credentials: true,\\n    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],\\n    allowedHeaders: ['Content-Type', 'Authorization', 'x-trace-id'],\\n  };\\n}\\n\\nexport function browserCorsMiddleware() {\\n  return cors(createBrowserCorsOptions());\\n}\\n\",\"totalLinesInFile\":36}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/metadata-service/src/index.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/metadata-service/src/index.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/metadata-service/src/index.ts\"}",
  "result": "{\"contents\":\"import { createMetadataApp } from './app.js';\\n\\nconst PORT = Number(process.env.PORT ?? 4050);\\nconst app = createMetadataApp();\\n\\napp.listen(PORT, () => {\\n  console.log(`[metadata-service] listening on :${PORT}`);\\n});\\n\\nexport { createMetadataApp };\\n\",\"totalLinesInFile\":11}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/lib/api.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/lib/api.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/lib/api.ts\"}",
  "result": "{\"contents\":\"const METADATA_URL = process.env.NEXT_PUBLIC_METADATA_URL ?? 'http://localhost:4050';\\nconst RAG_URL = process.env.NEXT_PUBLIC_RAG_URL ?? 'http://localhost:4020';\\nconst SERVICE_TOKEN = process.env.NEXT_PUBLIC_SERVICE_TOKEN ?? 'hermes-dev-service-token';\\n\\nfunction headers(): HeadersInit {\\n  return {\\n    'Content-Type': 'application/json',\\n    'x-service-token': SERVICE_TOKEN,\\n  };\\n}\\n\\nasync function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {\\n  const res = await fetch(`${base}${path}`, {\\n    ...init,\\n    headers: { ...headers(), ...init?.headers },\\n  });\\n  if (!res.ok) {\\n    const text = await res.text();\\n    throw new Error(text || `HTTP ${res.status}`);\\n  }\\n  return res.json() as Promise<T>;\\n}\\n\\nexport const metaApi = {\\n  listDatasources: () => request<{ items: unknown[] }>(METADATA_URL, '/v1/datasources'),\\n  createDatasource: (body: unknown) =>\\n    request(METADATA_URL, '/v1/datasources', { method: 'POST', body: JSON.stringify(body) }),\\n  testDatasource: (id: string) =>\\n    request(METADATA_URL, `/v1/datasources/${id}/test`, { method: 'POST' }),\\n  syncDatasource: (id: string) =>\\n    request(METADATA_URL, `/v1/datasources/${id}/sync`, { method: 'POST' }),\\n  listTables: (datasourceId: string) =>\\n    request<{ items: unknown[] }>(METADATA_URL, `/v1/datasources/${datasourceId}/tables`),\\n  listRoles: () => request<{ items: unknown[] }>(METADATA_URL, '/v1/prompts/roles'),\\n  listPromptVersions: (roleId?: string) =>\\n    request<{ items: unknown[] }>(\\n      METADATA_URL,\\n      `/v1/prompts${roleId ? `?roleId=${roleId}` : ''}`,\\n    ),\\n  savePrompt: (body: unknown) =>\\n    request(METADATA_URL, '/v1/prompts', { method: 'POST', body: JSON.stringify(body) }),\\n  listSettings: () => request<{ items: unknown[] }>(METADATA_URL, '/v1/settings'),\\n};\\n\\nexport const ragApi = {\\n  retrieve: (body: unknown) =>\\n    request<{ results: { id: string; content: string; score: number; matchReason?: string }[] }>(\\n      RAG_URL,\\n      '/v1/retrieve',\\n      { method: 'POST', body: JSON.stringify(body) },\\n    ),\\n  rebuildIndex: (collection?: string) =>\\n    request(RAG_URL, '/v1/index/rebuild', {\\n      method: 'POST',\\n      body: JSON.stringify({ collection }),\\n    }),\\n};\\n\\nexport function scoreLabel(score: number): '高' | '中' | '低' {\\n  if (score >= 0.6) return '高';\\n  if (score >= 0.35) return '中';\\n  return '低';\\n}\\n\",\"totalLinesInFile\":64}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.env.example\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.env.example\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.env.example\"}",
  "result": "{\"contents\":\"MYSQL_ROOT_PASSWORD=hermes_root\\nMYSQL_DATABASE=hermes\\nMYSQL_USER=hermes\\nMYSQL_PASSWORD=hermes_dev\\n# 宿主机本地开发（make migrate / make dev）使用 localhost:3307\\n# 全栈 Docker（make up）容器内互联使用 mysql:3306\\nMYSQL_HOST=localhost\\nMYSQL_PORT=3307\\nREDIS_URL=redis://localhost:6379\\nQDRANT_URL=http://localhost:6333\\nOPENSEARCH_URL=http://localhost:9200\\nGATEWAY_API_URL=http://localhost:4000\\nMETADATA_SERVICE_URL=http://localhost:4050\\nORCHESTRATOR_URL=http://localhost:4010\\nRAG_SERVICE_URL=http://localhost:4020\\nREPORT_SERVICE_URL=http://localhost:4030\\nEVAL_SERVICE_URL=http://localhost:4040\\n\\n# LLM 厂商：openai | aliyun | zhipu\\nLLM_PROVIDER=openai\\n\\n# OpenAI\\nOPENAI_API_KEY=\\nOPENAI_BASE_URL=https://api.openai.com/v1\\nOPENAI_MODEL=gpt-4o\\n\\n# 阿里云百炼（OpenAI 兼容模式）\\nALIYUN_API_KEY=\\nALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1\\nALIYUN_MODEL=qwen-max\\n\\n# 智谱 AI（OpenAI 兼容接口）\\nZHIPU_API_KEY=\\nZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4\\nZHIPU_MODEL=glm-4-plus\\n\\nLANGFUSE_PUBLIC_KEY=\\nLANGFUSE_SECRET_KEY=\\nLANGFUSE_HOST=http://langfuse:3000\\nJWT_SECRET=change-me-in-production\\nSERVICE_TOKEN=hermes-dev-service-token\\n# 浏览器前端跨域白名单（逗号分隔）；本地默认允许 3001-3003\\nCORS_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:3003\\nNEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql\\n\",\"totalLinesInFile\":45}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/metadata-service/src/app.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/metadata-service/src/app.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/metadata-service/src/app.ts\"}",
  "result": "{\"contents\":\"import type { NextFunction, Request, Response } from 'express';\\nimport { createServiceApp, createLogger } from '@hermes/shared';\\nimport { bindMetaDb } from '@hermes/orm-schemas';\\nimport { createRepositories } from './repositories/index.js';\\nimport { DatasourceService } from './services/datasource-app-service.js';\\nimport { MetaService } from './services/meta-service.js';\\nimport { PromptService } from './services/prompt-service.js';\\nimport { SettingsService } from './services/settings-service.js';\\nimport { TemplateService } from './services/template-service.js';\\nimport { mountRoutes } from './routes/index.js';\\n\\nexport function createMetadataApp(options: { enableServiceAuth?: boolean; serviceToken?: string } = {}) {\\n  const logger = createLogger({ service: 'metadata-service' });\\n  bindMetaDb();\\n\\n  const repos = createRepositories(logger);\\n  const ctx = {\\n    datasource: new DatasourceService(repos, logger),\\n    meta: new MetaService(repos, logger),\\n    prompt: new PromptService(repos, logger),\\n    settings: new SettingsService(repos, logger),\\n    template: new TemplateService(repos, logger),\\n  };\\n\\n  const app = createServiceApp('metadata-service', options);\\n  mountRoutes(app, ctx);\\n\\n  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {\\n    logger.error('request.error', { err: err.message });\\n    res.status(500).json({ error: 'internal_error', message: err.message });\\n  });\\n\\n  return app;\\n}\\n\",\"totalLinesInFile\":35}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/package.json\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/package.json\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/package.json\"}",
  "result": "{\"contents\":\"{\\n  \\\"name\\\": \\\"@hermes/web-admin\\\",\\n  \\\"version\\\": \\\"0.1.0\\\",\\n  \\\"private\\\": true,\\n  \\\"scripts\\\": {\\n    \\\"dev\\\": \\\"next dev -p 3002\\\",\\n    \\\"build\\\": \\\"next build\\\",\\n    \\\"start\\\": \\\"next start -p 3002\\\",\\n    \\\"lint\\\": \\\"next lint\\\",\\n    \\\"test\\\": \\\"vitest run\\\",\\n    \\\"clean\\\": \\\"rm -rf .next\\\"\\n  },\\n  \\\"dependencies\\\": {\\n    \\\"@hermes/ui-shared\\\": \\\"workspace:*\\\",\\n    \\\"next\\\": \\\"^14.2.21\\\",\\n    \\\"react\\\": \\\"^18.3.1\\\",\\n    \\\"react-dom\\\": \\\"^18.3.1\\\",\\n    \\\"antd\\\": \\\"^5.22.6\\\",\\n    \\\"@apollo/client\\\": \\\"^3.12.1\\\",\\n    \\\"graphql\\\": \\\"^16.10.0\\\"\\n  },\\n  \\\"devDependencies\\\": {\\n    \\\"@types/node\\\": \\\"^22.10.2\\\",\\n    \\\"@types/react\\\": \\\"^18.3.18\\\",\\n    \\\"@types/react-dom\\\": \\\"^18.3.5\\\",\\n    \\\"typescript\\\": \\\"^5.7.2\\\",\\n    \\\"vitest\\\": \\\"^2.1.8\\\"\\n  }\\n}\\n\",\"totalLinesInFile\":30}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{}",
  "result": "{\"error\":{\"error\":\"Glob pattern \\\"**/*\\\" matches every file and is not allowed. Use a more specific glob or no glob.\"}}",
  "status": "error"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/server.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/server.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/server.ts\"}",
  "result": "{\"contents\":\"import express, { type Express, type Router } from 'express';\\nimport { serviceAuthMiddleware, type ServiceAuthOptions } from './auth.js';\\nimport { browserCorsMiddleware } from './cors.js';\\nimport { loadEnv } from './load-env.js';\\nimport { createLogger } from './logger.js';\\nimport { requestLoggingMiddleware } from './middleware.js';\\nimport { traceIdMiddleware } from './trace.js';\\n\\nexport type ServiceAppOptions = {\\n  /** Additional paths exempt from service token validation */\\n  publicPaths?: string[];\\n  /** Override SERVICE_TOKEN env; pass empty string to disable auth */\\n  serviceToken?: string;\\n  /** Disable service-to-service auth middleware */\\n  enableServiceAuth?: boolean;\\n};\\n\\nexport function createServiceApp(serviceName: string, options: ServiceAppOptions = {}): Express {\\n  loadEnv();\\n  const app = express();\\n  const logger = createLogger({ service: serviceName });\\n\\n  app.use(browserCorsMiddleware());\\n  app.use(express.json());\\n  app.use(traceIdMiddleware({ logger }));\\n  app.use(requestLoggingMiddleware());\\n\\n  const authOptions: ServiceAuthOptions = {\\n    serviceToken: options.serviceToken,\\n    publicPaths: options.publicPaths,\\n  };\\n  if (options.enableServiceAuth !== false) {\\n    app.use(serviceAuthMiddleware(authOptions));\\n  }\\n\\n  app.get('/health', (_req, res) => {\\n    res.json({\\n      status: 'ok',\\n      service: serviceName,\\n      timestamp: new Date().toISOString(),\\n    });\\n  });\\n\\n  app.get('/ready', (_req, res) => {\\n    res.json({ ready: true, service: serviceName });\\n  });\\n\\n  return app;\\n}\\n\\n/** Mount authenticated internal API routes under a prefix */\\nexport function createInternalRouter(): Router {\\n  return express.Router();\\n}\\n\\nexport { createLogger } from './logger.js';\\n\",\"totalLinesInFile\":57}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/gateway-api/src/index.ts\",\"offset\":280,\"limit\":80}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/gateway-api/src/index.ts\",\"offset\":280,\"limit\":80,\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/gateway-api/src/index.ts\"}",
  "result": "{\"contents\":\"    submitMessageFeedback: (_: unknown, { input }: { input: Record<string, unknown> }) =>\\n      orchPost<{ ok: boolean }>(`/v1/messages/${input.messageId}/feedback`, input).then((r) => r.ok),\\n    renameConversation: (_: unknown, { input }: { input: Record<string, unknown> }) =>\\n      orchPatch<{ item: unknown }>(`/v1/conversations/${input.conversationId}`, input).then((r) => r.item),\\n    deleteConversation: (_: unknown, { input }: { input: Record<string, unknown> }) =>\\n      orchDelete<{ ok: boolean }>(`/v1/conversations/${input.conversationId}`, input).then((r) => r.ok),\\n  },\\n};\\n\\nasync function main() {\\n  const app = createServiceApp('gateway-api', { publicPaths: ['/graphql', '/api/chat/stream'] });\\n  const server = new ApolloServer({ typeDefs, resolvers });\\n  await server.start();\\n\\n  const corsMiddleware = browserCorsMiddleware();\\n\\n  // #region agent log\\n  app.use('/graphql', (req, _res, next) => {\\n    fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {\\n      method: 'POST',\\n      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'be006e' },\\n      body: JSON.stringify({\\n        sessionId: 'be006e',\\n        runId: 'cors-debug',\\n        hypothesisId: 'B',\\n        location: 'gateway-api/index.ts:graphql-entry',\\n        message: 'graphql request received',\\n        data: { method: req.method, origin: req.headers.origin ?? null, path: req.path },\\n        timestamp: Date.now(),\\n      }),\\n    }).catch(() => {});\\n    next();\\n  });\\n  // #endregion\\n\\n  app.use(\\n    '/graphql',\\n    corsMiddleware,\\n    express.json(),\\n    expressMiddleware(server) as unknown as express.RequestHandler,\\n  );\\n\\n  app.options('/graphql', corsMiddleware);\\n\\n  app.post('/api/chat/stream', corsMiddleware, express.json(), async (req, res) => {\\n    const body = req.body as Record<string, unknown>;\\n    const upstream = await fetch(`${ORCHESTRATOR_URL}/v1/chat/stream`, {\\n      method: 'POST',\\n      headers: {\\n        'Content-Type': 'application/json',\\n        ...withServiceAuth({}, 'gateway-api'),\\n        [HTTP_HEADERS.TRACE_ID]: (req.headers[HTTP_HEADERS.TRACE_ID.toLowerCase()] as string) ?? '',\\n      },\\n      body: JSON.stringify(body),\\n    });\\n\\n    res.setHeader('Content-Type', 'text/event-stream');\\n    res.setHeader('Cache-Control', 'no-cache');\\n    res.setHeader('Connection', 'keep-alive');\\n\\n    if (!upstream.ok || !upstream.body) {\\n      res.status(upstream.status).json({ error: 'stream_failed' });\\n      return;\\n    }\\n\\n    const reader = upstream.body.getReader();\\n    const decoder = new TextDecoder();\\n    while (true) {\\n      const { done, value } = await reader.read();\\n      if (done) break;\\n      res.write(decoder.decode(value));\\n    }\\n    res.end();\\n  });\\n\\n  app.options('/api/chat/stream', corsMiddleware);\\n\\n  app.listen(PORT, () => {\\n    console.log(`[gateway-api] GraphQL on :${PORT}/graphql, SSE on :${PORT}/api/chat/stream`);\\n  });\",\"totalLinesInFile\":363}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

metadata-service 已使用 createServiceApp，其中包含 browserCorsMiddleware()。正在确认该中间件是否已正确处理跨域请求。
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/auth.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/auth.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/auth.ts\"}",
  "result": "{\"contents\":\"import type { NextFunction, Request, Response } from 'express';\\nimport { HTTP_HEADERS, PUBLIC_SERVICE_PATHS } from './constants.js';\\n\\nexport type ServiceAuthOptions = {\\n  /** Shared secret for inter-service calls; disabled when empty */\\n  serviceToken?: string;\\n  /** Additional paths to skip auth (e.g. GraphQL playground) */\\n  publicPaths?: string[];\\n  /** Path prefix requiring service token; default `/v1` */\\n  protectedPrefix?: string;\\n};\\n\\nfunction isPublicPath(path: string, publicPaths: string[]): boolean {\\n  return PUBLIC_SERVICE_PATHS.some((p) => path === p || path.startsWith(`${p}/`))\\n    || publicPaths.some((p) => path === p || path.startsWith(`${p}/`));\\n}\\n\\nfunction isProtectedPath(path: string, protectedPrefix: string): boolean {\\n  return path === protectedPrefix || path.startsWith(`${protectedPrefix}/`);\\n}\\n\\nexport function serviceAuthMiddleware(options: ServiceAuthOptions = {}) {\\n  const serviceToken = options.serviceToken ?? process.env.SERVICE_TOKEN ?? '';\\n  const publicPaths = options.publicPaths ?? [];\\n  const protectedPrefix = options.protectedPrefix ?? '/v1';\\n\\n  return (req: Request, res: Response, next: NextFunction): void => {\\n    if (!serviceToken) {\\n      next();\\n      return;\\n    }\\n\\n    if (isPublicPath(req.path, publicPaths) || !isProtectedPath(req.path, protectedPrefix)) {\\n      next();\\n      return;\\n    }\\n\\n    const token = req.header(HTTP_HEADERS.SERVICE_TOKEN);\\n    if (token !== serviceToken) {\\n      req.ctx?.logger.warn('auth.service.rejected', {\\n        path: req.path,\\n        method: req.method,\\n      });\\n      res.status(401).json({\\n        error: {\\n          code: 'UNAUTHORIZED_SERVICE',\\n          message: 'Invalid or missing service token',\\n        },\\n        traceId: req.ctx?.traceId,\\n      });\\n      return;\\n    }\\n\\n    next();\\n  };\\n}\\n\\nexport function getServiceAuthHeaders(serviceName?: string): Record<string, string> {\\n  const token = process.env.SERVICE_TOKEN;\\n  const headers: Record<string, string> = {};\\n  if (token) {\\n    headers[HTTP_HEADERS.SERVICE_TOKEN] = token;\\n  }\\n  if (serviceName) {\\n    headers[HTTP_HEADERS.SERVICE_NAME] = serviceName;\\n  }\\n  return headers;\\n}\\n\\nexport function withServiceAuth(\\n  headers: Record<string, string> = {},\\n  serviceName?: string,\\n): Record<string, string> {\\n  return { ...headers, ...getServiceAuthHeaders(serviceName) };\\n}\\n\",\"totalLinesInFile\":76}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{}",
  "result": "{\"error\":{\"error\":\"Glob pattern \\\"**/*\\\" matches every file and is not allowed. Use a more specific glob or no glob.\"}}",
  "status": "error"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"x-service-token|allowedHeaders|SERVICE_TOKEN\",\"glob\":\"**/*.{ts,tsx}\",\"caseInsensitive\":false,\"multiline\":false,\"toolCallId\":\"tool_ef117415-6d9a-4057-8e94-3bf963dac21\",\"offset\":0}",
  "params": "{\"pattern\":\"x-service-token|allowedHeaders|SERVICE_TOKEN\",\"glob\":\"**/*.{ts,tsx}\",\"caseInsensitive\":false}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/app/prompts/page.tsx\",\"limit\":50}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/app/prompts/page.tsx\",\"limit\":50,\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/app/prompts/page.tsx\"}",
  "result": "{\"contents\":\"'use client';\\n\\nimport { useEffect, useState } from 'react';\\nimport { Button, Form, Input, Select, Space, Table, message } from 'antd';\\nimport { AdminLayout } from '../../components/AdminLayout';\\nimport { metaApi } from '../../lib/api';\\n\\ntype Role = { id: string; code: string; name: string };\\ntype PromptVersion = {\\n  id: string;\\n  roleId?: string;\\n  persona: string;\\n  constraints: string;\\n  version: number;\\n  isActive: boolean;\\n};\\n\\nexport default function PromptsPage() {\\n  const [roles, setRoles] = useState<Role[]>([]);\\n  const [roleId, setRoleId] = useState<string>('default');\\n  const [versions, setVersions] = useState<PromptVersion[]>([]);\\n  const [form] = Form.useForm();\\n\\n  const loadVersions = async (rid?: string) => {\\n    try {\\n      const data = await metaApi.listPromptVersions(rid === 'default' ? undefined : rid);\\n      setVersions(data.items as PromptVersion[]);\\n      const active = (data.items as PromptVersion[]).find((v) => v.isActive);\\n      if (active) form.setFieldsValue({ persona: active.persona, constraints: active.constraints });\\n    } catch {\\n      message.error('加载 Prompt 失败');\\n    }\\n  };\\n\\n  useEffect(() => {\\n    metaApi.listRoles().then((d) => setRoles(d.items as Role[])).catch(() => undefined);\\n    loadVersions();\\n  }, []);\\n\\n  useEffect(() => { loadVersions(roleId); }, [roleId]);\\n\\n  const onSave = async () => {\\n    const values = await form.validateFields();\\n    try {\\n      await metaApi.savePrompt({\\n        roleId: roleId === 'default' ? null : roleId,\\n        ...values,\\n      });\\n      message.success('已保存新版本');\\n      loadVersions(roleId);\",\"totalLinesInFile\":96}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/app/datasources/page.tsx\",\"limit\":50}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/app/datasources/page.tsx\",\"limit\":50,\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/app/datasources/page.tsx\"}",
  "result": "{\"contents\":\"'use client';\\n\\nimport { useEffect, useState } from 'react';\\nimport { Button, Form, Input, InputNumber, Modal, Space, Table, Tag, message } from 'antd';\\nimport { AdminLayout } from '../../components/AdminLayout';\\nimport { metaApi } from '../../lib/api';\\n\\ntype Datasource = {\\n  id: string;\\n  name: string;\\n  host: string;\\n  port: number;\\n  databaseName: string;\\n  username: string;\\n  connectionStatus: string;\\n  lastSyncedAt?: string;\\n};\\n\\nexport default function DatasourcesPage() {\\n  const [items, setItems] = useState<Datasource[]>([]);\\n  const [loading, setLoading] = useState(false);\\n  const [open, setOpen] = useState(false);\\n  const [form] = Form.useForm();\\n\\n  const load = async () => {\\n    setLoading(true);\\n    try {\\n      const data = await metaApi.listDatasources();\\n      setItems(data.items as Datasource[]);\\n    } catch (err) {\\n      message.error(err instanceof Error ? err.message : '加载失败');\\n    } finally {\\n      setLoading(false);\\n    }\\n  };\\n\\n  useEffect(() => { load(); }, []);\\n\\n  const onCreate = async () => {\\n    const values = await form.validateFields();\\n    try {\\n      await metaApi.createDatasource(values);\\n      message.success('创建成功');\\n      setOpen(false);\\n      form.resetFields();\\n      load();\\n    } catch (err) {\\n      message.error(err instanceof Error ? err.message : '创建失败');\\n    }\\n  };\",\"totalLinesInFile\":118}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

已定位跨域问题的根因。浏览器请求携带了 `x-service-token` 请求头，但服务端 CORS 的 `allowedHeaders` 未包含该字段，导致请求被拦截。
</details>

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"globPattern\":\"**/cors*.test.ts\"}",
  "params": "{\"targetDirectory\":\".\",\"globPattern\":\"**/cors*.test.ts\"}",
  "result": "{\"directories\":[{}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/next.config.mjs\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/next.config.mjs\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/next.config.mjs\"}",
  "result": "{\"contents\":\"/** @type {import('next').NextConfig} */\\nconst nextConfig = {\\n  output: 'standalone',\\n  basePath: '/admin',\\n  transpilePackages: ['@hermes/ui-shared'],\\n  async redirects() {\\n    return [\\n      {\\n        source: '/',\\n        destination: '/admin',\\n        permanent: false,\\n        basePath: false,\\n      },\\n    ];\\n  },\\n};\\nexport default nextConfig;\\n\",\"totalLinesInFile\":18}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/metadata-service/src/index.test.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/metadata-service/src/index.test.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/metadata-service/src/index.test.ts\"}",
  "result": "{\"contents\":\"import { describe, it, expect } from 'vitest';\\nimport request from 'supertest';\\nimport { HTTP_HEADERS } from '@hermes/shared';\\nimport { createMetadataApp } from './app.js';\\n\\ndescribe('metadata-service API', () => {\\n  const app = createMetadataApp({ enableServiceAuth: false });\\n\\n  it('exposes health endpoint', async () => {\\n    const res = await request(app).get('/health');\\n    expect(res.status).toBe(200);\\n    expect(res.body.service).toBe('metadata-service');\\n  });\\n\\n  it('lists datasources', async () => {\\n    const res = await request(app).get('/v1/datasources');\\n    expect([200, 500]).toContain(res.status);\\n  });\\n\\n  it('protects routes with service token when enabled', async () => {\\n    const secured = createMetadataApp({ serviceToken: 'dev-token' });\\n    const denied = await request(secured).get('/v1/datasources');\\n    expect(denied.status).toBe(401);\\n\\n    const allowed = await request(secured)\\n      .get('/v1/datasources')\\n      .set(HTTP_HEADERS.SERVICE_TOKEN, 'dev-token');\\n    expect([200, 500]).toContain(allowed.status);\\n  });\\n});\\n\",\"totalLinesInFile\":31}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

已定位到问题根源：web-admin 页面是客户端组件，直接在浏览器中请求 localhost:4050 的接口，导致跨域错误。
</details>

先用 curl 模拟预检请求，并检查 metadata-service 是否在运行。

<details>
<summary>Tool: run_terminal_command_v2</summary>

```json
{
  "params": "{\"command\":\"curl -s -i -X OPTIONS \\\"http://localhost:4050/v1/datasources\\\" -H \\\"Origin: http://localhost:3002\\\" -H \\\"Access-Control-Request-Method: GET\\\" -H \\\"Access-Control-Request-Headers: content-type,x-service-token\\\" 2>&1 | head -30\",\"cwd\":\"\",\"options\":{\"timeout\":30000},\"parsingResult\":{\"executableCommands\":[{\"name\":\"curl\",\"args\":[{\"type\":\"word\",\"value\":\"-s\"},{\"type\":\"word\",\"value\":\"-i\"},{\"type\":\"word\",\"value\":\"-X\"},{\"type\":\"word\",\"value\":\"OPTIONS\"},{\"type\":\"string\",\"value\":\"\\\"http://localhost:4050/v1/datasources\\\"\"},{\"type\":\"word\",\"value\":\"-H\"},{\"type\":\"string\",\"value\":\"\\\"Origin: http://localhost:3002\\\"\"},{\"type\":\"word\",\"value\":\"-H\"},{\"type\":\"string\",\"value\":\"\\\"Access-Control-Request-Method: GET\\\"\"},{\"type\":\"word\",\"value\":\"-H\"},{\"type\":\"string\",\"value\":\"\\\"Access-Control-Request-Headers: content-type,x-service-token\\\"\"}],\"fullText\":\"curl -s -i -X OPTIONS \\\"http://localhost:4050/v1/datasources\\\" -H \\\"Origin: http://localhost:3002\\\" -H \\\"Access-Control-Request-Method: GET\\\" -H \\\"Access-Control-Request-Headers: content-type,x-service-token\\\"\"},{\"name\":\"head\",\"args\":[{\"type\":\"number\",\"value\":\"-30\"}],\"fullText\":\"head -30\"}],\"hasRedirects\":true,\"allRedirectsAreDevNull\":true,\"redirects\":[{\"operator\":\">&\",\"destinationFds\":[2],\"targetNodeType\":\"number\",\"targetText\":\"1\"}]},\"requestedSandboxPolicy\":{\"type\":\"TYPE_WORKSPACE_READWRITE\",\"networkAccess\":false,\"additionalReadwritePaths\":[\"/Users/dezliu/Documents/mine/repo/nl-hermes\"],\"enableSharedBuildCache\":true},\"commandDescription\":\"Simulate CORS preflight against metadata-service\"}",
  "result": "{\"output\":\"HTTP/1.1 204 No Content\\r\\nX-Powered-By: Express\\r\\nAccess-Control-Allow-Origin: http://localhost:3002\\r\\nVary: Origin\\r\\nAccess-Control-Allow-Credentials: true\\r\\nAccess-Control-Allow-Methods: GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS\\r\\nAccess-Control-Allow-Headers: Content-Type,Authorization,x-trace-id\\r\\nContent-Length: 0\\r\\nDate: Thu, 02 Jul 2026 04:33:14 GMT\\r\\nConnection: keep-alive\\r\\nKeep-Alive: timeout=5\\r\\n\\r\\n\",\"rejected\":false,\"notInterrupted\":true}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"targetDirectory\":\"/Users/dezliu/.cursor/projects/Users-dezliu-Documents-mine-repo-nl-hermes\",\"globPattern\":\"**/terminals/*.txt\"}",
  "params": "{\"targetDirectory\":\"/Users/dezliu/.cursor/projects/Users-dezliu-Documents-mine-repo-nl-hermes\",\"globPattern\":\"**/terminals/*.txt\"}",
  "result": "{\"directories\":[{\"absPath\":\"/Users/dezliu/.cursor/projects/Users-dezliu-Documents-mine-repo-nl-hermes\",\"files\":[{\"relPath\":\"terminals/327310.txt\"},{\"relPath\":\"terminals/758715.txt\"},{\"relPath\":\"terminals/138994.txt\"},{\"relPath\":\"terminals/27948.txt\"},{\"relPath\":\"terminals/865221.txt\"},{\"relPath\":\"terminals/418242.txt\"},{\"relPath\":\"terminals/577929.txt\"},{\"relPath\":\"terminals/106990.txt\"},{\"relPath\":\"terminals/404118.txt\"},{\"relPath\":\"terminals/32968.txt\"},{\"relPath\":\"terminals/727678.txt\"}],\"totalFiles\":11}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

已获取到运行时证据。

已确认跨域拦截原因：预检响应允许的请求头中缺少 `x-service-token`，浏览器因此拒绝请求。已排除来源不在白名单的假设。

正在验证 OPTIONS 预检请求是否会被服务认证拦截。该请求通常不携带认证头，但 `/v1` 路径受保护，需确认认证中间件是否会阻断预检。
</details>

已用 curl 确认：`Access-Control-Allow-Headers` 未包含 `x-service-token`。正在添加调试日志并修复。

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/constants.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/constants.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/constants.ts\"}",
  "result": "{\"contents\":\"/** HTTP header names used across Hermes services */\\nexport const HTTP_HEADERS = {\\n  TRACE_ID: 'x-trace-id',\\n  SERVICE_TOKEN: 'x-service-token',\\n  SERVICE_NAME: 'x-service-name',\\n  USER_ID: 'x-user-id',\\n} as const;\\n\\nexport const SERVICE_PORTS = {\\n  GATEWAY_API: 4000,\\n  ORCHESTRATOR: 4010,\\n  RAG_SERVICE: 4020,\\n  REPORT_SERVICE: 4030,\\n  EVAL_SERVICE: 4040,\\n  METADATA_SERVICE: 4050,\\n  WEB_USER: 3001,\\n  WEB_ADMIN: 3002,\\n  WEB_MONITOR: 3003,\\n} as const;\\n\\nexport const QDRANT_COLLECTIONS = {\\n  METADATA: 'hermes_metadata',\\n  BUSINESS: 'hermes_business',\\n  TEMPLATES: 'hermes_templates',\\n} as const;\\n\\nexport const OPENSEARCH_INDICES = {\\n  METADATA: 'hermes_metadata',\\n  BUSINESS: 'hermes_business',\\n  TEMPLATES: 'hermes_templates',\\n} as const;\\n\\n/** Paths exempt from service-to-service token validation */\\nexport const PUBLIC_SERVICE_PATHS = ['/health', '/ready'] as const;\\n\",\"totalLinesInFile\":35}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"browserCors|cors\",\"glob\":\"packages/shared/**/*.test.ts\",\"caseInsensitive\":false,\"multiline\":false,\"toolCallId\":\"tool_f58c7475-bdd3-4257-ae7f-80b465228bb\",\"offset\":0}",
  "params": "{\"pattern\":\"browserCors|cors\",\"glob\":\"packages/shared/**/*.test.ts\",\"caseInsensitive\":false}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

准备修改 cors.ts，加入 HTTP_HEADERS 常量中的服务端响应头。同时会添加 CORS 测试和调试日志，然后验证修复效果。
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/cors.ts\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.3342af20c3ff5d4c9aff141e6da1b0d26c33d92d0742b77fbc21fa3b58033247\",\"afterContentId\":\"composer.content.15acfa3ef8820c82508b67b2e0322b54861e56c748aa25b85f6ffb8ab4309ba9\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/cors.ts\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.15acfa3ef8820c82508b67b2e0322b54861e56c748aa25b85f6ffb8ab4309ba9\",\"afterContentId\":\"composer.content.9895c69a240fc20639aa1662e748129bcd6f87964ca3b95e6221835e02a424b6\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/server.ts\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.2e632cd179aa2f67783eedae4c55870432d2b0cec1effbf88318867755e30b6a\",\"afterContentId\":\"composer.content.c985d80e13ab0a7541afb20d7510fc7aaa590aaf71a4af5f31d6dcc753ca5d3a\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: edit_file_v2</summary>

```json
{
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/cors.test.ts\",\"noCodeblock\":true,\"cloudAgentEdit\":false}",
  "result": "{\"beforeContentId\":\"composer.content.e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\"afterContentId\":\"composer.content.04fb85b7d5e51f14daea4b665bbf97d36939cab256a07261c7d24fb0ff00d032\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: delete_file</summary>

```json
{
  "rawArgs": "{}",
  "params": "{\"relativeWorkspacePath\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/.cursor/debug-4170da.log\"}",
  "result": "{}",
  "status": "error"
}
```
</details>

<details>
<summary>Tool: run_terminal_command_v2</summary>

```json
{
  "params": "{\"command\":\"cd /Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared && pnpm exec vitest run src/cors.test.ts 2>&1\",\"cwd\":\"\",\"options\":{\"timeout\":30000},\"parsingResult\":{\"executableCommands\":[{\"name\":\"cd\",\"args\":[{\"type\":\"word\",\"value\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared\"}],\"fullText\":\"cd /Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared\"},{\"name\":\"pnpm\",\"args\":[{\"type\":\"word\",\"value\":\"exec\"},{\"type\":\"word\",\"value\":\"vitest\"},{\"type\":\"word\",\"value\":\"run\"},{\"type\":\"word\",\"value\":\"src/cors.test.ts\"}],\"fullText\":\"pnpm exec vitest run src/cors.test.ts\"}],\"hasRedirects\":true,\"allRedirectsAreDevNull\":true,\"redirects\":[{\"operator\":\">&\",\"destinationFds\":[2],\"targetNodeType\":\"number\",\"targetText\":\"1\"}]},\"requestedSandboxPolicy\":{\"type\":\"TYPE_WORKSPACE_READWRITE\",\"networkAccess\":false,\"additionalReadwritePaths\":[\"/Users/dezliu/Documents/mine/repo/nl-hermes\"],\"enableSharedBuildCache\":true},\"commandDescription\":\"Run CORS unit tests\"}",
  "result": "{\"output\":\"\\n RUN  v2.1.9 /Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared\\n\\n ✓ src/cors.test.ts (2 tests) 8ms\\n\\n Test Files  1 passed (1)\\n      Tests  2 passed (2)\\n   Start at  12:33:29\\n   Duration  297ms (transform 53ms, setup 0ms, collect 111ms, tests 8ms, environment 0ms, prepare 37ms)\\n\\n\",\"rejected\":false,\"notInterrupted\":true}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_lints</summary>

```json
{
  "rawArgs": "{\"paths\":[\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/cors.ts\",\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/server.ts\"]}",
  "params": "{\"paths\":[\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/cors.ts\",\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/shared/src/server.ts\"]}",
  "result": "{}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

测试已通过。但运行在 4050 端口的 metadata-service 可能仍是旧代码，建议重新构建或重启服务以确认修复生效。
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"metadata|dev\",\"glob\":\"justfile\",\"caseInsensitive\":false,\"headLimit\":30,\"multiline\":false,\"toolCallId\":\"tool_b6f02314-d99f-49ea-90eb-87e8ff5e822\",\"offset\":0}",
  "params": "{\"pattern\":\"metadata|dev\",\"glob\":\"justfile\",\"caseInsensitive\":false}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: glob_file_search</summary>

```json
{
  "rawArgs": "{\"globPattern\":\"{justfile,Makefile,makefile}\"}",
  "params": "{\"targetDirectory\":\".\",\"globPattern\":\"{justfile,Makefile,makefile}\"}",
  "result": "{\"directories\":[{\"files\":[{\"relPath\":\"Makefile\"}],\"totalFiles\":1}]}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"dev|metadata\",\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/Makefile\",\"caseInsensitive\":false,\"multiline\":false,\"toolCallId\":\"tool_3f35d7cf-ea19-4b07-b560-d3c2b6fd3b9\",\"offset\":0}",
  "params": "{\"pattern\":\"dev|metadata\",\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/Makefile\",\"caseInsensitive\":false}",
  "status": "completed"
}
```
</details>

已定位根因并完成修复。说明如下。

## 假设与验证

| 假设 | 结论 | 证据 |
|------|------|------|
| **A. 预检未放行 `x-service-token`** | **已确认** | curl 预检返回 `Access-Control-Allow-Headers: Content-Type,Authorization,x-trace-id`，不含 `x-service-token`；管理后台 `api.ts` 会发送该头 |
| B. 管理后台 origin 不在白名单 | 已排除 | 预检返回 `Access-Control-Allow-Origin: http://localhost:3002` |
| C. metadata-service 未启动 | 已排除 | 预检返回 HTTP 204 |
| D. OPTIONS 被 service auth 拦截 | 已排除 | 预检正常返回 204 |
| E. credentials 配置问题 | 已排除 | `Access-Control-Allow-Credentials: true` 且 origin 匹配 |

**根因**：管理后台（`:3002`）在浏览器里直接请求 `http://localhost:4050`，并携带自定义头 `x-service-token`。这会触发 CORS 预检，但服务端 `allowedHeaders` 未包含该头，浏览器因此拦截请求，控制台表现为 `net::ERR_FAILED`。

## 修复内容

在 `packages/shared/src/cors.ts` 的 `allowedHeaders` 中补充：

- `x-service-token`（管理后台鉴权）
- `x-service-name`（服务间调用，一并放行）

所有通过 `createServiceApp` / `browserCorsMiddleware` 启动的服务（含 metadata-service `:4050`）都会生效。

## 验证

- 新增 `packages/shared/src/cors.test.ts`，预检与 GET 测试均通过
- 调试日志已加在 `packages/shared/src/server.ts`（验证通过后再移除）

<reproduction_steps>
1. 停止当前 `make dev`（或单独重启 metadata-service），再重新启动，使 `@hermes/shared` 的 CORS 改动生效
2. 打开管理后台 http://localhost:3002/admin
3. 分别访问「数据源管理」和「Prompt 管理」页面，确认 `/v1/datasources`、`/v1/prompts/roles`、`/v1/prompts` 不再报跨域错误且数据能正常加载
4. Press Proceed/Mark as fixed when done.
</reproduction_steps>
