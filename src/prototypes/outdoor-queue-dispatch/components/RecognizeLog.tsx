/**
 * 车号识别登记日志：控制台风格（时间 + 内容）
 */
import React from 'react';
import type { ConsoleLog } from '../data';

interface Props {
  logs: ConsoleLog[];
}

const RecognizeLog: React.FC<Props> = ({ logs }) => (
  <section className="oqd-card oqd-log-card">
    <div className="oqd-card-hd">
      <h2>车号识别登记日志</h2>
    </div>
    <ul className="oqd-console">
      {logs.length === 0 ? <li className="oqd-muted">暂无日志</li> : null}
      {logs.map((row) => (
        <li key={row.id} className={row.level === 'error' ? 'oqd-console-err' : undefined}>
          <time>{row.time}</time>
          <span>{row.message}</span>
        </li>
      ))}
    </ul>
  </section>
);

export default RecognizeLog;
