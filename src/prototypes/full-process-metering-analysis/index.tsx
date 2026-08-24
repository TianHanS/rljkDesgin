/**
 * @name 全程计量分析
 * @mode axure
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /rules/design-guide.md
 * - /skills/default-design-guide-minimal/SKILL.md
 * - 用户需求：全程计量平衡、节点报警、煤堆清零、问题频次挖掘、月盘点平衡
 */
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  ConfigProvider,
  DatePicker,
  Drawer,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import {
  AlertOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import zhCN from 'antd/locale/zh_CN';
import type { ColumnsType } from 'antd/es/table';
import './style.css';

const ROUND = (n: number) => Math.round(n * 100) / 100;
const PCT = (diff: number, base: number) =>
  base === 0 ? 0 : ROUND((Math.abs(diff) / Math.abs(base)) * 100);

type BalanceLevel = 'ok' | 'warn' | 'error';

const levelOf = (pct: number): BalanceLevel => {
  if (pct <= 0.5) return 'ok';
  if (pct <= 1.5) return 'warn';
  return 'error';
};

const LEVEL_TAG: Record<BalanceLevel, { color: string; text: string }> = {
  ok: { color: 'success', text: '平衡' },
  warn: { color: 'warning', text: '关注' },
  error: { color: 'error', text: '失衡' },
};

interface NodeSummary {
  key: string;
  name: string;
  source: string;
  ton: number;
  unit: string;
}

interface FlowSegment {
  key: string;
  title: string;
  leftLabel: string;
  leftTon: number;
  rightLabel: string;
  rightTon: number;
  rule: string;
}

interface AlarmRow {
  key: string;
  node: string;
  device: string;
  issueCount: number;
  lastDiffPct: number;
  lastTime: string;
  level: BalanceLevel;
  hint: string;
}

interface PileRow {
  key: string;
  yard: string;
  zone: string;
  coalType: string;
  stockTon: number;
  lastReclaim: string;
  autoZero: boolean;
}

interface IssueFreqRow {
  key: string;
  dim: string;
  name: string;
  count: number;
  avgDiffPct: number;
  lastOccur: string;
}

interface MeterIssueRow {
  key: string;
  point: string;
  device: string;
  count: number;
  suggest: string;
}

interface MonthBalanceRow {
  key: string;
  coalType: string;
  processTon: number;
  inventoryTon: number;
  diffTon: number;
  diffPct: number;
  level: BalanceLevel;
}

const NODE_SUMMARY: NodeSummary[] = [
  { key: 'draft', name: '水尺计量', source: '水尺报告', ton: 61508, unit: 't' },
  { key: 'in', name: '入厂煤量', source: '入厂称重', ton: 61240, unit: 't' },
  { key: 'furnace', name: '入炉煤量', source: '入炉称重', ton: 52860, unit: 't' },
  { key: 'yard', name: '煤场存煤量', source: '固定式盘煤', ton: 186420, unit: 't' },
  { key: 'bunker', name: '煤仓存煤量', source: '智能配煤掺烧', ton: 8420, unit: 't' },
];

const FLOW_SEGMENTS: FlowSegment[] = [
  {
    key: 'ship',
    title: '船运节点',
    leftLabel: '水尺计量',
    leftTon: 61508,
    rightLabel: '入厂称重',
    rightTon: 61240,
    rule: '水尺 − 入厂',
  },
  {
    key: 'yard',
    title: '煤场节点',
    leftLabel: '入厂−入炉结存变化',
    leftTon: 8380,
    rightLabel: '盘煤存煤变化',
    rightTon: 8210,
    rule: '（入厂−入炉）↔ 盘煤变化',
  },
  {
    key: 'furnace',
    title: '入炉节点',
    leftLabel: '入炉称重',
    leftTon: 52860,
    rightLabel: '煤仓耗用',
    rightTon: 53120,
    rule: '入炉 ↔ 煤仓耗用',
  },
];

const INIT_ALARMS: AlarmRow[] = [
  {
    key: 'a1',
    node: '船运节点',
    device: 'A入厂皮带秤',
    issueCount: 12,
    lastDiffPct: 1.82,
    lastTime: '2026-08-09 16:20',
    level: 'error',
    hint: '近期水尺与入厂差值持续偏大，建议复核水尺与皮带秤标定',
  },
  {
    key: 'a2',
    node: '煤场节点',
    device: '1号圆形盘煤仪',
    issueCount: 7,
    lastDiffPct: 0.96,
    lastTime: '2026-08-08 09:10',
    level: 'warn',
    hint: '盘煤与账面结存偏差上升，建议重点复盘 #1–#8 区',
  },
  {
    key: 'a3',
    node: '入炉节点',
    device: '1号机组 B 煤仓料位',
    issueCount: 5,
    lastDiffPct: 0.71,
    lastTime: '2026-08-07 22:35',
    level: 'warn',
    hint: '入炉皮带秤与煤仓耗用对不上，建议校准料位与皮带秤',
  },
];

const INIT_PILES: PileRow[] = [
  {
    key: 'p1',
    yard: '一号圆形煤场',
    zone: '3区',
    coalType: '国信1-5000',
    stockTon: 126.5,
    lastReclaim: '2026-08-10 14:20',
    autoZero: true,
  },
  {
    key: 'p2',
    yard: '一号圆形煤场',
    zone: '11区',
    coalType: '外购混煤',
    stockTon: 48.2,
    lastReclaim: '2026-08-10 11:05',
    autoZero: false,
  },
  {
    key: 'p3',
    yard: '二号圆形煤场',
    zone: '6区',
    coalType: '印尼褐煤',
    stockTon: 0,
    lastReclaim: '2026-08-09 18:40',
    autoZero: true,
  },
  {
    key: 'p4',
    yard: '二号圆形煤场',
    zone: '15区',
    coalType: '晋北贫瘦煤',
    stockTon: 210.8,
    lastReclaim: '2026-08-10 08:15',
    autoZero: false,
  },
];

const SHIP_ISSUES: IssueFreqRow[] = [
  {
    key: 's1',
    dim: '船号',
    name: '恒荣江海',
    count: 9,
    avgDiffPct: 1.42,
    lastOccur: '2026-08-09',
  },
  {
    key: 's2',
    dim: '发货方',
    name: '江苏国信能源销售有限公司',
    count: 8,
    avgDiffPct: 0.88,
    lastOccur: '2026-08-08',
  },
  {
    key: 's3',
    dim: '前港（发港）',
    name: '秦皇岛',
    count: 6,
    avgDiffPct: 1.15,
    lastOccur: '2026-08-07',
  },
  {
    key: 's4',
    dim: '航线',
    name: '—',
    count: 0,
    avgDiffPct: 0,
    lastOccur: '—',
  },
];

const METER_ISSUES: MeterIssueRow[] = [
  {
    key: 'm1',
    point: '入厂计量点',
    device: 'A入厂皮带秤',
    count: 12,
    suggest: '建议 72 小时内复校',
  },
  {
    key: 'm2',
    point: '盘煤计量点',
    device: '1号圆形盘煤仪',
    count: 7,
    suggest: '建议复盘并校验雷达工况',
  },
  {
    key: 'm3',
    point: '入炉计量点',
    device: '上煤皮带秤 #2',
    count: 6,
    suggest: '建议零点/跨度校准',
  },
  {
    key: 'm4',
    point: '煤仓计量点',
    device: '2号机组 D 仓料位计',
    count: 4,
    suggest: '建议检查料位盲区与挂料',
  },
];

const MONTH_BALANCE: MonthBalanceRow[] = (() => {
  const rows = [
    { coalType: '国信1-5000', processTon: 28640, inventoryTon: 28510 },
    { coalType: '外购混煤', processTon: 15220, inventoryTon: 15180 },
    { coalType: '印尼褐煤', processTon: 9860, inventoryTon: 10040 },
    { coalType: '晋北贫瘦煤', processTon: 7420, inventoryTon: 7395 },
  ];
  return rows.map((r, i) => {
    const diffTon = ROUND(r.processTon - r.inventoryTon);
    const diffPct = PCT(diffTon, r.inventoryTon);
    return {
      key: `mb-${i}`,
      coalType: r.coalType,
      processTon: r.processTon,
      inventoryTon: r.inventoryTon,
      diffTon,
      diffPct,
      level: levelOf(diffPct),
    };
  });
})();

const Component: React.FC = () => {
  const [month, setMonth] = useState<Dayjs>(dayjs('2026-08-01'));
  const [alarmLevel, setAlarmLevel] = useState<BalanceLevel | 'all'>('all');
  const [piles, setPiles] = useState(INIT_PILES);
  const [alarmDrawer, setAlarmDrawer] = useState<AlarmRow | null>(null);
  const [globalAutoZero, setGlobalAutoZero] = useState(true);

  const filteredAlarms = useMemo(
    () =>
      INIT_ALARMS.filter((a) => (alarmLevel === 'all' ? true : a.level === alarmLevel)),
    [alarmLevel],
  );

  const flowCards = useMemo(
    () =>
      FLOW_SEGMENTS.map((seg) => {
        const diff = ROUND(seg.leftTon - seg.rightTon);
        const pct = PCT(diff, seg.leftTon || seg.rightTon);
        const level = levelOf(pct);
        return { ...seg, diff, pct, level };
      }),
    [],
  );

  const imbalanceCount = flowCards.filter((f) => f.level !== 'ok').length;

  const zeroPile = (key: string) => {
    setPiles((prev) =>
      prev.map((p) => (p.key === key ? { ...p, stockTon: 0 } : p)),
    );
    message.success('煤堆存量已清零（原型模拟）');
  };

  const togglePileAuto = (key: string, checked: boolean) => {
    setPiles((prev) =>
      prev.map((p) => (p.key === key ? { ...p, autoZero: checked } : p)),
    );
  };

  const onQuery = () => {
    message.success(`已按 ${month.format('YYYY年MM月')} 刷新全程计量分析口径（原型）`);
  };

  const pileColumns: ColumnsType<PileRow> = [
    { title: '煤场', dataIndex: 'yard', width: 130 },
    { title: '分区', dataIndex: 'zone', width: 72 },
    { title: '煤种', dataIndex: 'coalType', width: 120 },
    {
      title: '当前存量(t)',
      dataIndex: 'stockTon',
      width: 110,
      render: (v) => <span className="fpm-num">{Number(v).toFixed(1)}</span>,
    },
    { title: '最近取煤时间', dataIndex: 'lastReclaim', width: 150 },
    {
      title: '自动清零',
      dataIndex: 'autoZero',
      width: 100,
      render: (v, row) => (
        <Switch
          size="small"
          checked={v}
          disabled={!globalAutoZero}
          onChange={(checked) => togglePileAuto(row.key, checked)}
        />
      ),
    },
    {
      title: '操作',
      width: 110,
      render: (_v, row) => (
        <Popconfirm
          title="确认将该煤堆存量清零？"
          description="取煤后清零将把该堆账面存量记为 0，并写入清零留痕。"
          disabled={row.stockTon <= 0}
          onConfirm={() => zeroPile(row.key)}
        >
          <Button type="link" size="small" disabled={row.stockTon <= 0}>
            手工清零
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const alarmColumns: ColumnsType<AlarmRow> = [
    {
      title: '等级',
      dataIndex: 'level',
      width: 80,
      render: (v: BalanceLevel) => (
        <Tag color={LEVEL_TAG[v].color}>{LEVEL_TAG[v].text}</Tag>
      ),
    },
    { title: '计量节点', dataIndex: 'node', width: 110 },
    { title: '计量设备', dataIndex: 'device', width: 150 },
    {
      title: '问题次数',
      dataIndex: 'issueCount',
      width: 90,
      render: (v) => <span className="fpm-num">{v}</span>,
    },
    {
      title: '最近偏差%',
      dataIndex: 'lastDiffPct',
      width: 100,
      render: (v) => <span className="fpm-num">{Number(v).toFixed(2)}</span>,
    },
    { title: '最近发生', dataIndex: 'lastTime', width: 140 },
    { title: '提醒', dataIndex: 'hint', ellipsis: true },
    {
      title: '操作',
      width: 90,
      render: (_v, row) => (
        <Button type="link" size="small" onClick={() => setAlarmDrawer(row)}>
          明细
        </Button>
      ),
    },
  ];

  const issueColumns: ColumnsType<IssueFreqRow> = [
    { title: '维度', dataIndex: 'dim', width: 110 },
    { title: '对象', dataIndex: 'name', ellipsis: true },
    {
      title: '问题频次',
      dataIndex: 'count',
      width: 90,
      render: (v) => <span className="fpm-num">{v}</span>,
    },
    {
      title: '平均偏差%',
      dataIndex: 'avgDiffPct',
      width: 100,
      render: (v) => <span className="fpm-num">{Number(v).toFixed(2)}</span>,
    },
    { title: '最近发生', dataIndex: 'lastOccur', width: 110 },
  ];

  const meterColumns: ColumnsType<MeterIssueRow> = [
    { title: '计量点', dataIndex: 'point', width: 120 },
    { title: '设备', dataIndex: 'device', width: 150 },
    {
      title: '问题频次',
      dataIndex: 'count',
      width: 90,
      render: (v) => <span className="fpm-num">{v}</span>,
    },
    { title: '运维建议', dataIndex: 'suggest' },
  ];

  const monthColumns: ColumnsType<MonthBalanceRow> = [
    { title: '煤种', dataIndex: 'coalType', width: 140 },
    {
      title: '全程计量汇总(t)',
      dataIndex: 'processTon',
      width: 140,
      render: (v) => <span className="fpm-num">{Number(v).toLocaleString()}</span>,
    },
    {
      title: '月盘点(t)',
      dataIndex: 'inventoryTon',
      width: 120,
      render: (v) => <span className="fpm-num">{Number(v).toLocaleString()}</span>,
    },
    {
      title: '差额(t)',
      dataIndex: 'diffTon',
      width: 100,
      render: (v) => (
        <span className="fpm-num" style={{ color: Math.abs(v) > 100 ? '#b45309' : undefined }}>
          {Number(v).toFixed(0)}
        </span>
      ),
    },
    {
      title: '偏差%',
      dataIndex: 'diffPct',
      width: 90,
      render: (v) => <span className="fpm-num">{Number(v).toFixed(2)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'level',
      width: 80,
      render: (v: BalanceLevel) => (
        <Tag color={LEVEL_TAG[v].color}>{LEVEL_TAG[v].text}</Tag>
      ),
    },
  ];

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <div className="fpm-page">
        <header className="fpm-hd">
          <div>
            <h1>全程计量分析</h1>
            <p>
              水尺 / 入厂入炉称重 / 盘煤 / 煤仓数据汇聚比对，校核船运—煤场—入炉量平衡
            </p>
          </div>
          <Space wrap>
            <DatePicker
              picker="month"
              value={month}
              onChange={(v) => v && setMonth(v)}
              allowClear={false}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={onQuery}>
              查询
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setPiles(INIT_PILES);
                message.info('已重置示例数据');
              }}
            >
              重置
            </Button>
          </Space>
        </header>

        {imbalanceCount > 0 && (
          <Alert
            className="fpm-top-alert"
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message={`本月有 ${imbalanceCount} 个流转节点偏差超阈，请结合报警与问题频次分析处置`}
          />
        )}

        <section className="fpm-section">
          <div className="fpm-section-title">流转节点煤量汇总</div>
          <div className="fpm-kpi-grid">
            {NODE_SUMMARY.map((n) => (
              <div key={n.key} className="fpm-kpi">
                <div className="fpm-kpi-name">{n.name}</div>
                <div className="fpm-kpi-ton">
                  <span className="fpm-num">{n.ton.toLocaleString()}</span>
                  <em>{n.unit}</em>
                </div>
                <div className="fpm-kpi-src">来源：{n.source}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="fpm-section">
          <div className="fpm-section-title">船运 · 煤场 · 入炉 三段平衡</div>
          <div className="fpm-flow-grid">
            {flowCards.map((f, idx) => (
              <React.Fragment key={f.key}>
                <div className={`fpm-flow-card is-${f.level}`}>
                  <div className="fpm-flow-hd">
                    <strong>{f.title}</strong>
                    <Tag color={LEVEL_TAG[f.level].color}>{LEVEL_TAG[f.level].text}</Tag>
                  </div>
                  <div className="fpm-flow-pair">
                    <div>
                      <span className="k">{f.leftLabel}</span>
                      <span className="v fpm-num">{f.leftTon.toLocaleString()} t</span>
                    </div>
                    <div className="fpm-flow-vs">↔</div>
                    <div>
                      <span className="k">{f.rightLabel}</span>
                      <span className="v fpm-num">{f.rightTon.toLocaleString()} t</span>
                    </div>
                  </div>
                  <div className="fpm-flow-meta">
                    <span>规则：{f.rule}</span>
                    <span>
                      差额 <b className="fpm-num">{f.diff.toFixed(0)}</b> t · 偏差{' '}
                      <b className="fpm-num">{f.pct.toFixed(2)}%</b>
                    </span>
                  </div>
                </div>
                {idx < flowCards.length - 1 && <div className="fpm-flow-arrow" aria-hidden>→</div>}
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className="fpm-section">
          <div className="fpm-section-hd">
            <div className="fpm-section-title">
              <AlertOutlined style={{ marginRight: 6 }} />
              计量节点报警
            </div>
            <Select
              size="small"
              style={{ width: 120 }}
              value={alarmLevel}
              onChange={setAlarmLevel}
              options={[
                { value: 'all', label: '全部等级' },
                { value: 'error', label: '失衡' },
                { value: 'warn', label: '关注' },
                { value: 'ok', label: '平衡' },
              ]}
            />
          </div>
          <Table
            size="small"
            rowKey="key"
            columns={alarmColumns}
            dataSource={filteredAlarms}
            pagination={false}
            scroll={{ x: 980 }}
          />
        </section>

        <section className="fpm-section">
          <div className="fpm-section-hd">
            <div className="fpm-section-title">煤堆取煤后清零</div>
            <Space size={8}>
              <span className="fpm-hint">全局自动清零</span>
              <Switch checked={globalAutoZero} onChange={setGlobalAutoZero} />
            </Space>
          </div>
          <p className="fpm-desc">
            取煤完成后可将残堆存量手工清零，或开启自动清零；清零后账面存量为 0，保留清零时间留痕（原型）。
          </p>
          <Table
            size="small"
            rowKey="key"
            columns={pileColumns}
            dataSource={piles}
            pagination={false}
            scroll={{ x: 860 }}
          />
        </section>

        <div className="fpm-two-col">
          <section className="fpm-section">
            <div className="fpm-section-title">问题对象频次（船号 / 发货方 / 前港 / 航线）</div>
            <p className="fpm-desc">挖掘历史计量问题较多的业务对象，提醒燃料管理重点关注。</p>
            <Table
              size="small"
              rowKey="key"
              columns={issueColumns}
              dataSource={SHIP_ISSUES}
              pagination={false}
            />
          </section>
          <section className="fpm-section">
            <div className="fpm-section-title">问题计量点 / 设备</div>
            <p className="fpm-desc">找出问题频次较高的计量点与设备，提醒运行维护及时校准。</p>
            <Table
              size="small"
              rowKey="key"
              columns={meterColumns}
              dataSource={METER_ISSUES}
              pagination={false}
            />
          </section>
        </div>

        <section className="fpm-section">
          <div className="fpm-section-title">煤种全程计量 ↔ 月盘点平衡</div>
          <p className="fpm-desc">
            各煤种全程计量汇总与当月定期盘点数据比对；偏差 &gt; 0.5% 标记关注，&gt; 1.5% 标记失衡。
          </p>
          <Table
            size="small"
            rowKey="key"
            columns={monthColumns}
            dataSource={MONTH_BALANCE}
            pagination={false}
            summary={() => {
              const process = MONTH_BALANCE.reduce((a, r) => a + r.processTon, 0);
              const inv = MONTH_BALANCE.reduce((a, r) => a + r.inventoryTon, 0);
              const diff = ROUND(process - inv);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>合计</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <span className="fpm-num">{process.toLocaleString()}</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <span className="fpm-num">{inv.toLocaleString()}</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <span className="fpm-num">{diff.toFixed(0)}</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} colSpan={2} />
                </Table.Summary.Row>
              );
            }}
          />
        </section>

        <Drawer
          title={alarmDrawer ? `${alarmDrawer.node} · ${alarmDrawer.device}` : '报警明细'}
          open={Boolean(alarmDrawer)}
          onClose={() => setAlarmDrawer(null)}
          width={480}
        >
          {alarmDrawer && (
            <div className="fpm-drawer-body">
              <div className="fpm-drawer-item">
                <span className="k">等级</span>
                <Tag color={LEVEL_TAG[alarmDrawer.level].color}>
                  {LEVEL_TAG[alarmDrawer.level].text}
                </Tag>
              </div>
              <div className="fpm-drawer-item">
                <span className="k">问题次数</span>
                <span className="v fpm-num">{alarmDrawer.issueCount}</span>
              </div>
              <div className="fpm-drawer-item">
                <span className="k">最近偏差</span>
                <span className="v fpm-num">{alarmDrawer.lastDiffPct.toFixed(2)}%</span>
              </div>
              <div className="fpm-drawer-item">
                <span className="k">最近时间</span>
                <span className="v">{alarmDrawer.lastTime}</span>
              </div>
              <div className="fpm-drawer-item is-block">
                <span className="k">处置建议</span>
                <span className="v">{alarmDrawer.hint}</span>
              </div>
              <Alert
                type="info"
                showIcon
                message="明细数据为原型模拟"
                description="正式环境将下钻展示该设备近 30 日差值曲线、关联船次与盘点批记录。"
              />
            </div>
          )}
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default Component;
