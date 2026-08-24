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
 * - 用户提供的煤场存煤结构管理业务描述
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  ConfigProvider,
  DatePicker,
  Form,
  Input,
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
  DatabaseOutlined,
  ExportOutlined,
  HistoryOutlined,
  ImportOutlined,
  InfoCircleOutlined,
  ProfileOutlined,
  ScanOutlined,
  SlidersOutlined,
  TableOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import * as geo from './geometry';
import {
  ARRIVAL_BATCHES,
  COAL_TYPES,
  DEFAULT_DENSITY,
  INITIAL_AUDIT,
  INITIAL_MOVES,
  INITIAL_OUTER_LEDGER,
  LABEL_FIELDS,
  SURVEY_PERIOD,
  UNMARKED_COLOR,
  YARDS,
  type AuditLog,
  type CoalZone,
  type OuterLedgerEntry,
  type StockMove,
  coalTypeName,
  createZones,
  findBatch,
  fmt,
  nextRecordId,
} from './data';
import {
  computeZone,
  manualInbound,
  manualOutbound,
  mergeWithNeighbour,
  replaceLayer,
  resizeLayer,
  applySurveyPlan,
  type ComputedLayer,
  type ComputedZone,
  type SurveyInput,
  type SurveyPlan,
} from './model';
import ZoneSection from './components/ZoneSection';
import LayerMatrix from './components/LayerMatrix';
import LayerInspector from './components/LayerInspector';
import SurveyDrawer from './components/SurveyDrawer';
import './style.css';

const OPERATOR = '田略（燃料专责）';
const nowText = () => dayjs().format('YYYY-MM-DD HH:mm');

interface SurveyResult {
  at: string;
  inMass: number;
  outMass: number;
  autoMatched: boolean;
  unmarked: number;
}

const SEED_SURVEY_RESULTS: Record<string, SurveyResult> = {
  Y1: { at: '2026-08-10 07:40', inMass: 5270, outMass: 2040, autoMatched: true, unmarked: 0 },
  Y2: { at: '2026-08-10 08:20', inMass: 1785, outMass: 0, autoMatched: false, unmarked: 1 },
};

const formatFieldValue = (layer: ComputedLayer, key: string): string => {
  const r = layer.raw;
  const q = r.quality;
  switch (key) {
    case 'batchNo':
      return r.batchNo || '待标记';
    case 'shipName':
      return r.shipName || '待标记';
    case 'voyage':
      return r.voyage || '—';
    case 'coalType':
      return r.coalType ? coalTypeName(r.coalType) : '待标记';
    case 'cv':
      return q ? fmt(q.cv) : '待标记';
    case 'sulfur':
      return q ? q.sulfur.toFixed(2) : '待标记';
    case 'ash':
      return q ? q.ash.toFixed(1) : '待标记';
    case 'volatile':
      return q ? q.volatile.toFixed(1) : '待标记';
    case 'moisture':
      return q ? q.moisture.toFixed(1) : '待标记';
    case 'volume':
      return fmt(layer.volume);
    case 'mass':
      return fmt(layer.mass);
    default:
      return '';
  }
};

interface FlatRow {
  key: string;
  zone: ComputedZone;
  layer: ComputedLayer;
}

interface MarkFormValues {
  batchNo?: string;
  shipName?: string;
  voyage?: string;
  coalType?: string;
  density?: number;
}

interface ManualFormValues {
  time?: dayjs.Dayjs;
  zoneId?: string;
  batchNo?: string;
  mass?: number;
  note?: string;
}

const ComponentInner: React.FC = () => {
  const { message, modal } = App.useApp();

  const [zones, setZones] = useState<CoalZone[]>(() => createZones());
  const [yardId, setYardId] = useState('Y1');
  const [density, setDensity] = useState(DEFAULT_DENSITY);
  const [viewMode, setViewMode] = useState<'section' | 'matrix' | 'table'>('section');
  const [labelKey, setLabelKey] = useState('batchNo');
  const [selected, setSelected] = useState<{ zoneId: string; layerId: string } | null>(null);

  const [moves, setMoves] = useState<StockMove[]>(INITIAL_MOVES);
  const [audits, setAudits] = useState<AuditLog[]>(INITIAL_AUDIT);
  const [ledger, setLedger] = useState<OuterLedgerEntry[]>(INITIAL_OUTER_LEDGER);
  const [surveyResults, setSurveyResults] =
    useState<Record<string, SurveyResult>>(SEED_SURVEY_RESULTS);

  const [surveyOpen, setSurveyOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const [markForm] = Form.useForm();
  const [manualForm] = Form.useForm();
  const [resizeMode, setResizeMode] = useState<'mass' | 'pitch'>('mass');
  const [resizeValue, setResizeValue] = useState<number>(0);
  const [manualType, setManualType] = useState<'in' | 'out' | 'set'>('in');
  // 弹窗设为关闭即销毁，表单初值经 initialValues 传入，避免在未挂载时调用 setFieldsValue
  const [markInitial, setMarkInitial] = useState<MarkFormValues>({});
  const [manualInitial, setManualInitial] = useState<ManualFormValues>({});

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
    const surveyVolume = computedZones.reduce((s, z) => s + z.raw.surveyVolume, 0);
    const lastVolume = computedZones.reduce((s, z) => s + z.raw.lastSurveyVolume, 0);
    return {
      surveyVolume,
      lastVolume,
      totalMass: computedZones.reduce((s, z) => s + z.totalMass, 0),
      unmarkedCount: computedZones.reduce((s, z) => s + z.unmarkedCount, 0),
      unmarkedMass: computedZones.reduce((s, z) => s + z.unmarkedMass, 0),
      capacity: computedZones.reduce((s, z) => s + z.capacity, 0),
      maxAbsDelta: Math.max(1, ...computedZones.map((z) => Math.abs(z.delta))),
    };
  }, [computedZones]);

  const labelMap = useMemo(() => {
    const map = new Map<string, string>();
    computedZones.forEach((z) =>
      z.layers.forEach((l) => map.set(l.id, formatFieldValue(l, labelKey))),
    );
    return map;
  }, [computedZones, labelKey]);
  const labelOf = useCallback((id: string) => labelMap.get(id) ?? '', [labelMap]);

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
        { id: nextRecordId('A'), time: nowText(), operator: OPERATOR, target, action, before, after },
        ...prev,
      ]),
    [],
  );

  const pushMove = useCallback(
    (move: Omit<StockMove, 'id' | 'time'>) =>
      setMoves((prev) => [{ ...move, id: nextRecordId('M'), time: nowText() }, ...prev]),
    [],
  );

  /* ---------------------------- 盘煤比对 ---------------------------- */

  const handleApplySurvey = (plan: SurveyPlan, input: SurveyInput) => {
    const stackedAt = dayjs().format('YYYY-MM-DD');
    const time = nowText();
    const beforeVolume = totals.surveyVolume;
    const afterVolume = plan.items.reduce((s, i) => s + i.newVolume, 0);

    setZones((prev) => applySurveyPlan(prev, plan, input, stackedAt));

    const newMoves: StockMove[] = [];
    plan.items.forEach((item) => {
      if (item.kind === 'none') return;
      item.details.forEach((d) => {
        newMoves.push({
          id: nextRecordId('M'),
          time,
          type: item.kind === 'in' ? 'in' : 'out',
          yardId,
          zoneName: item.zoneName,
          batchNo: d.batchNo,
          coalTypeName: d.coalTypeName,
          volume: d.volume,
          mass: d.mass,
          source: 'survey-auto',
          note:
            item.kind === 'in'
              ? plan.autoMatched
                ? `盘煤体积 +${fmt(item.delta)} m³，匹配密度 ${plan.matchDensity?.toFixed(
                    3,
                  )} t/m³ 合理，自动识别批次；新增煤层起始俯仰角 ${item.pitchFrom?.toFixed(
                    1,
                  )}° → ${item.pitchTo?.toFixed(1)}°`
                : `盘煤体积 +${fmt(item.delta)} m³，匹配密度超出合理区间，生成待标记煤层`
              : `盘煤体积 ${fmt(item.delta)} m³，按煤层顺序自上而下扣减`,
        });
      });
    });
    setMoves((prev) => [...newMoves, ...prev]);

    setSurveyResults((prev) => ({
      ...prev,
      [yardId]: {
        at: time,
        inMass: plan.inMass,
        outMass: plan.outMass,
        autoMatched: plan.autoMatched,
        unmarked: plan.newUnmarkedLayers,
      },
    }));

    pushAudit(
      `${yard.shortName} · 全场`,
      '执行盘煤比对',
      `盘煤体积 ${fmt(beforeVolume)} m³`,
      `盘煤体积 ${fmt(afterVolume)} m³`,
    );

    setSurveyOpen(false);
    setSelected(null);
    if (plan.autoMatched) {
      message.success(
        `盘煤比对完成：新增体积按匹配密度 ${plan.matchDensity?.toFixed(3)} t/m³ 自动识别批次`,
      );
    } else {
      message.warning(
        `盘煤比对完成：新增体积生成 ${plan.newUnmarkedLayers} 个待标记煤层，请核对接卸台账后手动标记`,
      );
    }
  };

  /* ---------------------------- 煤层标记 ---------------------------- */

  const openMark = () => {
    if (!selectedLayer) return;
    setMarkInitial({
      batchNo: selectedLayer.raw.batchNo || undefined,
      shipName: selectedLayer.raw.shipName,
      voyage: selectedLayer.raw.voyage,
      coalType: selectedLayer.raw.coalType || undefined,
      density: Number(selectedLayer.raw.density.toFixed(3)),
    });
    setMarkOpen(true);
  };

  const submitMark = async () => {
    const values = await markForm.validateFields();
    if (!selected || !selectedZone || !selectedLayer) return;
    const batch = findBatch(values.batchNo);
    const before =
      selectedLayer.raw.status === 'unmarked'
        ? '待标记'
        : `${selectedLayer.raw.batchNo} / ${coalTypeName(selectedLayer.raw.coalType)}`;

    setZones((prev) =>
      replaceLayer(prev, selected.zoneId, selected.layerId, {
        batchNo: values.batchNo,
        shipName: values.shipName || batch?.shipName || '',
        voyage: values.voyage || batch?.voyage || '—',
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
      batchNo: values.batchNo,
      coalTypeName: coalTypeName(values.coalType),
      volume: selectedLayer.volume,
      mass: selectedLayer.volume * values.density,
      source: 'mark',
      note: `第 ${selectedLayer.seq} 层标记存煤批次，煤量按 ${values.density} t/m³ 重算`,
    });
    pushAudit(
      `${yard.shortName} · ${selectedZone.name} · 第 ${selectedLayer.seq} 层`,
      '标记存煤批次',
      before,
      `${values.batchNo} / ${coalTypeName(values.coalType)}`,
    );
    setMarkOpen(false);
    message.success('煤层批次已标记，煤质已按该批次化验值带入');
  };

  /* ---------------------------- 煤量 / 角度调整 ---------------------------- */

  const openResize = () => {
    if (!selectedLayer) return;
    setResizeMode('mass');
    setResizeValue(Math.round(selectedLayer.mass));
    setResizeOpen(true);
  };

  const resizePreview = useMemo(() => {
    if (!selectedZone || !selectedLayer) return null;
    const g = selectedZone.geometry;
    const base = selectedLayer.bound.volumeBottom;
    let volume: number;
    if (resizeMode === 'mass') {
      volume = resizeValue / selectedLayer.raw.density;
    } else {
      const h = geo.heightFromPitch(g, resizeValue);
      volume = geo.stackVolume(g, Math.max(0, h)) - base;
    }
    volume = Math.max(0, volume);
    const above = selectedZone.layers.find((l) => l.seq === selectedLayer.seq + 1);
    const requested = volume - selectedLayer.volume;
    // 向上层借用不得超过上层存量；缩小本层时差额全额归还上层
    const borrowed = above ? Math.min(requested, above.volume) : 0;
    const applied = above ? selectedLayer.volume + borrowed : volume;
    const heightTop = geo.heightFromVolume(g, base + applied);
    return {
      volume: applied,
      mass: applied * selectedLayer.raw.density,
      heightTop,
      pitchTop: geo.pitchFromHeight(g, heightTop),
      borrowed,
      capped: above ? requested > above.volume : false,
    };
  }, [resizeMode, resizeValue, selectedZone, selectedLayer]);

  const submitResize = () => {
    if (!selected || !selectedZone || !selectedLayer || !resizePreview) return;
    if (resizePreview.volume <= 0.01) {
      message.error('调整后的煤层体积必须大于 0');
      return;
    }
    const before = `${fmt(selectedLayer.mass)} t / 层顶 ${selectedLayer.bound.pitchTop.toFixed(1)}°`;
    const result = resizeLayer(zones, selected.zoneId, selected.layerId, resizePreview.volume);
    setZones(result.zones);
    pushMove({
      type: 'adjust',
      yardId,
      zoneName: selectedZone.name,
      batchNo: selectedLayer.raw.batchNo,
      coalTypeName: selectedLayer.raw.coalType
        ? coalTypeName(selectedLayer.raw.coalType)
        : '待标记',
      volume: Math.abs(result.applied - selectedLayer.volume),
      mass: Math.abs(result.applied - selectedLayer.volume) * selectedLayer.raw.density,
      source: 'manual',
      note:
        resizeMode === 'mass'
          ? `按煤量调整第 ${selectedLayer.seq} 层，差额 ${fmt(result.borrowed)} m³ 与相邻上层借还`
          : `按层顶俯仰角 ${resizeValue.toFixed(1)}° 调整第 ${selectedLayer.seq} 层，系统按几何关系反算煤量`,
    });
    pushAudit(
      `${yard.shortName} · ${selectedZone.name} · 第 ${selectedLayer.seq} 层`,
      resizeMode === 'mass' ? '调整煤量' : '调整起始俯仰角',
      before,
      `${fmt(resizePreview.mass)} t / 层顶 ${resizePreview.pitchTop.toFixed(1)}°`,
    );
    setResizeOpen(false);
    message.success('煤层已按几何关系重算，上层分界俯仰角同步更新');
  };

  /* ---------------------------- 煤层合并 ---------------------------- */

  const handleMerge = (direction: 'up' | 'down') => {
    if (!selected || !selectedZone || !selectedLayer) return;
    const other = selectedZone.layers.find(
      (l) => l.seq === selectedLayer.seq + (direction === 'up' ? 1 : -1),
    );
    if (!other) return;
    const differ = other.raw.batchNo !== selectedLayer.raw.batchNo;
    modal.confirm({
      title: `合并${direction === 'up' ? '上' : '下'}层煤层`,
      content: differ
        ? `第 ${other.seq} 层（${
            other.raw.batchNo || '待标记'
          }）将并入第 ${selectedLayer.seq} 层，合并后统一归属 ${
            selectedLayer.raw.batchNo || '待标记'
          } 批次，密度按体积加权重算。`
        : `第 ${other.seq} 层与第 ${selectedLayer.seq} 层为同一批次，合并后体积 ${fmt(
            selectedLayer.volume + other.volume,
          )} m³。`,
      okText: '确认合并',
      cancelText: '取消',
      onOk: () => {
        setZones((prev) => mergeWithNeighbour(prev, selected.zoneId, selected.layerId, direction));
        pushAudit(
          `${yard.shortName} · ${selectedZone.name} · 第 ${selectedLayer.seq} 层`,
          '合并相邻煤层',
          `${fmt(selectedLayer.volume)} m³（第 ${selectedLayer.seq} 层）`,
          `${fmt(selectedLayer.volume + other.volume)} m³（并入第 ${other.seq} 层）`,
        );
        message.success('煤层已合并，分层分界俯仰角已重算');
      },
    });
  };

  /* ---------------------------- 厂外煤场手动维护 ---------------------------- */

  const outerZones = computedZones;

  const openManual = (type: 'in' | 'out' | 'set') => {
    setManualType(type);
    setManualInitial({
      time: dayjs(),
      zoneId: outerZones[0]?.id,
      batchNo: undefined,
      mass: type === 'set' ? Math.round(outerZones[0]?.totalMass ?? 0) : 1000,
      note: '',
    });
    setManualOpen(true);
  };

  const submitManual = async () => {
    const values = await manualForm.validateFields();
    const zone = computedZones.find((z) => z.id === values.zoneId);
    if (!zone) return;
    const time = dayjs(values.time).format('YYYY-MM-DD HH:mm');
    const stackedAt = dayjs(values.time).format('YYYY-MM-DD');
    const batchNo: string = values.batchNo ?? '';
    const typeName = manualType === 'in' ? '入库' : manualType === 'out' ? '出库' : '库存调整';

    let deltaMass = values.mass as number;
    let effective: 'in' | 'out' = manualType === 'out' ? 'out' : 'in';
    if (manualType === 'set') {
      deltaMass = (values.mass as number) - zone.totalMass;
      effective = deltaMass >= 0 ? 'in' : 'out';
      deltaMass = Math.abs(deltaMass);
      if (deltaMass < 0.5) {
        message.info('目标库存与当前库存一致，无需调整');
        setManualOpen(false);
        return;
      }
    }

    if (effective === 'in') {
      setZones((prev) =>
        manualInbound(prev, zone.id, {
          batchNo,
          mass: deltaMass,
          density: yard.density,
          stackedAt,
        }),
      );
    } else {
      const result = manualOutbound(zones, zone.id, deltaMass);
      if (result.shortage > 0.5) {
        message.error(
          `${zone.name} 现存煤量不足，尚缺 ${fmt(result.shortage)} t，请核对后重新登记`,
        );
        return;
      }
      setZones(result.zones);
    }

    const entry: OuterLedgerEntry = {
      id: nextRecordId('O'),
      time,
      type: manualType === 'set' ? 'adjust' : manualType,
      zoneName: zone.name,
      batchNo,
      coalTypeName: batchNo ? coalTypeName(findBatch(batchNo)?.coalType ?? '') : '待标记',
      mass: deltaMass,
      operator: OPERATOR,
      note: values.note || `${typeName}登记，已回写至数字化煤场煤堆分层结构`,
    };
    setLedger((prev) => [entry, ...prev]);

    pushMove({
      type: manualType === 'set' ? 'adjust' : manualType,
      yardId,
      zoneName: zone.name,
      batchNo,
      coalTypeName: entry.coalTypeName,
      volume: deltaMass / yard.density,
      mass: deltaMass,
      source: 'manual',
      note:
        manualType === 'set'
          ? `手动调整库存至 ${fmt(values.mass)} t，差额 ${
              effective === 'in' ? '+' : '-'
            }${fmt(deltaMass)} t 已回写煤堆`
          : `${typeName}登记 ${fmt(deltaMass)} t，已按${
              effective === 'in' ? '堆煤顺序堆至顶层' : '取煤顺序自上而下扣减'
            }`,
    });
    pushAudit(
      `${yard.shortName} · ${zone.name}`,
      `手动${typeName}`,
      `${fmt(zone.totalMass)} t`,
      `${fmt(effective === 'in' ? zone.totalMass + deltaMass : zone.totalMass - deltaMass)} t`,
    );

    setManualOpen(false);
    message.success(`${typeName}已登记，结构调整已同步至数字化煤场煤堆`);
  };

  /* ---------------------------- 视图数据 ---------------------------- */

  const flatRows: FlatRow[] = useMemo(() => {
    const rows: FlatRow[] = [];
    computedZones.forEach((z) =>
      [...z.layers].reverse().forEach((l) => rows.push({ key: `${z.id}-${l.id}`, zone: z, layer: l })),
    );
    return rows;
  }, [computedZones]);

  const detailColumns: ColumnsType<FlatRow> = [
    { title: '分区', key: 'zone', width: 68, fixed: 'left', render: (_, r) => r.zone.name },
    {
      title: '层序',
      key: 'seq',
      width: 62,
      render: (_, r) => (
        <span className="cssm-num">
          第 {r.layer.seq} 层{r.layer.seq === r.zone.layers.length ? '（顶）' : ''}
        </span>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 86,
      render: (_, r) =>
        r.layer.raw.status === 'unmarked' ? (
          <Tag color="volcano" style={{ marginInlineEnd: 0 }}>
            待标记
          </Tag>
        ) : (
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            已标记
          </Tag>
        ),
    },
    { title: '批次', key: 'batch', width: 118, render: (_, r) => r.layer.raw.batchNo || '—' },
    { title: '船名', key: 'ship', width: 148, render: (_, r) => r.layer.raw.shipName || '—' },
    { title: '航次', key: 'voyage', width: 72, render: (_, r) => r.layer.raw.voyage || '—' },
    {
      title: '煤种',
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
      title: '标高区间 m',
      key: 'height',
      width: 118,
      align: 'right',
      render: (_, r) => (
        <span className="cssm-num">
          {r.layer.bound.heightBottom.toFixed(1)} ~ {r.layer.bound.heightTop.toFixed(1)}
        </span>
      ),
    },
    {
      title: '分界俯仰角',
      key: 'pitch',
      width: 128,
      align: 'right',
      render: (_, r) => (
        <span className="cssm-num">
          {r.layer.bound.pitchBottom.toFixed(1)}° ~ {r.layer.bound.pitchTop.toFixed(1)}°
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
    { title: '批次', key: 'batch', width: 118, render: (_, r) => r.batchNo || '待标记' },
    { title: '煤种', dataIndex: 'coalTypeName', width: 96 },
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
      width: 104,
      render: (v: StockMove['source']) => (
        <Tag
          color={v === 'survey-auto' ? 'cyan' : v === 'mark' ? 'blue' : 'gold'}
          style={{ marginInlineEnd: 0 }}
        >
          {v === 'survey-auto' ? '盘煤自动' : v === 'mark' ? '批次标记' : '人工维护'}
        </Tag>
      ),
    },
    { title: '说明', dataIndex: 'note', ellipsis: true },
  ];

  const auditColumns: ColumnsType<AuditLog> = [
    { title: '时间', dataIndex: 'time', width: 132 },
    { title: '操作人', dataIndex: 'operator', width: 150 },
    { title: '对象', dataIndex: 'target', width: 230 },
    { title: '动作', dataIndex: 'action', width: 130 },
    { title: '调整前', dataIndex: 'before', width: 200 },
    { title: '调整后', dataIndex: 'after' },
  ];

  const ledgerColumns: ColumnsType<OuterLedgerEntry> = [
    { title: '时间', dataIndex: 'time', width: 132 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 84,
      render: (v: OuterLedgerEntry['type']) => (
        <Tag
          color={v === 'in' ? 'cyan' : v === 'out' ? 'gold' : 'blue'}
          style={{ marginInlineEnd: 0 }}
        >
          {v === 'in' ? '入库' : v === 'out' ? '出库' : '库存调整'}
        </Tag>
      ),
    },
    { title: '分区', dataIndex: 'zoneName', width: 72 },
    { title: '来煤批次', key: 'batch', width: 118, render: (_, r) => r.batchNo || '待标记' },
    { title: '煤种', dataIndex: 'coalTypeName', width: 96 },
    {
      title: '煤量 t',
      dataIndex: 'mass',
      width: 96,
      align: 'right',
      render: (v: number) => <span className="cssm-num">{fmt(v)}</span>,
    },
    { title: '登记人', dataIndex: 'operator', width: 150 },
    { title: '备注', dataIndex: 'note', ellipsis: true },
  ];

  const yardMoves = moves.filter((m) => m.yardId === yardId);
  const result = surveyResults[yardId];
  const activeField = LABEL_FIELDS.find((f) => f.key === labelKey)!;

  const locateUnmarked = () => {
    for (const z of computedZones) {
      const layer = z.layers.find((l) => l.raw.status === 'unmarked');
      if (layer) {
        setSelected({ zoneId: z.id, layerId: layer.id });
        return;
      }
    }
    message.info('当前煤场没有待标记煤层');
  };

  /* ---------------------------- 渲染 ---------------------------- */

  return (
    <div className="cssm-root">
      <header className="cssm-head">
        <div>
          <h1>煤场存煤结构管理</h1>
          <p>
            按煤场 → 分区 → 分层维护存煤结构。以激光盘煤体积为煤量上限，依直扇形楔几何关系计算各
            分层体积与估算煤量，并反算煤层分界的臂架俯仰角；盘煤体积变动时自动匹配接卸批次或生成
            待标记煤层。
          </p>
        </div>
        <div className="cssm-head-tools">
          <div className="cssm-head-row">
            <Segmented
              value={yardId}
              onChange={(v) => setYardId(v as string)}
              options={YARDS.map((y) => ({ label: y.shortName, value: y.id }))}
            />
          </div>
          <div className="cssm-head-row">
            <span className="cssm-meta">
              默认燃煤密度
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
              <Button type="primary" icon={<ScanOutlined />} onClick={() => setSurveyOpen(true)}>
                盘煤比对
              </Button>
            ) : (
              <Tooltip title="厂外煤场无激光盘煤数据源">
                <Button icon={<ScanOutlined />} disabled>
                  盘煤比对
                </Button>
              </Tooltip>
            )}
            {yard.hasSurvey ? (
              <Tooltip title="厂内煤场以盘煤体积为准，库存变动请通过盘煤比对或煤层调整完成">
                <Button icon={<DatabaseOutlined />} disabled>
                  手动维护库存
                </Button>
              </Tooltip>
            ) : (
              <Button
                type="primary"
                icon={<DatabaseOutlined />}
                onClick={() => openManual('in')}
              >
                手动维护库存
              </Button>
            )}
          </div>
          <div className="cssm-meta">
            {yard.hasSurvey ? (
              <>
                上次盘煤 <b>{yard.lastSurveyAt}</b> · 盘煤周期 <b>{SURVEY_PERIOD.from}</b> ~{' '}
                <b>{SURVEY_PERIOD.to}</b>
              </>
            ) : (
              <>
                无盘煤数据源 · 库存由手动台账维护 · 密度 <b>{yard.density} t/m³</b>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 盘煤差量条：替代常规 KPI 卡片，直接呈现体积变动与自动出入库判定 */}
      <section className={`cssm-strip${yard.hasSurvey ? '' : ' is-manual'}`}>
        <div>
          <div className="cssm-strip-hd">
            <h2>{yard.hasSurvey ? '分区盘煤体积变动' : '分区库存分布'}</h2>
            <span>
              {yard.hasSurvey
                ? '柱向上为体积增加（待匹配入库），向下为体积减少（自上而下扣减出库）；点击可定位该分区顶层'
                : '厂外煤场按手动台账维护，调整结果自动回写至数字化煤场煤堆分层结构；点击可定位该分区顶层'}
            </span>
          </div>
          <div className="cssm-delta">
            {computedZones.map((z) => {
              const ratio = Math.abs(z.delta) / totals.maxAbsDelta;
              const h = Math.abs(z.delta) < 0.5 ? 0 : Math.max(3, ratio * 20);
              return (
                <div
                  key={z.id}
                  className="cssm-delta-item"
                  role="button"
                  tabIndex={0}
                  aria-label={`${z.name}，体积变动 ${Math.round(z.delta)} 立方米`}
                  onClick={() => {
                    const top = z.layers[z.layers.length - 1];
                    if (top) setSelected({ zoneId: z.id, layerId: top.id });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const top = z.layers[z.layers.length - 1];
                      if (top) setSelected({ zoneId: z.id, layerId: top.id });
                    }
                  }}
                >
                  <div className="cssm-delta-up">
                    {z.delta > 0.5 && <span className="cssm-delta-bar" style={{ height: h }} />}
                  </div>
                  <div className="cssm-delta-axis" />
                  <div className="cssm-delta-down">
                    {z.delta < -0.5 && <span className="cssm-delta-bar" style={{ height: h }} />}
                  </div>
                  <span className="cssm-delta-code">{z.code}</span>
                  <span className="cssm-delta-val cssm-num">
                    {Math.abs(z.delta) < 0.5 ? '—' : `${z.delta > 0 ? '+' : ''}${fmt(z.delta)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cssm-strip-figures">
          <div className="cssm-figure">
            <div className="cssm-figure-k">{yard.hasSurvey ? '本次盘煤体积' : '台账库存体积'}</div>
            <div className="cssm-figure-v cssm-num">
              {fmt(totals.surveyVolume)}
              <em>m³</em>
            </div>
            <div className="cssm-figure-sub">
              {yard.hasSurvey ? `上次 ${fmt(totals.lastVolume)} m³` : `几何容量 ${fmt(totals.capacity)} m³`}
            </div>
          </div>
          <div className="cssm-figure">
            <div className="cssm-figure-k">存煤煤量</div>
            <div className="cssm-figure-v cssm-num">
              {fmt(totals.totalMass)}
              <em>t</em>
            </div>
            <div className="cssm-figure-sub">
              可取煤量，占几何容量 {((totals.surveyVolume / totals.capacity) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="cssm-figure">
            <div className="cssm-figure-k">{yard.hasSurvey ? '自动入库' : '台账入库'}</div>
            <div className="cssm-figure-v cssm-num is-scan">
              {fmt(
                yard.hasSurvey
                  ? result?.inMass ?? 0
                  : ledger.filter((l) => l.type === 'in').reduce((s, l) => s + l.mass, 0),
              )}
              <em>t</em>
            </div>
            <div className="cssm-figure-sub">
              {yard.hasSurvey ? result?.at ?? '—' : `${ledger.filter((l) => l.type === 'in').length} 笔登记`}
            </div>
          </div>
          <div className="cssm-figure">
            <div className="cssm-figure-k">{yard.hasSurvey ? '自动出库' : '台账出库'}</div>
            <div className="cssm-figure-v cssm-num is-draw">
              {fmt(
                yard.hasSurvey
                  ? result?.outMass ?? 0
                  : ledger.filter((l) => l.type === 'out').reduce((s, l) => s + l.mass, 0),
              )}
              <em>t</em>
            </div>
            <div className="cssm-figure-sub">
              {yard.hasSurvey ? '自上而下逐层扣减' : '自上而下逐层扣减'}
            </div>
          </div>
          <div className="cssm-figure">
            <div className="cssm-figure-k">待标记煤层</div>
            <div
              className={`cssm-figure-v cssm-num${totals.unmarkedCount > 0 ? ' is-flare' : ''}`}
            >
              {totals.unmarkedCount}
              <em>层</em>
            </div>
            <div className="cssm-figure-sub">
              {totals.unmarkedCount > 0 ? (
                <a onClick={locateUnmarked} style={{ cursor: 'pointer' }}>
                  {fmt(totals.unmarkedMass)} t 待确认 · 定位
                </a>
              ) : (
                '批次归属完整'
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="cssm-main">
        <section className="cssm-panel">
          <div className="cssm-panel-hd">
            <h2>{yard.name} · 存煤结构</h2>
            <Segmented
              size="small"
              value={viewMode}
              onChange={(v) => setViewMode(v as typeof viewMode)}
              options={[
                { label: '剖面结构', value: 'section', icon: <AppstoreOutlined /> },
                { label: '热力格图', value: 'matrix', icon: <ProfileOutlined /> },
                { label: '分层明细', value: 'table', icon: <TableOutlined /> },
              ]}
            />
          </div>

          <div className="cssm-fieldbar">
            <span className="cssm-fieldbar-label">缩略展示参数</span>
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
            <span className="cssm-fieldbar-label">色族 = 煤种，色阶 = 批次</span>
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
                      'repeating-linear-gradient(45deg, rgba(255,255,255,.5) 0 3px, transparent 3px 6px)',
                  }}
                />
              </span>
              待标记批次
            </span>
            <span className="cssm-legend-note">
              灰柱 = 挡煤墙 19 m · 橙色虚线 = 允许最大堆高 18 m · 右侧数值 = 分界俯仰角
            </span>
          </div>

          {viewMode === 'section' && (
            <div className="cssm-sections">
              {computedZones.map((z) => (
                <div
                  key={z.id}
                  className={`cssm-zone${selected?.zoneId === z.id ? ' is-active' : ''}`}
                >
                  <ZoneSection
                    zone={z}
                    labelOf={labelOf}
                    selectedLayerId={selected?.layerId ?? null}
                    onSelect={(zoneId, layerId) => setSelected({ zoneId, layerId })}
                  />
                  <div className="cssm-zone-foot">
                    <div className="cssm-zone-name">
                      {z.name}
                      <em className="cssm-num">{z.layers.length} 层</em>
                    </div>
                    {z.layers.length === 0 ? (
                      <div className="cssm-zone-empty">无存煤，可接收新批次</div>
                    ) : (
                      <>
                        <div className="cssm-zone-kv">
                          <span>堆高</span>
                          <span className="cssm-num">{z.stackHeight.toFixed(1)} m</span>
                        </div>
                        <div className="cssm-zone-kv">
                          <span>盘煤体积</span>
                          <span className="cssm-num">{fmt(z.raw.surveyVolume)} m³</span>
                        </div>
                        <div className="cssm-zone-kv">
                          <span>存煤煤量</span>
                          <span className="cssm-num">{fmt(z.totalMass)} t</span>
                        </div>
                        {z.unallocated > 1 && (
                          <div className="cssm-zone-kv" style={{ color: '#b8790a' }}>
                            <span>未分配体积</span>
                            <span className="cssm-num">{fmt(z.unallocated)} m³</span>
                          </div>
                        )}
                        {z.unmarkedCount > 0 && (
                          <div className="cssm-zone-kv" style={{ color: UNMARKED_COLOR }}>
                            <span>待标记</span>
                            <span className="cssm-num">{z.unmarkedCount} 层</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'matrix' && (
            <LayerMatrix
              zones={computedZones}
              labelOf={labelOf}
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
                pagination={false}
                scroll={{ x: 1800, y: 460 }}
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
          unmarkedCount={totals.unmarkedCount}
          onMark={openMark}
          onResize={openResize}
          onMerge={handleMerge}
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
                    scroll={{ x: 1080 }}
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
                    scroll={{ x: 1080 }}
                  />
                  <div className="cssm-hint" style={{ marginTop: 8 }}>
                    出库按煤层顺序自上而下扣减，逐层按其批次归属拆分明细，可直接作为分区、批次口径的耗用依据。
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
                    scroll={{ x: 1080 }}
                  />
                </div>
              ),
            },
            {
              key: 'ledger',
              label: (
                <span>
                  <DatabaseOutlined /> 厂外手动台账
                </span>
              ),
              children: (
                <div className="cssm-foot-body">
                  {yard.hasSurvey ? (
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginBottom: 12 }}
                      title="当前为厂内盘煤煤场"
                      description="手动台账仅用于无盘煤数据源的煤场（如厂外中转煤场）。切换到厂外中转煤场后可登记入库、出库或直接调整库存。"
                    />
                  ) : (
                    <Space style={{ marginBottom: 12 }} wrap>
                      <Button type="primary" icon={<ImportOutlined />} onClick={() => openManual('in')}>
                        登记入库
                      </Button>
                      <Button icon={<ExportOutlined />} onClick={() => openManual('out')}>
                        登记出库
                      </Button>
                      <Button icon={<SlidersOutlined />} onClick={() => openManual('set')}>
                        直接调整库存
                      </Button>
                      <span className="cssm-hint">
                        每笔登记都会按堆煤／取煤顺序回写到数字化煤场的煤堆分层结构，保证煤场存煤有量可供取煤扣减。
                      </span>
                    </Space>
                  )}
                  <Table<OuterLedgerEntry>
                    rowKey="id"
                    size="small"
                    columns={ledgerColumns}
                    dataSource={ledger}
                    pagination={{ pageSize: 5, showTotal: (t) => `共 ${t} 条` }}
                    scroll={{ x: 1080 }}
                  />
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
        onApply={handleApplySurvey}
      />

      {/* 标记 / 更改煤层批次 */}
      <Modal
        title={
          selectedLayer?.raw.status === 'unmarked' ? '标记存煤批次' : '更改煤层批次与煤质'
        }
        open={markOpen}
        onCancel={() => setMarkOpen(false)}
        onOk={submitMark}
        okText="保存"
        cancelText="取消"
        width={620}
        destroyOnHidden
      >
        <div className="cssm-form-note">
          {selectedZone && selectedLayer && (
            <>
              {yard.shortName} · {selectedZone.name} · 第 {selectedLayer.seq} 层 ·
              体积 <b>{fmt(selectedLayer.volume)} m³</b> · 标高{' '}
              <b>
                {selectedLayer.bound.heightBottom.toFixed(1)} ~{' '}
                {selectedLayer.bound.heightTop.toFixed(1)} m
              </b>
              。选择接卸批次后自动带入该批次的船名、航次与化验煤质；煤量按所填密度与层体积重算。
            </>
          )}
        </div>
        <Form form={markForm} layout="vertical" requiredMark={false} initialValues={markInitial}>
          <Form.Item
            label="存煤批次"
            name="batchNo"
            rules={[{ required: true, message: '请选择存煤批次' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="按批次号或船名检索"
              options={ARRIVAL_BATCHES.map((b) => ({
                value: b.batchNo,
                label: `${b.batchNo} · ${b.shipName} · ${coalTypeName(b.coalType)}`,
              }))}
              onChange={(v) => {
                const b = findBatch(v);
                if (b) {
                  markForm.setFieldsValue({
                    shipName: b.shipName,
                    voyage: b.voyage,
                    coalType: b.coalType,
                  });
                }
              }}
            />
          </Form.Item>
          <div className="cssm-grid-2" style={{ gridTemplateColumns: '1fr 140px' }}>
            <Form.Item label="船名" name="shipName">
              <Input placeholder="选择批次后自动带入" />
            </Form.Item>
            <Form.Item label="航次" name="voyage">
              <Input placeholder="航次" />
            </Form.Item>
          </div>
          <div className="cssm-grid-2" style={{ gridTemplateColumns: '1fr 190px' }}>
            <Form.Item
              label="煤种"
              name="coalType"
              rules={[{ required: true, message: '请选择煤种' }]}
            >
              <Select
                options={Object.entries(COAL_TYPES).map(([key, meta]) => ({
                  value: key,
                  label: meta.name,
                }))}
              />
            </Form.Item>
            <Form.Item
              label="堆积密度"
              name="density"
              rules={[{ required: true, message: '请输入密度' }]}
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

      {/* 调整煤量 / 起始俯仰角 */}
      <Modal
        title="调整煤层煤量 / 起始俯仰角"
        open={resizeOpen}
        onCancel={() => setResizeOpen(false)}
        onOk={submitResize}
        okText="按几何关系重算"
        cancelText="取消"
        width={560}
        destroyOnHidden
      >
        {selectedZone && selectedLayer && (
          <>
            <div className="cssm-form-note">
              配置本层煤量或层顶俯仰角，系统按堆煤顺序与直扇形楔几何关系自动重算煤层分布；
              差额优先与相邻上层借还，以保持分区总体积不超过盘煤体积上限{' '}
              <b>{fmt(selectedZone.raw.surveyVolume)} m³</b>。
            </div>
            <div className="cssm-stack-form">
              <label htmlFor="cssm-resize-mode">调整方式</label>
              <Radio.Group
                id="cssm-resize-mode"
                optionType="button"
                buttonStyle="solid"
                value={resizeMode}
                onChange={(e) => {
                  const mode = e.target.value as 'mass' | 'pitch';
                  setResizeMode(mode);
                  setResizeValue(
                    mode === 'mass'
                      ? Math.round(selectedLayer.mass)
                      : Number(selectedLayer.bound.pitchTop.toFixed(1)),
                  );
                }}
                options={[
                  { label: '按煤量（t）', value: 'mass' },
                  { label: '按层顶俯仰角（°）', value: 'pitch' },
                ]}
              />
              <label htmlFor="cssm-resize-value">
                {resizeMode === 'mass' ? '目标煤量' : '目标层顶俯仰角'}
              </label>
              <InputNumber
                id="cssm-resize-value"
                style={{ width: '100%' }}
                min={resizeMode === 'mass' ? 0 : -18}
                max={resizeMode === 'mass' ? 200000 : 26}
                step={resizeMode === 'mass' ? 100 : 0.5}
                suffix={resizeMode === 'mass' ? 't' : '°'}
                value={resizeValue}
                onChange={(v) => setResizeValue(Number(v ?? 0))}
              />
            </div>
            {resizePreview && (
              <div className="cssm-convert">
                换算体积 <b className="cssm-num">{fmt(resizePreview.volume)} m³</b>　·　估算煤量{' '}
                <b className="cssm-num">{fmt(resizePreview.mass)} t</b>
                <br />
                层顶标高 <b className="cssm-num">{resizePreview.heightTop.toFixed(2)} m</b>　·　
                层顶俯仰角 <b className="cssm-num">{resizePreview.pitchTop.toFixed(1)}°</b>
                <br />
                与相邻上层借还{' '}
                <b className="cssm-num">
                  {resizePreview.borrowed >= 0 ? '+' : ''}
                  {fmt(resizePreview.borrowed)} m³
                </b>
                {resizePreview.capped && (
                  <span style={{ color: UNMARKED_COLOR }}>（已受上层存量限制）</span>
                )}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* 厂外煤场手动维护 */}
      <Modal
        title={
          manualType === 'in' ? '登记入库' : manualType === 'out' ? '登记出库' : '直接调整库存'
        }
        open={manualOpen}
        onCancel={() => setManualOpen(false)}
        onOk={submitManual}
        okText="确认登记"
        cancelText="取消"
        width={580}
        destroyOnHidden
      >
        <div className="cssm-form-note">
          {yard.shortName} 无盘煤数据源，库存以手动台账为准。登记后系统按{' '}
          {manualType === 'out' ? '取煤顺序自上而下扣减' : '堆煤顺序堆至煤堆顶层'}
          ，自动回写至数字化煤场的煤堆分层结构。
        </div>
        <Form
          form={manualForm}
          layout="vertical"
          requiredMark={false}
          initialValues={manualInitial}
        >
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            value={manualType}
            style={{ marginBottom: 16 }}
            onChange={(e) => {
              const t = e.target.value as 'in' | 'out' | 'set';
              setManualType(t);
              const zone = computedZones.find((z) => z.id === manualForm.getFieldValue('zoneId'));
              manualForm.setFieldsValue({
                mass: t === 'set' ? Math.round(zone?.totalMass ?? 0) : 1000,
              });
            }}
            options={[
              { label: '入库', value: 'in' },
              { label: '出库', value: 'out' },
              { label: '库存调整', value: 'set' },
            ]}
          />
          <div className="cssm-grid-2" style={{ gridTemplateColumns: '1fr 170px' }}>
            <Form.Item
              label={manualType === 'in' ? '入库时间' : '登记时间'}
              name="time"
              rules={[{ required: true, message: '请选择时间' }]}
            >
              <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              label="目标分区"
              name="zoneId"
              rules={[{ required: true, message: '请选择分区' }]}
            >
              <Select options={computedZones.map((z) => ({ value: z.id, label: z.name }))} />
            </Form.Item>
          </div>
          <Form.Item
            label="来煤批次"
            name="batchNo"
            extra={manualType === 'out' ? '出库按煤层实际批次自动拆分，无需指定' : '留空将生成待标记煤层'}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={manualType === 'out'}
              placeholder="选择来煤批次"
              options={ARRIVAL_BATCHES.map((b) => ({
                value: b.batchNo,
                label: `${b.batchNo} · ${b.shipName} · ${coalTypeName(b.coalType)}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            label={manualType === 'set' ? '目标库存煤量' : manualType === 'in' ? '入库煤量' : '出库煤量'}
            name="mass"
            rules={[{ required: true, message: '请输入煤量' }]}
          >
            <InputNumber min={0} max={200000} step={100} suffix="t" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={2} placeholder="如：汽运转堆入库 / 倒运至厂内 #1 煤场" />
          </Form.Item>
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
