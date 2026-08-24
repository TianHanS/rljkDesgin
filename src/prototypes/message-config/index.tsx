/**
 * @name 消息配置
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /assets/templates/spec-template.md
 */
import React, { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  ConfigProvider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import zhCN from 'antd/locale/zh_CN';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import './style.css';

const { Title, Text } = Typography;

type MsgType = 1 | 2 | 3 | 4;
type PushScope = 1 | 2;

const MSG_TYPE_OPTIONS: { value: MsgType; label: string }[] = [
  { value: 1, label: '1 成功' },
  { value: 2, label: '2 通知' },
  { value: 3, label: '3 警告' },
  { value: 4, label: '4 错误' },
];

const MSG_SOURCE_OPTIONS = ['管控平台', '集控接口处理消息', '三方设备厂家业务流程'] as const;

const NOTIFICATION_OPTIONS = ['仅通知', '通知并语音播报', '播报+声光报警'] as const;

const MODULE_OPTIONS = ['采样机', '汽车衡', '气动传输', '自动制样', '集控调度', '存查柜'] as const;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: `${i} 时` }));

export type MessageConfigRow = {
  id: string;
  messageCode: string;
  enabled: boolean;
  type: MsgType;
  description: string;
  source: (typeof MSG_SOURCE_OPTIONS)[number];
  pushScope: PushScope;
  pushModules: string[];
  notificationMethod: (typeof NOTIFICATION_OPTIONS)[number];
  needManualConfirm: boolean;
  autoCloseSeconds: number | null;
  quietStartHour: number | null;
  quietEndHour: number | null;
  creator: string;
  createTime: string;
  updater: string;
  updateTime: string;
};

type SidePanel = { kind: 'closed' } | { kind: 'form'; editingId: string | null };

const now = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const initialRows: MessageConfigRow[] = [
  {
    id: '1',
    messageCode: 'LIMS_PUSH_RESULT',
    enabled: true,
    type: 1,
    description: '化验结果回传结果通知',
    source: '三方设备厂家业务流程',
    pushScope: 2,
    pushModules: ['采样机', '存查柜'],
    notificationMethod: '通知并语音播报',
    needManualConfirm: false,
    autoCloseSeconds: 30,
    quietStartHour: 22,
    quietEndHour: 6,
    creator: '张三',
    createTime: '2023-10-20 09:10:00',
    updater: '李四',
    updateTime: '2023-10-24 10:05:12',
  },
  {
    id: '2',
    messageCode: 'SCALE_WEIGHT_UPLOAD',
    enabled: true,
    type: 2,
    description: '过磅数据推送',
    source: '集控接口处理消息',
    pushScope: 1,
    pushModules: [],
    notificationMethod: '仅通知',
    needManualConfirm: true,
    autoCloseSeconds: null,
    quietStartHour: 0,
    quietEndHour: 0,
    creator: '系统',
    createTime: '2023-10-18 14:22:11',
    updater: '王五',
    updateTime: '2023-10-24 09:58:40',
  },
  {
    id: '3',
    messageCode: 'MES_SAMPLE_DISPATCH',
    enabled: false,
    type: 3,
    description: 'MES 节拍预警',
    source: '管控平台',
    pushScope: 2,
    pushModules: ['集控调度'],
    notificationMethod: '播报+声光报警',
    needManualConfirm: false,
    autoCloseSeconds: 45,
    quietStartHour: null,
    quietEndHour: null,
    creator: '张三',
    createTime: '2023-10-22 11:00:00',
    updater: '张三',
    updateTime: '2023-10-23 16:40:00',
  },
];

const typeTag = (t: MsgType) => {
  const map: Record<MsgType, { color: string; text: string }> = {
    1: { color: 'success', text: '1 成功' },
    2: { color: 'processing', text: '2 通知' },
    3: { color: 'warning', text: '3 警告' },
    4: { color: 'error', text: '4 错误' },
  };
  const x = map[t];
  return <Tag color={x.color}>{x.text}</Tag>;
};

const pushScopeText = (row: MessageConfigRow) => {
  if (row.pushScope === 1) return '全局';
  const m = row.pushModules?.length ? row.pushModules.join('、') : '—';
  return `按模块：${m}`;
};

const ComponentInner: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [rows, setRows] = useState<MessageConfigRow[]>(initialRows);

  const [filterCode, setFilterCode] = useState('');
  const [filterType, setFilterType] = useState<MsgType | '全部'>('全部');
  const [filterSource, setFilterSource] = useState<(typeof MSG_SOURCE_OPTIONS)[number] | '全部'>('全部');

  const [applied, setApplied] = useState({
    code: '',
    type: '全部' as MsgType | '全部',
    source: '全部' as (typeof MSG_SOURCE_OPTIONS)[number] | '全部',
  });

  const [panel, setPanel] = useState<SidePanel>({ kind: 'closed' });
  /** 受控气泡：与 Switch 搭配，仅在确认后写入启用状态 */
  const [togglePop, setTogglePop] = useState<{ id: string; next: boolean } | null>(null);

  const sortedFiltered = useMemo(() => {
    const q = applied.code.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (q && !r.messageCode.toLowerCase().includes(q)) return false;
      if (applied.type !== '全部' && r.type !== applied.type) return false;
      if (applied.source !== '全部' && r.source !== applied.source) return false;
      return true;
    });
    return [...list].sort((a, b) => (a.updateTime < b.updateTime ? 1 : a.updateTime > b.updateTime ? -1 : 0));
  }, [rows, applied]);

  const closePanel = () => setPanel({ kind: 'closed' });

  const applyFilters = () => {
    setApplied({ code: filterCode, type: filterType, source: filterSource });
  };

  const resetFilters = () => {
    setFilterCode('');
    setFilterType('全部');
    setFilterSource('全部');
    setApplied({ code: '', type: '全部', source: '全部' });
  };

  const openCreate = () => {
    setPanel({ kind: 'form', editingId: null });
    form.resetFields();
    form.setFieldsValue({
      messageCode: '',
      type: 2,
      description: '',
      source: MSG_SOURCE_OPTIONS[0],
      pushScope: 1,
      pushModules: [],
      notificationMethod: NOTIFICATION_OPTIONS[0],
      needManualConfirm: false,
      autoCloseSeconds: 30,
      quietStartHour: undefined,
      quietEndHour: undefined,
    });
  };

  const openEdit = (record: MessageConfigRow) => {
    setPanel({ kind: 'form', editingId: record.id });
    form.setFieldsValue({
      messageCode: record.messageCode,
      type: record.type,
      description: record.description,
      source: record.source,
      pushScope: record.pushScope,
      pushModules: record.pushScope === 2 ? record.pushModules ?? [] : [],
      notificationMethod: record.notificationMethod,
      needManualConfirm: record.needManualConfirm,
      autoCloseSeconds: record.autoCloseSeconds ?? 30,
      quietStartHour: record.quietStartHour ?? undefined,
      quietEndHour: record.quietEndHour ?? undefined,
    });
  };

  const validateQuietHours = (start?: number | null, end?: number | null) => {
    const s = start === undefined || start === null ? null : start;
    const e = end === undefined || end === null ? null : end;
    if (s === null && e === null) return null;
    if (s === null || e === null) return '免打扰时段需同时选择开始与结束整点，或全部留空';
    if (s === 0 && e === 0) return null;
    if (s === e) return '开始时间与结束时间不能一致（配置 0-0 表示不启用免打扰）';
    return null;
  };

  const editingId = panel.kind === 'form' ? panel.editingId : null;

  const handleSubmit = async () => {
    if (panel.kind !== 'form') return;
    try {
      const v = await form.validateFields();
      const code: string = (v.messageCode as string).trim();
      if (/\s/.test(code)) {
        message.error('消息码不能包含空格');
        return;
      }
      const dup = rows.some((r) => r.messageCode === code && r.id !== editingId);
      if (dup) {
        message.error('消息码已存在，请更换后重试');
        return;
      }

      const quietErr = validateQuietHours(v.quietStartHour, v.quietEndHour);
      if (quietErr) {
        message.error(quietErr);
        return;
      }

      const needMc = Boolean(v.needManualConfirm);
      const autoClose: number | null = needMc ? null : Number(v.autoCloseSeconds);

      const pushScope = v.pushScope as PushScope;
      const pushModules: string[] = pushScope === 2 ? (v.pushModules as string[]) ?? [] : [];
      if (pushScope === 2 && (!pushModules || pushModules.length === 0)) {
        message.error('按模块推送时，请至少选择一个推送模块');
        return;
      }

      const quietStart =
        v.quietStartHour === undefined || v.quietStartHour === null ? null : Number(v.quietStartHour);
      const quietEnd =
        v.quietEndHour === undefined || v.quietEndHour === null ? null : Number(v.quietEndHour);

      const ts = now();
      if (!editingId) {
        const row: MessageConfigRow = {
          id: `${Date.now()}`,
          messageCode: code,
          enabled: true,
          type: v.type as MsgType,
          description: (v.description as string) ?? '',
          source: v.source as MessageConfigRow['source'],
          pushScope,
          pushModules,
          notificationMethod: v.notificationMethod,
          needManualConfirm: needMc,
          autoCloseSeconds: autoClose,
          quietStartHour: quietStart,
          quietEndHour: quietEnd,
          creator: '当前用户',
          createTime: ts,
          updater: '当前用户',
          updateTime: ts,
        };
        setRows((prev) => [row, ...prev]);
        message.success('保存成功，新建配置默认为启用状态');
      } else {
        setRows((prev) =>
          prev.map((r) =>
            r.id === editingId
              ? {
                  ...r,
                  messageCode: code,
                  type: v.type as MsgType,
                  description: (v.description as string) ?? '',
                  source: v.source as MessageConfigRow['source'],
                  pushScope,
                  pushModules,
                  notificationMethod: v.notificationMethod,
                  needManualConfirm: needMc,
                  autoCloseSeconds: autoClose,
                  quietStartHour: quietStart,
                  quietEndHour: quietEnd,
                  updater: '当前用户',
                  updateTime: ts,
                }
              : r
          )
        );
        message.success('保存成功');
      }
      closePanel();
    } catch {
      /* 表单校验失败 */
    }
  };

  const applyToggleFromPop = (recordId: string, next: boolean) => {
    const ts = now();
    setRows((prev) =>
      prev.map((r) =>
        r.id === recordId ? { ...r, enabled: next, updater: '当前用户', updateTime: ts } : r
      )
    );
    message.success(next ? '已启用' : '已禁用');
    setTogglePop(null);
  };

  const doDelete = (record: MessageConfigRow) => {
    setRows((prev) => prev.filter((r) => r.id !== record.id));
    message.success('已删除该配置及与其关联的消息记录（原型模拟）');
  };

  const columns: ColumnsType<MessageConfigRow> = [
    { title: '消息码', dataIndex: 'messageCode', width: 200, fixed: 'left', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 88,
      render: (_, record) => {
        const popOpen = togglePop?.id === record.id;
        const pending = popOpen ? togglePop.next : null;
        return (
          <Popconfirm
            open={popOpen}
            onOpenChange={(visible) => {
              if (!visible) setTogglePop(null);
            }}
            title={
              pending === true
                ? '确认启用该配置？'
                : pending === false
                  ? '确认禁用该配置？'
                  : '确认变更状态？'
            }
            description={
              pending === true
                ? '启用后，将按本配置参与消息推送与通知。'
                : pending === false
                  ? '禁用后，将不再按本配置产生新的推送（已产生记录不受影响，以实际系统为准）。'
                  : ''
            }
            okText="确认"
            cancelText="取消"
            onConfirm={() => {
              if (togglePop && togglePop.id === record.id) {
                applyToggleFromPop(togglePop.id, togglePop.next);
              }
            }}
          >
            <Switch
              checked={record.enabled}
              onChange={(next) => {
                setTogglePop({ id: record.id, next });
              }}
            />
          </Popconfirm>
        );
      },
    },
    { title: '类型', dataIndex: 'type', width: 110, render: (t: MsgType) => typeTag(t) },
    { title: '说明', dataIndex: 'description', width: 220, ellipsis: true },
    { title: '来源', dataIndex: 'source', width: 200, ellipsis: true },
    { title: '推送范围', key: 'push', width: 260, ellipsis: true, render: (_, r) => pushScopeText(r) },
    { title: '通知方式', dataIndex: 'notificationMethod', width: 160, ellipsis: true },
    {
      title: '需人工确认',
      dataIndex: 'needManualConfirm',
      width: 120,
      render: (v: boolean) => (v ? '是' : '否'),
    },
    {
      title: '自动关闭时长s',
      dataIndex: 'autoCloseSeconds',
      width: 140,
      render: (v: number | null, r) => (r.needManualConfirm ? '—' : (v ?? '—')),
    },
    { title: '创建人', dataIndex: 'creator', width: 100 },
    { title: '创建时间', dataIndex: 'createTime', width: 170 },
    { title: '更新人', dataIndex: 'updater', width: 100 },
    { title: '更新时间', dataIndex: 'updateTime', width: 170 },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除此配置？"
            description="已存在的相关消息记录将同步删除。此操作不可恢复，是否继续？"
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => doDelete(record)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const drawerOpen = panel.kind === 'form';

  const drawerTitle = editingId ? '编辑消息配置' : '新增消息配置';

  const drawerFooter = (
    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
      <Button onClick={closePanel}>取消</Button>
      <Button type="primary" onClick={handleSubmit}>
        保存
      </Button>
    </Space>
  );

  return (
    <div className="message-config-root p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Title level={3} style={{ margin: 0 }}>
              消息配置
            </Title>
            <Text type="secondary">维护第三方对接消息码与通知策略（浅色后台原型）</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增
          </Button>
        </div>

        <Card styles={{ body: { paddingBottom: 12 } }}>
          <Space wrap size="middle" className="w-full justify-between">
            <Space wrap>
              <Input
                allowClear
                placeholder="消息码（模糊）"
                value={filterCode}
                onChange={(e) => setFilterCode(e.target.value)}
                style={{ width: 220 }}
              />
              <Select
                value={filterType}
                onChange={setFilterType}
                style={{ width: 140 }}
                options={[
                  { value: '全部', label: '全部类型' },
                  ...MSG_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                ]}
              />
              <Select
                value={filterSource}
                onChange={setFilterSource}
                style={{ width: 260 }}
                options={[
                  { value: '全部', label: '全部来源' },
                  ...MSG_SOURCE_OPTIONS.map((s) => ({ value: s, label: s })),
                ]}
              />
              <Button type="primary" icon={<SearchOutlined />} onClick={applyFilters}>
                查询
              </Button>
              <Button onClick={resetFilters}>重置</Button>
            </Space>
            <Text type="secondary">列表按更新时间逆序</Text>
          </Space>
        </Card>

        <Card>
          <Table<MessageConfigRow>
            rowKey="id"
            columns={columns}
            dataSource={sortedFiltered}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
            scroll={{ x: 1800 }}
          />
        </Card>
      </div>

      <Drawer
        title={drawerTitle}
        placement="right"
        width={800}
        open={drawerOpen}
        onClose={closePanel}
        destroyOnClose
        footer={drawerFooter}
        styles={{ body: { paddingBottom: 16 } }}
      >
        {drawerOpen && (
          <Form
            form={form}
            layout="vertical"
            requiredMark
            initialValues={{
              type: 2,
              source: MSG_SOURCE_OPTIONS[0],
              pushScope: 1,
              pushModules: [],
              notificationMethod: NOTIFICATION_OPTIONS[0],
              needManualConfirm: false,
              autoCloseSeconds: 30,
            }}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="消息码"
                  name="messageCode"
                  rules={[{ required: true, message: '请输入消息码' }]}
                  extra="不允许包含空格；保存时校验全局唯一。"
                >
                  <Input
                    placeholder="例如 LIMS_PUSH_RESULT"
                    onChange={(e) => {
                      const v = e.target.value.replace(/\s/g, '');
                      form.setFieldValue('messageCode', v);
                    }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="类型" name="type" rules={[{ required: true, message: '请选择类型' }]}>
                  <Select options={MSG_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label="说明" name="description">
                  <Input.TextArea rows={3} placeholder="对该消息的补充说明（选填）" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="来源" name="source" rules={[{ required: true, message: '请选择来源' }]}>
                  <Select options={MSG_SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="通知方式"
                  name="notificationMethod"
                  rules={[{ required: true, message: '请选择通知方式' }]}
                >
                  <Select options={NOTIFICATION_OPTIONS.map((n) => ({ value: n, label: n }))} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="推送范围"
                  name="pushScope"
                  rules={[{ required: true, message: '请选择推送范围' }]}
                >
                  <Radio.Group
                    options={[
                      { value: 1, label: '1 全局' },
                      { value: 2, label: '2 按模块' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="需人工确认"
                  name="needManualConfirm"
                  rules={[{ required: true, message: '请选择' }]}
                >
                  <Radio.Group
                    options={[
                      { value: false, label: '否' },
                      { value: true, label: '是' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item shouldUpdate={(p, c) => p.pushScope !== c.pushScope} noStyle>
              {() =>
                form.getFieldValue('pushScope') === 2 ? (
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        label="推送模块"
                        name="pushModules"
                        rules={[{ required: true, message: '请至少选择一个模块' }]}
                      >
                        <Select
                          mode="multiple"
                          placeholder="请选择模块类型（多选）"
                          options={MODULE_OPTIONS.map((m) => ({ label: m, value: m }))}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                ) : null
              }
            </Form.Item>

            <Form.Item shouldUpdate={(p, c) => p.needManualConfirm !== c.needManualConfirm} noStyle>
              {() =>
                form.getFieldValue('needManualConfirm') ? null : (
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="自动关闭时长（秒）"
                        name="autoCloseSeconds"
                        rules={[{ required: true, message: '无需人工确认时必须配置自动关闭时长' }]}
                      >
                        <InputNumber min={1} max={86400} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                )
              }
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="免打扰开始（整点）" name="quietStartHour">
                  <Select allowClear placeholder="开始整点" options={HOUR_OPTIONS} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="免打扰结束（整点）" name="quietEndHour">
                  <Select allowClear placeholder="结束整点" options={HOUR_OPTIONS} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Text type="secondary" style={{ display: 'block', marginTop: -8, marginBottom: 16 }}>
                  非必填；开始与结束不能相同（配置为 <Text code>0</Text> - <Text code>0</Text> 表示不启用免打扰）。请同时选择开始与结束，或全部留空。
                </Text>
              </Col>
            </Row>
          </Form>
        )}
      </Drawer>
    </div>
  );
};

const Component: React.FC = () => (
  <ConfigProvider locale={zhCN} theme={{ algorithm: theme.defaultAlgorithm }}>
    <App>
      <ComponentInner />
    </App>
  </ConfigProvider>
);

export default Component;
