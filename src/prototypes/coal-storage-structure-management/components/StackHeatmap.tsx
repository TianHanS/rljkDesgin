/**
 * 实际堆煤视图
 *
 * 把 20 m 堆煤高度上限划分为 200 个 10 cm 分带，以热力图方块呈现各分区的实际堆煤情况：
 * 纵轴是真实标高，因此煤层厚度直接表现为方块的连续段数，分区堆高差异一眼可比。
 * 三轴：左侧堆煤高度（m）、底部分区编号（增序）、右侧对应的悬臂俯仰角度（°）。
 */

import React, { useMemo } from 'react';
import * as geo from '../geometry';
import { fmt, readableText } from '../data';
import type { ComputedLayer, ComputedZone } from '../model';

const BAND_PX = 2.4;
const PAD_T = 16;
const PLOT_H = geo.BAND_COUNT * BAND_PX;

/** 圆形 36 列用窄列横向滚动；条形 3 列用宽列撑满主区 */
const layoutOf = (zoneCount: number) =>
  zoneCount > 8
    ? { compact: true, colW: 34, axisL: 48, axisR: 58, axisB: 28, labelSize: 8.5, axisSize: 9.5 }
    : { compact: false, colW: 196, axisL: 52, axisR: 62, axisB: 36, labelSize: 11, axisSize: 12 };

interface Props {
  zones: ComputedZone[];
  labelOf: (layerId: string) => string;
  tipOf: (layerId: string) => string;
  selectedLayerId: string | null;
  onSelect: (zoneId: string, layerId: string) => void;
}

interface BandRun {
  layer: ComputedLayer;
  /** 起始分带序号（含） */
  from: number;
  /** 结束分带序号（不含） */
  to: number;
}

/** 把每个分区的煤层切成 10 cm 分带段，供逐块渲染与整层交互 */
const buildRuns = (zone: ComputedZone): BandRun[] => {
  const runs: BandRun[] = [];
  zone.layers.forEach((layer) => {
    const from = Math.round(layer.bound.heightBottom / geo.BAND_HEIGHT);
    const to = Math.min(geo.BAND_COUNT, Math.round(layer.bound.heightTop / geo.BAND_HEIGHT));
    if (to > from) runs.push({ layer, from, to });
  });
  return runs;
};

const StackHeatmap: React.FC<Props> = ({
  zones,
  labelOf,
  tipOf,
  selectedLayerId,
  onSelect,
}) => {
  const g = zones[0]?.geometry;
  const layout = layoutOf(zones.length);
  const { colW, axisL, axisR, axisB, compact, labelSize, axisSize } = layout;
  const width = axisL + zones.length * colW + axisR;
  const height = PAD_T + PLOT_H + axisB;
  const plotBottom = PAD_T + PLOT_H;

  const yOfHeight = (h: number) => plotBottom - (h / geo.BAND_HEIGHT) * BAND_PX;
  const runsByZone = useMemo(() => zones.map((z) => buildRuns(z)), [zones]);

  if (!g) return null;

  const heightTicks = Array.from({ length: 11 }, (_, i) => i * 2);

  return (
    <div className={`cssm-heatmap-wrap${compact ? ' is-compact' : ' is-wide'}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMin meet"
        role="img"
        aria-label={`实际堆煤视图，${zones.length} 个分区，纵轴为 0 至 ${g.maxStackHeight} 米堆煤高度，按 10 厘米分带`}
      >
        {/* 场坪与绘图区 */}
        <rect
          x={axisL}
          y={PAD_T}
          width={zones.length * colW}
          height={PLOT_H}
          fill="#faf9f7"
          stroke="rgba(38,35,32,0.16)"
        />

        {/* 每米一条辅助线，10 cm 粒度由煤层方块本身体现 */}
        {Array.from({ length: g.maxStackHeight }, (_, i) => i + 1).map((m) => (
          <line
            key={`grid-${m}`}
            x1={axisL}
            y1={yOfHeight(m)}
            x2={axisL + zones.length * colW}
            y2={yOfHeight(m)}
            stroke="rgba(38,35,32,0.06)"
          />
        ))}

        {/* 左轴：堆煤高度 m ；右轴：对应悬臂俯仰角度 ° */}
        {heightTicks.map((m) => (
          <g key={`tick-${m}`}>
            <line
              x1={axisL - 5}
              y1={yOfHeight(m)}
              x2={axisL}
              y2={yOfHeight(m)}
              stroke="rgba(38,35,32,0.3)"
            />
            <text x={axisL - 9} y={yOfHeight(m) + 3.4} textAnchor="end" fontSize={9.5} fill="#8b847b">
              {m}
            </text>
            <line
              x1={axisL + zones.length * colW}
              y1={yOfHeight(m)}
              x2={axisL + zones.length * colW + 5}
              y2={yOfHeight(m)}
              stroke="rgba(38,35,32,0.3)"
            />
            <text
              x={axisL + zones.length * colW + 9}
              y={yOfHeight(m) + 3.4}
              fontSize={9.5}
              fill="#8b847b"
            >
              {geo.pitchFromHeight(g, m) >= 0 ? '+' : ''}
              {geo.pitchFromHeight(g, m).toFixed(1)}°
            </text>
          </g>
        ))}
        <text x={axisL - 9} y={PAD_T - 5} textAnchor="end" fontSize={9} fill="#b3aca3">
          堆煤高度 m
        </text>
        <text x={axisL + zones.length * colW + 9} y={PAD_T - 5} fontSize={9} fill="#b3aca3">
          俯仰角度
        </text>

        {/* 分区列 */}
        {zones.map((zone, ci) => {
          const x = axisL + ci * colW;
          const runs = runsByZone[ci];
          return (
            <g key={zone.id}>
              {ci > 0 && (
                <line
                  x1={x}
                  y1={PAD_T}
                  x2={x}
                  y2={plotBottom}
                  stroke="rgba(38,35,32,0.05)"
                />
              )}

              {runs.map((run) => {
                const isUnmarked = run.layer.raw.status === 'unmarked';
                const isActive = run.layer.id === selectedLayerId;
                const yTop = plotBottom - run.to * BAND_PX;
                const runHeight = (run.to - run.from) * BAND_PX;
                const label = labelOf(run.layer.id);

                return (
                  <g
                    key={run.layer.id}
                    className="cssm-hm-layer"
                    tabIndex={0}
                    role="button"
                    aria-label={`${zone.name} 第 ${run.layer.seq} 层，${tipOf(run.layer.id)}`}
                    onClick={() => onSelect(zone.id, run.layer.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(zone.id, run.layer.id);
                      }
                    }}
                  >
                    <title>
                      {`${zone.name} 第 ${run.layer.seq} 层 · ${tipOf(run.layer.id)}
标高 ${run.layer.bound.heightBottom.toFixed(2)} ~ ${run.layer.bound.heightTop.toFixed(
                        2,
                      )} m（层厚 ${run.layer.thickness.toFixed(2)} m · ${run.to - run.from} 个 10 cm 分带）
体积 ${fmt(run.layer.volume)} m³ · 煤量 ${fmt(run.layer.mass)} t
俯仰角 ${run.layer.bound.pitchBottom.toFixed(1)}° ~ ${run.layer.bound.pitchTop.toFixed(1)}°`}
                    </title>

                    {/* 逐个 10 cm 方块；未识别煤层用隔带明暗形成条纹，颜色之外再给一层纹理信号 */}
                    {Array.from({ length: run.to - run.from }, (_, k) => {
                      const band = run.from + k;
                      return (
                        <rect
                          key={band}
                          x={x + 1.5}
                          y={plotBottom - (band + 1) * BAND_PX}
                          width={colW - 3}
                          height={BAND_PX - 0.45}
                          fill={run.layer.color}
                          opacity={isUnmarked && band % 2 === 1 ? 0.6 : 1}
                        />
                      );
                    })}

                    {/* 层顶分界线，使层厚在连续方块中依然可辨 */}
                    <line
                      x1={x + 1.5}
                      y1={yTop}
                      x2={x + colW - 1.5}
                      y2={yTop}
                      stroke="rgba(38,35,32,0.45)"
                      strokeWidth={0.9}
                    />

                    {runHeight >= (compact ? 15 : 18) && label && (
                      <text
                        x={x + colW / 2}
                        y={yTop + runHeight / 2 + (compact ? 3 : 4)}
                        textAnchor="middle"
                        fontSize={labelSize}
                        fontWeight={600}
                        fill={readableText(run.layer.color)}
                      >
                        {label}
                      </text>
                    )}

                    {isActive && (
                      <rect
                        x={x + 1.5}
                        y={yTop}
                        width={colW - 3}
                        height={runHeight}
                        fill="none"
                        stroke="#1677ff"
                        strokeWidth={2}
                      />
                    )}
                  </g>
                );
              })}

              {/* 底轴：分区编号增序 */}
              <text
                x={x + colW / 2}
                y={plotBottom + (compact ? 13 : 16)}
                textAnchor="middle"
                fontSize={compact ? 9.5 : axisSize}
                fontWeight={compact ? (zone.code % 5 === 0 ? 600 : 400) : 600}
                fill={compact && zone.code % 5 !== 0 ? '#8b847b' : '#5b554e'}
              >
                {compact ? zone.code : zone.name}
              </text>
              <text
                x={x + colW / 2}
                y={plotBottom + (compact ? 24 : 30)}
                textAnchor="middle"
                fontSize={compact ? 8 : 10}
                fill="#b3aca3"
              >
                {zone.stackHeight > 0.05
                  ? compact
                    ? zone.stackHeight.toFixed(1)
                    : `${zone.stackHeight.toFixed(1)} m`
                  : '—'}
              </text>
            </g>
          );
        })}

        <line
          x1={axisL}
          y1={plotBottom}
          x2={axisL + zones.length * colW}
          y2={plotBottom}
          stroke="rgba(38,35,32,0.34)"
          strokeWidth={1.2}
        />
        <text
          x={axisL - 9}
          y={plotBottom + (compact ? 13 : 16)}
          textAnchor="end"
          fontSize={compact ? 9 : 10}
          fill="#b3aca3"
        >
          分区
        </text>
        <text
          x={axisL - 9}
          y={plotBottom + (compact ? 24 : 30)}
          textAnchor="end"
          fontSize={compact ? 8 : 9}
          fill="#b3aca3"
        >
          {compact ? '堆高 m' : '堆高'}
        </text>
      </svg>
    </div>
  );
};

export default StackHeatmap;
