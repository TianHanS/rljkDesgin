/**
 * 煤场存煤结构管理 · 领域数据与配色体系
 *
 * 煤场形态：圆形封闭煤场，沿周向均分 36 个分区（每区 10°），堆煤高度上限 20 m。
 *
 * 配色规则（化解「同批次同色」与「同煤质同色」两条要求的冲突）：
 *   色族 = 库存煤种（煤质类别），色阶 = 入厂登记编号（批次）
 * 未识别批次的煤层脱离色族，使用固定异常红 + 斜纹，兼顾色盲可辨识。
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /src/themes/antd-new/DESIGN-SPEC.md
 * - /src/prototypes/coal-unloading-management（入厂登记编号格式）
 * - 用户提供的存煤结构管理业务描述
 */

import * as geo from './geometry';
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

/** 未识别煤层的固定异常红 */
export const UNMARKED_COLOR = '#cf1322';

/* ============================ 入厂批次台账 ============================ */

export interface ArrivalBatch {
  /** 入厂登记编号（唯一标识） */
  regNo: string;
  shipName: string;
  voyage: string;
  coalType: string;
  /** 卸煤煤量 t */
  unloadedMass: number;
  /** 卸煤完成日期 */
  unloadedAt: string;
  /** 卸入煤场 */
  yardId: string;
  /** 色阶序号（同煤种内区分入厂批次） */
  tint: number;
}

export const ARRIVAL_BATCHES: ArrivalBatch[] = [
  {
    regNo: 'gxsz-2026-054RCDJ2026061201',
    shipName: '神华壹号',
    voyage: 'V2606',
    coalType: 'shenhun1',
    unloadedMass: 28900,
    unloadedAt: '2026-06-14',
    yardId: 'Y1',
    tint: 0,
  },
  {
    regNo: 'gxsz-2026-054RCDJ2026062801',
    shipName: 'SAMUDRA JAYA',
    voyage: 'V115',
    coalType: 'indoLignite',
    unloadedMass: 30600,
    unloadedAt: '2026-06-30',
    yardId: 'Y1',
    tint: 0,
  },
  {
    regNo: 'gxsz-2026-054RCDJ2026070902',
    shipName: '准能海运',
    voyage: 'V0703',
    coalType: 'zhungeer',
    unloadedMass: 39100,
    unloadedAt: '2026-07-11',
    yardId: 'Y1',
    tint: 0,
  },
  {
    regNo: 'gxsz-2026-054RCDJ2026072401',
    shipName: 'KAPITAN NAZAROV',
    voyage: 'V208',
    coalType: 'russian',
    unloadedMass: 26800,
    unloadedAt: '2026-07-26',
    yardId: 'Y1',
    tint: 0,
  },
  {
    regNo: 'gxsz-2026-042RCDJ2026080501',
    shipName: '蒙运陆运（汽运）',
    voyage: '—',
    coalType: 'mongolian',
    unloadedMass: 29700,
    unloadedAt: '2026-08-06',
    yardId: 'Y1',
    tint: 0,
  },
  {
    regNo: 'gxsz-2026-054RCDJ2026081802',
    shipName: '神华叁号',
    voyage: 'V2619',
    coalType: 'shenhun1',
    unloadedMass: 21400,
    unloadedAt: '2026-08-19',
    yardId: 'Y1',
    tint: 1,
  },
  {
    regNo: 'gxsz-2026-054RCDJ2026070501',
    shipName: '国信海运',
    voyage: 'V0705',
    coalType: 'shenhun1',
    unloadedMass: 24600,
    unloadedAt: '2026-07-07',
    yardId: 'Y2',
    tint: 2,
  },
  {
    regNo: 'gxsz-2026-054RCDJ2026072202',
    shipName: 'SAMUDRA BARU',
    voyage: 'V121',
    coalType: 'indoLignite',
    unloadedMass: 18900,
    unloadedAt: '2026-07-24',
    yardId: 'Y2',
    tint: 1,
  },
  {
    regNo: 'gxsz-2026-054RCDJ2026080901',
    shipName: '准能海运',
    voyage: 'V0809',
    coalType: 'zhungeer',
    unloadedMass: 22300,
    unloadedAt: '2026-08-11',
    yardId: 'Y2',
    tint: 1,
  },
  {
    regNo: 'gxsz-2026-054RCDJ2026082001',
    shipName: 'KAPITAN VOLKOV',
    voyage: 'V214',
    coalType: 'russian',
    unloadedMass: 9800,
    unloadedAt: '2026-08-21',
    yardId: 'Y2',
    tint: 1,
  },
  {
    regNo: 'gxsz-2026-042RCDJ2026071801',
    shipName: '蒙运陆运（汽运）',
    voyage: '—',
    coalType: 'mongolian',
    unloadedMass: 12600,
    unloadedAt: '2026-07-19',
    yardId: 'Y3',
    tint: 1,
  },
  {
    regNo: 'gxsz-2026-042RCDJ2026080301',
    shipName: '准能海运',
    voyage: 'V0803',
    coalType: 'zhungeer',
    unloadedMass: 8400,
    unloadedAt: '2026-08-04',
    yardId: 'Y3',
    tint: 2,
  },
];

/** 本次盘煤周期（周期内入厂批次参与新增煤层的批次匹配） */
export const SURVEY_PERIOD = { from: '2026-08-17', to: '2026-08-24' };

/** 自动识别批次时允许的堆积密度区间 t/m³ */
export const DENSITY_RANGE = { min: 0.78, max: 0.95 };

/** 平台配置的默认燃煤计算密度 t/m³ */
export const DEFAULT_DENSITY = 0.85;

export const findBatch = (regNo: string) => ARRIVAL_BATCHES.find((b) => b.regNo === regNo);

/** 入厂登记编号的短标签，用于色块等窄空间 */
export const shortRegNo = (regNo: string) => (regNo ? regNo.slice(-12) : '');

/* ============================ 煤场 / 分区 / 煤层 ============================ */

export type LayerStatus = 'marked' | 'unmarked';

export interface CoalLayer {
  id: string;
  /** 入厂登记编号，未识别时为空 */
  regNo: string;
  shipName: string;
  voyage: string;
  /** 库存煤种 key，未识别时为空 */
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
  /** 分区序号 1~36，界面按此增序自左向右排列 */
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
  /** 分区数量 */
  zoneCount: number;
  /** 是否具备激光盘煤数据源 */
  hasSurvey: boolean;
  /** 本次盘煤时间 */
  surveyAt: string;
  /** 上次盘煤时间 */
  lastSurveyAt: string;
  density: number;
}

export const YARDS: CoalYard[] = [
  {
    id: 'Y1',
    name: '#1 圆形煤场（Φ130 m · 36 分区）',
    shortName: '#1 圆形煤场',
    zoneCount: 36,
    hasSurvey: true,
    surveyAt: '2026-08-24 06:30',
    lastSurveyAt: '2026-08-17 06:30',
    density: DEFAULT_DENSITY,
  },
  {
    id: 'Y2',
    name: '#2 圆形煤场（Φ130 m · 36 分区）',
    shortName: '#2 圆形煤场',
    zoneCount: 36,
    hasSurvey: true,
    surveyAt: '2026-08-24 07:10',
    lastSurveyAt: '2026-08-17 07:10',
    density: DEFAULT_DENSITY,
  },
  {
    id: 'Y3',
    name: '厂外中转煤场（Φ130 m · 36 分区 · 无盘煤数据源）',
    shortName: '厂外中转煤场',
    zoneCount: 36,
    hasSurvey: false,
    surveyAt: '—',
    lastSurveyAt: '—',
    density: 0.82,
  },
];

const CIRCULAR_GEOMETRY: ZoneGeometry = {
  sectorAngle: 10,
  innerRadius: 8,
  outerRadius: 65,
  reposeAngle: 38,
  wallHeight: 22,
  maxStackHeight: 20,
  pivotHeight: 12,
  armReach: 40,
};

export const zoneGeometry = () => CIRCULAR_GEOMETRY;

/** 分区几何容量 m³（圆形煤场各分区一致） */
export const ZONE_CAPACITY = geo.capacityVolume(CIRCULAR_GEOMETRY);

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

/** 确定性伪随机，保证每次加载的煤场结构一致 */
const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

interface YardFillPlan {
  seed: number;
  /** 36 个分区的充满度（相对几何容量），0 表示空区 */
  fill: number[];
  /**
   * 指定生成未识别煤层的位置：分区序号 → 该分区内未识别的层数（自顶层向下）。
   * 指定层数超过该分区实际层数时按实际层数收敛。
   */
  unmarked: Record<number, number>;
}

/** 圆形煤场按扇区连续作业，充满度沿周向呈段状分布 */
const buildFill = (segments: [count: number, value: number][]) => {
  const out: number[] = [];
  segments.forEach(([count, value]) => {
    for (let i = 0; i < count; i += 1) out.push(value);
  });
  return out;
};

const YARD_FILL_PLANS: Record<string, YardFillPlan> = {
  Y1: {
    seed: 20260824,
    fill: buildFill([
      [4, 0.9],
      [4, 0.82],
      [3, 0.68],
      [3, 0.55],
      [4, 0.44],
      [3, 0.3],
      [3, 0.18],
      [2, 0],
      [4, 0.62],
      [3, 0.76],
      [3, 0.86],
    ]),
    // 5 区连续两个盘煤周期未匹配到入厂批次，7 区与 22 区各有一层待标记
    unmarked: { 5: 2, 7: 1, 22: 1 },
  },
  Y2: {
    seed: 20260817,
    fill: buildFill([
      [3, 0.52],
      [5, 0.7],
      [4, 0.86],
      [3, 0.62],
      [3, 0.4],
      [4, 0.24],
      [3, 0],
      [4, 0.48],
      [4, 0.66],
      [3, 0.58],
    ]),
    unmarked: { 12: 1 },
  },
  Y3: {
    seed: 20260801,
    fill: buildFill([
      [5, 0.34],
      [4, 0.46],
      [4, 0.28],
      [4, 0],
      [5, 0.4],
      [4, 0.52],
      [4, 0.22],
      [6, 0],
    ]),
    unmarked: { 9: 1 },
  },
};

const makeLayerFrom = (
  regNo: string,
  volume: number,
  density: number,
  stackedAt: string,
): CoalLayer => {
  const batch = findBatch(regNo);
  if (!batch) {
    return {
      id: nextLayerId(),
      regNo: '',
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
  return {
    id: nextLayerId(),
    regNo: batch.regNo,
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

export const createZones = (): CoalZone[] => {
  const zones: CoalZone[] = [];
  YARDS.forEach((yard) => {
    const plan = YARD_FILL_PLANS[yard.id];
    const rnd = mulberry32(plan.seed);
    const batches = ARRIVAL_BATCHES.filter((b) => b.yardId === yard.id).sort((a, b) =>
      a.unloadedAt.localeCompare(b.unloadedAt),
    );

    for (let code = 1; code <= yard.zoneCount; code += 1) {
      const fill = plan.fill[code - 1] ?? 0;
      const totalVolume = fill * ZONE_CAPACITY;
      const layers: CoalLayer[] = [];

      if (totalVolume > 1) {
        const layerCount = fill > 0.7 ? 3 + (rnd() > 0.5 ? 1 : 0) : fill > 0.35 ? 2 : 1;
        // 底层更厚，符合先堆的煤层被后续煤层压覆的实际形态
        const weights = Array.from({ length: layerCount }, (_, i) => 1.6 - i * 0.28 + rnd() * 0.3);
        const weightSum = weights.reduce((s, w) => s + w, 0);
        const unmarkedCount = Math.min(layerCount, plan.unmarked[code] ?? 0);

        for (let i = 0; i < layerCount; i += 1) {
          const volume = (totalVolume * weights[i]) / weightSum;
          // 自顶层向下指定的层标记为未识别
          const isUnmarked = i >= layerCount - unmarkedCount;
          const batch = batches[(code + i) % batches.length];
          layers.push(
            makeLayerFrom(
              isUnmarked ? '' : batch.regNo,
              volume,
              yard.density,
              isUnmarked ? SURVEY_PERIOD.to : batch.unloadedAt,
            ),
          );
        }
      }

      const total = layers.reduce((s, l) => s + l.volume, 0);
      zones.push({
        id: `${yard.id}-${code}`,
        yardId: yard.id,
        code,
        name: `${code} 区`,
        geometry: CIRCULAR_GEOMETRY,
        lastSurveyVolume: total,
        surveyVolume: total,
        layers,
      });
    }
  });
  return zones;
};

/**
 * 盘煤比对向导的体积变动预填：圆形煤场按扇区连续作业，
 * 一个盘煤周期内通常只有少数几个扇区发生堆取。
 */
export const SURVEY_DELTA_PLAN: Record<string, Record<number, number>> = {
  Y1: { 3: 620, 7: 480, 14: -520, 21: 700, 28: -340, 33: 410 },
  Y2: { 5: 540, 11: -460, 18: 390, 24: 280, 31: -300 },
  Y3: {},
};

/* ============================ 台账记录 ============================ */

export type MoveType = 'in' | 'out' | 'adjust';
export type MoveSource = 'survey-auto' | 'manual' | 'mark' | 'split' | 'merge' | 'delete';

export interface StockMove {
  id: string;
  time: string;
  type: MoveType;
  yardId: string;
  zoneName: string;
  regNo: string;
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
    time: '2026-08-19 21:40',
    type: 'in',
    yardId: 'Y1',
    zoneName: '31 区',
    regNo: 'gxsz-2026-054RCDJ2026081802',
    coalTypeName: '神混 1 号',
    volume: 2620,
    mass: 2227,
    source: 'survey-auto',
    note: '盘煤体积增加，按周期内入厂批次自动识别',
  },
  {
    id: 'M0002',
    time: '2026-08-22 09:15',
    type: 'out',
    yardId: 'Y1',
    zoneName: '14 区',
    regNo: 'gxsz-2026-054RCDJ2026070902',
    coalTypeName: '准格尔煤',
    volume: 860,
    mass: 731,
    source: 'manual',
    note: '上煤取料，按后进先出扣减顶层煤量',
  },
  {
    id: 'M0003',
    time: '2026-08-24 06:35',
    type: 'in',
    yardId: 'Y1',
    zoneName: '19 区',
    regNo: '',
    coalTypeName: '待标记',
    volume: 1180,
    mass: 1003,
    source: 'survey-auto',
    note: '匹配密度超出合理区间，生成待标记煤层',
  },
  {
    id: 'M0004',
    time: '2026-08-24 07:15',
    type: 'in',
    yardId: 'Y2',
    zoneName: '12 区',
    regNo: '',
    coalTypeName: '待标记',
    volume: 640,
    mass: 544,
    source: 'survey-auto',
    note: '周期内无可匹配入厂批次，生成待标记煤层',
  },
];

export const INITIAL_AUDIT: AuditLog[] = [
  {
    id: 'A0001',
    time: '2026-08-24 08:12',
    operator: '田略（燃料专责）',
    target: '#1 圆形煤场 · 31 区 · 第 3 层',
    action: '标记存煤批次',
    before: '待标记',
    after: 'gxsz-2026-054RCDJ2026081802 / 神混 1 号',
  },
  {
    id: 'A0002',
    time: '2026-08-23 15:48',
    operator: '王值长（集控值长）',
    target: '#2 圆形煤场 · 18 区 · 第 2 层',
    action: '分层拆分',
    before: '1 层 · 1 620 m³',
    after: '2 层 · 980 m³ + 640 m³',
  },
];

/* ============================ 展示字段与配色 ============================ */

export interface LabelField {
  key: string;
  label: string;
  unit?: string;
}

/** 存煤视图中各煤层的缩略展示信息，默认库存煤种 */
export const LABEL_FIELDS: LabelField[] = [
  { key: 'coalType', label: '库存煤种' },
  { key: 'shipVoyage', label: '船名/航次' },
  { key: 'cv', label: '热值', unit: 'kcal/kg' },
  { key: 'volume', label: '体积', unit: 'm³' },
  { key: 'pitchStart', label: '起始角度', unit: '°' },
  { key: 'regNo', label: '入厂登记编号' },
];

export const DEFAULT_LABEL_KEY = 'coalType';

/** 煤层取色：色族取自库存煤种，色阶取自入厂登记编号 */
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
