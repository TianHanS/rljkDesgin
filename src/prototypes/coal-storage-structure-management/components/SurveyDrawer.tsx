/**
 * 盘煤比对向导
 *
 * 录入本次各分区盘煤体积，勾选盘煤周期内入厂批次，实时计算全煤场匹配密度
 * ρ = Σ批次煤量 / Σ新增体积，据此判定「自动识别入厂批次」或「生成待标记煤层」，
 * 并在应用前预览各分区的入库／出库处理方式与新增煤层的起始俯仰夹角区间。
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, InputNumber, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import * as geo from '../geometry';
import {
  ARRIVAL_BATCHES,
  DENSITY_RANGE,
  SURVEY_DELTA_PLAN,
  SURVEY_PERIOD,
  type ArrivalBatch,
  type CoalYard,
  type CoalZone,
  coalTypeName,
  fmt,
  shortRegNo,
} from '../data';
import { buildSurveyPlan, type SurveyInput, type SurveyPlan } from '../model';

interface Props {
  open: boolean;
  yard: CoalYard;
  zones: CoalZone[];
  defaultDensity: number;
  onClose: () => void;
  onApply: (plan: SurveyPlan, input: SurveyInput) => void;
}

interface VolumeRow {
  key: string;
  zone: CoalZone;
}

const SurveyDrawer: React.FC<Props> = ({
  open,
  yard,
  zones,
  defaultDensity,
  onClose,
  onApply,
}) => {
  const scoped = useMemo(
    () => zones.filter((z) => z.yardId === yard.id).sort((a, b) => a.code - b.code),
    [zones, yard.id],
  );

  const batchPool = useMemo<ArrivalBatch[]>(
    () =>
      ARRIVAL_BATCHES.filter(
        (b) =>
          b.yardId === yard.id &&
          b.unloadedAt >= SURVEY_PERIOD.from &&
          b.unloadedAt <= SURVEY_PERIOD.to,
      ),
    [yard.id],
  );

  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const deltas = SURVEY_DELTA_PLAN[yard.id] ?? {};
    const next: Record<string, number> = {};
    scoped.forEach((z) => {
      next[z.id] = Math.round(z.surveyVolume + (deltas[z.code] ?? 0));
    });
    setVolumes(next);
    setPicked(batchPool.map((b) => b.regNo));
  }, [open, scoped, batchPool, yard.id]);

  const input: SurveyInput = {
    yardId: yard.id,
    volumes,
    regNos: picked,
    defaultDensity,
  };
  const plan = useMemo(
    () => buildSurveyPlan(zones, input),
    [zones, volumes, picked, defaultDensity, yard.id],
  );
  const planMap = useMemo(() => new Map(plan.items.map((i) => [i.zoneId, i])), [plan]);

  const changedZones = useMemo(
    () => scoped.filter((z) => Math.abs((planMap.get(z.id)?.delta ?? 0)) > 0.5),
    [scoped, planMap],
  );
  const [onlyChanged, setOnlyChanged] = useState(true);
  const tableRows = (onlyChanged && changedZones.length > 0 ? changedZones : scoped).map((z) => ({
    key: z.id,
    zone: z,
  }));

  const volumeColumns: ColumnsType<VolumeRow> = [
    { title: '分区', key: 'zone', width: 66, render: (_, r) => r.zone.name },
    {
      title: '上次盘煤体积 m³',
      key: 'lastVolume',
      width: 130,
      align: 'right',
      render: (_, r) => <span className="cssm-num">{fmt(r.zone.surveyVolume)}</span>,
    },
    {
      title: '本次盘煤体积 m³',
      key: 'newVolume',
      width: 150,
      render: (_, r) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          min={0}
          max={Math.round(geo.capacityVolume(r.zone.geometry))}
          step={50}
          value={volumes[r.zone.id]}
          onChange={(v) => setVolumes((prev) => ({ ...prev, [r.zone.id]: Number(v ?? 0) }))}
        />
      ),
    },
    {
      title: '体积变动 m³',
      key: 'delta',
      width: 116,
      align: 'right',
      render: (_, r) => {
        const delta = planMap.get(r.zone.id)?.delta ?? 0;
        if (Math.abs(delta) < 0.5) return <span style={{ color: '#b3aca3' }}>—</span>;
        return (
          <span className="cssm-num" style={{ color: delta > 0 ? '#0f8f8c' : '#b8790a' }}>
            {delta > 0 ? '+' : ''}
            {fmt(delta)}
          </span>
        );
      },
    },
    {
      title: '堆煤高度 m',
      key: 'height',
      width: 116,
      align: 'right',
      render: (_, r) => {
        const current = r.zone.layers.reduce((s, l) => s + l.volume, 0);
        const target = volumes[r.zone.id] ?? r.zone.surveyVolume;
        return (
          <span className="cssm-num">
            {geo.heightFromVolume(r.zone.geometry, current).toFixed(2)} →{' '}
            {geo.heightFromVolume(r.zone.geometry, target).toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '处理方式',
      key: 'action',
      render: (_, r) => {
        const item = planMap.get(r.zone.id);
        if (!item || item.kind === 'none') return <span style={{ color: '#b3aca3' }}>无变动</span>;
        if (item.kind === 'in') {
          return (
            <Space size={4} wrap>
              <Tag color={plan.autoMatched ? 'cyan' : 'red'} style={{ marginInlineEnd: 0 }}>
                {plan.autoMatched ? '自动识别新增煤层' : '生成待标记煤层'}
              </Tag>
              <span style={{ fontSize: 11.5, color: '#8b847b' }}>
                起始俯仰角 {item.pitchFrom?.toFixed(1)}° → {item.pitchTo?.toFixed(1)}°
              </span>
            </Space>
          );
        }
        return (
          <Space size={4} wrap>
            <Tag color="gold" style={{ marginInlineEnd: 0 }}>
              自上而下扣减
            </Tag>
            <span style={{ fontSize: 11.5, color: '#8b847b' }}>
              {item.details
                .map((d) => `${d.regNo ? shortRegNo(d.regNo) : '待标记'} -${fmt(d.mass)} t`)
                .join(' · ')}
            </span>
          </Space>
        );
      },
    },
  ];

  const batchColumns: ColumnsType<ArrivalBatch> = [
    { title: '入厂登记编号', dataIndex: 'regNo', width: 250 },
    { title: '船名', dataIndex: 'shipName', width: 150 },
    { title: '航次', dataIndex: 'voyage', width: 76 },
    { title: '库存煤种', key: 'coalType', width: 100, render: (_, r) => coalTypeName(r.coalType) },
    {
      title: '卸煤量 t',
      dataIndex: 'unloadedMass',
      width: 100,
      align: 'right',
      render: (v: number) => <span className="cssm-num">{fmt(v)}</span>,
    },
    { title: '卸煤完成', dataIndex: 'unloadedAt', width: 110 },
  ];

  return (
    <Drawer
      title={`盘煤比对 · ${yard.shortName}`}
      open={open}
      onClose={onClose}
      size="min(1180px, 96vw)"
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="cssm-hint">
            将生成 {plan.items.filter((i) => i.kind === 'in').length} 条入库记录、
            {plan.items.filter((i) => i.kind === 'out').length} 条出库明细
            {plan.newUnmarkedLayers > 0 && `，其中 ${plan.newUnmarkedLayers} 个分区需人工标记批次`}
          </span>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              disabled={plan.increaseVolume < 0.5 && plan.decreaseVolume < 0.5}
              onClick={() => onApply(plan, input)}
            >
              执行盘煤比对
            </Button>
          </Space>
        </div>
      }
    >
      <div className="cssm-form-note">
        盘煤周期 {SURVEY_PERIOD.from} ~ {SURVEY_PERIOD.to}。体积增加的分区，按周期内入厂批次以
        <b> 全煤场 </b>口径计算匹配密度 ρ = Σ批次煤量 / Σ新增体积；ρ 落在 {DENSITY_RANGE.min} ~{' '}
        {DENSITY_RANGE.max} t/m³ 时自动识别新增煤层的入厂批次归属，否则仅记录体积与按默认计算密度{' '}
        {defaultDensity} t/m³ 估算的煤量，并标记为待人工确认。体积减少的分区，按减少体积自上而下
        逐层扣减并形成出库明细。
      </div>

      <div className="cssm-match">
        <div className="cssm-match-cell">
          <div className="cssm-match-k">全煤场新增体积</div>
          <div className="cssm-match-v cssm-num is-ok">
            {fmt(plan.increaseVolume)}
            <small>m³</small>
          </div>
        </div>
        <div className="cssm-match-cell">
          <div className="cssm-match-k">勾选批次卸煤量</div>
          <div className="cssm-match-v cssm-num">
            {fmt(plan.batchMass)}
            <small>t</small>
          </div>
        </div>
        <div className="cssm-match-cell">
          <div className="cssm-match-k">匹配密度 ρ</div>
          <div className={`cssm-match-v cssm-num ${plan.autoMatched ? 'is-ok' : 'is-flare'}`}>
            {plan.matchDensity === null ? '—' : plan.matchDensity.toFixed(3)}
            <small>t/m³</small>
          </div>
        </div>
        <div className="cssm-match-cell">
          <div className="cssm-match-k">批次识别判定</div>
          <div className={`cssm-match-v ${plan.autoMatched ? 'is-ok' : 'is-flare'}`}>
            {plan.autoMatched ? '密度合理，自动识别' : '需人工标记'}
          </div>
        </div>
      </div>

      <h3 className="cssm-drawer-h3">
        分区盘煤体积
        <span>
          圆形煤场按扇区连续作业，一个盘煤周期内通常只有少数扇区发生堆取
          <Button
            type="link"
            size="small"
            onClick={() => setOnlyChanged((v) => !v)}
            disabled={changedZones.length === 0}
          >
            {onlyChanged && changedZones.length > 0
              ? `显示全部 ${scoped.length} 个分区`
              : `仅看有变动的 ${changedZones.length} 个分区`}
          </Button>
        </span>
      </h3>
      <Table<VolumeRow>
        rowKey="key"
        size="small"
        pagination={{ pageSize: 12, showSizeChanger: false, showTotal: (t) => `共 ${t} 个分区` }}
        columns={volumeColumns}
        dataSource={tableRows}
        scroll={{ x: 900 }}
      />

      <h3 className="cssm-drawer-h3" style={{ marginTop: 18 }}>
        盘煤周期内入厂批次
        <span>取消勾选可模拟批次台账缺失时的待标记路径</span>
      </h3>
      <Table<ArrivalBatch>
        rowKey="regNo"
        size="small"
        pagination={false}
        columns={batchColumns}
        dataSource={batchPool}
        locale={{ emptyText: '本盘煤周期内该煤场无入厂批次，新增体积将全部生成待标记煤层' }}
        rowSelection={{
          selectedRowKeys: picked,
          onChange: (keys) => setPicked(keys as string[]),
        }}
        scroll={{ x: 800 }}
      />
    </Drawer>
  );
};

export default SurveyDrawer;
