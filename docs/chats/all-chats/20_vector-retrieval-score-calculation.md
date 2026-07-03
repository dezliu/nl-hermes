# Vector retrieval score calculation

- **ID**: `3cd8add1-5b28-4daa-926c-52a706624c55`
- **创建时间**: 2026-07-02 15:34
- **模式**: chat
- **Agentic**: False

---

## 用户

向量检索测试现在返回的score是怎么计算的，比如我输入：已结算账单，返回的分数都只有0.0几，分数太低了

## 助手

正在查找向量检索测试中 score 的计算逻辑。

<details>
<summary>Tool: mcp-codegraph-codegraph_explore</summary>

```json
{
  "rawArgs": "{\"name\":\"user-codegraph-codegraph_explore\",\"args\":{\"query\":\"向量检索测试 score 分数计算 semantic search vector retrieval\",\"limit\":20},\"toolCallId\":\"tool_69633315-ed4f-48d2-8584-5fd5fa0af38\",\"providerIdentifier\":\"codegraph\",\"toolName\":\"codegraph_explore\",\"smartModeApprovalOnly\":false,\"skipApproval\":true}",
  "params": "{\"tools\":[{\"name\":\"codegraph_explore\",\"parameters\":\"{\\\"query\\\":\\\"向量检索测试 score 分数计算 semantic search vector retrieval\\\",\\\"limit\\\":20}\",\"serverName\":\"codegraph\"}]}",
  "result": "{\"result\":\"{\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"Error: Tool execution failed: No CodeGraph project is loaded for this session.\\\\nSearched for a .codegraph/ directory starting from: /Users/dezliu/Documents/mine/repo/nl-hermes\\\\nThe index is likely fine — this is a working-directory detection issue: the MCP client launched the server outside your project and didn't report the workspace root. Fix it either way:\\\\n  • Pass projectPath to the tool call, e.g. projectPath: \\\\\\\"/absolute/path/to/your/project\\\\\\\"\\\\n  • Or add --path to the server's MCP config args: [\\\\\\\"serve\\\\\\\", \\\\\\\"--mcp\\\\\\\", \\\\\\\"--path\\\\\\\", \\\\\\\"/absolute/path/to/your/project\\\\\\\"]\\\"}]}\"}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"score\",\"glob\":\"**/*.{ts,tsx,js}\",\"caseInsensitive\":false,\"headLimit\":50,\"multiline\":false,\"toolCallId\":\"tool_9d3f0e92-5aba-4bf0-90ae-b3d33cff9a2\",\"offset\":0}",
  "params": "{\"pattern\":\"score\",\"glob\":\"**/*.{ts,tsx,js}\",\"caseInsensitive\":false}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"向量检索|semantic.*search|vector.*search\",\"glob\":\"**/*.{ts,tsx,md}\",\"caseInsensitive\":true,\"headLimit\":30,\"multiline\":false,\"toolCallId\":\"tool_f71668ef-d686-4368-bcac-f1a5e5636df\",\"offset\":0}",
  "params": "{\"pattern\":\"向量检索|semantic.*search|vector.*search\",\"glob\":\"**/*.{ts,tsx,md}\",\"caseInsensitive\":true}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

正在查看搜索测试页面和 API 代码，以定位分数计算逻辑。
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/app/search-test/page.tsx\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/app/search-test/page.tsx\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/web-admin/app/search-test/page.tsx\"}",
  "result": "{\"contents\":\"'use client';\\n\\nimport { useState } from 'react';\\nimport { Button, Card, Input, Select, Space, Tag, message } from 'antd';\\nimport { AdminLayout } from '../../components/AdminLayout';\\nimport { ragApi, scoreLabel } from '../../lib/api';\\n\\ntype RetrieveResult = {\\n  id: string;\\n  content: string;\\n  score: number;\\n  matchReason?: string;\\n};\\n\\nexport default function SearchTestPage() {\\n  const [query, setQuery] = useState('');\\n  const [collection, setCollection] = useState<'metadata' | 'business' | 'templates'>('metadata');\\n  const [results, setResults] = useState<RetrieveResult[]>([]);\\n  const [loading, setLoading] = useState(false);\\n\\n  const onSearch = async () => {\\n    if (!query.trim()) {\\n      message.warning('请输入测试问题');\\n      return;\\n    }\\n    setLoading(true);\\n    try {\\n      const data = await ragApi.retrieve({ query, collection, topK: 10 });\\n      setResults(data.results);\\n    } catch (e) {\\n      message.error(e instanceof Error ? e.message : '检索失败');\\n    } finally {\\n      setLoading(false);\\n    }\\n  };\\n\\n  const onRebuild = async () => {\\n    try {\\n      await ragApi.rebuildIndex(collection);\\n      message.success('索引重建已触发');\\n    } catch (e) {\\n      message.error(e instanceof Error ? e.message : '重建失败');\\n    }\\n  };\\n\\n  return (\\n    <AdminLayout>\\n      <h1 style={{ fontSize: 18, marginBottom: 4 }}>向量检索测试</h1>\\n      <p style={{ color: '#64748B', marginBottom: 16 }}>\\n        输入模拟用户问题，验证元数据与同义词维护效果\\n      </p>\\n\\n      <Space direction=\\\"vertical\\\" style={{ width: '100%', maxWidth: 720 }} size=\\\"middle\\\">\\n        <Space wrap>\\n          <Select\\n            value={collection}\\n            onChange={setCollection}\\n            options={[\\n              { value: 'metadata', label: '元数据库' },\\n              { value: 'business', label: '业务知识库' },\\n              { value: 'templates', label: '模板库' },\\n            ]}\\n          />\\n          <Button onClick={onRebuild}>重建索引</Button>\\n        </Space>\\n        <Input.TextArea\\n          rows={3}\\n          value={query}\\n          onChange={(e) => setQuery(e.target.value)}\\n          placeholder=\\\"例如：上个月华东区销售额\\\"\\n        />\\n        <Button type=\\\"primary\\\" loading={loading} onClick={onSearch}>开始测试</Button>\\n\\n        {results.map((r) => (\\n          <Card key={r.id} size=\\\"small\\\">\\n            <Space direction=\\\"vertical\\\" style={{ width: '100%' }}>\\n              <Space>\\n                <Tag color=\\\"blue\\\">{scoreLabel(r.score)}</Tag>\\n                <span style={{ color: '#64748B' }}>score: {r.score}</span>\\n              </Space>\\n              <div>{r.content}</div>\\n              {r.matchReason && <div style={{ fontSize: 12, color: '#94A3B8' }}>{r.matchReason}</div>}\\n            </Space>\\n          </Card>\\n        ))}\\n      </Space>\\n    </AdminLayout>\\n  );\\n}\\n\",\"totalLinesInFile\":90}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/services/fusion.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/services/fusion.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/services/fusion.ts\"}",
  "result": "{\"contents\":\"import type { RetrieveResult } from '@hermes/contracts';\\n\\nexport type RankedDoc = {\\n  id: string;\\n  content: string;\\n  score: number;\\n  sources: Set<string>;\\n  metadata?: Record<string, unknown>;\\n};\\n\\nexport function reciprocalRankFusion(\\n  lists: { name: string; hits: { id: string; content: string; score: number; metadata?: Record<string, unknown> }[] }[],\\n  k = 60,\\n): RankedDoc[] {\\n  const map = new Map<string, RankedDoc>();\\n\\n  for (const list of lists) {\\n    list.hits.forEach((hit, rank) => {\\n      const rrfScore = 1 / (k + rank + 1);\\n      const existing = map.get(hit.id);\\n      if (existing) {\\n        existing.score += rrfScore;\\n        existing.sources.add(list.name);\\n      } else {\\n        map.set(hit.id, {\\n          id: hit.id,\\n          content: hit.content,\\n          score: rrfScore,\\n          sources: new Set([list.name]),\\n          metadata: hit.metadata,\\n        });\\n      }\\n    });\\n  }\\n\\n  return [...map.values()].sort((a, b) => b.score - a.score);\\n}\\n\\nexport function rerankByQuery(query: string, docs: RankedDoc[], topK: number): RetrieveResult[] {\\n  const qTokens = new Set(query.toLowerCase().split(/\\\\s+/).filter(Boolean));\\n  const scored = docs.map((doc) => {\\n    const contentTokens = doc.content.toLowerCase().split(/\\\\s+/);\\n    let overlap = 0;\\n    for (const t of contentTokens) {\\n      if (qTokens.has(t)) overlap += 1;\\n    }\\n    const lexical = overlap / Math.max(qTokens.size, 1);\\n    const finalScore = doc.score * 0.7 + lexical * 0.3;\\n    return { ...doc, score: finalScore };\\n  });\\n  return scored\\n    .sort((a, b) => b.score - a.score)\\n    .slice(0, topK)\\n    .map((d) => ({\\n      id: d.id,\\n      content: d.content,\\n      score: Number(d.score.toFixed(4)),\\n      matchReason: [...d.sources, 'rerank'].join('+'),\\n      source: 'rerank' as const,\\n    }));\\n}\\n\\nexport function scoreLevel(score: number): 'high' | 'medium' | 'low' {\\n  if (score >= 0.6) return 'high';\\n  if (score >= 0.35) return 'medium';\\n  return 'low';\\n}\\n\\nexport function weightedScore(results: RetrieveResult[]): number {\\n  if (results.length === 0) return 0;\\n  const top = results.slice(0, 5);\\n  const sum = top.reduce((s, r) => s + r.score, 0);\\n  return Number((sum / top.length).toFixed(4));\\n}\\n\",\"totalLinesInFile\":75}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"search|retrieve|fusion|rrf\",\"glob\":\"apps/rag-service/**/*.ts\",\"caseInsensitive\":false,\"headLimit\":40,\"multiline\":false,\"toolCallId\":\"tool_73c8f7c4-37f3-474f-982f-19980b9d9e1\",\"offset\":0}",
  "params": "{\"pattern\":\"search|retrieve|fusion|rrf\",\"glob\":\"apps/rag-service/**/*.ts\",\"caseInsensitive\":false}",
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
  "result": "{\"contents\":\"const METADATA_URL = process.env.NEXT_PUBLIC_METADATA_URL ?? 'http://localhost:4050';\\nconst RAG_URL = process.env.NEXT_PUBLIC_RAG_URL ?? 'http://localhost:4020';\\nconst EVAL_URL = process.env.NEXT_PUBLIC_EVAL_URL ?? 'http://localhost:4040';\\nconst SERVICE_TOKEN = process.env.NEXT_PUBLIC_SERVICE_TOKEN ?? 'hermes-dev-service-token';\\n\\nfunction headers(): HeadersInit {\\n  return {\\n    'Content-Type': 'application/json',\\n    'x-service-token': SERVICE_TOKEN,\\n  };\\n}\\n\\nasync function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {\\n  const res = await fetch(`${base}${path}`, {\\n    ...init,\\n    headers: { ...headers(), ...init?.headers },\\n  });\\n  if (!res.ok) {\\n    const text = await res.text();\\n    throw new Error(text || `HTTP ${res.status}`);\\n  }\\n  if (res.headers.get('content-type')?.includes('text/markdown')) {\\n    return res.text() as Promise<T>;\\n  }\\n  return res.json() as Promise<T>;\\n}\\n\\nexport const metaApi = {\\n  listDatasources: () => request<{ items: unknown[] }>(METADATA_URL, '/v1/datasources'),\\n  createDatasource: (body: unknown) =>\\n    request(METADATA_URL, '/v1/datasources', { method: 'POST', body: JSON.stringify(body) }),\\n  testDatasource: (id: string) =>\\n    request(METADATA_URL, `/v1/datasources/${id}/test`, { method: 'POST' }),\\n  syncDatasource: (id: string) =>\\n    request(METADATA_URL, `/v1/datasources/${id}/sync`, { method: 'POST' }),\\n  listTables: (datasourceId: string) =>\\n    request<{ items: unknown[] }>(METADATA_URL, `/v1/datasources/${datasourceId}/tables`),\\n  listRoles: () => request<{ items: unknown[] }>(METADATA_URL, '/v1/prompts/roles'),\\n  listPromptVersions: (roleId?: string) =>\\n    request<{ items: unknown[] }>(\\n      METADATA_URL,\\n      `/v1/prompts${roleId ? `?roleId=${roleId}` : ''}`,\\n    ),\\n  savePrompt: (body: unknown) =>\\n    request(METADATA_URL, '/v1/prompts', { method: 'POST', body: JSON.stringify(body) }),\\n  listSettings: () => request<{ items: unknown[] }>(METADATA_URL, '/v1/settings'),\\n};\\n\\nexport type BusinessKnowledgeItem = {\\n  id: string;\\n  title: string;\\n  category: 'glossary' | 'metric' | 'rule' | 'faq';\\n  content: string;\\n  status: 'active' | 'archived';\\n  createdAt?: string;\\n  updatedAt?: string;\\n};\\n\\nexport const businessKnowledgeApi = {\\n  list: (params?: { status?: string; category?: string }) => {\\n    const qs = new URLSearchParams();\\n    if (params?.status) qs.set('status', params.status);\\n    if (params?.category) qs.set('category', params.category);\\n    const q = qs.toString();\\n    return request<{ items: BusinessKnowledgeItem[] }>(\\n      METADATA_URL,\\n      `/v1/business-knowledge${q ? `?${q}` : ''}`,\\n    );\\n  },\\n  create: (body: Omit<BusinessKnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>) =>\\n    request<{ item: BusinessKnowledgeItem }>(METADATA_URL, '/v1/business-knowledge', {\\n      method: 'POST',\\n      body: JSON.stringify(body),\\n    }),\\n  update: (id: string, body: Partial<BusinessKnowledgeItem>) =>\\n    request<{ item: BusinessKnowledgeItem }>(METADATA_URL, `/v1/business-knowledge/${id}`, {\\n      method: 'PATCH',\\n      body: JSON.stringify(body),\\n    }),\\n};\\n\\nexport type SqlTemplateItem = {\\n  id: string;\\n  name: string;\\n  scenarioDescription: string;\\n  sqlBody: string;\\n  score?: number | null;\\n  inLibrary: boolean;\\n  status: 'draft' | 'active' | 'archived';\\n  usageCount?: number;\\n};\\n\\nexport type ReportTemplateItem = SqlTemplateItem & {\\n  chartType: 'line' | 'bar' | 'table';\\n  chartConfig?: Record<string, string> | null;\\n};\\n\\nexport const templateApi = {\\n  listSql: (status?: string) =>\\n    request<{ items: SqlTemplateItem[] }>(\\n      METADATA_URL,\\n      `/v1/templates/sql${status ? `?status=${status}` : ''}`,\\n    ),\\n  createSql: (body: Partial<SqlTemplateItem>) =>\\n    request<{ item: SqlTemplateItem }>(METADATA_URL, '/v1/templates/sql', {\\n      method: 'POST',\\n      body: JSON.stringify(body),\\n    }),\\n  updateSql: (id: string, body: Partial<SqlTemplateItem>) =>\\n    request<{ item: SqlTemplateItem }>(METADATA_URL, `/v1/templates/sql/${id}`, {\\n      method: 'PATCH',\\n      body: JSON.stringify(body),\\n    }),\\n  listReport: (status?: string) =>\\n    request<{ items: ReportTemplateItem[] }>(\\n      METADATA_URL,\\n      `/v1/templates/report${status ? `?status=${status}` : ''}`,\\n    ),\\n  createReport: (body: Partial<ReportTemplateItem>) =>\\n    request<{ item: ReportTemplateItem }>(METADATA_URL, '/v1/templates/report', {\\n      method: 'POST',\\n      body: JSON.stringify(body),\\n    }),\\n  updateReport: (id: string, body: Partial<ReportTemplateItem>) =>\\n    request<{ item: ReportTemplateItem }>(METADATA_URL, `/v1/templates/report/${id}`, {\\n      method: 'PATCH',\\n      body: JSON.stringify(body),\\n    }),\\n};\\n\\nexport const ragApi = {\\n  retrieve: (body: unknown) =>\\n    request<{ results: { id: string; content: string; score: number; matchReason?: string }[] }>(\\n      RAG_URL,\\n      '/v1/retrieve',\\n      { method: 'POST', body: JSON.stringify(body) },\\n    ),\\n  rebuildIndex: (collection?: string) =>\\n    request(RAG_URL, '/v1/index/rebuild', {\\n      method: 'POST',\\n      body: JSON.stringify({ collection }),\\n    }),\\n};\\n\\nexport function scoreLabel(score: number): '高' | '中' | '低' {\\n  if (score >= 0.6) return '高';\\n  if (score >= 0.35) return '中';\\n  return '低';\\n}\\n\\nexport const alertApi = {\\n  list: (query?: Record<string, string>) => {\\n    const qs = query ? `?${new URLSearchParams(query).toString()}` : '';\\n    return request<{ items: AlertItem[] }>(METADATA_URL, `/v1/alerts${qs}`);\\n  },\\n  unreadCount: () => request<{ count: number }>(METADATA_URL, '/v1/alerts/unread-count'),\\n  update: (id: string, body: { status: string; resolutionNote?: string }) =>\\n    request<{ item: AlertItem }>(METADATA_URL, `/v1/alerts/${id}`, {\\n      method: 'PATCH',\\n      body: JSON.stringify(body),\\n    }),\\n  batchRead: (ids: string[]) =>\\n    request<{ updated: number }>(METADATA_URL, '/v1/alerts/batch-read', {\\n      method: 'POST',\\n      body: JSON.stringify({ ids }),\\n    }),\\n};\\n\\nexport type AlertItem = {\\n  id: string;\\n  type: string;\\n  level: 'info' | 'warning' | 'error' | 'critical';\\n  title: string;\\n  message: string;\\n  status: 'open' | 'acknowledged' | 'resolved';\\n  refType?: string;\\n  refId?: string;\\n  createdAt?: string;\\n};\\n\\nexport const evalApi = {\\n  listSets: () => request<{ items: EvalSetItem[] }>(EVAL_URL, '/v1/eval/sets'),\\n  getSet: (id: string) => request<{ item: EvalSetDetail }>(EVAL_URL, `/v1/eval/sets/${id}`),\\n  createSet: (body: { name: string; description?: string }) =>\\n    request<{ item: EvalSetItem }>(EVAL_URL, '/v1/eval/sets', { method: 'POST', body: JSON.stringify(body) }),\\n  addCase: (setId: string, body: EvalCaseInput) =>\\n    request<{ item: EvalCaseItem }>(EVAL_URL, `/v1/eval/sets/${setId}/cases`, {\\n      method: 'POST',\\n      body: JSON.stringify(body),\\n    }),\\n  startRun: (evalSetId: string) =>\\n    request<{ item: EvalRunItem }>(EVAL_URL, '/v1/eval/runs', {\\n      method: 'POST',\\n      body: JSON.stringify({ evalSetId }),\\n    }),\\n  getRun: (runId: string) => request<{ item: EvalRunDetail }>(EVAL_URL, `/v1/eval/runs/${runId}`),\\n  cancelRun: (runId: string) =>\\n    request<{ ok: boolean }>(EVAL_URL, `/v1/eval/runs/${runId}/cancel`, { method: 'POST' }),\\n  exportReport: (runId: string) => request<string>(EVAL_URL, `/v1/eval/runs/${runId}/export`),\\n};\\n\\nexport type EvalSetItem = { id: string; name: string; description?: string; caseCount?: number };\\nexport type EvalCaseItem = {\\n  id: string;\\n  question: string;\\n  mode: 'sql' | 'report';\\n  expectedTables?: string[];\\n  expectedPoints?: string;\\n};\\nexport type EvalSetDetail = EvalSetItem & { cases: EvalCaseItem[] };\\nexport type EvalCaseInput = {\\n  question: string;\\n  mode: 'sql' | 'report';\\n  expectedTables?: string[];\\n  expectedPoints?: string;\\n};\\nexport type EvalRunItem = {\\n  id: string;\\n  evalSetId: string;\\n  status: string;\\n  progress: number;\\n  summary?: {\\n    retrievalHitRate: number;\\n    generateSuccessRate: number;\\n    averageScore: number;\\n    lowScoreCount: number;\\n    avgCaseDurationMs?: number;\\n  };\\n};\\nexport type EvalRunDetail = EvalRunItem & {\\n  results: {\\n    id: string;\\n    question?: string;\\n    mode?: string;\\n    retrievalHit?: boolean;\\n    generateSuccess?: boolean;\\n    score?: number;\\n    diffNotes?: string;\\n    expectedPoints?: string;\\n  }[];\\n};\\n\",\"totalLinesInFile\":242}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/services/retrieve-service.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/services/retrieve-service.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/services/retrieve-service.ts\"}",
  "result": "{\"contents\":\"import type { Logger } from '@hermes/shared';\\nimport { getServiceAuthHeaders, HTTP_HEADERS } from '@hermes/shared';\\nimport type { RetrieveRequest, RetrieveResponse, RetrieveResult } from '@hermes/contracts';\\nimport { embedText } from '../lib/embedding.js';\\nimport { OpenSearchClient, collectionToIndex } from '../lib/opensearch.js';\\nimport { QdrantClient, collectionToQdrant } from '../lib/qdrant.js';\\nimport { reciprocalRankFusion, rerankByQuery } from './fusion.js';\\n\\nexport type RetrieveSettings = {\\n  bm25TopK: number;\\n  vectorTopK: number;\\n  rrfK: number;\\n  rerankTopK: number;\\n  enableRerank: boolean;\\n};\\n\\nconst DEFAULT_SETTINGS: RetrieveSettings = {\\n  bm25TopK: 20,\\n  vectorTopK: 20,\\n  rrfK: 60,\\n  rerankTopK: 10,\\n  enableRerank: true,\\n};\\n\\nexport class RetrieveService {\\n  constructor(\\n    private readonly os: OpenSearchClient,\\n    private readonly qdrant: QdrantClient,\\n    private readonly logger: Logger,\\n    private readonly metadataUrl = process.env.METADATA_SERVICE_URL ?? 'http://localhost:4050',\\n  ) {}\\n\\n  async retrieve(req: RetrieveRequest, traceId?: string): Promise<RetrieveResponse> {\\n    const settings = {\\n      ...DEFAULT_SETTINGS,\\n      bm25TopK: req.bm25TopK ?? req.topK ?? DEFAULT_SETTINGS.bm25TopK,\\n      vectorTopK: req.vectorTopK ?? req.topK ?? DEFAULT_SETTINGS.vectorTopK,\\n      rrfK: req.rrfK ?? DEFAULT_SETTINGS.rrfK,\\n      rerankTopK: req.rerankTopK ?? DEFAULT_SETTINGS.rerankTopK,\\n      enableRerank: req.enableRerank ?? DEFAULT_SETTINGS.enableRerank,\\n    };\\n\\n    const indexName = collectionToIndex(req.collection);\\n    const collectionName = collectionToQdrant(req.collection);\\n    const queryVector = embedText(req.query);\\n\\n    const [bm25Hits, vectorHits] = await Promise.all([\\n      this.os.search(indexName, req.query, settings.bm25TopK),\\n      this.qdrant.search(collectionName, queryVector, settings.vectorTopK),\\n    ]);\\n\\n    const fused = reciprocalRankFusion(\\n      [\\n        { name: 'bm25', hits: bm25Hits },\\n        { name: 'vector', hits: vectorHits },\\n      ],\\n      settings.rrfK,\\n    );\\n\\n    let results: RetrieveResult[] = fused.map((d) => ({\\n      id: d.id,\\n      content: d.content,\\n      score: Number(d.score.toFixed(4)),\\n      matchReason: [...d.sources, 'rrf'].join('+'),\\n      source: 'rrf' as const,\\n    }));\\n\\n    if (settings.enableRerank && results.length > 0) {\\n      results = rerankByQuery(req.query, fused, settings.rerankTopK);\\n    } else {\\n      results = results.slice(0, settings.rerankTopK);\\n    }\\n\\n    this.logger.info('rag.retrieve.completed', {\\n      traceId,\\n      collection: req.collection,\\n      bm25Count: bm25Hits.length,\\n      vectorCount: vectorHits.length,\\n      resultCount: results.length,\\n    });\\n\\n    return { results, query: req.query, collection: req.collection };\\n  }\\n\\n  private authHeaders(traceId?: string): Record<string, string> {\\n    return {\\n      ...getServiceAuthHeaders('rag-service'),\\n      ...(traceId ? { [HTTP_HEADERS.TRACE_ID]: traceId } : {}),\\n    };\\n  }\\n\\n  async fetchSettings(traceId?: string): Promise<Partial<RetrieveSettings>> {\\n    try {\\n      const res = await fetch(`${this.metadataUrl}/v1/settings?category=rag`, {\\n        headers: this.authHeaders(traceId),\\n      });\\n      if (!res.ok) return {};\\n      const data = (await res.json()) as { items?: { settingKey: string; settingValue: unknown }[] };\\n      const map = Object.fromEntries((data.items ?? []).map((i) => [i.settingKey, i.settingValue]));\\n      return {\\n        bm25TopK: Number(map['rag.bm25.topK'] ?? DEFAULT_SETTINGS.bm25TopK),\\n        vectorTopK: Number(map['rag.vector.topK'] ?? DEFAULT_SETTINGS.vectorTopK),\\n        rrfK: Number(map['rag.rrf.k'] ?? DEFAULT_SETTINGS.rrfK),\\n        rerankTopK: Number(map['rag.rerank.topK'] ?? DEFAULT_SETTINGS.rerankTopK),\\n      };\\n    } catch {\\n      this.logger.warn('rag.settings.fetch_failed', { traceId });\\n      return {};\\n    }\\n  }\\n}\\n\",\"totalLinesInFile\":112}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/routes/index.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/routes/index.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/routes/index.ts\"}",
  "result": "{\"contents\":\"import type { NextFunction, Request, Response } from 'express';\\nimport { getTraceId } from '@hermes/shared';\\nimport type { ScoreRequest } from '@hermes/contracts';\\nimport type { RetrieveService } from '../services/retrieve-service.js';\\nimport type { IndexPipelineService } from '../services/index-pipeline.js';\\nimport { scoreLevel, weightedScore } from '../services/fusion.js';\\n\\nexport type RagContext = {\\n  retrieve: RetrieveService;\\n  indexPipeline: IndexPipelineService;\\n};\\n\\nfunction asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {\\n  return (req: Request, res: Response, next: NextFunction) => {\\n    fn(req, res).catch(next);\\n  };\\n}\\n\\nexport function mountRagRoutes(app: import('express').Express, ctx: RagContext): void {\\n  app.post('/v1/retrieve', asyncHandler(async (req, res) => {\\n    const traceId = getTraceId(req);\\n    const settings = await ctx.retrieve.fetchSettings(traceId);\\n    const body = { ...settings, ...req.body };\\n    const result = await ctx.retrieve.retrieve(body, traceId);\\n    res.json(result);\\n  }));\\n\\n  app.post('/v1/score', asyncHandler(async (req, res) => {\\n    const traceId = getTraceId(req);\\n    const input = req.body as ScoreRequest;\\n    let results = input.results;\\n    if (!results || results.length === 0) {\\n      const retrieved = await ctx.retrieve.retrieve(\\n        { query: input.query, collection: input.collection },\\n        traceId,\\n      );\\n      results = retrieved.results;\\n    }\\n    const score = weightedScore(results);\\n    res.json({\\n      score,\\n      level: scoreLevel(score),\\n      details: results.map((r) => ({ id: r.id, score: r.score })),\\n    });\\n  }));\\n\\n  app.post('/v1/index/rebuild', asyncHandler(async (req, res) => {\\n    const traceId = getTraceId(req);\\n    const collection = req.body?.collection as string | undefined;\\n    if (collection === 'metadata') {\\n      res.json(await ctx.indexPipeline.rebuildMetadata(traceId));\\n      return;\\n    }\\n    if (collection === 'business') {\\n      res.json(await ctx.indexPipeline.rebuildBusiness(traceId));\\n      return;\\n    }\\n    if (collection === 'templates') {\\n      res.json(await ctx.indexPipeline.rebuildTemplates(traceId));\\n      return;\\n    }\\n    res.json(await ctx.indexPipeline.rebuildAll(traceId));\\n  }));\\n}\\n\",\"totalLinesInFile\":65}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/index.test.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/index.test.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/index.test.ts\"}",
  "result": "{\"contents\":\"import { describe, it, expect } from 'vitest';\\nimport { reciprocalRankFusion, rerankByQuery, scoreLevel, weightedScore } from './services/fusion.js';\\nimport { embedText, cosineSimilarity } from './lib/embedding.js';\\n\\ndescribe('embedding', () => {\\n  it('produces normalized vectors', () => {\\n    const v = embedText('销售额');\\n    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));\\n    expect(norm).toBeCloseTo(1, 5);\\n  });\\n\\n  it('scores similar text higher', () => {\\n    const a = embedText('华东销售额');\\n    const b = embedText('华东区域销售');\\n    const c = embedText('完全无关的内容');\\n    expect(cosineSimilarity(a, b)).toBeGreaterThan(cosineSimilarity(a, c));\\n  });\\n});\\n\\ndescribe('fusion', () => {\\n  it('merges ranked lists with RRF', () => {\\n    const fused = reciprocalRankFusion([\\n      { name: 'bm25', hits: [{ id: 'a', content: '订单表', score: 1.2 }] },\\n      { name: 'vector', hits: [{ id: 'a', content: '订单表', score: 0.9 }, { id: 'b', content: '用户表', score: 0.8 }] },\\n    ]);\\n    expect(fused[0]?.id).toBe('a');\\n    expect(fused[0]?.sources.has('bm25')).toBe(true);\\n    expect(fused[0]?.sources.has('vector')).toBe(true);\\n  });\\n\\n  it('reranks by query overlap', () => {\\n    const docs = reciprocalRankFusion([\\n      { name: 'bm25', hits: [{ id: '1', content: 'orders amount region', score: 1 }] },\\n      { name: 'vector', hits: [{ id: '2', content: 'users profile', score: 0.9 }] },\\n    ]);\\n    const reranked = rerankByQuery('orders region', docs, 2);\\n    expect(reranked[0]?.id).toBe('1');\\n  });\\n\\n  it('maps score levels', () => {\\n    expect(scoreLevel(0.7)).toBe('high');\\n    expect(scoreLevel(0.4)).toBe('medium');\\n    expect(scoreLevel(0.1)).toBe('low');\\n  });\\n\\n  it('computes weighted score', () => {\\n    expect(weightedScore([{ id: '1', content: 'a', score: 0.8 }])).toBe(0.8);\\n    expect(weightedScore([])).toBe(0);\\n  });\\n});\\n\",\"totalLinesInFile\":51}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/lib/qdrant.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/lib/qdrant.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/lib/qdrant.ts\"}",
  "result": "{\"contents\":\"import { QDRANT_COLLECTIONS } from '@hermes/shared';\\nimport { EMBEDDING_DIM } from './embedding.js';\\n\\nexport type VectorPoint = {\\n  id: string;\\n  vector: number[];\\n  payload: { content: string; metadata?: Record<string, unknown> };\\n};\\n\\nexport type VectorHit = {\\n  id: string;\\n  content: string;\\n  score: number;\\n  metadata?: Record<string, unknown>;\\n};\\n\\nexport class QdrantClient {\\n  private readonly baseUrl: string;\\n\\n  constructor(baseUrl = process.env.QDRANT_URL ?? 'http://localhost:6333') {\\n    this.baseUrl = baseUrl.replace(/\\\\/$/, '');\\n  }\\n\\n  async ensureCollection(collection: string): Promise<void> {\\n    try {\\n      const res = await fetch(`${this.baseUrl}/collections/${collection}`, { method: 'GET' });\\n      if (res.status === 404) {\\n        await fetch(`${this.baseUrl}/collections/${collection}`, {\\n          method: 'PUT',\\n          headers: { 'Content-Type': 'application/json' },\\n          body: JSON.stringify({\\n            vectors: { size: EMBEDDING_DIM, distance: 'Cosine' },\\n          }),\\n        });\\n      }\\n    } catch {\\n      // External Qdrant unavailable\\n    }\\n  }\\n\\n  async upsertPoints(collection: string, points: VectorPoint[]): Promise<void> {\\n    if (points.length === 0) return;\\n    await this.ensureCollection(collection);\\n    await fetch(`${this.baseUrl}/collections/${collection}/points?wait=true`, {\\n      method: 'PUT',\\n      headers: { 'Content-Type': 'application/json' },\\n      body: JSON.stringify({\\n        points: points.map((p) => ({\\n          id: p.id,\\n          vector: p.vector,\\n          payload: p.payload,\\n        })),\\n      }),\\n    });\\n  }\\n\\n  async search(collection: string, vector: number[], topK: number): Promise<VectorHit[]> {\\n    try {\\n      await this.ensureCollection(collection);\\n      const res = await fetch(`${this.baseUrl}/collections/${collection}/points/search`, {\\n        method: 'POST',\\n        headers: { 'Content-Type': 'application/json' },\\n        body: JSON.stringify({ vector, limit: topK, with_payload: true }),\\n      });\\n      if (!res.ok) return [];\\n      const data = (await res.json()) as {\\n        result?: { id: string | number; score: number; payload?: { content?: string; metadata?: Record<string, unknown> } }[];\\n      };\\n      return (data.result ?? []).map((r) => ({\\n        id: String(r.id),\\n        content: r.payload?.content ?? '',\\n        score: r.score,\\n        metadata: r.payload?.metadata,\\n      }));\\n    } catch {\\n      return [];\\n    }\\n  }\\n}\\n\\nexport function collectionToQdrant(collection: 'metadata' | 'business' | 'templates'): string {\\n  const map = {\\n    metadata: QDRANT_COLLECTIONS.METADATA,\\n    business: QDRANT_COLLECTIONS.BUSINESS,\\n    templates: QDRANT_COLLECTIONS.TEMPLATES,\\n  };\\n  return map[collection];\\n}\\n\",\"totalLinesInFile\":89}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

已明确界面分数并非 Qdrant 原始余弦相似度。它经过了额外的转换或归一化处理。

实际分数由 BM25 与向量检索并行后经 RRF 融合得出。RRF 只依据排名位置计算，不使用原始相似度分值。默认参数下，第一名的 RRF 分数约为 0.0164；若同时命中两路检索，总分约 0.0328。最终分数还会乘以 0.7 的 RRF 权重和 0.3 的词法重叠权重。

进一步发现中文文本没有空格，导致分词逻辑将整句视为单一 token。这会严重拉低词法重叠的匹配程度，使 rerank 后的最终分数异常偏低。
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/lib/opensearch.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/lib/opensearch.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/lib/opensearch.ts\"}",
  "result": "{\"contents\":\"import { OPENSEARCH_INDICES } from '@hermes/shared';\\n\\nexport type IndexDocument = {\\n  id: string;\\n  content: string;\\n  metadata?: Record<string, unknown>;\\n};\\n\\nexport type Bm25Hit = {\\n  id: string;\\n  content: string;\\n  score: number;\\n  metadata?: Record<string, unknown>;\\n};\\n\\nexport class OpenSearchClient {\\n  private readonly baseUrl: string;\\n\\n  constructor(baseUrl = process.env.OPENSEARCH_URL ?? 'http://localhost:9200') {\\n    this.baseUrl = baseUrl.replace(/\\\\/$/, '');\\n  }\\n\\n  async ensureIndex(indexName: string): Promise<void> {\\n    try {\\n      const res = await fetch(`${this.baseUrl}/${indexName}`, { method: 'HEAD' });\\n      if (res.status === 404) {\\n        await fetch(`${this.baseUrl}/${indexName}`, {\\n          method: 'PUT',\\n          headers: { 'Content-Type': 'application/json' },\\n          body: JSON.stringify({\\n            settings: { index: { number_of_shards: 1, number_of_replicas: 0 } },\\n            mappings: {\\n              properties: {\\n                content: { type: 'text' },\\n                metadata: { type: 'object', enabled: false },\\n              },\\n            },\\n          }),\\n        });\\n      }\\n    } catch {\\n      // External OpenSearch unavailable — caller falls back to empty hits\\n    }\\n  }\\n\\n  async bulkIndex(indexName: string, docs: IndexDocument[]): Promise<void> {\\n    if (docs.length === 0) return;\\n    await this.ensureIndex(indexName);\\n    const body = docs.flatMap((doc) => [\\n      JSON.stringify({ index: { _index: indexName, _id: doc.id } }),\\n      JSON.stringify({ content: doc.content, metadata: doc.metadata ?? {} }),\\n    ]).join('\\\\n') + '\\\\n';\\n    await fetch(`${this.baseUrl}/_bulk`, {\\n      method: 'POST',\\n      headers: { 'Content-Type': 'application/x-ndjson' },\\n      body,\\n    });\\n  }\\n\\n  async search(indexName: string, query: string, topK: number): Promise<Bm25Hit[]> {\\n    try {\\n      await this.ensureIndex(indexName);\\n      const res = await fetch(`${this.baseUrl}/${indexName}/_search`, {\\n        method: 'POST',\\n        headers: { 'Content-Type': 'application/json' },\\n        body: JSON.stringify({\\n          size: topK,\\n          query: { match: { content: { query, operator: 'or' } } },\\n        }),\\n      });\\n      if (!res.ok) return [];\\n      const data = (await res.json()) as {\\n        hits?: { hits?: { _id: string; _score: number; _source: { content: string; metadata?: Record<string, unknown> } }[] };\\n      };\\n      return (data.hits?.hits ?? []).map((h) => ({\\n        id: h._id,\\n        content: h._source.content,\\n        score: h._score,\\n        metadata: h._source.metadata,\\n      }));\\n    } catch {\\n      return [];\\n    }\\n  }\\n}\\n\\nexport function collectionToIndex(collection: 'metadata' | 'business' | 'templates'): string {\\n  const map = {\\n    metadata: OPENSEARCH_INDICES.METADATA,\\n    business: OPENSEARCH_INDICES.BUSINESS,\\n    templates: OPENSEARCH_INDICES.TEMPLATES,\\n  };\\n  return map[collection];\\n}\\n\",\"totalLinesInFile\":95}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/lib/embedding.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/lib/embedding.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/lib/embedding.ts\"}",
  "result": "{\"contents\":\"const DIM = 64;\\n\\n/** Deterministic local embedding for dev/test when no external model is configured */\\nexport function embedText(text: string, dimensions = DIM): number[] {\\n  const vec = new Array(dimensions).fill(0);\\n  const normalized = text.toLowerCase().trim();\\n  for (let i = 0; i < normalized.length; i += 1) {\\n    const code = normalized.charCodeAt(i);\\n    vec[i % dimensions] += code / 255;\\n    vec[(i * 7 + 3) % dimensions] += (code % 17) / 17;\\n  }\\n  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;\\n  return vec.map((v) => v / norm);\\n}\\n\\nexport function cosineSimilarity(a: number[], b: number[]): number {\\n  const len = Math.min(a.length, b.length);\\n  let dot = 0;\\n  let na = 0;\\n  let nb = 0;\\n  for (let i = 0; i < len; i += 1) {\\n    dot += a[i]! * b[i]!;\\n    na += a[i]! * a[i]!;\\n    nb += b[i]! * b[i]!;\\n  }\\n  const denom = Math.sqrt(na) * Math.sqrt(nb);\\n  return denom === 0 ? 0 : dot / denom;\\n}\\n\\nexport const EMBEDDING_DIM = DIM;\\n\",\"totalLinesInFile\":31}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"scoreLevel|scoreLabel|0\\\\.6|0\\\\.35\",\"glob\":\"**/*.{ts,tsx,md}\",\"caseInsensitive\":false,\"headLimit\":40,\"multiline\":false,\"toolCallId\":\"tool_02afe5b5-3565-4b15-b1b6-06d4037480b\",\"offset\":0}",
  "params": "{\"pattern\":\"scoreLevel|scoreLabel|0\\\\.6|0\\\\.35\",\"glob\":\"**/*.{ts,tsx,md}\",\"caseInsensitive\":false}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

正在确认PRD文档中的预期分数范围，并检查生产检索路径中分数的使用方式。

分数并非Qdrant原始余弦相似度。它经过RRF重排序，公式为1/(60+rank+1)，再与词法重叠加权。中文文本因按空格切分导致词法重叠失效。当前阈值0.6/0.35是为不同量级设计的，而RRF输出约0.01-0.05。开发环境的嵌入模型是简单的本地确定性实现，非真实语义模型。
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/docs/PRD_业务需求文档_v1.0.md\",\"offset\":370,\"limit\":50}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/docs/PRD_业务需求文档_v1.0.md\",\"offset\":370,\"limit\":50,\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/docs/PRD_业务需求文档_v1.0.md\"}",
  "result": "{\"contents\":\"\\n---\\n\\n#### 4.1.5 向量检索测试（语义检索测试）\\n\\n> 菜单名称保留「向量检索测试」；功能本质为验证**语义检索**质量，即用户自然语言能否正确匹配到表/字段。\\n\\n**输入条件**\\n\\n- 智能查询库中已有纳入的表/字段及业务语义维护。\\n- 管理员输入一条或多条模拟用户问题。\\n\\n**处理规则**\\n\\n- 管理员点击「开始测试」后，系统对输入问题执行与用户端一致的语义检索逻辑。\\n- 展示匹配到的表/字段列表，按相似度从高到低排序。\\n- 每条结果展示：表名、字段名、业务中文名、相似度等级（高/中/低）及简要匹配理由（业务可读描述，如「问题中的『销售额』命中字段同义词『销售金额』」）。\\n- 不触发完整 SQL 或报表生成，仅验证检索环节。\\n- 管理员可修改问题后重复测试，无需离开本页。\\n\\n**输出结果**\\n\\n- Top-N（默认 10）匹配结果列表。\\n- 若无有效匹配，展示「未找到相关表/字段」及建议（如「请检查是否已纳入智能查询库」「请补充同义词」）。\\n\\n**界面交互规则**\\n\\n- 页面布局：上方模拟问题输入框 +「开始测试」按钮；下方结果列表。\\n- 支持保存测试问题为「检索测试用例」，供后续回归使用（可选，首版建议支持）。\\n- 结果区提供「复制检索结果摘要」便于沟通。\\n\\n---\\n\\n#### 4.1.6 离线评估\\n\\n**输入条件**\\n\\n- 管理员已准备或选用一套**离线评估集**。\\n- 评估集中每条用例包含：标准问题、期望涉及的表（可选）、期望答案要点（可选）。\\n\\n**处理规则**\\n\\n- 管理员可创建、编辑、导入评估集；可复用系统预置的基础评估集。\\n- 管理员选择评估集后点击「开始评估」，系统对集内问题批量执行：语义检索 → 生成 SQL 或报表（按用例指定模式）→ 与期望要点比对。\\n- 评估过程中展示进度条及当前处理条数；支持取消运行。\\n- 评估完成后生成**评估报告**，包含：\\n  - 整体命中率（检索命中期望表的比例）\\n  - 生成成功率\\n  - 低分/未命中样本列表（可逐条展开查看问题、系统输出、期望要点、差异说明）\\n  - 与线上近期表现的一致性摘要（业务描述，如「80% 低分样本集中在订单域」）\",\"totalLinesInFile\":874}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"retrieve|rag|score\",\"glob\":\"packages/workflow/**/*.ts\",\"caseInsensitive\":false,\"headLimit\":30,\"multiline\":false,\"toolCallId\":\"tool_cba0daf2-6fcd-4ece-9d38-d8f5b8a7d3a\",\"offset\":0}",
  "params": "{\"pattern\":\"retrieve|rag|score\",\"glob\":\"packages/workflow/**/*.ts\",\"caseInsensitive\":false}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"ragQualityGate|minRagScore|weightedScore\",\"glob\":\"packages/workflow/**/*.ts\",\"caseInsensitive\":false,\"multiline\":false,\"toolCallId\":\"tool_84efa27c-e64a-4127-8a2e-4ec1b7eec33\",\"offset\":0}",
  "params": "{\"pattern\":\"ragQualityGate|minRagScore|weightedScore\",\"glob\":\"packages/workflow/**/*.ts\",\"caseInsensitive\":false}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/workflow/src/rag-utils.ts\"}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/workflow/src/rag-utils.ts\",\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/workflow/src/rag-utils.ts\"}",
  "result": "{\"contents\":\"import type { RetrieveResult } from '@hermes/contracts';\\n\\nexport function mergeRetrieveResults(...sets: RetrieveResult[][]): RetrieveResult[] {\\n  const map = new Map<string, RetrieveResult>();\\n  for (const set of sets) {\\n    for (const item of set) {\\n      const prev = map.get(item.id);\\n      if (!prev || item.score > prev.score) map.set(item.id, item);\\n    }\\n  }\\n  return [...map.values()].sort((a, b) => b.score - a.score);\\n}\\n\\nexport function computeRagScore(schemaContext: RetrieveResult[], businessKnowledge: RetrieveResult[]): number {\\n  const metaScore = schemaContext[0]?.score ?? 0;\\n  const bizScore = businessKnowledge[0]?.score ?? 0;\\n  return metaScore * 0.7 + bizScore * 0.3;\\n}\\n\",\"totalLinesInFile\":19}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/workflow/src/nodes.ts\",\"offset\":130,\"limit\":80}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/workflow/src/nodes.ts\",\"offset\":130,\"limit\":80,\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/packages/workflow/src/nodes.ts\"}",
  "result": "{\"contents\":\"\\n  if (state.ragQueries?.length || state.hydeUsed) {\\n    return { currentNode: 'RagPrepare' };\\n  }\\n\\n  const queries = await deps.llm.rewriteQueries({ query: state.query, mode: state.mode });\\n  return { ragQueries: queries, currentNode: 'RagPrepare' };\\n}\\n\\nexport async function ragRetrieveNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {\\n  const hit = interrupted(state, deps);\\n  if (hit) return hit;\\n\\n  emitPhase(deps, 'retrieving');\\n  deps.emit({ type: 'chunk', content: '正在检索相关数据表…\\\\n' });\\n\\n  const searchQueries = state.ragSearchQuery\\n    ? [state.ragSearchQuery]\\n    : state.ragQueries.length > 0\\n      ? state.ragQueries\\n      : [state.query];\\n\\n  const metaSets: RetrieveResult[][] = [];\\n  const bizSets: RetrieveResult[][] = [];\\n  const tplSets: RetrieveResult[][] = [];\\n\\n  for (const q of searchQueries) {\\n    const batch = await retrieveAllCollections(deps, q, state.mode);\\n    metaSets.push(batch.metadata);\\n    bizSets.push(batch.business);\\n    tplSets.push(batch.templates);\\n  }\\n\\n  return {\\n    schemaContext: mergeRetrieveResults(...metaSets),\\n    businessKnowledge: mergeRetrieveResults(...bizSets),\\n    templateExamples: mergeRetrieveResults(...tplSets),\\n    ragLoopCount: state.ragLoopCount + 1,\\n    ragSearchQuery: undefined,\\n    currentNode: 'RagRetrieve',\\n    currentPhase: 'retrieving',\\n  };\\n}\\n\\nexport async function ragQualityGateNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {\\n  const hit = interrupted(state, deps);\\n  if (hit) return hit;\\n\\n  const ragScore = computeRagScore(state.schemaContext, state.businessKnowledge);\\n\\n  if (ragScore >= state.minRagScore) {\\n    return { ragScore, currentNode: 'RagQualityGate' };\\n  }\\n\\n  if (!state.hydeUsed) {\\n    const draft = await deps.llm.generateHydeDraft({ query: state.query, mode: state.mode });\\n    return {\\n      ragScore,\\n      hydeUsed: true,\\n      ragSearchQuery: draft,\\n      currentNode: 'RagQualityGate',\\n    };\\n  }\\n\\n  if (state.ragLoopCount >= state.maxRagLoops) {\\n    return {\\n      ragScore,\\n      refuseReason: '未能在智能查询库中找到足够相关的知识，请换一种说法或联系数据管理员补充元数据。',\\n      intent: 'refuse',\\n      currentNode: 'RagQualityGate',\\n    };\\n  }\\n\\n  return { ragScore, currentNode: 'RagQualityGate' };\\n}\\n\\nexport async function generateSqlNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {\\n  const hit = interrupted(state, deps);\\n  if (hit) return hit;\\n\",\"totalLinesInFile\":487}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"matchReason\",\"glob\":\"apps/rag-service/**/*\",\"caseInsensitive\":false,\"multiline\":false,\"toolCallId\":\"tool_4f7251fb-367c-4d9e-aad2-b77276dc1c9\",\"offset\":0}",
  "params": "{\"pattern\":\"matchReason\",\"glob\":\"apps/rag-service/**/*\",\"caseInsensitive\":false}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

发现工作流的 minRagScore 阈值为 0.35，但 RRF 分数通常仅在 0.01–0.03 之间。这解释了为何返回分数普遍偏低。

computeRagScore 的加权公式是 metaScore × 0.7 + bizScore × 0.3。即使两个分值都是 0.016，最终 ragScore 也只有 0.016。这远低于 0.35 的阈值，质量门控几乎必然触发 HyDE 或直接拒绝。

即使检索结果在 rank 0 并获得完美词法匹配，最终 ragScore 仍约为 0.323。这依然低于 0.35 的阈值。因此当前公式下，系统几乎无法通过质量门控。

进一步确认，即使检索结果在 rank 0 并获得完美词法匹配，最终 ragScore 也仅约 0.323，依然低于 0.35 的阈值。若关闭 rerank，纯 RRF 分数甚至更低。这说明系统存在根本性的分数尺度错配，而非个别异常。

进一步排查了分数能否通过多路融合或重复命中提升。即使同一文档同时出现在 bm25 和向量检索的 rank 0，RRF 也仅累加至 2/61。mergeRetrieveResults 按文档 ID 取最大分而非求和，且每个文档 ID 在每条列表中只出现一次。因此现有机制下，分数难以突破 0.03 范围。

进一步确认检索服务中，每轮查询最多只有 bm25 与向量两路检索，因此 RRF 最大值被严格限制在 2/61 约 0.0328。用户反馈的分数过低，既有 RRF 公式本身的设计局限，也存在与高/中/低阈值的系统性错配。

另外，中文文本经空格切分后往往只剩一个整体 token。这意味着词法重排中的 overlap 计算对中文查询极其宽松，只有内容完全包含该整串词时才会产生匹配，进一步压缩了有效分值的分布空间。
</details>

<details>
<summary>Tool: read_file_v2</summary>

```json
{
  "rawArgs": "{\"path\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/services/index-pipeline.ts\",\"limit\":80}",
  "params": "{\"targetFile\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/services/index-pipeline.ts\",\"limit\":80,\"charsLimit\":1000000,\"effectiveUri\":\"/Users/dezliu/Documents/mine/repo/nl-hermes/apps/rag-service/src/services/index-pipeline.ts\"}",
  "result": "{\"contents\":\"import type { Logger } from '@hermes/shared';\\nimport { getServiceAuthHeaders, HTTP_HEADERS, QDRANT_COLLECTIONS, OPENSEARCH_INDICES } from '@hermes/shared';\\nimport { embedText } from '../lib/embedding.js';\\nimport { OpenSearchClient } from '../lib/opensearch.js';\\nimport { QdrantClient } from '../lib/qdrant.js';\\n\\ntype QueryLibraryField = {\\n  id: string;\\n  tableId: string;\\n  physicalName: string;\\n  businessName?: string;\\n  description?: string;\\n  dataType: string;\\n  tablePhysicalName: string;\\n  tableBusinessName?: string;\\n  synonyms?: { synonym: string }[];\\n};\\n\\nexport class IndexPipelineService {\\n  constructor(\\n    private readonly os: OpenSearchClient,\\n    private readonly qdrant: QdrantClient,\\n    private readonly logger: Logger,\\n    private readonly metadataUrl = process.env.METADATA_SERVICE_URL ?? 'http://localhost:4050',\\n  ) {}\\n\\n  private authHeaders(traceId?: string): Record<string, string> {\\n    return {\\n      ...getServiceAuthHeaders('rag-service'),\\n      ...(traceId ? { [HTTP_HEADERS.TRACE_ID]: traceId } : {}),\\n    };\\n  }\\n\\n  private async fetchQueryLibrary(): Promise<QueryLibraryField[]> {\\n    const res = await fetch(`${this.metadataUrl}/v1/meta/query-library`, {\\n      headers: this.authHeaders(),\\n    });\\n    if (!res.ok) throw new Error(`Failed to fetch query library: ${res.status}`);\\n    const data = (await res.json()) as { items: QueryLibraryField[] };\\n    return data.items ?? [];\\n  }\\n\\n  private buildMetadataDocs(fields: QueryLibraryField[]) {\\n    return fields.map((f) => {\\n      const synonymText = (f.synonyms ?? []).map((s) => s.synonym).join(' ');\\n      const content = [\\n        f.tablePhysicalName,\\n        f.tableBusinessName,\\n        f.physicalName,\\n        f.businessName,\\n        f.description,\\n        f.dataType,\\n        synonymText,\\n      ].filter(Boolean).join(' ');\\n      return {\\n        id: f.id,\\n        content,\\n        metadata: {\\n          tableId: f.tableId,\\n          tableName: f.tablePhysicalName,\\n          fieldName: f.physicalName,\\n          type: 'field',\\n        },\\n      };\\n    });\\n  }\\n\\n  async rebuildMetadata(traceId?: string) {\\n    const fields = await this.fetchQueryLibrary();\\n    const docs = this.buildMetadataDocs(fields);\\n    const points = docs.map((d) => ({\\n      id: d.id,\\n      vector: embedText(d.content),\\n      payload: { content: d.content, metadata: d.metadata },\\n    }));\\n\\n    await Promise.all([\\n      this.os.bulkIndex(OPENSEARCH_INDICES.METADATA, docs),\\n      this.qdrant.upsertPoints(QDRANT_COLLECTIONS.METADATA, points),\\n    ]);\",\"totalLinesInFile\":160}",
  "status": "completed"
}
```
</details>

<details>
<summary>Tool: ripgrep_raw_search</summary>

```json
{
  "rawArgs": "{\"pattern\":\"已结算|settle\",\"glob\":\"scripts/settle/**\",\"caseInsensitive\":false,\"multiline\":false,\"toolCallId\":\"tool_f8408787-fb34-43ee-a6a0-e9252971d21\",\"offset\":0}",
  "params": "{\"pattern\":\"已结算|settle\",\"glob\":\"scripts/settle/**\",\"caseInsensitive\":false}",
  "status": "completed"
}
```
</details>

<details>
<summary>Thinking</summary>

已确认业务知识库中存在"已结算账单查询"的相关条目。
</details>

## 结论先说

页面上看到的 `score` **不是 Qdrant 的余弦相似度**，也**不是 BM25 原始分**。它是 **RRF（Reciprocal Rank Fusion）排名融合分**，再叠加一层简单的**词面重排**，所以出现 `0.01`、`0.02`、`0.03` 是**当前实现的正常现象**，不代表「匹配度只有 1%～3%」。

对你输入「已结算账单」这类**无空格中文**，词面重排几乎帮不上忙，分数会更接近纯 RRF 值，看起来就会特别低。

---

## 完整计算链路

向量检索测试页调用的是 `rag-service` 的 `/v1/retrieve`，和用户端 workflow 用的是同一套逻辑：

```21:28:apps/web-admin/app/search-test/page.tsx
  const onSearch = async () => {
    ...
      const data = await ragApi.retrieve({ query, collection, topK: 10 });
      setResults(data.results);
```

### 第 1 步：双路召回（分数此时还未用于最终展示）

并行做两路检索：

1. **BM25**（OpenSearch）→ 返回 `_score`
2. **向量检索**（Qdrant，Cosine）→ 返回 `score`（余弦相似度，通常 0.x～0.9）

```47:50:apps/rag-service/src/services/retrieve-service.ts
    const [bm25Hits, vectorHits] = await Promise.all([
      this.os.search(indexName, req.query, settings.bm25TopK),
      this.qdrant.search(collectionName, queryVector, settings.vectorTopK),
    ]);
```

**关键点：这两路的原始分数在下一步会被丢弃，只用排名。**

### 第 2 步：RRF 融合（决定 score 的量级）

RRF 公式：

```
rrfScore = 1 / (k + rank + 1)
```

默认 `k = 60`，`rank` 从 0 开始（第一名 rank=0）：

| 情况 | 计算 | 分数 |
|------|------|------|
| 只在 BM25 排第 1 | 1/(60+0+1) | **≈ 0.0164** |
| 只在向量路排第 1 | 1/(60+0+1) | **≈ 0.0164** |
| 两路都排第 1 | 2/61 | **≈ 0.0328** |
| 排第 5 | 1/66 | **≈ 0.0152** |

```17:19:apps/rag-service/src/services/fusion.ts
    list.hits.forEach((hit, rank) => {
      const rrfScore = 1 / (k + rank + 1);
```

所以 RRF 分天然就在 **0.01～0.03** 区间，**与 Qdrant 返回的 0.7、0.8 无关**。

### 第 3 步：词面重排（默认开启）

默认 `enableRerank: true`，最终分数：

```
finalScore = rrfScore × 0.7 + lexical × 0.3
```

其中 `lexical` 是 query 与 content 按**空格分词**后的 token 重叠率：

```39:49:apps/rag-service/src/services/fusion.ts
export function rerankByQuery(query: string, docs: RankedDoc[], topK: number): RetrieveResult[] {
  const qTokens = new Set(query.toLowerCase().split(/\s+/).filter(Boolean));
  ...
    const lexical = overlap / Math.max(qTokens.size, 1);
    const finalScore = doc.score * 0.7 + lexical * 0.3;
```

对「已结算账单」：

- 没有空格 → `qTokens = {"已结算账单"}`（整句当一个 token）
-  Error: Tool execution failed: No CodeGraph project is loaded for this session.
Searched for a .codegraph/ directory starting from: /Users/dezliu/Documents/mine/repo/nl-hermes
The index is likely fine — this is a working-directory detection issue: the MCP client launched the server outside your project and didn't report the workspace root. Fix it either way:
  • Pass projectPath to the tool call, e.g. projectPath: "/absolute/path/to/your/project"
  • Or add --path to the server's MCP config args: ["serve", "--mcp", "--path", "/absolute/path/to/your/project"]
content 也是中文无空格 → 通常 `lexical = 0`

因此你看到的分数大致是：

```
0.016 × 0.7 ≈ 0.011   （单路命中）
0.033 × 0.7 ≈ 0.023   （BM25 + 向量双路都排前面）
```

这就是 **0.0x** 的来源。

### 第 4 步：前端展示等级

```145:148:apps/web-admin/lib/api.ts
export function scoreLabel(score: number): '高' | '中' | '低' {
  if (score >= 0.6) return '高';
  if (score >= 0.35) return '中';
  return '低';
}
```

阈值是按 **0～1 相似度** 设计的（比如余弦 0.6 = 高），但 RRF 分最高理论值大约：

```
max ≈ (2/61) × 0.7 + 1.0 × 0.3 ≈ 0.323
```

**永远到不了 0.35**，所以页面上几乎永远是「低」。

---

## 和你这个 query 的关系

「已结算账单」在 seed 数据里，业务知识库有一条：

```83:85:scripts/settle/business-knowledge.json
    "title": "已结算账单查询",
    ...
    "content": "查询已结算账单：SELECT * FROM hst_bill WHERE bill_status=13。..."
```

如果你在 **业务知识库** collection 里搜，**排序靠前**说明检索本身是有效的；**分数低**主要是 score 定义问题，不是没匹配到。

另外，当前 embedding 是本地 dev 用的简易向量（64 维字符 hash），不是真实语义模型：

```3:14:apps/rag-service/src/lib/embedding.js
/** Deterministic local embedding for dev/test when no external model is configured */
export function embedText(text: string, dimensions = DIM): number[] {
  ...
}
```

向量路的语义能力也有限，BM25 对中文短 query 往往更靠得住。

---

## 怎么理解结果（现阶段）

| 看什么 | 含义 |
|--------|------|
| **排序顺序** | 相对相关性，排越前越相关 |
| **matchReason** | 如 `bm25+vector+rerank` 表示两路都召回并做了重排 |
| **score 绝对值** | 当前实现下**不能**当「相似度百分比」理解 |
| **高/中/低 Tag** | 与 RRF 分数尺度不匹配，参考价值有限 |

---

## 为什么这样设计（以及问题在哪）

RRF 的设计意图是：**融合多路召回的排名，不依赖各路分数尺度**（BM25 分和余弦分不可比）。这在检索系统里是常见做法。

但当前实现有两处尺度不一致：

1. **展示层**仍用 0.6 / 0.35 当「相似度等级」
2. **workflow 质量门** `minRagScore = 0.35` 也假设分数能到 0.35 以上

```14:17:packages/workflow/src/rag-utils.ts
export function computeRagScore(...) {
  const metaScore = schemaContext[0]?.score ?? 0;
  const bizScore = businessKnowledge[0]?.score ?? 0;
  return metaScore * 0.7 + bizScore * 0.3;
}
```

按 RRF 尺度，top1 大约 0.01～0.03，**几乎不可能通过 0.35 门槛**（除非走 HyDE 扩写等旁路）。

---

## 若希望分数「看起来正常」

需要改实现（Ask 模式下我只能说明方向）：

1. **展示用归一化分**：例如 `displayScore = rrfScore / maxPossibleRrfScore`，映射到 0～1
2. **展示原始子分数**：分别显示 `vectorScore`（Qdrant 余弦）、`bm25Score`、`rrfScore`
3. **中文分词重排**：用 jieba 等替代 `split(/\s+/)`，「已结算账单」才能拆词匹配
4. **统一阈值体系**：把 `scoreLabel`、`minRagScore`、监控低分阈值改成与 RRF 尺度一致
5. **接入真实 embedding 模型**：替换 dev 版 `embedText`

---

**总结**：你看到的 0.0x 不是 bug，而是 **RRF 排名分的数学特性 + 中文词面重排失效 + 展示阈值未对齐** 叠加的结果。判断检索效果应优先看**排序**和 **matchReason 来源**，不要按 score 绝对值理解成「只有百分之几的相似度」。

如果你希望，我可以在 Agent 模式下帮你改一版：比如 UI 展示 Qdrant 原始余弦分，或把 RRF 分归一化到 0～100% 再显示等级。
