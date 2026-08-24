/**
 * 煤场存煤结构管理 · 计算模型与业务规则
 *
 * 承载三类规则：
 * 1. 分层几何派生：层体积 → 累计体积 → 标高 → 分界俯仰角
 * 2. 盘煤比对：体积增加按周期内接卸批次做全煤场密度匹配；体积减少自上而下扣减
 * 3. 人工维护：标记批次、按煤量/角度调整、相邻层合并、厂外煤场手动出入库
 *
 * 参考资料：
 * - 用户提供的存煤结构管理业务描述
 * - /rules/development-standards.md
 */

import * as geo from './geometry';
import {
  COAL_TYPES,
  DENSITY_RANGE,
  type ArrivalBatch,
  type CoalLayer,
  type CoalZone,
  coalTypeName,
  findBatch,
  layerColor,
  nextLayerId,
} from './data';

/* ============================ 派生模型 ============================ */

export interface ComputedLayer {
  raw: CoalLayer;
  id: string;
  /** 自下而上层序，1 为贴地底层 */
  seq: number;
  volume: number;
  mass: number;
  color: string;
  /** 层厚 m */
  thickness: number;
  bound: geo.LayerBoundary;
}

export interface ComputedZone {
  raw: CoalZone;
  id: string;
  code: number;
  name: string;
  geometry: geo.ZoneGeometry;
  layers: ComputedLayer[];
  totalVolume: number;
  totalMass: number;
  /** 分区计算堆煤高度 m */
  stackHeight: number;
  /** 几何容量（堆至允许最大堆高）m³ */
  capacity: number;
  /** 相对盘煤体积上限的占用率 */
  fillRate: number;
  /** 本次盘煤相对上次的体积变动 m³ */
  delta: number;
  /** 盘煤体积尚未分配到煤层的余量 m³ */
  unallocated: number;
  unmarkedCount: number;
  unmarkedMass: number;
}

export const computeZone = (zone: CoalZone): ComputedZone => {
  const bounds = geo.resolveBoundaries(
    zone.geometry,
    zone.layers.map((l) => l.volume),
  );
  const layers: ComputedLayer[] = zone.layers.map((raw, i) => ({
    raw,
    id: raw.id,
    seq: i + 1,
    volume: raw.volume,
    mass: raw.volume * raw.density,
    color: layerColor(raw),
    thickness: bounds[i].heightTop - bounds[i].heightBottom,
    bound: bounds[i],
  }));
  const totalVolume = layers.reduce((s, l) => s + l.volume, 0);
  const totalMass = layers.reduce((s, l) => s + l.mass, 0);
  const unmarked = layers.filter((l) => l.raw.status === 'unmarked');
  return {
    raw: zone,
    id: zone.id,
    code: zone.code,
    name: zone.name,
    geometry: zone.geometry,
    layers,
    totalVolume,
    totalMass,
    stackHeight: geo.heightFromVolume(zone.geometry, totalVolume),
    capacity: geo.capacityVolume(zone.geometry),
    fillRate: zone.surveyVolume > 0 ? totalVolume / zone.surveyVolume : 0,
    delta: zone.surveyVolume - zone.lastSurveyVolume,
    unallocated: zone.surveyVolume - totalVolume,
    unmarkedCount: unmarked.length,
    unmarkedMass: unmarked.reduce((s, l) => s + l.mass, 0),
  };
};

/* ============================ 层序操作原语 ============================ */

/** 自上而下扣减指定体积，返回新的层序列与逐层扣减明细 */
export const deductFromTop = (layers: CoalLayer[], volume: number) => {
  const next = layers.map((l) => ({ ...l }));
  const cuts: { layer: CoalLayer; volume: number }[] = [];
  let remaining = volume;
  for (let i = next.length - 1; i >= 0 && remaining > 0.01; i -= 1) {
    const cut = Math.min(next[i].volume, remaining);
    cuts.push({ layer: next[i], volume: cut });
    next[i].volume -= cut;
    remaining -= cut;
  }
  return { layers: next.filter((l) => l.volume > 0.01), cuts };
};

/** 在顶部堆叠新煤层；顶层为同批次时直接并入，符合连续堆煤的实际形态 */
export const stackOnTop = (layers: CoalLayer[], layer: CoalLayer) => {
  const top = layers[layers.length - 1];
  if (top && layer.batchNo && top.batchNo === layer.batchNo && top.status === 'marked') {
    const next = layers.slice(0, -1);
    return [...next, { ...top, volume: top.volume + layer.volume, stackedAt: layer.stackedAt }];
  }
  return [...layers, layer];
};

export const makeLayer = (params: {
  batchNo: string;
  volume: number;
  density: number;
  stackedAt: string;
}): CoalLayer => {
  const batch = findBatch(params.batchNo);
  if (!batch) {
    return {
      id: nextLayerId(),
      batchNo: '',
      shipName: '',
      voyage: '',
      coalType: '',
      quality: null,
      volume: params.volume,
      density: params.density,
      status: 'unmarked',
      stackedAt: params.stackedAt,
      tint: 0,
    };
  }
  return {
    id: nextLayerId(),
    batchNo: batch.batchNo,
    shipName: batch.shipName,
    voyage: batch.voyage,
    coalType: batch.coalType,
    quality: COAL_TYPES[batch.coalType].quality,
    volume: params.volume,
    density: params.density,
    status: 'marked',
    stackedAt: params.stackedAt,
    tint: batch.tint,
  };
};

/* ============================ 盘煤比对 ============================ */

export interface SurveyInput {
  yardId: string;
  /** zoneId → 本次盘煤体积 m³ */
  volumes: Record<string, number>;
  /** 勾选的周期内接卸批次 */
  batchNos: string[];
  defaultDensity: number;
}

export interface SurveyPlanDetail {
  batchNo: string;
  coalTypeName: string;
  volume: number;
  mass: number;
}

export interface SurveyPlanItem {
  zoneId: string;
  zoneName: string;
  lastVolume: number;
  newVolume: number;
  delta: number;
  kind: 'in' | 'out' | 'none';
  /** 新增层的起始／终止俯仰角（体积增加时给出） */
  pitchFrom: number | null;
  pitchTo: number | null;
  details: SurveyPlanDetail[];
}

export interface SurveyPlan {
  items: SurveyPlanItem[];
  /** 全煤场新增体积合计 m³ */
  increaseVolume: number;
  /** 全煤场减少体积合计 m³ */
  decreaseVolume: number;
  /** 勾选批次卸煤量合计 t */
  batchMass: number;
  /** 匹配密度 = 批次煤量 / 新增体积 */
  matchDensity: number | null;
  /** 密度是否落在合理区间，决定能否自动识别批次 */
  autoMatched: boolean;
  inMass: number;
  outMass: number;
  newUnmarkedLayers: number;
}

/**
 * 依据盘煤体积变动构造处理方案。
 * 增加：以全煤场为口径计算 ρ = Σ批次煤量 / Σ新增体积；ρ 落在合理区间则各分区新增煤层
 *       按批次煤量比例自动识别为对应批次，否则生成待标记煤层（估算煤量按默认密度）。
 * 减少：按煤层顺序自上而下扣减，逐批次形成出库明细。
 */
export const buildSurveyPlan = (zones: CoalZone[], input: SurveyInput): SurveyPlan => {
  const scoped = zones.filter((z) => z.yardId === input.yardId);
  const batches = input.batchNos
    .map((no) => findBatch(no))
    .filter((b): b is ArrivalBatch => Boolean(b))
    .sort((a, b) => a.unloadedAt.localeCompare(b.unloadedAt));

  const deltas = scoped.map((z) => ({
    zone: z,
    newVolume: input.volumes[z.id] ?? z.surveyVolume,
    delta: (input.volumes[z.id] ?? z.surveyVolume) - z.surveyVolume,
  }));

  const increaseVolume = deltas.reduce((s, d) => s + Math.max(0, d.delta), 0);
  const decreaseVolume = deltas.reduce((s, d) => s + Math.max(0, -d.delta), 0);
  const batchMass = batches.reduce((s, b) => s + b.unloadedMass, 0);
  const matchDensity = increaseVolume > 0.01 && batchMass > 0 ? batchMass / increaseVolume : null;
  const autoMatched =
    matchDensity !== null &&
    matchDensity >= DENSITY_RANGE.min &&
    matchDensity <= DENSITY_RANGE.max;

  let inMass = 0;
  let outMass = 0;
  let newUnmarkedLayers = 0;

  const items: SurveyPlanItem[] = deltas.map(({ zone, newVolume, delta }) => {
    const base: SurveyPlanItem = {
      zoneId: zone.id,
      zoneName: zone.name,
      lastVolume: zone.surveyVolume,
      newVolume,
      delta,
      kind: 'none',
      pitchFrom: null,
      pitchTo: null,
      details: [],
    };

    if (delta > 0.01) {
      const currentVolume = zone.layers.reduce((s, l) => s + l.volume, 0);
      const hFrom = geo.heightFromVolume(zone.geometry, currentVolume);
      const hTo = geo.heightFromVolume(zone.geometry, currentVolume + delta);
      const details: SurveyPlanDetail[] = autoMatched
        ? batches.map((b) => {
            const volume = (delta * b.unloadedMass) / batchMass;
            return {
              batchNo: b.batchNo,
              coalTypeName: coalTypeName(b.coalType),
              volume,
              mass: volume * (matchDensity as number),
            };
          })
        : [
            {
              batchNo: '',
              coalTypeName: '待标记',
              volume: delta,
              mass: delta * input.defaultDensity,
            },
          ];
      if (!autoMatched) newUnmarkedLayers += 1;
      inMass += details.reduce((s, d) => s + d.mass, 0);
      return {
        ...base,
        kind: 'in',
        pitchFrom: geo.pitchFromHeight(zone.geometry, hFrom),
        pitchTo: geo.pitchFromHeight(zone.geometry, hTo),
        details,
      };
    }

    if (delta < -0.01) {
      const { cuts } = deductFromTop(zone.layers, -delta);
      const details = cuts.map((c) => ({
        batchNo: c.layer.batchNo,
        coalTypeName: c.layer.batchNo ? coalTypeName(c.layer.coalType) : '待标记',
        volume: c.volume,
        mass: c.volume * c.layer.density,
      }));
      outMass += details.reduce((s, d) => s + d.mass, 0);
      return { ...base, kind: 'out', details };
    }

    return base;
  });

  return {
    items,
    increaseVolume,
    decreaseVolume,
    batchMass,
    matchDensity,
    autoMatched,
    inMass,
    outMass,
    newUnmarkedLayers,
  };
};

/** 将盘煤方案落到煤层结构上，返回新的分区数组 */
export const applySurveyPlan = (
  zones: CoalZone[],
  plan: SurveyPlan,
  input: SurveyInput,
  stackedAt: string,
): CoalZone[] =>
  zones.map((zone) => {
    const item = plan.items.find((i) => i.zoneId === zone.id);
    if (!item) return zone;
    if (item.kind === 'none') {
      return { ...zone, lastSurveyVolume: zone.surveyVolume, surveyVolume: item.newVolume };
    }

    let layers = zone.layers;
    if (item.kind === 'in') {
      item.details.forEach((d) => {
        const density = d.volume > 0 ? d.mass / d.volume : input.defaultDensity;
        layers = stackOnTop(
          layers,
          makeLayer({ batchNo: d.batchNo, volume: d.volume, density, stackedAt }),
        );
      });
    } else {
      layers = deductFromTop(layers, -item.delta).layers;
    }

    return {
      ...zone,
      layers,
      lastSurveyVolume: zone.surveyVolume,
      surveyVolume: item.newVolume,
    };
  });

/* ============================ 人工维护 ============================ */

export const replaceLayer = (
  zones: CoalZone[],
  zoneId: string,
  layerId: string,
  patch: Partial<CoalLayer>,
): CoalZone[] =>
  zones.map((z) =>
    z.id === zoneId
      ? { ...z, layers: z.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)) }
      : z,
  );

/**
 * 调整某层体积。差额优先与相邻上层借还，以保持分区总体积不超过盘煤体积上限；
 * 顶层调整时允许总体积变化，剩余量记为「未分配体积」。
 */
export const resizeLayer = (
  zones: CoalZone[],
  zoneId: string,
  layerId: string,
  newVolume: number,
): { zones: CoalZone[]; applied: number; borrowed: number } => {
  let applied = newVolume;
  let borrowed = 0;
  const next = zones.map((z) => {
    if (z.id !== zoneId) return z;
    const index = z.layers.findIndex((l) => l.id === layerId);
    if (index < 0) return z;
    const layers = z.layers.map((l) => ({ ...l }));
    const above = layers[index + 1];
    let diff = Math.max(0, newVolume) - layers[index].volume;
    // 向上层借用体积时不得超过上层存量，保持分区总体积不变
    if (above && diff > above.volume) diff = above.volume;
    applied = layers[index].volume + diff;
    borrowed = above ? diff : 0;
    layers[index].volume = applied;
    layers[index].adjusted = true;
    if (above) above.volume = Math.max(0, above.volume - diff);
    return { ...z, layers: layers.filter((l) => l.volume > 0.01) };
  });
  return { zones: next, applied, borrowed };
};

/** 合并相邻煤层，保留基准层的批次归属 */
export const mergeWithNeighbour = (
  zones: CoalZone[],
  zoneId: string,
  layerId: string,
  direction: 'up' | 'down',
): CoalZone[] =>
  zones.map((z) => {
    if (z.id !== zoneId) return z;
    const index = z.layers.findIndex((l) => l.id === layerId);
    const other = direction === 'up' ? index + 1 : index - 1;
    if (index < 0 || other < 0 || other >= z.layers.length) return z;
    const keep = z.layers[index];
    const drop = z.layers[other];
    const merged: CoalLayer = {
      ...keep,
      volume: keep.volume + drop.volume,
      density:
        (keep.volume * keep.density + drop.volume * drop.density) / (keep.volume + drop.volume),
      stackedAt: keep.stackedAt < drop.stackedAt ? keep.stackedAt : drop.stackedAt,
      adjusted: true,
    };
    const lower = Math.min(index, other);
    const layers = z.layers.filter((_, i) => i !== index && i !== other);
    layers.splice(lower, 0, merged);
    return { ...z, layers };
  });

/** 厂外煤场手动入库：按煤量登记，折算体积后堆到目标分区顶部 */
export const manualInbound = (
  zones: CoalZone[],
  zoneId: string,
  params: { batchNo: string; mass: number; density: number; stackedAt: string },
): CoalZone[] =>
  zones.map((z) => {
    if (z.id !== zoneId) return z;
    const volume = params.mass / params.density;
    const layers = stackOnTop(
      z.layers,
      makeLayer({
        batchNo: params.batchNo,
        volume,
        density: params.density,
        stackedAt: params.stackedAt,
      }),
    );
    const total = layers.reduce((s, l) => s + l.volume, 0);
    return { ...z, layers, lastSurveyVolume: z.surveyVolume, surveyVolume: total };
  });

/** 按煤量自上而下扣减：逐层用各层自身密度折算体积，返回逐层出库明细 */
export const deductMassFromTop = (layers: CoalLayer[], mass: number) => {
  const next = layers.map((l) => ({ ...l }));
  const cuts: { layer: CoalLayer; volume: number; mass: number }[] = [];
  let remaining = mass;
  for (let i = next.length - 1; i >= 0 && remaining > 0.01; i -= 1) {
    const layerMass = next[i].volume * next[i].density;
    const cutMass = Math.min(layerMass, remaining);
    const cutVolume = next[i].density > 0 ? cutMass / next[i].density : 0;
    cuts.push({ layer: next[i], volume: cutVolume, mass: cutMass });
    next[i].volume = Math.max(0, next[i].volume - cutVolume);
    remaining -= cutMass;
  }
  return { layers: next.filter((l) => l.volume > 0.01), cuts, shortage: remaining };
};

/** 厂外煤场手动出库：按煤量自上而下扣减 */
export const manualOutbound = (
  zones: CoalZone[],
  zoneId: string,
  mass: number,
): {
  zones: CoalZone[];
  cuts: { layer: CoalLayer; volume: number; mass: number }[];
  shortage: number;
} => {
  let cuts: { layer: CoalLayer; volume: number; mass: number }[] = [];
  let shortage = 0;
  const next = zones.map((z) => {
    if (z.id !== zoneId) return z;
    const result = deductMassFromTop(z.layers, mass);
    cuts = result.cuts;
    shortage = result.shortage;
    const total = result.layers.reduce((s, l) => s + l.volume, 0);
    return {
      ...z,
      layers: result.layers,
      lastSurveyVolume: z.surveyVolume,
      surveyVolume: total,
    };
  });
  return { zones: next, cuts, shortage };
};
