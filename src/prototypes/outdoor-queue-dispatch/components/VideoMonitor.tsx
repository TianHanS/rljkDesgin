/**
 * 当前通道车号识别模拟监控窗
 */
import React from 'react';
import type { QueueChannel, RecognizeLog } from '../data';

interface Props {
  channel: QueueChannel;
  latest?: RecognizeLog;
  led: string;
  live: boolean;
}

const VideoMonitor: React.FC<Props> = ({ channel, latest, led, live }) => (
  <section className="oqd-card oqd-video-card">
    <div className="oqd-card-hd">
      <h2>车号识别监控</h2>
      <span className={live ? 'oqd-live' : 'oqd-live oqd-live-off'}>{live ? 'LIVE' : '停采'}</span>
    </div>
    <div className="oqd-video-well">
      <div className="oqd-video-scene" aria-hidden>
        <div className="oqd-road" />
        <div className="oqd-lane" />
        {latest ? (
          <div className="oqd-plate-hit">
            <span>{latest.plate}</span>
            <em>识别成功</em>
          </div>
        ) : (
          <div className="oqd-plate-wait">等待车辆进入识别区</div>
        )}
      </div>
      <div className="oqd-video-hud">
        <span>
          {channel.name} · {channel.entryPoints.map((p) => p.name).join(' / ')}
        </span>
        <span>{latest?.recognizedAt ?? '—'}</span>
      </div>
      <p className="oqd-led-line">LED {led}</p>
    </div>
  </section>
);

export default VideoMonitor;
