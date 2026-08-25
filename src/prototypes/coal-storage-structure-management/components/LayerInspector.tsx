/**
 * 煤层检视面板
 *
 * 常驻在存煤结构视图右侧，选中煤层后在不遮挡可视化上下文的前提下呈现
 * 入厂登记编号、体积、煤量、密度、标高区间、起始/结束俯仰角与煤质，
 * 并就地提供标记、拆分、合并上层/下层、删除操作。
 */

import React from 'react';
import { Alert, Button, Tag, Tooltip } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  MergeCellsOutlined,
  SplitCellsOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { COAL_TYPES, fmt } from '../data';
import type { ComputedLayer, ComputedZone } from '../model';

interface Props {
  yardName: string;
  zone: ComputedZone | null;
  layer: ComputedLayer | null;
  unmarkedLayers: number;
  onMark: () => void;
  onSplit: () => void;
  onMerge: (direction: 'up' | 'down') => void;
  onDelete: () => void;
  onLocateUnmarked: () => void;
}

const Cell: React.FC<{ k: string; v: React.ReactNode; wide?: boolean }> = ({ k, v, wide }) => (
  <div className={`cssm-ins-cell${wide ? ' is-wide' : ''}`}>
    <div className="cssm-ins-k">{k}</div>
    <div className="cssm-ins-v cssm-num">{v}</div>
  </div>
);

const LayerInspector: React.FC<Props> = ({
  yardName,
  zone,
  layer,
  unmarkedLayers,
  onMark,
  onSplit,
  onMerge,
  onDelete,
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
          <p>在实际堆煤视图或分层视图中点选任一煤层，查看其体积、煤量、煤质与俯仰角区间。</p>
          <p>煤层的标记、拆分、合并与删除均在此面板内完成。</p>
          {unmarkedLayers > 0 && (
            <Button
              size="small"
              danger
              style={{ marginTop: 14 }}
              icon={<TagOutlined />}
              onClick={onLocateUnmarked}
            >
              定位 {unmarkedLayers} 个待标记煤层
            </Button>
          )}
        </div>
      </section>
    );
  }

  const unmarked = layer.raw.status === 'unmarked';
  const quality = layer.raw.quality;
  const isTop = layer.seq === zone.layers.length;
  const isBottom = layer.seq === 1;

  return (
    <section className="cssm-panel cssm-inspector">
      <div className="cssm-panel-hd">
        <h2>煤层检视</h2>
        <Tag color={unmarked ? 'red' : 'blue'} style={{ marginInlineEnd: 0 }}>
          {unmarked ? '待标记' : '已标记'}
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
            {isTop && <span className="cssm-ins-sub">（表层）</span>}
          </div>
          <div className="cssm-ins-sub">
            {unmarked
              ? '入厂批次未识别，煤量按默认计算密度估算'
              : `${layer.raw.shipName} · ${layer.raw.voyage}`}
          </div>
        </div>
      </div>

      {unmarked && (
        <div style={{ padding: '10px 14px 0' }}>
          <Alert
            type="error"
            showIcon
            title="该煤层未识别入厂批次"
            description="存在实际煤量体积但批次归属不明，系统仅记录体积与估算煤量。请核对入厂登记台账后标记，或通过分层拆分逐层指定入厂登记编号。"
            style={{ fontSize: 12 }}
          />
        </div>
      )}

      <div className="cssm-ins-grid">
        <Cell
          k="入厂登记编号"
          v={
            unmarked ? (
              <span style={{ color: '#cf1322' }}>待标记</span>
            ) : (
              <span className="cssm-ins-reg">{layer.raw.regNo}</span>
            )
          }
          wide
        />
        <Cell
          k="库存煤种"
          v={unmarked ? '—' : COAL_TYPES[layer.raw.coalType]?.name}
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
          k={unmarked ? '估算煤量' : '存煤量'}
          v={
            <>
              {fmt(layer.mass)}
              <small>t</small>
            </>
          }
        />
        <Cell
          k="计算密度"
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
              {layer.bound.heightBottom.toFixed(2)} ~ {layer.bound.heightTop.toFixed(2)}
              <small>m</small>
            </>
          }
        />
        <Cell
          k="起始 / 结束角度"
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
            标记入厂批次后自动带入该批次化验煤质
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
          {unmarked ? '标记入厂批次' : '更改入厂批次与煤质'}
        </Button>
        <Button icon={<SplitCellsOutlined />} onClick={onSplit} block>
          分层拆分
        </Button>
        <div className="cssm-ins-pair">
          <Tooltip title={isBottom ? '底层煤层下方无相邻煤层' : ''}>
            <Button
              icon={<MergeCellsOutlined />}
              disabled={isBottom}
              onClick={() => onMerge('down')}
              block
            >
              合并下层
            </Button>
          </Tooltip>
          <Tooltip title={isTop ? '表层煤层上方无相邻煤层' : ''}>
            <Button
              icon={<MergeCellsOutlined />}
              disabled={isTop}
              onClick={() => onMerge('up')}
              block
            >
              合并上层
            </Button>
          </Tooltip>
        </div>
        <Tooltip
          title={
            isTop
              ? ''
              : '非表层煤不可直接删除：其上方仍压覆着煤层，直接删除会使上层煤悬空。请先出库或合并处理表层煤。'
          }
        >
          <Button danger icon={<DeleteOutlined />} disabled={!isTop} onClick={onDelete} block>
            删除煤层
          </Button>
        </Tooltip>
        <div className="cssm-hint">
          合并后保留本层批次归属，计算密度按体积加权重算；拆分与合并均按几何关系重算各层俯仰夹角。
        </div>
      </div>
    </section>
  );
};

export default LayerInspector;
