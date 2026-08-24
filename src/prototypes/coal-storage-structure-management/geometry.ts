/**
 * 圆形煤场扇形楔煤堆几何模型
 *
 * 圆形封闭煤场由中心堆料塔上的悬臂绕中心回转堆煤，煤场沿周向均分为 36 个分区，
 * 每个分区张角 10°。分区内煤堆为一个扇形楔：径向断面是等腰梯形（底宽 = 外半径 − 内半径，
 * 边坡由燃煤安息角决定），沿周向张开 Δα。按 Pappus 定理，扇形楔体积为
 *
 *   V(h) = Δα · r̄ · A(h)
 *   A(h) = h · (W − h/tanθ)        径向断面积，顶宽 = W − 2h/tanθ
 *   r̄   = Ri + W/2                 断面形心半径
 *
 * 煤层分界面由堆料时悬臂俯仰角决定，故堆高与俯仰角互为反函数：
 *   h = pivotHeight + armReach · tan(φ)
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - 用户提供的存煤结构管理业务描述（圆形煤场 36 分区、20 m 堆高上限、10 cm 分带热力图）
 */

export interface ZoneGeometry {
  /** 分区张角 °（36 分区即 10°） */
  sectorAngle: number;
  /** 煤场内半径（中心堆料塔基础）m */
  innerRadius: number;
  /** 煤场外半径（挡煤墙）m */
  outerRadius: number;
  /** 燃煤自然安息角 ° */
  reposeAngle: number;
  /** 挡煤墙高度 m */
  wallHeight: number;
  /** 允许最大堆煤高度 m */
  maxStackHeight: number;
  /** 悬臂俯仰铰点高度 m */
  pivotHeight: number;
  /** 悬臂水平投影长度 m */
  armReach: number;
}

/** 实际堆煤视图的分带高度 m（20 m 上限划分为 200 个 10 cm 方块） */
export const BAND_HEIGHT = 0.1;
/** 分带总数 */
export const BAND_COUNT = 200;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** 安息角对应的边坡系数 tanθ */
export const slopeFactor = (g: ZoneGeometry) => Math.tan(toRad(g.reposeAngle));

/** 径向堆底宽度 m */
export const baseWidth = (g: ZoneGeometry) => g.outerRadius - g.innerRadius;

/** 径向断面形心半径 m */
export const centroidRadius = (g: ZoneGeometry) => g.innerRadius + baseWidth(g) / 2;

/** 堆高 h 处的径向顶宽 m，堆成三角形后归零 */
export const crestWidth = (g: ZoneGeometry, h: number) =>
  Math.max(0, baseWidth(g) - (2 * h) / slopeFactor(g));

/** 径向断面积 m² */
export const sectionArea = (g: ZoneGeometry, h: number) => {
  if (h <= 0) return 0;
  const W = baseWidth(g);
  const k = slopeFactor(g);
  const triangleHeight = (W * k) / 2;
  // 超过临界高度后断面退化为三角形，面积不再增长
  if (h >= triangleHeight) return (W * triangleHeight) / 2;
  return h * (W - h / k);
};

/** 堆高 h 对应的分区煤堆体积 m³ */
export const stackVolume = (g: ZoneGeometry, h: number) => {
  if (h <= 0) return 0;
  return toRad(g.sectorAngle) * centroidRadius(g) * sectionArea(g, h);
};

/** 分区几何容量（堆至允许最大堆高）m³ */
export const capacityVolume = (g: ZoneGeometry) => stackVolume(g, g.maxStackHeight);

/** 由体积反解堆高 m（V(h) 在有效区间单调递增，二分求解） */
export const heightFromVolume = (g: ZoneGeometry, volume: number) => {
  if (volume <= 0) return 0;
  let lo = 0;
  let hi = g.maxStackHeight * 1.5;
  if (stackVolume(g, hi) < volume) return hi;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (stackVolume(g, mid) < volume) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

/** 堆高 → 悬臂俯仰角 ° */
export const pitchFromHeight = (g: ZoneGeometry, h: number) =>
  toDeg(Math.atan((h - g.pivotHeight) / g.armReach));

/** 悬臂俯仰角 ° → 堆高 m */
export const heightFromPitch = (g: ZoneGeometry, pitch: number) =>
  g.pivotHeight + g.armReach * Math.tan(toRad(pitch));

/** 俯仰角 ° → 累计体积 m³（用于按角度配置煤层时反算煤量） */
export const volumeFromPitch = (g: ZoneGeometry, pitch: number) =>
  stackVolume(g, Math.max(0, heightFromPitch(g, pitch)));

/** 俯仰角可用区间 ° */
export const pitchRange = (g: ZoneGeometry) => ({
  min: pitchFromHeight(g, 0),
  max: pitchFromHeight(g, g.maxStackHeight),
});

export interface LayerBoundary {
  /** 层底累计体积 m³ */
  volumeBottom: number;
  /** 层顶累计体积 m³ */
  volumeTop: number;
  /** 层底标高 m */
  heightBottom: number;
  /** 层顶标高 m */
  heightTop: number;
  /** 起始（层底）俯仰角 ° */
  pitchBottom: number;
  /** 结束（层顶）俯仰角 ° */
  pitchTop: number;
}

/**
 * 按堆煤顺序（自下而上）依次累计体积，反算每层的标高区间与俯仰角区间。
 * 这是「配置煤量 → 自动计算煤层分布」与「配置角度 → 自动计算煤量」的共同基础。
 */
export const resolveBoundaries = (g: ZoneGeometry, volumes: number[]): LayerBoundary[] => {
  let cum = 0;
  return volumes.map((v) => {
    const volumeBottom = cum;
    cum += Math.max(0, v);
    const volumeTop = cum;
    const heightBottom = heightFromVolume(g, volumeBottom);
    const heightTop = heightFromVolume(g, volumeTop);
    return {
      volumeBottom,
      volumeTop,
      heightBottom,
      heightTop,
      pitchBottom: pitchFromHeight(g, heightBottom),
      pitchTop: pitchFromHeight(g, heightTop),
    };
  });
};

/** 标高 → 10 cm 分带序号（0 为贴地第一带） */
export const bandIndexOf = (height: number) =>
  Math.min(BAND_COUNT - 1, Math.max(0, Math.floor(height / BAND_HEIGHT)));

/** 分带序号 → 该带中心标高 m */
export const bandCenterHeight = (index: number) => (index + 0.5) * BAND_HEIGHT;
