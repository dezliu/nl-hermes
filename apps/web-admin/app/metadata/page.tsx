'use client';

import { useEffect, useState } from 'react';
import { Select, Switch, Table, message } from 'antd';
import { AdminLayout } from '../../components/AdminLayout';
import { metaApi } from '../../lib/api';

type Datasource = { id: string; name: string };
type MetaTable = {
  id: string;
  physicalName: string;
  businessName?: string;
  inQueryLibrary: boolean;
  source: string;
};

export default function MetadataPage() {
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [tables, setTables] = useState<MetaTable[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    metaApi.listDatasources().then((d) => {
      const list = d.items as Datasource[];
      setDatasources(list);
      if (list[0]) setSelectedId(list[0].id);
    }).catch(() => message.error('加载数据源失败'));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    metaApi.listTables(selectedId)
      .then((d) => setTables(d.items as MetaTable[]))
      .catch(() => message.error('加载表清单失败'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>表元数据</h1>
      <p style={{ color: '#64748B', marginBottom: 16 }}>勾选纳入智能查询库，编辑业务描述</p>

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
        dataSource={tables}
        columns={[
          { title: '物理表名', dataIndex: 'physicalName' },
          { title: '业务名', dataIndex: 'businessName' },
          { title: '来源', dataIndex: 'source' },
          {
            title: '智能查询库',
            dataIndex: 'inQueryLibrary',
            render: (v: boolean) => <Switch checked={v} disabled />,
          },
        ]}
      />
    </AdminLayout>
  );
}
