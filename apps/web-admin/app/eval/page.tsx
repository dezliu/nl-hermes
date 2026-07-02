'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  message,
} from 'antd';
import { AdminLayout } from '../../components/AdminLayout';
import {
  evalApi,
  type EvalRunDetail,
  type EvalSetDetail,
  type EvalSetItem,
} from '../../lib/api';

type Step = 0 | 1 | 2 | 3;

export default function EvalPage() {
  const [step, setStep] = useState<Step>(0);
  const [sets, setSets] = useState<EvalSetItem[]>([]);
  const [selectedSet, setSelectedSet] = useState<EvalSetDetail | null>(null);
  const [run, setRun] = useState<EvalRunDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);
  const [form] = Form.useForm();
  const [caseForm] = Form.useForm();
  const [pollTimer, setPollTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  const loadSets = async () => {
    setLoading(true);
    try {
      const data = await evalApi.listSets();
      setSets(data.items);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSets();
    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [pollTimer]);

  const selectSet = async (id: string) => {
    const data = await evalApi.getSet(id);
    setSelectedSet(data.item);
    setStep(1);
  };

  const onCreateSet = async () => {
    const values = await form.validateFields();
    await evalApi.createSet(values);
    message.success('评估集已创建');
    setCreateOpen(false);
    form.resetFields();
    loadSets();
  };

  const onAddCase = async () => {
    if (!selectedSet) return;
    const values = await caseForm.validateFields();
    const expectedTables = values.expectedTables
      ? String(values.expectedTables).split(/[,，]/).map((s: string) => s.trim()).filter(Boolean)
      : undefined;
    await evalApi.addCase(selectedSet.id, {
      question: values.question,
      mode: values.mode,
      expectedTables,
      expectedPoints: values.expectedPoints,
    });
    message.success('用例已添加');
    setCaseOpen(false);
    caseForm.resetFields();
    selectSet(selectedSet.id);
  };

  const onStartRun = async () => {
    if (!selectedSet) return;
    Modal.confirm({
      title: '确认开始评估？',
      content: `将对 ${selectedSet.cases?.length ?? 0} 条用例批量执行检索与生成比对。`,
      onOk: async () => {
        const data = await evalApi.startRun(selectedSet.id);
        setRun(data.item as EvalRunDetail);
        setStep(2);
        const timer = setInterval(async () => {
          const latest = await evalApi.getRun(data.item.id);
          setRun(latest.item);
          if (['completed', 'cancelled', 'failed'].includes(latest.item.status)) {
            clearInterval(timer);
            setPollTimer(null);
            setStep(3);
          }
        }, 1500);
        setPollTimer(timer);
      },
    });
  };

  const onCancelRun = async () => {
    if (!run) return;
    Modal.confirm({
      title: '确认取消评估？',
      onOk: async () => {
        await evalApi.cancelRun(run.id);
        message.info('已请求取消');
      },
    });
  };

  const onExport = async () => {
    if (!run) return;
    const md = await evalApi.exportReport(run.id);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eval-report-${run.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lowScoreResults = (run?.results ?? []).filter((r) => (r.score ?? 1) < 0.35);

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 18, margin: '0 0 16px' }}>离线评估</h1>
      <Steps
        current={step}
        style={{ marginBottom: 24 }}
        items={[
          { title: '选择评估集' },
          { title: '编辑用例' },
          { title: '运行进度' },
          { title: '评估报告' },
        ]}
      />

      {step === 0 && (
        <Card
          title="评估集列表"
          extra={<Button type="primary" onClick={() => setCreateOpen(true)}>新建评估集</Button>}
        >
          <Table
            rowKey="id"
            loading={loading}
            dataSource={sets}
            columns={[
              { title: '名称', dataIndex: 'name' },
              { title: '描述', dataIndex: 'description' },
              { title: '用例数', dataIndex: 'caseCount' },
              {
                title: '操作',
                render: (_, row) => (
                  <Button type="link" onClick={() => selectSet(row.id)}>
                    进入
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}

      {step === 1 && selectedSet && (
        <Card
          title={`评估集：${selectedSet.name}`}
          extra={
            <Space>
              <Button onClick={() => setCaseOpen(true)}>添加用例</Button>
              <Button type="primary" disabled={(selectedSet.cases?.length ?? 0) === 0} onClick={onStartRun}>
                开始评估
              </Button>
            </Space>
          }
        >
          <Table
            rowKey="id"
            dataSource={selectedSet.cases ?? []}
            columns={[
              { title: '问题', dataIndex: 'question' },
              {
                title: '模式',
                dataIndex: 'mode',
                render: (v: string) => <Tag>{v === 'sql' ? 'SQL' : '报表'}</Tag>,
              },
              {
                title: '期望表',
                dataIndex: 'expectedTables',
                render: (v?: string[]) => v?.join('、') ?? '-',
              },
              { title: '期望要点', dataIndex: 'expectedPoints', ellipsis: true },
            ]}
          />
        </Card>
      )}

      {step === 2 && run && (
        <Card
          title="评估运行中"
          extra={
            run.status === 'running' ? (
              <Button danger onClick={onCancelRun}>
                取消
              </Button>
            ) : null
          }
        >
          <Progress percent={run.progress} status={run.status === 'failed' ? 'exception' : 'active'} />
          <p style={{ marginTop: 12 }}>状态：{run.status}</p>
        </Card>
      )}

      {step === 3 && run && (
        <Card
          title="评估报告"
          extra={<Button onClick={onExport}>导出 Markdown</Button>}
        >
          <Space size="large" style={{ marginBottom: 16 }}>
            <span>检索命中率：{Math.round((run.summary?.retrievalHitRate ?? 0) * 100)}%</span>
            <span>生成成功率：{Math.round((run.summary?.generateSuccessRate ?? 0) * 100)}%</span>
            <span>平均分：{run.summary?.averageScore ?? 0}</span>
            <span>低分样本：{run.summary?.lowScoreCount ?? 0}</span>
            <span>单条均耗时：{run.summary?.avgCaseDurationMs ?? 0} ms</span>
          </Space>

          <Collapse
            defaultActiveKey={lowScoreResults[0]?.id ? [lowScoreResults[0].id] : []}
            items={(run.results ?? []).map((r) => ({
              key: r.id,
              label: (
                <Space>
                  <span>{r.question}</span>
                  <Tag color={(r.score ?? 0) < 0.35 ? 'red' : 'green'}>{r.score?.toFixed(2)}</Tag>
                </Space>
              ),
              children: (
                <div>
                  <p>检索命中：{r.retrievalHit ? '是' : '否'} · 生成成功：{r.generateSuccess ? '是' : '否'}</p>
                  <p>期望要点：{r.expectedPoints ?? '-'}</p>
                  <p>差异说明：{r.diffNotes ?? '-'}</p>
                </div>
              ),
            }))}
          />
        </Card>
      )}

      <Modal title="新建评估集" open={createOpen} onOk={onCreateSet} onCancel={() => setCreateOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="添加用例" open={caseOpen} onOk={onAddCase} onCancel={() => setCaseOpen(false)}>
        <Form form={caseForm} layout="vertical" initialValues={{ mode: 'sql' }}>
          <Form.Item name="question" label="标准问题" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="mode" label="模式" rules={[{ required: true }]}>
            <Select options={[{ value: 'sql', label: 'SQL' }, { value: 'report', label: '报表' }]} />
          </Form.Item>
          <Form.Item name="expectedTables" label="期望表（逗号分隔）">
            <Input placeholder="orders, users" />
          </Form.Item>
          <Form.Item name="expectedPoints" label="期望要点">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
