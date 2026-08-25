/**
 * 单个发卡点对照列：标题/启停、大视频、LED、运行日志
 */
import React, { useMemo, useState } from 'react';
import { Segmented, Switch, Tag } from 'antd';
import VideoMonitor from './VideoMonitor';
import {
  LOG_KIND_LABEL,
  gateDeviceStatus,
  type DeviceStatus,
  type GatePoint,
  type LogLevel,
  type RunLog,
} from '../data';

function StatusTag({ status }: { status: DeviceStatus }) {
  return status === 'online' ? (
    <Tag color="success">在线</Tag>
  ) : (
    <Tag>离线</Tag>
  );
}

export default function GatePointCard({
  gate,
  logs,
  clock,
  onToggleService,
}: {
  gate: GatePoint;
  logs: RunLog[];
  clock: string;
  onToggleService: (next: boolean) => void;
}) {
  const [logFilter, setLogFilter] = useState<'all' | LogLevel>('all');
  const pointStatus = gateDeviceStatus(gate);

  const filteredLogs = useMemo(
    () => (logFilter === 'all' ? logs : logs.filter((item) => item.level === logFilter)),
    [logs, logFilter],
  );

  return (
    <section className="aem-gate">
      <div className="aem-gate-hd">
        <div className="aem-gate-meta">
          <h2>{gate.name}</h2>
          <StatusTag status={pointStatus} />
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
            识别器{gate.recognizer === 'online' ? '在线' : '离线'}
            {' · '}
            LED{gate.led === 'online' ? '在线' : '离线'}
          </span>
        </div>
        <div className="aem-gate-meta">
          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>自动入厂登记</span>
          <Switch
            checked={gate.serviceEnabled}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={onToggleService}
          />
        </div>
      </div>

      <VideoMonitor
        cameraName={gate.cameraName}
        clock={clock}
        plate={gate.currentPlate}
        deviceStatus={pointStatus}
        serviceEnabled={gate.serviceEnabled}
      />

      <div className={`aem-led ${gate.led === 'offline' ? 'off' : ''}`} title={gate.ledText}>
        LED {gate.ledText}
      </div>

      <div className="aem-log-tools">
        <h3>运行日志</h3>
        <Segmented
          size="small"
          value={logFilter}
          onChange={(value) => setLogFilter(value as 'all' | LogLevel)}
          options={[
            { label: '全部', value: 'all' },
            { label: '正常', value: 'normal' },
            { label: '异常', value: 'exception' },
          ]}
        />
      </div>
      <div className="aem-logs">
        {filteredLogs.length === 0 ? (
          <div className="aem-log" style={{ color: 'rgba(0,0,0,0.45)' }}>
            暂无符合条件的运行日志
          </div>
        ) : (
          filteredLogs.map((item) => (
            <div key={item.id} className={`aem-log ${item.level}`}>
              <span className="time">{item.time.slice(11)}</span>
              <Tag
                color={item.level === 'exception' ? 'error' : item.kind === 'inspect' ? 'warning' : 'default'}
                style={{ marginInlineEnd: 0, flex: '0 0 auto' }}
              >
                {LOG_KIND_LABEL[item.kind]}
              </Tag>
              <span className="msg">{item.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
