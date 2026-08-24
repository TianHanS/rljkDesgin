/**
 * @name 无人化验监测
 *
 * 参考资料：
 * - 燃料质检集控中心 SCADA 大屏参考图
 * - /rules/development-standards.md
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './style.css';

/* ────────── 字典映射 ────────── */
const BALANCE_STATE: Record<number, string> = {
  0: '空闲', 1: '称量中', 2: '校准中', 3: '故障', 4: '离线',
};
const WEIGH_TYPE: Record<number, string> = {
  0: '—', 1: '原煤', 2: '精煤', 3: '焦炭', 4: '标样', 5: '废样',
};
const OPEN_INST_STATE: Record<number, string> = {
  0: '空闲', 1: '运行中', 2: '故障', 3: '维护',
};
const BOTTLE_POS: Record<number, string> = { 1: '煤瓶转盘', 2: '煤瓶阵列' };
const BOTTLE_TYPE: Record<number, string> = {
  0: '未知', 1: '手动放样', 3: '气送来样', 4: '自动称量调试',
};
const BOTTLE_STATUS: Record<number, string> = {
  0: '未知', 1: '空孔位', 2: '初始状态的样瓶', 3: '等待称量',
  4: '称量完成', 5: '等待回传', 6: '读卡失败的样瓶',
};
const CRUCIBLE_RACK: Record<string, string> = {
  '0': '没有坩埚架', '1.1': '挥发分坩埚架1', '2': '挥发分坩埚架2', '3': '灼烧坩埚架3',
};

const FAULT_RESET = 0;
const fmtFault = (code: number, msg: string) => (code === FAULT_RESET ? null : msg);
const fmtOnline = (v: 0 | 1) => (v === 1 ? '在线' : '离线');
const fmtComm = (v: 0 | 1) => (v === 1 ? '已连接' : '未连接');
const fmtCrucible = (v: 0 | 1) => (v === 1 ? '已检测到坩埚' : '未检测到坩埚');
const fmtPack = (v: 0 | 1) => (v === 1 ? '正在包样' : '空闲');
const fmtTin = (v: 0 | 1) => (v === 1 ? '已满' : '未满');
const fmtParallel = (v: 0 | 1) => (v === 1 ? '称平行样' : '称单样');

const TABS = ['主界面', '采样机', '汽车衡', '气动传输', '自动制样', '自动化验', '存查样柜', '煤场温度', '视频', '数据分析', '门禁', '告警'];

const LAB_ITEMS = ['发热量', '水分', '灰分', '挥发分', '碳氢氮', '全硫', '灰熔点', '可磨指数'];

interface LabRecord {
  id: number;
  code: string;
  item: string;
  value: string;
  start: string;
  end: string;
}

function genLabRecords(count: number): LabRecord[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(now - (i + 1) * 3600000);
    const end = new Date(start.getTime() + 25 * 60000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return {
      id: i + 1,
      code: `HY${String(260701 - i).padStart(6, '0')}`,
      item: LAB_ITEMS[i % LAB_ITEMS.length],
      value: (10 + Math.random() * 20).toFixed(2),
      start: fmt(start),
      end: fmt(end),
    };
  });
}

/* ────────── 通用组件 ────────── */
type DotKind = 'ok' | 'off' | 'alarm';

const Dot = ({ kind }: { kind: DotKind }) => <span className={`dot dot-${kind}`} />;

const Panel = ({
  title,
  badge,
  badgeKind = 'idle',
  className = '',
  children,
  watermark,
}: {
  title: string;
  badge?: string;
  badgeKind?: 'ok' | 'alarm' | 'idle';
  className?: string;
  children: React.ReactNode;
  watermark?: React.ReactNode;
}) => (
  <div className={`cc-panel ${className}`}>
    <div className="cc-ph">
      <div className="cc-ph-left">
        <span className="diamond" />
        <span className="title">{title}</span>
      </div>
      {badge && <span className={`cc-badge ${badgeKind}`}>{badge}</span>}
    </div>
    <div className="cc-pb relative">
      {watermark}
      {children}
    </div>
  </div>
);

const BucketCell = ({ state, faultCode, faultMsg }: { state: string; faultCode: number; faultMsg: string }) => {
  const fault = fmtFault(faultCode, faultMsg);
  return (
    <td>
      <span>{state}</span>
      {fault && <span className="fault-sub">{fault}</span>}
    </td>
  );
};

const OnlineCell = ({ online }: { online: 0 | 1 }) => (
  <td>
    <Dot kind={online === 1 ? 'ok' : 'off'} />
    <span className={online === 1 ? 'txt-ok' : 'txt-off'}>{fmtOnline(online)}</span>
  </td>
);

const FaultTd = ({ code, msg }: { code: number; msg: string }) => {
  const f = fmtFault(code, msg);
  if (!f) return <td className="txt-off">—</td>;
  return <td className="txt-alarm">{f}</td>;
};

/* ────────── Mock 信号数据 ────────── */
const SIGNALS = {
  robots: [
    { name: '常温室机器人', status: '运行中', faultCode: 0, faultMsg: '' },
    { name: '高温室机器人', status: '待机', faultCode: 2, faultMsg: '故障代码2：机器人没有使能' },
  ],
  calorimeters: [
    { name: '量热仪1#', aState: '加热中', bState: '空闲', aFaultCode: 0, aFaultMsg: '', bFaultCode: 0, bFaultMsg: '' },
    { name: '量热仪2#', aState: '运行中', bState: '运行中', aFaultCode: 0, aFaultMsg: '', bFaultCode: 101, bFaultMsg: 'B桶氧弹密封异常' },
  ],
  chn: {
    pack: 1 as 0 | 1,
    instStatus: '分析中',
    mainT: 950.5, subT: 850.2, redT: 500.0,
    p1: 0.15, p2: 0.12, vc: 2.5, vh: 1.8, vt: 3.2,
    tinFull: 0 as 0 | 1,
    faultCode: 0, faultMsg: '',
  },
  sulfur: [
    { name: '测硫仪1#', comm: 1 as 0 | 1, inst: '试验中', temp: 1150, charge: 120.5, ph: 1.2, crucible: 1 as 0 | 1, faultCode: 0, faultMsg: '' },
    { name: '测硫仪2#', comm: 0 as 0 | 1, inst: '离线', temp: 25, charge: 0, ph: 0, crucible: 0 as 0 | 1, faultCode: 205, faultMsg: '通信中断' },
  ],
  moisture: { online: 1 as 0 | 1, inst: '恒温', temp: 105, count: 5, balance: '12.3452', faultCode: 0, faultMsg: '' },
  thermostat: { online: 1 as 0 | 1, inst: '待机', temp: 25, count: 0, balance: '0.0000', faultCode: 0, faultMsg: '' },
  muffle: [
    { name: '马弗炉1#', online: 1 as 0 | 1, inst: '试验中', temp: 815, rack: '1.1', countdown: 1200, faultCode: 0, faultMsg: '' },
    { name: '马弗炉2#', online: 1 as 0 | 1, inst: '加热中', temp: 500, rack: '3', countdown: 0, faultCode: 0, faultMsg: '' },
  ],
  ash: [
    { name: '水灰炉1#', online: 1 as 0 | 1, inst: '试验中', temp: 815, count: 10, balance: '10.1234', countdown: 600, faultCode: 0, faultMsg: '' },
    { name: '水灰炉2#', online: 1 as 0 | 1, inst: '待机', temp: 25, count: 0, balance: '0.0000', countdown: 0, faultCode: 0, faultMsg: '' },
    { name: '水灰炉3#', online: 0 as 0 | 1, inst: '故障', temp: 25, count: 0, balance: '0.0000', countdown: 0, faultCode: 308, faultMsg: '加热棒断线' },
  ],
  balances: [
    { name: '天平1#', state: 1, reading: '1.0002', task: '2/8', type: 1, code: 'S260701-01', sample: '神东混煤' },
    { name: '天平2#', state: 1, reading: '0.9998', task: '5/12', type: 2, code: 'S260701-02', sample: '洗精煤' },
    { name: '天平3#', state: 0, reading: '0.0000', task: '—', type: 0, code: '—', sample: '—' },
    { name: '天平4#', state: 4, reading: '—', task: '—', type: 0, code: '—', sample: '—' },
  ],
  opener: {
    state: 1, pos: 2 as 1 | 2, hole: 'A-05', type: 3 as 0 | 1 | 3 | 4,
    bottle: 3 as 0 | 1 | 2 | 3 | 4 | 5 | 6, parallel: 1 as 0 | 1,
    task: '执行中 2/10', code: 'S260701-03', sample: '气送样03',
  },
};

const RobotWatermark = () => (
  <svg className="robot-watermark" width="80" height="80" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="50" cy="20" r="12" />
    <path d="M50 32v20M30 52h40M30 52l-15 25M70 52l15 25M40 77h20" />
    <circle cx="30" cy="52" r="6" /><circle cx="70" cy="52" r="6" />
  </svg>
);

export default function UnmannedLabMonitor() {
  const [time, setTime] = useState('');
  const [labRecords, setLabRecords] = useState<LabRecord[]>(() => genLabRecords(100));
  const [lastRefresh, setLastRefresh] = useState('');

  const refreshLabRecords = useCallback(() => {
    setLabRecords(genLabRecords(100));
    const d = new Date();
    setLastRefresh(d.toLocaleTimeString('zh-CN', { hour12: false }));
  }, []);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleString('zh-CN', { hour12: false }));
    tick();
    const t1 = setInterval(tick, 1000);
    return () => clearInterval(t1);
  }, []);

  useEffect(() => {
    refreshLabRecords();
    const t2 = setInterval(refreshLabRecords, 60_000);
    return () => clearInterval(t2);
  }, [refreshLabRecords]);

  const displayRecords = useMemo(() => labRecords.slice(0, 8), [labRecords]);

  const sysBadge = SIGNALS.robots.some((r) => r.faultCode !== FAULT_RESET) ? '异常' : '空闲';
  const sysBadgeKind = sysBadge === '异常' ? 'alarm' : 'ok';

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* 顶栏 */}
      <header className="cc-header">
        <div className="cc-brand">
          <div className="cc-logo"><div className="cc-logo-inner" /></div>
          <span className="cc-title">燃料质检集控中心</span>
        </div>
        <nav className="cc-nav">
          {TABS.map((t) => (
            <div key={t} className={`cc-tab ${t === '自动化验' ? 'active' : ''}`}>{t}</div>
          ))}
        </nav>
        <div className="cc-clock">
          <Dot kind="ok" />
          <span className="mono">{time}</span>
        </div>
      </header>

      {/* 子工具栏 */}
      <div className="cc-subbar">
        <div className="cc-select">
          <span>自动化验系统</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 4l3 3 3-3" /></svg>
        </div>
        <div className="cc-toggle-group">
          <div className="cc-toggle active">运行参数</div>
          <div className="cc-toggle">2D视图</div>
        </div>
        <div className="cc-terminal">
          <span>化验接收终端</span>
          <Dot kind="ok" />
          <span className="txt-ok">已连接</span>
        </div>
      </div>

      {/* 主体 */}
      <div className="flex-1 min-h-0 p-2">
        <div className="flex flex-col gap-2 min-h-0">

          {/* 第一行：机械手 + 量热 + 测硫 + 碳氢氦 */}
          <div className="grid grid-cols-12 gap-2 shrink-0" style={{ height: '28%' }}>
            <div className="col-span-2">
              <Panel title="系统状态" badge={sysBadge} badgeKind={sysBadgeKind as 'ok' | 'alarm'} className="h-full" watermark={<RobotWatermark />}>
                <table className="cc-table">
                  <thead><tr><th>设备</th><th>状态</th></tr></thead>
                  <tbody>
                    {SIGNALS.robots.map((r) => (
                      <tr key={r.name}>
                        <td className="name">{r.name.replace('机器人', '')}</td>
                        <td>
                          <Dot kind={r.faultCode === FAULT_RESET ? 'ok' : 'alarm'} />
                          <span className={r.faultCode === FAULT_RESET ? 'txt-ok' : 'txt-alarm'}>{r.status}</span>
                          {fmtFault(r.faultCode, r.faultMsg) && (
                            <span className="fault-sub">{fmtFault(r.faultCode, r.faultMsg)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </div>

            <div className="col-span-3">
              <Panel title="量热区" badge="运行中" badgeKind="ok" className="h-full">
                <table className="cc-table">
                  <thead>
                    <tr><th>仪器</th><th>A桶状态</th><th>B桶状态</th></tr>
                  </thead>
                  <tbody>
                    {SIGNALS.calorimeters.map((c) => (
                      <tr key={c.name}>
                        <td className="name">{c.name}</td>
                        <BucketCell state={c.aState} faultCode={c.aFaultCode} faultMsg={c.aFaultMsg} />
                        <BucketCell state={c.bState} faultCode={c.bFaultCode} faultMsg={c.bFaultMsg} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </div>

            <div className="col-span-3">
              <Panel title="测硫区" badge="监测中" badgeKind="ok" className="h-full">
                <table className="cc-table">
                  <thead>
                    <tr><th>仪器</th><th>通信</th><th>炉温</th><th>电量</th><th>pH</th><th>坩埚</th><th>故障</th></tr>
                  </thead>
                  <tbody>
                    {SIGNALS.sulfur.map((s) => (
                      <tr key={s.name}>
                        <td className="name">{s.name}</td>
                        <td>
                          <Dot kind={s.comm === 1 ? 'ok' : 'off'} />
                          <span className={s.comm === 1 ? 'txt-ok' : 'txt-off'}>{fmtComm(s.comm)}</span>
                        </td>
                        <td className="num">{s.temp}</td>
                        <td className="num">{s.charge}</td>
                        <td className="num">{s.ph}</td>
                        <td>{fmtCrucible(s.crucible)}</td>
                        <FaultTd code={s.faultCode} msg={s.faultMsg} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </div>

            <div className="col-span-4">
              <Panel title="元素区 · 碳氢氦" badge={SIGNALS.chn.instStatus} badgeKind="ok" className="h-full">
                <div className="cc-kv">
                  {[
                    { k: '包样机状态', v: fmtPack(SIGNALS.chn.pack) },
                    { k: '仪器状态', v: SIGNALS.chn.instStatus },
                    { k: '主炉温(℃)', v: SIGNALS.chn.mainT.toFixed(1), num: true },
                    { k: '次炉温(℃)', v: SIGNALS.chn.subT.toFixed(1), num: true },
                    { k: '还原炉温(℃)', v: SIGNALS.chn.redT.toFixed(1), num: true },
                    { k: '压力1(MPa)', v: SIGNALS.chn.p1.toFixed(2), num: true },
                    { k: '压力2(MPa)', v: SIGNALS.chn.p2.toFixed(2), num: true },
                    { k: '碳池电压(V)', v: SIGNALS.chn.vc.toFixed(2), num: true },
                    { k: '氢池电压(V)', v: SIGNALS.chn.vh.toFixed(2), num: true },
                    { k: '热导电压(V)', v: SIGNALS.chn.vt.toFixed(2), num: true },
                    { k: '锡囊存盘', v: fmtTin(SIGNALS.chn.tinFull) },
                    { k: '故障信息', v: fmtFault(SIGNALS.chn.faultCode, SIGNALS.chn.faultMsg) ?? '—', alarm: SIGNALS.chn.faultCode !== FAULT_RESET },
                  ].map((item) => (
                    <div key={item.k} className="cc-kv-item">
                      <div className="k">{item.k}</div>
                      <div className={`v ${item.num ? 'num mono' : ''} ${item.alarm ? 'txt-alarm' : ''}`}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          {/* 第二行：工分区 */}
          <div className="shrink-0" style={{ height: '32%' }}>
            <Panel title="工分区" badge="综合监测" badgeKind="idle" className="h-full">
              <div className="grid grid-cols-2 gap-2 h-full">
                <div>
                  <div className="text-[11px] text-[var(--color-cyan)] mb-1 tracking-wide">马弗炉 ×2</div>
                  <table className="cc-table">
                    <thead>
                      <tr><th>设备</th><th>连接</th><th>状态</th><th>炉温</th><th>坩埚架</th><th>倒计时(s)</th><th>异常</th></tr>
                    </thead>
                    <tbody>
                      {SIGNALS.muffle.map((m) => (
                        <tr key={m.name}>
                          <td className="name">{m.name}</td>
                          <OnlineCell online={m.online} />
                          <td>{m.inst}</td>
                          <td className="num">{m.temp}</td>
                          <td>{CRUCIBLE_RACK[m.rack] ?? m.rack}</td>
                          <td className="num">{m.countdown || '—'}</td>
                          <FaultTd code={m.faultCode} msg={m.faultMsg} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--color-cyan)] mb-1 tracking-wide">水灰炉 ×3</div>
                  <table className="cc-table">
                    <thead>
                      <tr><th>设备</th><th>连接</th><th>状态</th><th>炉温</th><th>样品数</th><th>天平读数</th><th>倒计时</th><th>异常</th></tr>
                    </thead>
                    <tbody>
                      {SIGNALS.ash.map((a) => (
                        <tr key={a.name}>
                          <td className="name">{a.name}</td>
                          <OnlineCell online={a.online} />
                          <td className={a.inst === '故障' ? 'txt-alarm' : ''}>{a.inst}</td>
                          <td className="num">{a.temp}</td>
                          <td className="num">{a.count}</td>
                          <td className="num">{a.balance}</td>
                          <td className="num">{a.countdown || '—'}</td>
                          <FaultTd code={a.faultCode} msg={a.faultMsg} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  {[
                    { label: '水分炉', data: SIGNALS.moisture },
                    { label: '恒温炉', data: SIGNALS.thermostat },
                  ].map(({ label, data: d }) => (
                    <div key={label}>
                      <div className="text-[11px] text-[var(--color-cyan)] mb-1 tracking-wide">{label}</div>
                      <table className="cc-table">
                        <thead>
                          <tr><th>连接</th><th>状态</th><th>炉温</th><th>样品数</th><th>天平读数</th><th>异常</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <OnlineCell online={d.online} />
                            <td>{d.inst}</td>
                            <td className="num">{d.temp}</td>
                            <td className="num">{d.count}</td>
                            <td className="num">{d.balance}</td>
                            <FaultTd code={d.faultCode} msg={d.faultMsg} />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          {/* 第三行：自动称重 */}
          <div className="shrink-0" style={{ height: '22%' }}>
            <Panel title="称量区" badge="运行中" badgeKind="ok" className="h-full">
              <div className="grid grid-cols-12 gap-2 h-full">
                <div className="col-span-8">
                  <div className="text-[11px] text-[var(--color-cyan)] mb-1 tracking-wide">天平设备 ×4</div>
                  <table className="cc-table">
                    <thead>
                      <tr><th>天平</th><th>状态</th><th>实时读数(g)</th><th>剩余任务</th><th>样品类型</th><th>样品编码</th><th>样品名称</th></tr>
                    </thead>
                    <tbody>
                      {SIGNALS.balances.map((b) => (
                        <tr key={b.name}>
                          <td className="name">{b.name}</td>
                          <td>
                            <Dot kind={b.state === 4 ? 'off' : b.state === 3 ? 'alarm' : b.state === 0 ? 'off' : 'ok'} />
                            {BALANCE_STATE[b.state] ?? '—'}
                          </td>
                          <td className="num">{b.reading}</td>
                          <td className="num">{b.task}</td>
                          <td>{WEIGH_TYPE[b.type] ?? '—'}</td>
                          <td className="num">{b.code}</td>
                          <td>{b.sample}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="col-span-4">
                  <div className="text-[11px] text-[var(--color-cyan)] mb-1 tracking-wide">煤瓶开盖机</div>
                  <div className="cc-kv" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    {[
                      { k: '开盖机状态', v: OPEN_INST_STATE[SIGNALS.opener.state] },
                      { k: '暂存位置', v: BOTTLE_POS[SIGNALS.opener.pos] },
                      { k: '暂存孔位', v: SIGNALS.opener.hole, num: true },
                      { k: '煤瓶类型', v: BOTTLE_TYPE[SIGNALS.opener.type] },
                      { k: '煤瓶状态', v: BOTTLE_STATUS[SIGNALS.opener.bottle] },
                      { k: '平行样', v: fmtParallel(SIGNALS.opener.parallel) },
                      { k: '称量任务', v: SIGNALS.opener.task },
                      { k: '样品编码', v: SIGNALS.opener.code, num: true },
                      { k: '样品名称', v: SIGNALS.opener.sample },
                    ].map((item) => (
                      <div key={item.k} className="cc-kv-item">
                        <div className="k">{item.k}</div>
                        <div className={`v ${item.num ? 'num mono' : ''}`}>{item.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* 第四行：化验记录 */}
          <div className="flex-1 min-h-0">
            <Panel title="化验记录" className="h-full">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[var(--color-ink-3)]">
                  共 {labRecords.length} 条 · 每1分钟刷新 · 最近更新 {lastRefresh || '—'}
                </span>
                <a className="cc-link" href="#/lab-records" onClick={(e) => e.preventDefault()}>
                  查看更多 → 化验记录查询
                </a>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 20px)' }}>
                <table className="cc-table">
                  <thead>
                    <tr><th>序号</th><th>化验简码</th><th>化验项</th><th>化验值</th><th>化验开始时间</th><th>结束时间</th></tr>
                  </thead>
                  <tbody>
                    {displayRecords.map((r) => (
                      <tr key={r.id}>
                        <td className="num">{r.id}</td>
                        <td className="num">{r.code}</td>
                        <td>{r.item}</td>
                        <td className="num">{r.value}</td>
                        <td className="mono">{r.start}</td>
                        <td className="mono">{r.end}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
