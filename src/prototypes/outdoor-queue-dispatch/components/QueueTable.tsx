/**
 * 通道排队队列：增补、冻结、解冻、优先、插队、移除
 */
import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  Button,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  STATUS_LABEL,
  plateSvgDataUri,
  type QueueChannel,
  type QueueStatus,
  type QueueVehicle,
} from '../data';

interface Props {
  channel: QueueChannel;
  rows: QueueVehicle[];
  onAdd: (plate: string) => void;
  onFreeze: (id: string) => void;
  onUnfreeze: (id: string) => void;
  onPriority: (id: string) => void;
  onCutIn: (id: string, seq: number) => void;
  onRemove: (id: string) => void;
}

const statusColor = (s: QueueStatus) => {
  if (s === 'priority') return 'processing';
  if (s === 'frozen') return 'error';
  return 'default';
};

const QueueTable: React.FC<Props> = ({
  channel,
  rows,
  onAdd,
  onFreeze,
  onUnfreeze,
  onPriority,
  onCutIn,
  onRemove,
}) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [tableY, setTableY] = useState(180);
  const [keyword, setKeyword] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [cutTarget, setCutTarget] = useState<QueueVehicle | null>(null);
  const [addForm] = Form.useForm<{ plate: string }>();
  const [cutForm] = Form.useForm<{ seq: number }>();

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const sync = () => {
      const head = el.querySelector('.ant-table-thead') as HTMLElement | null;
      setTableY(Math.max(120, el.clientHeight - (head?.offsetHeight ?? 39) - 2));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows.length, channel.id]);

  const filtered = rows.filter((r) => !keyword || r.plate.includes(keyword.trim().toUpperCase()));
  const activeCount = rows.filter((r) => r.status !== 'frozen').length;

  const columns: ColumnsType<QueueVehicle> = [
    { title: '排队序号', dataIndex: 'seq', width: 88 },
    { title: '取号号码', dataIndex: 'ticketNo', width: 130 },
    { title: '排队通道', width: 110, render: () => channel.name },
    { title: '车牌号', dataIndex: 'plate', width: 110 },
    {
      title: '车号抓拍',
      width: 120,
      render: (_, row) => (
        <Image
          width={96}
          height={30}
          src={plateSvgDataUri(row.plate)}
          alt={row.plate}
          preview={{ mask: '预览' }}
        />
      ),
    },
    { title: '排队时间', dataIndex: 'queuedAt', width: 168 },
    {
      title: '排队状态',
      dataIndex: 'status',
      width: 88,
      render: (s: QueueStatus) => <Tag color={statusColor(s)}>{STATUS_LABEL[s]}</Tag>,
    },
    {
      title: '允许入厂',
      width: 100,
      render: (_, row) =>
        row.allowEntry ? (
          <Tag color={row.status === 'priority' ? 'processing' : 'success'}>
            {row.status === 'priority' ? '允许（优先）' : '允许'}
          </Tag>
        ) : (
          <Tag color="error">禁止</Tag>
        ),
    },
    {
      title: '操作',
      width: 248,
      render: (_, row) => (
        <Space size={0} wrap={false}>
          {row.status === 'frozen' ? (
            <Button type="link" size="small" onClick={() => onUnfreeze(row.id)}>
              解冻
            </Button>
          ) : (
            <Button type="link" size="small" onClick={() => onFreeze(row.id)}>
              冻结
            </Button>
          )}
          <Button
            type="link"
            size="small"
            disabled={row.status === 'frozen' || row.status === 'priority'}
            onClick={() => onPriority(row.id)}
          >
            优先
          </Button>
          <Button
            type="link"
            size="small"
            disabled={row.status === 'frozen'}
            onClick={() => {
              setCutTarget(row);
              cutForm.setFieldsValue({ seq: row.seq });
            }}
          >
            插队
          </Button>
          <Popconfirm title={`移除 ${row.plate} 的排队？`} onConfirm={() => onRemove(row.id)}>
            <Button type="link" size="small" danger>
              移除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <section className="oqd-card oqd-queue-card">
      <div className="oqd-card-hd">
        <h2>排队队列</h2>
        <Space>
          <Input
            allowClear
            placeholder="按车牌筛选"
            style={{ width: 160 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value.toUpperCase())}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            增补排队
          </Button>
        </Space>
      </div>
      <div className="oqd-queue-body" ref={bodyRef}>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 1280, y: tableY }}
        />
      </div>

      <Modal
        title="增补排队车辆"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        destroyOnHidden
        onOk={async () => {
          const { plate } = await addForm.validateFields();
          onAdd(plate.trim().toUpperCase());
          setAddOpen(false);
          addForm.resetFields();
        }}
      >
        <Form form={addForm} layout="vertical">
          <Form.Item
            label="车牌号码"
            name="plate"
            rules={[
              { required: true, message: '请输入车牌' },
              { pattern: /^[\u4e00-\u9fa5A-Z]{1}[A-Z][A-Z0-9]{4,6}$/, message: '车牌格式不正确' },
            ]}
          >
            <Input
              placeholder="如 蒙A90005"
              maxLength={8}
              onChange={(e) => addForm.setFieldValue('plate', e.target.value.toUpperCase())}
            />
          </Form.Item>
          <p className="oqd-hint">将加入 {channel.name}，取号后状态为正常、允许入厂。</p>
        </Form>
      </Modal>

      <Modal
        title={cutTarget ? `插队 · ${cutTarget.plate}` : '插队'}
        open={!!cutTarget}
        onCancel={() => setCutTarget(null)}
        destroyOnHidden
        onOk={async () => {
          if (!cutTarget) return;
          const { seq } = await cutForm.validateFields();
          onCutIn(cutTarget.id, seq);
          setCutTarget(null);
        }}
      >
        <Form form={cutForm} layout="vertical">
          <Form.Item
            label="目标序号"
            name="seq"
            rules={[{ required: true, message: '请输入序号' }]}
          >
            <InputNumber min={1} max={Math.max(1, activeCount)} style={{ width: '100%' }} />
          </Form.Item>
          <p className="oqd-hint">可插入范围为 1～{Math.max(1, activeCount)}（冻结车辆保持在队尾）。</p>
        </Form>
      </Modal>
    </section>
  );
};

export default QueueTable;
