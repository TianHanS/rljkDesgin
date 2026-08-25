/**
 * 操作 · 入库
 *
 * 在所选分区的顶层新增煤层。总煤量在所选分区间平均分摊：圆形煤场由堆料机绕中心回转铺层，
 * 条形煤场由斗轮沿轨道走行铺层。各分区新增煤层的体积与俯仰夹角由几何关系自动反算。
 * 若所选分区已有盘煤体积，保存前二次提示手动入库会影响盘煤仪获得的实际存煤体积。
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Drawer, Input, InputNumber, Select, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ARRIVAL_BATCHES,
  type CoalYard,
  coalTypeName,
  fmt,
  shortRegNo,
} from '../data';
import { buildInboundPlan, type InboundPlanItem } from '../model';
import type { ComputedZone } from '../model';
import type { CoalZone } from '../data';

interface Props {
  open: boolean;
  yard: CoalYard;
  zones: ComputedZone[];
  rawZones: CoalZone[];
  defaultDensity: number;
  onClose: () => void;
  onSubmit: (params: {
    plan: InboundPlanItem[];
    regNo: string;
    density: number;
    totalMass: number;
    note: string;
    needSurveyWarning: boolean;
  }) => void;
}

const InboundDrawer: React.FC<Props> = ({
  open,
  yard,
  zones,
  rawZones,
  defaultDensity,
  onClose,
  onSubmit,
}) => {
  const [picked, setPicked] = useState<string[]>([]);
  const [regNo, setRegNo] = useState<string | undefined>();
  const [totalMass, setTotalMass] = useState(2000);
  const [density, setDensity] = useState(defaultDensity);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setPicked([]);
    setRegNo(undefined);
    setTotalMass(2000);
    setDensity(defaultDensity);
    setNote('');
  }, [open, defaultDensity]);

  const plan = useMemo(
    () => buildInboundPlan(rawZones, picked, totalMass, density),
    [rawZones, picked, totalMass, density],
  );
  const planMap = useMemo(() => new Map(plan.map((p) => [p.zoneId, p])), [plan]);

  const needSurveyWarning = plan.some((p) => p.hasSurveyVolume) && yard.hasSurvey;
  const overCapacityZones = plan.filter((p) => p.overCapacity);

  const columns: ColumnsType<ComputedZone> = [
    { title: '分区', key: 'zone', width: 66, fixed: 'left', render: (_, z) => z.name },
    {
      title: '分区总体积 m³',
      key: 'volume',
      width: 116,
      align: 'right',
      render: (_, z) => <span className="cssm-num">{fmt(z.totalVolume)}</span>,
    },
    {
      title: '存煤高度 m',
      key: 'height',
      width: 100,
      align: 'right',
      render: (_, z) => <span className="cssm-num">{z.stackHeight.toFixed(2)}</span>,
    },
    {
      title: '存煤量 t',
      key: 'mass',
      width: 100,
      align: 'right',
      render: (_, z) => <span className="cssm-num">{fmt(z.totalMass)}</span>,
    },
    {
      title: '剩余容量 m³',
      key: 'left',
      width: 108,
      align: 'right',
      render: (_, z) => (
        <span className="cssm-num">{fmt(Math.max(0, z.capacity - z.totalVolume))}</span>
      ),
    },
    {
      title: '分摊煤量 t',
      key: 'allocMass',
      width: 100,
      align: 'right',
      render: (_, z) => {
        const item = planMap.get(z.id);
        return item ? (
          <span className="cssm-num" style={{ color: '#0f8f8c' }}>
            +{fmt(item.mass)}
          </span>
        ) : (
          <span style={{ color: '#b3aca3' }}>—</span>
        );
      },
    },
    {
      title: '新增体积 m³',
      key: 'allocVolume',
      width: 110,
      align: 'right',
      render: (_, z) => {
        const item = planMap.get(z.id);
        return item ? (
          <span className="cssm-num" style={{ color: '#0f8f8c' }}>
            +{fmt(item.volume)}
          </span>
        ) : (
          <span style={{ color: '#b3aca3' }}>—</span>
        );
      },
    },
    {
      title: '新增煤层俯仰夹角',
      key: 'pitch',
      width: 170,
      render: (_, z) => {
        const item = planMap.get(z.id);
        if (!item) return <span style={{ color: '#b3aca3' }}>—</span>;
        return (
          <span className="cssm-num">
            {item.pitchFrom.toFixed(1)}° → {item.pitchTo.toFixed(1)}°
            <span style={{ marginLeft: 8, color: '#8b847b', fontSize: 11.5 }}>
              堆高 {item.heightFrom.toFixed(2)} → {item.heightTo.toFixed(2)} m
            </span>
          </span>
        );
      },
    },
  ];

  const canSubmit = picked.length > 0 && totalMass > 0 && density > 0 && overCapacityZones.length === 0;

  return (
    <Drawer
      title={`入库（顶层新增煤层）· ${yard.shortName}`}
      open={open}
      onClose={onClose}
      size="min(1180px, 96vw)"
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="cssm-hint">
            已选 {picked.length} 个分区 · 合计入库 {fmt(totalMass)} t · 折算体积{' '}
            {fmt(density > 0 ? totalMass / density : 0)} m³
          </span>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              disabled={!canSubmit}
              onClick={() =>
                onSubmit({
                  plan,
                  regNo: regNo ?? '',
                  density,
                  totalMass,
                  note,
                  needSurveyWarning,
                })
              }
            >
              确认入库
            </Button>
          </Space>
        </div>
      }
    >
      <div className="cssm-form-note">
        入库将在所选分区的<b>煤堆顶层</b>新增一层煤。总煤量在所选分区间平均分摊（圆形煤场由堆料机
        回转铺层，条形煤场由斗轮沿轨道走行铺层），各分区新增煤层的体积按所填计算密度折算，起始与
        结束俯仰夹角由该分区几何关系反算。留空入厂登记编号时，新增煤层将标记为待人工确认。
      </div>

      <div className="cssm-drawer-form">
        <div>
          <label htmlFor="cssm-in-reg">入厂登记编号</label>
          <Select
            id="cssm-in-reg"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            placeholder="选择入厂批次，留空则生成待标记煤层"
            value={regNo}
            onChange={(v) => setRegNo(v)}
            options={ARRIVAL_BATCHES.map((b) => ({
              value: b.regNo,
              label: `${shortRegNo(b.regNo)} · ${b.shipName} · ${coalTypeName(b.coalType)}`,
            }))}
          />
        </div>
        <div>
          <label htmlFor="cssm-in-mass">入库煤量</label>
          <InputNumber
            id="cssm-in-mass"
            style={{ width: '100%' }}
            min={1}
            max={200000}
            step={100}
            suffix="t"
            value={totalMass}
            onChange={(v) => setTotalMass(Number(v ?? 0))}
          />
        </div>
        <div>
          <label htmlFor="cssm-in-density">计算密度</label>
          <InputNumber
            id="cssm-in-density"
            style={{ width: '100%' }}
            min={0.6}
            max={1.2}
            step={0.01}
            suffix="t/m³"
            value={density}
            onChange={(v) => setDensity(Number(v ?? defaultDensity))}
          />
        </div>
        <div className="is-wide">
          <label htmlFor="cssm-in-note">其他说明</label>
          <Input
            id="cssm-in-note"
            placeholder="如：汽运转堆 / 卸船直取上堆"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {overCapacityZones.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ margin: '12px 0' }}
          title="超出分区几何容量"
          description={`${overCapacityZones
            .map((z) => z.zoneName)
            .join('、')} 入库后将超过 ${
            zones[0]?.geometry.maxStackHeight ?? 20
          } m 堆煤高度上限，请减少入库煤量或增加分区。`}
        />
      )}

      {needSurveyWarning && (
        <Alert
          type="warning"
          showIcon
          style={{ margin: '12px 0' }}
          title="所选分区已有盘煤体积"
          description="此煤场体积通过盘煤仪获得，若手动增加，将影响实际存煤体积信息。确认入库时会再次提示。"
        />
      )}

      <h3 className="cssm-drawer-h3">
        选择入库分区
        <span>单选或多选，勾选后自动计算该分区的分摊煤量、新增体积与俯仰夹角</span>
      </h3>
      <Table<ComputedZone>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={zones}
        pagination={{ pageSize: 12, showSizeChanger: false, showTotal: (t) => `共 ${t} 个分区` }}
        scroll={{ x: 940 }}
        rowSelection={{
          selectedRowKeys: picked,
          onChange: (keys) => setPicked(keys as string[]),
        }}
      />
    </Drawer>
  );
};

export default InboundDrawer;
