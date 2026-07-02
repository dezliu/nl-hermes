'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { AdminLayout } from '../../components/AdminLayout';
import {
  metaApi,
  type SyncPreviewTable,
  type SyncDatasourceResult,
} from '../../lib/api';
import { useDebouncedMetadataRebuild } from '../../lib/use-debounced-metadata-rebuild';

type Datasource = {
  id: string;
  name: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  connectionStatus: string;
  lastSyncedAt?: string;
};

type FieldSelection = Record<string, Set<string>>;

function buildDefaultSelection(tables: SyncPreviewTable[]): FieldSelection {
  const sel: FieldSelection = {};
  for (const t of tables) {
    sel[t.physicalName] = new Set(t.fields.map((f) => f.physicalName));
  }
  return sel;
}

function selectionToPayload(
  tables: SyncPreviewTable[],
  selection: FieldSelection,
): Array<{ physicalName: string; fields: string[] }> {
  return tables
    .filter((t) => selection[t.physicalName]?.size)
    .map((t) => ({
      physicalName: t.physicalName,
      fields: [...(selection[t.physicalName] ?? [])],
    }));
}

export default function DatasourcesPage() {
  const [items, setItems] = useState<Datasource[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncTarget, setSyncTarget] = useState<Datasource | null>(null);
  const [previewTables, setPreviewTables] = useState<SyncPreviewTable[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [syncSubmitting, setSyncSubmitting] = useState(false);
  const [defaultInQueryLibrary, setDefaultInQueryLibrary] = useState(false);
  const [fieldSelection, setFieldSelection] = useState<FieldSelection>({});
  const { scheduleRebuild } = useDebouncedMetadataRebuild();

  const load = async () => {
    setLoading(true);
    try {
      const data = await metaApi.listDatasources();
      setItems(data.items as Datasource[]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async () => {
    const values = await form.validateFields();
    try {
      await metaApi.createDatasource(values);
      message.success('创建成功');
      setOpen(false);
      form.resetFields();
      load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败');
    }
  };

  const fullSync = async (row: Datasource) => {
    try {
      const r = await metaApi.syncDatasource(row.id, { mode: 'full' }) as SyncDatasourceResult;
      message.success(`全量同步完成：${r.tablesSynced} 张表，${r.fieldsSynced} 个字段`);
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '同步失败');
    }
  };

  const openSelectiveSync = async (row: Datasource) => {
    setSyncTarget(row);
    setSyncModalOpen(true);
    setPreviewLoading(true);
    setDefaultInQueryLibrary(false);
    try {
      const preview = await metaApi.previewSync(row.id);
      setPreviewTables(preview.tables);
      setFieldSelection(buildDefaultSelection(preview.tables));
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载预览失败');
      setSyncModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleTable = useCallback((tableName: string, checked: boolean, table: SyncPreviewTable) => {
    setFieldSelection((prev) => {
      const next = { ...prev };
      if (checked) {
        next[tableName] = new Set(table.fields.map((f) => f.physicalName));
      } else {
        next[tableName] = new Set();
      }
      return next;
    });
  }, []);

  const toggleField = useCallback((tableName: string, fieldName: string, checked: boolean) => {
    setFieldSelection((prev) => {
      const next = { ...prev };
      const set = new Set(prev[tableName] ?? []);
      if (checked) set.add(fieldName);
      else set.delete(fieldName);
      next[tableName] = set;
      return next;
    });
  }, []);

  const selectedSummary = useMemo(() => {
    let tables = 0;
    let fields = 0;
    for (const t of previewTables) {
      const sel = fieldSelection[t.physicalName];
      if (sel?.size) {
        tables += 1;
        fields += sel.size;
      }
    }
    return { tables, fields };
  }, [previewTables, fieldSelection]);

  const submitSelectiveSync = async () => {
    if (!syncTarget) return;
    const payload = selectionToPayload(previewTables, fieldSelection);
    if (!payload.length) {
      message.warning('请至少选择一个表/字段');
      return;
    }
    setSyncSubmitting(true);
    try {
      const r = await metaApi.syncDatasource(syncTarget.id, {
        mode: 'selective',
        tables: payload,
        defaultInQueryLibrary,
      });
      message.success(`选择性同步完成：${r.tablesSynced} 张表，${r.fieldsSynced} 个字段`);
      setSyncModalOpen(false);
      load();
      if (defaultInQueryLibrary) scheduleRebuild();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '同步失败');
    } finally {
      setSyncSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>数据源管理</h1>
          <p style={{ color: '#64748B', margin: '4px 0 0' }}>配置连接、测试连通性并同步表/字段元数据</p>
        </div>
        <Button type="primary" onClick={() => setOpen(true)}>新增数据源</Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: '主机', dataIndex: 'host' },
          { title: '库名', dataIndex: 'databaseName' },
          {
            title: '状态',
            dataIndex: 'connectionStatus',
            render: (v: string) => (
              <Tag color={v === 'ok' ? 'green' : v === 'failed' ? 'red' : 'default'}>{v}</Tag>
            ),
          },
          {
            title: '上次同步',
            dataIndex: 'lastSyncedAt',
            render: (v?: string) => v ?? '—',
          },
          {
            title: '操作',
            render: (_, row) => (
              <Space wrap>
                <Button size="small" onClick={async () => {
                  try {
                    const r = await metaApi.testDatasource(row.id) as { ok: boolean; message: string };
                    message.info(r.message);
                    load();
                  } catch (e) {
                    message.error(e instanceof Error ? e.message : '测试失败');
                  }
                }}>测试连接</Button>
                <Button size="small" onClick={() => void fullSync(row)}>全量同步</Button>
                <Button size="small" type="primary" ghost onClick={() => void openSelectiveSync(row)}>
                  选择性同步
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal title="新增数据源" open={open} onCancel={() => setOpen(false)} onOk={onCreate}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="host" label="主机" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="port" label="端口" initialValue={3306} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="databaseName" label="数据库" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}><Input.Password /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={syncTarget ? `选择性同步 — ${syncTarget.name}` : '选择性同步'}
        open={syncModalOpen}
        width={720}
        onCancel={() => setSyncModalOpen(false)}
        onOk={() => void submitSelectiveSync()}
        confirmLoading={syncSubmitting}
        okText="开始同步"
      >
        <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }}>
          <span style={{ color: '#64748B' }}>
            勾选要导入的表与字段（默认全选）。已选 {selectedSummary.tables} 张表、{selectedSummary.fields} 个字段。
          </span>
          <Space>
            <span>同步后默认纳入查询库</span>
            <Switch checked={defaultInQueryLibrary} onChange={setDefaultInQueryLibrary} />
          </Space>
        </Space>

        <Table
          rowKey="physicalName"
          loading={previewLoading}
          dataSource={previewTables}
          pagination={{ pageSize: 8 }}
          size="small"
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
                {record.fields.map((f) => {
                  const checked = fieldSelection[record.physicalName]?.has(f.physicalName) ?? false;
                  return (
                    <Checkbox
                      key={f.physicalName}
                      checked={checked}
                      onChange={(e) => toggleField(record.physicalName, f.physicalName, e.target.checked)}
                    >
                      {f.physicalName}
                      <Tag style={{ marginLeft: 8 }}>{f.dataType}</Tag>
                      {f.columnComment ? (
                        <span style={{ color: '#64748B', marginLeft: 8 }}>{f.columnComment}</span>
                      ) : null}
                    </Checkbox>
                  );
                })}
              </div>
            ),
          }}
          columns={[
            {
              title: '表',
              dataIndex: 'physicalName',
              render: (name: string, row: SyncPreviewTable) => {
                const allChecked = row.fields.every((f) =>
                  fieldSelection[name]?.has(f.physicalName),
                );
                const someChecked = row.fields.some((f) =>
                  fieldSelection[name]?.has(f.physicalName),
                );
                return (
                  <Checkbox
                    checked={allChecked && row.fields.length > 0}
                    indeterminate={!allChecked && someChecked}
                    onChange={(e) => toggleTable(name, e.target.checked, row)}
                  >
                    {name}
                    {row.tableComment ? (
                      <span style={{ color: '#64748B', marginLeft: 8 }}>{row.tableComment}</span>
                    ) : null}
                  </Checkbox>
                );
              },
            },
            {
              title: '字段数',
              width: 80,
              render: (_: unknown, row: SyncPreviewTable) =>
                `${fieldSelection[row.physicalName]?.size ?? 0}/${row.fields.length}`,
            },
          ]}
        />
      </Modal>
    </AdminLayout>
  );
}
