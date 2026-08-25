/**
 * 当前通道车号识别监控窗（窄栏 4:3，避免又宽又矮）
 */
import React from 'react';
import type { QueueChannel } from '../data';

interface Props {
  channel: QueueChannel;
  plate?: string;
  recognizedAt?: string;
  led: string;
  live: boolean;
}

const VideoMonitor: React.FC<Props> = ({ channel, plate, recognizedAt, led, live }) => (
  <section className="oqd-card oqd-video-card">
    <div className="oqd-card-hd">
      <h2>车号识别监控</h2>
      <span className={live ? 'oqd-live' : 'oqd-live oqd-live-off'}>{live ? 'LIVE' : '停采'}</span>
    </div>
    <div className="oqd-video-well">
      <div className="oqd-video-scene" aria-hidden>
        <div className="oqd-road" />
        <div className="oqd-lane" />
        {plate ? (
          <div className="oqd-plate-hit">
            <span>{plate}</span>
            <em>识别成功</em>
          </div>
        ) : (
          <div className="oqd-plate-wait">等待车辆进入识别区</div>
        )}
      </div>
      <div className="oqd-video-hud">
        <span>{channel.name}</span>
        <span>{recognizedAt ?? '—'}</span>
      </div>
      <p className="oqd-led-line">{led}</p>
    </div>
  </section>
);

export default VideoMonitor;
