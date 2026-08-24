/**
 * 操作 · 分层拆分
 *
 * 把选中的单层煤拆分为多层。分层列表按自上而下排列：
 * 首行的结束角度锁定为原煤层的层顶角，末行的起始角度锁定为原煤层的层底角，
 * 中间各行的结束角度自动取上一行的起始角度——用户只需逐行输入起始角度，
 * 系统按扇形楔几何关系实时反算各子层的体积、占比与煤量。确认拆分需二次确认。
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Drawer, InputNumber, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as geo from '../geometry';
import { ARRIVAL_BATCHES, coalTypeName, fmt, shortRegNo } from '../data';
import { buildSplitPreview, type ComputedLayer, type ComputedZone, type SplitPreviewRow } from '../model';

interface Props {
  open: boolean;
  yardName: string;
  zone: ComputedZone | null;
  layer: ComputedLayer | null;
  onClose: () => void;
  onSubmit: (preview: SplitPreviewRow[]) => void;
}

const MAX_ROWS = 6;

interface Row extends SplitPreviewRow {
  key: number;
  index: number;
  /** 起始角度是否锁定（末行锁定为原层底角） */
  startLocked: boolean;
}

const SplitLayerDrawer: React.FC<Props> = ({
  open,
  yardName,
  zone,
  layer,
  onClose,
  onSubmit,
}) => {
  const [count, setCount] = useState(2);
  const [starts, setStarts] = useState<number[]>([]);
  const [regNos, setRegNos] = useState<string[]>([]);

  /** 按角度等分为 n 层，作为可再微调的初值 */
  const evenSplit = (n: number, top: number, bottom: number) =>
    Array.from({ length: n }, (_, i) =>
      Number((top - ((i + 1) * (top - bottom)) / n).toFixed(2)),
    );

  useEffect(() => {
    if (!open || !layer) return;
    const top = layer.bound.pitchTop;
    const bottom = layer.bound.pitchBottom;
    setCount(2);
    setStarts(evenSplit(2, top, bottom));
    setRegNos([layer.raw.regNo, layer.raw.regNo]);
  }, [open, layer]);

  const changeCount = (n: number) => {
    if (!layer) return;
    setCount(n);
    setStarts(evenSplit(n, layer.bound.pitchTop, layer.bound.pitchBottom));
    setRegNos((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? layer.raw.regNo));
  };

  const preview = useMemo<Row[]>(() => {
    if (!zone || !layer || starts.length !== count) return [];
    const top = layer.bound.pitchTop;
    const rows = Array.from({ length: count }, (_, i) => ({
      regNo: regNos[i] ?? '',
      // 结束角度：首行为原层顶角，其余取上一行的起始角度
      pitchEnd: i === 0 ? top : starts[i - 1],
      // 末行起始角度锁定为原层底角
      pitchStart: i === count - 1 ? layer.bound.pitchBottom : starts[i],
    }));
    return buildSplitPreview(zone.geometry, layer, rows).map((r, i) => ({
      ...r,
      key: i,
      index: i,
      startLocked: i === count - 1,
    }));
  }, [zone, layer, starts, regNos, count]);

  const sumVolume = preview.reduce((s, r) => s + Math.max(0, r.volume), 0);
  const orderValid = preview.every((r) => r.pitchStart < r.pitchEnd - 0.0001);
  const volumeValid = preview.every((r) => r.volume > 0.01);
  const canSubmit = orderValid && volumeValid && preview.length >= 2;

  const columns: ColumnsType<Row> = [
    {
      title: '子层',
      key: 'seq',
      width: 96,
      render: (_, r) => (
        <Tag color={r.index === 0 ? 'blue' : 'default'} style={{ marginInlineEnd: 0 }}>
          {r.index === 0 ? '表层' : `自上第 ${r.index + 1} 层`}
        </Tag>
      ),
    },
    {
      title: '入厂登记编号',
      key: 'reg',
      width: 250,
      render: (_, r) => (
        <Select
          size="small"
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          placeholder="留空为待标记"
          value={r.regNo || undefined}
          onChange={(v) =>
            setRegNos((prev) => prev.map((x, i) => (i === r.index ? (v as string) ?? '' : x)))
          }
          options={ARRIVAL_BATCHES.map((b) => ({
            value: b.regNo,
            label: `${shortRegNo(b.regNo)} · ${b.shipName} · ${coalTypeName(b.coalType)}`,
          }))}
        />
      ),
    },
    {
      title: '结束角度 °',
      key: 'pitchEnd',
      width: 116,
      align: 'right',
      render: (_, r) => (
        <span className="cssm-num" style={{ color: '#8b847b' }}>
          {r.pitchEnd.toFixed(2)}
        </span>
      ),
    },
    {
      title: '起始角度 °',
      key: 'pitchStart',
      width: 132,
      render: (_, r) =>
        r.startLocked ? (
          <span className="cssm-num" style={{ color: '#8b847b' }}>
            {r.pitchStart.toFixed(2)}
          </span>
        ) : (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            step={0.5}
            precision={2}
            status={r.pitchStart >= r.pitchEnd ? 'error' : undefined}
            value={starts[r.index]}
            onChange={(v) =>
              setStarts((prev) => prev.map((x, i) => (i === r.index ? Number(v ?? 0) : x)))
            }
          />
        ),
    },
    {
      title: '标高区间 m',
      key: 'height',
      width: 128,
      align: 'right',
      render: (_, r) => (
        <span className="cssm-num">
          {r.heightStart.toFixed(2)} ~ {r.heightEnd.toFixed(2)}
        </span>
      ),
    },
    {
      title: '分层体积 m³',
      key: 'volume',
      width: 112,
      align: 'right',
      render: (_, r) => (
        <span className="cssm-num" style={{ color: r.volume > 0.01 ? undefined : '#cf1322' }}>
          {fmt(r.volume)}
        </span>
      ),
    },
    {
      title: '占比',
      key: 'ratio',
      width: 88,
      align: 'right',
      render: (_, r) => <span className="cssm-num">{(r.ratio * 100).toFixed(1)}%</span>,
    },
    {
      title: '煤量 t',
      key: 'mass',
      width: 100,
      align: 'right',
      render: (_, r) => <span className="cssm-num">{fmt(r.mass)}</span>,
    },
  ];

  return (
    <Drawer
      title="分层拆分"
      open={open}
      onClose={onClose}
      size="min(1180px, 96vw)"
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="cssm-hint">
            拆分为 {count} 层 · 体积合计 {fmt(sumVolume)} m³
            {layer && Math.abs(sumVolume - layer.volume) > 1 && (
              <span style={{ color: '#cf1322' }}>
                （与原煤层 {fmt(layer.volume)} m³ 相差 {fmt(Math.abs(sumVolume - layer.volume))} m³）
              </span>
            )}
          </span>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Popconfirm
              title="确认拆分该煤层？"
              description={`原煤层将被 ${count} 个子层替换，各子层的体积与煤量按俯仰夹角重算，操作会记入调整记录。`}
              okText="确认拆分"
              cancelText="返回修改"
              disabled={!canSubmit}
              onConfirm={() => onSubmit(preview)}
            >
              <Button type="primary" disabled={!canSubmit}>
                确认拆分
              </Button>
            </Popconfirm>
          </Space>
        </div>
      }
    >
      {zone && layer ? (
        <>
          <div className="cssm-form-note">
            {yardName} · {zone.name} · 第 {layer.seq} 层。分层列表自上而下排列，
            <b>下一层的结束角度自动取上一层的起始角度</b>；末层的起始角度锁定为原煤层层底角，
            首层的结束角度锁定为原煤层层顶角。修改任一行起始角度，其下方各层的角度、体积、
            占比与煤量会实时联动重算。
          </div>

          <div className="cssm-match">
            <div className="cssm-match-cell">
              <div className="cssm-match-k">原煤层煤量</div>
              <div className="cssm-match-v cssm-num">
                {fmt(layer.mass)}
                <small>t</small>
              </div>
            </div>
            <div className="cssm-match-cell">
              <div className="cssm-match-k">原煤层体积</div>
              <div className="cssm-match-v cssm-num">
                {fmt(layer.volume)}
                <small>m³</small>
              </div>
            </div>
            <div className="cssm-match-cell">
              <div className="cssm-match-k">俯仰夹角区间</div>
              <div className="cssm-match-v cssm-num">
                {layer.bound.pitchBottom.toFixed(2)}° ~ {layer.bound.pitchTop.toFixed(2)}°
              </div>
            </div>
            <div className="cssm-match-cell">
              <div className="cssm-match-k">标高区间</div>
              <div className="cssm-match-v cssm-num">
                {layer.bound.heightBottom.toFixed(2)} ~ {layer.bound.heightTop.toFixed(2)}
                <small>m</small>
              </div>
            </div>
          </div>

          {!orderValid && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              title="角度顺序不合法"
              description="每一子层的起始角度必须小于其结束角度，且自上而下依次递减。请调整标红的角度输入。"
            />
          )}

          <h3 className="cssm-drawer-h3">
            分层信息
            <span>点击「入厂登记编号」下拉可为各子层选择对应入厂批次，留空则该子层保持待标记</span>
          </h3>

          <Space style={{ marginBottom: 10 }}>
            <Button
              size="small"
              icon={<PlusOutlined />}
              disabled={count >= MAX_ROWS}
              onClick={() => changeCount(count + 1)}
            >
              增加分层
            </Button>
            <Button size="small" disabled={count <= 2} onClick={() => changeCount(count - 1)}>
              减少分层
            </Button>
            <span className="cssm-hint">
              增减分层数会按角度等分重置初值，最多 {MAX_ROWS} 层 · 分带精度{' '}
              {(geo.BAND_HEIGHT * 100).toFixed(0)} cm
            </span>
          </Space>

          <Table<Row>
            rowKey="key"
            size="small"
            columns={columns}
            dataSource={preview}
            pagination={false}
            scroll={{ x: 1040 }}
          />
        </>
      ) : (
        <Alert type="info" showIcon title="请先在存煤结构视图中选中一个煤层" />
      )}
    </Drawer>
  );
};

export default SplitLayerDrawer;
