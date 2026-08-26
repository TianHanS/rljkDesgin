/**
 * 燃煤入厂登记 · 站点配置、来煤计划、预入厂车辆与现场字典
 *
 * 参考资料：
 * - 用户提供的人工入厂登记截图与功能需求
 * - /rules/design-guide.md
 */

export type PlanGetMode = 1 | 2 | 3 | 4;
export type OriginalGetMode = 1 | 2 | 3 | 4;
export type SampleEditMode = 0 | 1;
export type EntryPermit = 'forbidden' | 'allowed';
export type RecordStatus = 'registered';

export interface SiteConfig {
  id: string;
  name: string;
  GET_PLAN_MSG: PlanGetMode;
  GET_ORIGINAL_MSG: OriginalGetMode;
  SAMPLE_MEASURE_EDIT: SampleEditMode;
  ENABLE_ENTER_CARD: boolean;
}

export interface CoalPlan {
  id: string;
  serialNo: string;
  taskNo: string;
  plate: string;
  supplier: string;
  mine: string;
  coalType: string;
  transporter: string;
  unloadArea: string;
  productName: string;
  shipTime: string;
  station: string;
  gross: number;
  tare: number;
  net: number;
}

export interface PreEntryVehicle {
  plate: string;
  planId: string;
  permit: EntryPermit;
  preEntryAt: string;
  vehicleCard: string;
  entryCard: string;
}

export interface EntryRecord {
  id: string;
  serialNo: string;
  plate: string;
  supplier: string;
  mine: string;
  coalType: string;
  sampleMethod: string;
  net: number;
  weighPos: string;
  samplePos: string;
  enterAt: string;
  status: RecordStatus;
  entryCard: string;
  siteId: string;
}

export const SITES: SiteConfig[] = [
  {
    id: 'south',
    name: '南门入厂点',
    GET_PLAN_MSG: 1,
    GET_ORIGINAL_MSG: 3,
    SAMPLE_MEASURE_EDIT: 1,
    ENABLE_ENTER_CARD: true,
  },
  {
    id: 'north',
    name: '北门入厂点',
    GET_PLAN_MSG: 3,
    GET_ORIGINAL_MSG: 1,
    SAMPLE_MEASURE_EDIT: 0,
    ENABLE_ENTER_CARD: false,
  },
  {
    id: 'east',
    name: '东门入厂点',
    GET_PLAN_MSG: 4,
    GET_ORIGINAL_MSG: 2,
    SAMPLE_MEASURE_EDIT: 1,
    ENABLE_ENTER_CARD: true,
  },
  {
    id: 'west',
    name: '西门入厂点',
    GET_PLAN_MSG: 2,
    GET_ORIGINAL_MSG: 4,
    SAMPLE_MEASURE_EDIT: 1,
    ENABLE_ENTER_CARD: true,
  },
];

export const PLAN_MODE_LABEL: Record<PlanGetMode, string> = {
  1: '人工选择计划',
  2: '扫描计划二维码',
  3: '按车牌匹配计划',
  4: '读矿发卡',
};

export const ORIGINAL_MODE_LABEL: Record<OriginalGetMode, string> = {
  1: '获取预入厂信息',
  2: '从矿发卡读取',
  3: '人工按送货单录入',
  4: '扫描云驿二维码',
};

export const TRANSPORTERS = ['蒙东物流', '鄂尔多斯汽运', '湘赣联运', '桂海运输', '神华物流'];
export const SAMPLE_METHODS = ['机械采样', '人工采样'];
export const SAMPLE_POSITIONS = ['1#机械采样机', '2#机械采样机', '人工采样棚'];
export const WEIGH_POSITIONS = ['1#汽车衡', '2#汽车衡', '3#汽车衡'];
export const UNLOAD_AREAS = ['#1 圆形煤场', '#2 圆形煤场', '厂外中转煤场'];

export const PLANS: CoalPlan[] = [
  {
    id: '831103931018260480',
    serialNo: 'JH20260825001',
    taskNo: 'YS20260825088',
    plate: '蒙A90005',
    supplier: '神华销售集团',
    mine: '补连塔矿',
    coalType: '神混1',
    transporter: '蒙东物流',
    unloadArea: '#1 圆形煤场',
    productName: '动力煤',
    shipTime: '2026-08-25 07:40:00',
    station: '东胜站',
    gross: 105,
    tare: 13,
    net: 92,
  },
  {
    id: '831103931018260481',
    serialNo: 'JH20260825002',
    taskNo: 'YS20260825091',
    plate: '湘C92223',
    supplier: '伊泰煤炭股份',
    mine: '酸刺沟矿',
    coalType: '准格尔',
    transporter: '湘赣联运',
    unloadArea: '#2 圆形煤场',
    productName: '动力煤',
    shipTime: '2026-08-25 08:05:00',
    station: '准格尔站',
    gross: 98.6,
    tare: 14.2,
    net: 84.4,
  },
  {
    id: '831103931018260482',
    serialNo: 'JH20260825003',
    taskNo: 'YS20260825102',
    plate: '桂A8T216',
    supplier: '大唐燃料有限公司',
    mine: '红沙泉矿',
    coalType: '蒙煤',
    transporter: '桂海运输',
    unloadArea: '厂外中转煤场',
    productName: '动力煤',
    shipTime: '2026-08-25 06:50:00',
    station: '乌海西',
    gross: 87,
    tare: 12.5,
    net: 74.5,
  },
  {
    id: '831103931018260483',
    serialNo: 'JH20260825004',
    taskNo: 'YS20260825110',
    plate: '鲁B12876',
    supplier: '国家能源销售',
    mine: '哈尔乌素矿',
    coalType: '神混1',
    transporter: '神华物流',
    unloadArea: '#1 圆形煤场',
    productName: '动力煤',
    shipTime: '2026-08-25 09:12:00',
    station: '薛家湾',
    gross: 110,
    tare: 15,
    net: 95,
  },
];

export const PRE_ENTRIES: PreEntryVehicle[] = [
  {
    plate: '蒙A90005',
    planId: '831103931018260480',
    permit: 'forbidden',
    preEntryAt: '2026-08-25 09:02:18',
    vehicleCard: 'VC-90005',
    entryCard: '',
  },
  {
    plate: '湘C92223',
    planId: '831103931018260481',
    permit: 'forbidden',
    preEntryAt: '2026-08-25 09:18:41',
    vehicleCard: 'VC-92223',
    entryCard: 'YC-TMP-8821',
  },
  {
    plate: '桂A8T216',
    planId: '831103931018260482',
    permit: 'allowed',
    preEntryAt: '2026-08-25 08:40:05',
    vehicleCard: 'VC-8T216',
    entryCard: 'YC-FIX-1107',
  },
];

export const INITIAL_RECORDS: EntryRecord[] = [
  {
    id: 'R1001',
    serialNo: 'RCJ202608250018',
    plate: '桂A8T216',
    supplier: '大唐燃料有限公司',
    mine: '红沙泉矿',
    coalType: '蒙煤',
    sampleMethod: '机械采样',
    net: 74.5,
    weighPos: '2#汽车衡',
    samplePos: '1#机械采样机',
    enterAt: '2026-08-25 08:46:22',
    status: 'registered',
    entryCard: 'YC-FIX-1107',
    siteId: 'south',
  },
  {
    id: 'R1000',
    serialNo: 'RCJ202608250012',
    plate: '鲁B12876',
    supplier: '国家能源销售',
    mine: '哈尔乌素矿',
    coalType: '神混1',
    sampleMethod: '机械采样',
    net: 95,
    weighPos: '1#汽车衡',
    samplePos: '2#机械采样机',
    enterAt: '2026-08-25 07:21:09',
    status: 'registered',
    entryCard: 'YC-FIX-1094',
    siteId: 'south',
  },
];

export const findPlan = (id: string) => PLANS.find((p) => p.id === id);
export const findPlanByPlate = (plate: string) =>
  PLANS.find((p) => p.plate.replace(/\s/g, '') === plate.replace(/\s/g, ''));
export const findPreEntry = (plate: string) =>
  PRE_ENTRIES.find((p) => p.plate.replace(/\s/g, '') === plate.replace(/\s/g, ''));

/** 按车牌查询计划与预入厂记录 */
export const lookupVehicleByPlate = (plate: string) => {
  const key = plate.trim().replace(/\s/g, '');
  if (!key) return null;
  const pre = findPreEntry(plate);
  const plan = pre ? findPlan(pre.planId) : findPlanByPlate(plate);
  if (!plan) return null;
  return { plan, pre: pre ?? null };
};

export const isKnownPlate = (plate: string) => !!lookupVehicleByPlate(plate);

/** 输入三位及以上时，按车牌前缀/包含关系联想候选 */
export const searchPlates = (query: string) => {
  const key = query.trim().replace(/\s/g, '').toUpperCase();
  if (key.length < 3) return [];
  const hits = new Set<string>();
  for (const plan of PLANS) {
    const plate = plan.plate.replace(/\s/g, '').toUpperCase();
    if (plate.includes(key)) hits.add(plan.plate);
  }
  for (const pre of PRE_ENTRIES) {
    const plate = pre.plate.replace(/\s/g, '').toUpperCase();
    if (plate.includes(key)) hits.add(pre.plate);
  }
  return Array.from(hits);
};

export const nextSerial = (records: EntryRecord[]) => {
  const seq = records.length + 19;
  return `RCJ20260825${String(seq).padStart(4, '0')}`;
};

export const yunyiSample = (now = new Date()) => {
  const plan = PLANS[0];
  const stamp = formatStamp(now);
  return [
    plan.serialNo,
    plan.taskNo,
    plan.plate,
    plan.shipTime.slice(0, 16),
    plan.gross,
    plan.tare,
    plan.net,
    plan.id,
    stamp,
    plan.shipTime,
  ].join('|');
};

export const yunyiExpiredSample = () => {
  const plan = PLANS[1];
  const expired = new Date(Date.now() - 20 * 60 * 1000);
  return [
    plan.serialNo,
    plan.taskNo,
    plan.plate,
    plan.shipTime.slice(0, 16),
    plan.gross,
    plan.tare,
    plan.net,
    plan.id,
    formatStamp(expired),
    plan.shipTime,
  ].join('|');
};

export const mineCardSample = (plate = '蒙A90005') => {
  const plan = findPlanByPlate(plate) ?? PLANS[0];
  return `${plate}OreadWriteOaObO${plan.plate}O${plan.id}O${plan.gross}O${plan.tare}O`;
};

export const formatStamp = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}`;
};
