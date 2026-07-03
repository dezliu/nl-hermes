'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Modal, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../components/AdminLayout';
import {
  closedLoopApi,
  ragApi,
  type GenerationFeedbackItem,
  type TemplateCandidateItem,
} from '../../lib/api';

const { Paragraph } = Typography;

function encodePrefill(payload: Record<string, unknown>) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

export default function GenerationClosedLoopPage() {
  const router = useRouter();
  const [tab, setTab] = useState('candidates');
  const [candidates, setCandidates] = useState<TemplateCandidateItem[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<GenerationFeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sqlPreview, setSqlPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cand, fb] = await Promise.all([
        closedLoopApi.listCandidates('pending'),
        closedLoopApi.listFeedback('open'),
      ]);
      setCandidates(cand.items);
      setFeedbackItems(fb.items);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (row: TemplateCandidateItem, inLibrary: boolean) => {
    try {
      await closedLoopApi.approveCandidate(row.id, {
        name: row.userQuery.slice(0, 64),
        inLibrary,
      });
      message.success(inLibrary ? '已入库为 draft 模板' : '已创建 draft 模板');
      await ragApi.rebuildIndex('templates');
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '入库失败');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await closedLoopApi.rejectCandidate(id);
      message.success('已拒绝');
      await load();
    } catch {
      message.error('操作失败');
    }
  };

  const handleProcessFeedback = (row: GenerationFeedbackItem) => {
    const prefill = encodePrefill({
      name: row.userQuery.slice(0, 64),
      scenarioDescription: row.userQuery,
      sqlBody: row.generatedSql ?? '',
      sourceFeedbackId: row.id,
      chartType: row.mode === 'report' ? 'table' : undefined,
      chartConfig: { xField: '', yField: '' },
    });
    router.push(`/templates?tab=${row.mode}&prefill=${prefill}`);
  };

  const handleResolveFeedback = async (id: string) => {
    try {
      await closedLoopApi.resolveFeedback(id);
      message.success('已标记为已处理');
      await load();
    } catch {
      message.error('操作失败');
    }
  };

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>生成闭环</h1>
      <p style={{ color: '#64748B', marginBottom: 16 }}>
        管理高分生成候选模板与用户失败反馈，一键跳转完善 SQL/报表模板
      </p>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'candidates',
            label: `候选模板 (${candidates.length})`,
            children: (
              <Table
                rowKey="id"
                loading={loading}
                dataSource={candidates}
                columns={[
                  { title: '用户提问', dataIndex: 'userQuery', ellipsis: true },
                  {
                    title: '模式',
                    dataIndex: 'mode',
                    width: 80,
                    render: (v: string) => <Tag>{v.toUpperCase()}</Tag>,
                  },
                  {
                    title: 'RAG 分',
                    dataIndex: 'ragScore',
                    width: 80,
                    render: (v: number | null) => (v != null ? Number(v).toFixed(2) : '—'),
                  },
                  {
                    title: '点赞',
                    dataIndex: 'userUpvoted',
                    width: 70,
                    render: (v: boolean) => (v ? '👍' : '—'),
                  },
                  {
                    title: '优先级',
                    dataIndex: 'priority',
                    width: 80,
                  },
                  {
                    title: 'SQL',
                    width: 100,
                    render: (_: unknown, row: TemplateCandidateItem) => (
                      <Button type="link" size="small" onClick={() => setSqlPreview(row.sqlBody)}>
                        预览
                      </Button>
                    ),
                  },
                  {
                    title: '操作',
                    width: 220,
                    render: (_: unknown, row: TemplateCandidateItem) => (
                      <Space>
                        <Button type="link" size="small" onClick={() => void handleApprove(row, false)}>
                          创建 draft
                        </Button>
                        <Button type="link" size="small" onClick={() => void handleApprove(row, true)}>
                          入库
                        </Button>
                        <Button type="link" size="small" danger onClick={() => void handleReject(row.id)}>
                          拒绝
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            ),
          },
          {
            key: 'feedback',
            label: `生成反馈 (${feedbackItems.length})`,
            children: (
              <Table
                rowKey="id"
                loading={loading}
                dataSource={feedbackItems}
                columns={[
                  { title: '用户提问', dataIndex: 'userQuery', ellipsis: true },
                  {
                    title: '模式',
                    dataIndex: 'mode',
                    width: 80,
                    render: (v: string) => <Tag>{v.toUpperCase()}</Tag>,
                  },
                  { title: '失败原因', dataIndex: 'refuseReason', ellipsis: true },
                  { title: '用户反馈', dataIndex: 'feedbackReason', ellipsis: true },
                  {
                    title: 'SQL 草案',
                    width: 100,
                    render: (_: unknown, row: GenerationFeedbackItem) =>
                      row.generatedSql ? (
                        <Button type="link" size="small" onClick={() => setSqlPreview(row.generatedSql!)}>
                          预览
                        </Button>
                      ) : (
                        '—'
                      ),
                  },
                  {
                    title: '操作',
                    width: 180,
                    render: (_: unknown, row: GenerationFeedbackItem) => (
                      <Space>
                        <Button type="link" size="small" onClick={() => handleProcessFeedback(row)}>
                          去处理
                        </Button>
                        <Button type="link" size="small" onClick={() => void handleResolveFeedback(row.id)}>
                          已处理
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            ),
          },
        ]}
      />

      <Modal
        title="SQL 预览"
        open={sqlPreview != null}
        onCancel={() => setSqlPreview(null)}
        footer={null}
        width={720}
      >
        <Paragraph>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{sqlPreview}</pre>
        </Paragraph>
      </Modal>
    </AdminLayout>
  );
}
