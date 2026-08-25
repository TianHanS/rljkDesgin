/**
 * 通道设备状态
 */
import React from 'react';
import { Tag } from 'antd';
import {
  HEALTH_LABEL,
  KIND_LABEL,
  type ChannelDevice,
  type DeviceHealth,
} from '../data';

interface Props {
  devices: ChannelDevice[];
}

const colorOf = (h: DeviceHealth) => {
  if (h === 'online') return 'success';
  if (h === 'alarm') return 'warning';
  return 'default';
};

const DevicePanel: React.FC<Props> = ({ devices }) => (
  <section className="oqd-card oqd-device-card">
    <div className="oqd-card-hd">
      <h2>设备状态监测</h2>
    </div>
    <ul className="oqd-device-list">
      {devices.map((d) => (
        <li key={d.id}>
          <div>
            <strong>{d.name}</strong>
            <span>{KIND_LABEL[d.kind]} · {d.remark}</span>
          </div>
          <Tag color={colorOf(d.health)}>{HEALTH_LABEL[d.health]}</Tag>
        </li>
      ))}
    </ul>
  </section>
);

export default DevicePanel;
