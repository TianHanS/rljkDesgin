/**
 * 单个发卡点对照列：视频、启停、设备状态、日志、入厂记录
 */
import React, { useMemo, useState } from 'react';
import { Segmented, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import VideoMonitor from './VideoMonitor';
import {
  LOG_KIND_LABEL,
  gateDeviceStatus,
  type DeviceStatus,
  type EntryRecord,
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
  records,
  clock,
  onToggleService,
}: {
  gate: GatePoint;
  logs: RunLog[];
  records: EntryRecord[];
  clock: string;
  onToggleService: (next: boolean) => void;
}) {
  const [logFilter, setLogFilter] = useState<'all' | LogLevel>('all');
  const pointStatus = gateDeviceStatus(gate);

  const filteredLogs = useMemo(
    () => (logFilter === 'all' ? logs : logs.filter((item) => item.level === logFilter)),
    [logs, logFilter],
  );

  const recordColumns: ColumnsType<EntryRecord> = [
    { title: '车牌号', dataIndex: 'plate', width: 110 },
    { title: '入厂时间', dataIndex: 'enterAt', width: 170 },
    { title: '采样位', dataIndex: 'samplePos', ellipsis: true },
    { title: '过衡位', dataIndex: 'weighPos', ellipsis: true },
  ];

  return (
    <section className="aem-gate">
      <div className="aem-gate-hd">
        <div>
          <h2>{gate.name}</h2>
          <div className="aem-gate-meta" style={{ marginTop: 6 }}>
            <StatusTag status={pointStatus} />
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              识别器 {gate.recognizer === 'online' ? '在线' : '离线'}
              <span style={{ margin: '0 6px', color: '#f0f0f0' }}>|</span>
              LED {gate.led === 'online' ? '在线' : '离线'}
            </span>
          </div>
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

      <div className="aem-gate-bd">
        <div className="aem-gate-left">
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
          <div className="aem-devrow">
            <Tag color={gate.recognizer === 'online' ? 'success' : 'default'}>
              车号识别器 {gate.recognizer === 'online' ? '在线' : '离线'}
            </Tag>
            <Tag color={gate.led === 'online' ? 'success' : 'default'}>
              LED 大屏 {gate.led === 'online' ? '在线' : '离线'}
            </Tag>
          </div>
        </div>

        <div className="aem-gate-right">
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
                    style={{ marginInlineEnd: 0, justifySelf: 'start' }}
                  >
                    {LOG_KIND_LABEL[item.kind]}
                  </Tag>
                  <span>{item.message}</span>
                </div>
              ))
            )}
          </div>

          <div className="aem-records">
            <h3 style={{ marginBottom: 8 }}>入厂车辆记录</h3>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              columns={recordColumns}
              dataSource={records}
              scroll={{ y: 168 }}
              locale={{ emptyText: '暂无入厂登记车辆' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
