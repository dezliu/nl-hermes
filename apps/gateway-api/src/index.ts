import express from 'express';
import { createServiceApp, HTTP_HEADERS, withServiceAuth, browserCorsMiddleware } from '@hermes/shared';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

const PORT = Number(process.env.PORT ?? 4000);
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL ?? 'http://localhost:4010';

const typeDefs = `#graphql
  enum GenerationMode { sql report }

  type ChatSession {
    runId: ID!
    conversationId: ID!
    checkpointId: ID!
  }

  type Query {
    health: String!
    version: String!
  }

  input StartChatInput {
    userId: ID!
    roleId: ID
    conversationId: ID
    query: String!
    mode: GenerationMode!
  }

  input ContinueConversationInput {
    userId: ID!
    roleId: ID
    conversationId: ID!
    checkpointId: ID!
    query: String!
    mode: GenerationMode!
  }

  input CancelGenerationInput {
    userId: ID!
    runId: ID!
    conversationId: ID!
  }

  type Mutation {
    startChat(input: StartChatInput!): ChatSession!
    continueConversation(input: ContinueConversationInput!): ChatSession!
    cancelGeneration(input: CancelGenerationInput!): Boolean!
  }
`;

async function orchPost<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const url = `${ORCHESTRATOR_URL}${path}`;
  // #region agent log
  const authHeaders = withServiceAuth(headers, 'gateway-api');
  fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'be006e' },
    body: JSON.stringify({
      sessionId: 'be006e',
      runId: 'orch-post',
      hypothesisId: 'C',
      location: 'gateway-api/index.ts:orchPost',
      message: 'orchestrator request',
      data: { url, hasServiceToken: Boolean(authHeaders['x-service-token']) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'be006e' },
      body: JSON.stringify({
        sessionId: 'be006e',
        runId: 'orch-post',
        hypothesisId: 'A',
        location: 'gateway-api/index.ts:orchPost-catch',
        message: 'orchestrator fetch failed',
        data: { url, error: err instanceof Error ? err.message : String(err) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw err;
  }
  if (!res.ok) {
    const text = await res.text();
    // #region agent log
    fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'be006e' },
      body: JSON.stringify({
        sessionId: 'be006e',
        runId: 'orch-post',
        hypothesisId: 'B',
        location: 'gateway-api/index.ts:orchPost-error',
        message: 'orchestrator non-ok response',
        data: { url, status: res.status, body: text.slice(0, 200) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw new Error(text || `orchestrator ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const resolvers = {
  Query: {
    health: () => 'ok',
    version: () => '0.1.0',
  },
  Mutation: {
    startChat: (_: unknown, { input }: { input: Record<string, unknown> }) =>
      orchPost('/v1/chat/start', input),
    continueConversation: (_: unknown, { input }: { input: Record<string, unknown> }) =>
      orchPost('/v1/chat/continue', input),
    cancelGeneration: (_: unknown, { input }: { input: Record<string, unknown> }) =>
      orchPost<{ ok: boolean }>('/v1/chat/cancel', input).then((r) => r.ok),
  },
};

async function main() {
  const app = createServiceApp('gateway-api', { publicPaths: ['/graphql', '/api/chat/stream'] });
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  const corsMiddleware = browserCorsMiddleware();

  // #region agent log
  app.use('/graphql', (req, _res, next) => {
    fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'be006e' },
      body: JSON.stringify({
        sessionId: 'be006e',
        runId: 'cors-debug',
        hypothesisId: 'B',
        location: 'gateway-api/index.ts:graphql-entry',
        message: 'graphql request received',
        data: { method: req.method, origin: req.headers.origin ?? null, path: req.path },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    next();
  });
  // #endregion

  app.use(
    '/graphql',
    corsMiddleware,
    express.json(),
    expressMiddleware(server) as unknown as express.RequestHandler,
  );

  app.options('/graphql', corsMiddleware);

  app.post('/api/chat/stream', corsMiddleware, express.json(), async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const upstream = await fetch(`${ORCHESTRATOR_URL}/v1/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...withServiceAuth({}, 'gateway-api'),
        [HTTP_HEADERS.TRACE_ID]: (req.headers[HTTP_HEADERS.TRACE_ID.toLowerCase()] as string) ?? '',
      },
      body: JSON.stringify(body),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status).json({ error: 'stream_failed' });
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();
  });

  app.options('/api/chat/stream', corsMiddleware);

  app.listen(PORT, () => {
    console.log(`[gateway-api] GraphQL on :${PORT}/graphql, SSE on :${PORT}/api/chat/stream`);
  });
}

main().catch(console.error);
