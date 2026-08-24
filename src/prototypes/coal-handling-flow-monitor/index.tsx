/**
 * @name 输煤全流程动态展示
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-standards.md
 * - /assets/templates/spec-template.md
 * - 用户提供输煤系统工艺参考图
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  ConfigProvider,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import CoalYard3D, { type HoverInfo } from './components/CoalYard3D';
import {
  BELTS,
  BUNKERS,
  BUNKER_HISTORY,
  CRUSHER_ALARMS,
  LOAD_PLAN,
  PILES,
  PILE_HISTORY,
  STACKERS,
  UNITS,
  type BeltInfo,
  type BunkerInfo,
  type CoalPile,
  type YardStacker,
} from './data';
import './style.css';

type MenuKey = 'overview' | 'yard3d' | 'belt' | 'bunker' | 'unit';

const MENU_ITEMS = [
  { key: 'overview' as const, label: '输煤总览' },
  { key: 'yard3d' as const, label: '煤场三维' },
  { key: 'belt' as const, label: '皮带监测' },
  { key: 'bunker' as const, label: '煤仓监测' },
  { key: 'unit' as const, label: '机组工况' },
];

function statusClass(s: string) {
  if (s === '运行' || s === '取料' || s === '堆料' || s === '并网运行' || s === '执行中') return 'chf-status-run';
  return 'chf-status-stop';
}

function Overview25D({
  belts,
  bunkers,
  stackers,
  onYard,
  onBelt,
  onBunker,
  onUnit,
  onPoint,
}: {
  belts: BeltInfo[];
  bunkers: BunkerInfo[];
  stackers: YardStacker[];
  onYard: () => void;
  onBelt: (id: string) => void;
  onBunker: (id: string) => void;
  onUnit: (id: 1 | 2) => void;
  onPoint: (title: string, desc: string) => void;
}) {
  const beltMap = useMemo(() => Object.fromEntries(belts.map((b) => [b.id, b])), [belts]);
  const run = (id: string) => beltMap[id]?.status === '运行';

  const bunkerByCode = useMemo(() => Object.fromEntries(bunkers.map((b) => [b.code, b])), [bunkers]);

  const renderBunker = (code: string, x: number) => {
    const b = bunkerByCode[code];
    const fillH = b ? (b.levelM / b.capacityM) * 70 : 30;
    return (
      <g
        key={code}
        className="chf-bunker chf-hot"
        transform={`translate(${x}, 520)`}
        onClick={() => onBunker(code)}
      >
        <path
          className="chf-bunker-shell"
          d="M8,0 L52,0 L58,18 L58,88 L2,88 L2,18 Z"
          fill="#f7f8fa"
          stroke="#8c8c8c"
          strokeWidth={1.5}
        />
        <rect x={4} y={88 - fillH} width={52} height={fillH} fill={b?.layers[0]?.color || '#5B8C3E'} opacity={0.9} />
        {b?.layers[1] && (
          <rect
            x={4}
            y={88 - fillH}
            width={52}
            height={fillH * b.layers[1].ratio}
            fill={b.layers[1].color}
            opacity={0.85}
          />
        )}
        <text x={30} y={104} textAnchor="middle" fontSize={11} fill="#1f1f1f" fontWeight={600}>
          {code}
        </text>
        <text x={30} y={118} textAnchor="middle" fontSize={10} fill="#52c41a">
          {b?.levelM.toFixed(1)}m
        </text>
      </g>
    );
  };

  const beltPath = (id: string, d: string) => (
    <path
      key={id}
      className={`chf-hot ${run(id) ? 'chf-flow-run chf-flow-anim' : 'chf-flow-stop'}`}
      d={d}
      onClick={() => onBelt(id)}
    />
  );

  return (
    <div className="chf-overview">
      <svg viewBox="0 0 1280 660" preserveAspectRatio="xMidYMid meet">
        {/* 电流表 */}
        <g transform="translate(16,16)">
          <rect width={220} height={150} rx={6} fill="#fff" stroke="rgba(0,0,0,0.08)" />
          <text x={12} y={22} fontSize={12} fontWeight={600} fill="#1f1f1f">
            皮带电流 (A)
          </text>
          {belts.slice(0, 8).map((b, i) => (
            <text key={b.id} x={12} y={44 + i * 14} fontSize={11} fill={b.status === '运行' ? '#52c41a' : '#8c8c8c'}>
              {b.id} 电流 {b.currentA.toFixed(1)}
            </text>
          ))}
        </g>

        {/* 煤场 #1 / #2：仅展示堆料机 / 取料机运行状态与角度 */}
        <foreignObject x="248" y="108" width="252" height="168">
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            className="chf-yard-panel chf-hot"
            onClick={onYard}
          >
            <div className="chf-yard-panel-hd">
              <span>一号煤场</span>
              <span className="chf-yard-panel-time">更新于 实时</span>
            </div>
            <div className="chf-yard-panel-bd chf-yard-panel-bd-data">
              <div className="chf-yard-stat-block">
                <div className="chf-yard-stat-title">堆料机</div>
                <div>运行状态：{stackers[0]?.mode === '堆料' ? '运行中' : stackers[0]?.mode || '—'}</div>
                <div>运行角度：{stackers[0]?.boomAngle?.toFixed(2) ?? '0.00'}°</div>
              </div>
              <div className="chf-yard-stat-block">
                <div className="chf-yard-stat-title">取料机</div>
                <div>
                  运行状态：
                  {stackers[0]?.mode === '取料' ? '运行中' : stackers[0]?.mode === '待机' ? '待机' : stackers[0]?.mode || '—'}
                </div>
                <div>运行角度：{((stackers[0]?.boomAngle ?? 0) * 0.6).toFixed(2)}°</div>
              </div>
            </div>
          </div>
        </foreignObject>

        <foreignObject x="248" y="288" width="252" height="168">
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            className="chf-yard-panel chf-hot"
            onClick={onYard}
          >
            <div className="chf-yard-panel-hd">
              <span>二号煤场</span>
              <span className="chf-yard-panel-time">更新于 实时</span>
            </div>
            <div className="chf-yard-panel-bd chf-yard-panel-bd-data">
              <div className="chf-yard-stat-block">
                <div className="chf-yard-stat-title">堆料机</div>
                <div>运行状态：{stackers[1]?.mode === '堆料' ? '运行中' : '待机'}</div>
                <div>运行角度：{stackers[1]?.boomAngle?.toFixed(2) ?? '0.00'}°</div>
              </div>
              <div className="chf-yard-stat-block">
                <div className="chf-yard-stat-title">取料机</div>
                <div>运行状态：{stackers[1]?.mode === '取料' ? '运行中' : stackers[1]?.mode || '待机'}</div>
                <div>运行角度：{((stackers[1]?.boomAngle ?? 0) * 0.4).toFixed(2)}°</div>
              </div>
            </div>
          </div>
        </foreignObject>

        {/* 转运站 */}
        {[
          { id: 'T31', x: 520, y: 200 },
          { id: 'T32', x: 700, y: 200 },
          { id: 'T33', x: 880, y: 260 },
        ].map((t) => (
          <g
            key={t.id}
            className="chf-hot"
            transform={`translate(${t.x},${t.y})`}
            onClick={() => onPoint(t.id, `${t.id} 转运站 · 落煤管/导料槽工况正常`)}
          >
            <rect width={88} height={64} rx={4} fill="#f0f2f5" stroke="#8c8c8c" strokeWidth={1.5} />
            <rect x={18} y={12} width={20} height={28} fill="#bfbfbf" />
            <circle cx={64} cy={28} r={12} fill="#faad14" stroke="#8c8c8c" />
            <text x={64} y={32} textAnchor="middle" fontSize={10} fontWeight={700}>
              M
            </text>
            <text x={44} y={56} textAnchor="middle" fontSize={12} fontWeight={600}>
              {t.id}
            </text>
          </g>
        ))}

        {/* 皮带网 */}
        {beltPath('C32A', 'M420,220 L520,220')}
        {beltPath('C32B', 'M420,400 L520,400 L520,270')}
        {beltPath('C31A', 'M608,220 L700,220')}
        {beltPath('C31B', 'M608,248 L700,248')}
        {beltPath('C33A', 'M788,230 L880,280')}
        {beltPath('C33B', 'M788,250 L880,300')}
        {beltPath('C36A', 'M968,290 L1040,290 L1040,480')}
        {beltPath('C36B', 'M968,310 L1060,310 L1060,480')}
        {beltPath('C37A', 'M200,500 L1040,500')}
        {beltPath('C38A', 'M200,540 L1060,540')}

        {/* 皮带标签 */}
        {[
          { id: 'C32A', x: 450, y: 210 },
          { id: 'C31A', x: 640, y: 210 },
          { id: 'C33A', x: 820, y: 240 },
          { id: 'C36A', x: 1010, y: 340 },
          { id: 'C37A', x: 600, y: 490 },
        ].map((l) => (
          <text
            key={l.id}
            x={l.x}
            y={l.y}
            fontSize={11}
            fontWeight={600}
            fill={run(l.id) ? '#237804' : '#a8071a'}
            className="chf-hot"
            onClick={() => onBelt(l.id)}
          >
            {l.id}
          </text>
        ))}

        {/* 碎煤机 */}
        <g transform="translate(1080,120)">
          <rect width={170} height={200} rx={6} fill="#fff" stroke="rgba(0,0,0,0.08)" />
          <text x={12} y={22} fontSize={12} fontWeight={600}>
            碎煤机报警
          </text>
          {CRUSHER_ALARMS.map((a, i) => (
            <g
              key={a.id}
              className="chf-hot"
              transform={`translate(12, ${40 + i * 24})`}
              onClick={() => onPoint(a.id, a.name)}
            >
              <circle cx={5} cy={0} r={4} fill={a.active ? '#ff4d4f' : '#d9d9d9'} />
              <text x={16} y={4} fontSize={11} fill={a.active ? '#cf1322' : '#595959'}>
                {a.name}
              </text>
            </g>
          ))}
        </g>

        {/* 实时煤量框 */}
        <g transform="translate(520,80)">
          <rect width={200} height={72} rx={4} fill="#fff" stroke="#52c41a" />
          <text x={10} y={20} fontSize={11} fill="#595959">
            C31A 瞬时/累计/带速
          </text>
          <text x={10} y={42} fontSize={13} fill="#52c41a" fontWeight={600}>
            {beltMap.C31A?.instantTh} t/h · {beltMap.C31A?.accumT} t
          </text>
          <text x={10} y={62} fontSize={12} fill="#1f1f1f">
            带速 {beltMap.C31A?.speedMs} m/s
          </text>
        </g>

        {/* 原煤仓 */}
        <text x={640} y={505} textAnchor="middle" fontSize={12} fontWeight={600} fill="#595959">
          原煤仓（点击查看分层）
        </text>
        {['1A', '1B', '1C', '1D', '1E', '1F'].map((c, i) => renderBunker(c, 160 + i * 70))}
        {['2A', '2B', '2C', '2D', '2E', '2F'].map((c, i) => renderBunker(c, 620 + i * 70))}

        {/* 机组日耗 */}
        <g
          className="chf-hot"
          transform="translate(980,560)"
          onClick={() => onUnit(1)}
        >
          <rect width={260} height={72} rx={4} fill="#fff" stroke="#ff4d4f" />
          <text x={12} y={22} fontSize={12} fontWeight={600} fill="#cf1322">
            机组今日耗煤（点击进入）
          </text>
          <text x={12} y={44} fontSize={12}>
            #1 机组 {UNITS[0].todayCoalT.toFixed(2)} t
          </text>
          <text x={12} y={62} fontSize={12}>
            #2 机组 {UNITS[1].todayCoalT.toFixed(2)} t
          </text>
        </g>
      </svg>
    </div>
  );
}

export default function CoalHandlingFlowMonitor() {
  const [menu, setMenu] = useState<MenuKey>('overview');
  const [belts, setBelts] = useState(BELTS);
  const [stackers] = useState(STACKERS);
  const [piles, setPiles] = useState(PILES);
  const [bunkers] = useState(BUNKERS);
  const [activeBeltId, setActiveBeltId] = useState<string>('C31A');
  const [activeBunkerId, setActiveBunkerId] = useState<string>('1A');
  const [activeUnitId, setActiveUnitId] = useState<1 | 2>(1);
  const [pointModal, setPointModal] = useState<{ title: string; desc: string } | null>(null);
  const [equipDrawer, setEquipDrawer] = useState<BeltInfo | YardStacker | null>(null);
  const [pileDrawer, setPileDrawer] = useState<CoalPile | null>(null);
  const [pileAction, setPileAction] = useState<'quality' | 'amount' | 'blend' | 'history' | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [now, setNow] = useState(() => new Date());

  // 模拟实时刷新
  useEffect(() => {
    const t = window.setInterval(() => {
      setNow(new Date());
      setBelts((prev) =>
        prev.map((b) =>
          b.status === '运行'
            ? {
                ...b,
                currentA: Number((b.currentA + (Math.random() - 0.5) * 2).toFixed(1)),
                instantTh: Math.max(0, Math.round(b.instantTh + (Math.random() - 0.5) * 20)),
                accumT: b.accumT + Math.round(Math.random() * 3),
              }
            : b,
        ),
      );
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const activeBelt = belts.find((b) => b.id === activeBeltId) || belts[0];
  const activeBunker = bunkers.find((b) => b.id === activeBunkerId || b.code === activeBunkerId) || bunkers[0];
  const activeUnit = UNITS.find((u) => u.id === activeUnitId) || UNITS[0];

  const goYard = () => {
    setMenu('yard3d');
    setHover(null);
  };

  const goBelt = (id: string) => {
    setActiveBeltId(id);
    setMenu('belt');
    const b = belts.find((x) => x.id === id);
    if (b) setEquipDrawer(b);
  };

  const goBunker = (id: string) => {
    setActiveBunkerId(id);
    setMenu('bunker');
  };

  const goUnit = (id: 1 | 2) => {
    setActiveUnitId(id);
    setMenu('unit');
  };

  const submitPileForm = () => {
    message.success('操作已提交（原型演示）');
    if (pileAction === 'amount' && pileDrawer) {
      // no-op visual; form handles via Form onFinish
    }
    setPileAction(null);
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontFamily: `"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`,
        },
      }}
    >
      <div className="chf-root">
        <header className="chf-header">
          <div className="chf-title">
            <h1>输煤全流程动态展示</h1>
            <span>
              燃料集控 · 2.5D 工艺总览 / 三维煤场 · {now.toLocaleString('zh-CN', { hour12: false })}
            </span>
          </div>
          <Tabs
            activeKey={menu}
            onChange={(k) => setMenu(k as MenuKey)}
            items={MENU_ITEMS.map((m) => ({ key: m.key, label: m.label }))}
            style={{ marginBottom: 0 }}
          />
          <Space>
            <Tag color="processing">模拟实时</Tag>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={() => {
                setBelts(BELTS.map((b) => ({ ...b })));
                message.info('已刷新示例数据');
              }}
            >
              刷新
            </Button>
          </Space>
        </header>

        <div className="chf-body">
          <div className="chf-main">
            {menu === 'overview' && (
              <Overview25D
                belts={belts}
                bunkers={bunkers}
                stackers={stackers}
                onYard={goYard}
                onBelt={goBelt}
                onBunker={goBunker}
                onUnit={goUnit}
                onPoint={(title, desc) => setPointModal({ title, desc })}
              />
            )}

            {menu === 'yard3d' && (
              <>
                <div style={{ position: 'absolute', zIndex: 5, top: 12, left: 12 }}>
                  <Button icon={<ArrowLeftOutlined />} onClick={() => setMenu('overview')}>
                    返回总览
                  </Button>
                </div>
                <CoalYard3D
                  piles={piles}
                  stackers={stackers}
                  onHover={setHover}
                  onSelectPile={(p) => {
                    setPileDrawer(p);
                    setPileAction(null);
                  }}
                />
                {hover && (
                  <div
                    className="chf-hover-tip"
                    style={{ left: hover.clientX + 14, top: hover.clientY + 14 }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{hover.pile.name}</div>
                    <div>煤种 {hover.pile.coalType}</div>
                    <div>热值 {hover.pile.heatValue} kcal/kg · 煤量 {hover.pile.amountT} t</div>
                    <div>温度 {hover.pile.tempC}℃ · 堆高约 {hover.heightM} m</div>
                    <div style={{ color: '#595959' }}>{hover.posLabel}</div>
                  </div>
                )}
              </>
            )}

            {menu === 'belt' && (
              <div className="chf-panel-view">
                <Space style={{ marginBottom: 12 }} wrap>
                  {belts.map((b) => (
                    <Button
                      key={b.id}
                      type={b.id === activeBeltId ? 'primary' : 'default'}
                      size="small"
                      onClick={() => {
                        setActiveBeltId(b.id);
                        setEquipDrawer(b);
                      }}
                    >
                      {b.id}
                    </Button>
                  ))}
                </Space>
                <Descriptions
                  title={activeBelt.name}
                  bordered
                  size="small"
                  column={2}
                  extra={
                    <Button type="link" onClick={() => setEquipDrawer(activeBelt)}>
                      打开仪表板
                    </Button>
                  }
                >
                  <Descriptions.Item label="工作状态">
                    <span className={statusClass(activeBelt.status)}>{activeBelt.status}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="当前位置">{activeBelt.position}</Descriptions.Item>
                  <Descriptions.Item label="作业煤种">{activeBelt.coalType}</Descriptions.Item>
                  <Descriptions.Item label="电流 / 带速">
                    {activeBelt.currentA} A / {activeBelt.speedMs} m/s
                  </Descriptions.Item>
                  <Descriptions.Item label="瞬时 / 累计">
                    {activeBelt.instantTh} t/h / {activeBelt.accumT} t
                  </Descriptions.Item>
                  <Descriptions.Item label="班/日/月/年/总运行时">
                    {activeBelt.runShiftH} / {activeBelt.runDayH} / {activeBelt.runMonthH} /{' '}
                    {activeBelt.runYearH} / {activeBelt.runTotalH} h
                  </Descriptions.Item>
                </Descriptions>
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 14, marginBottom: 8 }}>斗轮机快览</h3>
                  <Space wrap>
                    {stackers.map((s) => (
                      <Button key={s.id} onClick={() => setEquipDrawer(s)}>
                        {s.name}（{s.mode}）
                      </Button>
                    ))}
                    <Button type="primary" ghost onClick={goYard}>
                      进入煤场三维
                    </Button>
                  </Space>
                </div>
              </div>
            )}

            {menu === 'bunker' && (
              <div className="chf-panel-view">
                <Space style={{ marginBottom: 12 }} wrap>
                  {bunkers.map((b) => (
                    <Button
                      key={b.code}
                      type={b.code === activeBunker.code ? 'primary' : 'default'}
                      size="small"
                      onClick={() => setActiveBunkerId(b.code)}
                    >
                      {b.code}
                    </Button>
                  ))}
                </Space>
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                  <div>
                    <div className="chf-layer-bar" title="分层示意">
                      {activeBunker.layers.map((l) => (
                        <div
                          key={l.batch}
                          className="chf-layer-seg"
                          style={{ height: `${l.ratio * 100}%`, background: l.color }}
                        />
                      ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 6, fontSize: 12 }}>
                      {activeBunker.code}
                      <br />
                      {activeBunker.levelM}m
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Descriptions title={`${activeBunker.code} 煤仓分层`} bordered size="small" column={1}>
                      {activeBunker.layers.map((l) => (
                        <Descriptions.Item
                          key={l.batch}
                          label={
                            <span>
                              <span
                                className="chf-dot"
                                style={{ background: l.color, width: 10, height: 10 }}
                              />
                              {l.batch}
                            </span>
                          }
                        >
                          煤种 {l.coalType} · 煤量 {l.amountT} t · 占比 {(l.ratio * 100).toFixed(0)}% · 层高{' '}
                          {l.heightM.toFixed(1)} m · {l.quality} · 加仓 {l.loadTime} · 预计可用 {l.etaHours} h
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                    <h3 style={{ marginTop: 16, fontSize: 14 }}>历史加仓记录</h3>
                    <Table
                      size="small"
                      pagination={false}
                      rowKey={(r) => r.time + r.bunker}
                      dataSource={BUNKER_HISTORY}
                      columns={[
                        { title: '时间', dataIndex: 'time' },
                        { title: '煤仓', dataIndex: 'bunker', width: 70 },
                        { title: '煤种', dataIndex: 'coalType' },
                        { title: '煤量(t)', dataIndex: 'amountT', width: 90 },
                        { title: '煤质', dataIndex: 'quality' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {menu === 'unit' && (
              <div className="chf-panel-view">
                <Space style={{ marginBottom: 12 }}>
                  {UNITS.map((u) => (
                    <Button
                      key={u.id}
                      type={u.id === activeUnitId ? 'primary' : 'default'}
                      onClick={() => setActiveUnitId(u.id)}
                    >
                      {u.name}
                    </Button>
                  ))}
                </Space>
                <Descriptions title={`${activeUnit.name} 运行情况`} bordered size="small" column={2}>
                  <Descriptions.Item label="运行状态">
                    <span className={statusClass(activeUnit.status)}>{activeUnit.status}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="机组负荷">{activeUnit.loadMw} MW</Descriptions.Item>
                  <Descriptions.Item label="今日耗煤">{activeUnit.todayCoalT.toFixed(2)} t</Descriptions.Item>
                  <Descriptions.Item label="累计耗煤">{activeUnit.totalCoalT.toLocaleString()} t</Descriptions.Item>
                  <Descriptions.Item label="主汽温度">{activeUnit.mainSteamTemp} ℃</Descriptions.Item>
                  <Descriptions.Item label="凝汽器真空">{activeUnit.vacuum} kPa</Descriptions.Item>
                </Descriptions>
                <div style={{ marginTop: 16 }} className="chf-card">
                  <h3>关联加仓</h3>
                  <p style={{ fontSize: 13, color: '#595959', margin: 0 }}>
                    当前计划向 {LOAD_PLAN.bunker} 加仓，来源 {LOAD_PLAN.pile}（{LOAD_PLAN.coalType}），计划量{' '}
                    {LOAD_PLAN.amountT} t。
                  </p>
                </div>
              </div>
            )}
          </div>

          {menu === 'overview' && (
            <aside className="chf-side">
              <div className="chf-card">
                <h3>当前计划加仓工单</h3>
                <div className="chf-kv">
                  <span>编号</span>
                  <span>{LOAD_PLAN.id}</span>
                </div>
                <div className="chf-kv">
                  <span>计划</span>
                  <span>{LOAD_PLAN.name}</span>
                </div>
                <div className="chf-kv">
                  <span>煤堆</span>
                  <span>{LOAD_PLAN.pile}</span>
                </div>
                <div className="chf-kv">
                  <span>煤种</span>
                  <span>{LOAD_PLAN.coalType}</span>
                </div>
                <div className="chf-kv">
                  <span>机组</span>
                  <span>{LOAD_PLAN.unit}</span>
                </div>
                <div className="chf-kv">
                  <span>煤仓</span>
                  <span>{LOAD_PLAN.bunker}</span>
                </div>
                <div className="chf-kv">
                  <span>计划量</span>
                  <span>{LOAD_PLAN.amountT} t</span>
                </div>
                <div className="chf-kv">
                  <span>状态</span>
                  <span className={statusClass(LOAD_PLAN.status)}>{LOAD_PLAN.status}</span>
                </div>
              </div>

              <div className="chf-card">
                <h3>图例与入口</h3>
                <div className="chf-legend">
                  <span>
                    <i className="chf-dot" style={{ background: '#52c41a' }} />
                    运行
                  </span>
                  <span>
                    <i className="chf-dot" style={{ background: '#ff4d4f' }} />
                    停运
                  </span>
                  <span>
                    <i className="chf-dot" style={{ background: '#faad14' }} />
                    电机/警告
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#595959', marginTop: 10, lineHeight: 1.6 }}>
                  点击煤场进入三维；点击皮带、煤仓、机组日耗进入对应监测界面。
                </p>
                <Button
                  type="primary"
                  block
                  icon={<EnvironmentOutlined />}
                  style={{ marginTop: 8 }}
                  onClick={goYard}
                >
                  打开煤场三维
                </Button>
              </div>

              <div className="chf-card">
                <h3>斗轮机</h3>
                {stackers.map((s) => (
                  <div
                    key={s.id}
                    className="chf-kv"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setEquipDrawer(s)}
                  >
                    <span>{s.name}</span>
                    <span className={statusClass(s.mode)}>{s.mode}</span>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>

        <Modal
          open={!!pointModal}
          title="测点信息"
          onCancel={() => setPointModal(null)}
          footer={<Button onClick={() => setPointModal(null)}>关闭</Button>}
        >
          {pointModal && (
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="测点/设备">{pointModal.title}</Descriptions.Item>
              <Descriptions.Item label="描述">{pointModal.desc}</Descriptions.Item>
              <Descriptions.Item label="报警上限">85.0</Descriptions.Item>
              <Descriptions.Item label="报警下限">5.0</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>

        <Drawer
          title={equipDrawer && 'name' in equipDrawer ? equipDrawer.name : '设备仪表板'}
          open={!!equipDrawer}
          onClose={() => setEquipDrawer(null)}
          width={420}
        >
          {equipDrawer && 'currentA' in equipDrawer && (
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="工作状态">
                <span className={statusClass(equipDrawer.status)}>{equipDrawer.status}</span>
              </Descriptions.Item>
              <Descriptions.Item label="位置">{equipDrawer.position}</Descriptions.Item>
              <Descriptions.Item label="作业煤种">{equipDrawer.coalType}</Descriptions.Item>
              <Descriptions.Item label="班运行时">{equipDrawer.runShiftH} h</Descriptions.Item>
              <Descriptions.Item label="日运行时">{equipDrawer.runDayH} h</Descriptions.Item>
              <Descriptions.Item label="月运行时">{equipDrawer.runMonthH} h</Descriptions.Item>
              <Descriptions.Item label="年运行时">{equipDrawer.runYearH} h</Descriptions.Item>
              <Descriptions.Item label="总运行时">{equipDrawer.runTotalH} h</Descriptions.Item>
            </Descriptions>
          )}
          {equipDrawer && 'mode' in equipDrawer && !('currentA' in equipDrawer) && (
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="工作状态">
                <span className={statusClass(equipDrawer.mode)}>{equipDrawer.mode}</span>
              </Descriptions.Item>
              <Descriptions.Item label="位置">{equipDrawer.position}</Descriptions.Item>
              <Descriptions.Item label="悬臂角度">{equipDrawer.boomAngle}°</Descriptions.Item>
              <Descriptions.Item label="作业煤种">{equipDrawer.coalType}</Descriptions.Item>
              <Descriptions.Item label="系统急停">
                {equipDrawer.emergencyStop ? '是' : '否'}
              </Descriptions.Item>
              <Descriptions.Item label="班/日/月/年/总">
                {equipDrawer.runShiftH} / {equipDrawer.runDayH} / {equipDrawer.runMonthH} /{' '}
                {equipDrawer.runYearH} / {equipDrawer.runTotalH} h
              </Descriptions.Item>
              <Descriptions.Item label="操作">
                <Button type="link" onClick={goYard}>
                  在三维中查看定位
                </Button>
              </Descriptions.Item>
            </Descriptions>
          )}
        </Drawer>

        <Drawer
          title={pileDrawer ? `${pileDrawer.name} · 煤堆操作` : '煤堆'}
          open={!!pileDrawer}
          onClose={() => {
            setPileDrawer(null);
            setPileAction(null);
          }}
          width={460}
        >
          {pileDrawer && (
            <>
              <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="煤种">{pileDrawer.coalType}</Descriptions.Item>
                <Descriptions.Item label="煤量">{pileDrawer.amountT} t</Descriptions.Item>
                <Descriptions.Item label="热值">{pileDrawer.heatValue} kcal/kg</Descriptions.Item>
                <Descriptions.Item label="全水 / 硫 / 挥发 / 灰">
                  {pileDrawer.moisture}% / {pileDrawer.sulfur}% / {pileDrawer.volatile}% / {pileDrawer.ash}%
                </Descriptions.Item>
                <Descriptions.Item label="温度">{pileDrawer.tempC} ℃</Descriptions.Item>
                <Descriptions.Item label="堆煤时间">{pileDrawer.stackTime}</Descriptions.Item>
              </Descriptions>
              <Space wrap style={{ marginBottom: 16 }}>
                <Button onClick={() => setPileAction('quality')}>增改煤质化验</Button>
                <Button onClick={() => setPileAction('amount')}>修改煤量</Button>
                <Button type="primary" onClick={() => setPileAction('blend')}>
                  配煤上仓
                </Button>
                <Button onClick={() => setPileAction('history')}>历史堆取料</Button>
              </Space>

              {pileAction === 'quality' && (
                <Form
                  layout="vertical"
                  initialValues={pileDrawer}
                  onFinish={(v) => {
                    setPiles((prev) =>
                      prev.map((p) =>
                        p.id === pileDrawer.id
                          ? {
                              ...p,
                              heatValue: v.heatValue,
                              moisture: v.moisture,
                              sulfur: v.sulfur,
                              volatile: v.volatile,
                              ash: v.ash,
                            }
                          : p,
                      ),
                    );
                    submitPileForm();
                  }}
                >
                  <Form.Item name="heatValue" label="热值" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="moisture" label="全水 %">
                    <InputNumber style={{ width: '100%' }} step={0.1} />
                  </Form.Item>
                  <Form.Item name="sulfur" label="硫分 %">
                    <InputNumber style={{ width: '100%' }} step={0.01} />
                  </Form.Item>
                  <Form.Item name="volatile" label="挥发分 %">
                    <InputNumber style={{ width: '100%' }} step={0.1} />
                  </Form.Item>
                  <Form.Item name="ash" label="灰分 %">
                    <InputNumber style={{ width: '100%' }} step={0.1} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block>
                    保存化验数据
                  </Button>
                </Form>
              )}

              {pileAction === 'amount' && (
                <Form
                  layout="vertical"
                  initialValues={{ amountT: pileDrawer.amountT }}
                  onFinish={(v) => {
                    setPiles((prev) =>
                      prev.map((p) => (p.id === pileDrawer.id ? { ...p, amountT: v.amountT } : p)),
                    );
                    setPileDrawer((p) => (p ? { ...p, amountT: v.amountT } : p));
                    submitPileForm();
                  }}
                >
                  <Form.Item name="amountT" label="煤量 (t)" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block>
                    确认修改
                  </Button>
                </Form>
              )}

              {pileAction === 'blend' && (
                <Form
                  layout="vertical"
                  initialValues={{ unit: '#1 机组', bunker: '1A', amount: 200 }}
                  onFinish={() => submitPileForm()}
                >
                  <Form.Item name="unit" label="目标机组" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="bunker" label="目标煤仓" rules={[{ required: true }]}>
                    <Input placeholder="如 1A" />
                  </Form.Item>
                  <Form.Item name="amount" label="上仓量 (t)" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={1} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block>
                    下发配煤上仓
                  </Button>
                </Form>
              )}

              {pileAction === 'history' && (
                <Table
                  size="small"
                  pagination={false}
                  rowKey={(r) => r.time + r.action}
                  dataSource={PILE_HISTORY}
                  columns={[
                    { title: '时间', dataIndex: 'time' },
                    { title: '动作', dataIndex: 'action', width: 70 },
                    { title: '煤量(t)', dataIndex: 'amountT', width: 90 },
                    { title: '班值', dataIndex: 'operator', width: 70 },
                  ]}
                />
              )}
            </>
          )}
        </Drawer>
      </div>
    </ConfigProvider>
  );
}
