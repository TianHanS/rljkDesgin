/**
 * @name 自动入厂监测
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-standards.md
 * - /src/themes/antd-new/DESIGN-SPEC.md
 * - /skills/default-design-guide-minimal/SKILL.md
 * - /src/prototypes/auto-entry-monitor/spec.md
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfigProvider, Modal, Segmented, Table, Tag, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { ColumnsType } from 'antd/es/table';
import './style.css';
import GatePointCard from './components/GatePointCard';
import {
  CHANNELS,
  LIVE_PLATES,
  QUEUE_STATUS_LABEL,
  QUEUE_VEHICLES,
  SAMPLE_POS,
  WEIGH_POS,
  createInitialGates,
  createInitialLogs,
  createInitialRecords,
  formatClock,
  formatDateTime,
  nextLogId,
  pairWindows,
  type ChannelInfo,
  type EntryRecord,
  type GatePoint,
  type QueueVehicle,
  type RunLog,
} from './data';

const LIVE_EVENTS: Array<{
  level: RunLog['level'];
  kind: RunLog['kind'];
  build: (plate: string, sample: string, weigh: string) => string;
  register?: boolean;
}> = [
  { level: 'normal', kind: 'recognize', build: (plate) => `识别车辆 ${plate}，置信度 ${96 + Math.floor(Math.random() * 4)}%` },
  {
    level: 'normal',
    kind: 'register-ok',
    register: true,
    build: (plate, sample, weigh) => `登记成功 ${plate}，采样位 ${sample}，过衡位 ${weigh}`,
  },
  { level: 'normal', kind: 'inspect', build: (plate) => `车辆抽检 ${plate}，已引导至抽检区` },
  { level: 'exception', kind: 'abnormal', build: (plate) => `车辆异常 ${plate}：预入厂状态异常，已拦截` },
  { level: 'exception', kind: 'cut-in', build: (plate) => `车辆插队 ${plate}：未按排队序号驶入识别区` },
  { level: 'exception', kind: 'register-fail', build: (plate) => `登记失败 ${plate}：未匹配到来煤计划` },
];

function ledTextFor(gate: GatePoint, enabled: boolean): string {
  if (gate.recognizer === 'offline') return '设备离线  暂停自动入厂';
  if (!enabled) return '自动入厂已关闭  请转人工通道';
  if (gate.currentPlate) return `欢迎入厂  ${gate.currentPlate}  请按引导行驶`;
  return '请排队等候  保持车距';
}

const AutoEntryMonitor: React.FC = () => {
  const [now, setNow] = useState(() => new Date());
  const [channelId, setChannelId] = useState(CHANNELS[0].id);
  const [pairIndex, setPairIndex] = useState(0);
  const [gates, setGates] = useState<GatePoint[]>(() => createInitialGates());
  const [logs, setLogs] = useState<RunLog[]>(() => createInitialLogs(new Date()));
  const [records, setRecords] = useState<EntryRecord[]>(() => createInitialRecords(new Date()));
  const gatesRef = useRef(gates);
  gatesRef.current = gates;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const channel = CHANNELS.find((item) => item.id === channelId) as ChannelInfo;
  const windows = pairWindows(channel.gateIds);
  const safePairIndex = Math.min(pairIndex, Math.max(windows.length - 1, 0));
  const visibleIds = windows[safePairIndex] ?? channel.gateIds.slice(0, 2);
  const visibleGates = visibleIds
    .map((id) => gates.find((gate) => gate.id === id))
    .filter((gate): gate is GatePoint => Boolean(gate));

  const channelGates = gates.filter((gate) => gate.channelId === channelId);
  const channelLogs = logs.filter((item) => channelGates.some((gate) => gate.id === item.gateId));
  const channelRecords = records
    .filter((item) => channelGates.some((gate) => gate.id === item.gateId))
    .slice()
    .sort((a, b) => (a.enterAt < b.enterAt ? 1 : -1));
  const queueList = QUEUE_VEHICLES.filter((item) => item.channelId === channelId);
  const plantQueue = QUEUE_VEHICLES.length;

  const stats = useMemo(() => {
    const waitingOver = queueList.filter((item) => item.waitMin >= 30).length;
    const avgWait = queueList.length
      ? Math.round(queueList.reduce((sum, item) => sum + item.waitMin, 0) / queueList.length)
      : 0;
    return {
      queue: queueList.length,
      entered: channelRecords.length,
      overtime: waitingOver,
      inspect: channelLogs.filter((item) => item.kind === 'inspect').length,
      exception: channelLogs.filter((item) => item.level === 'exception').length,
      avgWait,
    };
  }, [queueList, channelRecords, channelLogs]);

  const confirmToggle = useCallback((gate: GatePoint, next: boolean) => {
    const action = next ? '启用' : '停用';
    Modal.confirm({
      title: `${action}自动入厂登记服务`,
      content: next
        ? `确认启用「${gate.name}」自动入厂登记服务？启用后将恢复车号识别与自动登记。`
        : `确认停用「${gate.name}」自动入厂登记服务？停用后该点不再自动识别登记，现场车辆需转人工入厂。`,
      okText: `确认${action}`,
      cancelText: '取消',
      okButtonProps: next ? undefined : { danger: true },
      onOk: () => {
        setGates((list) =>
          list.map((item) =>
            item.id === gate.id
              ? { ...item, serviceEnabled: next, ledText: ledTextFor(item, next) }
              : item,
          ),
        );
        setLogs((list) => [
          {
            id: nextLogId(),
            gateId: gate.id,
            time: formatDateTime(new Date()),
            level: 'normal',
            kind: 'service',
            message: `已${action}自动入厂登记服务`,
          },
          ...list,
        ]);
        message.success(`「${gate.name}」自动入厂登记服务已${action}`);
      },
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const liveGates = gatesRef.current.filter(
        (gate) => gate.channelId === channelId && gate.serviceEnabled && gate.recognizer === 'online',
      );
      if (liveGates.length === 0) return;
      const target = liveGates[Math.floor(Math.random() * liveGates.length)];
      const event = LIVE_EVENTS[Math.floor(Math.random() * LIVE_EVENTS.length)];
      const plate = LIVE_PLATES[Math.floor(Math.random() * LIVE_PLATES.length)];
      const sample = SAMPLE_POS[Math.floor(Math.random() * SAMPLE_POS.length)];
      const weigh = WEIGH_POS[Math.floor(Math.random() * WEIGH_POS.length)];
      const stamp = formatDateTime(new Date());

      setLogs((list) => [
        {
          id: nextLogId(),
          gateId: target.id,
          time: stamp,
          level: event.level,
          kind: event.kind,
          plate,
          message: event.build(plate, sample, weigh),
        },
        ...list,
      ]);

      if (event.register) {
        setRecords((list) => [
          {
            id: nextLogId(),
            gateId: target.id,
            plate,
            enterAt: stamp,
            samplePos: sample,
            weighPos: weigh,
          },
          ...list,
        ]);
      }

      setGates((currentGates) =>
        currentGates.map((gate) =>
          gate.id === target.id
            ? {
                ...gate,
                currentPlate: plate,
                ledText: event.kind === 'inspect'
                  ? `抽检车辆  请停靠抽检区  ${plate}`
                  : event.kind === 'register-fail' || event.kind === 'abnormal' || event.kind === 'cut-in'
                    ? `请停车等待  ${plate}`
                    : `欢迎入厂  ${plate}  请按引导行驶`,
              }
            : gate,
        ),
      );
    }, 7000);
    return () => window.clearInterval(timer);
  }, [channelId]);

  const queueColumns: ColumnsType<QueueVehicle> = [
    { title: '序号', dataIndex: 'seq', width: 56 },
    { title: '车牌号', dataIndex: 'plate', width: 108 },
    { title: '煤种/物资', dataIndex: 'cargo', width: 88 },
    { title: '供应商', dataIndex: 'supplier', ellipsis: true },
    {
      title: '等待',
      dataIndex: 'waitMin',
      width: 80,
      render: (value: number) => (
        <span style={{ color: value >= 30 ? '#cf1322' : undefined }}>{value} 分钟</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 96,
      render: (status: QueueVehicle['status']) => {
        const color = status === 'overtime' ? 'error' : status === 'approaching' ? 'processing' : 'default';
        return <Tag color={color}>{QUEUE_STATUS_LABEL[status]}</Tag>;
      },
    },
  ];

  const recordColumns: ColumnsType<EntryRecord> = [
    {
      title: '发卡点',
      dataIndex: 'gateId',
      width: 120,
      render: (gateId: string) => gates.find((gate) => gate.id === gateId)?.name.replace('发卡点', '') ?? gateId,
    },
    { title: '车牌号', dataIndex: 'plate', width: 108 },
    { title: '入厂时间', dataIndex: 'enterAt', width: 160 },
    { title: '采样位', dataIndex: 'samplePos', ellipsis: true },
    { title: '过衡位', dataIndex: 'weighPos', ellipsis: true },
  ];

  const pairOptions = windows.map((pair, index) => {
    const names = pair
      .map((id) => gates.find((gate) => gate.id === id)?.name.replace('发卡点', '').trim())
      .join(' / ');
    return { label: names, value: String(index) };
  });

  return (
    <ConfigProvider locale={zhCN}>
      <div className="aem-root">
        <header className="aem-head">
          <h1>自动入厂监测</h1>
          <div className="aem-head-tools">
            <Segmented
              size="small"
              value={channelId}
              options={CHANNELS.map((item) => ({ label: item.name, value: item.id }))}
              onChange={(value) => {
                setChannelId(String(value));
                setPairIndex(0);
              }}
            />
            {pairOptions.length > 1 ? (
              <Segmented
                size="small"
                value={String(safePairIndex)}
                options={pairOptions}
                onChange={(value) => setPairIndex(Number(value))}
              />
            ) : null}
          </div>
          <div className="aem-stats">
            <div className="aem-stat">
              <div className="label">全厂排队</div>
              <div className="value">{plantQueue}<span className="unit">辆</span></div>
            </div>
            <div className="aem-stat">
              <div className="label">当前排队</div>
              <div className="value">{stats.queue}<span className="unit">辆</span></div>
            </div>
            <div className="aem-stat">
              <div className="label">今日已入厂</div>
              <div className="value">{stats.entered}<span className="unit">辆</span></div>
            </div>
            <div className={`aem-stat ${stats.overtime > 0 ? 'warn' : ''}`}>
              <div className="label">等待超 30 分</div>
              <div className="value">{stats.overtime}<span className="unit">辆</span></div>
            </div>
            <div className="aem-stat">
              <div className="label">今日抽检</div>
              <div className="value">{stats.inspect}<span className="unit">次</span></div>
            </div>
            <div className={`aem-stat ${stats.exception > 0 ? 'alarm' : ''}`}>
              <div className="label">今日异常</div>
              <div className="value">{stats.exception}<span className="unit">条</span></div>
            </div>
            <div className="aem-stat">
              <div className="label">平均等待</div>
              <div className="value">{stats.avgWait}<span className="unit">分</span></div>
            </div>
          </div>
          <div className="aem-clock">{formatClock(now)}</div>
        </header>

        <div className="aem-main">
          {visibleGates.map((gate) => (
            <GatePointCard
              key={gate.id}
              gate={gate}
              clock={formatClock(now)}
              logs={logs.filter((item) => item.gateId === gate.id)}
              onToggleService={(next) => confirmToggle(gate, next)}
            />
          ))}
        </div>

        <div className="aem-bottom">
          <section className="aem-panel">
            <div className="aem-panel-hd">
              <h2>{channel.name}排队车辆</h2>
              <span>超时红色标识</span>
            </div>
            <div className="aem-panel-bd">
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                columns={queueColumns}
                dataSource={queueList}
                scroll={{ y: 164 }}
                locale={{ emptyText: '当前通道暂无排队车辆' }}
              />
            </div>
          </section>
          <section className="aem-panel">
            <div className="aem-panel-hd">
              <h2>已入厂登记车辆</h2>
              <span>按入厂时间逆序</span>
            </div>
            <div className="aem-panel-bd">
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                columns={recordColumns}
                dataSource={channelRecords}
                scroll={{ y: 164 }}
                locale={{ emptyText: '暂无入厂登记车辆' }}
              />
            </div>
          </section>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default AutoEntryMonitor;
