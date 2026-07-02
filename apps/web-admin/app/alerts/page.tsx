'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { AdminLayout } from '../../components/AdminLayout';
import { alertApi, type AlertItem } from '../../lib/api';

const LEVEL_COLOR: Record<string, string> = {
  info: 'default',
  warning: 'orange',
  error: 'red',
  critical: 'magenta',
};

const STATUS_LABEL: Record<string, string> = {
  open: '未读',
  acknowledged: '已读',
  resolved: '已处理',
};

export default function AlertsPage() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get('id');
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [levelFilter, setLevelFilter] = useState<string | undefined>();
  const [selected, setSelected] = useState<string[]>([]);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (statusFilter) query.status = statusFilter;
      if (levelFilter) query.level = levelFilter;
      const data = await alertApi.list(Object.keys(query).length ? query : undefined);
      setItems(data.items);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, levelFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!focusId || items.length === 0) return;
    const found = items.find((item) => item.id === focusId);
    // #region agent log
    fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c5ef2c' },
      body: JSON.stringify({
        sessionId: 'c5ef2c',
        location: 'alerts/page.tsx:focusId',
        message: 'alert focus from query',
        data: { focusId, found: Boolean(found), hypothesisId: 'B' },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (found) {
      message.info(`已定位告警：${found.title}`);
    }
  }, [focusId, items]);

  const onBatchRead = async () => {
    if (selected.length === 0) return;
    try {
      await alertApi.batchRead(selected);
      message.success('已批量标记已读');
      setSelected([]);
      load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const onResolve = async () => {
    if (!resolveId) return;
    try {
      await alertApi.update(resolveId, { status: 'resolved', resolutionNote: note || undefined });
      message.success('已标记为已处理');
      setResolveOpen(false);
      setNote('');
      load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>告警信息</h1>
          <p style={{ color: '#64748B', margin: '4px 0 0' }}>与监控看板同源的事件列表与处置闭环</p>
        </div>
        <Space>
          <Select
            allowClear
            placeholder="处理状态"
            style={{ width: 120 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'open', label: '未读' },
              { value: 'acknowledged', label: '已读' },
              { value: 'resolved', label: '已处理' },
            ]}
          />
          <Select
            allowClear
            placeholder="级别"
            style={{ width: 120 }}
            value={levelFilter}
            onChange={setLevelFilter}
            options={[
              { value: 'warning', label: '中' },
              { value: 'error', label: '高' },
              { value: 'critical', label: '严重' },
            ]}
          />
          <Button disabled={selected.length === 0} onClick={onBatchRead}>
            批量已读
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        rowClassName={(record) => (record.id === focusId ? 'ant-table-row-selected' : '')}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys as string[]),
        }}
        columns={[
          {
            title: '级别',
            dataIndex: 'level',
            render: (v: string) => <Tag color={LEVEL_COLOR[v]}>{v}</Tag>,
          },
          { title: '类型', dataIndex: 'type' },
          { title: '摘要', dataIndex: 'title' },
          {
            title: '状态',
            dataIndex: 'status',
            render: (v: string) => STATUS_LABEL[v] ?? v,
          },
          {
            title: '时间',
            dataIndex: 'createdAt',
            render: (v?: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
          },
          {
            title: '操作',
            render: (_, row) => (
              <Space>
                {row.refType === 'datasource' && row.refId && (
                  <a href={`/datasources?id=${row.refId}`}>跳转配置</a>
                )}
                {row.status !== 'resolved' && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setResolveId(row.id);
                      setResolveOpen(true);
                    }}
                  >
                    标记已处理
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="标记已处理"
        open={resolveOpen}
        onOk={onResolve}
        onCancel={() => setResolveOpen(false)}
        okText="确认"
      >
        <Input.TextArea
          rows={3}
          placeholder="可选填写处理备注"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </AdminLayout>
  );
}
