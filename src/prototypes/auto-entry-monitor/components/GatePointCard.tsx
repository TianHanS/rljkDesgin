/**
 * 单个入厂点监测卡：纵向信息流（监控 → LED → 日志/记录 Tab）
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
  const [dataTab, setDataTab] = useState<'logs' | 'records'>('logs');
  const pointStatus = gateDeviceStatus(gate);

  const filteredLogs = useMemo(
    () => (logFilter === 'all' ? logs : logs.filter((item) => item.level === logFilter)),
    [logs, logFilter],
  );

  const recordColumns: ColumnsType<EntryRecord> = [
    { title: '车牌号', dataIndex: 'plate', width: 100 },
    { title: '入厂时间', dataIndex: 'enterAt', width: 152 },
    { title: '采样位', dataIndex: 'samplePos', ellipsis: true },
    { title: '过衡位', dataIndex: 'weighPos', ellipsis: true },
  ];

  return (
    <section className="aem-gate">
      <div className="aem-gate-hd">
        <div className="aem-gate-hd-main">
          <h2>{gate.name}</h2>
          <div className="aem-gate-tags">
            <StatusTag status={pointStatus} />
            <Tag color={gate.recognizer === 'online' ? 'success' : 'default'} bordered={false}>
              识别器 {gate.recognizer === 'online' ? '在线' : '离线'}
            </Tag>
            <Tag color={gate.led === 'online' ? 'success' : 'default'} bordered={false}>
              LED {gate.led === 'online' ? '在线' : '离线'}
            </Tag>
          </div>
        </div>
        <div className="aem-gate-hd-action">
          <span className="aem-gate-switch-label">自动入厂登记</span>
          <Switch
            checked={gate.serviceEnabled}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={onToggleService}
          />
        </div>
      </div>

      <div className="aem-gate-bd">
        <div className="aem-monitor-band">
          <VideoMonitor
            cameraName={gate.cameraName}
            clock={clock}
            plate={gate.currentPlate}
            deviceStatus={pointStatus}
            serviceEnabled={gate.serviceEnabled}
          />
          <div className={`aem-led ${gate.led === 'offline' ? 'off' : ''}`} title={gate.ledText}>
            <span className="aem-led-label">LED</span>
            <span className="aem-led-text">{gate.ledText}</span>
          </div>
        </div>

        <div className="aem-data-band">
          <div className="aem-data-toolbar">
            <Segmented
              size="small"
              value={dataTab}
              onChange={(value) => setDataTab(value as 'logs' | 'records')}
              options={[
                { label: '运行日志', value: 'logs' },
                { label: '入厂记录', value: 'records' },
              ]}
            />
            {dataTab === 'logs' ? (
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
            ) : null}
          </div>

          {dataTab === 'logs' ? (
            <div className="aem-logs">
              {filteredLogs.length === 0 ? (
                <div className="aem-log aem-log-empty">暂无符合条件的运行日志</div>
              ) : (
                filteredLogs.map((item) => (
                  <div key={item.id} className={`aem-log ${item.level}`}>
                    <span className="time">{item.time.slice(11)}</span>
                    <Tag
                      color={item.level === 'exception' ? 'error' : item.kind === 'inspect' ? 'warning' : 'default'}
                      style={{ marginInlineEnd: 0 }}
                    >
                      {LOG_KIND_LABEL[item.kind]}
                    </Tag>
                    <span className="msg">{item.message}</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="aem-records-wrap">
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                columns={recordColumns}
                dataSource={records}
                scroll={{ y: 280 }}
                locale={{ emptyText: '暂无入厂登记车辆' }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
