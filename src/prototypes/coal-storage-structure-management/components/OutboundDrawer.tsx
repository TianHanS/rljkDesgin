/**
 * 操作 · 出库
 *
 * 选择分区、输入出库煤量，按后进先出顺序（自表层向下）扣减分区煤量。
 * 扣减明细按各层自身的入厂批次与计算密度拆分，直接构成分区、批次口径的出库记录。
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Drawer, Input, InputNumber, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import * as geo from '../geometry';
import { type CoalYard, coalTypeName, fmt, shortRegNo } from '../data';
import { deductMassFromTop } from '../model';
import type { ComputedZone } from '../model';

interface Props {
  open: boolean;
  yard: CoalYard;
  zones: ComputedZone[];
  presetZoneId: string | null;
  onClose: () => void;
  onSubmit: (params: { zoneId: string; mass: number; note: string }) => void;
}

interface CutRow {
  key: string;
  seq: number;
  regNo: string;
  coalTypeName: string;
  volume: number;
  mass: number;
  density: number;
  drained: boolean;
}

const OutboundDrawer: React.FC<Props> = ({
  open,
  yard,
  zones,
  presetZoneId,
  onClose,
  onSubmit,
}) => {
  const [zoneId, setZoneId] = useState<string | undefined>();
  const [mass, setMass] = useState(1000);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    const fallback = zones.find((z) => z.totalMass > 0)?.id;
    setZoneId(presetZoneId ?? fallback);
    setMass(1000);
    setNote('');
  }, [open, presetZoneId, zones]);

  const zone = zones.find((z) => z.id === zoneId) ?? null;

  const preview = useMemo(() => {
    if (!zone) return { rows: [] as CutRow[], shortage: 0, cutMass: 0, cutVolume: 0 };
    const result = deductMassFromTop(zone.raw.layers, mass);
    const seqOf = new Map(zone.layers.map((l) => [l.id, l.seq]));
    const rows: CutRow[] = result.cuts.map((c, i) => ({
      key: `${c.layer.id}-${i}`,
      seq: seqOf.get(c.layer.id) ?? 0,
      regNo: c.layer.regNo,
      coalTypeName: c.layer.regNo ? coalTypeName(c.layer.coalType) : '待标记',
      volume: c.volume,
      mass: c.mass,
      density: c.layer.density,
      drained: c.volume >= c.layer.volume - 0.01,
    }));
    return {
      rows,
      shortage: result.shortage,
      cutMass: rows.reduce((s, r) => s + r.mass, 0),
      cutVolume: rows.reduce((s, r) => s + r.volume, 0),
    };
  }, [zone, mass]);

  const columns: ColumnsType<CutRow> = [
    {
      title: '扣减顺序',
      key: 'order',
      width: 100,
      render: (_, __, index) => (
        <Tag color={index === 0 ? 'gold' : 'default'} style={{ marginInlineEnd: 0 }}>
          第 {index + 1} 顺位
        </Tag>
      ),
    },
    {
      title: '煤层',
      key: 'seq',
      width: 110,
      render: (_, r) => (
        <span className="cssm-num">
          第 {r.seq} 层{r.seq === zone?.layers.length ? '（表层）' : ''}
        </span>
      ),
    },
    {
      title: '入厂登记编号',
      key: 'reg',
      width: 150,
      render: (_, r) => (r.regNo ? shortRegNo(r.regNo) : <span style={{ color: '#cf1322' }}>待标记</span>),
    },
    { title: '库存煤种', dataIndex: 'coalTypeName', width: 100 },
    {
      title: '扣减体积 m³',
      dataIndex: 'volume',
      width: 110,
      align: 'right',
      render: (v: number) => <span className="cssm-num">{fmt(v)}</span>,
    },
    {
      title: '扣减煤量 t',
      dataIndex: 'mass',
      width: 106,
      align: 'right',
      render: (v: number) => <span className="cssm-num">{fmt(v)}</span>,
    },
    {
      title: '结果',
      key: 'result',
      render: (_, r) =>
        r.drained ? (
          <Tag color="red" style={{ marginInlineEnd: 0 }}>
            该层取空并移除
          </Tag>
        ) : (
          <Tag color="blue" style={{ marginInlineEnd: 0 }}>
            部分扣减
          </Tag>
        ),
    },
  ];

  const canSubmit = Boolean(zone) && mass > 0 && preview.shortage <= 0.01;

  return (
    <Drawer
      title={`出库（后进先出扣减）· ${yard.shortName}`}
      open={open}
      onClose={onClose}
      size="min(1020px, 96vw)"
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="cssm-hint">
            将扣减 {preview.rows.length} 个煤层 · 合计 {fmt(preview.cutMass)} t /{' '}
            {fmt(preview.cutVolume)} m³
          </span>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              disabled={!canSubmit}
              onClick={() => zone && onSubmit({ zoneId: zone.id, mass, note })}
            >
              确认出库
            </Button>
          </Space>
        </div>
      }
    >
      <div className="cssm-form-note">
        出库按<b>后进先出</b>顺序执行：从表层煤开始向下逐层扣减，每层用其自身的计算密度把煤量折算
        为体积，取空的煤层自动移除。扣减明细按各层的入厂登记编号拆分，形成分区、批次口径的出库记录。
      </div>

      <div className="cssm-drawer-form">
        <div>
          <label htmlFor="cssm-out-zone">出库分区</label>
          <Select
            id="cssm-out-zone"
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            value={zoneId}
            onChange={(v) => setZoneId(v)}
            options={zones.map((z) => ({
              value: z.id,
              label: `${z.name}　存煤 ${fmt(z.totalMass)} t　堆高 ${z.stackHeight.toFixed(2)} m`,
              disabled: z.totalMass <= 0.01,
            }))}
          />
        </div>
        <div>
          <label htmlFor="cssm-out-mass">出库煤量</label>
          <InputNumber
            id="cssm-out-mass"
            style={{ width: '100%' }}
            min={1}
            max={200000}
            step={100}
            suffix="t"
            value={mass}
            onChange={(v) => setMass(Number(v ?? 0))}
          />
        </div>
        <div className="is-wide">
          <label htmlFor="cssm-out-note">其他说明</label>
          <Input
            id="cssm-out-note"
            placeholder="如：1 号机组上煤取料 / 倒运至 #2 圆形煤场"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {zone && (
        <div className="cssm-match">
          <div className="cssm-match-cell">
            <div className="cssm-match-k">分区存煤量</div>
            <div className="cssm-match-v cssm-num">
              {fmt(zone.totalMass)}
              <small>t</small>
            </div>
          </div>
          <div className="cssm-match-cell">
            <div className="cssm-match-k">出库后剩余</div>
            <div className="cssm-match-v cssm-num">
              {fmt(Math.max(0, zone.totalMass - preview.cutMass))}
              <small>t</small>
            </div>
          </div>
          <div className="cssm-match-cell">
            <div className="cssm-match-k">出库后堆高</div>
            <div className="cssm-match-v cssm-num">
              {geo
                .heightFromVolume(
                  zone.geometry,
                  Math.max(0, zone.totalVolume - preview.cutVolume),
                )
                .toFixed(2)}
              <small>m</small>
            </div>
          </div>
          <div className="cssm-match-cell">
            <div className="cssm-match-k">煤量校验</div>
            <div className={`cssm-match-v ${preview.shortage > 0.01 ? 'is-flare' : 'is-ok'}`}>
              {preview.shortage > 0.01 ? `不足 ${fmt(preview.shortage)} t` : '可满足'}
            </div>
          </div>
        </div>
      )}

      {preview.shortage > 0.01 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          title="分区现存煤量不足"
          description={`${zone?.name ?? ''} 现存 ${fmt(
            zone?.totalMass ?? 0,
          )} t，尚缺 ${fmt(preview.shortage)} t。请调整出库煤量，或改从其他分区出库。`}
        />
      )}

      <h3 className="cssm-drawer-h3">
        后进先出扣减明细
        <span>自表层向下逐层扣减，可核对将影响哪些入厂批次</span>
      </h3>
      <Table<CutRow>
        rowKey="key"
        size="small"
        columns={columns}
        dataSource={preview.rows}
        pagination={false}
        locale={{ emptyText: '请选择分区并输入出库煤量' }}
        scroll={{ x: 800 }}
      />
    </Drawer>
  );
};

export default OutboundDrawer;
