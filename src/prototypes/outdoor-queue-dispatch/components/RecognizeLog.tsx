/**
 * 车号识别排队登记日志（时间逆序）
 */
import React from 'react';
import { Image } from 'antd';
import { plateSvgDataUri, type RecognizeLog } from '../data';

interface Props {
  logs: RecognizeLog[];
}

const RecognizeLog: React.FC<Props> = ({ logs }) => (
  <section className="oqd-card oqd-log-card">
    <div className="oqd-card-hd">
      <h2>车号识别登记日志</h2>
      <span className="oqd-muted">{logs.length} 条</span>
    </div>
    <ul className="oqd-log-list">
      {logs.length === 0 ? <li className="oqd-muted">暂无识别记录</li> : null}
      {logs.map((row) => (
        <li key={row.id}>
          <Image
            width={72}
            height={24}
            src={plateSvgDataUri(row.plate)}
            alt={row.plate}
            preview={{ mask: '查看' }}
          />
          <strong>{row.plate}</strong>
          <time>{row.recognizedAt}</time>
        </li>
      ))}
    </ul>
  </section>
);

export default RecognizeLog;
