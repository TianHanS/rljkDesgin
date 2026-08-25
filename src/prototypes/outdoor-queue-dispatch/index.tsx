/**
 * @name 厂外调度
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-standards.md
 * - /src/themes/antd-new/DESIGN-SPEC.md
 * - /skills/default-design-guide-minimal/SKILL.md
 * - 用户提供的厂外调度（厂外排队监控）需求
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ConfigProvider, Select, Switch, Tag, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './style.css';
import {
  CHANNELS,
  DEVICES,
  INITIAL_LOGS,
  INITIAL_QUEUE,
  PASSING_PLATES,
  formatNow,
  ledText,
  nextTicket,
  type QueueVehicle,
  type RecognizeLog,
} from './data';
import DevicePanel from './components/DevicePanel';
import QueueTable from './components/QueueTable';
import RecognizeLogList from './components/RecognizeLog';
import VideoMonitor from './components/VideoMonitor';

const renumber = (list: QueueVehicle[]) => list.map((v, i) => ({ ...v, seq: i + 1 }));

const regroup = (list: QueueVehicle[]) => {
  const priority = list.filter((v) => v.status === 'priority');
  const normal = list.filter((v) => v.status === 'normal');
  const frozen = list.filter((v) => v.status === 'frozen');
  return renumber([...priority, ...normal, ...frozen]);
};

const OutdoorQueueDispatch: React.FC = () => {
  const [channelId, setChannelId] = useState(CHANNELS[0].id);
  const [plantOn, setPlantOn] = useState(true);
  const [yunyiOn, setYunyiOn] = useState(false);
  const [logs, setLogs] = useState<RecognizeLog[]>(() => INITIAL_LOGS.map((r) => ({ ...r })));
  const [queue, setQueue] = useState<QueueVehicle[]>(() => INITIAL_QUEUE.map((r) => ({ ...r })));
  const [passIdx, setPassIdx] = useState(0);

  const channel = CHANNELS.find((c) => c.id === channelId) ?? CHANNELS[0];
  const devices = DEVICES.filter((d) => d.channelId === channel.id);
  const channelLogs = logs
    .filter((r) => r.channelId === channel.id)
    .slice()
    .sort((a, b) => (a.recognizedAt < b.recognizedAt ? 1 : -1));
  const channelQueue = useMemo(
    () => queue.filter((v) => v.channelId === channel.id).sort((a, b) => a.seq - b.seq),
    [queue, channel.id],
  );
  const head = channelQueue.find((v) => v.allowEntry);
  const led = ledText(plantOn, yunyiOn, head);
  const latest = channelLogs[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPassIdx((i) => {
        const plate = PASSING_PLATES[i % PASSING_PLATES.length];
        const rec: RecognizeLog = {
          id: `l-${Date.now()}`,
          channelId,
          plate,
          recognizedAt: formatNow(),
        };
        setLogs((list) => [rec, ...list].slice(0, 80));
        setQueue((list) => {
          if (!plantOn || yunyiOn) return list;
          if (list.some((v) => v.channelId === channelId && v.plate === plate)) return list;
          const ch = CHANNELS.find((c) => c.id === channelId) ?? CHANNELS[0];
          const added: QueueVehicle = {
            id: `q-${Date.now()}`,
            channelId,
            seq: 0,
            ticketNo: nextTicket(ch, list),
            plate,
            queuedAt: rec.recognizedAt,
            status: 'normal',
            allowEntry: true,
          };
          const others = list.filter((v) => v.channelId !== channelId);
          const current = list.filter((v) => v.channelId === channelId);
          const frozen = current.filter((v) => v.status === 'frozen');
          const active = current.filter((v) => v.status !== 'frozen');
          return [...others, ...renumber([...active, added, ...frozen])];
        });
        return i + 1;
      });
    }, 8000);
    return () => window.clearInterval(timer);
  }, [channelId, plantOn, yunyiOn]);

  const patchChannel = (next: QueueVehicle[]) => {
    setQueue((list) => [...list.filter((v) => v.channelId !== channel.id), ...next]);
  };

  const handlePlant = (on: boolean) => {
    setPlantOn(on);
    if (on && yunyiOn) {
      setYunyiOn(false);
      message.success('已停用云驿排队，厂外自动排队已启用');
      return;
    }
    message.success(on ? '厂外自动排队已启用' : '厂外自动排队已停用');
  };

  const handleYunyi = (on: boolean) => {
    setYunyiOn(on);
    if (on && plantOn) {
      setPlantOn(false);
      message.success('已停用厂外自动排队，云驿排队已启用');
      return;
    }
    message.success(on ? '云驿排队已启用' : '云驿排队已停用');
  };

  const handleAdd = (plate: string) => {
    if (channelQueue.some((v) => v.plate === plate)) {
      message.error(`${plate} 已在 ${channel.name} 排队`);
      return;
    }
    const added: QueueVehicle = {
      id: `q-${Date.now()}`,
      channelId: channel.id,
      seq: 0,
      ticketNo: nextTicket(channel, queue),
      plate,
      queuedAt: formatNow(),
      status: 'normal',
      allowEntry: true,
    };
    const frozen = channelQueue.filter((v) => v.status === 'frozen');
    const active = channelQueue.filter((v) => v.status !== 'frozen');
    patchChannel(renumber([...active, added, ...frozen]));
    message.success(`${plate} 已增补排队，取号 ${added.ticketNo}`);
  };

  const handleFreeze = (id: string) => {
    const target = channelQueue.find((v) => v.id === id);
    if (!target) return;
    const rest = channelQueue.filter((v) => v.id !== id);
    patchChannel(
      regroup([...rest, { ...target, status: 'frozen', allowEntry: false }]),
    );
    message.success(`${target.plate} 已冻结，禁止入厂，序号移至队尾`);
  };

  const handleUnfreeze = (id: string) => {
    const target = channelQueue.find((v) => v.id === id);
    if (!target) return;
    const rest = channelQueue.filter((v) => v.id !== id);
    const priority = rest.filter((v) => v.status === 'priority');
    const normal = rest.filter((v) => v.status === 'normal');
    const frozen = rest.filter((v) => v.status === 'frozen');
    patchChannel(
      renumber([...priority, ...normal, { ...target, status: 'normal', allowEntry: true }, ...frozen]),
    );
    message.success(`${target.plate} 已解冻，允许入厂`);
  };

  const handlePriority = (id: string) => {
    const target = channelQueue.find((v) => v.id === id);
    if (!target || target.status === 'frozen') {
      message.warning('冻结车辆请先解冻再设为优先');
      return;
    }
    const rest = channelQueue.filter((v) => v.id !== id);
    const priority = rest.filter((v) => v.status === 'priority');
    const normal = rest.filter((v) => v.status === 'normal');
    const frozen = rest.filter((v) => v.status === 'frozen');
    patchChannel(
      renumber([{ ...target, status: 'priority', allowEntry: true }, ...priority, ...normal, ...frozen]),
    );
    message.success(`${target.plate} 已设为优先，允许优先入厂`);
  };

  const handleCutIn = (id: string, seq: number) => {
    const target = channelQueue.find((v) => v.id === id);
    if (!target || target.status === 'frozen') return;
    const frozen = channelQueue.filter((v) => v.status === 'frozen');
    const active = channelQueue.filter((v) => v.status !== 'frozen' && v.id !== id);
    const idx = Math.min(Math.max(seq - 1, 0), active.length);
    active.splice(idx, 0, target);
    patchChannel(renumber([...active, ...frozen]));
    message.success(`${target.plate} 已插队至第 ${idx + 1} 位`);
  };

  const handleRemove = (id: string) => {
    const target = channelQueue.find((v) => v.id === id);
    patchChannel(renumber(channelQueue.filter((v) => v.id !== id)));
    if (target) message.success(`${target.plate} 已移除排队`);
  };

  return (
    <ConfigProvider locale={zhCN} componentSize="small">
      <div className="oqd-root">
        <header className="oqd-head">
          <h1>厂外调度</h1>
          <div className="oqd-head-tools">
            {yunyiOn ? (
              <Tag color="blue">云驿接管</Tag>
            ) : plantOn ? (
              <Tag color="success">自动取号</Tag>
            ) : (
              <Tag color="warning">排队停用</Tag>
            )}
            <span className="oqd-muted">排队通道</span>
            <Select
              style={{ width: 148 }}
              value={channelId}
              options={CHANNELS.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(id) => setChannelId(id)}
            />
            <span className="oqd-points">
              {channel.entryPoints.map((p) => (
                <Tag key={p.id}>{p.name}</Tag>
              ))}
            </span>
            <label className="oqd-switch">
              厂外自动排队
              <Switch checked={plantOn} onChange={handlePlant} />
            </label>
            <label className="oqd-switch">
              云驿排队
              <Switch checked={yunyiOn} onChange={handleYunyi} />
            </label>
          </div>
        </header>

        <div className="oqd-main">
          <VideoMonitor channel={channel} latest={latest} led={led} live />
          <div className="oqd-side">
            <DevicePanel devices={devices} />
            <RecognizeLogList logs={channelLogs} />
          </div>
        </div>

        <QueueTable
          channel={channel}
          rows={channelQueue}
          onAdd={handleAdd}
          onFreeze={handleFreeze}
          onUnfreeze={handleUnfreeze}
          onPriority={handlePriority}
          onCutIn={handleCutIn}
          onRemove={handleRemove}
        />
      </div>
    </ConfigProvider>
  );
};

export default OutdoorQueueDispatch;
