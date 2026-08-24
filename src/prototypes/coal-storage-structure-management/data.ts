/**
 * 煤场存煤结构管理 · 领域数据与配色体系
 *
 * 配色规则（用于化解「同批次同色」与「同煤质同色」两条要求的冲突）：
 *   色族 = 煤种（同煤质燃煤落在同一色族）
 *   色阶 = 批次（同批次燃煤取同一色阶）
 * 未识别批次的煤层脱离色族，使用火警橙 + 斜纹，兼顾色盲可辨识。
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /src/themes/antd-new/DESIGN-SPEC.md
 * - 用户提供的存煤结构管理业务描述
 */

import type { ZoneGeometry } from './geometry';

/* ============================ 煤种与煤质 ============================ */

export interface CoalQuality {
  /** 收到基低位发热量 kcal/kg */
  cv: number;
  /** 全硫 St,d % */
  sulfur: number;
  /** 灰分 Ad % */
  ash: number;
  /** 挥发分 Vdaf % */
  volatile: number;
  /** 全水分 Mt % */
  moisture: number;
}

export interface CoalTypeMeta {
  name: string;
  /** 色族：由深到浅的四阶工业色 */
  family: string[];
  quality: CoalQuality;
}

export const COAL_TYPES: Record<string, CoalTypeMeta> = {
  shenhun1: {
    name: '神混 1 号',
    family: ['#2f4f6f', '#3d6488', '#5580a6', '#7ba0bf'],
    quality: { cv: 5100, sulfur: 0.42, ash: 12.5, volatile: 30.2, moisture: 13.8 },
  },
  zhungeer: {
    name: '准格尔煤',
    family: ['#8a5a20', '#a8722e', '#c08f47', '#d4ac72'],
    quality: { cv: 4980, sulfur: 0.55, ash: 18.4, volatile: 27.6, moisture: 12.3 },
  },
  indoLignite: {
    name: '印尼褐煤',
    family: ['#6d3a2b', '#8a4c38', '#a76350', '#c1836f'],
    quality: { cv: 3980, sulfur: 0.18, ash: 6.2, volatile: 42.5, moisture: 28.6 },
  },
  russian: {
    name: '俄罗斯煤',
    family: ['#1f5a5a', '#2c7676', '#43918f', '#68aca9'],
    quality: { cv: 5480, sulfur: 0.35, ash: 10.8, volatile: 32.1, moisture: 10.2 },
  },
  mongolian: {
    name: '蒙煤',
    family: ['#4a4266', '#5f5583', '#7a6f9d', '#9a90b6'],
    quality: { cv: 5250, sulfur: 0.68, ash: 14.2, volatile: 25.8, moisture: 9.5 },
  },
};

/** 未识别批次的异常色（火警橙） */
export const UNMARKED_COLOR = '#e8590c';

/* ============================ 接卸批次台账 ============================ */

export interface ArrivalBatch {
  batchNo: string;
  shipName: string;
  voyage: string;
  coalType: string;
  /** 卸煤煤量 t */
  unloadedMass: number;
  /** 卸煤完成日期 */
  unloadedAt: string;
  /** 卸入煤场 */
  yardId: string;
  /** 色阶序号（同煤种内区分批次） */
  tint: number;
}

export const ARRIVAL_BATCHES: ArrivalBatch[] = [
  {
    batchNo: 'SH2606-08',
    shipName: '神华壹号',
    voyage: 'V2606',
    coalType: 'shenhun1',
    unloadedMass: 28900,
    unloadedAt: '2026-06-14',
    yardId: 'Y1',
    tint: 0,
  },
  {
    batchNo: 'IDN2606-15',
    shipName: 'SAMUDRA JAYA',
    voyage: 'V115',
    coalType: 'indoLignite',
    unloadedMass: 30600,
    unloadedAt: '2026-06-30',
    yardId: 'Y1',
    tint: 0,
  },
  {
    batchNo: 'JZ2607-03',
    shipName: '准能海运',
    voyage: 'V0703',
    coalType: 'zhungeer',
    unloadedMass: 39100,
    unloadedAt: '2026-07-11',
    yardId: 'Y1',
    tint: 0,
  },
  {
    batchNo: 'RUS2607-11',
    shipName: 'KAPITAN NAZAROV',
    voyage: 'V208',
    coalType: 'russian',
    unloadedMass: 26800,
    unloadedAt: '2026-07-26',
    yardId: 'Y1',
    tint: 0,
  },
  {
    batchNo: 'MG2608-02',
    shipName: '蒙运陆运（汽运）',
    voyage: '—',
    coalType: 'mongolian',
    unloadedMass: 29700,
    unloadedAt: '2026-08-06',
    yardId: 'Y1',
    tint: 0,
  },
  {
    batchNo: 'SH2608-19',
    shipName: '神华叁号',
    voyage: 'V2619',
    coalType: 'shenhun1',
    unloadedMass: 8420,
    unloadedAt: '2026-08-19',
    yardId: 'Y1',
    tint: 1,
  },
  {
    batchNo: 'IDN2608-24',
    shipName: 'SAMUDRA BARU',
    voyage: 'V121',
    coalType: 'indoLignite',
    unloadedMass: 1180,
    unloadedAt: '2026-08-20',
    yardId: 'Y2',
    tint: 1,
  },
];

/** 本次盘煤周期（周期内接卸批次参与新增煤层的批次匹配） */
export const SURVEY_PERIOD = { from: '2026-08-11', to: '2026-08-20' };

/** 自动识别批次时允许的堆积密度区间 t/m³ */
export const DENSITY_RANGE = { min: 0.78, max: 0.95 };

/** 平台配置的默认燃煤堆积密度 t/m³ */
export const DEFAULT_DENSITY = 0.85;

/* ============================ 煤场 / 分区 / 煤层 ============================ */

export type LayerStatus = 'marked' | 'unmarked';

export interface CoalLayer {
  id: string;
  /** 批次号，未识别时为空 */
  batchNo: string;
  shipName: string;
  voyage: string;
  /** 煤种 key，未识别时为空 */
  coalType: string;
  quality: CoalQuality | null;
  /** 层体积 m³ */
  volume: number;
  /** 堆积密度 t/m³ */
  density: number;
  status: LayerStatus;
  /** 堆煤日期 */
  stackedAt: string;
  /** 色阶序号 */
  tint: number;
  /** 是否人工调整过 */
  adjusted?: boolean;
}

export interface CoalZone {
  id: string;
  yardId: string;
  /** 分区序号，界面按此从小到大自左向右排列 */
  code: number;
  name: string;
  geometry: ZoneGeometry;
  /** 上次盘煤体积 m³ */
  lastSurveyVolume: number;
  /** 本次盘煤体积 m³（作为存煤煤量上限） */
  surveyVolume: number;
  /** 自下而上的煤层序列 */
  layers: CoalLayer[];
}

export interface CoalYard {
  id: string;
  name: string;
  shortName: string;
  /** 厂内煤场具备激光盘煤数据源，厂外中转煤场无盘煤，需手动维护 */
  hasSurvey: boolean;
  lastSurveyAt: string;
  density: number;
}

export const YARDS: CoalYard[] = [
  {
    id: 'Y1',
    name: '#1 煤场（封闭条形煤场）',
    shortName: '#1 煤场',
    hasSurvey: true,
    lastSurveyAt: '2026-08-10 06:30',
    density: DEFAULT_DENSITY,
  },
  {
    id: 'Y2',
    name: '#2 煤场（封闭条形煤场）',
    shortName: '#2 煤场',
    hasSurvey: true,
    lastSurveyAt: '2026-08-10 07:10',
    density: DEFAULT_DENSITY,
  },
  {
    id: 'Y3',
    name: '厂外中转煤场（无盘煤数据源）',
    shortName: '厂外中转煤场',
    hasSurvey: false,
    lastSurveyAt: '—',
    density: 0.82,
  },
];

const baseGeometry = (runLength: number): ZoneGeometry => ({
  runLength,
  baseWidth: 52,
  reposeAngle: 38,
  wallHeight: 19,
  maxStackHeight: 18,
  pivotHeight: 8.2,
  armReach: 26,
});

/** [批次号 | null（未识别）, 体积 m³, 堆煤日期] */
type LayerSeed = [string | null, number, string];

interface ZoneSeed {
  yardId: string;
  code: number;
  runLength: number;
  layers: LayerSeed[];
}

const ZONE_SEEDS: ZoneSeed[] = [
  {
    yardId: 'Y1',
    code: 1,
    runLength: 72,
    layers: [
      ['SH2606-08', 12400, '2026-06-14'],
      ['JZ2607-03', 9800, '2026-07-11'],
      ['MG2608-02', 6200, '2026-08-06'],
    ],
  },
  {
    yardId: 'Y1',
    code: 2,
    runLength: 72,
    layers: [
      ['IDN2606-15', 15600, '2026-06-30'],
      ['RUS2607-11', 8400, '2026-07-26'],
    ],
  },
  {
    yardId: 'Y1',
    code: 3,
    runLength: 68,
    layers: [
      ['SH2606-08', 10200, '2026-06-15'],
      ['JZ2607-03', 7600, '2026-07-12'],
    ],
  },
  {
    yardId: 'Y1',
    code: 4,
    runLength: 64,
    layers: [
      ['RUS2607-11', 13200, '2026-07-26'],
      [null, 3400, '2026-07-28'],
    ],
  },
  {
    yardId: 'Y1',
    code: 5,
    runLength: 76,
    layers: [
      ['IDN2606-15', 18200, '2026-06-30'],
      ['MG2608-02', 7400, '2026-08-07'],
    ],
  },
  {
    yardId: 'Y1',
    code: 6,
    runLength: 76,
    layers: [
      ['JZ2607-03', 21400, '2026-07-11'],
      ['SH2606-08', 9600, '2026-06-16'],
      ['RUS2607-11', 5200, '2026-07-27'],
    ],
  },
  { yardId: 'Y1', code: 7, runLength: 60, layers: [['MG2608-02', 8600, '2026-08-06']] },
  { yardId: 'Y1', code: 8, runLength: 60, layers: [] },
  {
    yardId: 'Y2',
    code: 1,
    runLength: 58,
    layers: [
      ['SH2606-08', 9200, '2026-06-15'],
      ['RUS2607-11', 4800, '2026-07-27'],
    ],
  },
  { yardId: 'Y2', code: 2, runLength: 58, layers: [['IDN2606-15', 11600, '2026-07-01']] },
  {
    yardId: 'Y2',
    code: 3,
    runLength: 54,
    layers: [
      ['JZ2607-03', 7800, '2026-07-12'],
      [null, 2100, '2026-08-02'],
    ],
  },
  {
    yardId: 'Y2',
    code: 4,
    runLength: 54,
    layers: [
      ['MG2608-02', 12800, '2026-08-07'],
      ['SH2606-08', 3600, '2026-06-16'],
    ],
  },
  { yardId: 'Y2', code: 5, runLength: 50, layers: [] },
  { yardId: 'Y3', code: 1, runLength: 45, layers: [['IDN2606-15', 6200, '2026-07-02']] },
  { yardId: 'Y3', code: 2, runLength: 45, layers: [['JZ2607-03', 3400, '2026-07-13']] },
];

/** 本次盘煤相对上次的体积变动 m³（用于盘煤比对向导预填） */
export const SURVEY_DELTAS: Record<string, number> = {
  'Y1-1': 3200,
  'Y1-2': -1800,
  'Y1-3': 4100,
  'Y1-5': 2600,
  'Y1-6': -5200,
  'Y2-1': 1500,
  'Y2-4': -2400,
  'Y2-5': 900,
};

let layerSeq = 0;
export const nextLayerId = () => {
  layerSeq += 1;
  return `L${String(layerSeq).padStart(4, '0')}`;
};

let recordSeq = 1000;
export const nextRecordId = (prefix: string) => {
  recordSeq += 1;
  return `${prefix}${recordSeq}`;
};

export const findBatch = (batchNo: string) =>
  ARRIVAL_BATCHES.find((b) => b.batchNo === batchNo);

export const buildLayer = (seed: LayerSeed, density: number): CoalLayer => {
  const [batchNo, volume, stackedAt] = seed;
  if (!batchNo) {
    return {
      id: nextLayerId(),
      batchNo: '',
      shipName: '',
      voyage: '',
      coalType: '',
      quality: null,
      volume,
      density,
      status: 'unmarked',
      stackedAt,
      tint: 0,
    };
  }
  const batch = findBatch(batchNo)!;
  return {
    id: nextLayerId(),
    batchNo,
    shipName: batch.shipName,
    voyage: batch.voyage,
    coalType: batch.coalType,
    quality: COAL_TYPES[batch.coalType].quality,
    volume,
    density,
    status: 'marked',
    stackedAt,
    tint: batch.tint,
  };
};

export const createZones = (): CoalZone[] =>
  ZONE_SEEDS.map((seed) => {
    const yard = YARDS.find((y) => y.id === seed.yardId)!;
    const layers = seed.layers.map((l) => buildLayer(l, yard.density));
    const total = layers.reduce((sum, l) => sum + l.volume, 0);
    return {
      id: `${seed.yardId}-${seed.code}`,
      yardId: seed.yardId,
      code: seed.code,
      name: `${seed.code} 区`,
      geometry: baseGeometry(seed.runLength),
      lastSurveyVolume: total,
      surveyVolume: total,
      layers,
    };
  });

/* ============================ 台账记录 ============================ */

export type MoveType = 'in' | 'out' | 'adjust';
export type MoveSource = 'survey-auto' | 'manual' | 'mark';

export interface StockMove {
  id: string;
  time: string;
  type: MoveType;
  yardId: string;
  zoneName: string;
  batchNo: string;
  coalTypeName: string;
  volume: number;
  mass: number;
  source: MoveSource;
  note: string;
}

export interface AuditLog {
  id: string;
  time: string;
  operator: string;
  target: string;
  action: string;
  before: string;
  after: string;
}

export const INITIAL_MOVES: StockMove[] = [
  {
    id: 'M0001',
    time: '2026-08-10 07:40',
    type: 'in',
    yardId: 'Y1',
    zoneName: '1 区',
    batchNo: 'MG2608-02',
    coalTypeName: '蒙煤',
    volume: 6200,
    mass: 5270,
    source: 'survey-auto',
    note: '盘煤体积增加，按周期内接卸批次自动识别',
  },
  {
    id: 'M0002',
    time: '2026-08-10 07:40',
    type: 'out',
    yardId: 'Y1',
    zoneName: '3 区',
    batchNo: 'JZ2607-03',
    coalTypeName: '准格尔煤',
    volume: 2400,
    mass: 2040,
    source: 'survey-auto',
    note: '盘煤体积减少，自上而下扣减顶层批次',
  },
  {
    id: 'M0003',
    time: '2026-07-28 08:05',
    type: 'in',
    yardId: 'Y1',
    zoneName: '4 区',
    batchNo: '',
    coalTypeName: '待标记',
    volume: 3400,
    mass: 2890,
    source: 'survey-auto',
    note: '匹配密度超出合理区间，生成待标记煤层',
  },
  {
    id: 'M0004',
    time: '2026-08-02 08:20',
    type: 'in',
    yardId: 'Y2',
    zoneName: '3 区',
    batchNo: '',
    coalTypeName: '待标记',
    volume: 2100,
    mass: 1785,
    source: 'survey-auto',
    note: '周期内无可匹配接卸批次，生成待标记煤层',
  },
];

export const INITIAL_AUDIT: AuditLog[] = [
  {
    id: 'A0001',
    time: '2026-08-10 08:12',
    operator: '田略（燃料专责）',
    target: '#1 煤场 · 6 区 · 第 3 层',
    action: '标记存煤批次',
    before: '待标记',
    after: 'RUS2607-11 / 俄罗斯煤',
  },
  {
    id: 'A0002',
    time: '2026-08-09 15:48',
    operator: '王值长（集控值长）',
    target: '#2 煤场 · 4 区 · 第 2 层',
    action: '调整煤量',
    before: '2 860 t',
    after: '3 060 t',
  },
];

export interface OuterLedgerEntry {
  id: string;
  time: string;
  type: 'in' | 'out' | 'adjust';
  zoneName: string;
  batchNo: string;
  coalTypeName: string;
  mass: number;
  operator: string;
  note: string;
}

export const INITIAL_OUTER_LEDGER: OuterLedgerEntry[] = [
  {
    id: 'O0001',
    time: '2026-07-02 09:20',
    type: 'in',
    zoneName: '1 区',
    batchNo: 'IDN2606-15',
    coalTypeName: '印尼褐煤',
    mass: 5084,
    operator: '刘燃料（厂外煤场）',
    note: '汽运转堆入库',
  },
  {
    id: 'O0002',
    time: '2026-07-13 14:05',
    type: 'in',
    zoneName: '2 区',
    batchNo: 'JZ2607-03',
    coalTypeName: '准格尔煤',
    mass: 2788,
    operator: '刘燃料（厂外煤场）',
    note: '汽运转堆入库',
  },
  {
    id: 'O0003',
    time: '2026-08-08 10:32',
    type: 'out',
    zoneName: '1 区',
    batchNo: 'IDN2606-15',
    coalTypeName: '印尼褐煤',
    mass: 1200,
    operator: '刘燃料（厂外煤场）',
    note: '倒运至厂内 #1 煤场 5 区',
  },
];

/* ============================ 展示字段与配色 ============================ */

export interface LabelField {
  key: string;
  label: string;
  unit?: string;
}

export const LABEL_FIELDS: LabelField[] = [
  { key: 'batchNo', label: '批次' },
  { key: 'shipName', label: '船名' },
  { key: 'voyage', label: '航次' },
  { key: 'coalType', label: '煤种' },
  { key: 'cv', label: '热值', unit: 'kcal/kg' },
  { key: 'sulfur', label: '硫分', unit: '%' },
  { key: 'ash', label: '灰分', unit: '%' },
  { key: 'volatile', label: '挥发分', unit: '%' },
  { key: 'moisture', label: '水分', unit: '%' },
  { key: 'volume', label: '体积', unit: 'm³' },
  { key: 'mass', label: '煤量', unit: 't' },
];

/** 煤层取色：色族取自煤种，色阶取自批次 */
export const layerColor = (layer: CoalLayer) => {
  if (layer.status === 'unmarked' || !layer.coalType) return UNMARKED_COLOR;
  const family = COAL_TYPES[layer.coalType]?.family;
  if (!family) return UNMARKED_COLOR;
  return family[Math.min(layer.tint, family.length - 1)];
};

/** 依据背景亮度选择前景色，保证 WCAG AA 对比度 */
export const readableText = (hex: string) => {
  const v = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return lum > 0.42 ? '#1b1815' : '#ffffff';
};

export const coalTypeName = (key: string) => COAL_TYPES[key]?.name ?? '待标记';

/** 千分位 + 固定小数，数字统一等宽显示 */
export const fmt = (value: number, digits = 0) =>
  value.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
