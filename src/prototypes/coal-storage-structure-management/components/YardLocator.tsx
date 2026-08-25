/**
 * 圆形煤场分区定位盘
 *
 * 实际堆煤视图把 36 个分区沿横向展开后，会丢失「这是一圈」的空间关系。
 * 这个定位盘按真实方位还原 36 个 10° 扇区：扇区明度表示堆煤高度占上限的比例，
 * 含未识别煤层的扇区加异常红描边。点击扇区可定位到对应分区。
 */

import React from 'react';
import { UNMARKED_COLOR } from '../data';
import type { ComputedZone } from '../model';

const SIZE = 188;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUT = 84;
const R_IN = 26;

const polar = (radius: number, deg: number): [number, number] => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
};

const sectorPath = (from: number, to: number) => {
  const [x1, y1] = polar(R_IN, from);
  const [x2, y2] = polar(R_OUT, from);
  const [x3, y3] = polar(R_OUT, to);
  const [x4, y4] = polar(R_IN, to);
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `L ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `A ${R_OUT} ${R_OUT} 0 0 1 ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `L ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    `A ${R_IN} ${R_IN} 0 0 0 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    'Z',
  ].join(' ');
};

/** 空区到满堆的煤色明度渐变 */
const fillFor = (ratio: number) => {
  if (ratio <= 0.001) return '#f5f3f0';
  const stops = ['#ded7cd', '#bcae9d', '#8d7c68', '#5f5344', '#3a332c'];
  return stops[Math.min(stops.length - 1, Math.floor(ratio * stops.length))];
};

interface Props {
  zones: ComputedZone[];
  maxHeight: number;
  selectedZoneId: string | null;
  onSelect: (zoneId: string) => void;
}

const YardLocator: React.FC<Props> = ({ zones, maxHeight, selectedZoneId, onSelect }) => (
  <div className="cssm-locator">
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`圆形煤场分区定位盘，${zones.length} 个分区按方位排列，明度表示堆煤高度`}
    >
      {zones.map((zone, i) => {
        const from = i * (360 / zones.length);
        const to = from + 360 / zones.length;
        const ratio = Math.min(1, zone.stackHeight / maxHeight);
        const active = zone.id === selectedZoneId;
        return (
          <path
            key={zone.id}
            className="cssm-locator-sector"
            d={sectorPath(from, to)}
            fill={fillFor(ratio)}
            stroke={
              active ? '#1677ff' : zone.unmarkedCount > 0 ? UNMARKED_COLOR : 'rgba(255,255,255,0.9)'
            }
            strokeWidth={active ? 2.2 : zone.unmarkedCount > 0 ? 1.6 : 0.8}
            tabIndex={0}
            role="button"
            aria-label={`${zone.name}，堆煤高度 ${zone.stackHeight.toFixed(1)} 米${
              zone.unmarkedCount > 0 ? `，含 ${zone.unmarkedCount} 个待标记煤层` : ''
            }`}
            onClick={() => onSelect(zone.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(zone.id);
              }
            }}
          >
            <title>
              {`${zone.name} · 堆高 ${zone.stackHeight.toFixed(1)} m${
                zone.unmarkedCount > 0 ? ` · ${zone.unmarkedCount} 层待标记` : ''
              }`}
            </title>
          </path>
        );
      })}

      {/* 中心堆料塔 */}
      <circle cx={CX} cy={CY} r={R_IN - 4} fill="#efece7" stroke="rgba(38,35,32,0.2)" />
      <text x={CX} y={CY - 1} textAnchor="middle" fontSize={9} fill="#8b847b">
        堆料塔
      </text>
      <text x={CX} y={CY + 10} textAnchor="middle" fontSize={8} fill="#b3aca3">
        Φ130 m
      </text>

      {/* 方位标注：1 区在正上方，顺时针增序 */}
      {[1, 10, 19, 28].map((code) => {
        const i = code - 1;
        const mid = i * (360 / zones.length) + 360 / zones.length / 2;
        const [tx, ty] = polar(R_OUT + 9, mid);
        return (
          <text
            key={code}
            x={tx}
            y={ty + 3}
            textAnchor="middle"
            fontSize={8.5}
            fontWeight={600}
            fill="#8b847b"
          >
            {code}
          </text>
        );
      })}
    </svg>
    <div className="cssm-locator-note">
      分区按方位顺时针增序，1 区在正上方；明度越深堆煤越高，红边扇区含待标记煤层
    </div>
  </div>
);

export default YardLocator;
