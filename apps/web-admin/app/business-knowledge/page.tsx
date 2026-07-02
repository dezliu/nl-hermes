'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { AdminLayout } from '../../components/AdminLayout';
import { businessKnowledgeApi, ragApi, type BusinessKnowledgeItem } from '../../lib/api';

const CATEGORY_LABELS: Record<BusinessKnowledgeItem['category'], string> = {
  glossary: '术语',
  metric: '指标',
  rule: '规则',
  faq: 'FAQ',
};

export default function BusinessKnowledgePage() {
  const [items, setItems] = useState<BusinessKnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessKnowledgeItem | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await businessKnowledgeApi.list({
        status: statusFilter || undefined,
        category: categoryFilter,
      });
      setItems(data.items);
    } catch {
      message.error('加载业务知识失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ category: 'glossary', status: 'active' });
    setModalOpen(true);
  };

  const openEdit = (row: BusinessKnowledgeItem) => {
    setEditing(row);
    form.setFieldsValue(row);
    setModalOpen(true);
  };

  const onSave = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await businessKnowledgeApi.update(editing.id, values);
        message.success('已更新');
      } else {
        await businessKnowledgeApi.create(values);
        message.success('已创建');
      }
      setModalOpen(false);
      await load();
      await ragApi.rebuildIndex('business');
      message.info('业务知识索引已重建');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  const toggleStatus = async (row: BusinessKnowledgeItem) => {
    const next = row.status === 'active' ? 'archived' : 'active';
    try {
      await businessKnowledgeApi.update(row.id, { status: next });
      message.success(next === 'active' ? '已启用' : '已归档');
      await load();
      await ragApi.rebuildIndex('business');
    } catch {
      message.error('操作失败');
    }
  };

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>业务知识</h1>
      <p style={{ color: '#64748B', marginBottom: 16 }}>
        维护术语、指标口径、业务规则与 FAQ，索引至业务知识向量库
      </p>

      <Space style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 120 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: '全部状态' },
            { value: 'active', label: '启用' },
            { value: 'archived', label: '归档' },
          ]}
        />
        <Select
          allowClear
          style={{ width: 140 }}
          placeholder="分类"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Button type="primary" onClick={openCreate}>新建</Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={[
          { title: '标题', dataIndex: 'title', width: 200 },
          {
            title: '分类',
            dataIndex: 'category',
            width: 100,
            render: (v: BusinessKnowledgeItem['category']) => (
              <Tag>{CATEGORY_LABELS[v] ?? v}</Tag>
            ),
          },
          {
            title: '内容',
            dataIndex: 'content',
            ellipsis: true,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (v: string) => (
              <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? '启用' : '归档'}</Tag>
            ),
          },
          {
            title: '操作',
            width: 160,
            render: (_: unknown, row: BusinessKnowledgeItem) => (
              <Space>
                <Button type="link" size="small" onClick={() => openEdit(row)}>编辑</Button>
                <Button type="link" size="small" onClick={() => toggleStatus(row)}>
                  {row.status === 'active' ? '归档' : '启用'}
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? '编辑业务知识' : '新建业务知识'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSave}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}>
            <Input.TextArea rows={6} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'active', label: '启用' },
                { value: 'archived', label: '归档' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
