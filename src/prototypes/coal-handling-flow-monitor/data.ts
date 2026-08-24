/**
 * 输煤全流程 — 示例数据与类型
 */

export type EquipStatus = '运行' | '停运' | '故障' | '待机';

export interface BeltInfo {
  id: string;
  name: string;
  status: EquipStatus;
  currentA: number;
  instantTh: number;
  accumT: number;
  speedMs: number;
  coalType: string;
  position: string;
  runShiftH: number;
  runDayH: number;
  runMonthH: number;
  runYearH: number;
  runTotalH: number;
}

export interface YardStacker {
  id: string;
  name: string;
  mode: '堆料' | '取料' | '待机' | '故障';
  emergencyStop: boolean;
  position: string;
  boomAngle: number;
  coalType: string;
  runShiftH: number;
  runDayH: number;
  runMonthH: number;
  runYearH: number;
  runTotalH: number;
}

export interface CoalPile {
  id: string;
  name: string;
  yard: string;
  zone: string;
  coalType: string;
  amountT: number;
  heatValue: number;
  moisture: number;
  sulfur: number;
  volatile: number;
  ash: number;
  tempC: number;
  stackTime: string;
  heightM: number;
  color: string;
  /** 三维场景近似坐标 */
  x: number;
  z: number;
  radius: number;
}

export interface BunkerLayer {
  batch: string;
  coalType: string;
  amountT: number;
  ratio: number;
  heightM: number;
  color: string;
  quality: string;
  loadTime: string;
  etaHours: number;
}

export interface BunkerInfo {
  id: string;
  unit: 1 | 2;
  code: string;
  levelM: number;
  capacityM: number;
  layers: BunkerLayer[];
}

export interface LoadPlan {
  id: string;
  name: string;
  pile: string;
  coalType: string;
  unit: string;
  bunker: string;
  amountT: number;
  status: string;
}

export interface UnitRuntime {
  id: 1 | 2;
  name: string;
  loadMw: number;
  todayCoalT: number;
  totalCoalT: number;
  status: string;
  mainSteamTemp: number;
  vacuum: number;
}

export const BELTS: BeltInfo[] = [
  { id: 'C31A', name: 'C31A 皮带', status: '运行', currentA: 86.2, instantTh: 420, accumT: 3120, speedMs: 2.5, coalType: '神混5500', position: 'T31→碎煤', runShiftH: 6.2, runDayH: 14.5, runMonthH: 312, runYearH: 2104, runTotalH: 18620 },
  { id: 'C31B', name: 'C31B 皮带', status: '停运', currentA: 0, instantTh: 0, accumT: 2890, speedMs: 0, coalType: '—', position: 'T31→碎煤', runShiftH: 0, runDayH: 8.1, runMonthH: 298, runYearH: 2050, runTotalH: 17980 },
  { id: 'C32A', name: 'C32A 皮带', status: '运行', currentA: 72.4, instantTh: 380, accumT: 3010, speedMs: 2.4, coalType: '神混5500', position: '煤场→T31', runShiftH: 6.0, runDayH: 13.8, runMonthH: 305, runYearH: 2088, runTotalH: 18210 },
  { id: 'C32B', name: 'C32B 皮带', status: '停运', currentA: 0, instantTh: 0, accumT: 2760, speedMs: 0, coalType: '—', position: '煤场→T31', runShiftH: 0, runDayH: 7.5, runMonthH: 280, runYearH: 1990, runTotalH: 17540 },
  { id: 'C33A', name: 'C33A 皮带', status: '运行', currentA: 91.0, instantTh: 450, accumT: 3300, speedMs: 2.5, coalType: '神混5500', position: 'T32→T33', runShiftH: 6.3, runDayH: 15.0, runMonthH: 320, runYearH: 2140, runTotalH: 19020 },
  { id: 'C33B', name: 'C33B 皮带', status: '停运', currentA: 0, instantTh: 0, accumT: 2950, speedMs: 0, coalType: '—', position: 'T32→T33', runShiftH: 0, runDayH: 6.9, runMonthH: 270, runYearH: 1920, runTotalH: 16880 },
  { id: 'C36A', name: 'C36A 皮带', status: '运行', currentA: 68.5, instantTh: 360, accumT: 2880, speedMs: 2.3, coalType: '晋煤混', position: 'T33→仓上', runShiftH: 5.8, runDayH: 12.6, runMonthH: 290, runYearH: 2010, runTotalH: 17100 },
  { id: 'C36B', name: 'C36B 皮带', status: '停运', currentA: 0, instantTh: 0, accumT: 2650, speedMs: 0, coalType: '—', position: 'T33→仓上', runShiftH: 0, runDayH: 5.5, runMonthH: 255, runYearH: 1880, runTotalH: 16240 },
  { id: 'C37A', name: 'C37A 皮带', status: '运行', currentA: 55.1, instantTh: 210, accumT: 1540, speedMs: 2.2, coalType: '神混5500', position: '犁煤器段', runShiftH: 5.5, runDayH: 11.2, runMonthH: 268, runYearH: 1955, runTotalH: 15890 },
  { id: 'C37B', name: 'C37B 皮带', status: '停运', currentA: 0, instantTh: 0, accumT: 1420, speedMs: 0, coalType: '—', position: '犁煤器段', runShiftH: 0, runDayH: 4.8, runMonthH: 240, runYearH: 1760, runTotalH: 14920 },
  { id: 'C38A', name: 'C38A 皮带', status: '运行', currentA: 48.3, instantTh: 190, accumT: 1480, speedMs: 2.1, coalType: '晋煤混', position: '犁煤器段', runShiftH: 5.4, runDayH: 10.9, runMonthH: 262, runYearH: 1930, runTotalH: 15600 },
  { id: 'C38B', name: 'C38B 皮带', status: '停运', currentA: 0, instantTh: 0, accumT: 1390, speedMs: 0, coalType: '—', position: '犁煤器段', runShiftH: 0, runDayH: 4.2, runMonthH: 228, runYearH: 1700, runTotalH: 14550 },
];

export const STACKERS: YardStacker[] = [
  { id: 'SR1', name: '#1 斗轮机', mode: '取料', emergencyStop: false, position: 'A 场东区 X=86 Y=42', boomAngle: 32, coalType: '神混5500', runShiftH: 5.6, runDayH: 12.4, runMonthH: 278, runYearH: 1890, runTotalH: 22450 },
  { id: 'SR2', name: '#2 斗轮机', mode: '待机', emergencyStop: false, position: 'B 场西区 X=24 Y=18', boomAngle: 8, coalType: '—', runShiftH: 1.2, runDayH: 6.0, runMonthH: 210, runYearH: 1560, runTotalH: 19880 },
];

export const PILES: CoalPile[] = [
  { id: 'P1', name: 'A场-东堆', yard: 'A场', zone: 'A-东', coalType: '神混5500', amountT: 28500, heatValue: 5480, moisture: 12.4, sulfur: 0.62, volatile: 28.1, ash: 18.6, tempC: 36, stackTime: '2026-06-12 09:20', heightM: 12.4, color: '#6B4F3A', x: -18, z: -8, radius: 10 },
  { id: 'P2', name: 'A场-西堆', yard: 'A场', zone: 'A-西', coalType: '晋煤混', amountT: 19200, heatValue: 5120, moisture: 11.8, sulfur: 0.78, volatile: 26.4, ash: 21.2, tempC: 34, stackTime: '2026-06-28 14:05', heightM: 9.8, color: '#5C4634', x: -6, z: 6, radius: 8 },
  { id: 'P3', name: 'B场-北堆', yard: 'B场', zone: 'B-北', coalType: '蒙煤优', amountT: 22100, heatValue: 5620, moisture: 10.9, sulfur: 0.45, volatile: 30.2, ash: 15.8, tempC: 38, stackTime: '2026-07-02 11:40', heightM: 11.1, color: '#7A5A40', x: 14, z: -4, radius: 9 },
  { id: 'P4', name: 'B场-南堆', yard: 'B场', zone: 'B-南', coalType: '神混5000', amountT: 15800, heatValue: 5010, moisture: 13.2, sulfur: 0.71, volatile: 27.0, ash: 20.4, tempC: 33, stackTime: '2026-07-10 16:15', heightM: 8.2, color: '#4E3B2C', x: 22, z: 10, radius: 7 },
];

export const BUNKERS: BunkerInfo[] = (['A', 'B', 'C', 'D', 'E', 'F'] as const).flatMap((code, i) =>
  ([1, 2] as const).map((unit) => {
    const level = 8 + ((i * 3 + unit * 2) % 7) + unit * 0.3;
    const c1 = unit === 1 ? '#5B8C3E' : '#3D7A5A';
    const c2 = unit === 1 ? '#8B6914' : '#A67C2A';
    return {
      id: `${unit}${code}`,
      unit,
      code: `${unit}${code}`,
      levelM: Number(level.toFixed(1)),
      capacityM: 16,
      layers: [
        { batch: `B2026071${unit}${i}`, coalType: i % 2 ? '晋煤混' : '神混5500', amountT: 320 + i * 40, ratio: 0.55, heightM: level * 0.55, color: c1, quality: 'Qnet 5400 / S 0.6', loadTime: '2026-07-19 08:30', etaHours: 18 + i },
        { batch: `B2026070${unit}${i}`, coalType: i % 2 ? '神混5000' : '蒙煤优', amountT: 260 + i * 20, ratio: 0.45, heightM: level * 0.45, color: c2, quality: 'Qnet 5100 / S 0.7', loadTime: '2026-07-18 22:10', etaHours: 14 + i },
      ],
    };
  }),
).sort((a, b) => a.code.localeCompare(b.code, 'zh'));

export const LOAD_PLAN: LoadPlan = {
  id: 'GXSZ-26072001',
  name: '7月20日白班加仓计划',
  pile: 'A场-东堆',
  coalType: '神混5500',
  unit: '#1 机组',
  bunker: '1A / 1B / 1C',
  amountT: 860,
  status: '执行中',
};

export const UNITS: UnitRuntime[] = [
  { id: 1, name: '#1 机组', loadMw: 598, todayCoalT: 3228.19, totalCoalT: 1284560, status: '并网运行', mainSteamTemp: 538, vacuum: -94.2 },
  { id: 2, name: '#2 机组', loadMw: 602, todayCoalT: 3186.44, totalCoalT: 1269800, status: '并网运行', mainSteamTemp: 540, vacuum: -93.8 },
];

export const BUNKER_HISTORY = [
  { time: '2026-07-20 06:15', bunker: '1A', coalType: '神混5500', amountT: 180, quality: 'Qnet 5480' },
  { time: '2026-07-20 04:40', bunker: '1B', coalType: '神混5500', amountT: 160, quality: 'Qnet 5470' },
  { time: '2026-07-19 22:10', bunker: '2C', coalType: '晋煤混', amountT: 210, quality: 'Qnet 5120' },
  { time: '2026-07-19 18:30', bunker: '1D', coalType: '蒙煤优', amountT: 140, quality: 'Qnet 5600' },
  { time: '2026-07-19 14:05', bunker: '2A', coalType: '神混5000', amountT: 195, quality: 'Qnet 5010' },
];

export const PILE_HISTORY = [
  { time: '2026-07-20 09:10', action: '取料', amountT: 420, operator: '一值' },
  { time: '2026-07-19 16:40', action: '堆料', amountT: 860, operator: '二值' },
  { time: '2026-07-18 11:20', action: '取料', amountT: 510, operator: '三值' },
  { time: '2026-07-17 20:05', action: '堆料', amountT: 1200, operator: '四值' },
];

export const CRUSHER_ALARMS = [
  { id: 'CA1', name: '碎煤机A 轴承温度高', active: false },
  { id: 'CA2', name: '碎煤机A 油位低', active: false },
  { id: 'CA3', name: '碎煤机A 振动大', active: true },
  { id: 'CB1', name: '碎煤机B 轴承温度高', active: false },
  { id: 'CB2', name: '碎煤机B 急停', active: false },
  { id: 'CB3', name: '碎煤机B 振动大', active: false },
];
