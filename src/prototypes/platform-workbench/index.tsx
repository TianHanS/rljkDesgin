/**
 * @name 平台工作台首页
 * @mode axure
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /skills/axure-export-workflow/SKILL.md
 * - /rules/design-guide.md
 * - 《标段8：全厂燃煤智能管控及预警防护EPC总承包工程招标文件（第二卷 技术规范书）》4.4.1 节
 *
 * 说明：燃煤智能管控及预警防护平台的内嵌工作台首页，顶部系统菜单与外层框架由平台统一提供，本页不重复实现。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  ConfigProvider,
  DatePicker,
  Select,
  Segmented,
  Table,
  Tag,
  Modal,
  message,
} from 'antd';
import {
  AlertOutlined,
  ApartmentOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  ClusterOutlined,
  CrownFilled,
  ExperimentOutlined,
  FileTextOutlined,
  FireOutlined,
  FundOutlined,
  NodeIndexOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SettingOutlined,
  TrophyFilled,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import * as echarts from 'echarts';
import './style.css';

dayjs.locale('zh-cn');

const { RangePicker } = DatePicker;

/* ========================= 通用 ========================= */

const gotoModule = (name: string, path?: string) => {
  if (path) {
    window.location.href = path;
  } else {
    message.info(`「${name}」模块原型建设中，敬请期待`);
  }
};

function EChart({
  option,
  className = 'pwb-chart',
  refreshKey,
}: {
  option: echarts.EChartsOption;
  className?: string;
  refreshKey?: string | number;
}) {
  const domRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!domRef.current) return;
    const chart = echarts.init(domRef.current);
    chartRef.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    const timer = window.setTimeout(onResize, 80);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, [refreshKey]);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
    const timer = window.setTimeout(() => chartRef.current?.resize(), 80);
    return () => window.clearTimeout(timer);
  }, [option]);

  return <div ref={domRef} className={className} />;
}

/* ========================= Mock 数据 ========================= */

interface KpiItem {
  key: string;
  label: string;
  value: string;
  unit: string;
  delta?: { dir: 'up' | 'down' | 'flat'; text: string };
  note?: string;
  warning?: boolean;
}

/** 较昨日差值文案：正数增加、负数减少；差值为 0 时无方向箭头 */
const fmtDelta = (diff: number, unit: string, digits = 0): NonNullable<KpiItem['delta']> => {
  const num =
    digits === 0
      ? `${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString('en-US')}`
      : `${diff > 0 ? '+' : ''}${diff.toFixed(digits)}`;
  if (diff === 0) {
    return { dir: 'flat', text: `较昨日 ${num} ${unit}` };
  }
  return {
    dir: diff > 0 ? 'up' : 'down',
    text: `较昨日 ${num} ${unit}`,
  };
};

/**
 * 顶部 8 项核心指标（从左至右、从上至下）
 * 口径对齐班值报表 / coal_heap / 上煤单 / 卸煤·上煤单耗 / 发电成本 / 设备投运率
 */
const KPIS: KpiItem[] = [
  {
    key: 'in',
    label: '今日进煤量',
    value: '18,642',
    unit: 't',
    delta: fmtDelta(1206, 't'),
  },
  {
    key: 'out',
    label: '今日耗煤量',
    value: '21,358',
    unit: 't',
    delta: fmtDelta(-842, 't'),
  },
  {
    key: 'stock',
    label: '煤场总存煤量',
    value: '32.6',
    unit: '万t',
    // 主值万t；较昨日差值为 t（今日总量 − 昨日期末）
    delta: fmtDelta(-3000, 't'),
  },
  {
    key: 'days',
    label: '预估可用天数',
    value: '15.2',
    unit: '天',
    // 当前存煤 / 近三日上煤单日均耗煤
    note: '近三日日均耗煤测算',
  },
  {
    key: 'unloadRate',
    label: '今日卸煤单耗',
    value: '2.40',
    unit: 'kWh/t',
    delta: fmtDelta(0.12, 'kWh/t', 2),
  },
  {
    key: 'uploadRate',
    label: '今日上煤单耗',
    value: '1.95',
    unit: 'kWh/t',
    delta: fmtDelta(-0.05, 'kWh/t', 2),
  },
  {
    key: 'power',
    label: '今日发电量',
    value: '0.00',
    unit: 'GWh',
    // 信号点位未接入，后端写死默认返回 0；较昨日按同比时刻发电量差值（当前均为 0）
    delta: fmtDelta(0, 'GWh', 2),
  },
  {
    key: 'avail',
    label: '设备综合投用率',
    value: '98.6',
    unit: '%',
    delta: fmtDelta(0.4, '%', 1),
  },
];

type AlarmLevel = '紧急' | '重要' | '一般';
type AlarmSource = '输煤' | '煤场';

interface AlarmItem {
  id: string;
  level: AlarmLevel;
  type: string;
  location: string;
  value: string;
  time: string;
  source: AlarmSource;
  pending: boolean;
  device: string;
  area: string;
  alarmValue: string;
  threshold: string;
  startTime: string;
  endTime: string;
  unit: string;
}

const INIT_ALARMS: AlarmItem[] = [
  {
    id: 'A-01',
    level: '紧急',
    type: '明火煤',
    location: '煤场 C区 3号煤堆',
    value: '表温 168℃',
    time: '16:32',
    source: '煤场',
    pending: true,
    device: '煤场 C区 3号煤堆红外测温点',
    area: '煤场 C区',
    alarmValue: '168',
    threshold: '80℃',
    startTime: '2026-07-31 16:32:08',
    endTime: '',
    unit: '℃',
  },
  {
    id: 'A-02',
    level: '重要',
    type: '温度超限',
    location: 'C33B 皮带头部滚筒',
    value: '82.5℃',
    time: '16:18',
    source: '输煤',
    pending: true,
    device: 'C33B 皮带头部滚筒',
    area: 'C33B',
    alarmValue: '82.5',
    threshold: '70℃',
    startTime: '2026-07-31 16:18:22',
    endTime: '',
    unit: '℃',
  },
  {
    id: 'A-03',
    level: '重要',
    type: '粉尘浓度',
    location: '碎煤机室 2层',
    value: '9.8 mg/m³',
    time: '15:47',
    source: '输煤',
    pending: false,
    device: '碎煤机室 2层粉尘测点',
    area: '碎煤机室',
    alarmValue: '9.8',
    threshold: '8.0 mg/m³',
    startTime: '2026-07-31 15:47:05',
    endTime: '2026-07-31 15:58:41',
    unit: 'mg/m³',
  },
  {
    id: 'A-04',
    level: '一般',
    type: '可燃气体 CO',
    location: '2#斗轮机司机室',
    value: '16 ppm',
    time: '15:12',
    source: '煤场',
    pending: false,
    device: '2#斗轮机司机室 CO 探头',
    area: '2#斗轮机',
    alarmValue: '16',
    threshold: '24 ppm',
    startTime: '2026-07-31 15:12:19',
    endTime: '2026-07-31 15:20:03',
    unit: 'ppm',
  },
  {
    id: 'A-05',
    level: '一般',
    type: '挡煤墙温度',
    location: '煤场北侧挡煤墙 W2',
    value: '54℃',
    time: '14:26',
    source: '煤场',
    pending: false,
    device: '北侧挡煤墙 W2 测温点',
    area: '煤场北侧',
    alarmValue: '54',
    threshold: '60℃',
    startTime: '2026-07-31 14:26:44',
    endTime: '2026-07-31 14:40:12',
    unit: '℃',
  },
  {
    id: 'A-06',
    level: '一般',
    type: '皮带跑偏',
    location: 'C35A 运煤栈桥',
    value: '轻微跑偏',
    time: '13:58',
    source: '输煤',
    pending: false,
    device: 'C35A 运煤栈桥跑偏开关',
    area: 'C35A',
    alarmValue: '1',
    threshold: '---',
    startTime: '2026-07-31 13:58:31',
    endTime: '2026-07-31 14:05:18',
    unit: '',
  },
];

const LEVEL_COLOR: Record<AlarmLevel, string> = { 紧急: 'red', 重要: 'orange', 一般: 'blue' };
const DATA_STEP_OPTIONS = [
  { value: '5s', label: '5s' },
  { value: '30s', label: '30s' },
  { value: '1min', label: '1min' },
  { value: '5min', label: '5min' },
];

const buildAlarmSeries = (alarm: AlarmItem, start: Dayjs, end: Dayjs, step: string) => {
  const stepSec = step === '30s' ? 30 : step === '1min' ? 60 : step === '5min' ? 300 : 5;
  const span = Math.max(end.diff(start, 'second'), stepSec);
  const count = Math.min(Math.floor(span / stepSec) + 1, 120);
  const base = Number.parseFloat(alarm.alarmValue);
  const numeric = Number.isFinite(base) ? base : 1;
  const times: string[] = [];
  const values: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = start.add(i * stepSec, 'second');
    if (t.isAfter(end)) break;
    times.push(t.format('MM-DD HH:mm'));
    const wave = Math.sin(i / 9) * (numeric * 0.04) + (Math.random() - 0.5) * (numeric * 0.02);
    const active =
      t.isAfter(dayjs(alarm.startTime).subtract(1, 'minute')) &&
      (!alarm.endTime || t.isBefore(dayjs(alarm.endTime).add(1, 'minute')));
    values.push(Number((active ? numeric + wave : Math.max(0, numeric * 0.35 + wave)).toFixed(2)));
  }
  return { times, values };
};

const buildAlarmCurveOption = (
  alarm: AlarmItem,
  times: string[],
  values: number[],
): echarts.EChartsOption => ({
  title: {
    text: '报警关联曲线',
    left: 'center',
    top: 4,
    textStyle: { fontSize: 14, fontWeight: 600, color: '#1c2530' },
  },
  tooltip: { trigger: 'axis' },
  legend: {
    data: [alarm.type],
    top: 28,
    left: 12,
    textStyle: { fontSize: 12 },
    itemWidth: 12,
    itemHeight: 8,
  },
  grid: { left: 48, right: 24, top: 58, bottom: 56 },
  dataZoom: [{ type: 'slider', height: 18, bottom: 8, borderColor: '#e8ecf1', fillerColor: 'rgba(37,99,235,0.12)' }],
  xAxis: {
    type: 'category',
    data: times,
    boundaryGap: false,
    axisLabel: { fontSize: 11, color: '#7a8694' },
    axisLine: { lineStyle: { color: '#e8ecf1' } },
  },
  yAxis: {
    type: 'value',
    name: alarm.unit || undefined,
    nameTextStyle: { fontSize: 11, color: '#7a8694' },
    axisLabel: { fontSize: 11, color: '#7a8694' },
    splitLine: { lineStyle: { color: '#eef1f5' } },
  },
  series: [
    {
      name: alarm.type,
      type: 'line',
      data: values,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: '#2563eb' },
      itemStyle: { color: '#2563eb' },
      areaStyle: { color: 'rgba(37,99,235,0.08)' },
    },
  ],
});

/** 审批待办：数据口径对齐流程中心「我的总览 - 我的待办」，仅当前用户的待审批事项 */
const MY_PENDING_TOTAL = 36;

const APPROVALS = [
  { id: 'P-01', title: '超级管理员申请卸煤计划审批[20260519001]', node: '输煤专工审核', starter: '超级管理员', dept: '国信沙洲', time: '2026-05-19 11:11' },
  { id: 'P-02', title: '超级管理员申请港口卸煤计划审批[20260422003]', node: '输煤专工审核', starter: '超级管理员', dept: '国信沙洲', time: '2026-04-22 11:23' },
  { id: 'P-03', title: '超级管理员申请上煤计划审批[20260331002]', node: '输煤专工审批', starter: '超级管理员', dept: '国信沙洲', time: '2026-03-31 15:29' },
  { id: 'P-04', title: '超级管理员申请上煤计划审批[20260115005]', node: '灰硫专工', starter: '超级管理员', dept: '国信沙洲', time: '2026-01-15 11:11' },
  { id: 'P-05', title: '超级管理员申请上煤计划审批[20260310004]', node: '锅炉/灰硫专工审批', starter: '超级管理员', dept: '国信沙洲', time: '2026-03-10 15:05' },
  { id: 'P-06', title: '超级管理员申请汽车卸煤计划审批[20260115006]', node: '输煤专工审核', starter: '超级管理员', dept: '国信沙洲', time: '2026-01-15 14:40' },
];

const NODE_COLOR: Record<string, string> = {
  输煤专工审核: 'blue',
  输煤专工审批: 'blue',
  灰硫专工: 'gold',
  '锅炉/灰硫专工审批': 'purple',
  锅炉专工: 'cyan',
};

const COMPETITION_RANKS = [
  { rank: '第一名', name: '一值', score: 86.42, cls: 'r1', icon: <CrownFilled className="icon" /> },
  { rank: '第二名', name: '二值', score: 79.18, cls: 'r2', icon: <TrophyFilled className="icon" /> },
  { rank: '第三名', name: '三值', score: 75.66, cls: 'r3', icon: <TrophyFilled className="icon" /> },
  { rank: '第四名', name: '四值', score: 71.35, cls: 'r4', icon: <TrophyFilled className="icon" /> },
];

type DeviceChipTone = 'run' | 'standby' | 'fault';

interface DeviceStatusCounts {
  /** 入厂采样装置：In_Belt_Sample_On=1 */
  sampleRun: number;
  /** 入厂采样装置停止：In_Belt_Sample_On=0（需求原文误写为=1，按停止语义取 0） */
  sampleStop: number;
  /** 入厂段皮带运行：Unload_Belt_Run=1 */
  unloadRun: number;
  /** 入厂段皮带跳机：Unload_Belt=1 */
  unloadTrip: number;
  /** 上煤段皮带运行：load_Belt_Run=1 */
  loadRun: number;
  /** 上煤段皮带跳机：Load_Belt=1 */
  loadTrip: number;
  /** 煤场取料运行：Qu_Run=1 */
  quRun: number;
  /** 煤场堆料运行：Dui_Run=1 */
  duiRun: number;
}

const DEVICE_COUNTS_INIT: DeviceStatusCounts = {
  sampleRun: 2,
  sampleStop: 1,
  unloadRun: 8,
  unloadTrip: 0,
  loadRun: 6,
  loadTrip: 1,
  quRun: 1,
  duiRun: 1,
};

const buildDeviceRows = (c: DeviceStatusCounts) => [
  {
    name: '入厂采样装置',
    chips: [
      { label: `运行 ${c.sampleRun}`, tone: 'run' as DeviceChipTone },
      { label: `停止 ${c.sampleStop}`, tone: 'standby' as DeviceChipTone },
    ],
  },
  {
    name: '入厂段皮带',
    chips: [
      { label: `运行 ${c.unloadRun}`, tone: 'run' as DeviceChipTone },
      { label: `跳机 ${c.unloadTrip}`, tone: c.unloadTrip > 0 ? ('fault' as DeviceChipTone) : ('standby' as DeviceChipTone) },
    ],
  },
  {
    name: '上煤段皮带',
    chips: [
      { label: `运行 ${c.loadRun}`, tone: 'run' as DeviceChipTone },
      { label: `跳机 ${c.loadTrip}`, tone: c.loadTrip > 0 ? ('fault' as DeviceChipTone) : ('standby' as DeviceChipTone) },
    ],
  },
  {
    name: '煤场',
    chips: [
      { label: `取料运行 ${c.quRun}`, tone: 'run' as DeviceChipTone },
      { label: `堆料运行 ${c.duiRun}`, tone: 'run' as DeviceChipTone },
    ],
  },
];

/** 原型模拟：局部 10s 刷新时对测点计数做小幅抖动 */
const jitterDeviceCounts = (prev: DeviceStatusCounts): DeviceStatusCounts => {
  const wobble = (n: number, max: number) =>
    Math.max(0, Math.min(max, n + Math.round((Math.random() - 0.5) * 2)));
  return {
    sampleRun: wobble(prev.sampleRun, 4),
    sampleStop: wobble(prev.sampleStop, 4),
    unloadRun: wobble(prev.unloadRun, 16),
    unloadTrip: wobble(prev.unloadTrip, 3),
    loadRun: wobble(prev.loadRun, 14),
    loadTrip: wobble(prev.loadTrip, 3),
    quRun: wobble(prev.quRun, 2),
    duiRun: wobble(prev.duiRun, 2),
  };
};

const MODULES: { name: string; desc: string; icon: React.ReactNode; color: string; path?: string }[] = [
  { name: '输煤全流程动态展示', desc: '二维/三维煤场', icon: <ApartmentOutlined />, color: '#2563eb', path: '/prototypes/coal-handling-flow-monitor/' },
  { name: '燃运班值报表', desc: '班值运行数据', icon: <FileTextOutlined />, color: '#0e7490', path: '/prototypes/fuel-handling-shift-report/' },
  { name: '统计报表分析', desc: '小指标竞赛/报表', icon: <BarChartOutlined />, color: '#15803d', path: '/prototypes/team-duty-monthly-competition/' },
  { name: '智能调度', desc: '进煤/卸煤/上煤计划', icon: <ScheduleOutlined />, color: '#0d9488' },
  { name: '智能分析', desc: '计量/能耗/库存分析', icon: <FundOutlined />, color: '#4f46e5' },
  { name: '输煤安全监测', desc: '温度场/火灾预警', icon: <SafetyCertificateOutlined />, color: '#ea580c' },
  { name: '煤场安全监测', desc: '粉尘/气体/明火', icon: <AlertOutlined />, color: '#dc2626' },
  { name: '燃料特征码全程追踪', desc: '批次煤流转跟踪', icon: <NodeIndexOutlined />, color: '#7c3aed' },
  { name: '煤场智能管控一体化', desc: '斗轮机无人值守', icon: <ClusterOutlined />, color: '#0891b2' },
  { name: '入厂煤智能采制化', desc: '采样/制样/化验', icon: <ExperimentOutlined />, color: '#9333ea' },
  { name: '智能配煤掺烧', desc: '配煤方案优选', icon: <FireOutlined />, color: '#c2410c' },
  { name: '系统管理', desc: '用户/权限/字典', icon: <SettingOutlined />, color: '#64748b' },
];

/* ========================= 图表配置 ========================= */

const buildTrendOption = (): echarts.EChartsOption => {
  const days = Array.from({ length: 24 }, (_, i) => `${i + 1}日`);
  const coalIn = [1.7, 1.2, 0, 2.1, 1.8, 0, 1.5, 2.4, 1.1, 0, 1.9, 2.2, 1.6, 0, 1.3, 2.5, 1.8, 0, 2.0, 1.4, 1.7, 0, 2.3, 1.86];
  const coalOut = [2.1, 2.0, 2.2, 2.1, 2.3, 2.0, 1.9, 2.2, 2.1, 2.0, 2.3, 2.2, 2.1, 2.0, 2.2, 2.1, 2.3, 2.2, 2.0, 2.1, 2.2, 2.1, 2.3, 2.14];
  let stock = 34.8;
  const stocks = days.map((_, i) => {
    stock = +(stock + coalIn[i] - coalOut[i]).toFixed(1);
    return stock;
  });
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['进煤量', '耗煤量', '库存量'], top: 4, textStyle: { fontSize: 12 } },
    grid: { left: 44, right: 46, top: 36, bottom: 26 },
    xAxis: { type: 'category', data: days, axisLabel: { fontSize: 11, interval: 2 } },
    yAxis: [
      { type: 'value', name: '万t/日', nameTextStyle: { fontSize: 11 }, axisLabel: { fontSize: 11 } },
      { type: 'value', name: '库存 万t', nameTextStyle: { fontSize: 11 }, axisLabel: { fontSize: 11 }, splitLine: { show: false } },
    ],
    series: [
      { name: '进煤量', type: 'bar', data: coalIn, itemStyle: { color: '#93b8f2', borderRadius: [2, 2, 0, 0] }, barMaxWidth: 10 },
      { name: '耗煤量', type: 'bar', data: coalOut, itemStyle: { color: '#8fd3b5', borderRadius: [2, 2, 0, 0] }, barMaxWidth: 10 },
      { name: '库存量', type: 'line', yAxisIndex: 1, data: stocks, smooth: true, symbol: 'none', itemStyle: { color: '#e8a13a' }, lineStyle: { width: 2 } },
    ],
  };
};

/* ========================= 报警详情弹窗 ========================= */

const AlarmDetailModal: React.FC<{
  alarm: AlarmItem | null;
  open: boolean;
  onClose: () => void;
}> = ({ alarm, open, onClose }) => {
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [step, setStep] = useState('5s');
  const [viewMode, setViewMode] = useState<'图表' | '列表'>('图表');
  const [metrics, setMetrics] = useState<string[]>([]);
  const [queryTick, setQueryTick] = useState(0);

  useEffect(() => {
    if (!alarm || !open) return;
    const start = dayjs(alarm.startTime).subtract(5, 'minute');
    let end = alarm.endTime ? dayjs(alarm.endTime) : dayjs();
    if (!end.isAfter(start)) {
      end = dayjs(alarm.startTime).add(6, 'hour');
    }
    setRange([start, end]);
    setStep('5s');
    setViewMode('图表');
    setMetrics([alarm.type]);
    setQueryTick(0);
  }, [alarm, open]);

  const series = useMemo(() => {
    if (!alarm || !range) return { times: [] as string[], values: [] as number[] };
    return buildAlarmSeries(alarm, range[0], range[1], step);
  }, [alarm, range, step, queryTick]);

  const curveOption = useMemo(
    () => (alarm ? buildAlarmCurveOption(alarm, series.times, series.values) : {}),
    [alarm, series],
  );

  const tableData = useMemo(
    () =>
      series.times.map((t, i) => ({
        key: `${t}-${i}`,
        time: t,
        metric: alarm?.type ?? '',
        value: series.values[i],
        unit: alarm?.unit ?? '',
      })),
    [series, alarm],
  );

  if (!alarm) return null;

  const infoFields = [
    { label: '报警名称', value: alarm.type },
    { label: '报警值', value: alarm.alarmValue },
    { label: '报警阈值', value: alarm.threshold || '---' },
    {
      label: '报警等级',
      value: (
        <Tag color={LEVEL_COLOR[alarm.level]} style={{ marginInlineEnd: 0 }}>
          {alarm.level}
        </Tag>
      ),
    },
    { label: '报警设备', value: alarm.device },
    { label: '设备所在区域', value: alarm.area },
    { label: '发生时间', value: alarm.startTime },
    { label: '结束时间', value: alarm.endTime || '—' },
  ];

  return (
    <Modal
      title="报警详情"
      open={open}
      onCancel={onClose}
      width={960}
      destroyOnHidden
      className="pwb-alarm-modal"
      footer={
        <div className="pwb-alarm-modal-footer">
          <Button type="primary" onClick={onClose}>
            关闭
          </Button>
        </div>
      }
    >
      <div className="pwb-alarm-detail">
        <div className="pwb-alarm-block">
          <div className="pwb-alarm-block-title">基本信息</div>
          <div className="pwb-alarm-info-grid">
            {infoFields.map((f) => (
              <div key={f.label} className="pwb-alarm-info-item">
                <div className="pwb-alarm-info-label">{f.label}</div>
                <div className="pwb-alarm-info-value">{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pwb-alarm-block">
          <div className="pwb-alarm-block-title">相关监测量</div>
          <div className="pwb-alarm-toolbar">
            <div className="pwb-alarm-toolbar-left">
              <span className="pwb-alarm-field-label">时间范围</span>
              <RangePicker
                showTime
                value={range}
                onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
                format="YYYY-MM-DD HH:mm:ss"
                allowClear={false}
                style={{ width: 340 }}
              />
              <span className="pwb-alarm-field-label">数据步长</span>
              <Select
                value={step}
                options={DATA_STEP_OPTIONS}
                onChange={setStep}
                style={{ width: 88 }}
              />
              <Button
                type="primary"
                onClick={() => {
                  setQueryTick((n) => n + 1);
                  message.success('已按条件刷新监测量');
                }}
              >
                查询
              </Button>
            </div>
            <Segmented
              value={viewMode}
              options={['图表', '列表']}
              onChange={(v) => setViewMode(v as '图表' | '列表')}
            />
          </div>

          <div className="pwb-alarm-metric-row">
            <span className="pwb-alarm-field-label">选择对比指标</span>
            <Select
              mode="multiple"
              value={metrics}
              onChange={setMetrics}
              options={[{ value: alarm.type, label: alarm.type }]}
              style={{ flex: 1 }}
              maxTagCount="responsive"
              placeholder="选择对比指标"
            />
          </div>

          {viewMode === '图表' ? (
            <EChart option={curveOption} className="pwb-alarm-chart" refreshKey={alarm.id} />
          ) : (
            <Table
              size="small"
              pagination={{ pageSize: 8, size: 'small' }}
              dataSource={tableData}
              columns={[
                { title: '时间', dataIndex: 'time', width: 160 },
                { title: '指标', dataIndex: 'metric', width: 140 },
                {
                  title: '数值',
                  dataIndex: 'value',
                  render: (v: number, row: { unit: string }) => `${v}${row.unit ? ` ${row.unit}` : ''}`,
                },
              ]}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

/* ========================= 页面 ========================= */

const Component: React.FC = () => {
  const now = dayjs();
  const greeting = now.hour() < 12 ? '上午好' : now.hour() < 18 ? '下午好' : '晚上好';

  const [detailAlarm, setDetailAlarm] = useState<AlarmItem | null>(null);
  const [deviceCounts, setDeviceCounts] = useState<DeviceStatusCounts>(DEVICE_COUNTS_INIT);
  const alarms = INIT_ALARMS;
  const kpis = KPIS;
  const deviceRows = useMemo(() => buildDeviceRows(deviceCounts), [deviceCounts]);

  useEffect(() => {
    const timer = setInterval(() => {
      setDeviceCounts((prev) => jitterDeviceCounts(prev));
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  const pendingCoalHandling = alarms.filter((a) => a.source === '输煤' && a.pending).length;
  const pendingCoalYard = alarms.filter((a) => a.source === '煤场' && a.pending).length;
  const totalCoalHandling = alarms.filter((a) => a.source === '输煤').length;
  const totalCoalYard = alarms.filter((a) => a.source === '煤场').length;

  const sortedAlarms = useMemo(
    () => [...alarms].sort((x, y) => Number(y.pending) - Number(x.pending) || y.time.localeCompare(x.time)),
    [alarms],
  );

  const trendOption = useMemo(buildTrendOption, []);

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
      <div className="pwb-root">
        {/* 欢迎条（无卡片框，轻量） */}
        <div className="pwb-welcome">
          <div className="pwb-welcome-left">
            <span className="pwb-welcome-hi">{greeting}，王值长</span>
            <span className="pwb-welcome-sub">燃煤智能管控及预警防护平台</span>
          </div>
          <div className="pwb-welcome-right">
            <span>{now.format('YYYY年M月D日 dddd')}</span>
            <span className="pwb-welcome-divider" />
            <span>
              当前值别 <span className="pwb-shift">丙值 · 白班 08:00-18:00</span>
            </span>
          </div>
        </div>

        {/* 核心指标（左，整块面板） + 功能模块（右） */}
        <div className="pwb-top-grid">
          <div className="pwb-card pwb-kpi-panel">
            <div className="pwb-kpi-grid">
              {kpis.map((k) => (
                <div key={k.key} className={`pwb-kpi${k.warning ? ' is-warning' : ''}`}>
                  <div className="pwb-kpi-label">{k.label}</div>
                  <div className="pwb-kpi-value">
                    {k.value}
                    <small>{k.unit}</small>
                  </div>
                  {k.delta ? (
                    <div className="pwb-kpi-delta">
                      {k.delta.dir !== 'flat' && (
                        <span className={k.delta.dir === 'up' ? 'up' : 'down'}>
                          {k.delta.dir === 'up' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        </span>
                      )}
                      {k.delta.text}
                    </div>
                  ) : (
                    <div className="pwb-kpi-delta">{k.note ?? '—'}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="pwb-card pwb-nav-panel">
            <div className="pwb-nav-grid">
              {MODULES.map((m) => (
                <div
                  key={m.name}
                  className={`pwb-nav-card${m.path ? ' is-live' : ''}`}
                  title={`${m.name}（${m.desc}）`}
                  onClick={() => gotoModule(m.name, m.path)}
                >
                  <div className="pwb-nav-card-top">
                    <span className="pwb-nav-icon" style={{ color: m.color, background: `${m.color}14` }}>
                      {m.icon}
                    </span>
                    {m.path ? (
                      <span className="pwb-nav-go">
                        进入 <RightOutlined />
                      </span>
                    ) : (
                      <span className="pwb-nav-soon">建设中</span>
                    )}
                  </div>
                  <span className="pwb-nav-name">{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 主体：安全预警中心 + 待办 */}
        <div className="pwb-main-grid">
          <div className="pwb-card">
            <div className="pwb-section-hd">
              <div className="pwb-section-title">安全预警中心</div>
              <span className="pwb-section-extra">输煤安全监测 / 煤场安全监测</span>
            </div>

            <div className="pwb-safety-cards">
              <div
                className="pwb-safety-card tone-danger"
                onClick={() => gotoModule('输煤安全监测')}
              >
                <div className="pwb-safety-card-label">
                  输煤待处理报警 <RightOutlined />
                </div>
                <div className="pwb-safety-card-value">
                  {pendingCoalHandling}
                  <small>条</small>
                </div>
                <div className="pwb-safety-card-foot">今日累计 {totalCoalHandling} 条</div>
              </div>
              <div
                className="pwb-safety-card tone-warning"
                onClick={() => gotoModule('煤场安全监测')}
              >
                <div className="pwb-safety-card-label">
                  煤场待处理报警 <RightOutlined />
                </div>
                <div className="pwb-safety-card-value">
                  {pendingCoalYard}
                  <small>条</small>
                </div>
                <div className="pwb-safety-card-foot">今日累计 {totalCoalYard} 条</div>
              </div>
              <div
                className="pwb-safety-card tone-primary"
                onClick={() => gotoModule('设备实时监测', '/prototypes/device-realtime-monitor/')}
              >
                <div className="pwb-safety-card-label">
                  设备接入总量 <RightOutlined />
                </div>
                <div className="pwb-safety-card-value">
                  486
                  <small>台/测点</small>
                </div>
                <div className="pwb-safety-card-foot">覆盖输煤、煤场全部监测区域</div>
              </div>
            </div>

            <div className="pwb-alarm-list">
              {sortedAlarms.map((a) => (
                <div
                  key={a.id}
                  className={`pwb-alarm-item is-clickable${a.pending ? ' is-pending' : ''}`}
                  onClick={() => setDetailAlarm(a)}
                >
                  <Tag color={LEVEL_COLOR[a.level]} style={{ marginInlineEnd: 0 }}>
                    {a.level}
                  </Tag>
                  <span className="pwb-alarm-type">{a.type}</span>
                  <span className="pwb-alarm-loc">{a.location}</span>
                  <span className="pwb-alarm-val">{a.value}</span>
                  <span className="pwb-alarm-time">{a.time}</span>
                  {a.pending ? (
                    <Tag color="error" style={{ marginInlineEnd: 0 }}>
                      报警中
                    </Tag>
                  ) : (
                    <Tag style={{ marginInlineEnd: 0 }}>已解除</Tag>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pwb-card">
            <div className="pwb-section-hd">
              <div className="pwb-section-title">
                审批待办
                <Badge count={MY_PENDING_TOTAL} size="small" style={{ marginLeft: 2 }} />
              </div>
              <Button type="link" size="small" onClick={() => message.info('跳转流程中心「我的待办」列表（原型模拟）')}>
                查看全部 <RightOutlined />
              </Button>
            </div>
            <div className="pwb-todo-list">
              {APPROVALS.map((t) => (
                <div key={t.id} className="pwb-todo-item">
                  <div className="pwb-todo-body">
                    <div className="pwb-todo-text" title={t.title}>
                      {t.title}
                    </div>
                    <div className="pwb-todo-meta">
                      <Tag color={NODE_COLOR[t.node] ?? 'blue'} style={{ marginInlineEnd: 0 }}>
                        {t.node}
                      </Tag>
                      <span className="pwb-todo-time">
                        {t.starter} · {t.dept} · {t.time}
                      </span>
                    </div>
                  </div>
                  <Button size="small" type="primary" ghost onClick={() => message.info('打开该业务单审批页办理（原型模拟）')}>
                    办理
                  </Button>
                </div>
              ))}
            </div>
            <div className="pwb-todo-foot">仅展示本人待办的审批事项，共 {MY_PENDING_TOTAL} 条，此处展示最近 6 条</div>
          </div>
        </div>

        {/* 数据趋势与分析摘要 */}
        <div className="pwb-trend-grid">
          <div className="pwb-card">
            <div className="pwb-section-hd">
              <div className="pwb-section-title">本月进耗存趋势</div>
              <span className="pwb-section-extra">进耗存统计报表 · 7月</span>
            </div>
            <div style={{ padding: '8px 8px 4px' }}>
              <EChart option={trendOption} />
            </div>
          </div>

          <div className="pwb-card">
            <div className="pwb-section-hd">
              <div className="pwb-section-title">主要设备状态</div>
              <div className="pwb-device-hd-actions">
                <span className="pwb-section-extra">局部 10s 刷新</span>
                <Button
                  type="link"
                  size="small"
                  onClick={() => gotoModule('输煤全流程动态展示', '/prototypes/coal-handling-flow-monitor/')}
                >
                  进入全流程展示 <RightOutlined />
                </Button>
              </div>
            </div>
            <div className="pwb-device-body">
              {deviceRows.map((row) => (
                <div key={row.name} className="pwb-device-row">
                  <span className="name">{row.name}</span>
                  <div className="pwb-device-chips">
                    {row.chips.map((c) => (
                      <span key={c.label} className={`pwb-chip ${c.tone}`}>
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pwb-card">
            <div className="pwb-section-hd">
              <div className="pwb-section-title">本月小指标竞赛</div>
              <Button
                type="link"
                size="small"
                onClick={() => gotoModule('班值月度竞赛统计', '/prototypes/team-duty-monthly-competition/')}
              >
                查看完整排名 <RightOutlined />
              </Button>
            </div>
            <div className="pwb-rank-list">
              {COMPETITION_RANKS.map((r) => (
                <div
                  key={r.name}
                  className={`pwb-rank-item ${r.cls}`}
                  onClick={() => gotoModule('班值月度竞赛统计', '/prototypes/team-duty-monthly-competition/')}
                >
                  {r.icon}
                  <span className="name">{r.name}</span>
                  <span className="rank-text">{r.rank}</span>
                  <span className="score">{r.score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AlarmDetailModal
          alarm={detailAlarm}
          open={!!detailAlarm}
          onClose={() => setDetailAlarm(null)}
        />
      </div>
    </ConfigProvider>
  );
};

export default Component;
