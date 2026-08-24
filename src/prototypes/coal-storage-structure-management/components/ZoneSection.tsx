/**
 * 分区存煤剖面
 *
 * 以垂直于轨道的剖面表达一个分区：挡煤墙轮廓、场坪、等腰梯形煤堆，
 * 煤层分界线按反算出的臂架俯仰角倾斜绘制并被煤堆轮廓自然裁剪。
 * 左侧为堆高刻度（m），右侧为分界俯仰角标注（°）。
 */

import React from 'react';
import * as geo from '../geometry';
import { readableText } from '../data';
import type { ComputedZone } from '../model';

const VB_W = 198;
const VB_H = 242;
const GROUND_Y = 224;
const AXIS_TOP_M = 22;
const PY = (GROUND_Y - 16) / AXIS_TOP_M;
const BASE_LEFT = 31;
const BASE_RIGHT = 155;
const CX = (BASE_LEFT + BASE_RIGHT) / 2;
const HALF_BASE = (BASE_RIGHT - BASE_LEFT) / 2;

const yOf = (h: number) => GROUND_Y - h * PY;

interface Props {
  zone: ComputedZone;
  labelOf: (layerId: string) => string;
  selectedLayerId: string | null;
  onSelect: (zoneId: string, layerId: string) => void;
}

const ZoneSection: React.FC<Props> = ({ zone, labelOf, selectedLayerId, onSelect }) => {
  const g = zone.geometry;
  const pxPerMx = (BASE_RIGHT - BASE_LEFT) / g.baseWidth;
  const halfWidthAt = (h: number) => (geo.crestWidth(g, h) / 2) * pxPerMx;
  const hatchId = `cssm-hatch-${zone.id}`;

  const hTotal = zone.stackHeight;
  const yCrest = yOf(hTotal);
  const halfCrest = halfWidthAt(hTotal);
  const contour: geo.Point[] = [
    [CX - HALF_BASE, GROUND_Y],
    [CX + HALF_BASE, GROUND_Y],
    [CX + halfCrest, yCrest],
    [CX - halfCrest, yCrest],
  ];

  const wallTop = yOf(g.wallHeight);
  const limitY = yOf(g.maxStackHeight);

  // 自上而下依次标注分界俯仰角，间距不足时跳过，避免刻度互相压叠
  const annotations: { y: number; text: string }[] = [];
  let lastY = -99;
  for (let i = zone.layers.length - 1; i >= 0; i -= 1) {
    const l = zone.layers[i];
    const y = yOf(l.bound.heightTop);
    if (y - lastY > 10) {
      annotations.push({
        y,
        text: `${l.bound.pitchTop >= 0 ? '+' : ''}${l.bound.pitchTop.toFixed(1)}°`,
      });
      lastY = y;
    }
  }

  return (
    <svg
      width={VB_W}
      height={VB_H}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label={`${zone.name} 存煤剖面，堆煤高度 ${hTotal.toFixed(1)} 米，共 ${zone.layers.length} 个煤层`}
    >
      <defs>
        <pattern
          id={hatchId}
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="9" stroke="rgba(255,255,255,0.5)" strokeWidth="3.4" />
        </pattern>
      </defs>

      {/* 堆高刻度 */}
      {[0, 5, 10, 15, 20].map((m) => (
        <g key={m}>
          <line
            x1={BASE_LEFT - 8}
            y1={yOf(m)}
            x2={BASE_RIGHT + 8}
            y2={yOf(m)}
            stroke="rgba(38,35,32,0.07)"
            strokeWidth={1}
          />
          <text x={16} y={yOf(m) + 3} textAnchor="end" fontSize={8} fill="#b3aca3">
            {m}
          </text>
        </g>
      ))}
      <text x={16} y={yOf(20) - 8} textAnchor="end" fontSize={7.5} fill="#b3aca3">
        m
      </text>

      {/* 允许最大堆高 */}
      <line
        x1={BASE_LEFT - 6}
        y1={limitY}
        x2={BASE_RIGHT + 6}
        y2={limitY}
        stroke="#b8790a"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.75}
      />

      {/* 挡煤墙与场坪 */}
      <rect x={23} y={wallTop} width={8} height={GROUND_Y - wallTop} fill="#cbc6bd" />
      <rect x={23} y={wallTop} width={8} height={3} fill="#a9a39a" />
      <rect x={BASE_RIGHT} y={wallTop} width={8} height={GROUND_Y - wallTop} fill="#cbc6bd" />
      <rect x={BASE_RIGHT} y={wallTop} width={8} height={3} fill="#a9a39a" />
      <rect x={16} y={GROUND_Y} width={VB_W - 24} height={7} fill="#e2ded7" />
      <line
        x1={16}
        y1={GROUND_Y}
        x2={VB_W - 8}
        y2={GROUND_Y}
        stroke="rgba(38,35,32,0.34)"
        strokeWidth={1.2}
      />

      {zone.layers.length === 0 ? (
        <>
          <polygon
            points={geo.toPoints([
              [CX - HALF_BASE, GROUND_Y],
              [CX + HALF_BASE, GROUND_Y],
              [CX + halfWidthAt(4), yOf(4)],
              [CX - halfWidthAt(4), yOf(4)],
            ])}
            fill="none"
            stroke="rgba(38,35,32,0.2)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text x={CX} y={GROUND_Y - 14} textAnchor="middle" fontSize={9.5} fill="#b3aca3">
            空区
          </text>
        </>
      ) : (
        <>
          {zone.layers.map((layer, i) => {
            const isTop = i === zone.layers.length - 1;
            const yBottomLine = i === 0 ? GROUND_Y + 2 : yOf(layer.bound.heightBottom);
            const slopeBottom = i === 0 ? 0 : geo.pitchToSlope(layer.bound.pitchBottom);
            const yTopLine = yOf(layer.bound.heightTop);
            const slopeTop = geo.pitchToSlope(layer.bound.pitchTop);

            let poly = geo.clipHalfPlane(
              contour,
              (p) => yBottomLine + slopeBottom * (p[0] - CX) - p[1],
            );
            if (!isTop) {
              poly = geo.clipHalfPlane(poly, (p) => p[1] - (yTopLine + slopeTop * (p[0] - CX)));
            }
            if (poly.length < 3) return null;

            const ys = poly.map((p) => p[1]);
            const pixelThickness = Math.max(...ys) - Math.min(...ys);
            const centroid: geo.Point = [
              poly.reduce((s, p) => s + p[0], 0) / poly.length,
              poly.reduce((s, p) => s + p[1], 0) / poly.length,
            ];
            const isUnmarked = layer.raw.status === 'unmarked';
            const isActive = layer.id === selectedLayerId;
            const label = labelOf(layer.id);

            return (
              <g
                key={layer.id}
                className="cssm-zone-layer"
                tabIndex={0}
                role="button"
                aria-label={`${zone.name} 第 ${layer.seq} 层，${
                  isUnmarked ? '待标记批次' : layer.raw.batchNo
                }，${label}`}
                onClick={() => onSelect(zone.id, layer.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(zone.id, layer.id);
                  }
                }}
              >
                <title>
                  {`${zone.name} 第 ${layer.seq} 层 · ${
                    isUnmarked ? '待标记批次' : `${layer.raw.batchNo} / ${layer.raw.shipName}`
                  }
体积 ${Math.round(layer.volume).toLocaleString('zh-CN')} m³ · 煤量 ${Math.round(
                    layer.mass,
                  ).toLocaleString('zh-CN')} t
标高 ${layer.bound.heightBottom.toFixed(1)}~${layer.bound.heightTop.toFixed(
                    1,
                  )} m · 俯仰角 ${layer.bound.pitchBottom.toFixed(
                    1,
                  )}°~${layer.bound.pitchTop.toFixed(1)}°`}
                </title>
                <polygon points={geo.toPoints(poly)} fill={layer.color} />
                {isUnmarked && <polygon points={geo.toPoints(poly)} fill={`url(#${hatchId})`} />}
                {isActive && (
                  <polygon
                    points={geo.toPoints(poly)}
                    fill="none"
                    stroke="#1677ff"
                    strokeWidth={2}
                  />
                )}
                {pixelThickness >= 13 && label && (
                  <text
                    x={centroid[0]}
                    y={centroid[1] + 3.2}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={600}
                    fill={readableText(layer.color)}
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}

          {/* 煤层分界线：按俯仰角倾斜 */}
          {zone.layers.slice(0, -1).map((layer) => {
            const h = layer.bound.heightTop;
            const half = Math.max(3, halfWidthAt(h) * 0.99);
            const s = geo.pitchToSlope(layer.bound.pitchTop);
            const y = yOf(h);
            return (
              <line
                key={`b-${layer.id}`}
                x1={CX - half}
                y1={y - s * half}
                x2={CX + half}
                y2={y + s * half}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={0.9}
              />
            );
          })}

          <polygon
            points={geo.toPoints(contour)}
            fill="none"
            stroke="rgba(38,35,32,0.42)"
            strokeWidth={1}
          />

          {/* 分界俯仰角标注 */}
          {annotations.map((a) => (
            <g key={a.text + a.y}>
              <line
                x1={BASE_RIGHT + 8}
                y1={a.y}
                x2={BASE_RIGHT + 12}
                y2={a.y}
                stroke="rgba(38,35,32,0.24)"
                strokeWidth={1}
              />
              <text x={BASE_RIGHT + 14} y={a.y + 3} fontSize={8} fill="#8b847b">
                {a.text}
              </text>
            </g>
          ))}
        </>
      )}
    </svg>
  );
};

export default ZoneSection;
