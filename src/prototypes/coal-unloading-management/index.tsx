/**
 * @name 卸煤管理
 * @mode axure
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /skills/axure-export-workflow/SKILL.md
 * - /rules/design-guide.md
 * - 新增卸煤计划（入厂登记 / 计划信息 / 堆煤方案）
 * - 创建堆煤方案：多选分区按剩余容量分配卸煤量
 * - 卸煤计划完结：三步确认明细 / 分区分配 / 完结上传 MIS
 */
import React, { useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  ConfigProvider,
  DatePicker,
  Drawer,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  message,
} from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import './style.css';

const { RangePicker } = DatePicker;
const YARD_NAME = '一号圆形煤场';
const YARD_NAME_2 = '二号圆形煤场';
const YARD_NAMES = [YARD_NAME, YARD_NAME_2];
const DEFAULT_CAPACITY = 5000;
const ROUND = (n: number) => Math.round(n * 1000) / 1000;

const YardTag: React.FC<{ yard: string }> = ({ yard }) => {
  const isYard1 = yard === YARD_NAME;
  return (
    <span className={`cum-yard-tag ${isYard1 ? 'is-y1' : 'is-y2'}`} title={yard}>
      <i className="cum-yard-dot" />
      {isYard1 ? '一号煤场' : '二号煤场'}
    </span>
  );
};

type UnloadStatus = '待卸煤' | '正在卸煤' | '卸煤中断' | '已卸煤';
type AuditStatus = '编辑中' | '审核通过' | '驳回' | '输煤专工审批';

interface PartitionCfg {
  yard: string;
  zone: number;
  /** 容量上限；undefined/null 表示取默认 5000 */
  capacity?: number | null;
  stock: number;
  moisture: number;
  heat: number;
  volatile: number;
  sulfur: number;
  ash: number;
}

interface StackRow {
  key: string;
  yard: string;
  zone: number;
  planTon: number | null;
  capacity: number;
  stock: number;
  remain: number;
  allocTon: number;
  weightPct: number;
  /** 堆煤后是否可能超出分区容量上限 */
  overflow?: boolean;
}

const DEFAULT_OPERATOR = '张工';

/** 字典 CoalRealunloadMethod */
type RealUnloadMethod =
  | 'CoalRealUnloadMethod_1'
  | 'CoalRealUnloadMethod_2'
  | 'CoalRealUnloadMethod_3';

const REAL_UNLOAD_METHODS: { value: RealUnloadMethod; label: string }[] = [
  { value: 'CoalRealUnloadMethod_1', label: '皮带卸煤' },
  { value: 'CoalRealUnloadMethod_2', label: '上煤' },
  { value: 'CoalRealUnloadMethod_3', label: '人工填报' },
];

const methodLabel = (code: RealUnloadMethod) =>
  REAL_UNLOAD_METHODS.find((m) => m.value === code)?.label || code;

const INBOUND_SCALES = ['A入厂皮带秤', 'B入厂皮带秤'];
const BUNKER_OPTIONS = [
  '1号上煤煤仓',
  '2号上煤煤仓',
  '3号上煤煤仓',
  '4号上煤煤仓',
  '5号上煤煤仓',
  '6号上煤煤仓',
];

interface InboundRow {
  key: string;
  /** 卸煤类型（字典） */
  method: RealUnloadMethod;
  /** 计量皮带秤；类型=1 时必填 */
  scale: string | null;
  /** 入库煤场 */
  yard: string;
  /** 上煤煤仓；类型=2 时必填 */
  bunkers: string[];
  startTime: string;
  endTime: string;
  /** 卸煤量(t) */
  ton: number;
  /** 创建人 */
  creator: string;
  /** 创建时间 */
  createTime: string;
}

/** 原型模拟：按皮带秤 + 时间段估算卸煤量 */
const fetchScaleTonByPeriod = (scale: string, startTime: string, endTime: string) => {
  const start = dayjs(startTime);
  const end = dayjs(endTime);
  const hours = Math.max(end.diff(start, 'hour', true), 0);
  const bias = scale.includes('A') ? 1248.6 : 1116.4;
  return ROUND(hours * bias + (start.minute() % 17) * 3.5);
};

/** 时间段是否重叠（开闭区间：相交即冲突） */
const timeRangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
  const as = dayjs(aStart);
  const ae = dayjs(aEnd);
  const bs = dayjs(bStart);
  const be = dayjs(bEnd);
  return as.isBefore(be) && bs.isBefore(ae);
};

interface PlanRow {
  id: string;
  name: string;
  planNo: string;
  regNo: string;
  ship: string;
  voyage: string;
  startDate: string;
  unloadStatus: UnloadStatus;
  auditStatus: AuditStatus;
  supplier: string;
  coal: string;
  coalType: string;
  waybillTon: number;
  price: number;
  arriveTime: string;
  planTon: number;
  unloadType: string;
  scale: string;
  remark: string;
  inbound: InboundRow[];
  stack: Omit<StackRow, 'capacity' | 'stock' | 'remain' | 'allocTon' | 'weightPct'>[];
}

interface EntryBatch {
  id: string;
  regNo: string;
  supplier: string;
  coal: string;
  coalType: string;
  waybillTon: number;
  ship: string;
  voyage: string;
  arriveTime: string;
  price: number;
}

interface CreateDraft {
  regNo: string;
  supplier: string;
  ship: string;
  voyage: string;
  coal: string;
  coalType: string;
  waybillTon: number;
  price: number;
  arriveTime: string;
  name: string;
  startTime: Dayjs | null;
  endTime: Dayjs | null;
  planTon: number;
  unloadType: string;
  remark: string;
  stack: Omit<StackRow, 'capacity' | 'stock' | 'remain' | 'allocTon' | 'weightPct'>[];
}

const emptyCreateDraft = (): CreateDraft => ({
  regNo: '',
  supplier: '',
  ship: '',
  voyage: '',
  coal: '',
  coalType: '',
  waybillTon: 0,
  price: 0,
  arriveTime: '',
  name: '',
  startTime: null,
  endTime: null,
  planTon: 0,
  unloadType: '',
  remark: '',
  stack: [],
});

/* ===== 两个煤场各 36 分区 mock：部分有配置容量，其余默认 5000 ===== */
const PARTITION_CFG: PartitionCfg[] = YARD_NAMES.flatMap((yard, yardIndex) =>
  Array.from({ length: 36 }, (_, i) => {
    const zone = i + 1;
    const stockBase = [800, 1200, 2100, 3500, 4200, 4800, 1500, 900, 600, 3000, 1800, 2500][
      (i + yardIndex * 3) % 12
    ];
    const capacity =
      zone % 7 === 0 ? null : zone % 5 === 0 ? 6000 : zone % 4 === 0 ? 4500 : undefined;
    return {
      yard,
      zone,
      capacity,
      stock: stockBase + (zone % 3) * 100 + yardIndex * 150,
      moisture: ROUND(8.2 + (zone % 10) * 0.35 + (zone % 3) * 0.12 + yardIndex * 0.18),
      heat: 4800 + (zone % 12) * 35 + (zone % 5) * 10 + yardIndex * 20,
      volatile: ROUND(17.5 + (zone % 8) * 0.42 + yardIndex * 0.2),
      sulfur: ROUND(0.32 + (zone % 7) * 0.05),
      ash: ROUND(26.5 + (zone % 9) * 0.55 + yardIndex * 0.25),
    };
  }),
);

const partitionKey = (yard: string, zone: number) => `${yard}-${zone}`;

const getPartition = (yard: string, zone: number) =>
  PARTITION_CFG.find((p) => p.yard === yard && p.zone === zone);

const getCapacity = (yard: string, zone: number) => {
  const cfg = getPartition(yard, zone);
  const cap = cfg?.capacity;
  return cap == null ? DEFAULT_CAPACITY : cap;
};

const getStock = (yard: string, zone: number) => getPartition(yard, zone)?.stock ?? 0;

const enrichStack = (
  rows: Omit<StackRow, 'capacity' | 'stock' | 'remain' | 'allocTon' | 'weightPct'>[],
  allocMap?: Record<string, number>,
): StackRow[] =>
  rows.map((r) => {
    const capacity = getCapacity(r.yard, r.zone);
    const stock = getStock(r.yard, r.zone);
    const remain = capacity - stock;
    const key = r.key || `${r.yard}-${r.zone}`;
    return {
      ...r,
      key,
      capacity,
      stock,
      remain,
      allocTon: allocMap?.[key] ?? 0,
      weightPct: 0,
    };
  });

/** 新增堆煤方案：按剩余容量权重分摊计划卸煤量；结果取整，余数记入最后一区 */
const allocateTotalByRemain = (
  rows: StackRow[],
  totalTon: number,
): StackRow[] => {
  if (!rows.length) return [];
  const next = rows.map((s) => ({ ...s }));
  const total = Math.round(ROUND(totalTon));
  const bases = next.map((r) => Math.max(r.remain, 0));
  const baseSum = bases.reduce((a, b) => a + b, 0);

  if (total <= 0) {
    return next.map((r) => ({
      ...r,
      planTon: 0,
      weightPct: 0,
      overflow: r.stock > r.capacity,
    }));
  }

  let used = 0;
  const amounts = next.map((_, k) => {
    if (k === next.length - 1) {
      return Math.max(total - used, 0);
    }
    const raw =
      baseSum > 0 ? (total * bases[k]) / baseSum : total / next.length;
    const val = Math.floor(raw);
    used += val;
    return val;
  });

  return next.map((r, k) => {
    const planTon = amounts[k];
    return {
      ...r,
      planTon,
      weightPct: total > 0 ? ROUND((planTon / total) * 100) : 0,
      overflow: r.stock + planTon > r.capacity,
    };
  });
};

const ENTRY_BATCHES: EntryBatch[] = [
  {
    id: 'b1',
    regNo: 'gxsz-2026-054RCDJ2026073102',
    supplier: '江苏国信能源销售有限公司',
    coal: '国信1-5000',
    coalType: '4500-5000kcal/kg',
    waybillTon: 61508,
    ship: '恒荣江海',
    voyage: '2611',
    arriveTime: '2026-07-31 08:20:00',
    price: 680,
  },
  {
    id: 'b2',
    regNo: 'gxsz-2026-054RCDJ2026073001',
    supplier: '江苏国信能源销售有限公司',
    coal: '国信1-5000',
    coalType: '4500-5000kcal/kg',
    waybillTon: 41964,
    ship: '华盛116',
    voyage: '2615',
    arriveTime: '2026-07-30 14:10:00',
    price: 675,
  },
  {
    id: 'b3',
    regNo: 'gxsz-2026-054RCDJ2026072903',
    supplier: '江苏国信能源销售有限公司',
    coal: '国信1-4500',
    coalType: '4500-5000kcal/kg',
    waybillTon: 34000,
    ship: '鹏安',
    voyage: '2609',
    arriveTime: '2026-07-29 09:40:00',
    price: 660,
  },
  {
    id: 'b4',
    regNo: 'gxsz-2026-042RCDJ2026061701',
    supplier: '江苏国信能源销售有限公司',
    coal: '国信1-4500',
    coalType: '4500-5000kcal/kg',
    waybillTon: 49936,
    ship: '新一海17',
    voyage: '2613',
    arriveTime: '2026-06-17 09:06:00',
    price: 670,
  },
  {
    id: 'b5',
    regNo: 'gxsz-2026-054RCDJ2026080101',
    supplier: '江苏国信能源销售有限公司',
    coal: '神华混煤',
    coalType: '4800-5200kcal/kg',
    waybillTon: 52800,
    ship: '江海通达',
    voyage: '2618',
    arriveTime: '2026-08-01 11:30:00',
    price: 700,
  },
  {
    id: 'b6',
    regNo: 'gxsz-2026-054RCDJ2026072802',
    supplier: '江苏国信能源销售有限公司',
    coal: '印尼褐煤',
    coalType: '3800-4200kcal/kg',
    waybillTon: 28650,
    ship: '海远9',
    voyage: '2607',
    arriveTime: '2026-07-28 16:00:00',
    price: 560,
  },
  {
    id: 'b7',
    regNo: 'gxsz-2026-054RCDJ2026072701',
    supplier: '江苏国信能源销售有限公司',
    coal: '晋北贫瘦煤',
    coalType: '5000-5500kcal/kg',
    waybillTon: 37220,
    ship: '苏电5号',
    voyage: '2610',
    arriveTime: '2026-07-27 10:15:00',
    price: 730,
  },
  {
    id: 'b8',
    regNo: 'gxsz-2026-054RCDJ2026072604',
    supplier: '江苏国信能源销售有限公司',
    coal: '澳洲烟煤',
    coalType: '5500-5800kcal/kg',
    waybillTon: 30110,
    ship: '远航18',
    voyage: '2606',
    arriveTime: '2026-07-26 13:50:00',
    price: 790,
  },
  {
    id: 'b9',
    regNo: 'gxsz-2026-054RCDJ2026072501',
    supplier: '江苏国信能源销售有限公司',
    coal: '国信混煤',
    coalType: '4500-5000kcal/kg',
    waybillTon: 45500,
    ship: '通江3',
    voyage: '2605',
    arriveTime: '2026-07-25 08:05:00',
    price: 655,
  },
  {
    id: 'b10',
    regNo: 'gxsz-2026-054RCDJ2026072402',
    supplier: '江苏国信能源销售有限公司',
    coal: '国信1-5000',
    coalType: '4500-5000kcal/kg',
    waybillTon: 39880,
    ship: '海顺',
    voyage: '2604',
    arriveTime: '2026-07-24 17:40:00',
    price: 685,
  },
];

const STATUS_COLOR: Record<UnloadStatus, string> = {
  待卸煤: 'orange',
  正在卸煤: 'processing',
  卸煤中断: 'error',
  已卸煤: 'cyan',
};

const INIT_PLANS: PlanRow[] = [
  {
    id: '1',
    name: '2616-2026072901卸煤作业',
    planNo: '2616-2026072901',
    regNo: 'gxsz-2026-054RCDJ2026072802',
    ship: '',
    voyage: '',
    startDate: '2026-07-29',
    unloadStatus: '待卸煤',
    auditStatus: '审核通过',
    supplier: '江苏国信能源销售有限公司',
    coal: '国信混煤',
    coalType: '4500-5000kcal/kg',
    waybillTon: 48000,
    price: 650,
    arriveTime: '2026-07-28 10:00:00',
    planTon: 48000,
    unloadType: '皮带卸煤（煤场）',
    scale: 'A入厂皮带秤',
    remark: '',
    inbound: [],
    stack: [
      { key: 'y1-10', yard: YARD_NAME, zone: 10, planTon: 20000 },
      { key: 'y1-11', yard: YARD_NAME, zone: 11, planTon: 28000 },
    ],
  },
  {
    id: '2',
    name: '2613-PD2026061801皮带卸煤作业',
    planNo: '2613-PD2026061801',
    regNo: 'gxsz-2026-042RCDJ2026061701',
    ship: '新一海17',
    voyage: '2613',
    startDate: '2026-06-18',
    unloadStatus: '卸煤中断',
    auditStatus: '审核通过',
    supplier: '江苏国信能源销售有限公司',
    coal: '国信1-4500',
    coalType: '4500-5000kcal/kg',
    waybillTon: 49936,
    price: 670,
    arriveTime: '2026-06-17 09:06:00',
    planTon: 49936,
    unloadType: '皮带卸煤（煤场）',
    scale: 'A入厂皮带秤',
    remark: '',
    inbound: [
      {
        key: 'ib-1',
        method: 'CoalRealUnloadMethod_1',
        scale: 'A入厂皮带秤',
        startTime: '2026-06-18 17:40:00',
        endTime: '2026-06-19 08:20:00',
        yard: YARD_NAME,
        bunkers: [],
        ton: 18425.5,
        creator: '李运维',
        createTime: '2026-06-19 08:25:00',
      },
      {
        key: 'ib-2',
        method: 'CoalRealUnloadMethod_1',
        scale: 'B入厂皮带秤',
        startTime: '2026-06-19 08:30:00',
        endTime: '2026-06-19 20:10:00',
        yard: YARD_NAME,
        bunkers: [],
        ton: 16817.25,
        creator: '李运维',
        createTime: '2026-06-19 20:15:00',
      },
      {
        key: 'ib-3',
        method: 'CoalRealUnloadMethod_3',
        scale: null,
        startTime: '2026-06-19 20:20:00',
        endTime: '2026-06-20 06:15:00',
        yard: YARD_NAME_2,
        bunkers: [],
        ton: 14718.125,
        creator: '王值长',
        createTime: '2026-06-20 06:30:00',
      },
    ],
    // 预置两个煤场合计 12 个分区的堆煤方案
    stack: [
      ...[3, 5, 7, 8, 10, 11, 12].map((zone, idx) => ({
        key: `y1-${zone}`,
        yard: YARD_NAME,
        zone,
        planTon: idx < 2 ? (idx === 0 ? 18000 : 17242.75) : null,
      })),
      ...[2, 4, 6, 9, 13].map((zone, idx) => ({
        key: `y2-${zone}`,
        yard: YARD_NAME_2,
        zone,
        planTon: idx === 0 ? 14718.125 : null,
      })),
    ],
  },
  {
    id: '3',
    name: '2614-2026062001卸煤作业',
    planNo: '2614-2026062001',
    regNo: 'gxsz-2026-054RCDJ2026061901',
    ship: '',
    voyage: '',
    startDate: '2026-06-20',
    unloadStatus: '待卸煤',
    auditStatus: '审核通过',
    supplier: '江苏国信能源销售有限公司',
    coal: '印尼褐煤',
    coalType: '3800-4200kcal/kg',
    waybillTon: 52000,
    price: 580,
    arriveTime: '2026-06-19 14:00:00',
    planTon: 52000,
    unloadType: '皮带卸煤（煤场）',
    scale: 'A入厂皮带秤',
    remark: '',
    inbound: [],
    stack: [{ key: 'y1-1', yard: YARD_NAME, zone: 1, planTon: 52000 }],
  },
  {
    id: '4',
    name: '2612-2026061501卸煤作业',
    planNo: '2612-2026061501',
    regNo: 'gxsz-2026-054RCDJ2026061401',
    ship: '苏电3号',
    voyage: '2612',
    startDate: '2026-06-15',
    unloadStatus: '已卸煤',
    auditStatus: '审核通过',
    supplier: '江苏国信能源销售有限公司',
    coal: '晋北贫瘦煤',
    coalType: '5000-5500kcal/kg',
    waybillTon: 33000,
    price: 720,
    arriveTime: '2026-06-14 09:00:00',
    planTon: 33000,
    unloadType: '皮带卸煤（煤场）',
    scale: 'B入厂皮带秤',
    remark: '',
    inbound: [],
    stack: [],
  },
  {
    id: '5',
    name: '2611-2026061001卸煤作业',
    planNo: '2611-2026061001',
    regNo: 'gxsz-2026-054RCDJ2026060901',
    ship: '',
    voyage: '',
    startDate: '2026-06-10',
    unloadStatus: '已卸煤',
    auditStatus: '审核通过',
    supplier: '江苏国信能源销售有限公司',
    coal: '神华混煤',
    coalType: '4800-5200kcal/kg',
    waybillTon: 41000,
    price: 690,
    arriveTime: '2026-06-09 11:20:00',
    planTon: 41000,
    unloadType: '皮带卸煤（煤场）',
    scale: 'A入厂皮带秤',
    remark: '',
    inbound: [],
    stack: [],
  },
  {
    id: '6',
    name: '2609-2026052801卸煤作业',
    planNo: '2609-2026052801',
    regNo: 'gxsz-2026-054RCDJ2026052701',
    ship: '',
    voyage: '',
    startDate: '2026-05-28',
    unloadStatus: '卸煤中断',
    auditStatus: '驳回',
    supplier: '江苏国信能源销售有限公司',
    coal: '澳洲烟煤',
    coalType: '5500-5800kcal/kg',
    waybillTon: 28000,
    price: 780,
    arriveTime: '2026-05-27 16:00:00',
    planTon: 28000,
    unloadType: '皮带卸煤（煤场）',
    scale: 'A入厂皮带秤',
    remark: '',
    inbound: [
      {
        key: 'ib-x1',
        method: 'CoalRealUnloadMethod_1',
        scale: 'A入厂皮带秤',
        startTime: '2026-05-28 08:00:00',
        endTime: '2026-05-28 18:00:00',
        yard: YARD_NAME,
        bunkers: [],
        ton: 12500,
        creator: '赵值班',
        createTime: '2026-05-28 18:10:00',
      },
    ],
    stack: [4, 6, 9, 13, 15, 17, 19, 21, 23, 24].map((zone) => ({
      key: `y1-${zone}`,
      yard: YARD_NAME,
      zone,
      planTon: null,
    })),
  },
];

const Component: React.FC = () => {
  const [plans, setPlans] = useState<PlanRow[]>(INIT_PLANS);
  const [keyword, setKeyword] = useState({ planNo: '', planName: '', regNo: '' });

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inbound, setInbound] = useState<InboundRow[]>([]);
  const [stack, setStack] = useState<StackRow[]>([]);
  const [remark, setRemark] = useState('');
  const [pickedZones, setPickedZones] = useState<string[]>([]);
  const [onlySelected, setOnlySelected] = useState(true);
  const [planTonSeed, setPlanTonSeed] = useState<Record<string, number | null>>({});
  const [step2YardFilter, setStep2YardFilter] = useState<string | undefined>(undefined);
  const [step2ZoneFilter, setStep2ZoneFilter] = useState('');
  const [inboundDrawerOpen, setInboundDrawerOpen] = useState(false);
  const [inboundEditKey, setInboundEditKey] = useState<string | null>(null);
  const [inboundDraft, setInboundDraft] = useState<InboundRow>({
    key: '',
    method: 'CoalRealUnloadMethod_1',
    scale: 'A入厂皮带秤',
    startTime: dayjs().subtract(8, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    endTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    yard: YARD_NAME,
    bunkers: [],
    ton: 0,
    creator: DEFAULT_OPERATOR,
    createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  });
  /** 皮带秤时段冲突校验结果 */
  const [scaleConflict, setScaleConflict] = useState<string | null>(null);
  /** 新增皮带卸煤时是否已按时段估算煤量 */
  const [beltAutoFetched, setBeltAutoFetched] = useState(false);

  /** 新增卸煤计划 */
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>(emptyCreateDraft);
  const [batchPickerOpen, setBatchPickerOpen] = useState(false);
  const [batchPickId, setBatchPickId] = useState<string | null>(null);
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [schemeSelected, setSchemeSelected] = useState<string[]>([]);
  const [schemeRows, setSchemeRows] = useState<StackRow[]>([]);
  const [schemeOnlySelected, setSchemeOnlySelected] = useState(false);
  const [schemeYardFilter, setSchemeYardFilter] = useState<string | undefined>(undefined);

  const activePlan = plans.find((p) => p.id === activeId) ?? null;

  const yardTotals = useMemo(() => {
    const map: Record<string, number> = {};
    inbound.forEach((r) => {
      map[r.yard] = ROUND((map[r.yard] ?? 0) + (r.ton || 0));
    });
    return map;
  }, [inbound]);

  const grandInbound = useMemo(
    () => ROUND(Object.values(yardTotals).reduce((a, b) => a + b, 0)),
    [yardTotals],
  );

  const yardAllocSum = useMemo(
    () => ROUND(stack.reduce((a, s) => a + (s.allocTon || 0), 0)),
    [stack],
  );

  /** 完结分配目标总量：与取整规则对齐 */
  const finishTargetTon = useMemo(() => Math.round(grandInbound), [grandInbound]);

  const finishHasOverflow = useMemo(
    () => stack.some((s) => Boolean(s.overflow)),
    [stack],
  );

  const balanceOk =
    finishTargetTon > 0 &&
    stack.length > 0 &&
    Math.abs(yardAllocSum - finishTargetTon) < 0.001;

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      if (keyword.planNo && !p.planNo.includes(keyword.planNo)) return false;
      if (keyword.planName && !p.name.includes(keyword.planName)) return false;
      return true;
    });
  }, [plans, keyword]);

  const canFinishStatus = (plan: PlanRow, hasInbound: boolean) =>
    plan.unloadStatus === '卸煤中断' ||
    (plan.unloadStatus === '待卸煤' && hasInbound);

  const openFinish = (plan: PlanRow) => {
    if (plan.unloadStatus !== '卸煤中断' && plan.unloadStatus !== '待卸煤') {
      message.error('卸煤状态异常，请先中断卸煤！');
      return;
    }
    setActiveId(plan.id);
    setRemark(plan.remark);
    const ib = plan.inbound.map((r) => ({ ...r }));
    setInbound(ib);

    const normalizedStack = plan.stack.map((s) => ({
      ...s,
      key: partitionKey(s.yard, s.zone),
    }));
    const enriched = enrichStack(normalizedStack);
    setStack(enriched.map((s) => ({ ...s, allocTon: 0, weightPct: 0, overflow: false })));
    setPlanTonSeed(
      Object.fromEntries(
        normalizedStack.map((s) => [s.key, s.planTon]),
      ),
    );
    setPickedZones(normalizedStack.map((s) => s.key).sort());
    setOnlySelected(true);
    setStep2YardFilter(undefined);
    setStep2ZoneFilter('');
    setStep(0);
    setOpen(true);
  };

  const closeDrawer = () => {
    setOpen(false);
    setStep(0);
  };

  const applyFinishAllocation = (rows: StackRow[], total: number) => {
    const allocated = allocateTotalByRemain(rows, total);
    return allocated.map((r) => ({
      ...r,
      allocTon: r.planTon ?? 0,
    }));
  };

  const goNext = () => {
    if (step === 0) {
      if (!inbound.length || grandInbound <= 0) {
        message.warning('卸煤量为 0，无法完结计划；请先维护卸煤记录且总量大于 0');
        return;
      }
      if (!stack.length) {
        message.warning('当前计划无堆煤方案分区，请至少在下一步勾选分区');
      }
      const nextStack = applyFinishAllocation(stack, finishTargetTon);
      setStack(nextStack);
      if (nextStack.some((r) => r.overflow)) {
        message.warning('可能超出分区容量');
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!stack.length) {
        message.warning('请至少选择一个堆煤分区');
        return;
      }
      if (!balanceOk) {
        message.error('入库明细明细与总量不一致！请确认！');
        return;
      }
      if (activePlan && !canFinishStatus(activePlan, inbound.length > 0)) {
        message.error('卸煤状态异常，请先中断卸煤！');
        return;
      }
      setStep(2);
    }
  };

  const goPrev = () => setStep((s) => Math.max(0, s - 1));

  const redistribute = () => {
    if (!stack.length) {
      message.warning('请先勾选实际堆煤分区');
      return;
    }
    if (finishTargetTon <= 0) {
      message.warning('卸煤总量无效');
      return;
    }
    const next = applyFinishAllocation(stack, finishTargetTon);
    setStack(next);
    if (next.some((r) => r.overflow)) {
      message.warning('可能超出分区容量');
    } else {
      message.success('已按卸煤总量重新计算各分区入库量');
    }
  };

  const applyPickedZones = (keys: string[]) => {
    const sortedKeys = keys.map(String).sort();
    setPickedZones(sortedKeys);
    const planMap = {
      ...planTonSeed,
      ...Object.fromEntries(stack.map((s) => [partitionKey(s.yard, s.zone), s.planTon])),
    };
    const next = enrichStack(
      sortedKeys
        .map((key) => PARTITION_CFG.find((p) => partitionKey(p.yard, p.zone) === key))
        .filter((p): p is PartitionCfg => Boolean(p))
        .sort(
          (a, b) =>
            YARD_NAMES.indexOf(a.yard) - YARD_NAMES.indexOf(b.yard) || a.zone - b.zone,
        )
        .map((p) => ({
          key: partitionKey(p.yard, p.zone),
          yard: p.yard,
          zone: p.zone,
          planTon: planMap[partitionKey(p.yard, p.zone)] ?? null,
        })),
    ).map((s) => ({ ...s, allocTon: 0, weightPct: 0, overflow: false }));
    setStack(next);
  };

  const updateAlloc = (key: string, ton: number | null) => {
    const val = Math.max(0, Math.round(ton ?? 0));
    setStack((prev) => {
      const patched = prev.map((s) =>
        s.key === key
          ? {
              ...s,
              allocTon: val,
              planTon: val,
              overflow: s.stock + val > s.capacity,
            }
          : s,
      );
      return patched.map((s) => ({
        ...s,
        weightPct: finishTargetTon > 0 ? ROUND((s.allocTon / finishTargetTon) * 100) : 0,
      }));
    });
  };

  const emptyInboundDraft = (): InboundRow => {
    const startTime = dayjs().subtract(8, 'hour').format('YYYY-MM-DD HH:mm:ss');
    const endTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const scale = 'A入厂皮带秤';
    return {
      key: `ib-${Date.now()}`,
      method: 'CoalRealUnloadMethod_1',
      scale,
      startTime,
      endTime,
      yard: YARD_NAME,
      bunkers: [],
      ton: fetchScaleTonByPeriod(scale, startTime, endTime),
      creator: DEFAULT_OPERATOR,
      createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };
  };

  /** 模拟后端：校验皮带秤时段是否与全部卸煤记录冲突 */
  const checkScalePeriodConflict = (
    scale: string | null,
    startTime: string,
    endTime: string,
    excludeKey?: string | null,
  ): string | null => {
    if (!scale || !startTime || !endTime) return null;
    if (dayjs(endTime).isBefore(dayjs(startTime))) return '结束时间不能早于开始时间';

    const allRecords: { key: string; scale: string | null; startTime: string; endTime: string; planNo: string }[] =
      [];
    plans.forEach((p) => {
      p.inbound.forEach((r) => {
        // 当前正在完结的计划以抽屉内 inbound 为准，跳过计划快照，避免重复
        if (activeId && p.id === activeId) return;
        allRecords.push({
          key: r.key,
          scale: r.scale,
          startTime: r.startTime,
          endTime: r.endTime,
          planNo: p.planNo,
        });
      });
    });
    inbound.forEach((r) => {
      allRecords.push({
        key: r.key,
        scale: r.scale,
        startTime: r.startTime,
        endTime: r.endTime,
        planNo: activePlan?.planNo || '',
      });
    });

    const hit = allRecords.find(
      (r) =>
        r.scale === scale &&
        r.key !== excludeKey &&
        timeRangesOverlap(startTime, endTime, r.startTime, r.endTime),
    );
    if (!hit) return null;
    return `计量皮带秤「${scale}」在该时段已存在卸煤记录${hit.planNo ? `（计划 ${hit.planNo}）` : ''}`;
  };

  const openAddInbound = () => {
    setInboundEditKey(null);
    const draft = emptyInboundDraft();
    setInboundDraft(draft);
    setBeltAutoFetched(true);
    setScaleConflict(
      checkScalePeriodConflict(draft.scale, draft.startTime, draft.endTime, null),
    );
    setInboundDrawerOpen(true);
  };

  const openEditInbound = (row: InboundRow) => {
    setInboundEditKey(row.key);
    setInboundDraft({ ...row });
    setBeltAutoFetched(false);
    setScaleConflict(
      row.method === 'CoalRealUnloadMethod_1'
        ? checkScalePeriodConflict(row.scale, row.startTime, row.endTime, row.key)
        : null,
    );
    setInboundDrawerOpen(true);
  };

  const maybeAutoFetchScaleTon = (
    draft: InboundRow,
    opts?: { notify?: boolean },
  ): InboundRow => {
    const isAdd = !inboundEditKey;
    if (
      !isAdd ||
      draft.method !== 'CoalRealUnloadMethod_1' ||
      !draft.scale ||
      !draft.startTime ||
      !draft.endTime
    ) {
      setBeltAutoFetched(false);
      return draft;
    }
    if (dayjs(draft.endTime).isBefore(dayjs(draft.startTime))) {
      setBeltAutoFetched(false);
      return { ...draft, ton: 0 };
    }
    const ton = fetchScaleTonByPeriod(draft.scale, draft.startTime, draft.endTime);
    setBeltAutoFetched(true);
    if (opts?.notify !== false) {
      message.success('已按所选时间段估算卸煤量（可修改）');
    }
    return { ...draft, ton };
  };

  const refreshScaleValidate = (draft: InboundRow) => {
    if (draft.method !== 'CoalRealUnloadMethod_1') {
      setScaleConflict(null);
      return;
    }
    setScaleConflict(
      checkScalePeriodConflict(draft.scale, draft.startTime, draft.endTime, inboundEditKey),
    );
  };

  const changeInboundMethod = (method: RealUnloadMethod) => {
    const next: InboundRow = {
      ...inboundDraft,
      method,
      scale: method === 'CoalRealUnloadMethod_1' ? inboundDraft.scale || 'A入厂皮带秤' : null,
      bunkers: method === 'CoalRealUnloadMethod_2' ? inboundDraft.bunkers : [],
    };
    const withTon = maybeAutoFetchScaleTon(next);
    setInboundDraft(withTon);
    refreshScaleValidate(withTon);
  };

  const changeInboundScale = (scale: string) => {
    const next = maybeAutoFetchScaleTon({ ...inboundDraft, scale });
    setInboundDraft(next);
    refreshScaleValidate(next);
  };

  const changeInboundStart = (startTime: string) => {
    const next = maybeAutoFetchScaleTon({ ...inboundDraft, startTime });
    setInboundDraft(next);
    refreshScaleValidate(next);
  };

  const changeInboundEnd = (endTime: string) => {
    const next = maybeAutoFetchScaleTon({ ...inboundDraft, endTime });
    setInboundDraft(next);
    refreshScaleValidate(next);
  };

  const saveInboundRecord = () => {
    const method = inboundDraft.method;
    if (!method) {
      message.warning('请选择卸煤类型');
      return;
    }
    if (method === 'CoalRealUnloadMethod_1' && !inboundDraft.scale) {
      message.warning('请选择计量皮带秤');
      return;
    }
    if (!inboundDraft.yard) {
      message.warning('请选择入库煤场');
      return;
    }
    if (method === 'CoalRealUnloadMethod_2' && !inboundDraft.bunkers.length) {
      message.warning('请选择上煤煤仓');
      return;
    }
    if (!inboundDraft.startTime || !inboundDraft.endTime) {
      message.warning('请填写卸煤开始/结束时间');
      return;
    }
    if (dayjs(inboundDraft.endTime).isBefore(dayjs(inboundDraft.startTime))) {
      message.warning('结束时间不能早于开始时间');
      return;
    }
    if (method === 'CoalRealUnloadMethod_1') {
      const conflict = checkScalePeriodConflict(
        inboundDraft.scale,
        inboundDraft.startTime,
        inboundDraft.endTime,
        inboundEditKey,
      );
      if (conflict) {
        setScaleConflict(conflict);
        message.error(conflict);
        return;
      }
    }
    if (!(inboundDraft.ton > 0)) {
      message.warning('卸煤量须大于 0');
      return;
    }

    const nextRow: InboundRow = {
      ...inboundDraft,
      scale: method === 'CoalRealUnloadMethod_1' ? inboundDraft.scale : null,
      bunkers: method === 'CoalRealUnloadMethod_2' ? inboundDraft.bunkers : [],
      ton: ROUND(inboundDraft.ton),
      creator: inboundEditKey ? inboundDraft.creator : DEFAULT_OPERATOR,
      createTime: inboundEditKey
        ? inboundDraft.createTime
        : dayjs().format('YYYY-MM-DD HH:mm:ss'),
    };

    if (inboundEditKey) {
      setInbound((prev) => prev.map((r) => (r.key === inboundEditKey ? nextRow : r)));
      message.success('卸煤记录已更新');
    } else {
      setInbound((prev) => [...prev, nextRow]);
      message.success('卸煤记录已新增');
    }
    setInboundDrawerOpen(false);
    setScaleConflict(null);
  };

  const removeInbound = (key: string) => {
    setInbound((prev) => prev.filter((r) => r.key !== key));
  };

  const confirmFinish = () => {
    if (!activePlan) return;
    if (!canFinishStatus(activePlan, inbound.length > 0)) {
      message.error('卸煤状态异常，请先中断卸煤！');
      return;
    }
    if (!inbound.length) {
      message.error('至少需要一条卸煤记录');
      return;
    }
    if (!stack.length) {
      message.error('请至少选择一个堆煤分区');
      return;
    }
    if (!balanceOk) {
      message.error('入库明细明细与总量不一致！请确认！');
      return;
    }

    stack.forEach((s) => {
      const cfg = getPartition(s.yard, s.zone);
      if (cfg) cfg.stock = ROUND(cfg.stock + s.allocTon);
    });

    setPlans((prev) =>
      prev.map((p) =>
        p.id === activePlan.id
          ? {
              ...p,
              unloadStatus: '已卸煤',
              remark,
              inbound: inbound.map((r) => ({ ...r })),
              stack: stack.map((s) => ({
                key: s.key,
                yard: s.yard,
                zone: s.zone,
                planTon: s.allocTon,
              })),
            }
          : p,
      ),
    );

    message.success('卸煤计划已完结，卸煤量已上传 MIS 行程入库记录（原型模拟）');
    closeDrawer();
  };

  const openCreate = () => {
    setCreateDraft(emptyCreateDraft());
    setCreateOpen(true);
  };

  const openBatchPicker = () => {
    const matched = ENTRY_BATCHES.find((b) => b.regNo === createDraft.regNo);
    setBatchPickId(matched?.id ?? null);
    setBatchPickerOpen(true);
  };

  const applyBatchPick = () => {
    if (!batchPickId) {
      message.warning('请先选择一条入厂批次');
      return;
    }
    const batch = ENTRY_BATCHES.find((b) => b.id === batchPickId);
    if (!batch) return;
    setCreateDraft((d) => ({
      ...d,
      regNo: batch.regNo,
      supplier: batch.supplier,
      ship: batch.ship,
      voyage: batch.voyage,
      coal: batch.coal,
      coalType: batch.coalType,
      waybillTon: batch.waybillTon,
      price: batch.price,
      arriveTime: batch.arriveTime,
      planTon: d.planTon > 0 ? d.planTon : batch.waybillTon,
      name: d.name || `${batch.voyage}-${dayjs(batch.arriveTime).format('YYYYMMDD')}卸煤作业`,
      unloadType: d.unloadType || '皮带卸煤（煤场）',
      startTime: d.startTime || dayjs(batch.arriveTime).add(1, 'day').hour(8).minute(0).second(0),
      endTime: d.endTime || dayjs(batch.arriveTime).add(3, 'day').hour(18).minute(0).second(0),
    }));
    setBatchPickerOpen(false);
    message.success('已回填入厂登记信息');
  };

  const clearBatchPick = () => {
    setBatchPickId(null);
    setCreateDraft((d) => ({
      ...d,
      regNo: '',
      supplier: '',
      ship: '',
      voyage: '',
      coal: '',
      coalType: '',
      waybillTon: 0,
      price: 0,
      arriveTime: '',
    }));
  };

  const openSchemeEditor = () => {
    if (!createDraft.regNo) {
      message.warning('请先选择入厂登记批次');
      return;
    }
    if (!createDraft.planTon || createDraft.planTon <= 0) {
      message.warning('请先填写计划卸煤吨位');
      return;
    }
    const selectedKeys = createDraft.stack.map((s) => s.key);
    const planMap = Object.fromEntries(createDraft.stack.map((s) => [s.key, s.planTon]));
    const totalPlan = createDraft.planTon;
    const rows = enrichStack(
      PARTITION_CFG.map((p) => ({
        key: partitionKey(p.yard, p.zone),
        yard: p.yard,
        zone: p.zone,
        planTon: planMap[partitionKey(p.yard, p.zone)] ?? null,
      })),
    )
      .sort(
        (a, b) =>
          YARD_NAMES.indexOf(a.yard) - YARD_NAMES.indexOf(b.yard) || a.zone - b.zone,
      )
      .map((s) => {
        const plan = s.planTon ?? 0;
        return {
          ...s,
          weightPct:
            selectedKeys.includes(s.key) && totalPlan > 0 && plan > 0
              ? ROUND((plan / totalPlan) * 100)
              : 0,
          overflow: s.planTon != null ? s.stock + s.planTon > s.capacity : false,
        };
      });
    setSchemeRows(rows);
    setSchemeSelected(selectedKeys);
    setSchemeOnlySelected(Boolean(selectedKeys.length));
    setSchemeYardFilter(undefined);
    setSchemeOpen(true);
  };

  const allocateSchemeTons = () => {
    if (!schemeSelected.length) {
      message.warning('请先勾选煤场分区');
      return;
    }
    const total = createDraft.planTon;
    if (total <= 0) {
      message.warning('计划卸煤吨位无效');
      return;
    }
    const selectedSet = new Set(schemeSelected);
    const selectedRows = schemeRows
      .filter((r) => selectedSet.has(r.key))
      .sort(
        (a, b) =>
          YARD_NAMES.indexOf(a.yard) - YARD_NAMES.indexOf(b.yard) || a.zone - b.zone,
      );
    // 模拟后端：按传入煤量与勾选分区计算计划堆煤量、分配百分比、是否超限
    const allocated = allocateTotalByRemain(selectedRows, total);
    const allocMap = Object.fromEntries(allocated.map((r) => [r.key, r]));
    const hasOverflow = allocated.some((r) => r.overflow);
    setSchemeRows((prev) =>
      prev.map((r) => {
        if (!selectedSet.has(r.key)) {
          return { ...r, planTon: null, weightPct: 0, overflow: false };
        }
        const hit = allocMap[r.key];
        return hit
          ? {
              ...r,
              planTon: hit.planTon,
              weightPct: hit.weightPct,
              overflow: hit.overflow,
            }
          : r;
      }),
    );
    if (hasOverflow) {
      message.warning('可能超出分区容量');
    } else {
      message.success(`已按剩余容量权重分配卸煤量至 ${allocated.length} 个分区`);
    }
  };

  const resetSchemeCalc = () => {
    setSchemeSelected([]);
    setSchemeRows((prev) =>
      prev.map((r) => ({ ...r, planTon: null, weightPct: 0, overflow: false })),
    );
    setSchemeOnlySelected(false);
    setSchemeYardFilter(undefined);
    message.info('已重置，请重新勾选分区后再分配');
  };

  const updateSchemePlanTon = (key: string, ton: number | null) => {
    const val = ton == null ? null : Math.max(0, ROUND(ton));
    setSchemeRows((prev) => {
      const patched = prev.map((r) =>
        r.key === key
          ? {
              ...r,
              planTon: val,
              overflow: val != null ? r.stock + val > r.capacity : false,
            }
          : r,
      );
      const selected = new Set(
        [...schemeSelected, key].filter((k, i, arr) => arr.indexOf(k) === i),
      );
      const sum = patched
        .filter((r) => selected.has(r.key))
        .reduce((a, r) => a + (r.planTon ?? 0), 0);
      return patched.map((r) =>
        selected.has(r.key)
          ? {
              ...r,
              weightPct: sum > 0 && r.planTon != null ? ROUND((r.planTon / sum) * 100) : 0,
            }
          : { ...r, weightPct: 0 },
      );
    });
    setSchemeSelected((prev) => (prev.includes(key) ? prev : [...prev, key].sort()));
  };

  const schemeSelectedSum = useMemo(() => {
    const set = new Set(schemeSelected);
    return ROUND(
      schemeRows
        .filter((r) => set.has(r.key))
        .reduce((a, r) => a + (r.planTon ?? 0), 0),
    );
  }, [schemeRows, schemeSelected]);

  const schemeHasOverflow = useMemo(
    () =>
      schemeRows.some(
        (r) => schemeSelected.includes(r.key) && Boolean(r.overflow),
      ),
    [schemeRows, schemeSelected],
  );

  const schemeBalanceOk =
    createDraft.planTon > 0 && Math.abs(schemeSelectedSum - createDraft.planTon) < 0.001;

  const saveScheme = () => {
    if (!schemeSelected.length) {
      message.warning('请至少勾选一个分区');
      return;
    }
    if (!schemeBalanceOk) {
      message.error('输入的煤量总和与计划堆煤量不相等!');
      return;
    }
    const set = new Set(schemeSelected);
    const next = schemeRows
      .filter((r) => set.has(r.key))
      .sort(
        (a, b) =>
          YARD_NAMES.indexOf(a.yard) - YARD_NAMES.indexOf(b.yard) || a.zone - b.zone,
      )
      .map((r) => ({
        key: r.key,
        yard: r.yard,
        zone: r.zone,
        planTon: r.planTon,
      }));
    setCreateDraft((d) => ({ ...d, stack: next }));
    setSchemeOpen(false);
    message.success(`堆煤方案已保存，共 ${next.length} 个分区`);
  };

  const saveCreatePlan = () => {
    if (!createDraft.regNo) {
      message.warning('请先选择入厂登记批次');
      return;
    }
    if (!createDraft.startTime || !createDraft.endTime) {
      message.warning('请填写开始时间与结束时间');
      return;
    }
    if (!createDraft.planTon || createDraft.planTon <= 0) {
      message.warning('请填写计划卸煤吨位');
      return;
    }
    if (!createDraft.unloadType) {
      message.warning('请选择卸煤类型');
      return;
    }
    if (createDraft.stack.length) {
      const stackSum = ROUND(createDraft.stack.reduce((a, s) => a + (s.planTon ?? 0), 0));
      if (Math.abs(stackSum - createDraft.planTon) >= 0.001) {
        message.error('堆煤方案合计须等于计划卸煤吨位，请调整后保存');
        return;
      }
    }

    const id = `n-${Date.now()}`;
    const planNo = `${createDraft.voyage || 'PLAN'}-${createDraft.startTime.format('YYYYMMDD')}01`;
    const row: PlanRow = {
      id,
      name: createDraft.name || `${planNo}卸煤作业`,
      planNo,
      regNo: createDraft.regNo,
      ship: createDraft.ship,
      voyage: createDraft.voyage,
      startDate: createDraft.startTime.format('YYYY-MM-DD'),
      unloadStatus: '待卸煤',
      auditStatus: '编辑中',
      supplier: createDraft.supplier,
      coal: createDraft.coal,
      coalType: createDraft.coalType,
      waybillTon: createDraft.waybillTon,
      price: createDraft.price,
      arriveTime: createDraft.arriveTime,
      planTon: createDraft.planTon,
      unloadType: createDraft.unloadType,
      scale: 'A入厂皮带秤',
      remark: createDraft.remark,
      inbound: [],
      stack: createDraft.stack.map((s) => ({ ...s })),
    };
    setPlans((prev) => [row, ...prev]);
    setCreateOpen(false);
    message.success('卸煤计划已新增');
  };

  const listColumns: ColumnsType<PlanRow> = [
    { title: '序号', width: 60, render: (_v, _r, i) => i + 1 },
    { title: '计划名称', dataIndex: 'name', ellipsis: true },
    { title: '计划编号', dataIndex: 'planNo', width: 160 },
    { title: '车船号', dataIndex: 'ship', width: 110, render: (v) => v || '—' },
    { title: '航次', dataIndex: 'voyage', width: 80, render: (v) => v || '—' },
    { title: '开始时间', dataIndex: 'startDate', width: 120 },
    {
      title: '卸煤状态',
      dataIndex: 'unloadStatus',
      width: 110,
      render: (v: UnloadStatus) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
    },
    {
      title: '审核状态',
      dataIndex: 'auditStatus',
      width: 120,
      render: (v) => v,
    },
    {
      title: '操作',
      width: 280,
      fixed: 'right',
      render: (_v, row) => (
        <Space size={4} wrap>
          <Button type="link" size="small" onClick={() => message.info('查看（原型占位）')}>
            查看
          </Button>
          {row.unloadStatus === '待卸煤' && row.auditStatus === '审核通过' && (
            <Button type="link" size="small" onClick={() => message.info('开始卸煤（原型占位）')}>
              开始卸煤
            </Button>
          )}
          {(row.unloadStatus === '卸煤中断' || row.unloadStatus === '待卸煤') && (
            <Button type="link" size="small" onClick={() => openFinish(row)}>
              完结
            </Button>
          )}
          {(row.auditStatus === '编辑中' || row.auditStatus === '驳回') && (
            <>
              <Button type="link" size="small">编辑</Button>
              <Button type="link" size="small">提交审批</Button>
              <Button type="link" size="small" danger>删除</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const inboundColumns: ColumnsType<InboundRow> = [
    { title: '序号', width: 52, render: (_v, _r, i) => i + 1 },
    {
      title: '卸煤类型',
      dataIndex: 'method',
      width: 108,
      render: (v: RealUnloadMethod) => {
        const color =
          v === 'CoalRealUnloadMethod_1' ? 'cyan' : v === 'CoalRealUnloadMethod_2' ? 'blue' : 'orange';
        return <Tag color={color}>{methodLabel(v)}</Tag>;
      },
    },
    {
      title: '计量皮带秤',
      dataIndex: 'scale',
      width: 120,
      render: (v) => v || '—',
    },
    {
      title: '入库煤场',
      dataIndex: 'yard',
      width: 112,
      render: (v: string) => <YardTag yard={v} />,
    },
    {
      title: '上煤煤仓',
      dataIndex: 'bunkers',
      width: 160,
      ellipsis: true,
      render: (v: string[]) => (v?.length ? v.join('、') : '—'),
    },
    { title: '开始时间', dataIndex: 'startTime', width: 154 },
    { title: '结束时间', dataIndex: 'endTime', width: 154 },
    {
      title: '卸煤量(t)',
      dataIndex: 'ton',
      width: 110,
      render: (v) => <span className="cum-num">{Number(v).toFixed(3)}</span>,
    },
    { title: '创建人', dataIndex: 'creator', width: 90 },
    { title: '创建时间', dataIndex: 'createTime', width: 154 },
    {
      title: '操作',
      width: 110,
      fixed: 'right',
      render: (_v, row) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEditInbound(row)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该卸煤记录？" onConfirm={() => removeInbound(row.key)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const planTonByPartition = useMemo(
    () =>
      Object.fromEntries(
        stack.map((s) => [partitionKey(s.yard, s.zone), s.planTon]),
      ),
    [stack],
  );

  const stackByKey = useMemo(
    () => Object.fromEntries(stack.map((s) => [s.key, s])),
    [stack],
  );

  const step2Rows = useMemo(() => {
    const rows = PARTITION_CFG.map((p) => {
      const key = partitionKey(p.yard, p.zone);
      const hit = stackByKey[key];
      return {
        key,
        yard: p.yard,
        zone: p.zone,
        planTon: planTonByPartition[key] ?? null,
        capacity: getCapacity(p.yard, p.zone),
        stock: p.stock,
        remain: getCapacity(p.yard, p.zone) - p.stock,
        allocTon: hit?.allocTon ?? 0,
        weightPct: hit?.weightPct ?? 0,
        overflow: hit?.overflow ?? false,
        moisture: p.moisture,
        heat: p.heat,
        volatile: p.volatile,
        sulfur: p.sulfur,
        ash: p.ash,
      };
    });
    return rows.filter((r) => {
      if (step2YardFilter && r.yard !== step2YardFilter) return false;
      if (step2ZoneFilter && !String(r.zone).includes(step2ZoneFilter.trim())) return false;
      if (onlySelected && !pickedZones.includes(r.key)) return false;
      return true;
    });
  }, [
    planTonByPartition,
    stackByKey,
    onlySelected,
    pickedZones,
    step2YardFilter,
    step2ZoneFilter,
  ]);

  const step2Columns: ColumnsType<(typeof step2Rows)[number]> = [
    { title: '序号', width: 52, render: (_v, _r, i) => i + 1 },
    {
      title: '煤场',
      dataIndex: 'yard',
      width: 112,
      render: (v: string) => <YardTag yard={v} />,
    },
    { title: '分区', dataIndex: 'zone', width: 64, render: (v) => `${v}区` },
    {
      title: '容量上限(t)',
      dataIndex: 'capacity',
      width: 96,
      render: (v) => <span className="cum-num">{Number(v).toFixed(0)}</span>,
    },
    {
      title: '存煤量(t)',
      dataIndex: 'stock',
      width: 96,
      render: (v) => <span className="cum-num">{Number(v).toFixed(3)}</span>,
    },
    {
      title: '剩余容量(t)',
      dataIndex: 'remain',
      width: 100,
      render: (v) => (
        <span className="cum-num" style={{ color: v <= 0 ? '#d97706' : undefined }}>
          {ROUND(v).toFixed(3)}
        </span>
      ),
    },
    {
      title: '实际入库量(t)',
      dataIndex: 'allocTon',
      width: 128,
      render: (v, row) =>
        pickedZones.includes(row.key) ? (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            precision={0}
            value={v}
            status={row.overflow ? 'warning' : undefined}
            onChange={(val) => updateAlloc(row.key, val)}
          />
        ) : (
          '—'
        ),
    },
    {
      title: '分配百分比(%)',
      dataIndex: 'weightPct',
      width: 110,
      render: (v, row) =>
        pickedZones.includes(row.key) && row.allocTon > 0 ? (
          <span className="cum-num">{Number(v).toFixed(2)}</span>
        ) : (
          '—'
        ),
    },
    {
      title: '堆煤后状态',
      dataIndex: 'overflow',
      width: 100,
      render: (v, row) =>
        pickedZones.includes(row.key) ? (
          v ? (
            <Tag color="warning">可能超限</Tag>
          ) : (
            <Tag color="success">容量内</Tag>
          )
        ) : (
          '—'
        ),
    },
  ];

  const finishReadonlyColumns: ColumnsType<StackRow> = [
    { title: '序号', width: 52, render: (_v, _r, i) => i + 1 },
    {
      title: '煤场',
      dataIndex: 'yard',
      width: 112,
      render: (v: string) => <YardTag yard={v} />,
    },
    {
      title: '分区',
      dataIndex: 'zone',
      width: 64,
      render: (v) => `${v}区`,
    },
    {
      title: '实际入库量(t)',
      dataIndex: 'allocTon',
      width: 120,
      render: (v) => <span className="cum-num">{Number(v).toFixed(0)}</span>,
    },
    {
      title: '分配百分比(%)',
      dataIndex: 'weightPct',
      width: 110,
      render: (v) => <span className="cum-num">{Number(v).toFixed(2)}</span>,
    },
    {
      title: '存煤量(t)',
      dataIndex: 'stock',
      width: 96,
      render: (v) => <span className="cum-num">{Number(v).toFixed(3)}</span>,
    },
    {
      title: '容量上限(t)',
      dataIndex: 'capacity',
      width: 96,
      render: (v) => <span className="cum-num">{Number(v).toFixed(0)}</span>,
    },
    {
      title: '堆煤后状态',
      dataIndex: 'overflow',
      width: 100,
      render: (v) =>
        v ? <Tag color="warning">可能超限</Tag> : <Tag color="success">容量内</Tag>,
    },
  ];
  const createStackColumns: ColumnsType<(typeof createDraft.stack)[number]> = [
    { title: '序号', width: 56, render: (_v, _r, i) => i + 1 },
    { title: '煤场', dataIndex: 'yard', width: 130 },
    { title: '分区', dataIndex: 'zone', width: 70, render: (v) => `${v}区` },
    {
      title: '计划堆煤量(t)',
      dataIndex: 'planTon',
      width: 120,
      render: (v) => (v == null ? '—' : <span className="cum-num">{Number(v).toFixed(2)}</span>),
    },
    {
      title: '存煤量(t)',
      width: 110,
      render: (_v, row) => (
        <span className="cum-num">{getStock(row.yard, row.zone).toFixed(2)}</span>
      ),
    },
    {
      title: '水分(%)',
      width: 90,
      render: (_v, row) => {
        const p = getPartition(row.yard, row.zone);
        return <span className="cum-num">{(p?.moisture ?? 0).toFixed(2)}</span>;
      },
    },
    {
      title: '热值(kcal/kg)',
      width: 120,
      render: (_v, row) => {
        const p = getPartition(row.yard, row.zone);
        return <span className="cum-num">{p?.heat ?? '—'}</span>;
      },
    },
    {
      title: '挥发分(%)',
      width: 100,
      render: (_v, row) => {
        const p = getPartition(row.yard, row.zone);
        return <span className="cum-num">{(p?.volatile ?? 0).toFixed(2)}</span>;
      },
    },
    {
      title: '硫分(%)',
      width: 90,
      render: (_v, row) => {
        const p = getPartition(row.yard, row.zone);
        return <span className="cum-num">{(p?.sulfur ?? 0).toFixed(2)}</span>;
      },
    },
    {
      title: '灰分(%)',
      width: 90,
      render: (_v, row) => {
        const p = getPartition(row.yard, row.zone);
        return <span className="cum-num">{(p?.ash ?? 0).toFixed(2)}</span>;
      },
    },
  ];

  const schemeEditorRows = useMemo(() => {
    return schemeRows
      .filter((r) => {
        if (schemeYardFilter && r.yard !== schemeYardFilter) return false;
        if (
          schemeOnlySelected &&
          !(schemeSelected.includes(r.key) || (r.planTon != null && r.planTon > 0))
        ) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          YARD_NAMES.indexOf(a.yard) - YARD_NAMES.indexOf(b.yard) || a.zone - b.zone,
      );
  }, [schemeRows, schemeSelected, schemeOnlySelected, schemeYardFilter]);

  const schemeYardTabCounts = useMemo(() => {
    const map: Record<string, number> = {};
    YARD_NAMES.forEach((yard) => {
      map[yard] = schemeSelected.filter((key) => {
        const row = schemeRows.find((r) => r.key === key);
        return row?.yard === yard;
      }).length;
    });
    return map;
  }, [schemeSelected, schemeRows]);

  const schemeEditorColumns: ColumnsType<StackRow> = [
    { title: '序号', width: 52, render: (_v, _r, i) => i + 1 },
    {
      title: '煤场',
      dataIndex: 'yard',
      width: 112,
      render: (v: string) => <YardTag yard={v} />,
    },
    { title: '分区', dataIndex: 'zone', width: 64, render: (v) => `${v}区` },
    {
      title: '计划堆煤量(t)',
      dataIndex: 'planTon',
      width: 120,
      render: (v, row) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          precision={0}
          value={v ?? undefined}
          placeholder="—"
          status={row.overflow ? 'warning' : undefined}
          onChange={(val) => updateSchemePlanTon(row.key, val)}
        />
      ),
    },
    {
      title: '分配百分比(%)',
      dataIndex: 'weightPct',
      width: 110,
      render: (v, row) =>
        schemeSelected.includes(row.key) && (row.planTon ?? 0) > 0 ? (
          <span className="cum-num">{Number(v).toFixed(2)}</span>
        ) : (
          '—'
        ),
    },
    {
      title: '容量上限(t)',
      dataIndex: 'capacity',
      width: 96,
      render: (v) => <span className="cum-num">{v.toFixed(0)}</span>,
    },
    {
      title: '存煤量(t)',
      dataIndex: 'stock',
      width: 100,
      render: (v) => <span className="cum-num">{v.toFixed(2)}</span>,
    },
    {
      title: '剩余容量(t)',
      dataIndex: 'remain',
      width: 100,
      render: (v) => (
        <span className="cum-num" style={{ color: v <= 0 ? '#d97706' : undefined }}>
          {ROUND(v).toFixed(2)}
        </span>
      ),
    },
    {
      title: '堆煤后状态',
      dataIndex: 'overflow',
      width: 120,
      render: (v, row) => {
        if (row.planTon == null) return '—';
        return v ? (
          <Tag color="warning">可能超限</Tag>
        ) : (
          <Tag color="success">容量内</Tag>
        );
      },
    },
    {
      title: '水分(%)',
      dataIndex: 'moisture',
      width: 86,
      render: (_v, row) => {
        const p = getPartition(row.yard, row.zone);
        return <span className="cum-num">{(p?.moisture ?? 0).toFixed(2)}</span>;
      },
    },
    {
      title: '热值(kcal/kg)',
      dataIndex: 'heat',
      width: 110,
      render: (_v, row) => {
        const p = getPartition(row.yard, row.zone);
        return <span className="cum-num">{p?.heat ?? '—'}</span>;
      },
    },
  ];

  const batchColumns: ColumnsType<EntryBatch> = [
    {
      title: '',
      width: 48,
      render: (_v, row) => (
        <Radio checked={batchPickId === row.id} onChange={() => setBatchPickId(row.id)} />
      ),
    },
    { title: '序号', width: 56, render: (_v, _r, i) => i + 1 },
    { title: '入厂登记编号', dataIndex: 'regNo', ellipsis: true },
    { title: '供应商名称', dataIndex: 'supplier', width: 200, ellipsis: true },
    { title: '煤品种', dataIndex: 'coal', width: 110 },
    { title: '煤种', dataIndex: 'coalType', width: 140 },
    {
      title: '运单量(t)',
      dataIndex: 'waybillTon',
      width: 110,
      render: (v) => <span className="cum-num">{Number(v).toFixed(2)}</span>,
    },
    { title: '车船名', dataIndex: 'ship', width: 100 },
    { title: '航次', dataIndex: 'voyage', width: 70 },
    {
      title: '到港日期',
      dataIndex: 'arriveTime',
      width: 160,
      render: (v) => dayjs(v).format('YYYY-MM-DD'),
    },
  ];

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
      <div className="cum-root">
        <div className="cum-page-title">
          <h1>
            <span className="cum-title-icon">卸</span>
            卸煤管理
          </h1>
        </div>

        <div className="cum-body">
          <div className="cum-panel">
            <div className="cum-filter">
              <Input
                allowClear
                placeholder="计划编号"
                style={{ width: 160 }}
                value={keyword.planNo}
                onChange={(e) => setKeyword((k) => ({ ...k, planNo: e.target.value }))}
              />
              <Input
                allowClear
                placeholder="计划名称"
                style={{ width: 200 }}
                value={keyword.planName}
                onChange={(e) => setKeyword((k) => ({ ...k, planName: e.target.value }))}
              />
              <Input
                allowClear
                placeholder="入厂登记编号"
                style={{ width: 180 }}
                value={keyword.regNo}
                onChange={(e) => setKeyword((k) => ({ ...k, regNo: e.target.value }))}
              />
              <RangePicker style={{ width: 260 }} />
              <Button type="primary" icon={<SearchOutlined />}>
                查询
              </Button>
            </div>

            <div className="cum-toolbar">
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新增
              </Button>
              <span style={{ fontSize: 12, color: '#7a8694' }}>
                新增计划可创建堆煤方案；「卸煤中断 / 待卸煤」可完结
              </span>
            </div>

            <Table
              rowKey="id"
              size="middle"
              columns={listColumns}
              dataSource={filtered}
              pagination={{ total: filtered.length, pageSize: 20, showTotal: (t) => `共 ${t} 条记录` }}
              scroll={{ x: 1100 }}
            />
          </div>
        </div>

        <Drawer
          title="卸煤计划完结"
          open={open}
          onClose={closeDrawer}
          width="min(1160px, 96vw)"
          destroyOnHidden
          styles={{
            body: {
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              height: '100%',
            },
          }}
          footer={
            <div className="cum-drawer-footer">
              <span className="cum-footer-hint">
                {step === 0 && `第 1 步：确认卸煤明细 · 卸煤总量 ${grandInbound.toFixed(3)} t`}
                {step === 1 &&
                  `第 2 步：分区分配 ${yardAllocSum.toFixed(0)} / ${finishTargetTon} t · 已选 ${stack.length} 区`}
                {step === 2 &&
                  (balanceOk
                    ? '第 3 步：请确认明细无误后完结'
                    : '第 3 步：入库明细与总量不一致，请返回上一步调整')}
              </span>
              <Space>
                <Button onClick={closeDrawer}>取消</Button>
                {step > 0 && <Button onClick={goPrev}>上一步</Button>}
                {step < 2 && (
                  <Button type="primary" onClick={goNext}>
                    下一步
                  </Button>
                )}
                {step === 2 && (
                  <Popconfirm
                    title="请确认卸煤量明细无误，完结后，卸煤量将上传MIS行程入库记录！"
                    disabled={!balanceOk}
                    onConfirm={confirmFinish}
                  >
                    <Button type="primary" disabled={!balanceOk}>
                      完结
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
          }
        >
          {activePlan && (
            <div className="cum-drawer-body">
              <Steps
                size="small"
                current={step}
                className="cum-steps"
                items={[
                  { title: '确认卸煤明细' },
                  { title: '分配入库分区' },
                  { title: '确认完结' },
                ]}
              />

              <div className={`cum-step-panel ${step === 1 ? 'is-local-scroll' : ''}`}>
                {step === 0 && (
                  <>
                    <div className="cum-modal-section">
                      <div className="cum-modal-section-hd">
                        <div className="cum-modal-section-title">入厂登记批次信息</div>
                      </div>
                      <div className="cum-summary-grid">
                        <div className="cum-summary-item">
                          <span className="k">入厂登记编号</span>
                          <span className="v">{activePlan.regNo}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">供应商</span>
                          <span className="v">{activePlan.supplier}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">车船号</span>
                          <span className="v">{activePlan.ship || '—'}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">航次</span>
                          <span className="v">{activePlan.voyage || '—'}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">煤品种</span>
                          <span className="v">{activePlan.coal}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">煤种</span>
                          <span className="v">{activePlan.coalType}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">运单量</span>
                          <span className="v cum-num">{activePlan.waybillTon.toLocaleString()} t</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">到厂时间</span>
                          <span className="v">{activePlan.arriveTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="cum-modal-section">
                      <div className="cum-modal-section-hd">
                        <div className="cum-modal-section-title">卸煤计划信息</div>
                      </div>
                      <div className="cum-summary-grid">
                        <div className="cum-summary-item">
                          <span className="k">计划编号</span>
                          <span className="v">{activePlan.planNo}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">计划名称</span>
                          <span className="v">{activePlan.name}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">计划卸煤总量</span>
                          <span className="v cum-num">{activePlan.planTon.toLocaleString()} t</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">卸煤类型</span>
                          <span className="v">{activePlan.unloadType}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">计量皮带秤</span>
                          <span className="v">{activePlan.scale}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">卸煤状态</span>
                          <span className="v">{activePlan.unloadStatus}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">备注</span>
                          <span className="v">{remark || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="cum-modal-section">
                      <div className="cum-modal-section-hd">
                        <div className="cum-modal-section-title">卸煤记录明细</div>
                        <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={openAddInbound}>
                          新增
                        </Button>
                      </div>
                      <Table
                        size="small"
                        rowKey="key"
                        columns={inboundColumns}
                        dataSource={inbound}
                        pagination={false}
                        scroll={{ x: 1400 }}
                        locale={{ emptyText: '暂无卸煤记录，请点击右上角「新增」录入' }}
                        summary={() => (
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={7}>
                              合计
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1}>
                              <span className="cum-num" style={{ fontWeight: 700 }}>
                                {grandInbound.toFixed(3)}
                              </span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} colSpan={3} />
                          </Table.Summary.Row>
                        )}
                      />
                      <div className="cum-yard-totals">
                        <span className="cum-yard-chip">
                          卸煤总量 <b>{grandInbound.toFixed(3)}</b> t
                        </span>
                        {Object.entries(yardTotals).map(([yard, ton]) => (
                          <span key={yard} className="cum-yard-chip">
                            {yard === YARD_NAME ? '一号煤场' : '二号煤场'} <b>{ton.toFixed(3)}</b> t
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {step === 1 && (
                  <div className="cum-step-fill">
                    <div className="cum-scheme-tip">
                      已加载卸煤总量 <b>{grandInbound.toFixed(3)}</b> t（分配按取整目标{' '}
                      <b>{finishTargetTon}</b> t），可勾选调整后点击「重新计算」
                    </div>
                    {finishHasOverflow && (
                      <div className="cum-alert warn">可能超出分区容量：部分分区堆煤后将超过容量上限，请调整分区或煤量。</div>
                    )}
                    {!balanceOk && stack.length > 0 && (
                      <div className="cum-alert error">入库明细明细与总量不一致！请确认！</div>
                    )}
                    {balanceOk && !finishHasOverflow && (
                      <div className="cum-alert ok">校验通过：分区入库量合计等于卸煤总量，容量校验通过。</div>
                    )}
                    <div className="cum-step2-filter">
                      <Select
                        allowClear
                        size="small"
                        placeholder="全部煤场"
                        style={{ width: 150 }}
                        value={step2YardFilter}
                        options={YARD_NAMES.map((yard) => ({
                          value: yard,
                          label: yard === YARD_NAME ? '一号煤场' : '二号煤场',
                        }))}
                        onChange={(val) => setStep2YardFilter(val)}
                      />
                      <Input
                        allowClear
                        size="small"
                        placeholder="分区号"
                        style={{ width: 110 }}
                        value={step2ZoneFilter}
                        onChange={(e) => setStep2ZoneFilter(e.target.value)}
                      />
                      <Checkbox
                        checked={onlySelected}
                        onChange={(e) => setOnlySelected(e.target.checked)}
                      >
                        仅展示已选分区
                      </Checkbox>
                      <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={redistribute}>
                        重新计算
                      </Button>
                      <span className="cum-step2-count">
                        已选 <b>{pickedZones.length}</b> 区
                        <span className="cum-step2-count-sep">·</span>
                        已分配 <b>{yardAllocSum.toFixed(0)}</b> / {finishTargetTon} t
                      </span>
                    </div>
                    <div className="cum-table-host">
                      <Table
                        size="small"
                        rowKey="key"
                        columns={step2Columns}
                        dataSource={step2Rows}
                        tableLayout="fixed"
                        pagination={false}
                        sticky
                        scroll={{ x: 1100 }}
                        rowClassName={(row) =>
                          `${row.yard === YARD_NAME ? 'cum-row-y1' : 'cum-row-y2'}${
                            row.overflow ? ' cum-row-overflow' : ''
                          }`
                        }
                        locale={{
                          emptyText: onlySelected
                            ? '暂无已选分区，请取消「仅展示已选分区」后勾选'
                            : '无匹配分区',
                        }}
                        rowSelection={{
                          type: 'checkbox',
                          selectedRowKeys: pickedZones,
                          onChange: (keys) => applyPickedZones(keys.map(String)),
                          preserveSelectedRowKeys: true,
                        }}
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <>
                    <div className="cum-modal-section">
                      <div className="cum-modal-section-hd">
                        <div className="cum-modal-section-title">入厂登记 / 卸煤总量</div>
                      </div>
                      <div className="cum-summary-grid">
                        <div className="cum-summary-item">
                          <span className="k">入厂登记编号</span>
                          <span className="v">{activePlan.regNo}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">供应商</span>
                          <span className="v">{activePlan.supplier}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">车船号 / 航次</span>
                          <span className="v">
                            {activePlan.ship || '—'} / {activePlan.voyage || '—'}
                          </span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">煤品种</span>
                          <span className="v">
                            {activePlan.coal}（{activePlan.coalType}）
                          </span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">计划编号</span>
                          <span className="v">{activePlan.planNo}</span>
                        </div>
                        <div className="cum-summary-item">
                          <span className="k">卸煤总量</span>
                          <span className="v cum-num">{grandInbound.toFixed(3)} t</span>
                        </div>
                      </div>
                    </div>
                    <div className="cum-modal-section" style={{ marginBottom: 0 }}>
                      <div className="cum-modal-section-hd">
                        <div className="cum-modal-section-title">各分区入库煤量明细</div>
                      </div>
                      <Table
                        size="small"
                        rowKey="key"
                        columns={finishReadonlyColumns}
                        dataSource={stack}
                        pagination={false}
                        scroll={{ x: 900, y: 360 }}
                        summary={() => (
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={3}>
                              合计
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1}>
                              <span className="cum-num" style={{ fontWeight: 700 }}>
                                {yardAllocSum.toFixed(0)}
                              </span>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} colSpan={4} />
                          </Table.Summary.Row>
                        )}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </Drawer>

        {/* ===== 完结：新增 / 编辑卸煤记录 ===== */}
        <Drawer
          title={inboundEditKey ? '编辑卸煤记录' : '新增卸煤记录'}
          open={inboundDrawerOpen}
          onClose={() => {
            setInboundDrawerOpen(false);
            setScaleConflict(null);
          }}
          width={560}
          destroyOnHidden
          push={false}
          styles={{ body: { paddingTop: 12 } }}
          footer={
            <div className="cum-drawer-footer">
              <span className="cum-footer-hint">
                {inboundDraft.method === 'CoalRealUnloadMethod_1'
                  ? '皮带卸煤：须校验计量皮带秤时段不重叠'
                  : inboundDraft.method === 'CoalRealUnloadMethod_2'
                    ? '上煤：须选择上煤煤仓'
                    : '人工填报：直接录入入库煤场与卸煤量'}
              </span>
              <Space>
                <Button
                  onClick={() => {
                    setInboundDrawerOpen(false);
                    setScaleConflict(null);
                  }}
                >
                  取消
                </Button>
                <Button type="primary" onClick={saveInboundRecord}>
                  {inboundEditKey ? '保存修改' : '确认新增'}
                </Button>
              </Space>
            </div>
          }
        >
          <div className="cum-form-grid cum-form-grid-inline">
            <label className="span-2">
              <span className="lab">
                <i className="req">*</i>卸煤类型
              </span>
              <Select
                style={{ width: '100%' }}
                value={inboundDraft.method}
                options={REAL_UNLOAD_METHODS}
                onChange={(v) => changeInboundMethod(v)}
              />
            </label>
            {inboundDraft.method === 'CoalRealUnloadMethod_1' && (
              <label className="span-2">
                <span className="lab">
                  <i className="req">*</i>计量皮带秤
                </span>
                <Select
                  style={{ width: '100%' }}
                  placeholder="请选择"
                  value={inboundDraft.scale || undefined}
                  options={INBOUND_SCALES.map((s) => ({ value: s, label: s }))}
                  onChange={(scale) => changeInboundScale(scale)}
                />
              </label>
            )}
            <label>
              <span className="lab">
                <i className="req">*</i>卸煤开始时间
              </span>
              <DatePicker
                showTime
                style={{ width: '100%' }}
                value={inboundDraft.startTime ? dayjs(inboundDraft.startTime) : null}
                onChange={(v) =>
                  changeInboundStart(v ? v.format('YYYY-MM-DD HH:mm:ss') : '')
                }
              />
            </label>
            <label>
              <span className="lab">
                <i className="req">*</i>卸煤结束时间
              </span>
              <DatePicker
                showTime
                style={{ width: '100%' }}
                value={inboundDraft.endTime ? dayjs(inboundDraft.endTime) : null}
                onChange={(v) =>
                  changeInboundEnd(v ? v.format('YYYY-MM-DD HH:mm:ss') : '')
                }
              />
            </label>
            {scaleConflict && (
              <div className="span-2 cum-alert error" style={{ margin: 0 }}>
                {scaleConflict}
              </div>
            )}
            <label className="span-2">
              <span className="lab">
                <i className="req">*</i>入库煤场
              </span>
              <Select
                style={{ width: '100%' }}
                value={inboundDraft.yard || undefined}
                options={YARD_NAMES.map((yard) => ({
                  value: yard,
                  label: yard === YARD_NAME ? '一号圆形煤场' : '二号圆形煤场',
                }))}
                onChange={(yard) => setInboundDraft((d) => ({ ...d, yard }))}
              />
            </label>
            {inboundDraft.method === 'CoalRealUnloadMethod_2' && (
              <label className="span-2">
                <span className="lab">
                  <i className="req">*</i>上煤煤仓
                </span>
                <Select
                  mode="multiple"
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="请选择煤仓"
                  value={inboundDraft.bunkers}
                  options={BUNKER_OPTIONS.map((b) => ({ value: b, label: b }))}
                  onChange={(bunkers) => setInboundDraft((d) => ({ ...d, bunkers }))}
                />
              </label>
            )}
            <label className="span-2">
              <span className="lab">
                <i className="req">*</i>卸煤量(t)
              </span>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={3}
                placeholder={
                  !inboundEditKey &&
                  inboundDraft.method === 'CoalRealUnloadMethod_1' &&
                  beltAutoFetched
                    ? '已按时段估算，可修改'
                    : '请输入'
                }
                value={inboundDraft.ton || undefined}
                onChange={(val) => setInboundDraft((d) => ({ ...d, ton: ROUND(val ?? 0) }))}
              />
            </label>
          </div>
        </Drawer>

        {/* ===== 新增卸煤计划（侧边抽屉） ===== */}
        <Drawer
          title="新增卸煤计划"
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          width="min(960px, 96vw)"
          destroyOnHidden
          styles={{ body: { paddingTop: 12, display: 'flex', flexDirection: 'column' } }}
          footer={
            <div className="cum-drawer-footer">
              <span className="cum-footer-hint">
                {createDraft.regNo
                  ? `已关联批次 ${createDraft.regNo}${createDraft.stack.length ? ` · 堆煤 ${createDraft.stack.length} 区` : ''}`
                  : '请先选择入厂批次，再填写计划与堆煤方案'}
              </span>
              <Space>
                <Button onClick={() => setCreateOpen(false)}>取消</Button>
                <Button type="primary" onClick={saveCreatePlan}>
                  保存
                </Button>
              </Space>
            </div>
          }
        >
          <div className="cum-drawer-body">
            <div className="cum-step-panel">
              <div className="cum-modal-section">
                <div className="cum-modal-section-hd">
                  <div className="cum-modal-section-title">入厂登记信息</div>
                  <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={openBatchPicker}>
                    选择批次
                  </Button>
                </div>
                {createDraft.regNo ? (
                  <div className="cum-summary-grid cum-summary-grid-3">
                    <div className="cum-summary-item">
                      <span className="k">供应商</span>
                      <span className="v" title={createDraft.supplier}>
                        {createDraft.supplier}
                      </span>
                    </div>
                    <div className="cum-summary-item">
                      <span className="k">车船号</span>
                      <span className="v">{createDraft.ship || '—'}</span>
                    </div>
                    <div className="cum-summary-item">
                      <span className="k">航次</span>
                      <span className="v">{createDraft.voyage || '—'}</span>
                    </div>
                    <div className="cum-summary-item">
                      <span className="k">入厂登记编号</span>
                      <span className="v" title={createDraft.regNo}>
                        {createDraft.regNo}
                      </span>
                    </div>
                    <div className="cum-summary-item">
                      <span className="k">煤品种</span>
                      <span className="v">{createDraft.coal}</span>
                    </div>
                    <div className="cum-summary-item">
                      <span className="k">煤种</span>
                      <span className="v">{createDraft.coalType}</span>
                    </div>
                    <div className="cum-summary-item">
                      <span className="k">运单量</span>
                      <span className="v cum-num">{createDraft.waybillTon.toLocaleString()} t</span>
                    </div>
                    <div className="cum-summary-item">
                      <span className="k">单价</span>
                      <span className="v cum-num">{createDraft.price} 元</span>
                    </div>
                    <div className="cum-summary-item">
                      <span className="k">实际到厂时间</span>
                      <span className="v">{createDraft.arriveTime}</span>
                    </div>
                  </div>
                ) : (
                  <div className="cum-empty-hint" onClick={openBatchPicker} role="button" tabIndex={0}>
                    尚未选择入厂批次，点击此处或「选择批次」进行关联
                  </div>
                )}
              </div>

              <div className="cum-modal-section">
                <div className="cum-modal-section-hd">
                  <div className="cum-modal-section-title">计划信息</div>
                </div>
                <div className="cum-form-grid cum-form-grid-inline">
                  <label className="span-2">
                    <span className="lab">计划名称</span>
                    <Input
                      value={createDraft.name}
                      placeholder="请输入计划名称"
                      onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span className="lab">
                      <i className="req">*</i>开始时间
                    </span>
                    <DatePicker
                      showTime
                      style={{ width: '100%' }}
                      value={createDraft.startTime}
                      onChange={(v) => setCreateDraft((d) => ({ ...d, startTime: v }))}
                    />
                  </label>
                  <label>
                    <span className="lab">
                      <i className="req">*</i>结束时间
                    </span>
                    <DatePicker
                      showTime
                      style={{ width: '100%' }}
                      value={createDraft.endTime}
                      onChange={(v) => setCreateDraft((d) => ({ ...d, endTime: v }))}
                    />
                  </label>
                  <label>
                    <span className="lab">
                      <i className="req">*</i>计划卸煤吨位(t)
                    </span>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      precision={2}
                      value={createDraft.planTon || null}
                      onChange={(v) => setCreateDraft((d) => ({ ...d, planTon: ROUND(v ?? 0) }))}
                    />
                  </label>
                  <label>
                    <span className="lab">
                      <i className="req">*</i>卸煤类型
                    </span>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="请选择"
                      allowClear
                      value={createDraft.unloadType || undefined}
                      options={[
                        { value: '皮带卸煤（煤场）' },
                        { value: '汽车卸煤' },
                      ]}
                      onChange={(v) => setCreateDraft((d) => ({ ...d, unloadType: v || '' }))}
                    />
                  </label>
                  <label className="span-2">
                    <span className="lab">备注</span>
                    <Input.TextArea
                      rows={2}
                      placeholder="选填"
                      value={createDraft.remark}
                      onChange={(e) => setCreateDraft((d) => ({ ...d, remark: e.target.value }))}
                    />
                  </label>
                </div>
              </div>

              <div className="cum-modal-section" style={{ marginBottom: 0 }}>
                <div className="cum-modal-section-hd">
                  <div className="cum-modal-section-title">堆煤方案</div>
                  <Space>
                    <Button type="primary" ghost size="small" onClick={openSchemeEditor}>
                      创建方案
                    </Button>
                    <Button
                      type="primary"
                      ghost
                      size="small"
                      disabled={!createDraft.stack.length}
                      onClick={openSchemeEditor}
                    >
                      方案调整
                    </Button>
                  </Space>
                </div>
                <Table
                  size="small"
                  rowKey="key"
                  columns={createStackColumns}
                  dataSource={createDraft.stack}
                  pagination={false}
                  scroll={{ x: 900, y: createDraft.stack.length > 8 ? 280 : undefined }}
                  locale={{ emptyText: '暂无堆煤方案，请点击「创建方案」' }}
                />
              </div>
            </div>
          </div>
        </Drawer>

        <Drawer
          title="选择入厂批次"
          open={batchPickerOpen}
          onClose={() => setBatchPickerOpen(false)}
          width="min(1120px, 94vw)"
          destroyOnHidden
          push={false}
          styles={{ body: { paddingTop: 12, display: 'flex', flexDirection: 'column' } }}
          footer={
            <div className="cum-drawer-footer">
              <span className="cum-footer-hint">
                {batchPickId
                  ? `已选：${ENTRY_BATCHES.find((b) => b.id === batchPickId)?.regNo ?? ''}`
                  : '请单选一条入厂批次'}
              </span>
              <Space>
                <Button onClick={clearBatchPick}>清空</Button>
                <Button onClick={() => setBatchPickerOpen(false)}>取消</Button>
                <Button type="primary" onClick={applyBatchPick}>
                  确定
                </Button>
              </Space>
            </div>
          }
        >
          <Table
            size="small"
            rowKey="id"
            columns={batchColumns}
            dataSource={ENTRY_BATCHES}
            pagination={{
              total: ENTRY_BATCHES.length,
              pageSize: 10,
              showTotal: (t) => `共 ${t} 条`,
              showSizeChanger: false,
            }}
            scroll={{ x: 1000, y: 'calc(100vh - 220px)' }}
            onRow={(row) => ({
              onClick: () => setBatchPickId(row.id),
              style: { cursor: 'pointer' },
            })}
          />
        </Drawer>

        <Drawer
          title="堆煤方案编辑"
          open={schemeOpen}
          onClose={() => setSchemeOpen(false)}
          width="min(1180px, 96vw)"
          destroyOnHidden
          push={false}
          styles={{ body: { paddingTop: 12, display: 'flex', flexDirection: 'column' } }}
          footer={
            <div className="cum-drawer-footer">
              <span className="cum-footer-hint">
                已选 {schemeSelected.length} 区 · 已分配合计{' '}
                <b className="cum-num">{schemeSelectedSum.toFixed(3)}</b> /{' '}
                {createDraft.planTon.toFixed(3)} t
              </span>
              <Space>
                <Button onClick={() => setSchemeOpen(false)}>取消</Button>
                <Button type="primary" onClick={saveScheme}>
                  保存
                </Button>
              </Space>
            </div>
          }
        >
          <div className="cum-drawer-body">
            <div className="cum-summary-grid cum-summary-grid-3">
              <div className="cum-summary-item">
                <span className="k">煤品种</span>
                <span className="v">{createDraft.coal || '—'}</span>
              </div>
              <div className="cum-summary-item">
                <span className="k">煤种</span>
                <span className="v">{createDraft.coalType || '—'}</span>
              </div>
              <div className="cum-summary-item">
                <span className="k">计划堆煤量</span>
                <span className="v cum-num">{createDraft.planTon.toLocaleString()} t</span>
              </div>
              <div className="cum-summary-item">
                <span className="k">入厂登记编号</span>
                <span className="v">{createDraft.regNo || '—'}</span>
              </div>
              <div className="cum-summary-item">
                <span className="k">航次</span>
                <span className="v">{createDraft.voyage || '—'}</span>
              </div>
              <div className="cum-summary-item">
                <span className="k">船号</span>
                <span className="v">{createDraft.ship || '—'}</span>
              </div>
            </div>

            <div className="cum-zone-picker-toolbar">
              <Space wrap>
                <Select
                  allowClear
                  size="small"
                  placeholder="全部煤场"
                  style={{ width: 140 }}
                  value={schemeYardFilter}
                  options={YARD_NAMES.map((yard) => ({
                    value: yard,
                    label: yard === YARD_NAME ? '一号煤场' : '二号煤场',
                  }))}
                  onChange={(val) => setSchemeYardFilter(val)}
                />
                <Checkbox
                  checked={schemeOnlySelected}
                  onChange={(e) => setSchemeOnlySelected(e.target.checked)}
                >
                  仅展示已选分区
                </Checkbox>
                <Button type="primary" size="small" onClick={allocateSchemeTons}>
                  分配卸煤量
                </Button>
                <Button size="small" icon={<ReloadOutlined />} onClick={resetSchemeCalc}>
                  重置
                </Button>
              </Space>
              <span className="cum-footer-hint" style={{ marginRight: 0 }}>
                已选 {schemeSelected.length} 区 ·{' '}
                {YARD_NAMES.map(
                  (yard) => `${yard.replace('圆形煤场', '')} ${schemeYardTabCounts[yard] || 0}`,
                ).join(' · ')}
              </span>
            </div>

            {schemeHasOverflow && (
              <div className="cum-alert warn">可能超出分区容量：部分分区堆煤后将超过容量上限，请调整分区或煤量。</div>
            )}
            {!schemeBalanceOk && schemeSelected.length > 0 && (
              <div className="cum-alert error">输入的煤量总和与计划堆煤量不相等!</div>
            )}
            {schemeBalanceOk && !schemeHasOverflow && (
              <div className="cum-alert ok">校验通过：分区计划堆煤量合计等于计划堆煤量，容量校验通过。</div>
            )}
            {schemeBalanceOk && schemeHasOverflow && (
              <div className="cum-alert ok">煤量合计已对齐；仍有分区可能超出容量，请确认后保存。</div>
            )}

            <div className="cum-step-panel">
              <Table
                size="small"
                rowKey="key"
                columns={schemeEditorColumns}
                dataSource={schemeEditorRows}
                pagination={false}
                tableLayout="fixed"
                scroll={{ y: 'calc(100vh - 360px)', x: 1180 }}
                rowClassName={(row) =>
                  `${row.yard === YARD_NAME ? 'cum-row-y1' : 'cum-row-y2'}${row.overflow ? ' cum-row-overflow' : ''}`
                }
                locale={{ emptyText: schemeOnlySelected ? '暂无已选分区' : '暂无分区数据' }}
                rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys: schemeSelected,
                  onChange: (keys) => {
                    const visibleKeys = new Set(schemeEditorRows.map((r) => r.key));
                    const hiddenSelected = schemeSelected.filter((k) => !visibleKeys.has(k));
                    const next = Array.from(new Set([...hiddenSelected, ...keys.map(String)])).sort();
                    setSchemeSelected(next);
                    const set = new Set(next);
                    setSchemeRows((prev) =>
                      prev.map((r) =>
                        set.has(r.key)
                          ? r
                          : { ...r, planTon: null, weightPct: 0, overflow: false },
                      ),
                    );
                  },
                  preserveSelectedRowKeys: true,
                }}
              />
            </div>
          </div>
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default Component;
