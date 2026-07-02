'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Select, Space, Switch, Table, Tag, message } from 'antd';
import { AdminLayout } from '../../components/AdminLayout';
import { metaApi, type MetaFieldItem, type MetaTableItem } from '../../lib/api';
import { useDebouncedMetadataRebuild } from '../../lib/use-debounced-metadata-rebuild';

type Datasource = { id: string; name: string };

export default function MetadataPage() {
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [tables, setTables] = useState<MetaTableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fieldCache, setFieldCache] = useState<Record<string, MetaFieldItem[]>>({});
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [rebuilding, setRebuilding] = useState(false);
  const { scheduleRebuild, rebuildNow } = useDebouncedMetadataRebuild();

  const loadTables = useCallback(async (datasourceId: string) => {
    setLoading(true);
    try {
      const d = await metaApi.listTables(datasourceId);
      setTables(d.items);
      setFieldCache({});
      setExpandedKeys([]);
    } catch {
      message.error('加载表清单失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    metaApi.listDatasources().then((d) => {
      const list = d.items as Datasource[];
      setDatasources(list);
      if (list[0]) setSelectedId(list[0].id);
    }).catch(() => message.error('加载数据源失败'));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadTables(selectedId);
  }, [selectedId, loadTables]);

  const loadFields = async (tableId: string) => {
    if (fieldCache[tableId]) return fieldCache[tableId];
    const { item } = await metaApi.getTable(tableId);
    const fields = (item.fields ?? []).filter((f) => f.sourceStatus !== 'removed_at_source');
    setFieldCache((prev) => ({ ...prev, [tableId]: fields }));
    return fields;
  };

  const patchTableLocal = (tableId: string, patch: Partial<MetaTableItem>) => {
    setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, ...patch } : t)));
  };

  const saveTableField = async (
    tableId: string,
    field: keyof Pick<MetaTableItem, 'businessName' | 'description'>,
    value: string,
  ) => {
    try {
      await metaApi.updateTable(tableId, { [field]: value || undefined });
      patchTableLocal(tableId, { [field]: value || null });
      scheduleRebuild();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const toggleTableLibrary = async (row: MetaTableItem, checked: boolean) => {
    try {
      await metaApi.updateTable(row.id, { inQueryLibrary: checked });
      patchTableLocal(row.id, { inQueryLibrary: checked });

      const fields = await loadFields(row.id);
      await Promise.all(
        fields.map((f) =>
          metaApi.updateField(f.id, { inQueryLibrary: checked }),
        ),
      );
      setFieldCache((prev) => ({
        ...prev,
        [row.id]: fields.map((f) => ({ ...f, inQueryLibrary: checked })),
      }));
      scheduleRebuild();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '更新失败');
    }
  };

  const saveField = async (
    fieldId: string,
    tableId: string,
    patch: Partial<{
      businessName: string;
      description: string;
      inQueryLibrary: boolean;
      isSensitive: boolean;
      synonyms: string[];
    }>,
    localPatch?: Partial<MetaFieldItem>,
  ) => {
    try {
      await metaApi.updateField(fieldId, patch);
      const { synonyms: _synonyms, ...rest } = patch;
      setFieldCache((prev) => ({
        ...prev,
        [tableId]: (prev[tableId] ?? []).map((f) =>
          f.id === fieldId ? { ...f, ...rest, ...localPatch } : f,
        ),
      }));
      scheduleRebuild();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const onRebuildNow = async () => {
    setRebuilding(true);
    try {
      await rebuildNow();
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, marginBottom: 4 }}>元数据管理</h1>
          <p style={{ color: '#64748B', margin: 0 }}>管理表与字段描述，勾选纳入智能查询库</p>
        </div>
        <Button loading={rebuilding} onClick={() => void onRebuildNow()}>
          重建 metadata 索引
        </Button>
      </div>

      <Select
        style={{ width: 320, marginBottom: 16 }}
        placeholder="选择数据源"
        value={selectedId}
        onChange={setSelectedId}
        options={datasources.map((d) => ({ value: d.id, label: d.name }))}
      />

      <Table
        rowKey="id"
        loading={loading}
        dataSource={tables.filter((t) => t.sourceStatus !== 'removed_at_source')}
        expandable={{
          expandedRowKeys: expandedKeys,
          onExpandedRowsChange: (keys) => setExpandedKeys(keys as string[]),
          onExpand: async (expanded, record) => {
            if (expanded) await loadFields(record.id);
          },
          expandedRowRender: (record) => {
            const fields = fieldCache[record.id] ?? [];
            return (
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={fields}
                columns={[
                  { title: '物理字段名', dataIndex: 'physicalName', width: 160 },
                  { title: '类型', dataIndex: 'dataType', width: 100 },
                  {
                    title: '业务名',
                    dataIndex: 'businessName',
                    render: (v: string | null | undefined, field: MetaFieldItem) => (
                      <Input
                        size="small"
                        defaultValue={v ?? ''}
                        placeholder="业务名"
                        onBlur={(e) => {
                          if ((v ?? '') !== e.target.value) {
                            void saveField(field.id, record.id, { businessName: e.target.value });
                          }
                        }}
                      />
                    ),
                  },
                  {
                    title: '描述',
                    dataIndex: 'description',
                    render: (v: string | null | undefined, field: MetaFieldItem) => (
                      <Input
                        size="small"
                        defaultValue={v ?? ''}
                        placeholder="字段描述"
                        onBlur={(e) => {
                          if ((v ?? '') !== e.target.value) {
                            void saveField(field.id, record.id, { description: e.target.value });
                          }
                        }}
                      />
                    ),
                  },
                  {
                    title: '同义词',
                    dataIndex: 'synonyms',
                    render: (syns: MetaFieldItem['synonyms'], field: MetaFieldItem) => (
                      <Input
                        size="small"
                        defaultValue={(syns ?? []).map((s) => s.synonym).join(', ')}
                        placeholder="逗号分隔"
                        onBlur={(e) => {
                          const next = e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          const prev = (syns ?? []).map((s) => s.synonym).join(', ');
                          if (prev !== next.join(', ')) {
                            void saveField(
                              field.id,
                              record.id,
                              { synonyms: next },
                              { synonyms: next.map((synonym) => ({ synonym })) },
                            );
                          }
                        }}
                      />
                    ),
                  },
                  {
                    title: '敏感',
                    dataIndex: 'isSensitive',
                    width: 72,
                    render: (v: boolean, field: MetaFieldItem) => (
                      <Switch
                        size="small"
                        checked={v}
                        onChange={(checked) => void saveField(field.id, record.id, { isSensitive: checked })}
                      />
                    ),
                  },
                  {
                    title: '查询库',
                    dataIndex: 'inQueryLibrary',
                    width: 72,
                    render: (v: boolean, field: MetaFieldItem) => (
                      <Switch
                        size="small"
                        checked={v}
                        disabled={!record.inQueryLibrary}
                        onChange={(checked) =>
                          void saveField(field.id, record.id, { inQueryLibrary: checked })
                        }
                      />
                    ),
                  },
                ]}
              />
            );
          },
        }}
        columns={[
          { title: '物理表名', dataIndex: 'physicalName', width: 180 },
          {
            title: '业务名',
            dataIndex: 'businessName',
            render: (v: string | null | undefined, row: MetaTableItem) => (
              <Input
                size="small"
                defaultValue={v ?? ''}
                placeholder="业务名"
                onBlur={(e) => {
                  if ((v ?? '') !== e.target.value) {
                    void saveTableField(row.id, 'businessName', e.target.value);
                  }
                }}
              />
            ),
          },
          {
            title: '描述',
            dataIndex: 'description',
            render: (v: string | null | undefined, row: MetaTableItem) => (
              <Input
                size="small"
                defaultValue={v ?? ''}
                placeholder="表描述"
                onBlur={(e) => {
                  if ((v ?? '') !== e.target.value) {
                    void saveTableField(row.id, 'description', e.target.value);
                  }
                }}
              />
            ),
          },
          {
            title: '来源',
            dataIndex: 'source',
            width: 80,
            render: (v: string) => <Tag>{v}</Tag>,
          },
          {
            title: '智能查询库',
            dataIndex: 'inQueryLibrary',
            width: 110,
            render: (v: boolean, row: MetaTableItem) => (
              <Switch checked={v} onChange={(checked) => void toggleTableLibrary(row, checked)} />
            ),
          },
        ]}
      />
    </AdminLayout>
  );
}
