/**
 * 车号识别器 / LED：绿点在线、灰点离线
 */
import React from 'react';
import type { ChannelDevice } from '../data';

interface Props {
  devices: ChannelDevice[];
}

const DevicePanel: React.FC<Props> = ({ devices }) => (
  <section className="oqd-card oqd-device-card">
    <div className="oqd-card-hd">
      <h2>设备状态监测</h2>
    </div>
    <ul className="oqd-device-dots">
      {devices.map((d) => (
        <li key={d.id}>
          <i
            className={d.health === 'online' ? 'oqd-dot oqd-dot-on' : 'oqd-dot oqd-dot-off'}
            aria-label={d.health === 'online' ? '在线' : '离线'}
            title={d.health === 'online' ? '在线' : '离线'}
          />
          <span>{d.name}</span>
        </li>
      ))}
    </ul>
  </section>
);

export default DevicePanel;
