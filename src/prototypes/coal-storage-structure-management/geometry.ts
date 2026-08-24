/**
 * 直扇形楔煤堆几何模型
 *
 * 斗轮堆取料机沿轨道行走堆煤，煤堆形态为「等腰梯形直段 + 两端半锥」，
 * 工程上称直扇形楔。两端半锥合并后恰为一个完整圆锥，因此：
 *
 *   V(h) = A(h) · L + π·h³ / (3·tan²θ)
 *   A(h) = h · (W - h/tanθ)          // 等腰梯形截面积，顶宽 = W - 2h/tanθ
 *
 * 煤层分界面由堆料时臂架俯仰角决定，故堆高与俯仰角互为反函数：
 *   h = pivotHeight + armReach · tan(φ)
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - 用户提供的存煤结构管理业务描述（直扇形楔几何关系、俯仰角反算）
 */

export interface ZoneGeometry {
  /** 堆煤直段长度（沿轨道方向）m */
  runLength: number;
  /** 堆底宽度（挡煤墙净间距）m */
  baseWidth: number;
  /** 燃煤自然安息角 ° */
  reposeAngle: number;
  /** 挡煤墙高度 m */
  wallHeight: number;
  /** 允许最大堆煤高度 m */
  maxStackHeight: number;
  /** 斗轮机回转中心高度 m */
  pivotHeight: number;
  /** 臂架水平投影长度 m */
  armReach: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** 安息角对应的边坡系数 tanθ */
export const slopeFactor = (g: ZoneGeometry) => Math.tan(toRad(g.reposeAngle));

/** 梯形截面在堆高 h 处的顶宽（m），堆成三角形后归零 */
export const crestWidth = (g: ZoneGeometry, h: number) =>
  Math.max(0, g.baseWidth - (2 * h) / slopeFactor(g));

/** 梯形截面积 m² */
export const sectionArea = (g: ZoneGeometry, h: number) => {
  const k = slopeFactor(g);
  const triangleHeight = (g.baseWidth * k) / 2;
  if (h <= 0) return 0;
  // 超过临界高度后截面退化为三角形，面积不再增长
  if (h >= triangleHeight) return (g.baseWidth * triangleHeight) / 2;
  return h * (g.baseWidth - h / k);
};

/** 堆高 h 对应的煤堆体积 m³ */
export const stackVolume = (g: ZoneGeometry, h: number) => {
  if (h <= 0) return 0;
  const k = slopeFactor(g);
  const cone = (Math.PI * h ** 3) / (3 * k ** 2);
  return sectionArea(g, h) * g.runLength + cone;
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

/** 堆高 → 臂架俯仰角 ° */
export const pitchFromHeight = (g: ZoneGeometry, h: number) =>
  toDeg(Math.atan((h - g.pivotHeight) / g.armReach));

/** 臂架俯仰角 ° → 堆高 m */
export const heightFromPitch = (g: ZoneGeometry, pitch: number) =>
  g.pivotHeight + g.armReach * Math.tan(toRad(pitch));

/** 俯仰角 → 体积（用于「按角度配置煤层」时反算煤量） */
export const volumeFromPitch = (g: ZoneGeometry, pitch: number) =>
  stackVolume(g, Math.max(0, heightFromPitch(g, pitch)));

export interface LayerBoundary {
  /** 层底累计体积 m³ */
  volumeBottom: number;
  /** 层顶累计体积 m³ */
  volumeTop: number;
  /** 层底标高 m */
  heightBottom: number;
  /** 层顶标高 m */
  heightTop: number;
  /** 层底分界俯仰角 ° */
  pitchBottom: number;
  /** 层顶分界俯仰角 ° */
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

/* ============================ 剖面绘制辅助 ============================ */

export type Point = [number, number];

/**
 * 半平面裁剪（Sutherland–Hodgman），保留 f(p) >= 0 的一侧。
 * 用于让倾斜的煤层分界线被梯形轮廓自然裁剪。
 */
export const clipHalfPlane = (poly: Point[], f: (p: Point) => number): Point[] => {
  const out: Point[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const fa = f(a);
    const fb = f(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
};

/** 多边形转 SVG points 属性 */
export const toPoints = (poly: Point[]) =>
  poly.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

/**
 * 俯仰角 → 剖面上分界线的视觉斜率。
 * 保留角度差异的可读性，同时把倾斜幅度压在克制的范围内。
 */
export const pitchToSlope = (pitch: number) => {
  const raw = Math.tan(toRad(pitch)) * 0.34;
  return Math.max(-0.26, Math.min(0.26, raw));
};
