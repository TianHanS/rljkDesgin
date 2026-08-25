/**
 * @name 煤场存煤结构管理
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-standards.md
 * - /assets/templates/spec-template.md
 * - /src/themes/antd-new/DESIGN-SPEC.md
 * - /skills/third-party/interface-design/SKILL.md
 * - /skills/ui-ux-pro-max/SKILL.md
 * - 用户提供的煤场存煤结构管理业务描述（圆形 36 分区 / 条形 3 分区）
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  ConfigProvider,
  Form,
  InputNumber,
  Modal,
  Radio,
  Segmented,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import {
  AppstoreOutlined,
  ExportOutlined,
  HistoryOutlined,
  ImportOutlined,
  InfoCircleOutlined,
  ProfileOutlined,
  ScanOutlined,
  TableOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  ARRIVAL_BATCHES,
  COAL_TYPES,
  DEFAULT_DENSITY,
  DEFAULT_LABEL_KEY,
  INITIAL_AUDIT,
  INITIAL_MOVES,
  LABEL_FIELDS,
  UNMARKED_COLOR,
  YARDS,
  type AuditLog,
  type CoalZone,
  type StockMove,
  coalTypeName,
  createZones,
  findBatch,
  fmt,
  nextRecordId,
  shapeLabel,
  shortRegNo,
} from './data';
import { compactFieldValue, fieldValue } from './labels';
import {
  applyInbound,
  applyMerge,
  applyOutbound,
  applySplit,
  applySurveyPlan,
  computeZone,
  deleteLayer,
  replaceLayer,
  resolveMergePair,
  type ComputedLayer,
  type ComputedZone,
  type InboundPlanItem,
  type SplitPreviewRow,
  type SurveyInput,
  type SurveyPlan,
} from './model';
import StackHeatmap from './components/StackHeatmap';
import LayerMatrix from './components/LayerMatrix';
import LayerInspector from './components/LayerInspector';
import SurveyDrawer from './components/SurveyDrawer';
import InboundDrawer from './components/InboundDrawer';
import OutboundDrawer from './components/OutboundDrawer';
import SplitLayerDrawer from './components/SplitLayerDrawer';
import MergeLayerDrawer from './components/MergeLayerDrawer';
import './style.css';

const OPERATOR = '田略（燃料专责）';
const nowText = () => dayjs().format('YYYY-MM-DD HH:mm');

type ViewMode = 'stack' | 'matrix' | 'table';

/** 图例右侧的读图说明随视图切换，解释各视图独有的量化编码 */
const VIEW_NOTE: Record<ViewMode, string> = {
  stack: '纵轴为真实标高，每个方块 10 cm；连续方块段数即煤层厚度，右轴为对应悬臂俯仰角度',
  matrix: '行序自下而上，第 1 层贴地；格内直接给出该层的层厚与标高区间',
  table: '每个分区表层在前，横向滚动查看煤质与起始 / 结束角度',
};

interface FlatRow {
  key: string;
  zone: ComputedZone;
  layer: ComputedLayer;
}

interface MarkFormValues {
  regNo?: string;
  coalType?: string;
  density?: number;
}

const ComponentInner: React.FC = () => {
  const { message, modal } = App.useApp();

  const [zones, setZones] = useState<CoalZone[]>(() => createZones());
  const [yardId, setYardId] = useState('Y1');
  const [density, setDensity] = useState(DEFAULT_DENSITY);
  const [viewMode, setViewMode] = useState<ViewMode>('stack');
  const [labelKey, setLabelKey] = useState(DEFAULT_LABEL_KEY);
  const [selected, setSelected] = useState<{ zoneId: string; layerId: string } | null>(null);

  const [moves, setMoves] = useState<StockMove[]>(INITIAL_MOVES);
  const [audits, setAudits] = useState<AuditLog[]>(INITIAL_AUDIT);

  const [surveyOpen, setSurveyOpen] = useState(false);
  const [inboundOpen, setInboundOpen] = useState(false);
  const [outboundOpen, setOutboundOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeDirection, setMergeDirection] = useState<'up' | 'down'>('up');
  const [markOpen, setMarkOpen] = useState(false);
  const [markInitial, setMarkInitial] = useState<MarkFormValues>({});
  const [markForm] = Form.useForm();

  const yard = YARDS.find((y) => y.id === yardId)!;

  const computedZones = useMemo(
    () =>
      zones
        .filter((z) => z.yardId === yardId)
        .sort((a, b) => a.code - b.code)
        .map(computeZone),
    [zones, yardId],
  );

  const selectedZone = selected ? computedZones.find((z) => z.id === selected.zoneId) ?? null : null;
  const selectedLayer =
    selectedZone && selected
      ? selectedZone.layers.find((l) => l.id === selected.layerId) ?? null
      : null;

  const totals = useMemo(() => {
    const unmarkedZones = computedZones.filter((z) => z.unmarkedCount > 0);
    return {
      surveyVolume: computedZones.reduce((s, z) => s + z.raw.surveyVolume, 0),
      lastVolume: computedZones.reduce((s, z) => s + z.raw.lastSurveyVolume, 0),
      totalVolume: computedZones.reduce((s, z) => s + z.totalVolume, 0),
      totalMass: computedZones.reduce((s, z) => s + z.totalMass, 0),
      capacity: computedZones.reduce((s, z) => s + z.capacity, 0),
      unmarkedZones: unmarkedZones.length,
      unmarkedVolume: unmarkedZones.reduce(
        (s, z) => s + z.layers.filter((l) => l.raw.status === 'unmarked').reduce((a, l) => a + l.volume, 0),
        0,
      ),
      unmarkedLayers: computedZones.reduce((s, z) => s + z.unmarkedCount, 0),
      unmarkedMass: computedZones.reduce((s, z) => s + z.unmarkedMass, 0),
      maxHeight: Math.max(0.01, ...computedZones.map((z) => z.stackHeight)),
      loadedZones: computedZones.filter((z) => z.layers.length > 0).length,
    };
  }, [computedZones]);

  const labelMap = useMemo(() => {
    const compact = new Map<string, string>();
    const full = new Map<string, string>();
    computedZones.forEach((z) =>
      z.layers.forEach((l) => {
        compact.set(l.id, compactFieldValue(l, labelKey));
        full.set(l.id, fieldValue(l, labelKey));
      }),
    );
    return { compact, full };
  }, [computedZones, labelKey]);

  const compactLabelOf = useCallback((id: string) => labelMap.compact.get(id) ?? '', [labelMap]);
  const fullLabelOf = useCallback((id: string) => labelMap.full.get(id) ?? '', [labelMap]);

  const legendTypes = useMemo(() => {
    const map = new Map<string, Set<number>>();
    computedZones.forEach((z) =>
      z.layers.forEach((l) => {
        if (l.raw.status === 'marked' && l.raw.coalType) {
          if (!map.has(l.raw.coalType)) map.set(l.raw.coalType, new Set());
          map.get(l.raw.coalType)!.add(l.raw.tint);
        }
      }),
    );
    return Array.from(map.entries()).map(([key, tints]) => ({
      key,
      name: COAL_TYPES[key].name,
      colors: Array.from(tints)
        .sort((a, b) => a - b)
        .map((t) => COAL_TYPES[key].family[Math.min(t, COAL_TYPES[key].family.length - 1)]),
    }));
  }, [computedZones]);

  useEffect(() => setSelected(null), [yardId]);

  /* ---------------------------- 记录写入 ---------------------------- */

  const pushAudit = useCallback(
    (target: string, action: string, before: string, after: string) =>
      setAudits((prev) => [
        {
          id: nextRecordId('A'),
          time: nowText(),
          operator: OPERATOR,
          target,
          action,
          before,
          after,
        },
        ...prev,
      ]),
    [],
  );

  const pushMove = useCallback(
    (move: Omit<StockMove, 'id' | 'time'>) =>
      setMoves((prev) => [{ ...move, id: nextRecordId('M'), time: nowText() }, ...prev]),
    [],
  );

  const locateUnmarked = () => {
    for (const z of computedZones) {
      const layer = z.layers.find((l) => l.raw.status === 'unmarked');
      if (layer) {
        setSelected({ zoneId: z.id, layerId: layer.id });
        return;
      }
    }
    message.info('当前煤场没有待人工标记的煤层');
  };

  /* ---------------------------- 操作：入库 ---------------------------- */

  const commitInbound = (params: {
    plan: InboundPlanItem[];
    regNo: string;
    density: number;
    totalMass: number;
    note: string;
  }) => {
    const stackedAt = dayjs().format('YYYY-MM-DD');
    setZones((prev) => applyInbound(prev, params.plan, params.regNo, params.density, stackedAt));

    const time = nowText();
    setMoves((prev) => [
      ...params.plan.map((item) => ({
        id: nextRecordId('M'),
        time,
        type: 'in' as const,
        yardId,
        zoneName: item.zoneName,
        regNo: params.regNo,
        coalTypeName: params.regNo
          ? coalTypeName(findBatch(params.regNo)?.coalType ?? '')
          : '待标记',
        volume: item.volume,
        mass: item.mass,
        source: 'manual' as const,
        note: `${params.note || '人工入库'}：顶层新增煤层，俯仰夹角 ${item.pitchFrom.toFixed(
          1,
        )}° → ${item.pitchTo.toFixed(1)}°，堆高 ${item.heightFrom.toFixed(
          2,
        )} → ${item.heightTo.toFixed(2)} m`,
      })),
      ...prev,
    ]);

    pushAudit(
      `${yard.shortName} · ${params.plan.map((p) => p.zoneName).join('、')}`,
      '入库（顶层新增煤层）',
      `${params.plan.length} 个分区`,
      `合计 +${fmt(params.totalMass)} t / +${fmt(
        params.plan.reduce((s, p) => s + p.volume, 0),
      )} m³`,
    );

    setInboundOpen(false);
    setSelected(null);
    message.success(
      `已在 ${params.plan.length} 个分区顶层新增煤层，合计 ${fmt(params.totalMass)} t`,
    );
  };

  const handleInboundSubmit = (params: {
    plan: InboundPlanItem[];
    regNo: string;
    density: number;
    totalMass: number;
    note: string;
    needSurveyWarning: boolean;
  }) => {
    if (params.needSurveyWarning) {
      modal.confirm({
        title: '确认手动增加存煤？',
        okText: '确认入库',
        cancelText: '返回修改',
        content: (
          <div style={{ fontSize: 13, lineHeight: 1.75 }}>
            此煤场体积通过盘煤仪获得，若手动增加，将影响实际存煤体积信息。
            <div style={{ marginTop: 8, color: '#8b847b' }}>
              涉及 {params.plan.length} 个已有盘煤体积的分区，合计入库{' '}
              {fmt(params.totalMass)} t。
            </div>
          </div>
        ),
        onOk: () => commitInbound(params),
      });
      return;
    }
    commitInbound(params);
  };

  /* ---------------------------- 操作：出库 ---------------------------- */

  const handleOutboundSubmit = ({
    zoneId,
    mass,
    note,
  }: {
    zoneId: string;
    mass: number;
    note: string;
  }) => {
    const zone = computedZones.find((z) => z.id === zoneId);
    if (!zone) return;
    const result = applyOutbound(zones, zoneId, mass);
    if (result.shortage > 0.01) {
      message.error(`${zone.name} 现存煤量不足，尚缺 ${fmt(result.shortage)} t`);
      return;
    }
    setZones(result.zones);

    const time = nowText();
    const seqOf = new Map(zone.layers.map((l) => [l.id, l.seq]));
    setMoves((prev) => [
      ...result.cuts.map((c, i) => ({
        id: nextRecordId('M'),
        time,
        type: 'out' as const,
        yardId,
        zoneName: zone.name,
        regNo: c.layer.regNo,
        coalTypeName: c.layer.regNo ? coalTypeName(c.layer.coalType) : '待标记',
        volume: c.volume,
        mass: c.mass,
        source: 'manual' as const,
        note: `${note || '人工出库'}：按后进先出第 ${i + 1} 顺位，扣减第 ${
          seqOf.get(c.layer.id) ?? '—'
        } 层`,
      })),
      ...prev,
    ]);

    pushAudit(
      `${yard.shortName} · ${zone.name}`,
      '出库（后进先出扣减）',
      `${fmt(zone.totalMass)} t`,
      `${fmt(Math.max(0, zone.totalMass - mass))} t`,
    );

    setOutboundOpen(false);
    setSelected(null);
    message.success(`已按后进先出扣减 ${fmt(mass)} t，形成 ${result.cuts.length} 条出库明细`);
  };

  /* ---------------------------- 操作：分层拆分 ---------------------------- */

  const handleSplitSubmit = (preview: SplitPreviewRow[]) => {
    if (!selected || !selectedZone || !selectedLayer) return;
    const stackedAt = dayjs().format('YYYY-MM-DD');
    setZones((prev) =>
      applySplit(
        prev,
        selected.zoneId,
        selected.layerId,
        preview,
        selectedLayer.raw.density,
        stackedAt,
      ),
    );
    pushAudit(
      `${yard.shortName} · ${selectedZone.name} · 第 ${selectedLayer.seq} 层`,
      '分层拆分',
      `1 层 · ${fmt(selectedLayer.volume)} m³`,
      `${preview.length} 层 · ${preview.map((p) => fmt(p.volume)).join(' + ')} m³`,
    );
    pushMove({
      type: 'adjust',
      yardId,
      zoneName: selectedZone.name,
      regNo: selectedLayer.raw.regNo,
      coalTypeName: selectedLayer.raw.coalType ? coalTypeName(selectedLayer.raw.coalType) : '待标记',
      volume: selectedLayer.volume,
      mass: selectedLayer.mass,
      source: 'split',
      note: `第 ${selectedLayer.seq} 层拆分为 ${preview.length} 层，各层俯仰夹角 ${preview
        .map((p) => `${p.pitchStart.toFixed(1)}°~${p.pitchEnd.toFixed(1)}°`)
        .join(' / ')}`,
    });
    setSplitOpen(false);
    setSelected(null);
    message.success(`煤层已拆分为 ${preview.length} 层，各层体积与煤量按俯仰夹角重算`);
  };

  /* ---------------------------- 操作：分层合并 ---------------------------- */

  const openMerge = (direction: 'up' | 'down') => {
    setMergeDirection(direction);
    setMergeOpen(true);
  };

  const handleMergeSubmit = () => {
    if (!selected || !selectedZone || !selectedLayer) return;
    const pair = resolveMergePair(selectedZone, selected.layerId, mergeDirection);
    if (!pair) return;
    setZones((prev) => applyMerge(prev, selected.zoneId, selected.layerId, mergeDirection));
    pushAudit(
      `${yard.shortName} · ${selectedZone.name} · 第 ${pair.keep.seq} 层`,
      mergeDirection === 'up' ? '分层合并 · 合并上层' : '分层合并 · 合并下层',
      `第 ${pair.keep.seq} 层 ${fmt(pair.keep.volume)} m³ + 第 ${pair.absorbed.seq} 层 ${fmt(
        pair.absorbed.volume,
      )} m³`,
      `合并为 1 层 ${fmt(pair.keep.volume + pair.absorbed.volume)} m³`,
    );
    pushMove({
      type: 'adjust',
      yardId,
      zoneName: selectedZone.name,
      regNo: pair.keep.raw.regNo,
      coalTypeName: pair.keep.raw.coalType ? coalTypeName(pair.keep.raw.coalType) : '待标记',
      volume: pair.absorbed.volume,
      mass: pair.absorbed.mass,
      source: 'merge',
      note: `第 ${pair.absorbed.seq} 层并入第 ${pair.keep.seq} 层，保留第 ${pair.keep.seq} 层批次归属`,
    });
    setMergeOpen(false);
    setSelected(null);
    message.success('煤层已合并，分层俯仰夹角已重算');
  };

  /* ---------------------------- 操作：删除 ---------------------------- */

  const handleDelete = () => {
    if (!selected || !selectedZone || !selectedLayer) return;
    modal.confirm({
      title: '直接删除煤堆信息？',
      okText: '确认直接删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      content: (
        <div style={{ fontSize: 13, lineHeight: 1.75 }}>
          直接删除将不会形成出入库记录，确认直接删除煤堆信息？
          <div style={{ marginTop: 8, color: '#8b847b' }}>
            {selectedZone.name} · 第 {selectedLayer.seq} 层（表层）· {fmt(selectedLayer.volume)} m³
            / {fmt(selectedLayer.mass)} t
          </div>
        </div>
      ),
      onOk: () => {
        setZones((prev) => deleteLayer(prev, selected.zoneId, selected.layerId));
        pushAudit(
          `${yard.shortName} · ${selectedZone.name} · 第 ${selectedLayer.seq} 层`,
          '直接删除煤层（不形成出入库记录）',
          `${fmt(selectedLayer.volume)} m³ / ${fmt(selectedLayer.mass)} t`,
          '已删除',
        );
        setSelected(null);
        message.success('表层煤层已删除，未形成出入库记录');
      },
    });
  };

  /* ---------------------------- 操作：标记入厂批次 ---------------------------- */

  const openMark = () => {
    if (!selectedLayer) return;
    setMarkInitial({
      regNo: selectedLayer.raw.regNo || undefined,
      coalType: selectedLayer.raw.coalType || undefined,
      density: Number(selectedLayer.raw.density.toFixed(3)),
    });
    setMarkOpen(true);
  };

  const submitMark = async () => {
    const values = await markForm.validateFields();
    if (!selected || !selectedZone || !selectedLayer) return;
    const batch = findBatch(values.regNo);
    const before =
      selectedLayer.raw.status === 'unmarked'
        ? '待标记'
        : `${shortRegNo(selectedLayer.raw.regNo)} / ${coalTypeName(selectedLayer.raw.coalType)}`;

    setZones((prev) =>
      replaceLayer(prev, selected.zoneId, selected.layerId, {
        regNo: values.regNo,
        shipName: batch?.shipName ?? '',
        voyage: batch?.voyage ?? '—',
        coalType: values.coalType,
        quality: COAL_TYPES[values.coalType]?.quality ?? null,
        density: values.density,
        status: 'marked',
        tint: batch?.tint ?? 0,
        adjusted: true,
      }),
    );

    pushMove({
      type: 'adjust',
      yardId,
      zoneName: selectedZone.name,
      regNo: values.regNo,
      coalTypeName: coalTypeName(values.coalType),
      volume: selectedLayer.volume,
      mass: selectedLayer.volume * values.density,
      source: 'mark',
      note: `第 ${selectedLayer.seq} 层标记入厂批次，煤量按 ${values.density} t/m³ 重算`,
    });
    pushAudit(
      `${yard.shortName} · ${selectedZone.name} · 第 ${selectedLayer.seq} 层`,
      '标记入厂批次',
      before,
      `${shortRegNo(values.regNo)} / ${coalTypeName(values.coalType)}`,
    );
    setMarkOpen(false);
    message.success('煤层入厂批次已标记，煤质已按该批次化验值带入');
  };

  /* ---------------------------- 视图数据 ---------------------------- */

  const flatRows: FlatRow[] = useMemo(() => {
    const rows: FlatRow[] = [];
    computedZones.forEach((z) =>
      [...z.layers]
        .reverse()
        .forEach((l) => rows.push({ key: `${z.id}-${l.id}`, zone: z, layer: l })),
    );
    return rows;
  }, [computedZones]);

  const detailColumns: ColumnsType<FlatRow> = [
    { title: '分区', key: 'zone', width: 66, fixed: 'left', render: (_, r) => r.zone.name },
    {
      title: '层序',
      key: 'seq',
      width: 92,
      render: (_, r) => (
        <span className="cssm-num">
          第 {r.layer.seq} 层{r.layer.seq === r.zone.layers.length ? '（表层）' : ''}
        </span>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 84,
      render: (_, r) =>
        r.layer.raw.status === 'unmarked' ? (
          <Tag color="red" style={{ marginInlineEnd: 0 }}>
            待标记
          </Tag>
        ) : (
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            已标记
          </Tag>
        ),
    },
    {
      title: '入厂登记编号',
      key: 'reg',
      width: 246,
      render: (_, r) => r.layer.raw.regNo || '—',
    },
    { title: '船名', key: 'ship', width: 148, render: (_, r) => r.layer.raw.shipName || '—' },
    { title: '航次', key: 'voyage', width: 72, render: (_, r) => r.layer.raw.voyage || '—' },
    {
      title: '库存煤种',
      key: 'coalType',
      width: 100,
      render: (_, r) => (r.layer.raw.coalType ? coalTypeName(r.layer.raw.coalType) : '—'),
    },
    {
      title: '体积 m³',
      key: 'volume',
      width: 96,
      align: 'right',
      render: (_, r) => <span className="cssm-num">{fmt(r.layer.volume)}</span>,
    },
    {
      title: '煤量 t',
      key: 'mass',
      width: 96,
      align: 'right',
      render: (_, r) => <span className="cssm-num">{fmt(r.layer.mass)}</span>,
    },
    {
      title: '密度 t/m³',
      key: 'density',
      width: 92,
      align: 'right',
      render: (_, r) => <span className="cssm-num">{r.layer.raw.density.toFixed(3)}</span>,
    },
    {
      title: '层厚 m',
      key: 'thickness',
      width: 88,
      align: 'right',
      render: (_, r) => <span className="cssm-num">{r.layer.thickness.toFixed(2)}</span>,
    },
    {
      title: '标高区间 m',
      key: 'height',
      width: 128,
      align: 'right',
      render: (_, r) => (
        <span className="cssm-num">
          {r.layer.bound.heightBottom.toFixed(2)} ~ {r.layer.bound.heightTop.toFixed(2)}
        </span>
      ),
    },
    {
      title: '起始 / 结束角度',
      key: 'pitch',
      width: 142,
      align: 'right',
      render: (_, r) => (
        <span className="cssm-num">
          {r.layer.bound.pitchBottom.toFixed(2)}° ~ {r.layer.bound.pitchTop.toFixed(2)}°
        </span>
      ),
    },
    {
      title: '热值 kcal/kg',
      key: 'cv',
      width: 112,
      align: 'right',
      render: (_, r) => (
        <span className="cssm-num">{r.layer.raw.quality ? fmt(r.layer.raw.quality.cv) : '—'}</span>
      ),
    },
    {
      title: '硫分 %',
      key: 'sulfur',
      width: 82,
      align: 'right',
      render: (_, r) => (
        <span className="cssm-num">
          {r.layer.raw.quality ? r.layer.raw.quality.sulfur.toFixed(2) : '—'}
        </span>
      ),
    },
    {
      title: '灰分 %',
      key: 'ash',
      width: 82,
      align: 'right',
      render: (_, r) => (
        <span className="cssm-num">
          {r.layer.raw.quality ? r.layer.raw.quality.ash.toFixed(1) : '—'}
        </span>
      ),
    },
    {
      title: '挥发分 %',
      key: 'volatile',
      width: 92,
      align: 'right',
      render: (_, r) => (
        <span className="cssm-num">
          {r.layer.raw.quality ? r.layer.raw.quality.volatile.toFixed(1) : '—'}
        </span>
      ),
    },
    {
      title: '水分 %',
      key: 'moisture',
      width: 82,
      align: 'right',
      render: (_, r) => (
        <span className="cssm-num">
          {r.layer.raw.quality ? r.layer.raw.quality.moisture.toFixed(1) : '—'}
        </span>
      ),
    },
  ];

  const moveColumns: ColumnsType<StockMove> = [
    { title: '时间', dataIndex: 'time', width: 132 },
    { title: '分区', dataIndex: 'zoneName', width: 72 },
    {
      title: '入厂登记编号',
      key: 'reg',
      width: 246,
      render: (_, r) => r.regNo || <span style={{ color: UNMARKED_COLOR }}>待标记</span>,
    },
    { title: '库存煤种', dataIndex: 'coalTypeName', width: 100 },
    {
      title: '体积 m³',
      dataIndex: 'volume',
      width: 96,
      align: 'right',
      render: (v: number) => <span className="cssm-num">{fmt(v)}</span>,
    },
    {
      title: '煤量 t',
      dataIndex: 'mass',
      width: 96,
      align: 'right',
      render: (v: number) => <span className="cssm-num">{fmt(v)}</span>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 108,
      render: (v: StockMove['source']) => {
        const meta: Record<StockMove['source'], { color: string; label: string }> = {
          'survey-auto': { color: 'cyan', label: '盘煤自动' },
          manual: { color: 'gold', label: '人工出入库' },
          mark: { color: 'blue', label: '批次标记' },
          split: { color: 'purple', label: '分层拆分' },
          merge: { color: 'geekblue', label: '分层合并' },
          delete: { color: 'red', label: '直接删除' },
        };
        return (
          <Tag color={meta[v].color} style={{ marginInlineEnd: 0 }}>
            {meta[v].label}
          </Tag>
        );
      },
    },
    { title: '说明', dataIndex: 'note', ellipsis: true },
  ];

  const auditColumns: ColumnsType<AuditLog> = [
    { title: '时间', dataIndex: 'time', width: 132 },
    { title: '操作人', dataIndex: 'operator', width: 150 },
    { title: '对象', dataIndex: 'target', width: 250 },
    { title: '动作', dataIndex: 'action', width: 190 },
    { title: '调整前', dataIndex: 'before', width: 240 },
    { title: '调整后', dataIndex: 'after' },
  ];

  const yardMoves = moves.filter((m) => m.yardId === yardId);
  const activeField = LABEL_FIELDS.find((f) => f.key === labelKey)!;

  /* ---------------------------- 渲染 ---------------------------- */

  return (
    <div className="cssm-root">
      <header className="cssm-head">
        <div>
          <h1>煤场存煤结构管理</h1>
          <p>
            单一煤场视角，按分区 → 分层维护存煤结构。圆形煤场按扇形楔、条形煤场按直棱柱计算各分层
            体积与估算煤量，并反算煤层分界的悬臂俯仰角。
          </p>
        </div>
        <div className="cssm-head-tools">
          <div className="cssm-head-row">
            <span className="cssm-meta">煤场</span>
            <Select
              style={{ width: 300 }}
              value={yardId}
              onChange={(v) => setYardId(v)}
              options={YARDS.map((y) => ({
                value: y.id,
                label: `${y.shortName}（${shapeLabel(y.shape)} · ${y.zoneCount} 分区${
                  y.hasSurvey ? '' : ' · 无盘煤'
                }）`,
              }))}
            />
          </div>
          <div className="cssm-head-row">
            <span className="cssm-meta">
              默认计算密度
              <InputNumber
                size="small"
                min={0.6}
                max={1.2}
                step={0.01}
                style={{ width: 116 }}
                value={density}
                onChange={(v) => setDensity(Number(v ?? DEFAULT_DENSITY))}
                suffix="t/m³"
              />
            </span>
            {yard.hasSurvey ? (
              <Button icon={<ScanOutlined />} onClick={() => setSurveyOpen(true)}>
                盘煤比对
              </Button>
            ) : (
              <Tooltip title="该煤场无激光盘煤数据源，库存以人工出入库维护">
                <Button icon={<ScanOutlined />} disabled>
                  盘煤比对
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      </header>

      {/* 煤场库存统计看板 */}
      <section className="cssm-board">
        <div className="cssm-board-cell is-pair">
          <div>
            <div className="cssm-figure-k">总体积</div>
            <div className="cssm-figure-v cssm-num">
              {fmt(totals.surveyVolume)}
              <em>m³</em>
            </div>
            <div className="cssm-figure-sub">盘煤时间 {yard.surveyAt}</div>
          </div>
          <div>
            <div className="cssm-figure-k">上次盘煤体积</div>
            <div className="cssm-figure-v cssm-num is-muted">
              {fmt(totals.lastVolume)}
              <em>m³</em>
            </div>
            <div className="cssm-figure-sub">盘煤时间 {yard.lastSurveyAt}</div>
          </div>
          <div className="cssm-board-delta">
            {(() => {
              const d = totals.surveyVolume - totals.lastVolume;
              if (Math.abs(d) < 0.5) return <span className="cssm-figure-sub">两次盘煤无变动</span>;
              return (
                <span className={d > 0 ? 'is-scan' : 'is-draw'}>
                  {d > 0 ? '↑' : '↓'} {fmt(Math.abs(d))} m³
                </span>
              );
            })()}
          </div>
        </div>

        <div className="cssm-board-cell">
          <div className="cssm-figure-k">存煤量</div>
          <div className="cssm-figure-v cssm-num">
            {fmt(totals.totalMass)}
            <em>t</em>
          </div>
          <div className="cssm-figure-sub">
            默认计算密度 {density} t/m³ · 占几何容量{' '}
            {((totals.totalVolume / totals.capacity) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="cssm-board-cell">
          <div className="cssm-figure-k">未识别煤堆</div>
          <div className={`cssm-figure-v cssm-num${totals.unmarkedZones > 0 ? ' is-flare' : ''}`}>
            {totals.unmarkedZones}
            <em>个分区</em>
          </div>
          <div className="cssm-figure-sub">
            {totals.unmarkedZones > 0
              ? `存在实际体积 ${fmt(totals.unmarkedVolume)} m³`
              : '全部煤堆批次归属完整'}
          </div>
        </div>

        <div className="cssm-board-cell">
          <div className="cssm-figure-k">待人工标记数量</div>
          <div className={`cssm-figure-v cssm-num${totals.unmarkedLayers > 0 ? ' is-flare' : ''}`}>
            {totals.unmarkedLayers}
            <em>层</em>
          </div>
          <div className="cssm-figure-sub">
            {totals.unmarkedLayers > 0 ? (
              <a onClick={locateUnmarked} style={{ cursor: 'pointer' }}>
                估算 {fmt(totals.unmarkedMass)} t 待确认 · 定位
              </a>
            ) : (
              '无待标记煤层'
            )}
          </div>
        </div>
      </section>

      <div className="cssm-main">
        <section className="cssm-panel">
          <div className="cssm-panel-hd">
            <h2>存煤结构维护 · {yard.name}</h2>
            <Space size={8} wrap>
              <Button type="primary" icon={<ImportOutlined />} onClick={() => setInboundOpen(true)}>
                入库
              </Button>
              <Button icon={<ExportOutlined />} onClick={() => setOutboundOpen(true)}>
                出库
              </Button>
              <Segmented
                size="small"
                value={viewMode}
                onChange={(v) => setViewMode(v as ViewMode)}
                options={[
                  { label: '实际堆煤视图', value: 'stack', icon: <AppstoreOutlined /> },
                  { label: '分层视图', value: 'matrix', icon: <ProfileOutlined /> },
                  { label: '分层数据', value: 'table', icon: <TableOutlined /> },
                ]}
              />
            </Space>
          </div>

          <div className="cssm-fieldbar">
            <span className="cssm-fieldbar-label">存煤视图展示信息</span>
            <Radio.Group
              size="small"
              optionType="button"
              buttonStyle="solid"
              value={labelKey}
              onChange={(e) => setLabelKey(e.target.value)}
              options={LABEL_FIELDS.map((f) => ({ label: f.label, value: f.key }))}
            />
            <span className="cssm-fieldbar-label">
              <InfoCircleOutlined /> 当前展示 {activeField.label}
              {activeField.unit ? `（${activeField.unit}）` : ''}
            </span>
          </div>

          <div className="cssm-legend">
            <span className="cssm-fieldbar-label">色族 = 库存煤种，色阶 = 入厂登记编号</span>
            {legendTypes.map((t) => (
              <span key={t.key} className="cssm-legend-group">
                <span className="cssm-legend-ramp">
                  {t.colors.map((c, i) => (
                    <i key={`${t.key}-${i}`} style={{ background: c }} />
                  ))}
                </span>
                {t.name}
              </span>
            ))}
            <span className="cssm-legend-group">
              <span className="cssm-legend-ramp">
                <i
                  style={{
                    background: UNMARKED_COLOR,
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(255,255,255,.45) 0 2px, transparent 2px 4px)',
                  }}
                />
              </span>
              待标记（异常）
            </span>
            <span className="cssm-legend-note">{VIEW_NOTE[viewMode]}</span>
          </div>

          {viewMode === 'stack' && (
            <div className="cssm-stack-view">
              <StackHeatmap
                zones={computedZones}
                labelOf={compactLabelOf}
                tipOf={fullLabelOf}
                selectedLayerId={selected?.layerId ?? null}
                onSelect={(zoneId, layerId) => setSelected({ zoneId, layerId })}
              />
            </div>
          )}

          {viewMode === 'matrix' && (
            <LayerMatrix
              zones={computedZones}
              labelOf={fullLabelOf}
              tipOf={fullLabelOf}
              selectedLayerId={selected?.layerId ?? null}
              onSelect={(zoneId, layerId) => setSelected({ zoneId, layerId })}
            />
          )}

          {viewMode === 'table' && (
            <div className="cssm-panel-body">
              <Table<FlatRow>
                rowKey="key"
                size="small"
                columns={detailColumns}
                dataSource={flatRows}
                pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `共 ${t} 层` }}
                scroll={{ x: 2000, y: 460 }}
                rowClassName={(r) =>
                  r.layer.id === selected?.layerId ? 'ant-table-row-selected' : ''
                }
                onRow={(r) => ({
                  style: { cursor: 'pointer' },
                  onClick: () => setSelected({ zoneId: r.zone.id, layerId: r.layer.id }),
                })}
              />
            </div>
          )}
        </section>

        <LayerInspector
          yardName={yard.shortName}
          zone={selectedZone}
          layer={selectedLayer}
          unmarkedLayers={totals.unmarkedLayers}
          onMark={openMark}
          onSplit={() => setSplitOpen(true)}
          onMerge={openMerge}
          onDelete={handleDelete}
          onLocateUnmarked={locateUnmarked}
        />
      </div>

      <section className="cssm-panel cssm-foot">
        <Tabs
          items={[
            {
              key: 'in',
              label: (
                <span>
                  <ImportOutlined /> 入库记录
                </span>
              ),
              children: (
                <div className="cssm-foot-body">
                  <Table<StockMove>
                    rowKey="id"
                    size="small"
                    columns={moveColumns}
                    dataSource={yardMoves.filter((m) => m.type === 'in')}
                    pagination={{ pageSize: 5, showTotal: (t) => `共 ${t} 条` }}
                    scroll={{ x: 1180 }}
                  />
                </div>
              ),
            },
            {
              key: 'out',
              label: (
                <span>
                  <ExportOutlined /> 出库明细
                </span>
              ),
              children: (
                <div className="cssm-foot-body">
                  <Table<StockMove>
                    rowKey="id"
                    size="small"
                    columns={moveColumns}
                    dataSource={yardMoves.filter((m) => m.type === 'out')}
                    pagination={{ pageSize: 5, showTotal: (t) => `共 ${t} 条` }}
                    scroll={{ x: 1180 }}
                  />
                  <div className="cssm-hint" style={{ marginTop: 8 }}>
                    出库按后进先出顺序自表层向下扣减，逐层按其入厂批次拆分明细，可直接作为分区、
                    批次口径的耗用依据。
                  </div>
                </div>
              ),
            },
            {
              key: 'audit',
              label: (
                <span>
                  <HistoryOutlined /> 调整记录
                </span>
              ),
              children: (
                <div className="cssm-foot-body">
                  <Table<AuditLog>
                    rowKey="id"
                    size="small"
                    columns={auditColumns}
                    dataSource={audits}
                    pagination={{ pageSize: 5, showTotal: (t) => `共 ${t} 条` }}
                    scroll={{ x: 1180 }}
                  />
                  <div className="cssm-hint" style={{ marginTop: 8 }}>
                    标记、拆分、合并、删除与出入库等人工调整均自动留痕，含调整前后的量值对照。
                  </div>
                </div>
              ),
            },
          ]}
        />
      </section>

      <SurveyDrawer
        open={surveyOpen}
        yard={yard}
        zones={zones}
        defaultDensity={density}
        onClose={() => setSurveyOpen(false)}
        onApply={(plan: SurveyPlan, input: SurveyInput) => {
          const stackedAt = dayjs().format('YYYY-MM-DD');
          const time = nowText();
          const before = totals.surveyVolume;
          const after = plan.items.reduce((s, i) => s + i.newVolume, 0);
          setZones((prev) => applySurveyPlan(prev, plan, input, stackedAt));
          setMoves((prev) => [
            ...plan.items.flatMap((item) =>
              item.kind === 'none'
                ? []
                : item.details.map((d) => ({
                    id: nextRecordId('M'),
                    time,
                    type: item.kind === 'in' ? ('in' as const) : ('out' as const),
                    yardId,
                    zoneName: item.zoneName,
                    regNo: d.regNo,
                    coalTypeName: d.coalTypeName,
                    volume: d.volume,
                    mass: d.mass,
                    source: 'survey-auto' as const,
                    note:
                      item.kind === 'in'
                        ? plan.autoMatched
                          ? `盘煤体积 +${fmt(item.delta)} m³，匹配密度 ${plan.matchDensity?.toFixed(
                              3,
                            )} t/m³ 合理，自动识别入厂批次；新增煤层俯仰夹角 ${item.pitchFrom?.toFixed(
                              1,
                            )}° → ${item.pitchTo?.toFixed(1)}°`
                          : `盘煤体积 +${fmt(item.delta)} m³，匹配密度超出合理区间，生成待标记煤层`
                        : `盘煤体积 ${fmt(item.delta)} m³，按煤层顺序自上而下扣减`,
                  })),
            ),
            ...prev,
          ]);
          pushAudit(
            `${yard.shortName} · 全场`,
            '执行盘煤比对',
            `盘煤体积 ${fmt(before)} m³`,
            `盘煤体积 ${fmt(after)} m³`,
          );
          setSurveyOpen(false);
          setSelected(null);
          if (plan.autoMatched) {
            message.success(
              `盘煤比对完成：新增体积按匹配密度 ${plan.matchDensity?.toFixed(3)} t/m³ 自动识别批次`,
            );
          } else {
            message.warning(
              `盘煤比对完成：新增体积生成 ${plan.newUnmarkedLayers} 个待标记煤层，请核对入厂台账后标记`,
            );
          }
        }}
      />

      <InboundDrawer
        open={inboundOpen}
        yard={yard}
        zones={computedZones}
        rawZones={zones}
        defaultDensity={density}
        onClose={() => setInboundOpen(false)}
        onSubmit={handleInboundSubmit}
      />

      <OutboundDrawer
        open={outboundOpen}
        yard={yard}
        zones={computedZones}
        presetZoneId={selected?.zoneId ?? null}
        onClose={() => setOutboundOpen(false)}
        onSubmit={handleOutboundSubmit}
      />

      <SplitLayerDrawer
        open={splitOpen}
        yardName={yard.shortName}
        zone={selectedZone}
        layer={selectedLayer}
        onClose={() => setSplitOpen(false)}
        onSubmit={handleSplitSubmit}
      />

      <MergeLayerDrawer
        open={mergeOpen}
        yardName={yard.shortName}
        zone={selectedZone}
        layerId={selected?.layerId ?? null}
        direction={mergeDirection}
        onClose={() => setMergeOpen(false)}
        onSubmit={handleMergeSubmit}
      />

      <Modal
        title={selectedLayer?.raw.status === 'unmarked' ? '标记入厂批次' : '更改入厂批次与煤质'}
        open={markOpen}
        onCancel={() => setMarkOpen(false)}
        onOk={submitMark}
        okText="保存"
        cancelText="取消"
        width={640}
        destroyOnHidden
      >
        <div className="cssm-form-note">
          {selectedZone && selectedLayer && (
            <>
              {yard.shortName} · {selectedZone.name} · 第 {selectedLayer.seq} 层 · 体积{' '}
              <b>{fmt(selectedLayer.volume)} m³</b> · 标高{' '}
              <b>
                {selectedLayer.bound.heightBottom.toFixed(2)} ~{' '}
                {selectedLayer.bound.heightTop.toFixed(2)} m
              </b>
              。选择入厂登记编号后自动带入该批次的船名、航次与化验煤质；煤量按所填计算密度与层体积重算。
            </>
          )}
        </div>
        <Form form={markForm} layout="vertical" requiredMark={false} initialValues={markInitial}>
          <Form.Item
            label="入厂登记编号"
            name="regNo"
            rules={[{ required: true, message: '请选择入厂登记编号' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="按登记编号或船名检索"
              options={ARRIVAL_BATCHES.map((b) => ({
                value: b.regNo,
                label: `${b.regNo} · ${b.shipName} · ${coalTypeName(b.coalType)}`,
              }))}
              onChange={(v) => {
                const b = findBatch(v);
                if (b) markForm.setFieldsValue({ coalType: b.coalType });
              }}
            />
          </Form.Item>
          <div className="cssm-grid-2" style={{ gridTemplateColumns: '1fr 190px' }}>
            <Form.Item
              label="库存煤种"
              name="coalType"
              rules={[{ required: true, message: '请选择库存煤种' }]}
            >
              <Select
                options={Object.entries(COAL_TYPES).map(([key, meta]) => ({
                  value: key,
                  label: meta.name,
                }))}
              />
            </Form.Item>
            <Form.Item
              label="计算密度"
              name="density"
              rules={[{ required: true, message: '请输入计算密度' }]}
            >
              <InputNumber
                min={0.6}
                max={1.2}
                step={0.01}
                suffix="t/m³"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>

    </div>
  );
};

const Component: React.FC = () => (
  <ConfigProvider
    locale={zhCN}
    theme={{
      token: {
        colorPrimary: '#1677ff',
        borderRadius: 6,
        fontFamily: '"PingFang SC", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif',
      },
    }}
  >
    <App>
      <ComponentInner />
    </App>
  </ConfigProvider>
);

export default Component;
