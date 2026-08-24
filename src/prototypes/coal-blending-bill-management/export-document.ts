import dayjs from 'dayjs';
import { getSourceType } from './dispatch-document';

export interface ExportBlendDetail {
  id: string;
  sourceType?: 'yard' | 'port';
  yard: string;
  zone: string;
  coalType: string;
  batchNo: string;
  calorific: number;
  volatile: number;
  sulfur: number;
  moisture: number;
  ash: number;
  units: string[];
  bunkers: string[];
}

export interface ExportPlan {
  planNo: string;
  planDate: string;
  planDesc: string;
  clearNode: string;
  notice: string;
  details: ExportBlendDetail[];
}

const BUNKER_GROUPS = [
  {
    key: 'abc',
    bunkers: ['A', 'B', 'C'],
    furnaceLabel: '#1、2 炉',
    bunkerLabel: 'ACD',
    outletTemp: 72.5,
  },
  {
    key: 'ef',
    bunkers: ['E', 'F'],
    furnaceLabel: '#1、2 炉',
    bunkerLabel: 'EF',
    outletTemp: 64,
  },
  {
    key: 'd',
    bunkers: ['D'],
    furnaceLabel: '3# 炉 、1、2炉',
    bunkerLabel: 'D',
    outletTemp: 65,
  },
];

const filterDetailsByGroup = (details: ExportBlendDetail[], bunkers: string[]) =>
  details
    .filter((d) => d.bunkers.some((b) => bunkers.includes(b)))
    .sort((a, b) => a.yard.localeCompare(b.yard) || parseZoneNum(a.zone) - parseZoneNum(b.zone));

const parseZoneNum = (zone: string) => Number(zone.replace(/[^\d]/g, '')) || 0;

const formatYard = (yard: string, row?: ExportBlendDetail) => {
  if (row && getSourceType(row) === 'port') return '在港待卸煤';
  return yard.replace('#', '# ').replace(/(\d)煤场/, '$1 煤场');
};

const formatZoneStack = (zones: string[]) => {
  const nums = zones.map(parseZoneNum).filter((n) => n > 0);
  if (nums.length === 0) return '-';
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? `${min}` : `${min}-${max}`;
};

const formatCoalName = (row: ExportBlendDetail) => {
  if (row.batchNo && row.coalType && row.coalType !== '进口煤') {
    return `${row.batchNo}/${row.coalType}`;
  }
  if (row.batchNo && row.coalType === '进口煤') {
    return `${row.batchNo}/2613`;
  }
  return row.coalType || row.batchNo || '-';
};

const estimateAshFusion = (row: ExportBlendDetail) => {
  if (row.coalType.includes('海通') || row.batchNo.includes('海通')) return '/';
  return 1150;
};

const avgMetric = (rows: ExportBlendDetail[], key: keyof ExportBlendDetail) => {
  const nums = rows.map((r) => Number(r[key]));
  const val = nums.reduce((s, n) => s + n, 0) / nums.length;
  if (key === 'calorific') return Math.round(val).toString();
  return val.toFixed(2);
};

const buildTableRows = (rows: ExportBlendDetail[]) => {
  const groups = new Map<string, ExportBlendDetail[]>();
  rows.forEach((row) => {
    const key = `${formatCoalName(row)}|${row.batchNo}|${row.coalType}`;
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  });

  return Array.from(groups.values()).map((groupRows) => ({
    coalName: formatCoalName(groupRows[0]),
    calorific: avgMetric(groupRows, 'calorific'),
    volatile: avgMetric(groupRows, 'volatile'),
    sulfur: avgMetric(groupRows, 'sulfur'),
    moisture: avgMetric(groupRows, 'moisture'),
    ash: avgMetric(groupRows, 'ash'),
    ashFusion: estimateAshFusion(groupRows[0]),
    stack:
      getSourceType(groupRows[0]) === 'port'
        ? groupRows[0].batchNo || groupRows[0].zone
        : formatZoneStack(groupRows.map((r) => r.zone)),
  }));
};

const buildSectionHeading = (
  rows: ExportBlendDetail[],
  meta: (typeof BUNKER_GROUPS)[number]
) => {
  const yardRows = rows.filter((r) => getSourceType(r) === 'yard');
  const headingRows = yardRows.length > 0 ? yardRows : rows;
  const yard = formatYard(headingRows[0]?.yard || '#1煤场', headingRows[0]);
  const zoneRange =
    getSourceType(headingRows[0]) === 'port'
      ? headingRows[0].batchNo
      : formatZoneStack(headingRows.map((r) => r.zone));
  return `${yard} ${zoneRange} 堆取料机入 ${meta.furnaceLabel}${meta.bunkerLabel} 仓：出口温度: <span class="cbbm-export-temp">${meta.outletTemp}°</span>`;
};

const buildBlendTimeLine = (plan: ExportPlan) => {
  const datePart = dayjs(plan.planDate).format('MM月DD日');
  const shift = plan.clearNode.includes('夜班')
    ? '夜班'
    : plan.clearNode.includes('白班')
      ? '白班'
      : '中班';
  return `掺配时间：${datePart} ${shift}入炉时开始执行。`;
};

const buildNoticeItems = (plan: ExportPlan) => {
  const items: string[] = [];
  if (plan.planDesc.trim()) items.push(plan.planDesc.trim());
  if (plan.notice.trim()) {
    plan.notice
      .split(/[；;。\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => items.push(s));
  }
  if (items.length === 0) {
    items.push(
      '各值长、煤值班员严禁将入炉煤掺配的煤种进错仓。',
      '煤值班员按指令取煤，严禁从非指定区域取煤。',
      '#1、#2煤场13柱附近高温，取用注意防止煤自燃。'
    );
  }
  return items;
};

const EXPORT_STYLES = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px 28px 40px;
    font-family: "SimSun", "Songti SC", serif;
    font-size: 14px;
    color: #000;
    background: #fff;
  }
  .cbbm-export-title {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 18px;
    letter-spacing: 2px;
  }
  .cbbm-export-time {
    margin: 0 0 16px;
    line-height: 1.8;
  }
  .cbbm-export-section {
    margin-bottom: 14px;
  }
  .cbbm-export-section-title {
    margin: 0 0 6px;
    line-height: 1.8;
    font-weight: 600;
  }
  .cbbm-export-temp {
    color: #e60000;
    font-weight: 700;
  }
  .cbbm-export-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    margin-bottom: 4px;
  }
  .cbbm-export-table th,
  .cbbm-export-table td {
    border: 1px solid #000;
    padding: 6px 4px;
    text-align: center;
    font-size: 13px;
    word-break: break-all;
  }
  .cbbm-export-table th {
    font-weight: 600;
  }
  .cbbm-export-notes {
    margin-top: 18px;
    line-height: 1.9;
  }
  .cbbm-export-notes-title {
    font-weight: 700;
    margin-bottom: 4px;
  }
  .cbbm-export-footer {
    margin-top: 28px;
    text-align: right;
    line-height: 2;
    font-size: 15px;
  }
  @media print {
    body { padding: 16px 20px; }
  }
`;

export const buildExportHtml = (plan: ExportPlan) => {
  const sections = BUNKER_GROUPS.map((meta) => {
    const rows = filterDetailsByGroup(plan.details, meta.bunkers);
    if (rows.length === 0) return '';
    const tableRows = buildTableRows(rows);
    const tableBody = tableRows
      .map(
        (r) => `
      <tr>
        <td>${r.coalName}</td>
        <td>${r.calorific}</td>
        <td>${r.volatile}</td>
        <td>${r.sulfur}</td>
        <td>${r.moisture}</td>
        <td>${r.ash}</td>
        <td>${r.ashFusion}</td>
        <td>${r.stack}</td>
      </tr>`
      )
      .join('');

    return `
      <section class="cbbm-export-section">
        <p class="cbbm-export-section-title">${buildSectionHeading(rows, meta)}</p>
        <table class="cbbm-export-table">
          <thead>
            <tr>
              <th>煤种</th>
              <th>低位发热量</th>
              <th>挥发分</th>
              <th>硫分</th>
              <th>全水</th>
              <th>灰分</th>
              <th>灰熔点</th>
              <th>垛位</th>
            </tr>
          </thead>
          <tbody>${tableBody}</tbody>
        </table>
      </section>`;
  }).join('');

  const noticeItems = buildNoticeItems(plan);
  const noticeHtml = noticeItems.map((item, i) => `<div>${i + 1}、${item}</div>`).join('');
  const footerDate = dayjs(plan.planDate).format('YYYY年 MM月 DD日');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>入炉煤掺配方式 - ${plan.planNo}</title>
  <style>${EXPORT_STYLES}</style>
</head>
<body>
  <h1 class="cbbm-export-title">入炉煤掺配方式</h1>
  <p class="cbbm-export-time">${buildBlendTimeLine(plan)}</p>
  ${sections}
  <div class="cbbm-export-notes">
    <div class="cbbm-export-notes-title">注意事项：</div>
    ${noticeHtml}
  </div>
  <div class="cbbm-export-footer">
    <div>发电部</div>
    <div>${footerDate}</div>
  </div>
</body>
</html>`;
};

export const openExportDocument = (plan: ExportPlan) => {
  const html = buildExportHtml(plan);
  const win = window.open('', '_blank');
  if (!win) return false;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  window.setTimeout(() => {
    win.print();
  }, 350);
  return true;
};
