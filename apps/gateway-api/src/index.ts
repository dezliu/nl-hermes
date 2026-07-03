import express from 'express';
import { createServiceApp, HTTP_HEADERS, withServiceAuth, browserCorsMiddleware } from '@hermes/shared';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

const PORT = Number(process.env.PORT ?? 4000);
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL ?? 'http://localhost:4010';
const REPORT_SERVICE_URL = process.env.REPORT_SERVICE_URL ?? 'http://localhost:4030';

const typeDefs = `#graphql
  enum GenerationMode { sql report }
  enum ReportOutputFormat { inline web word }
  enum FeedbackRating { up down }

  type ChatSession {
    runId: ID!
    conversationId: ID!
    checkpointId: ID!
  }

  type TemplateRecommendation {
    id: ID!
    name: String!
    scenarioDescription: String!
    score: Float!
    type: GenerationMode!
  }

  type TemplateDetail {
    id: ID!
    name: String!
    scenarioDescription: String!
    type: GenerationMode!
    sqlBody: String!
    placeholders: [String!]!
    chartType: String
  }

  type ConversationSummary {
    id: ID!
    title: String!
    mode: GenerationMode!
    lastActiveAt: String!
  }

  type ChatMessageRecord {
    id: ID!
    role: String!
    content: String!
    mode: GenerationMode!
    status: String
    templateId: ID
    feedbackRating: FeedbackRating
    metadata: String
  }

  type Query {
    health: String!
    version: String!
    matchTemplates(userId: ID!, query: String!, mode: GenerationMode!): [TemplateRecommendation!]!
    templateDetail(id: ID!, type: GenerationMode!): TemplateDetail
    conversations(userId: ID!): [ConversationSummary!]!
    conversationMessages(userId: ID!, conversationId: ID!): [ChatMessageRecord!]!
  }

  input TemplateParameterInput {
    key: String!
    value: String!
  }

  input StartChatInput {
    userId: ID!
    roleId: ID
    conversationId: ID
    query: String!
    mode: GenerationMode!
    datasourceId: ID
    templateId: ID
    templateType: GenerationMode
    templateParameters: [TemplateParameterInput!]
    outputFormat: ReportOutputFormat
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

  input SubmitFeedbackInput {
    userId: ID!
    messageId: ID!
    rating: FeedbackRating!
    reason: String
  }

  input RenameConversationInput {
    userId: ID!
    conversationId: ID!
    title: String!
  }

  input DeleteConversationInput {
    userId: ID!
    conversationId: ID!
  }

  type Mutation {
    startChat(input: StartChatInput!): ChatSession!
    continueConversation(input: ContinueConversationInput!): ChatSession!
    cancelGeneration(input: CancelGenerationInput!): Boolean!
    submitMessageFeedback(input: SubmitFeedbackInput!): Boolean!
    renameConversation(input: RenameConversationInput!): ConversationSummary!
    deleteConversation(input: DeleteConversationInput!): Boolean!
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

async function orchGet<T>(path: string, headers: Record<string, string> = {}): Promise<T> {
  const url = `${ORCHESTRATOR_URL}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...withServiceAuth(headers, 'gateway-api'),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `orchestrator ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function orchPatch<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${ORCHESTRATOR_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...withServiceAuth(headers, 'gateway-api'),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `orchestrator ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function orchDelete<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${ORCHESTRATOR_URL}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...withServiceAuth(headers, 'gateway-api'),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `orchestrator ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const resolvers = {
  Query: {
    health: () => 'ok',
    version: () => '0.1.0',
    matchTemplates: async (_: unknown, { userId, query, mode }: { userId: string; query: string; mode: string }) => {
      void userId;
      const data = await orchPost<{ results: unknown[] }>('/v1/templates/match', { query, mode, topK: 1 });
      return data.results;
    },
    templateDetail: async (_: unknown, { id, type }: { id: string; type: string }) => {
      const data = await orchGet<{ item: unknown }>(`/v1/templates/${type}/${id}`);
      return data.item;
    },
    conversations: async (_: unknown, { userId }: { userId: string }) => {
      const data = await orchGet<{ items: unknown[] }>(`/v1/conversations?userId=${encodeURIComponent(userId)}`);
      return data.items;
    },
    conversationMessages: async (
      _: unknown,
      { userId, conversationId }: { userId: string; conversationId: string },
    ) => {
      const data = await orchGet<{ items: Array<Record<string, unknown>> }>(
        `/v1/conversations/${conversationId}/messages?userId=${encodeURIComponent(userId)}`,
      );
      return data.items.map((item) => ({
        ...item,
        metadata: item.metadata != null ? JSON.stringify(item.metadata) : null,
      }));
    },
  },
  Mutation: {
    startChat: (_: unknown, { input }: { input: Record<string, unknown> }) => {
      const params = input.templateParameters as { key: string; value: string }[] | undefined;
      const body = {
        ...input,
        templateParameters: params?.reduce<Record<string, string>>((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {}),
      };
      return orchPost('/v1/chat/start', body);
    },
    continueConversation: (_: unknown, { input }: { input: Record<string, unknown> }) =>
      orchPost('/v1/chat/continue', input),
    cancelGeneration: (_: unknown, { input }: { input: Record<string, unknown> }) =>
      orchPost<{ ok: boolean }>('/v1/chat/cancel', input).then((r) => r.ok),
    submitMessageFeedback: (_: unknown, { input }: { input: Record<string, unknown> }) =>
      orchPost<{ ok: boolean }>(`/v1/messages/${input.messageId}/feedback`, input).then((r) => r.ok),
    renameConversation: (_: unknown, { input }: { input: Record<string, unknown> }) =>
      orchPatch<{ item: unknown }>(`/v1/conversations/${input.conversationId}`, input).then((r) => r.item),
    deleteConversation: (_: unknown, { input }: { input: Record<string, unknown> }) =>
      orchDelete<{ ok: boolean }>(`/v1/conversations/${input.conversationId}`, input).then((r) => r.ok),
  },
};

async function main() {
  const app = createServiceApp('gateway-api', {
    publicPaths: ['/graphql', '/api/chat/stream', '/api/public/r', '/api/published-queries'],
  });
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

  app.get('/api/reports/:id/preview', corsMiddleware, async (req, res) => {
    const upstream = await fetch(`${REPORT_SERVICE_URL}/v1/reports/${req.params.id}/preview`, {
      headers: withServiceAuth({}, 'gateway-api'),
    });
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'preview_failed' });
      return;
    }
    const contentType = upstream.headers.get('content-type') ?? 'text/html';
    res.setHeader('Content-Type', contentType);
    res.send(Buffer.from(await upstream.arrayBuffer()));
  });

  app.get('/api/reports/:id/download', corsMiddleware, async (req, res) => {
    const upstream = await fetch(`${REPORT_SERVICE_URL}/v1/reports/${req.params.id}/download`, {
      headers: withServiceAuth({}, 'gateway-api'),
    });
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'download_failed' });
      return;
    }
    const disposition = upstream.headers.get('content-disposition');
    if (disposition) res.setHeader('Content-Disposition', disposition);
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  });

  app.post('/api/reports/:id/share', corsMiddleware, express.json(), async (req, res) => {
    try {
      const data = await orchPost<{ shareToken: string; shareUrl: string; expiresAt: string }>(
        `/v1/reports/${req.params.id}/share`,
        req.body,
      );
      res.json(data);
    } catch (err) {
      res.status(400).json({ error: 'share_failed', message: err instanceof Error ? err.message : '分享失败' });
    }
  });

  app.get('/api/public/r/:shareToken', corsMiddleware, async (req, res) => {
    const upstream = await fetch(`${REPORT_SERVICE_URL}/v1/public/reports/${req.params.shareToken}`, {
      headers: withServiceAuth({}, 'gateway-api'),
    });
    if (!upstream.ok) {
      res.status(upstream.status).send('链接无效或已过期');
      return;
    }
    const contentType = upstream.headers.get('content-type') ?? 'text/html';
    res.setHeader('Content-Type', contentType);
    res.send(Buffer.from(await upstream.arrayBuffer()));
  });

  app.get('/api/published-queries/:id/data', corsMiddleware, async (req, res) => {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    const upstream = await fetch(`${REPORT_SERVICE_URL}/v1/published-queries/${req.params.id}/data?${qs}`, {
      headers: {
        ...withServiceAuth({}, 'gateway-api'),
        'x-share-token': String(req.headers['x-share-token'] ?? ''),
      },
    });
    const json = await upstream.json();
    res.status(upstream.status).json(json);
  });

  app.listen(PORT, () => {
    console.log(`[gateway-api] GraphQL on :${PORT}/graphql, SSE on :${PORT}/api/chat/stream`);
  });
}

main().catch(console.error);
