/**
 * @name 全程能耗分析
 * @mode axure
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /rules/design-guide.md
 * - /skills/default-design-guide-minimal/SKILL.md
 * - 用户需求：热值途损/堆损、发电煤耗正平衡、班组输煤单耗评比、趋势与预测
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  ConfigProvider,
  DatePicker,
  Drawer,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import {
  AlertOutlined,
  FireOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import zhCN from 'antd/locale/zh_CN';
import type { ColumnsType } from 'antd/es/table';
import * as echarts from 'echarts';
import './style.css';

const ROUND = (n: number, d = 2) => {
  const p = 10 ** d;
  return Math.round(n * p) / p;
};

type Level = 'ok' | 'warn' | 'error';

const LEVEL_TAG: Record<Level, { color: string; text: string }> = {
  ok: { color: 'success', text: '正常' },
  warn: { color: 'warning', text: '关注' },
  error: { color: 'error', text: '告警' },
};

/** 正平衡法发电煤耗 g/kWh */
const calcCoalConsumption = (furnaceTon: number, qnet: number, genKwh: number) => {
  if (genKwh <= 0 || qnet <= 0) return 0;
  const standardTon = (furnaceTon * qnet) / 7000;
  return ROUND((standardTon * 1_000_000) / genKwh, 1);
};

/** 输煤单耗 kWh/t */
const calcTransportRate = (powerKwh: number, coalTon: number) => {
  if (coalTon <= 0) return 0;
  return ROUND(powerKwh / coalTon, 2);
};

interface HeatLossRow {
  key: string;
  ship: string;
  batchNo: string;
  coalType: string;
  voyageQ: number;
  inPlantQ: number;
  furnaceQ: number;
  routeLoss: number;
  stackLoss: number;
  level: Level;
  remark: string;
}

interface UnitConsRow {
  key: string;
  unit: string;
  genKwh: number;
  furnaceTon: number;
  qnet: number;
  consumption: number;
  updateTime: string;
}

interface TeamRankRow {
  key: string;
  team: string;
  shift: string;
  powerKwh: number;
  stackTon: number;
  loadTon: number;
  rate: number;
  rank: number;
}

interface TrendPoint {
  month: string;
  genCons: number;
  transportRate: number;
  forecast?: boolean;
}

const HEAT_LOSS: HeatLossRow[] = [
  {
    key: 'h1',
    ship: '恒荣江海',
    batchNo: 'gxsz-2026-054RCDJ2026080901',
    coalType: '国信1-5000',
    voyageQ: 5080,
    inPlantQ: 5012,
    furnaceQ: 4968,
    routeLoss: 68,
    stackLoss: 44,
    level: 'ok',
    remark: '损耗在容差波动内',
  },
  {
    key: 'h2',
    ship: '华盛116',
    batchNo: 'gxsz-2026-054RCDJ2026080502',
    coalType: '外购混煤',
    voyageQ: 4920,
    inPlantQ: 4810,
    furnaceQ: 4725,
    routeLoss: 110,
    stackLoss: 85,
    level: 'error',
    remark: '途损、堆损均超阈，建议复核化验与堆存时间',
  },
  {
    key: 'h3',
    ship: '新一海17',
    batchNo: 'gxsz-2026-042RCDJ2026073103',
    coalType: '印尼褐煤',
    voyageQ: 4250,
    inPlantQ: 4188,
    furnaceQ: 4110,
    routeLoss: 62,
    stackLoss: 78,
    level: 'warn',
    remark: '堆损偏高，关注露天堆存时长与水分变化',
  },
  {
    key: 'h4',
    ship: '苏电5号',
    batchNo: 'gxsz-2026-054RCDJ2026072801',
    coalType: '晋北贫瘦煤',
    voyageQ: 5320,
    inPlantQ: 5288,
    furnaceQ: 5250,
    routeLoss: 32,
    stackLoss: 38,
    level: 'ok',
    remark: '损耗平稳',
  },
];

const UNIT_CONS: UnitConsRow[] = [
  {
    key: 'u1',
    unit: '1号机组',
    genKwh: 12860000,
    furnaceTon: 5280,
    qnet: 4920,
    consumption: calcCoalConsumption(5280, 4920, 12860000),
    updateTime: '2026-08-11 14:30',
  },
  {
    key: 'u2',
    unit: '2号机组',
    genKwh: 11920000,
    furnaceTon: 4960,
    qnet: 4885,
    consumption: calcCoalConsumption(4960, 4885, 11920000),
    updateTime: '2026-08-11 14:30',
  },
];

const TEAM_RANK: TeamRankRow[] = (() => {
  const raw = [
    { team: '发电一值', shift: '白班', powerKwh: 18640, stackTon: 6200, loadTon: 5480 },
    { team: '发电二值', shift: '夜班', powerKwh: 19220, stackTon: 5980, loadTon: 5620 },
    { team: '发电三值', shift: '白班', powerKwh: 17880, stackTon: 6410, loadTon: 5710 },
    { team: '发电四值', shift: '夜班', powerKwh: 20150, stackTon: 5720, loadTon: 5390 },
  ].map((r) => ({
    ...r,
    rate: calcTransportRate(r.powerKwh, r.stackTon + r.loadTon),
  }));
  return raw
    .sort((a, b) => a.rate - b.rate)
    .map((r, i) => ({
      key: `t${i + 1}`,
      ...r,
      rank: i + 1,
    }));
})();

const TREND: TrendPoint[] = [
  { month: '2025-09', genCons: 298.2, transportRate: 1.72 },
  { month: '2025-10', genCons: 297.1, transportRate: 1.68 },
  { month: '2025-11', genCons: 299.4, transportRate: 1.75 },
  { month: '2025-12', genCons: 301.0, transportRate: 1.81 },
  { month: '2026-01', genCons: 302.6, transportRate: 1.79 },
  { month: '2026-02', genCons: 300.8, transportRate: 1.74 },
  { month: '2026-03', genCons: 298.9, transportRate: 1.7 },
  { month: '2026-04', genCons: 297.5, transportRate: 1.66 },
  { month: '2026-05', genCons: 296.2, transportRate: 1.64 },
  { month: '2026-06', genCons: 295.8, transportRate: 1.63 },
  { month: '2026-07', genCons: 296.9, transportRate: 1.67 },
  { month: '2026-08', genCons: 297.4, transportRate: 1.69 },
  { month: '2026-09', genCons: 296.8, transportRate: 1.66, forecast: true },
  { month: '2026-10', genCons: 296.1, transportRate: 1.64, forecast: true },
  { month: '2026-11', genCons: 295.5, transportRate: 1.62, forecast: true },
];

const ChartPanel: React.FC<{
  option: echarts.EChartsOption;
  height?: number;
}> = ({ option, height = 320 }) => {
  const domRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!domRef.current) return;
    const chart = echarts.init(domRef.current);
    chartRef.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={domRef} style={{ width: '100%', height }} />;
};

const Component: React.FC = () => {
  const [month, setMonth] = useState<Dayjs>(dayjs('2026-08-01'));
  const [metric, setMetric] = useState<'genCons' | 'transportRate'>('genCons');
  const [detail, setDetail] = useState<HeatLossRow | null>(null);

  const alarmCount = HEAT_LOSS.filter((r) => r.level !== 'ok').length;
  const avgRoute = ROUND(
    HEAT_LOSS.reduce((a, r) => a + r.routeLoss, 0) / HEAT_LOSS.length,
    1,
  );
  const avgStack = ROUND(
    HEAT_LOSS.reduce((a, r) => a + r.stackLoss, 0) / HEAT_LOSS.length,
    1,
  );
  const avgGen = ROUND(
    UNIT_CONS.reduce((a, r) => a + r.consumption, 0) / UNIT_CONS.length,
    1,
  );
  const bestTeam = TEAM_RANK[0];

  const chartOption = useMemo<echarts.EChartsOption>(() => {
    const months = TREND.map((t) => t.month);
    const hist = TREND.map((t) => (t.forecast ? null : t[metric]));
    const forecast = TREND.map((t, i) => {
      if (!t.forecast) {
        // connect forecast line to last history point
        const next = TREND[i + 1];
        return next?.forecast ? t[metric] : null;
      }
      return t[metric];
    });
    const name = metric === 'genCons' ? '发电煤耗(g/kWh)' : '输煤单耗(kWh/t)';
    return {
      color: ['#1677ff', '#fa8c16'],
      tooltip: { trigger: 'axis' },
      legend: { data: ['历史', '预测'], top: 0 },
      grid: { left: 48, right: 24, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: months,
        boundaryGap: false,
        axisLabel: { color: '#6b7280', fontSize: 11 },
        axisLine: { lineStyle: { color: '#d1d5db' } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        name,
        nameTextStyle: { color: '#6b7280', fontSize: 11 },
        splitLine: { lineStyle: { color: '#eef2f6' } },
        axisLabel: { color: '#6b7280' },
      },
      series: [
        {
          name: '历史',
          type: 'line',
          data: hist,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2 },
          areaStyle: { color: 'rgba(22,119,255,0.06)' },
        },
        {
          name: '预测',
          type: 'line',
          data: forecast,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: { width: 2, type: 'dashed' },
        },
      ],
    };
  }, [metric]);

  const heatColumns: ColumnsType<HeatLossRow> = [
    { title: '船号', dataIndex: 'ship', width: 110 },
    { title: '入厂批次', dataIndex: 'batchNo', width: 200, ellipsis: true },
    { title: '煤种', dataIndex: 'coalType', width: 110 },
    {
      title: '船运热值',
      dataIndex: 'voyageQ',
      width: 96,
      render: (v) => <span className="fea-num">{v}</span>,
    },
    {
      title: '入厂热值',
      dataIndex: 'inPlantQ',
      width: 96,
      render: (v) => <span className="fea-num">{v}</span>,
    },
    {
      title: '入炉热值',
      dataIndex: 'furnaceQ',
      width: 96,
      render: (v) => <span className="fea-num">{v}</span>,
    },
    {
      title: '途损',
      dataIndex: 'routeLoss',
      width: 80,
      render: (v, row) => (
        <span className="fea-num" style={{ color: row.routeLoss > 80 ? '#b91c1c' : undefined }}>
          {v}
        </span>
      ),
    },
    {
      title: '堆损',
      dataIndex: 'stackLoss',
      width: 80,
      render: (v, row) => (
        <span className="fea-num" style={{ color: row.stackLoss > 60 ? '#b91c1c' : undefined }}>
          {v}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'level',
      width: 80,
      render: (v: Level) => <Tag color={LEVEL_TAG[v].color}>{LEVEL_TAG[v].text}</Tag>,
    },
    {
      title: '操作',
      width: 80,
      render: (_v, row) => (
        <Button type="link" size="small" onClick={() => setDetail(row)}>
          明细
        </Button>
      ),
    },
  ];

  const unitColumns: ColumnsType<UnitConsRow> = [
    { title: '机组', dataIndex: 'unit', width: 100 },
    {
      title: '发电量(kWh)',
      dataIndex: 'genKwh',
      width: 130,
      render: (v) => <span className="fea-num">{Number(v).toLocaleString()}</span>,
    },
    {
      title: '入炉煤量(t)',
      dataIndex: 'furnaceTon',
      width: 110,
      render: (v) => <span className="fea-num">{Number(v).toLocaleString()}</span>,
    },
    {
      title: '入炉热值',
      dataIndex: 'qnet',
      width: 100,
      render: (v) => <span className="fea-num">{v}</span>,
    },
    {
      title: '发电煤耗(g/kWh)',
      dataIndex: 'consumption',
      width: 140,
      render: (v) => (
        <span className="fea-num fea-em">{Number(v).toFixed(1)}</span>
      ),
    },
    { title: '更新时间', dataIndex: 'updateTime', width: 150 },
  ];

  const teamColumns: ColumnsType<TeamRankRow> = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 70,
      render: (v) => (
        <span className={`fea-rank ${v <= 2 ? 'is-top' : ''}`}>{v}</span>
      ),
    },
    { title: '班组', dataIndex: 'team', width: 100 },
    { title: '班次', dataIndex: 'shift', width: 80 },
    {
      title: '输煤耗电(kWh)',
      dataIndex: 'powerKwh',
      width: 120,
      render: (v) => <span className="fea-num">{Number(v).toLocaleString()}</span>,
    },
    {
      title: '堆煤量(t)',
      dataIndex: 'stackTon',
      width: 100,
      render: (v) => <span className="fea-num">{Number(v).toLocaleString()}</span>,
    },
    {
      title: '上煤量(t)',
      dataIndex: 'loadTon',
      width: 100,
      render: (v) => <span className="fea-num">{Number(v).toLocaleString()}</span>,
    },
    {
      title: '输煤单耗(kWh/t)',
      dataIndex: 'rate',
      width: 130,
      render: (v) => <span className="fea-num fea-em">{Number(v).toFixed(2)}</span>,
    },
  ];

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <div className="fea-page">
        <header className="fea-hd">
          <div>
            <h1>全程能耗分析</h1>
            <p>
              热值途损/堆损 · 正平衡发电煤耗 · 班组输煤单耗评比 · 历史趋势与预测
            </p>
          </div>
          <Space wrap>
            <DatePicker
              picker="month"
              value={month}
              allowClear={false}
              onChange={(v) => v && setMonth(v)}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() =>
                message.success(`已按 ${month.format('YYYY年MM月')} 刷新能耗分析口径（原型）`)
              }
            >
              查询
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => message.info('已恢复默认示例数据')}
            >
              重置
            </Button>
          </Space>
        </header>

        {alarmCount > 0 && (
          <Alert
            className="fea-top-alert"
            type="warning"
            showIcon
            icon={<AlertOutlined />}
            message={`本月有 ${alarmCount} 条批次热值损耗超阈或偏高，请关注告警明细`}
          />
        )}

        <section className="fea-section">
          <div className="fea-kpi-grid">
            <div className="fea-kpi">
              <div className="fea-kpi-name">平均途损</div>
              <div className="fea-kpi-val">
                <span className="fea-num">{avgRoute}</span>
                <em>kcal/kg</em>
              </div>
              <div className="fea-kpi-sub">阈值 80 · 大数据纠偏波动 ±40</div>
            </div>
            <div className="fea-kpi">
              <div className="fea-kpi-name">平均堆损</div>
              <div className="fea-kpi-val">
                <span className="fea-num">{avgStack}</span>
                <em>kcal/kg</em>
              </div>
              <div className="fea-kpi-sub">阈值 60 · 超阈告警</div>
            </div>
            <div className="fea-kpi">
              <div className="fea-kpi-name">
                <FireOutlined /> 平均发电煤耗
              </div>
              <div className="fea-kpi-val">
                <span className="fea-num">{avgGen}</span>
                <em>g/kWh</em>
              </div>
              <div className="fea-kpi-sub">正平衡法 · 两机实时汇总</div>
            </div>
            <div className="fea-kpi">
              <div className="fea-kpi-name">
                <ThunderboltOutlined /> 最优输煤单耗
              </div>
              <div className="fea-kpi-val">
                <span className="fea-num">{bestTeam.rate.toFixed(2)}</span>
                <em>kWh/t</em>
              </div>
              <div className="fea-kpi-sub">
                {bestTeam.team} · {bestTeam.shift}
              </div>
            </div>
          </div>
        </section>

        <section className="fea-section">
          <div className="fea-section-title">热值途损 / 堆损分析</div>
          <p className="fea-desc">
            依据船运单煤质、入厂煤质、入炉煤质自动计算途损与堆损；损耗在化验误差容差带内不告警，超出范围标红提示。
          </p>
          <Table
            size="small"
            rowKey="key"
            columns={heatColumns}
            dataSource={HEAT_LOSS}
            pagination={false}
            scroll={{ x: 1100 }}
            rowClassName={(row) => (row.level === 'error' ? 'fea-row-alarm' : '')}
          />
        </section>

        <div className="fea-two-col">
          <section className="fea-section">
            <div className="fea-section-title">机组发电煤耗（正平衡）</div>
            <p className="fea-desc">
              标煤量 = 入炉煤量 × 入炉热值 / 7000；发电煤耗 = 标煤量 × 10⁶ / 发电量。
            </p>
            <Table
              size="small"
              rowKey="key"
              columns={unitColumns}
              dataSource={UNIT_CONS}
              pagination={false}
              scroll={{ x: 760 }}
            />
          </section>

          <section className="fea-section">
            <div className="fea-section-title">班组输煤单耗评比</div>
            <p className="fea-desc">
              输煤单耗 = 班次设备耗电 /（堆煤量 + 上煤量）；按单耗升序排名（越低越好）。
            </p>
            <Table
              size="small"
              rowKey="key"
              columns={teamColumns}
              dataSource={TEAM_RANK}
              pagination={false}
              scroll={{ x: 760 }}
            />
          </section>
        </div>

        <section className="fea-section">
          <div className="fea-section-hd">
            <div className="fea-section-title">历史趋势与预测</div>
            <Select
              size="small"
              style={{ width: 180 }}
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'genCons', label: '发电煤耗' },
                { value: 'transportRate', label: '输煤单耗' },
              ]}
            />
          </div>
          <p className="fea-desc">
            近 12 个月历史数据 + 未来 3 个月预测（虚线，原型外推模拟）；可用于能耗异常研判与班组对标。
          </p>
          <ChartPanel option={chartOption} />
        </section>

        <Drawer
          title={detail ? `热值损耗明细 · ${detail.ship}` : '热值损耗明细'}
          open={Boolean(detail)}
          onClose={() => setDetail(null)}
          width={460}
        >
          {detail && (
            <div className="fea-drawer">
              <div className="fea-drawer-item">
                <span className="k">批次</span>
                <span className="v">{detail.batchNo}</span>
              </div>
              <div className="fea-drawer-item">
                <span className="k">煤种</span>
                <span className="v">{detail.coalType}</span>
              </div>
              <div className="fea-chain">
                <div className="fea-chain-node">
                  <span className="lab">船运单</span>
                  <span className="val fea-num">{detail.voyageQ}</span>
                </div>
                <span className="fea-chain-arrow">→</span>
                <div className="fea-chain-node">
                  <span className="lab">入厂</span>
                  <span className="val fea-num">{detail.inPlantQ}</span>
                </div>
                <span className="fea-chain-arrow">→</span>
                <div className="fea-chain-node">
                  <span className="lab">入炉</span>
                  <span className="val fea-num">{detail.furnaceQ}</span>
                </div>
              </div>
              <div className="fea-drawer-item">
                <span className="k">途损</span>
                <span className="v fea-num">{detail.routeLoss} kcal/kg</span>
              </div>
              <div className="fea-drawer-item">
                <span className="k">堆损</span>
                <span className="v fea-num">{detail.stackLoss} kcal/kg</span>
              </div>
              <div className="fea-drawer-item">
                <span className="k">状态</span>
                <Tag color={LEVEL_TAG[detail.level].color}>{LEVEL_TAG[detail.level].text}</Tag>
              </div>
              <Alert type="info" showIcon message={detail.remark} />
            </div>
          )}
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default Component;
