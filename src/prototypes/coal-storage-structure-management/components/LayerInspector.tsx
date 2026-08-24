/**
 * 煤层检视面板
 *
 * 常驻在结构视图右侧，选中煤层后在不遮挡可视化上下文的前提下呈现
 * 体积、煤量、密度、标高区间、分界俯仰角与煤质，并就地提供标记、调整、合并操作。
 */

import React from 'react';
import { Alert, Button, Tag } from 'antd';
import {
  EditOutlined,
  MergeCellsOutlined,
  SlidersOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { COAL_TYPES, fmt } from '../data';
import type { ComputedLayer, ComputedZone } from '../model';

interface Props {
  yardName: string;
  zone: ComputedZone | null;
  layer: ComputedLayer | null;
  unmarkedCount: number;
  onMark: () => void;
  onResize: () => void;
  onMerge: (direction: 'up' | 'down') => void;
  onLocateUnmarked: () => void;
}

const Cell: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div className="cssm-ins-cell">
    <div className="cssm-ins-k">{k}</div>
    <div className="cssm-ins-v cssm-num">{v}</div>
  </div>
);

const LayerInspector: React.FC<Props> = ({
  yardName,
  zone,
  layer,
  unmarkedCount,
  onMark,
  onResize,
  onMerge,
  onLocateUnmarked,
}) => {
  if (!zone || !layer) {
    return (
      <section className="cssm-panel cssm-inspector">
        <div className="cssm-panel-hd">
          <h2>煤层检视</h2>
        </div>
        <div className="cssm-ins-empty">
          <div className="cssm-ins-empty-art" aria-hidden="true">
            <i style={{ height: '38%' }} />
            <i style={{ height: '66%' }} />
            <i style={{ height: '100%' }} />
            <i style={{ height: '54%' }} />
            <i style={{ height: '78%' }} />
          </div>
          <p>在剖面或热力格图中点选任一煤层，查看其体积、煤量、煤质与分界俯仰角。</p>
          <p>煤层的标记、煤量调整与相邻层合并均在此面板内完成。</p>
          {unmarkedCount > 0 && (
            <Button
              size="small"
              danger
              style={{ marginTop: 14 }}
              icon={<TagOutlined />}
              onClick={onLocateUnmarked}
            >
              定位 {unmarkedCount} 个待标记煤层
            </Button>
          )}
        </div>
      </section>
    );
  }

  const unmarked = layer.raw.status === 'unmarked';
  const quality = layer.raw.quality;
  const isTop = layer.seq === zone.layers.length;

  return (
    <section className="cssm-panel cssm-inspector">
      <div className="cssm-panel-hd">
        <h2>煤层检视</h2>
        <Tag color={unmarked ? 'volcano' : 'blue'} style={{ marginInlineEnd: 0 }}>
          {unmarked ? '待标记批次' : '已标记'}
        </Tag>
      </div>

      <div className="cssm-ins-swatch">
        <span
          className={`cssm-ins-chip${unmarked ? ' is-unmarked' : ''}`}
          style={{ background: layer.color }}
          aria-hidden="true"
        />
        <div>
          <div className="cssm-ins-title">
            {yardName} · {zone.name} · 第 {layer.seq} 层
            {isTop && <span className="cssm-ins-sub">（顶层）</span>}
          </div>
          <div className="cssm-ins-sub">
            {unmarked
              ? '批次未识别，煤量按默认密度估算'
              : `${layer.raw.batchNo} · ${layer.raw.shipName} · ${layer.raw.voyage}`}
          </div>
        </div>
      </div>

      {unmarked && (
        <div style={{ padding: '10px 14px 0' }}>
          <Alert
            type="warning"
            showIcon
            title="该煤层未识别存煤批次"
            description="盘煤体积增量与周期内接卸批次的匹配密度超出合理区间，系统仅记录体积与估算煤量，请核对接卸台账后手动标记。"
            style={{ fontSize: 12 }}
          />
        </div>
      )}

      <div className="cssm-ins-grid">
        <Cell
          k="煤种"
          v={
            unmarked ? (
              <span style={{ color: '#e8590c' }}>待标记</span>
            ) : (
              COAL_TYPES[layer.raw.coalType]?.name
            )
          }
        />
        <Cell k="堆煤日期" v={layer.raw.stackedAt} />
        <Cell
          k="煤层体积"
          v={
            <>
              {fmt(layer.volume)}
              <small>m³</small>
            </>
          }
        />
        <Cell
          k={unmarked ? '估算煤量' : '存煤煤量'}
          v={
            <>
              {fmt(layer.mass)}
              <small>t</small>
            </>
          }
        />
        <Cell
          k="堆积密度"
          v={
            <>
              {layer.raw.density.toFixed(3)}
              <small>t/m³</small>
            </>
          }
        />
        <Cell
          k="层厚"
          v={
            <>
              {layer.thickness.toFixed(2)}
              <small>m</small>
            </>
          }
        />
        <Cell
          k="标高区间"
          v={
            <>
              {layer.bound.heightBottom.toFixed(1)} ~ {layer.bound.heightTop.toFixed(1)}
              <small>m</small>
            </>
          }
        />
        <Cell
          k="分界俯仰角"
          v={
            <>
              {layer.bound.pitchBottom.toFixed(1)}° ~ {layer.bound.pitchTop.toFixed(1)}°
            </>
          }
        />
      </div>

      <div className="cssm-ins-quality">
        {quality ? (
          <>
            <div>
              <span>热值 kcal/kg</span>
              <b className="cssm-num">{fmt(quality.cv)}</b>
            </div>
            <div>
              <span>硫分 %</span>
              <b className="cssm-num">{quality.sulfur.toFixed(2)}</b>
            </div>
            <div>
              <span>灰分 %</span>
              <b className="cssm-num">{quality.ash.toFixed(1)}</b>
            </div>
            <div>
              <span>挥发分 %</span>
              <b className="cssm-num">{quality.volatile.toFixed(1)}</b>
            </div>
            <div>
              <span>水分 %</span>
              <b className="cssm-num">{quality.moisture.toFixed(1)}</b>
            </div>
          </>
        ) : (
          <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#8b847b' }}>
            标记存煤批次后自动带入该批次化验煤质
          </div>
        )}
      </div>

      <div className="cssm-ins-actions">
        <Button
          type={unmarked ? 'primary' : 'default'}
          danger={unmarked}
          icon={unmarked ? <TagOutlined /> : <EditOutlined />}
          onClick={onMark}
          block
        >
          {unmarked ? '标记存煤批次' : '更改批次与煤质'}
        </Button>
        <Button icon={<SlidersOutlined />} onClick={onResize} block>
          调整煤量 / 起始俯仰角
        </Button>
        <div className="cssm-ins-pair">
          <Button
            icon={<MergeCellsOutlined />}
            disabled={layer.seq === 1}
            onClick={() => onMerge('down')}
          >
            合并下层
          </Button>
          <Button
            icon={<MergeCellsOutlined />}
            disabled={isTop}
            onClick={() => onMerge('up')}
          >
            合并上层
          </Button>
        </div>
        <div className="cssm-hint">
          合并后保留本层批次归属，密度按体积加权重算；调整煤量时差额优先与相邻上层借还，
          以保持分区总体积不超过盘煤体积上限。
        </div>
      </div>
    </section>
  );
};

export default LayerInspector;
