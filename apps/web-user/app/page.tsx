'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Collapse,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Spin,
  Steps,
  Typography,
  message,
} from 'antd';
import type { ChatStreamEvent, ConversationMessageRecord, ConversationSummary, ReportArtifact, ReportSpec, TemplateMatchResult } from '@hermes/contracts';
import {
  PHASE_LABEL,
  TEMPLATE_MATCH_DEBOUNCE_MS,
  buildTemplatePrompt,
  formatConversationTime,
  parseSseEvent,
  pickTopTemplate,
  toTemplateParameters,
  type Phase,
  type WorkflowStep,
} from './chat-utils';
import {
  listDatasources,
  loadStoredDatasourceId,
  storeDatasourceId,
  type DatasourceSummary,
} from './api';
import { ReportViewer } from '../components/ReportViewer';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  steps?: WorkflowStep[];
  status?: 'completed' | 'interrupted' | 'failed';
  phase?: Phase;
  feedbackRating?: 'up' | 'down' | null;
  reportSpec?: ReportSpec;
  reportArtifact?: ReportArtifact;
};

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? 'http://localhost:4000/graphql';
const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL ?? 'http://localhost:4000/api/chat/stream';
const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? 'demo-user';

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  return json.data as T;
}

export default function ChatPage() {
  const [mode, setMode] = useState<'sql' | 'report'>('sql');
  const [outputFormat, setOutputFormat] = useState<'inline' | 'web' | 'word'>('inline');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [templateSuggestion, setTemplateSuggestion] = useState<TemplateMatchResult | null>(null);
  const [templateDismissed, setTemplateDismissed] = useState(false);
  const [paramModalOpen, setParamModalOpen] = useState(false);
  const [paramForm] = Form.useForm<Record<string, string>>();
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackTargetId, setFeedbackTargetId] = useState<string | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [feedbackRequireReason, setFeedbackRequireReason] = useState(false);
  const [templateDetail, setTemplateDetail] = useState<{ placeholders: string[]; name: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [datasources, setDatasources] = useState<DatasourceSummary[]>([]);
  const [selectedDatasourceId, setSelectedDatasourceId] = useState<string | undefined>();
  const [datasourcesLoading, setDatasourcesLoading] = useState(false);

  const runRef = useRef<{ runId: string; conversationId: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const matchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const phaseLabel = useMemo(() => (phase === 'idle' ? '' : PHASE_LABEL[phase]), [phase]);
  const templatePrompt = useMemo(() => buildTemplatePrompt(mode), [mode]);

  const refreshConversations = useCallback(async () => {
    try {
      const data = await gql<{ conversations: ConversationSummary[] }>(
        `query Conversations($userId: ID!) { conversations(userId: $userId) { id title mode lastActiveAt } }`,
        { userId: DEMO_USER_ID },
      );
      setConversations(data.conversations);
    } catch {
      // ignore sidebar refresh errors
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    void (async () => {
      setDatasourcesLoading(true);
      try {
        const items = await listDatasources();
        setDatasources(items);
        const stored = loadStoredDatasourceId();
        const envDefault = process.env.NEXT_PUBLIC_DEFAULT_DATASOURCE_ID;
        const preferred = [stored, envDefault].find((id) => id && items.some((d) => d.id === id));
        setSelectedDatasourceId(preferred ?? items[0]?.id);
      } catch {
        // 数据源列表加载失败时由后端自动解析
      } finally {
        setDatasourcesLoading(false);
      }
    })();
  }, []);

  const handleDatasourceChange = useCallback((value: string | undefined) => {
    setSelectedDatasourceId(value);
    storeDatasourceId(value);
  }, []);

  const handleNewConversation = useCallback(() => {
    if (streaming) {
      message.warning('请等待当前生成完成');
      return;
    }
    setConversationId(undefined);
    setMessages([]);
    setInput('');
    setPhase('idle');
    setTemplateSuggestion(null);
    setTemplateDismissed(false);
  }, [streaming]);

  useEffect(() => {
    if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
    setTemplateSuggestion(null);
    setTemplateDismissed(false);

    const query = input.trim();
    if (!query || streaming) return;

    matchTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const data = await gql<{ matchTemplates: TemplateMatchResult[] }>(
            `query Match($userId: ID!, $query: String!, $mode: GenerationMode!) {
              matchTemplates(userId: $userId, query: $query, mode: $mode) {
                id name scenarioDescription score type
              }
            }`,
            { userId: DEMO_USER_ID, query, mode },
          );
          if (!templateDismissed) {
            setTemplateSuggestion(pickTopTemplate(data.matchTemplates));
          }
        } catch {
          setTemplateSuggestion(null);
        }
      })();
    }, TEMPLATE_MATCH_DEBOUNCE_MS);

    return () => {
      if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
    };
  }, [input, mode, streaming, templateDismissed]);

  const appendAssistant = useCallback((patch: Partial<ChatMessage> & { id: string }) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === patch.id);
      if (idx < 0) return [...prev, { role: 'assistant', content: '', ...patch }];
      const next = [...prev];
      next[idx] = { ...next[idx]!, ...patch };
      return next;
    });
  }, []);

  const runStream = useCallback(
    async (opts: {
      query: string;
      templateId?: string;
      templateType?: 'sql' | 'report';
      templateParameters?: Record<string, string>;
    }) => {
      const assistantId = `a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', thinking: '', steps: [], phase: 'understanding' },
      ]);
      setStreaming(true);
      setPhase('understanding');
      setTemplateSuggestion(null);

      try {
        const start = await gql<{
          startChat: { runId: string; conversationId: string; checkpointId: string };
        }>(
          `mutation Start($input: StartChatInput!) {
            startChat(input: $input) { runId conversationId checkpointId }
          }`,
          {
            input: {
              userId: DEMO_USER_ID,
              conversationId,
              query: opts.query,
              mode,
              datasourceId: selectedDatasourceId,
              templateId: opts.templateId,
              templateType: opts.templateType,
              templateParameters: opts.templateParameters
                ? Object.entries(opts.templateParameters).map(([key, value]) => ({ key, value }))
                : undefined,
              outputFormat: mode === 'report' ? outputFormat : undefined,
            },
          },
        );

        const { runId, conversationId: cid } = start.startChat;
        setConversationId(cid);
        runRef.current = { runId, conversationId: cid };

        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch(STREAM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId,
            userId: DEMO_USER_ID,
            conversationId: cid,
            query: opts.query,
            mode,
            datasourceId: selectedDatasourceId,
            templateId: opts.templateId,
            templateType: opts.templateType,
            templateParameters: opts.templateParameters,
            outputFormat: mode === 'report' ? outputFormat : undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error('流式连接失败');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            const event = parseSseEvent(part) as ChatStreamEvent | null;
            if (!event) continue;
            if (event.type === 'phase') {
              setPhase(event.phase);
              appendAssistant({ id: assistantId, phase: event.phase });
            } else if (event.type === 'step') {
              setMessages((prev) => {
                const idx = prev.findIndex((m) => m.id === assistantId);
                if (idx < 0) return prev;
                const next = [...prev];
                const steps = [...(next[idx]!.steps ?? []), { step: event.step, detail: event.detail }];
                next[idx] = { ...next[idx]!, steps };
                return next;
              });
            } else if (event.type === 'thinking') {
              if (!event.done) {
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === assistantId);
                  if (idx < 0) return prev;
                  const next = [...prev];
                  next[idx] = {
                    ...next[idx]!,
                    thinking: (next[idx]!.thinking ?? '') + event.content,
                  };
                  return next;
                });
              }
            } else if (event.type === 'chunk') {
              setMessages((prev) => {
                const idx = prev.findIndex((m) => m.id === assistantId);
                if (idx < 0) return prev;
                const next = [...prev];
                next[idx] = { ...next[idx]!, content: next[idx]!.content + event.content };
                return next;
              });
            } else if (event.type === 'report_preview') {
              appendAssistant({ id: assistantId, reportSpec: event.spec });
            } else if (event.type === 'artifact_ready') {
              appendAssistant({ id: assistantId, reportArtifact: event.artifact });
            } else if (event.type === 'done') {
              setMessages((prev) => {
                const idx = prev.findIndex((m) => m.id === assistantId);
                if (idx < 0) return prev;
                const current = prev[idx]!;
                const mergedContent =
                  event.status === 'failed' && current.content.trim()
                    ? current.content
                    : event.content || current.content;
                const meta = event.metadata as { reportSpec?: ReportSpec; reportArtifact?: ReportArtifact } | undefined;
                const next = [...prev];
                next[idx] = {
                  ...current,
                  id: event.messageId ?? current.id,
                  content: mergedContent,
                  status: event.status,
                  phase: 'idle',
                  reportSpec: current.reportSpec ?? meta?.reportSpec,
                  reportArtifact: current.reportArtifact ?? meta?.reportArtifact,
                };
                return next;
              });
              setPhase('idle');
            } else if (event.type === 'error') {
              message.error(event.message);
            }
          }
        }

        await refreshConversations();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          message.error(err instanceof Error ? err.message : '发送失败');
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
        runRef.current = null;
        setPhase('idle');
      }
    },
    [appendAssistant, conversationId, mode, outputFormat, refreshConversations, selectedDatasourceId],
  );

  const handleSend = useCallback(async () => {
    const query = input.trim();
    if (!query || streaming) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTemplateDismissed(true);
    await runStream({ query });
  }, [input, runStream, streaming]);

  const handleApplyTemplate = useCallback(async () => {
    if (!templateSuggestion) return;
    try {
      const data = await gql<{ templateDetail: { placeholders: string[]; name: string } | null }>(
        `query Detail($id: ID!, $type: GenerationMode!) {
          templateDetail(id: $id, type: $type) { placeholders name }
        }`,
        { id: templateSuggestion.id, type: templateSuggestion.type },
      );
      if (!data.templateDetail) {
        message.error('模板详情加载失败');
        return;
      }
      setTemplateDetail(data.templateDetail);
      paramForm.resetFields();
      setParamModalOpen(true);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '模板详情加载失败');
    }
  }, [paramForm, templateSuggestion]);

  const handleConfirmApply = useCallback(async () => {
    if (!templateSuggestion) return;
    const values = await paramForm.validateFields();
    const templateParameters = toTemplateParameters(
      Object.entries(values).map(([key, value]) => ({ key, value: String(value ?? '') })),
    );
    setParamModalOpen(false);
    setTemplateDismissed(true);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: `[套用模板] ${templateSuggestion.name}\n${input.trim() || templateSuggestion.scenarioDescription}`,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    await runStream({
      query: input.trim() || templateSuggestion.scenarioDescription,
      templateId: templateSuggestion.id,
      templateType: templateSuggestion.type,
      templateParameters,
    });
  }, [input, paramForm, runStream, templateSuggestion]);

  const handleStop = useCallback(async () => {
    abortRef.current?.abort();
    const run = runRef.current;
    if (!run) return;
    try {
      await gql(
        `mutation Cancel($input: CancelGenerationInput!) { cancelGeneration(input: $input) }`,
        { input: { userId: DEMO_USER_ID, runId: run.runId, conversationId: run.conversationId } },
      );
      message.info('已请求停止生成');
    } catch {
      // ignore
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    if (streaming) {
      message.warning('请等待当前生成完成');
      return;
    }
    try {
      const data = await gql<{ conversationMessages: ConversationMessageRecord[] }>(
        `query Messages($userId: ID!, $conversationId: ID!) {
          conversationMessages(userId: $userId, conversationId: $conversationId) {
            id role content mode status feedbackRating metadata
          }
        }`,
        { userId: DEMO_USER_ID, conversationId: id },
      );
      setConversationId(id);
      setMessages(
        data.conversationMessages.map((m) => {
          let meta: Record<string, unknown> | null = null;
          if (m.metadata) {
            try {
              meta = JSON.parse(m.metadata as unknown as string) as Record<string, unknown>;
            } catch {
              meta = m.metadata as unknown as Record<string, unknown>;
            }
          }
          return {
            id: m.id,
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
            status: m.status,
            feedbackRating: m.feedbackRating,
            reportSpec: meta?.reportSpec as ReportSpec | undefined,
            reportArtifact: meta?.reportArtifact as ReportArtifact | undefined,
          };
        }),
      );
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载会话失败');
    }
  }, [streaming]);

  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    try {
      await gql(
        `mutation Rename($input: RenameConversationInput!) {
          renameConversation(input: $input) { id title mode lastActiveAt }
        }`,
        { input: { userId: DEMO_USER_ID, conversationId: id, title } },
      );
      setRenamingId(null);
      await refreshConversations();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '重命名失败');
    }
  }, [refreshConversations]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await gql(
        `mutation Delete($input: DeleteConversationInput!) { deleteConversation(input: $input) }`,
        { input: { userId: DEMO_USER_ID, conversationId: id } },
      );
      if (conversationId === id) {
        setConversationId(undefined);
        setMessages([]);
      }
      await refreshConversations();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败');
    }
  }, [conversationId, refreshConversations]);

  const handleFeedback = useCallback(async (messageId: string, rating: 'up' | 'down', reason?: string) => {
    try {
      await gql(
        `mutation Feedback($input: SubmitFeedbackInput!) { submitMessageFeedback(input: $input) }`,
        { input: { userId: DEMO_USER_ID, messageId, rating, reason } },
      );
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedbackRating: rating } : m)));
      message.success(rating === 'down' ? '感谢反馈，管理员将跟进优化' : '感谢反馈');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '反馈提交失败');
    }
  }, []);

  const openFeedbackDown = useCallback((messageId: string, requireReason: boolean) => {
    setFeedbackTargetId(messageId);
    setFeedbackRequireReason(requireReason);
    setFeedbackReason('');
    setFeedbackModalOpen(true);
  }, []);

  const submitFeedbackDown = useCallback(async () => {
    if (!feedbackTargetId) return;
    if (feedbackRequireReason && !feedbackReason.trim()) {
      message.warning('请填写不满意原因');
      return;
    }
    await handleFeedback(feedbackTargetId, 'down', feedbackReason.trim() || undefined);
    setFeedbackModalOpen(false);
    setFeedbackTargetId(null);
  }, [feedbackTargetId, feedbackReason, feedbackRequireReason, handleFeedback]);

  return (
    <div className="user-workspace">
      <aside className="history-panel">
        <div className="history-header">
          <h2>历史会话</h2>
          <Button className="new-chat-btn" type="primary" onClick={handleNewConversation} disabled={streaming}>
            + 新对话
          </Button>
        </div>
        {conversations.length === 0 ? (
          <div style={{ padding: 16 }}>
            <Empty description="开始您的第一次数据提问吧" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <div className="history-list">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`history-item${conversationId === c.id ? ' active' : ''}`}
                onClick={() => void loadConversation(c.id)}
              >
                {renamingId === c.id ? (
                  <Input
                    size="small"
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onPressEnter={() => void handleRenameConversation(c.id, renameValue)}
                    onBlur={() => setRenamingId(null)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="history-item-title">{c.title}</div>
                    <div className="history-item-time">
                      {formatConversationTime(c.lastActiveAt)} · {c.mode === 'sql' ? 'SQL' : '报表'}
                    </div>
                  </>
                )}
                <Space size={4} style={{ marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      setRenamingId(c.id);
                      setRenameValue(c.title);
                    }}
                  >
                    重命名
                  </Button>
                  <Popconfirm
                    title="删除后无法恢复，确认删除该会话？"
                    okText="删除"
                    cancelText="取消"
                    onConfirm={() => void handleDeleteConversation(c.id)}
                  >
                    <Button size="small" type="link" danger>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </div>
        )}
      </aside>

      <main className="chat-area">
        <div className="chat-header">
          <div>
            <h1>有什么数据想查？</h1>
            <p className="chat-header-desc">自然语言生成 SQL / 报表，模板推荐与满意度反馈</p>
          </div>
          <Space wrap>
            <Select
              allowClear
              showSearch
              placeholder="选择数据源（可选）"
              loading={datasourcesLoading}
              style={{ minWidth: 220 }}
              value={selectedDatasourceId}
              optionFilterProp="label"
              onChange={(value) => handleDatasourceChange(value)}
              options={datasources.map((d) => ({
                value: d.id,
                label: d.name,
              }))}
            />
            <Segmented
              value={mode}
              onChange={(v) => setMode(v as 'sql' | 'report')}
              options={[
                { label: 'SQL 模式', value: 'sql' },
                { label: '报表模式', value: 'report' },
              ]}
            />
            {mode === 'report' && (
              <Select
                value={outputFormat}
                style={{ minWidth: 140 }}
                onChange={(v) => setOutputFormat(v)}
                options={[
                  { value: 'inline', label: '内嵌图表' },
                  { value: 'web', label: '网页报告' },
                  { value: 'word', label: 'Word 文档' },
                ]}
              />
            )}
          </Space>
        </div>

        <div className="chat-body">
          {templateSuggestion && !templateDismissed && !streaming && (
            <div className="template-card">
              <div className="template-card-content">
                <h3>{templatePrompt}</h3>
                <Text strong>{templateSuggestion.name}</Text>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                  {templateSuggestion.scenarioDescription}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  匹配度 {(templateSuggestion.score * 100).toFixed(0)}%
                </Text>
              </div>
              <Space>
                <Button onClick={() => setTemplateDismissed(true)}>忽略</Button>
                <Button type="primary" onClick={() => void handleApplyTemplate()}>
                  套用模板
                </Button>
              </Space>
            </div>
          )}

          {messages.length === 0 && (
            <Paragraph type="secondary" style={{ textAlign: 'center', marginTop: 120 }}>
              输入业务问题开始对话，例如：「近 7 天各区域销售额」
            </Paragraph>
          )}
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="message-user">
                <div className="bubble-user">{m.content}</div>
              </div>
            ) : (
              <div key={m.id} className="message-assistant">
                <div className="assistant-avatar">✦</div>
                <div className="bubble-assistant">
                  {(m.steps?.length ?? 0) > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <Steps
                        size="small"
                        direction="vertical"
                        current={(m.steps?.length ?? 1) - 1}
                        items={(m.steps ?? []).map((s) => ({
                          title: s.step,
                          description: s.detail,
                        }))}
                      />
                    </div>
                  )}
                  {m.thinking && (
                    <Collapse
                      size="small"
                      style={{ marginBottom: 10 }}
                      items={[
                        {
                          key: 'thinking',
                          label: '思考过程',
                          children: (
                            <pre
                              style={{
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: 12,
                                maxHeight: 240,
                                overflow: 'auto',
                              }}
                            >
                              {m.thinking}
                            </pre>
                          ),
                        },
                      ]}
                      defaultActiveKey={streaming ? ['thinking'] : []}
                    />
                  )}
                  {m.content || (streaming ? <Spin size="small" /> : null)}
                  {(m.reportSpec || m.reportArtifact) && (
                    <ReportViewer reportSpec={m.reportSpec} reportArtifact={m.reportArtifact} />
                  )}
                  {m.status === 'interrupted' && (
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>（已中断）</div>
                  )}
                  {m.status === 'completed' && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        type={m.feedbackRating === 'up' ? 'primary' : 'default'}
                        onClick={() => void handleFeedback(m.id, 'up')}
                      >
                        👍 有帮助
                      </Button>
                      <Button
                        size="small"
                        type={m.feedbackRating === 'down' ? 'primary' : 'default'}
                        danger={m.feedbackRating === 'down'}
                        onClick={() => openFeedbackDown(m.id, false)}
                      >
                        👎 不满意
                      </Button>
                    </div>
                  )}
                  {(m.status === 'failed' || m.status === 'interrupted') && m.content && (
                    <div style={{ marginTop: 8, textAlign: 'right' }}>
                      <Button
                        size="small"
                        type={m.feedbackRating === 'down' ? 'primary' : 'default'}
                        danger={m.feedbackRating === 'down'}
                        onClick={() => openFeedbackDown(m.id, true)}
                      >
                        👎 反馈问题
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
          {streaming && phaseLabel && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {phaseLabel}
            </Text>
          )}
        </div>

        <div className="chat-input-area">
          <div className="input-wrapper">
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'sql' ? '描述你想查询的数据…' : '描述你想生成的报表…'}
              autoSize={{ minRows: 2, maxRows: 5 }}
              variant="borderless"
              style={{ flex: 1, background: 'transparent' }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            {streaming ? (
              <Button danger onClick={() => void handleStop()}>
                停止
              </Button>
            ) : (
              <Button type="primary" size="large" onClick={() => void handleSend()} disabled={!input.trim()}>
                发送
              </Button>
            )}
          </div>
          <div className="input-hint">Enter 发送 · Shift+Enter 换行</div>
        </div>
      </main>

      <Modal
        title="反馈问题"
        open={feedbackModalOpen}
        onCancel={() => setFeedbackModalOpen(false)}
        onOk={() => void submitFeedbackDown()}
        okText="提交反馈"
        cancelText="取消"
      >
        <Input.TextArea
          rows={3}
          placeholder={feedbackRequireReason ? '请描述遇到的问题（必填）' : '可选：描述不满意的原因'}
          value={feedbackReason}
          onChange={(e) => setFeedbackReason(e.target.value)}
        />
      </Modal>

      <Modal
        title={`填写模板参数${templateDetail ? ` · ${templateDetail.name}` : ''}`}
        open={paramModalOpen}
        onCancel={() => setParamModalOpen(false)}
        onOk={() => void handleConfirmApply()}
        okText="确认生成"
        cancelText="取消"
      >
        <Form form={paramForm} layout="vertical">
          {(templateDetail?.placeholders ?? []).map((key) => (
            <Form.Item key={key} name={key} label={key} rules={[{ required: true, message: `请填写 ${key}` }]}>
              <Input placeholder={`请输入 ${key}`} />
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </div>
  );
}
