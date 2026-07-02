'use client';

import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Space, Table, Tag, message } from 'antd';
import { AdminLayout } from '../../components/AdminLayout';
import { metaApi } from '../../lib/api';

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

export default function DatasourcesPage() {
  const [items, setItems] = useState<Datasource[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

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

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>数据源管理</h1>
          <p style={{ color: '#64748B', margin: '4px 0 0' }}>配置连接、测试连通性并同步表元数据</p>
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
            title: '操作',
            render: (_, row) => (
              <Space>
                <Button size="small" onClick={async () => {
                  try {
                    const r = await metaApi.testDatasource(row.id) as { ok: boolean; message: string };
                    message.info(r.message);
                    load();
                  } catch (e) {
                    message.error(e instanceof Error ? e.message : '测试失败');
                  }
                }}>测试连接</Button>
                <Button size="small" onClick={async () => {
                  try {
                    const r = await metaApi.syncDatasource(row.id) as { tablesSynced: number };
                    message.success(`同步 ${r.tablesSynced} 张表`);
                    load();
                  } catch (e) {
                    message.error(e instanceof Error ? e.message : '同步失败');
                  }
                }}>同步元数据</Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal title="新增数据源" open={open} onCancel={() => setOpen(false)} onOk={onCreate}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="host" label="主机" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="port" label="端口" initialValue={3306} rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="databaseName" label="数据库" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}><Input.Password /></Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
