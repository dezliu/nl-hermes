'use client';

import { useEffect, useState } from 'react';
import { Button, Form, Input, Select, Space, Table, message } from 'antd';
import { AdminLayout } from '../../components/AdminLayout';
import { metaApi } from '../../lib/api';

type Role = { id: string; code: string; name: string };
type PromptVersion = {
  id: string;
  roleId?: string;
  persona: string;
  constraints: string;
  version: number;
  isActive: boolean;
};

export default function PromptsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<string>('default');
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [form] = Form.useForm();

  const loadVersions = async (rid?: string) => {
    try {
      const data = await metaApi.listPromptVersions(rid === 'default' ? undefined : rid);
      setVersions(data.items as PromptVersion[]);
      const active = (data.items as PromptVersion[]).find((v) => v.isActive);
      if (active) form.setFieldsValue({ persona: active.persona, constraints: active.constraints });
    } catch {
      message.error('加载 Prompt 失败');
    }
  };

  useEffect(() => {
    metaApi.listRoles().then((d) => setRoles(d.items as Role[])).catch(() => undefined);
    loadVersions();
  }, []);

  useEffect(() => { loadVersions(roleId); }, [roleId]);

  const onSave = async () => {
    const values = await form.validateFields();
    try {
      await metaApi.savePrompt({
        roleId: roleId === 'default' ? null : roleId,
        ...values,
      });
      message.success('已保存新版本');
      loadVersions(roleId);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>系统 Prompt 管理</h1>
      <p style={{ color: '#64748B', marginBottom: 16 }}>按角色配置角色设定与系统限制，支持版本记录</p>

      <Space style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 240 }}
          value={roleId}
          onChange={setRoleId}
          options={[
            { value: 'default', label: '默认（全局）' },
            ...roles.map((r) => ({ value: r.id, label: r.name })),
          ]}
        />
        <Button type="primary" onClick={onSave}>保存新版本</Button>
      </Space>

      <Form form={form} layout="vertical" style={{ maxWidth: 720, marginBottom: 24 }}>
        <Form.Item name="persona" label="角色设定" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item name="constraints" label="系统限制" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        dataSource={versions}
        pagination={false}
        columns={[
          { title: '版本', dataIndex: 'version' },
          { title: '激活', dataIndex: 'isActive', render: (v: boolean) => (v ? '是' : '否') },
          { title: '角色设定', dataIndex: 'persona', ellipsis: true },
        ]}
      />
    </AdminLayout>
  );
}
