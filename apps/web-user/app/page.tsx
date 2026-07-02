'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Button, Input, Segmented, Spin, Typography, message } from 'antd';
import type { ChatStreamEvent } from '@hermes/contracts';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

type Phase = 'understanding' | 'retrieving' | 'generating' | 'idle';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'completed' | 'interrupted' | 'failed';
  phase?: Phase;
};

const PHASE_LABEL: Record<Exclude<Phase, 'idle'>, string> = {
  understanding: '正在理解问题…',
  retrieving: '正在检索相关数据表…',
  generating: '正在生成结果…',
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
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const runRef = useRef<{ runId: string; conversationId: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const phaseLabel = useMemo(() => (phase === 'idle' ? '' : PHASE_LABEL[phase]), [phase]);

  const appendAssistant = useCallback((patch: Partial<ChatMessage> & { id: string }) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === patch.id);
      if (idx < 0) return [...prev, { role: 'assistant', content: '', ...patch }];
      const next = [...prev];
      next[idx] = { ...next[idx]!, ...patch };
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    const query = input.trim();
    if (!query || streaming) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: query };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '', phase: 'understanding' }]);
    setInput('');
    setStreaming(true);
    setPhase('understanding');

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
            query,
            mode,
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
        body: JSON.stringify({ runId, userId: DEMO_USER_ID, conversationId: cid, query, mode }),
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
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const event = JSON.parse(line.slice(5).trim()) as ChatStreamEvent;
          if (event.type === 'phase') {
            setPhase(event.phase);
            appendAssistant({ id: assistantId, phase: event.phase });
          } else if (event.type === 'chunk') {
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === assistantId);
              if (idx < 0) return prev;
              const next = [...prev];
              next[idx] = { ...next[idx]!, content: next[idx]!.content + event.content };
              return next;
            });
          } else if (event.type === 'done') {
            appendAssistant({
              id: assistantId,
              content: event.content,
              status: event.status,
              phase: 'idle',
            });
            setPhase('idle');
          } else if (event.type === 'error') {
            message.error(event.message);
          }
        }
      }
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
  }, [conversationId, input, mode, streaming]);

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

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, color: '#431407' }}>
            智能对话
          </Typography.Title>
          <Text type="secondary">自然语言生成 SQL / 报表，三阶段流式反馈</Text>
        </div>
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as 'sql' | 'report')}
          options={[
            { label: 'SQL 模式', value: 'sql' },
            { label: '报表模式', value: 'report' },
          ]}
        />
      </div>

      <section
        style={{
          minHeight: 420,
          background: '#fff',
          border: '1px solid #FFEDD5',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
        }}
      >
        {messages.length === 0 && (
          <Paragraph type="secondary" style={{ textAlign: 'center', marginTop: 120 }}>
            输入业务问题开始对话，例如：「近 7 天各区域销售额」
          </Paragraph>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              marginBottom: 16,
              textAlign: m.role === 'user' ? 'right' : 'left',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: 12,
                background: m.role === 'user' ? '#F97316' : '#FFF7ED',
                color: m.role === 'user' ? '#fff' : '#431407',
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content || (m.role === 'assistant' && streaming ? <Spin size="small" /> : null)}
              {m.status === 'interrupted' && (
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>（已中断）</div>
              )}
            </div>
          </div>
        ))}
        {streaming && phaseLabel && (
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            {phaseLabel}
          </Text>
        )}
      </section>

      <div style={{ display: 'flex', gap: 12 }}>
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'sql' ? '描述你想查询的数据…' : '描述你想生成的报表…'}
          autoSize={{ minRows: 2, maxRows: 5 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        {streaming ? (
          <Button danger onClick={() => void handleStop()}>
            停止生成
          </Button>
        ) : (
          <Button type="primary" onClick={() => void handleSend()} disabled={!input.trim()} style={{ background: '#F97316' }}>
            发送
          </Button>
        )}
      </div>
    </main>
  );
}
