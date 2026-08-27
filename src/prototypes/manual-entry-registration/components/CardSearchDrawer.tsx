/**
 * 煤样卡查询：读卡动画、5s 超时、展示卡号与车辆入厂信息
 */
import React, { useEffect, useRef, useState } from 'react';
import { Button, Descriptions, Drawer, Space, Spin, message } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { findPlan, findPreEntry, type CoalPlan } from '../data';

type Phase = 'idle' | 'reading' | 'success' | 'timeout';

interface CardResult {
  cardNo: string;
  plate: string;
  serialNo: string;
  plan: CoalPlan;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (result: CardResult) => void;
}

const MOCK_CARDS = [
  { cardNo: 'MC-8821-A', plate: '蒙A90005' },
  { cardNo: 'MC-8822-B', plate: '桂A8T216' },
];

const CardSearchDrawer: React.FC<Props> = ({ open, onClose, onApply }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<CardResult | null>(null);
  const timerRef = useRef<number>();

  const reset = () => {
    setPhase('idle');
    setResult(null);
    if (timerRef.current) window.clearTimeout(timerRef.current);
  };

  useEffect(() => {
    if (!open) reset();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [open]);

  const startRead = () => {
    reset();
    setPhase('reading');
    timerRef.current = window.setTimeout(() => {
      setPhase('timeout');
      message.warning('未读取到卡片信息！');
    }, 5000);

    window.setTimeout(() => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const mock = MOCK_CARDS[Math.floor(Math.random() * MOCK_CARDS.length)];
      const pre = findPreEntry(mock.plate);
      const plan = pre ? findPlan(pre.planId) : undefined;
      if (!plan) {
        setPhase('timeout');
        message.warning('未读取到卡片信息！');
        return;
      }
      const data: CardResult = {
        cardNo: mock.cardNo,
        plate: mock.plate,
        serialNo: `RCJ${Date.now().toString().slice(-8)}`,
        plan,
      };
      setResult(data);
      setPhase('success');
    }, 1800);
  };

  const apply = () => {
    if (!result) return;
    onApply(result);
    onClose();
  };

  return (
    <Drawer
      title="煤样卡查询"
      open={open}
      onClose={onClose}
      width={480}
      destroyOnHidden
      footer={
        <Space style={{ float: 'right' }}>
          <Button onClick={onClose}>关闭</Button>
          <Button type="primary" disabled={!result} onClick={apply}>
            回填表单
          </Button>
        </Space>
      }
    >
      <div className="mer-card-read">
        {phase === 'reading' ? (
          <div className="mer-card-read-anim">
            <Spin indicator={<CreditCardOutlined spin style={{ fontSize: 36 }} />} />
            <p>正在读卡…</p>
          </div>
        ) : phase === 'timeout' ? (
          <div className="mer-card-read-anim mer-card-read-fail">
            <CreditCardOutlined style={{ fontSize: 36, color: '#faad14' }} />
            <p>未读取到卡片信息！</p>
          </div>
        ) : result ? (
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="煤样卡号">{result.cardNo}</Descriptions.Item>
            <Descriptions.Item label="车牌号码">{result.plate}</Descriptions.Item>
            <Descriptions.Item label="入厂流水号">{result.serialNo}</Descriptions.Item>
            <Descriptions.Item label="供应商">{result.plan.supplier}</Descriptions.Item>
            <Descriptions.Item label="矿点">{result.plan.mine}</Descriptions.Item>
            <Descriptions.Item label="煤种">{result.plan.coalType}</Descriptions.Item>
          </Descriptions>
        ) : (
          <p className="mer-card-read-hint">点击下方按钮开始读卡，或将卡片放置在读卡器上。</p>
        )}
        <Button type="primary" block style={{ marginTop: 16 }} onClick={startRead}>
          {phase === 'reading' ? '重新读卡' : '读卡查询'}
        </Button>
      </div>
    </Drawer>
  );
};

export default CardSearchDrawer;
export type { CardResult };
