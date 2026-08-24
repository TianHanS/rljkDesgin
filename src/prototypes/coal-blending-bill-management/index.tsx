/**
 * @name 配煤单管理
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-standards.md
 * - /assets/templates/spec-template.md
 */
import React, { useMemo, useState } from 'react';
import {
  Button,
  ConfigProvider,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Modal,
  message,
} from 'antd';
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  UpOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { openExportDocument } from './export-document';
import { buildDispatchPayload, dispatchToYardControl, getSourceType } from './dispatch-document';
import './style.css';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { TextArea } = Input;

const STATION_CODE = 'GXSZ';
const UNITS = ['1号机组', '2号机组'];
const BUNKERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const today = dayjs().format('YYYY-MM-DD');

type PlanStatus = 0 | 1 | 2 | 3 | 4;

const STATUS_META: Record<PlanStatus, { label: string; color: string }> = {
  0: { label: '编辑', color: 'default' },
  1: { label: '审核中', color: 'processing' },
  2: { label: '审核中', color: 'processing' },
  3: { label: '审核通过', color: 'success' },
  4: { label: '退回', color: 'error' },
};

/** 加仓明细分组（查看报表用） */
const BUNKER_GROUPS = [
  {
    key: 'abc',
    unit1Label: '1号机组/A、B、C',
    unit2Label: '2号机组/A、B、C',
    bunkers: ['A', 'B', 'C'],
  },
  {
    key: 'ef',
    unit1Label: '1号机组/E、F',
    unit2Label: '2号机组/E、F',
    bunkers: ['E', 'F'],
  },
  {
    key: 'd',
    unit1Label: '1号机组/D',
    unit2Label: '2号机组/D',
    bunkers: ['D'],
  },
];

type CoalSourceType = 'yard' | 'port';

interface BlendDetail {
  id: string;
  sourceType: CoalSourceType;
  yard: string;
  zone: string;
  coalType: string;
  batchNo: string;
  calorific: number;
  volatile: number;
  sulfur: number;
  moisture: number;
  ash: number;
  units: string[];
  bunkers: string[];
}

interface PlanItem {
  id: string;
  planNo: string;
  planName: string;
  planDate: string;
  startTime: string;
  endTime: string;
  remark: string;
  planDesc: string;
  clearNode: string;
  notice: string;
  creator: string;
  status: PlanStatus;
  details: BlendDetail[];
}

interface YardCoal {
  id: string;
  yard: string;
  zone: string;
  coalType: string;
  stock: number;
  calorific: number;
  volatile: number;
  sulfur: number;
  moisture: number;
  ash: number;
}

interface BerthForecast {
  id: string;
  shipNo: string;
  regNo: string;
  planTime: string;
  coalType: string;
  forecastQty: number;
  calorific: number;
  volatile: number;
  sulfur: number;
  moisture: number;
  ash: number;
}

const MOCK_YARD_COALS: YardCoal[] = (() => {
  const samples = [
    { coalType: '进口煤', stock: 12500, calorific: 4773, volatile: 25.87, sulfur: 0.74, moisture: 14.4, ash: 18.42 },
    { coalType: '进口煤', stock: 9800, calorific: 4680, volatile: 24.5, sulfur: 0.68, moisture: 15.1, ash: 17.8 },
    { coalType: '优混/5000', stock: 8200, calorific: 5010, volatile: 26.1, sulfur: 0.55, moisture: 13.2, ash: 16.5 },
    { coalType: '鹏安/287', stock: 15600, calorific: 5120, volatile: 25.87, sulfur: 0.49, moisture: 18.3, ash: 11.58 },
    { coalType: '褐煤/3200', stock: 6400, calorific: 3200, volatile: 28.2, sulfur: 0.32, moisture: 35.1, ash: 8.2 },
    { coalType: '国信1-5000', stock: 11200, calorific: 4980, volatile: 24.2, sulfur: 0.62, moisture: 14.8, ash: 17.1 },
  ];
  const rows: YardCoal[] = [];
  let seq = 1;
  ['#1煤场', '#2煤场'].forEach((yard, yi) => {
    const zoneCount = yard === '#1煤场' ? 13 : 8;
    for (let z = 1; z <= zoneCount; z++) {
      const s = samples[(yi + z) % samples.length];
      rows.push({
        id: `Y${seq}`,
        yard,
        zone: `${z}区`,
        coalType: s.coalType,
        stock: Math.max(3200, s.stock - z * 180),
        calorific: s.calorific + (z % 4) * 15,
        volatile: s.volatile,
        sulfur: s.sulfur,
        moisture: s.moisture,
        ash: s.ash,
      });
      seq += 1;
    }
  });
  return rows;
})();

const MOCK_BERTH: BerthForecast[] = [
  { id: 'B1', shipNo: '长春门', regNo: 'RC2025060101', planTime: '2026-06-18 08:00:00', coalType: '进口煤', forecastQty: 32000, calorific: 4750, volatile: 25.5, sulfur: 0.72, moisture: 14.8, ash: 18.0 },
  { id: 'B2', shipNo: '盛荣海', regNo: 'RC2025061202', planTime: '2026-06-19 14:00:00', coalType: '新海通3', forecastQty: 28000, calorific: 3360, volatile: 26.45, sulfur: 0.32, moisture: 38.1, ash: 7.75 },
  { id: 'B3', shipNo: '新海通3', regNo: 'RC2025061503', planTime: '2026-06-20 06:30:00', coalType: '褐煤/3200', forecastQty: 35000, calorific: 3280, volatile: 27.8, sulfur: 0.35, moisture: 36.5, ash: 8.1 },
  { id: 'B4', shipNo: '鹏安', regNo: 'RC2025061604', planTime: '2026-06-21 10:00:00', coalType: '鹏安/287', forecastQty: 26000, calorific: 5080, volatile: 25.6, sulfur: 0.51, moisture: 17.9, ash: 11.9 },
  { id: 'B5', shipNo: '国信1', regNo: 'RC2025061705', planTime: '2026-06-22 16:20:00', coalType: '国信1-5000', forecastQty: 30000, calorific: 4920, volatile: 24.8, sulfur: 0.58, moisture: 15.2, ash: 16.8 },
];

const YARD_OPTIONS = Array.from(new Set(MOCK_YARD_COALS.map((c) => c.yard))).map((y) => ({ label: y, value: y }));

const yardCoalToDetail = (y: YardCoal, units: string[], bunkers: string[], id: string): BlendDetail => ({
  id,
  sourceType: 'yard',
  yard: y.yard,
  zone: y.zone,
  coalType: y.coalType,
  batchNo: '-',
  calorific: y.calorific,
  volatile: y.volatile,
  sulfur: y.sulfur,
  moisture: y.moisture,
  ash: y.ash,
  units,
  bunkers,
});

const portCoalToDetail = (b: BerthForecast, units: string[], bunkers: string[], id: string): BlendDetail => ({
  id,
  sourceType: 'port',
  yard: '在港待卸煤',
  zone: b.regNo,
  coalType: b.coalType,
  batchNo: b.shipNo,
  calorific: b.calorific,
  volatile: b.volatile,
  sulfur: b.sulfur,
  moisture: b.moisture,
  ash: b.ash,
  units,
  bunkers,
});

const buildZoneRows = (
  prefix: string,
  yard: string,
  zones: number[]
): Omit<BlendDetail, 'units' | 'bunkers'>[] => {
  const coalSamples = [
    { coalType: '2613', batchNo: '长春门', calorific: 4773, volatile: 25.87, sulfur: 0.74, moisture: 14.4, ash: 18.42 },
    { coalType: '287', batchNo: '鹏安', calorific: 5120, volatile: 25.87, sulfur: 0.49, moisture: 18.3, ash: 11.58 },
    { coalType: '新海通3', batchNo: '新海通3', calorific: 3360, volatile: 26.45, sulfur: 0.32, moisture: 38.1, ash: 7.75 },
  ];
  return zones.map((z, i) => {
    const sample = coalSamples[i % coalSamples.length];
    return {
      id: `${prefix}-${z}`,
      sourceType: 'yard' as const,
      yard,
      zone: `${z}区`,
      coalType: sample.coalType,
      batchNo: sample.batchNo,
      calorific: sample.calorific,
      volatile: sample.volatile,
      sulfur: sample.sulfur,
      moisture: sample.moisture,
      ash: sample.ash,
    };
  });
};

const buildPortBatchRows = (
  prefix: string,
  batches: BerthForecast[],
  units: string[],
  bunkers: string[]
): BlendDetail[] =>
  batches.map((b, i) => ({
    id: `${prefix}-port-${i}`,
    sourceType: 'port',
    yard: '在港待卸煤',
    zone: b.regNo,
    coalType: b.coalType,
    batchNo: b.shipNo,
    calorific: b.calorific,
    volatile: b.volatile,
    sulfur: b.sulfur,
    moisture: b.moisture,
    ash: b.ash,
    units,
    bunkers,
  }));

const makeDetailsForPlan = (planId: string): BlendDetail[] => {
  const base = [
    ...buildZoneRows(`${planId}-1`, '#1煤场', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]).map((r) => ({
      ...r,
      units: UNITS,
      bunkers: ['A', 'B', 'C'],
    })),
    ...buildPortBatchRows(`${planId}-1`, [MOCK_BERTH[0]], UNITS, ['A', 'B', 'C']),
    ...buildZoneRows(`${planId}-2`, '#2煤场', [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]).map((r) => ({
      ...r,
      units: UNITS,
      bunkers: ['E', 'F'],
    })),
    ...buildZoneRows(`${planId}-3`, '#1煤场', [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).map((r) => ({
      ...r,
      units: UNITS,
      bunkers: ['D'],
    })),
    ...buildPortBatchRows(`${planId}-3`, [MOCK_BERTH[1]], UNITS, ['D']),
  ];
  return base;
};

const initialPlans: PlanItem[] = [
  {
    id: 'P1',
    planNo: `${STATION_CODE}-${dayjs().format('YYMMDD')}01`,
    planName: `${dayjs().format('YYMMDD')}加仓计划`,
    planDate: today,
    startTime: `${today} 00:00:00`,
    endTime: `${today} 23:59:59`,
    remark: '当日常规配煤',
    planDesc: '各值长、煤值班员严禁将入炉煤掺配的煤种进错仓。',
    clearNode: '中班入炉前完成清场',
    notice: '#1、#2煤场13柱附近高温，取用注意防止煤自燃',
    creator: '发电部燃料专工',
    status: 0,
    details: makeDetailsForPlan('P1'),
  },
  {
    id: 'P2',
    planNo: `${STATION_CODE}-26061501`,
    planName: '0615加仓计划',
    planDate: '2026-06-15',
    startTime: '2026-06-15 00:00:00',
    endTime: '2026-06-15 23:59:59',
    remark: '',
    planDesc: '低温通道优先',
    clearNode: '',
    notice: '',
    creator: '发电部燃料专工',
    status: 1,
    details: makeDetailsForPlan('P2').slice(0, 20),
  },
  {
    id: 'P3',
    planNo: `${STATION_CODE}-26060901`,
    planName: '0609加仓计划',
    planDate: '2026-06-09',
    startTime: '2026-06-09 00:00:00',
    endTime: '2026-06-09 23:59:59',
    remark: '',
    planDesc: '常规配比',
    clearNode: '',
    notice: '',
    creator: '发电部燃料专工',
    status: 3,
    details: makeDetailsForPlan('P3').slice(0, 25),
  },
  {
    id: 'P4',
    planNo: `${STATION_CODE}-26060801`,
    planName: '0608加仓计划',
    planDate: '2026-06-08',
    startTime: '2026-06-08 00:00:00',
    endTime: '2026-06-08 23:59:59',
    remark: '',
    planDesc: '夜班补煤',
    clearNode: '',
    notice: '',
    creator: '发电部燃料专工',
    status: 4,
    details: makeDetailsForPlan('P4').slice(0, 15),
  },
];

const isExpired = (plan: PlanItem) => dayjs(plan.endTime).isBefore(dayjs());
const canEdit = (plan: PlanItem) =>
  plan.status === 0 || plan.status === 4 || (plan.status === 3 && !isExpired(plan));
const statusTag = (status: PlanStatus) => {
  const m = STATUS_META[status];
  return <Tag color={m.color}>{m.label}</Tag>;
};

const filterDetailsByGroup = (details: BlendDetail[], bunkers: string[]) =>
  details
    .filter((d) => d.bunkers.some((b) => bunkers.includes(b)))
    .sort(
      (a, b) =>
        getSourceType(a).localeCompare(getSourceType(b)) ||
        a.yard.localeCompare(b.yard) ||
        a.zone.localeCompare(b.zone)
    );

const formatSourceDisplay = (row: BlendDetail) =>
  getSourceType(row) === 'port' ? '在港待卸煤' : row.yard;

const buildGroupSummary = (rows: BlendDetail[]) => {
  const hasYard = rows.some((r) => getSourceType(r) === 'yard');
  const hasPort = rows.some((r) => getSourceType(r) === 'port');
  const sourceDisplay =
    hasYard && hasPort ? '煤场/在港待卸煤' : hasPort ? '在港待卸煤' : rows[0]?.yard ?? '-';
  const zoneRange =
    rows.length > 1
      ? `${rows[0].zone.replace('区', '')}-${rows[rows.length - 1].zone.replace('区', '')}分区`
      : rows[0].zone.includes('分区') ? rows[0].zone : `${rows[0].zone}`;
  const avg = (key: keyof BlendDetail) => {
    const nums = rows.map((r) => Number(r[key]));
    return (nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(3);
  };
  return {
    yard: sourceDisplay,
    zone: zoneRange,
    coalType: rows[0]?.coalType ?? '-',
    batchNo: rows[0]?.batchNo ?? '-',
    calorific: avg('calorific'),
    volatile: avg('volatile'),
    sulfur: avg('sulfur'),
    moisture: avg('moisture'),
    ash: avg('ash'),
  };
};

const DetailRowCells = ({
  row,
  editable,
  onEdit,
  onDelete,
}: {
  row: Pick<BlendDetail, 'yard' | 'zone' | 'coalType' | 'batchNo' | 'calorific' | 'volatile' | 'sulfur' | 'moisture' | 'ash'> & {
    id?: string;
  };
  editable?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) => (
  <>
    <td>
      <Space size={4}>
        <span>{formatSourceDisplay(row as BlendDetail)}</span>
        {getSourceType(row as BlendDetail) === 'port' && (
          <Tag color="orange" className="!m-0 !text-[10px] !leading-4">
            入厂批次
          </Tag>
        )}
      </Space>
    </td>
    <td>{row.zone}</td>
    <td>{row.coalType}</td>
    <td>{row.batchNo}</td>
    <td>{row.calorific}</td>
    <td>{row.volatile}</td>
    <td>{row.sulfur}</td>
    <td>{row.moisture}</td>
    <td>{row.ash}</td>
    {editable && row.id && (
      <td>
        <Space size={0}>
          <Button type="link" size="small" onClick={() => onEdit?.(row.id!)}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => onDelete?.(row.id!)}>
            删除
          </Button>
        </Space>
      </td>
    )}
    {editable && !row.id && <td />}
  </>
);

const BunkerGroupTable = ({
  group,
  rows,
  expanded,
  onToggle,
  editable,
  onEdit,
  onDelete,
}: {
  group: (typeof BUNKER_GROUPS)[number];
  rows: BlendDetail[];
  expanded: boolean;
  onToggle: () => void;
  editable?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) => {
  const summary = buildGroupSummary(rows);

  return (
    <div className="cbbm-group-block">
      <div className="cbbm-group-header">
        <span className="cbbm-group-header-label">加仓机组及煤仓</span>
        <span>{group.unit1Label}</span>
        <span className="cbbm-group-header-right">
          <span>{group.unit2Label}</span>
          <Button type="link" size="small" className="cbbm-toggle-link" onClick={onToggle}>
            {expanded ? (
              <>
                <UpOutlined /> 收起明细
              </>
            ) : (
              <>
                <DownOutlined /> 查看明细（{rows.length}条）
              </>
            )}
          </Button>
        </span>
      </div>
      <div className="cbbm-report-table-wrap">
        <table className="cbbm-report-table">
          <thead>
            <tr>
              <th>取煤来源</th>
              <th>分区/批次</th>
              <th>煤种</th>
              <th>批次车船号</th>
              <th>低位发热量</th>
              <th>挥发分</th>
              <th>硫分</th>
              <th>全水</th>
              <th>灰分</th>
              {editable && <th style={{ width: 100 }}>操作</th>}
            </tr>
          </thead>
          <tbody>
            {!expanded ? (
              <tr className="cbbm-summary-row">
                <DetailRowCells row={summary} />
              </tr>
            ) : (
              <>
                {rows.map((row) => (
                  <tr key={row.id} className={getSourceType(row) === 'port' ? 'cbbm-port-row' : undefined}>
                    <DetailRowCells row={row} editable={editable} onEdit={onEdit} onDelete={onDelete} />
                  </tr>
                ))}
                <tr className="cbbm-total-row">
                  <td colSpan={2}>合计</td>
                  <td>{summary.zone}</td>
                  <td>{summary.coalType}</td>
                  <td>{summary.batchNo}</td>
                  <td>{summary.calorific}</td>
                  <td>{summary.volatile}</td>
                  <td>{summary.sulfur}</td>
                  <td>{summary.moisture}</td>
                  <td>{summary.ash}</td>
                  {editable && <td />}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const GroupedReport = ({
  details,
  editable,
  onEdit,
  onDelete,
}: {
  details: BlendDetail[];
  editable?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) => {
  const groupItems = BUNKER_GROUPS.map((group) => {
    const rows = filterDetailsByGroup(details, group.bunkers);
    if (rows.length === 0) return null;
    return { key: group.key, group, rows };
  }).filter(Boolean) as Array<{
    key: string;
    group: (typeof BUNKER_GROUPS)[number];
    rows: BlendDetail[];
  }>;

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  if (groupItems.length === 0) return null;

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    groupItems.forEach((g) => {
      next[g.key] = true;
    });
    setExpandedMap(next);
  };

  return (
    <div className="cbbm-grouped-report">
      <div className="cbbm-report-toolbar">
        <Text type="secondary" className="text-xs">
          默认展示合计行；点击「查看明细」展开分区数据
        </Text>
        <Space size={4}>
          <Button type="link" size="small" icon={<DownOutlined />} onClick={expandAll}>
            展开全部
          </Button>
          <Button type="link" size="small" icon={<UpOutlined />} onClick={() => setExpandedMap({})}>
            收起全部
          </Button>
        </Space>
      </div>

      {groupItems.map(({ key, group, rows }) => (
        <BunkerGroupTable
          key={key}
          group={group}
          rows={rows}
          expanded={!!expandedMap[key]}
          onToggle={() => setExpandedMap((prev) => ({ ...prev, [key]: !prev[key] }))}
          editable={editable}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

const bunkerOptions = UNITS.flatMap((u) =>
  BUNKERS.map((b) => ({ label: `${u}/${b}仓`, value: `${u}|${b}` }))
).sort((a, b) => a.label.localeCompare(b.label));

const ALL_BUNKER_TARGETS = UNITS.flatMap((unit) =>
  BUNKERS.map((bunker) => ({
    unit,
    bunker,
    key: `${unit}|${bunker}`,
    label: `${unit}/${bunker}仓`,
  }))
);

const getCoveredBunkerKeys = (details: BlendDetail[]) => {
  const covered = new Set<string>();
  details.forEach((d) => {
    d.units.forEach((u) => {
      d.bunkers.forEach((b) => covered.add(`${u}|${b}`));
    });
  });
  return covered;
};

const getMissingBunkerTargets = (details: BlendDetail[]) => {
  const covered = getCoveredBunkerKeys(details);
  return ALL_BUNKER_TARGETS.filter((t) => !covered.has(t.key));
};

const Component = () => {
  const [plans, setPlans] = useState<PlanItem[]>(initialPlans);

  const [planNoInput, setPlanNoInput] = useState('');
  const [rangeInput, setRangeInput] = useState<[Dayjs, Dayjs] | null>(null);
  const [query, setQuery] = useState({
    planNo: '',
    range: null as [Dayjs, Dayjs] | null,
    defaultToday: true,
  });

  const [planForm] = Form.useForm();
  const [planDrawer, setPlanDrawer] = useState<{
    open: boolean;
    mode: 'create' | 'edit' | 'view';
    id: string | null;
  }>({ open: false, mode: 'create', id: null });
  const [draftDetails, setDraftDetails] = useState<BlendDetail[]>([]);
  const [createStep, setCreateStep] = useState(0);

  const [detailForm] = Form.useForm();
  const [detailFormDrawer, setDetailFormDrawer] = useState<{
    open: boolean;
    planId: string | null;
    editingId: string | null;
  }>({ open: false, planId: null, editingId: null });
  const [cachedYardPicks, setCachedYardPicks] = useState<YardCoal[]>([]);
  const [cachedPortPicks, setCachedPortPicks] = useState<BerthForecast[]>([]);
  const [coalPickDrawer, setCoalPickDrawer] = useState(false);
  const [pickTab, setPickTab] = useState<'yard' | 'port'>('yard');
  const [pickDraftYardIds, setPickDraftYardIds] = useState<string[]>([]);
  const [pickDraftPortIds, setPickDraftPortIds] = useState<string[]>([]);
  const [yardFilterYard, setYardFilterYard] = useState<string | undefined>();
  const [yardFilterCoalType, setYardFilterCoalType] = useState('');
  const [yardFilterCalMin, setYardFilterCalMin] = useState<number | null>(null);
  const [yardFilterCalMax, setYardFilterCalMax] = useState<number | null>(null);
  const [yardQuery, setYardQuery] = useState({
    yard: undefined as string | undefined,
    coalType: '',
    calMin: null as number | null,
    calMax: null as number | null,
  });
  const [selectedExportId, setSelectedExportId] = useState<string | null>(null);

  const editingPlan = plans.find((p) => p.id === planDrawer.id) || null;

  const isPlanView = planDrawer.mode === 'view';
  const isCreateMode = planDrawer.mode === 'create';
  const detailEditable =
    !isPlanView && (planDrawer.mode === 'create' || editingPlan?.status === 0 || editingPlan?.status === 4);

  const filteredYardCoals = useMemo(() => {
    let list = [...MOCK_YARD_COALS];
    if (yardQuery.yard) list = list.filter((c) => c.yard === yardQuery.yard);
    if (yardQuery.coalType.trim()) {
      const kw = yardQuery.coalType.trim().toLowerCase();
      list = list.filter((c) => c.coalType.toLowerCase().includes(kw));
    }
    if (yardQuery.calMin != null) list = list.filter((c) => c.calorific >= yardQuery.calMin!);
    if (yardQuery.calMax != null) list = list.filter((c) => c.calorific <= yardQuery.calMax!);
    return list.sort((a, b) => a.yard.localeCompare(b.yard) || a.zone.localeCompare(b.zone));
  }, [yardQuery]);

  const cachedCoalRows = useMemo(
    () => [
      ...cachedYardPicks.map((y) => ({
        key: `yard-${y.id}`,
        sourceType: 'yard' as const,
        label: `${y.yard} / ${y.zone}`,
        coalType: y.coalType,
        calorific: y.calorific,
        refId: y.id,
      })),
      ...cachedPortPicks.map((p) => ({
        key: `port-${p.id}`,
        sourceType: 'port' as const,
        label: p.shipNo,
        coalType: p.coalType,
        calorific: p.calorific,
        refId: p.id,
      })),
    ],
    [cachedYardPicks, cachedPortPicks]
  );

  const filteredPlans = useMemo(() => {
    let list = [...plans];
    if (query.defaultToday) {
      list = list.filter((p) => p.planDate === today);
    } else {
      if (query.planNo) list = list.filter((p) => p.planNo.includes(query.planNo));
      if (query.range) {
        const [s, e] = query.range;
        list = list.filter((p) => {
          const t = dayjs(p.startTime);
          return t.isAfter(s.startOf('day').subtract(1, 'ms')) && t.isBefore(e.endOf('day').add(1, 'ms'));
        });
      }
    }
    return list.sort((a, b) => dayjs(b.planDate).valueOf() - dayjs(a.planDate).valueOf());
  }, [plans, query]);

  const runSearch = () => {
    const hasCond = !!planNoInput.trim() || !!rangeInput;
    setQuery({ planNo: planNoInput.trim(), range: rangeInput, defaultToday: !hasCond });
    setSelectedExportId(null);
  };

  const handleExport = () => {
    if (!selectedExportId) {
      message.warning('请先选择需导出的配煤单');
      return;
    }
    const plan = plans.find((p) => p.id === selectedExportId);
    if (!plan) {
      message.warning('所选配煤单不存在，请重新选择');
      return;
    }
    Modal.confirm({
      title: '确认导出',
      content: (
        <div>
          <div>
            计划编号：<Text strong>{plan.planNo}</Text>
          </div>
          <div>
            计划名称：{plan.planName}
          </div>
          <div className="text-slate-500 text-sm mt-2">将按「入炉煤掺配方式」版式生成打印预览。</div>
        </div>
      ),
      okText: '确认导出',
      cancelText: '取消',
      onOk: () => {
        const ok = openExportDocument({
          planNo: plan.planNo,
          planDate: plan.planDate,
          planDesc: plan.planDesc,
          clearNode: plan.clearNode,
          notice: plan.notice,
          details: plan.details,
        });
        if (!ok) {
          message.error('无法打开导出窗口，请检查浏览器是否拦截弹窗');
          return Promise.reject();
        }
        message.success('已打开导出预览，可在打印对话框中保存为 PDF');
      },
    });
  };

  const genSeq = (date: string, excludeId?: string) =>
    plans.filter((p) => p.planDate === date && p.id !== excludeId).length + 1;
  const genPlanNo = (date: string, seq: number) =>
    `${STATION_CODE}-${dayjs(date).format('YYMMDD')}${String(seq).padStart(2, '0')}`;
  const genPlanName = (date: string, seq: number) =>
    `${dayjs(date).format('YYMMDD')}加仓计划${seq === 1 ? '' : seq}`;

  const closePlanDrawer = () => {
    setPlanDrawer({ open: false, mode: 'create', id: null });
    setDraftDetails([]);
    setCreateStep(0);
  };

  const openPlanDrawer = (mode: 'create' | 'edit' | 'view', plan?: PlanItem) => {
    if (plan) {
      fillPlanForm(plan);
      setDraftDetails(plan.details.map((d) => ({ ...d })));
      setCreateStep(0);
      setPlanDrawer({ open: true, mode, id: plan.id });
    } else {
      planForm.resetFields();
      const d = dayjs();
      planForm.setFieldsValue({ planDate: d, startTime: d.startOf('day'), endTime: d.endOf('day') });
      setDraftDetails([]);
      setCreateStep(0);
      setPlanDrawer({ open: true, mode: 'create', id: null });
    }
  };

  const openCreate = () => openPlanDrawer('create');
  const openEditPlan = (plan: PlanItem) => openPlanDrawer('edit', plan);
  const openViewPlan = (plan: PlanItem) => openPlanDrawer('view', plan);
  const fillPlanForm = (plan: PlanItem) => {
    planForm.setFieldsValue({
      planDate: dayjs(plan.planDate),
      startTime: dayjs(plan.startTime),
      endTime: dayjs(plan.endTime),
      planName: plan.planName,
      remark: plan.remark,
      planDesc: plan.planDesc,
      clearNode: plan.clearNode,
      notice: plan.notice,
    });
  };

  const handlePlanDateChange = (date: Dayjs | null) => {
    if (!date) return;
    planForm.setFieldsValue({ startTime: date.startOf('day'), endTime: date.endOf('day') });
    const dateStr = date.format('YYYY-MM-DD');
    if (plans.some((p) => p.planDate === dateStr && p.id !== planDrawer.id)) {
      message.info(`${dateStr} 已存在一条加仓计划！可继续添加！`);
    }
  };

  const persistPlan = (values: Record<string, unknown>) => {
    const base = {
      planDate: (values.planDate as Dayjs).format('YYYY-MM-DD'),
      startTime: (values.startTime as Dayjs).format('YYYY-MM-DD HH:mm:ss'),
      endTime: (values.endTime as Dayjs).format('YYYY-MM-DD HH:mm:ss'),
      remark: (values.remark as string) || '',
      planDesc: (values.planDesc as string) || '',
      clearNode: (values.clearNode as string) || '',
      notice: (values.notice as string) || '',
    };
    if (planDrawer.mode === 'edit' && planDrawer.id) {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planDrawer.id
            ? {
                ...p,
                ...base,
                planName: ((values.planName as string) || '').trim() || p.planName,
                details: draftDetails.map((d) => ({ ...d })),
              }
            : p
        )
      );
      message.success(`配煤单已保存（含 ${draftDetails.length} 条加仓明细）`);
    } else {
      const seq = genSeq(base.planDate);
      const newPlan: PlanItem = {
        id: `P-${Date.now()}`,
        planNo: genPlanNo(base.planDate, seq),
        planName: ((values.planName as string) || '').trim() || genPlanName(base.planDate, seq),
        ...base,
        creator: '发电部燃料专工',
        status: 0,
        details: draftDetails.map((d) => ({ ...d })),
      };
      setPlans((prev) => [newPlan, ...prev]);
      message.success(`配煤单已创建：${newPlan.planNo}（含 ${draftDetails.length} 条加仓明细）`);
    }
    closePlanDrawer();
  };

  const savePlan = async () => {
    const values = await planForm.validateFields();
    const missing = getMissingBunkerTargets(draftDetails);
    if (missing.length > 0) {
      Modal.confirm({
        title: '加仓方案缺失提示',
        width: 520,
        content: (
          <div>
            <div className="mb-2">以下机组煤仓尚无加仓取煤方案：</div>
            <div className="text-[#cf1322] leading-relaxed">{missing.map((m) => m.label).join('、')}</div>
            <div className="text-slate-500 text-sm mt-3">请确认是否仍要保存配煤单？</div>
          </div>
        ),
        okText: '确认无误，保存',
        cancelText: '返回修改',
        onOk: () => persistPlan(values),
      });
      return;
    }
    persistPlan(values);
  };

  const goCreateNextStep = async () => {
    try {
      await planForm.validateFields();
      setCreateStep(1);
    } catch {
      message.warning('请完善计划主体信息');
    }
  };

  const removePlan = (plan: PlanItem) => {
    setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    message.success('配煤单已删除');
  };

  const submitApproval = (plan: PlanItem) => {
    if (plan.details.length === 0) {
      message.warning('请先维护加仓明细！');
      return;
    }
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, status: 1 as PlanStatus } : p)));
    message.success('已提交审批，当前状态为审核中');
  };

  const handleDispatch = (plan: PlanItem) => {
    const payload = buildDispatchPayload({
      planNo: plan.planNo,
      planDate: plan.planDate,
      details: plan.details,
    });
    if (payload.yardDetails.length === 0) {
      message.warning('当前配煤单无煤场取煤明细，无法下发至煤场管控一体化');
      return;
    }
    Modal.confirm({
      title: '下发堆取料机',
      content: (
        <div>
          <div>方案审批后会自动下发至煤场管控一体化，确认再次补发配煤方案？</div>
          <div className="text-slate-500 text-sm mt-2">
            本次下发仅包含煤场取煤明细 {payload.yardDetails.length} 条
            {payload.excludedPortCount > 0
              ? `，在港待卸煤入厂批次 ${payload.excludedPortCount} 条不参与下发`
              : ''}
            。
          </div>
        </div>
      ),
      okText: '确认下发',
      cancelText: '取消',
      onOk: () => {
        const result = dispatchToYardControl({
          planNo: plan.planNo,
          planDate: plan.planDate,
          details: plan.details,
        });
        if (!result.ok) {
          message.warning(result.reason);
          return Promise.reject();
        }
        message.success(
          `煤场取煤明细 ${result.payload.yardDetails.length} 条已补发至煤场管控一体化（${plan.planNo}）`
        );
      },
    });
  };

  const openDetailForm = (editingId: string | null) => {
    detailForm.resetFields();
    setCachedYardPicks([]);
    setCachedPortPicks([]);
    if (editingId) {
      const row = draftDetails.find((d) => d.id === editingId);
      if (row) {
        detailForm.setFieldsValue({
          bunkerTargets: row.units.flatMap((u) => row.bunkers.map((b) => `${u}|${b}`)),
        });
        if (getSourceType(row) === 'port') {
          const port = MOCK_BERTH.find((b) => b.shipNo === row.batchNo || b.regNo === row.zone);
          if (port) setCachedPortPicks([port]);
        } else {
          const yard = MOCK_YARD_COALS.find((c) => c.yard === row.yard && c.zone === row.zone);
          if (yard) setCachedYardPicks([yard]);
        }
      }
    }
    setDetailFormDrawer({ open: true, planId: planDrawer.id, editingId });
  };

  const closeDetailForm = () => {
    setDetailFormDrawer({ open: false, planId: null, editingId: null });
    setCachedYardPicks([]);
    setCachedPortPicks([]);
    setCoalPickDrawer(false);
  };

  const openCoalPickDrawer = () => {
    setPickDraftYardIds(cachedYardPicks.map((c) => c.id));
    setPickDraftPortIds(cachedPortPicks.map((c) => c.id));
    setPickTab('yard');
    setCoalPickDrawer(true);
  };

  const confirmCoalPick = () => {
    const yards = MOCK_YARD_COALS.filter((c) => pickDraftYardIds.includes(c.id));
    const ports = MOCK_BERTH.filter((c) => pickDraftPortIds.includes(c.id));
    if (yards.length === 0 && ports.length === 0) {
      message.warning('请至少选择一条加仓燃煤');
      return;
    }
    setCachedYardPicks(yards);
    setCachedPortPicks(ports);
    setCoalPickDrawer(false);
    message.success(`已选择煤场分区 ${yards.length} 个、在港在船煤 ${ports.length} 条`);
  };

  const runYardCoalSearch = () => {
    setYardQuery({
      yard: yardFilterYard,
      coalType: yardFilterCoalType,
      calMin: yardFilterCalMin,
      calMax: yardFilterCalMax,
    });
  };

  const removeCachedCoal = (key: string) => {
    if (key.startsWith('yard-')) {
      const id = key.replace('yard-', '');
      setCachedYardPicks((prev) => prev.filter((c) => c.id !== id));
    } else {
      const id = key.replace('port-', '');
      setCachedPortPicks((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const applyDetailChange = (updater: (list: BlendDetail[]) => BlendDetail[]) => {
    setDraftDetails((prev) => updater(prev));
  };

  const saveDetail = async () => {
    if (cachedYardPicks.length === 0 && cachedPortPicks.length === 0) {
      message.warning('请先选择加仓燃煤');
      return;
    }
    const values = await detailForm.validateFields();
    const targets: { unit: string; bunker: string }[] = (values.bunkerTargets as string[]).map((v) => {
      const [unit, bunker] = v.split('|');
      return { unit, bunker };
    });
    const units = Array.from(new Set(targets.map((t) => t.unit)));
    const bunkers = Array.from(new Set(targets.map((t) => t.bunker)));
    const ts = Date.now();

    const newRows: BlendDetail[] = [
      ...cachedYardPicks.map((y, i) => yardCoalToDetail(y, units, bunkers, `D-${ts}-y${i}`)),
      ...cachedPortPicks.map((b, i) => portCoalToDetail(b, units, bunkers, `D-${ts}-p${i}`)),
    ];

    if (detailFormDrawer.editingId) {
      applyDetailChange((list) => {
        const without = list.filter((d) => d.id !== detailFormDrawer.editingId);
        return [...without, ...newRows];
      });
      message.success('明细已更新');
    } else {
      applyDetailChange((list) => [...list, ...newRows]);
      message.success(`已缓存 ${newRows.length} 条加仓明细，保存计划后一并提交`);
    }
    closeDetailForm();
  };

  const deleteDetail = (detailId: string) => {
    applyDetailChange((list) => list.filter((d) => d.id !== detailId));
    message.success('明细已删除');
  };

  const planColumns: ColumnsType<PlanItem> = [
    { title: '计划编号', dataIndex: 'planNo', width: 160, sorter: (a, b) => a.planNo.localeCompare(b.planNo) },
    { title: '计划名称', dataIndex: 'planName', width: 140, sorter: (a, b) => a.planName.localeCompare(b.planName) },
    { title: '计划日期', dataIndex: 'planDate', width: 110, sorter: (a, b) => dayjs(a.planDate).valueOf() - dayjs(b.planDate).valueOf(), defaultSortOrder: 'descend' },
    { title: '开始时间', dataIndex: 'startTime', width: 165, sorter: (a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf() },
    { title: '结束时间', dataIndex: 'endTime', width: 165 },
    { title: '创建人', dataIndex: 'creator', width: 130 },
    { title: '明细数', width: 80, align: 'right', render: (_, r) => r.details.length },
    {
      title: '审核状态',
      width: 140,
      sorter: (a, b) => a.status - b.status,
      render: (_, row) => (
        <Space size={4}>
          {statusTag(row.status)}
          {row.status === 3 && isExpired(row) && <Tag>已过期</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      fixed: 'right',
      width: 280,
      render: (_, row) => (
        <Space size={2} wrap>
          {row.status !== 0 && (
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openViewPlan(row)}>
              查看
            </Button>
          )}
          {row.status === 3 && (
            <Button type="link" size="small" icon={<CloudUploadOutlined />} onClick={() => handleDispatch(row)}>
              下发堆取料机
            </Button>
          )}
          {canEdit(row) && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditPlan(row)}>
              编辑
            </Button>
          )}
          {row.status === 0 && (
            <Button type="link" size="small" icon={<SendOutlined />} onClick={() => submitApproval(row)}>
              提交审批
            </Button>
          )}
          {row.status === 0 && (
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => removePlan(row)}>
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <div className="cbbm-root">
        <div className="cbbm-page-title">
          <h1>
            <span className="cbbm-title-icon">+</span>
            配煤单管理
          </h1>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建计划
          </Button>
        </div>

        <div className="cbbm-filter-bar">
          <Space wrap>
            <Input
              placeholder="计划编号（模糊）"
              value={planNoInput}
              onChange={(e) => setPlanNoInput(e.target.value)}
              style={{ width: 180 }}
              allowClear
              onPressEnter={runSearch}
            />
            <RangePicker
              placeholder={['计划开始起', '计划开始止']}
              value={rangeInput}
              onChange={(v) => setRangeInput(v as [Dayjs, Dayjs] | null)}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={runSearch}>
              查询
            </Button>
            <Button
              onClick={() => {
                setPlanNoInput('');
                setRangeInput(null);
                setQuery({ planNo: '', range: null, defaultToday: true });
                setSelectedExportId(null);
              }}
            >
              重置(当日)
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
          </Space>
        </div>

        <div className="cbbm-table-wrap">
          <Table
            rowKey="id"
            size="middle"
            columns={planColumns}
            dataSource={filteredPlans}
            scroll={{ x: 1480 }}
            rowSelection={{
              type: 'radio',
              columnWidth: 48,
              selectedRowKeys: selectedExportId ? [selectedExportId] : [],
              onChange: (keys) => setSelectedExportId((keys[0] as string) || null),
            }}
            pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条记录` }}
          />
        </div>

        {/* 配煤单统一维护抽屉：计划信息 + 加仓明细报表 */}
        <Drawer
          open={planDrawer.open}
          width={1040}
          onClose={closePlanDrawer}
          title={
            <Space>
              <span>
                {planDrawer.mode === 'create'
                  ? '新建配煤单'
                  : planDrawer.mode === 'edit'
                    ? '编辑配煤单'
                    : '查看配煤单'}
              </span>
              {editingPlan && statusTag(editingPlan.status)}
            </Space>
          }
          extra={
            isPlanView ? (
              <Button onClick={closePlanDrawer}>关闭</Button>
            ) : isCreateMode ? (
              createStep === 0 ? (
                <Space>
                  <Button onClick={closePlanDrawer}>取消</Button>
                  <Button type="primary" onClick={goCreateNextStep}>
                    下一步
                  </Button>
                </Space>
              ) : (
                <Space>
                  <Button onClick={() => setCreateStep(0)}>上一步</Button>
                  <Button type="primary" onClick={savePlan}>
                    保存
                  </Button>
                </Space>
              )
            ) : (
              <Space>
                <Button onClick={closePlanDrawer}>取消</Button>
                <Button type="primary" onClick={savePlan}>
                  保存
                </Button>
              </Space>
            )
          }
        >
          {isCreateMode && (
            <div className="cbbm-create-step-hint">
              <span className="cbbm-create-step-index">{createStep + 1} / 2</span>
            </div>
          )}
          {(isCreateMode ? createStep === 0 : true) && (
            <>
              <div className="cbbm-section-title">{isCreateMode ? '计划主体信息' : '一、计划主体信息'}</div>
              <Form form={planForm} layout="vertical" disabled={isPlanView}>
                <div className="cbbm-form-grid">
                  <Form.Item name="planDate" label="计划日期" rules={[{ required: true }]}>
                    <DatePicker
                      style={{ width: '100%' }}
                      onChange={handlePlanDateChange}
                      disabled={planDrawer.mode === 'edit' || isPlanView}
                    />
                  </Form.Item>
                  <Form.Item name="planName" label="计划名称（≤10字符）">
                    <Input maxLength={10} showCount placeholder="留空自动生成" />
                  </Form.Item>
                  <Form.Item name="startTime" label="开始时间" rules={[{ required: true }]}>
                    <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
                  </Form.Item>
                  <Form.Item name="endTime" label="结束时间" rules={[{ required: true }]}>
                    <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm:ss" />
                  </Form.Item>
                </div>
                <Form.Item name="remark" label="备注（≤500字符）">
                  <TextArea maxLength={500} showCount rows={2} />
                </Form.Item>
                <div className="cbbm-subtitle">计划交待信息</div>
                <Form.Item name="planDesc" label="计划说明">
                  <TextArea maxLength={500} showCount rows={2} />
                </Form.Item>
                <div className="cbbm-form-grid-2">
                  <Form.Item name="clearNode" label="清场节点">
                    <TextArea maxLength={500} rows={2} />
                  </Form.Item>
                  <Form.Item name="notice" label="注意事项">
                    <TextArea maxLength={500} rows={2} />
                  </Form.Item>
                </div>
              </Form>
            </>
          )}
          {(isCreateMode ? createStep === 1 : true) && (
            <div className={`cbbm-detail-section ${isCreateMode ? '!mt-0' : ''}`}>
              <div className="cbbm-detail-section-head">
                <div className="cbbm-section-title !mb-0">{isCreateMode ? '加仓明细维护' : '二、加仓明细'}</div>
                <Space>
                  <span className="cbbm-view-stat">
                    明细条数<b>{draftDetails.length}</b>
                  </span>
                  {detailEditable && (
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openDetailForm(null)}>
                      新增加仓明细
                    </Button>
                  )}
                </Space>
              </div>
              {draftDetails.length === 0 ? (
                <Empty description="暂无加仓明细，请点击新增维护" className="!my-8" />
              ) : (
                <GroupedReport
                  details={draftDetails}
                  editable={detailEditable}
                  onEdit={(id) => openDetailForm(id)}
                  onDelete={deleteDetail}
                />
              )}
            </div>
          )}
        </Drawer>

        {/* 二级抽屉：加仓明细维护 */}
        <Drawer
          open={detailFormDrawer.open}
          width={760}
          onClose={closeDetailForm}
          title={detailFormDrawer.editingId ? '编辑加仓明细' : '新增加仓明细'}
          extra={
            <Space>
              <Button onClick={closeDetailForm}>取消</Button>
              <Button type="primary" onClick={saveDetail}>
                确认
              </Button>
            </Space>
          }
        >
          <Form form={detailForm} layout="vertical">
            <Form.Item name="bunkerTargets" label="煤仓选择" rules={[{ required: true, message: '请选择煤仓' }]}>
              <Select mode="multiple" placeholder="机组+煤仓编号" options={bunkerOptions} />
            </Form.Item>
          </Form>
          <div className="cbbm-detail-form-section cbbm-detail-form-section-coal">
            <div className="cbbm-subtitle-row">
              <div className="cbbm-subtitle !mb-0">选择加仓燃煤</div>
              <Button type="primary" ghost size="small" onClick={openCoalPickDrawer}>
                选择燃煤
              </Button>
            </div>
            <div className="cbbm-cached-coal-summary">
              <span>
                煤场分区 <b>{cachedYardPicks.length}</b> 个
              </span>
              <span>
                在港在船煤 <b>{cachedPortPicks.length}</b> 条
              </span>
              <Text type="secondary" className="text-xs">
                已选燃煤暂存于前端，保存配煤单后一并提交
              </Text>
            </div>
            <Table
              className="cbbm-cached-coal-table"
              size="small"
              rowKey="key"
              pagination={false}
              scroll={{ y: 280 }}
              locale={{ emptyText: '请点击「选择燃煤」在三级弹窗中勾选' }}
              dataSource={cachedCoalRows}
              columns={[
                {
                  title: '来源',
                  width: 108,
                  render: (_, r) =>
                    r.sourceType === 'yard' ? (
                      <Tag color="blue">煤场</Tag>
                    ) : (
                      <Tag color="orange">在港在船煤</Tag>
                    ),
                },
                { title: '煤场/车船号', dataIndex: 'label', ellipsis: true },
                { title: '煤种', dataIndex: 'coalType', width: 100, ellipsis: true },
                { title: '热值', dataIndex: 'calorific', width: 72, align: 'right' },
                {
                  title: '操作',
                  width: 64,
                  render: (_, r) => (
                    <Button type="link" size="small" danger onClick={() => removeCachedCoal(r.key)}>
                      移除
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        </Drawer>

        {/* 三级抽屉：加仓燃煤选择 */}
        <Drawer
          open={coalPickDrawer}
          width="min(1280px, 96vw)"
          zIndex={1002}
          className="cbbm-coal-pick-drawer"
          styles={{ body: { padding: '12px 20px' } }}
          onClose={() => setCoalPickDrawer(false)}
          title="选择加仓燃煤"
          extra={
            <Space>
              <Button onClick={() => setCoalPickDrawer(false)}>取消</Button>
              <Button type="primary" onClick={confirmCoalPick}>
                确认选择
              </Button>
            </Space>
          }
        >
          <div className="cbbm-pick-stats">
            <span className="cbbm-pick-stat">
              已选中分区 <b>{pickDraftYardIds.length}</b> 个
            </span>
            <span className="cbbm-pick-stat">
              已选中在港煤 <b>{pickDraftPortIds.length}</b> 条
            </span>
          </div>
          <Tabs
            activeKey={pickTab}
            onChange={(k) => setPickTab(k as 'yard' | 'port')}
            items={[
              {
                key: 'yard',
                label: `煤场${pickDraftYardIds.length ? ` (${pickDraftYardIds.length})` : ''}`,
                children: (
                  <div>
                    <div className="cbbm-yard-filter-bar">
                      <Select
                        allowClear
                        placeholder="煤场"
                        style={{ width: 120 }}
                        options={YARD_OPTIONS}
                        value={yardFilterYard}
                        onChange={setYardFilterYard}
                      />
                      <InputNumber
                        placeholder="热值下限"
                        style={{ width: 110 }}
                        value={yardFilterCalMin}
                        onChange={(v) => setYardFilterCalMin(v)}
                      />
                      <InputNumber
                        placeholder="热值上限"
                        style={{ width: 110 }}
                        value={yardFilterCalMax}
                        onChange={(v) => setYardFilterCalMax(v)}
                      />
                      <Input
                        placeholder="煤种（模糊）"
                        style={{ width: 140 }}
                        value={yardFilterCoalType}
                        onChange={(e) => setYardFilterCoalType(e.target.value)}
                        onPressEnter={runYardCoalSearch}
                      />
                      <Button type="primary" icon={<SearchOutlined />} onClick={runYardCoalSearch}>
                        搜索
                      </Button>
                    </div>
                    <Table
                      className="cbbm-coal-pick-table"
                      size="middle"
                      rowKey="id"
                      scroll={{ x: 1200, y: 'calc(100vh - 300px)' }}
                      pagination={{
                        pageSize: 100,
                        showSizeChanger: false,
                        showTotal: (t) => `共 ${t} 条`,
                      }}
                      dataSource={filteredYardCoals}
                      rowSelection={{
                        selectedRowKeys: pickDraftYardIds,
                        onChange: (keys) => setPickDraftYardIds(keys as string[]),
                      }}
                      columns={[
                        { title: '煤场', dataIndex: 'yard', width: 88, fixed: 'left' },
                        { title: '分区', dataIndex: 'zone', width: 64 },
                        { title: '存煤量(t)', dataIndex: 'stock', width: 96, align: 'right' },
                        { title: '煤种', dataIndex: 'coalType', width: 100, ellipsis: true },
                        { title: '热值', dataIndex: 'calorific', width: 72, align: 'right' },
                        { title: '水分', dataIndex: 'moisture', width: 64, align: 'right' },
                        { title: '挥发分', dataIndex: 'volatile', width: 72, align: 'right' },
                        { title: '硫分', dataIndex: 'sulfur', width: 64, align: 'right' },
                        { title: '灰分', dataIndex: 'ash', width: 64, align: 'right' },
                      ]}
                    />
                  </div>
                ),
              },
              {
                key: 'port',
                label: `在港在船煤${pickDraftPortIds.length ? ` (${pickDraftPortIds.length})` : ''}`,
                children: (
                  <Table
                    className="cbbm-coal-pick-table"
                    size="middle"
                    rowKey="id"
                    scroll={{ x: 1200, y: 'calc(100vh - 260px)' }}
                    pagination={{
                      pageSize: 100,
                      showSizeChanger: false,
                      showTotal: (t) => `共 ${t} 条`,
                    }}
                    dataSource={[...MOCK_BERTH].sort(
                      (a, b) => dayjs(a.planTime).valueOf() - dayjs(b.planTime).valueOf() || a.shipNo.localeCompare(b.shipNo)
                    )}
                    rowSelection={{
                      selectedRowKeys: pickDraftPortIds,
                      onChange: (keys) => setPickDraftPortIds(keys as string[]),
                    }}
                    columns={[
                      { title: '车船号', dataIndex: 'shipNo', width: 88, fixed: 'left' },
                      { title: '入厂登记编号', dataIndex: 'regNo', width: 130 },
                      { title: '靠泊时间', dataIndex: 'planTime', width: 155 },
                      { title: '煤种', dataIndex: 'coalType', width: 100, ellipsis: true },
                      { title: '预报热值', dataIndex: 'calorific', width: 88, align: 'right' },
                      { title: '水分', dataIndex: 'moisture', width: 64, align: 'right' },
                      { title: '挥发分', dataIndex: 'volatile', width: 72, align: 'right' },
                      { title: '硫分', dataIndex: 'sulfur', width: 64, align: 'right' },
                      { title: '灰分', dataIndex: 'ash', width: 64, align: 'right' },
                      { title: '预报煤量(t)', dataIndex: 'forecastQty', width: 100, align: 'right' },
                    ]}
                  />
                ),
              },
            ]}
          />
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default Component;
