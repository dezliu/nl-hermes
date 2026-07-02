'use client';

import { useState } from 'react';
import { Button, Card, Input, Select, Space, Tag, message } from 'antd';
import { AdminLayout } from '../../components/AdminLayout';
import { ragApi, scoreLabel } from '../../lib/api';

type RetrieveResult = {
  id: string;
  content: string;
  score: number;
  matchReason?: string;
};

export default function SearchTestPage() {
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState<'metadata' | 'business' | 'templates'>('metadata');
  const [results, setResults] = useState<RetrieveResult[]>([]);
  const [loading, setLoading] = useState(false);

  const onSearch = async () => {
    if (!query.trim()) {
      message.warning('请输入测试问题');
      return;
    }
    setLoading(true);
    try {
      const data = await ragApi.retrieve({ query, collection, topK: 10 });
      setResults(data.results);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '检索失败');
    } finally {
      setLoading(false);
    }
  };

  const onRebuild = async () => {
    try {
      await ragApi.rebuildIndex(collection);
      message.success('索引重建已触发');
    } catch (e) {
      message.error(e instanceof Error ? e.message : '重建失败');
    }
  };

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>向量检索测试</h1>
      <p style={{ color: '#64748B', marginBottom: 16 }}>
        输入模拟用户问题，验证元数据与同义词维护效果
      </p>

      <Space direction="vertical" style={{ width: '100%', maxWidth: 720 }} size="middle">
        <Space wrap>
          <Select
            value={collection}
            onChange={setCollection}
            options={[
              { value: 'metadata', label: '元数据库' },
              { value: 'business', label: '业务知识库' },
              { value: 'templates', label: '模板库' },
            ]}
          />
          <Button onClick={onRebuild}>重建索引</Button>
        </Space>
        <Input.TextArea
          rows={3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例如：上个月华东区销售额"
        />
        <Button type="primary" loading={loading} onClick={onSearch}>开始测试</Button>

        {results.map((r) => (
          <Card key={r.id} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Tag color="blue">{scoreLabel(r.score)}</Tag>
                <span style={{ color: '#64748B' }}>score: {r.score}</span>
              </Space>
              <div>{r.content}</div>
              {r.matchReason && <div style={{ fontSize: 12, color: '#94A3B8' }}>{r.matchReason}</div>}
            </Space>
          </Card>
        ))}
      </Space>
    </AdminLayout>
  );
}
