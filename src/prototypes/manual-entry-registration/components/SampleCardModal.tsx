/**
 * 发 / 补发煤样卡，以及按车牌查询写卡记录。
 */
import React, { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Drawer, Input, Modal, Space, Spin, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { EntryRecord } from '../data';

export interface CardLog {
  id: string;
  plate: string;
  serialNo: string;
  writtenAt: string;
  kind: 'issue' | 'reissue';
}

interface WriteProps {
  open: boolean;
  plate: string;
  serialNo: string;
  kind: 'issue' | 'reissue';
  onClose: () => void;
  onWritten: (log: CardLog) => void;
}

export const SampleCardWriteModal: React.FC<WriteProps> = ({
  open,
  plate,
  serialNo,
  kind,
  onClose,
  onWritten,
}) => {
  const [phase, setPhase] = useState<'wait' | 'writing' | 'done'>('wait');
  const [left, setLeft] = useState(5);

  useEffect(() => {
    if (!open) {
      setPhase('wait');
      setLeft(5);
    }
  }, [open]);

  useEffect(() => {
    if (phase !== 'done') return undefined;
    if (left <= 0) {
      onClose();
      return undefined;
    }
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, left, onClose]);

  const write = () => {
    setPhase('writing');
    window.setTimeout(() => {
      setPhase('done');
      onWritten({
        id: `C${Date.now()}`,
        plate,
        serialNo,
        writtenAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        kind,
      });
      message.success('写卡成功');
    }, 1200);
  };

  return (
    <Modal
      title={kind === 'reissue' ? '补发煤样卡' : '发放煤样卡'}
      open={open}
      onCancel={onClose}
      footer={
        phase === 'wait' ? (
          <Button type="primary" onClick={write}>
            开始写卡
          </Button>
        ) : phase === 'done' ? (
          <Button onClick={onClose}>关闭（{left}s）</Button>
        ) : null
      }
      destroyOnHidden
    >
      <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
        <Descriptions.Item label="车牌号">{plate}</Descriptions.Item>
        <Descriptions.Item label="入厂流水号">{serialNo || '—'}</Descriptions.Item>
      </Descriptions>
      {phase === 'wait' ? (
        <Alert
          type="info"
          showIcon
          message="请刷卡，等待写卡成功！写卡过程中请勿随意移动..."
        />
      ) : null}
      {phase === 'writing' ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
          <p style={{ marginTop: 12 }}>正在写卡…</p>
        </div>
      ) : null}
      {phase === 'done' ? (
        <Alert
          type="success"
          showIcon
          message="写卡成功"
          description="采集程序将在 60 秒后主动清除写卡内容，避免后续车辆写入重复信息。"
        />
      ) : null}
    </Modal>
  );
};

interface QueryProps {
  open: boolean;
  logs: CardLog[];
  onClose: () => void;
}

export const SampleCardQueryDrawer: React.FC<QueryProps> = ({ open, logs, onClose }) => {
  const [plate, setPlate] = useState('');
  const [shown, setShown] = useState<CardLog[]>([]);

  const columns: ColumnsType<CardLog> = [
    { title: '车牌', dataIndex: 'plate', width: 110 },
    { title: '入厂流水号', dataIndex: 'serialNo', width: 160 },
    {
      title: '类型',
      dataIndex: 'kind',
      width: 90,
      render: (v: CardLog['kind']) => <Tag>{v === 'reissue' ? '补发' : '新发'}</Tag>,
    },
    { title: '写卡时间', dataIndex: 'writtenAt' },
  ];

  return (
    <Drawer title="煤样卡查询" open={open} onClose={onClose} width={560} destroyOnHidden>
      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <Input
          placeholder="按车牌查询"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          onPressEnter={() =>
            setShown(logs.filter((l) => !plate || l.plate.includes(plate.trim())))
          }
        />
        <Button
          type="primary"
          onClick={() => setShown(logs.filter((l) => !plate || l.plate.includes(plate.trim())))}
        >
          查询
        </Button>
      </Space.Compact>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={shown}
        locale={{ emptyText: '输入车牌后查询写卡记录' }}
      />
    </Drawer>
  );
};

interface ReissueProps {
  open: boolean;
  records: EntryRecord[];
  onClose: () => void;
  onPick: (record: EntryRecord) => void;
}

export const ReissuePickModal: React.FC<ReissueProps> = ({ open, records, onClose, onPick }) => {
  const columns: ColumnsType<EntryRecord> = [
    { title: '流水号', dataIndex: 'serialNo', width: 160 },
    { title: '车牌', dataIndex: 'plate', width: 110 },
    { title: '入厂时间', dataIndex: 'enterAt', width: 170 },
    {
      title: '操作',
      width: 100,
      render: (_, row) => (
        <Button type="link" onClick={() => onPick(row)}>
          补发
        </Button>
      ),
    },
  ];
  return (
    <Modal title="补发煤样卡" open={open} onCancel={onClose} footer={null} width={640} destroyOnHidden>
      <p className="mer-scan-hint">选择一条入厂登记记录补发煤样卡。查询范围为该车入厂时间前后 30 分钟内的流水。</p>
      <Table rowKey="id" size="small" pagination={false} columns={columns} dataSource={records} />
    </Modal>
  );
};
