/**
 * 存煤结构热力块状表格
 *
 * 列为分区（按分区序号从小到大自左向右），行为煤层层序（自下而上，底层在最下一行）。
 * 格内背景色沿用「色族=煤种、色阶=批次」规则，格内下方细条按层厚相对全场最大堆高渲染，
 * 使颜色之外仍有可读的量化信号（兼顾色盲用户）。
 */

import React from 'react';
import { fmt, readableText } from '../data';
import type { ComputedZone } from '../model';

interface Props {
  zones: ComputedZone[];
  labelOf: (layerId: string) => string;
  selectedLayerId: string | null;
  onSelect: (zoneId: string, layerId: string) => void;
}

const LayerMatrix: React.FC<Props> = ({ zones, labelOf, selectedLayerId, onSelect }) => {
  const maxLayers = Math.max(1, ...zones.map((z) => z.layers.length));
  const maxHeight = Math.max(1, ...zones.map((z) => z.stackHeight));

  return (
    <div className="cssm-matrix-wrap">
      <div
        className="cssm-matrix"
        style={{ gridTemplateColumns: `84px repeat(${zones.length}, minmax(98px, 1fr))` }}
      >
        <div className="cssm-mcell is-head">层序 / 分区</div>
        {zones.map((z) => (
          <div key={`h-${z.id}`} className="cssm-mcell is-head">
            {z.name}
          </div>
        ))}

        {Array.from({ length: maxLayers }, (_, row) => {
          const seq = maxLayers - row;
          return (
            <React.Fragment key={`r-${seq}`}>
              <div className="cssm-mcell is-rowhead">
                <span>第 {seq} 层</span>
                <span style={{ fontSize: 10, fontWeight: 400, color: '#b3aca3' }}>
                  {seq === 1 ? '贴地底层' : ''}
                </span>
              </div>
              {zones.map((z) => {
                const layer = z.layers.find((l) => l.seq === seq);
                if (!layer) {
                  return <div key={`${z.id}-${seq}`} className="cssm-mcell is-void" />;
                }
                const fg = readableText(layer.color);
                const active = layer.id === selectedLayerId;
                const unmarked = layer.raw.status === 'unmarked';
                return (
                  <div
                    key={`${z.id}-${seq}`}
                    className={[
                      'cssm-mcell',
                      'is-layer',
                      active ? 'is-active' : '',
                      unmarked ? 'is-unmarked' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ background: layer.color, color: fg }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${z.name} 第 ${seq} 层，${
                      unmarked ? '待标记批次' : layer.raw.batchNo
                    }`}
                    title={`${z.name} 第 ${seq} 层 · ${
                      unmarked ? '待标记批次' : `${layer.raw.batchNo} / ${layer.raw.shipName}`
                    }\n层厚 ${layer.thickness.toFixed(1)} m · 体积 ${fmt(
                      layer.volume,
                    )} m³ · 煤量 ${fmt(layer.mass)} t`}
                    onClick={() => onSelect(z.id, layer.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(z.id, layer.id);
                      }
                    }}
                  >
                    <span className="cssm-mcell-v cssm-num">{labelOf(layer.id)}</span>
                    <span className="cssm-mcell-h">
                      <i style={{ width: `${(layer.thickness / maxHeight) * 100}%` }} />
                    </span>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        <div className="cssm-mcell is-total">盘煤体积 m³</div>
        {zones.map((z) => (
          <div key={`sv-${z.id}`} className="cssm-mcell is-total cssm-num">
            {fmt(z.raw.surveyVolume)}
          </div>
        ))}

        <div className="cssm-mcell is-total">存煤煤量 t</div>
        {zones.map((z) => (
          <div key={`m-${z.id}`} className="cssm-mcell is-total cssm-num">
            {fmt(z.totalMass)}
          </div>
        ))}

        <div className="cssm-mcell is-total">堆煤高度 m</div>
        {zones.map((z) => (
          <div key={`h2-${z.id}`} className="cssm-mcell is-total cssm-num">
            {z.stackHeight.toFixed(1)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayerMatrix;
