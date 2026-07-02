'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import { AdminLayout } from '../../components/AdminLayout';
import {
  ragApi,
  templateApi,
  type ReportTemplateItem,
  type SqlTemplateItem,
} from '../../lib/api';

type TabKey = 'sql' | 'report';

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  active: '启用',
  archived: '停用',
};

export default function TemplatesPage() {
  const [tab, setTab] = useState<TabKey>('sql');
  const [sqlItems, setSqlItems] = useState<SqlTemplateItem[]>([]);
  const [reportItems, setReportItems] = useState<ReportTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SqlTemplateItem | ReportTemplateItem | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sql, report] = await Promise.all([
        templateApi.listSql(),
        templateApi.listReport(),
      ]);
      setSqlItems(sql.items);
      setReportItems(report.items);
    } catch {
      message.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'draft',
      inLibrary: false,
      chartType: 'line',
      chartConfig: { xField: '', yField: '' },
    });
    setDrawerOpen(true);
  };

  const openEdit = (row: SqlTemplateItem | ReportTemplateItem) => {
    setEditing(row);
    form.setFieldsValue(row);
    setDrawerOpen(true);
  };

  const rebuildTemplatesIndex = async () => {
    await ragApi.rebuildIndex('templates');
    message.info('模板索引已重建');
  };

  const onSave = async () => {
    const values = await form.validateFields();
    try {
      if (tab === 'sql') {
        if (editing) {
          await templateApi.updateSql(editing.id, values);
        } else {
          await templateApi.createSql(values);
        }
      } else if (editing) {
        await templateApi.updateReport(editing.id, values);
      } else {
        await templateApi.createReport(values);
      }
      message.success('已保存');
      setDrawerOpen(false);
      await load();
      await rebuildTemplatesIndex();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const toggleLibrary = async (row: SqlTemplateItem | ReportTemplateItem) => {
    const body = { inLibrary: !row.inLibrary, status: row.inLibrary ? row.status : 'active' as const };
    try {
      if (tab === 'sql') {
        await templateApi.updateSql(row.id, body);
      } else {
        await templateApi.updateReport(row.id, body);
      }
      message.success(body.inLibrary ? '已收入模板库' : '已移出模板库');
      await load();
      await rebuildTemplatesIndex();
    } catch {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', width: 180 },
    { title: '场景描述', dataIndex: 'scenarioDescription', ellipsis: true },
    {
      title: '得分',
      dataIndex: 'score',
      width: 80,
      render: (v: number | null | undefined) => (v != null ? Number(v).toFixed(1) : '—'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: string) => <Tag>{STATUS_LABELS[v] ?? v}</Tag>,
    },
    {
      title: '在库',
      dataIndex: 'inLibrary',
      width: 70,
      render: (v: boolean) => (v ? <Tag color="blue">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '操作',
      width: 200,
      render: (_: unknown, row: SqlTemplateItem | ReportTemplateItem) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(row)}>编辑</Button>
          <Button type="link" size="small" onClick={() => toggleLibrary(row)}>
            {row.inLibrary ? '移出库' : '收入库'}
          </Button>
        </Space>
      ),
    },
  ];

  const reportColumns = [
    ...columns.slice(0, 2),
    {
      title: '图表',
      dataIndex: 'chartType',
      width: 80,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    ...columns.slice(2),
  ];

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>模板管理</h1>
      <p style={{ color: '#64748B', marginBottom: 16 }}>维护 SQL 与报表模板，收入库后可被检索与推荐</p>

      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        tabBarExtraContent={<Button type="primary" onClick={openCreate}>新建模板</Button>}
        items={[
          {
            key: 'sql',
            label: 'SQL 模板',
            children: (
              <Table rowKey="id" loading={loading} dataSource={sqlItems} columns={columns} />
            ),
          },
          {
            key: 'report',
            label: '报表模板',
            children: (
              <Table rowKey="id" loading={loading} dataSource={reportItems} columns={reportColumns} />
            ),
          },
        ]}
      />

      <Drawer
        title={editing ? '编辑模板' : '新建模板'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={640}
        extra={<Button type="primary" onClick={onSave}>保存</Button>}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="模板名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="scenarioDescription" label="适用场景" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="sqlBody"
            label="SQL 语句"
            rules={[{ required: true }]}
            extra="占位符格式：{{param_name}}"
          >
            <Input.TextArea rows={8} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          {tab === 'report' && (
            <>
              <Form.Item name="chartType" label="图表类型" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'line', label: '折线图' },
                    { value: 'bar', label: '柱状图' },
                    { value: 'table', label: '表格' },
                  ]}
                />
              </Form.Item>
              <Form.Item name={['chartConfig', 'xField']} label="横轴字段">
                <Input placeholder="SQL 结果列名" />
              </Form.Item>
              <Form.Item name={['chartConfig', 'yField']} label="纵轴字段">
                <Input placeholder="SQL 结果列名" />
              </Form.Item>
            </>
          )}
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: 'draft', label: '草稿' },
                { value: 'active', label: '启用' },
                { value: 'archived', label: '停用' },
              ]}
            />
          </Form.Item>
          <Form.Item name="inLibrary" label="收入模板库" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </AdminLayout>
  );
}
