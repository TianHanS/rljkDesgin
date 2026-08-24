/**
 * @name 配煤单查看
 * @mode axure
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /rules/design-guide.md
 * - 用户提供配煤单主表 / subList 字段说明与列表下半区截图
 */
import React, { useMemo, useState } from 'react';
import { Button, ConfigProvider, Drawer, Table } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import type { ColumnsType } from 'antd/es/table';
import './style.css';

interface BlendingSubRow {
  id: string;
  loadPlanId: string;
  mcBunkerName: string;
  coalYardName: string;
  coalAreaName: string;
  coalTypeName: string;
  weight: string;
  calorific: string;
  stAd: string;
  ad: string;
  mt: string;
  vad: string;
  price: string;
}

interface BlendingPlan {
  id: string;
  machineName: string;
  planName: string;
  planNo: string;
  planData: string;
  creatorId: string;
  creatorName: string;
  startData: string;
  creatorTime: string;
  subList: BlendingSubRow[];
}

type MatrixRow = {
  key: string;
  label: string;
  values: Record<string, string>;
};

const formatPickup = (yard: string, area: string) => {
  const y = (yard || '').trim();
  const a = (area || '').trim();
  if (!y && !a) return '—';
  if (!y) return a;
  if (!a) return y;
  // 展示接近截图：1场2_13
  const yardLabel = y.replace(/^0+/, '') || y;
  return `${yardLabel}场${a.replace(/-/g, '_')}`;
};

const MOCK_PLAN: BlendingPlan = {
  id: 'plan-20260811-01',
  machineName: '1号机组',
  planName: '1号机组',
  planNo: 'GXSZ-2026081101',
  planData: '2026-08-11',
  creatorId: 'u-tian',
  creatorName: '田略',
  startData: '2026-08-10 10:20:20',
  creatorTime: '2026-08-10 09:25:20',
  subList: ['A', 'B', 'C', 'D', 'E', 'F'].map((bunker, index) => ({
    id: `sub-${bunker}`,
    loadPlanId: 'plan-20260811-01',
    mcBunkerName: bunker,
    coalYardName: '01',
    coalAreaName: index % 2 === 0 ? '2-13' : '2-12',
    coalTypeName: '外购煤/外购煤',
    weight: '1:1',
    calorific: '4998',
    stAd: '0.45',
    ad: '23.8',
    mt: '12.3',
    vad: '27.65',
    price: '680',
  })),
};

const ROW_DEFS: { key: string; label: string; pick: (s: BlendingSubRow) => string }[] = [
  { key: 'coalType', label: '煤种', pick: (s) => s.coalTypeName || '—' },
  {
    key: 'pickup',
    label: '取煤位置',
    pick: (s) => formatPickup(s.coalYardName, s.coalAreaName),
  },
  { key: 'calorific', label: '热值 kcal/kg', pick: (s) => s.calorific || '—' },
  { key: 'stAd', label: '硫分 %', pick: (s) => s.stAd || '—' },
  { key: 'ad', label: '灰分 %', pick: (s) => s.ad || '—' },
  { key: 'mt', label: '水分 %', pick: (s) => s.mt || '—' },
  { key: 'vad', label: '挥发分 %', pick: (s) => s.vad || '—' },
  { key: 'price', label: '标单', pick: (s) => s.price || '—' },
];

const Component: React.FC = () => {
  const [open, setOpen] = useState(true);
  const plan = MOCK_PLAN;

  const bunkers = useMemo(
    () => plan.subList.map((s) => s.mcBunkerName),
    [plan.subList],
  );

  const matrixRows = useMemo<MatrixRow[]>(() => {
    return ROW_DEFS.map((def) => {
      const values: Record<string, string> = {};
      plan.subList.forEach((s) => {
        values[s.mcBunkerName] = def.pick(s);
      });
      return { key: def.key, label: def.label, values };
    });
  }, [plan.subList]);

  const columns: ColumnsType<MatrixRow> = useMemo(() => {
    const bunkerCols: ColumnsType<MatrixRow> = bunkers.map((name) => ({
      title: name,
      key: `bunker-${name}`,
      align: 'center',
      width: 128,
      render: (_v, row) => (
        <span className={row.key === 'calorific' || row.key === 'price' ? 'cbpv-num' : undefined}>
          {row.values[name] || '—'}
        </span>
      ),
    }));

    return [
      {
        title: plan.machineName,
        dataIndex: 'label',
        key: 'label',
        fixed: 'left',
        width: 128,
        className: 'cbpv-row-label',
        render: (v: string) => <span className="cbpv-row-label-text">{v}</span>,
      },
      ...bunkerCols,
    ];
  }, [bunkers, plan.machineName]);

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <div className="cbpv-page">
        <header className="cbpv-page-hd">
          <div>
            <h1>配煤单查看</h1>
            <p>进入菜单默认打开查看抽屉；关闭后可再次打开示例方案</p>
          </div>
          <Button type="primary" icon={<EyeOutlined />} onClick={() => setOpen(true)}>
            查看配煤单
          </Button>
        </header>

        <Drawer
          title="配煤单查看"
          open={open}
          onClose={() => setOpen(false)}
          width="min(1080px, 96vw)"
          destroyOnHidden={false}
          styles={{ body: { paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 16 } }}
          footer={
            <div className="cbpv-footer">
              <span className="cbpv-footer-hint">只读查看 · 方案编号 {plan.planNo}</span>
              <Button onClick={() => setOpen(false)}>关闭</Button>
            </div>
          }
        >
          <section className="cbpv-section">
            <div className="cbpv-section-title">方案信息</div>
            <div className="cbpv-summary">
              <div className="cbpv-item">
                <span className="k">方案名称</span>
                <span className="v">{plan.planName}</span>
              </div>
              <div className="cbpv-item">
                <span className="k">方案编号</span>
                <span className="v">{plan.planNo}</span>
              </div>
              <div className="cbpv-item">
                <span className="k">机组名称</span>
                <span className="v">{plan.machineName}</span>
              </div>
              <div className="cbpv-item">
                <span className="k">执行日期</span>
                <span className="v">{plan.planData || '—'}</span>
              </div>
              <div className="cbpv-item">
                <span className="k">执行时间</span>
                <span className="v">{plan.startData}</span>
              </div>
              <div className="cbpv-item">
                <span className="k">编制人</span>
                <span className="v">{plan.creatorName}</span>
              </div>
              <div className="cbpv-item">
                <span className="k">创建时间</span>
                <span className="v">{plan.creatorTime}</span>
              </div>
            </div>
          </section>

          <section className="cbpv-section cbpv-section-grow">
            <div className="cbpv-section-hd">
              <div className="cbpv-section-title">总加仓方案</div>
            </div>
            <div className="cbpv-table-wrap">
              <Table
                size="small"
                rowKey="key"
                className="cbpv-matrix"
                columns={columns}
                dataSource={matrixRows}
                pagination={false}
                bordered
                scroll={{ x: Math.max(720, 128 + bunkers.length * 128) }}
                locale={{ emptyText: '暂无加仓方案明细' }}
              />
            </div>
          </section>
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default Component;
