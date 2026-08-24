/**
 * @name 上煤单管理
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-standards.md
 * - /assets/templates/spec-template.md
 */
import React, { useMemo, useState } from 'react';
import {
  Button,
  ConfigProvider,
  DatePicker,
  Drawer,
  Input,
  Popconfirm,
  Space,
  Table,
  message,
} from 'antd';
import {
  CheckOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import './style.css';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

type BillStatus = 'unconfirmed' | 'confirmed';
type DrawerMode = 'view' | 'confirm';

interface LoadingDetail {
  id: string;
  yard: string;
  zone: string;
  unit: string;
  bunker: string;
  amount: number;
}

interface LoadingBill {
  id: string;
  feedDate: string;
  loadingTime: string;
  shiftName: string;
  shiftCode: string;
  batchNo: string;
  totalAmount: number;
  description: string;
  status: BillStatus;
  confirmer: string;
  confirmTime: string;
  shiftEndTime: string;
  shiftEnded: boolean;
  details: LoadingDetail[];
}

const SHIFT_META: Record<string, { name: string; code: string }> = {
  A: { name: '早班', code: 'A' },
  B: { name: '中班', code: 'B' },
  C: { name: '夜班', code: 'C' },
};

const getBatchNo = (dateStr: string, shift: string) =>
  `${dayjs(dateStr).format('YYYYMMDD')}-${shift}`;

const sortDetails = (list: LoadingDetail[]) =>
  [...list].sort(
    (a, b) =>
      a.yard.localeCompare(b.yard, 'zh-CN') ||
      a.zone.localeCompare(b.zone, 'zh-CN') ||
      a.unit.localeCompare(b.unit, 'zh-CN') ||
      a.bunker.localeCompare(b.bunker, 'zh-CN')
  );

const MOCK_UNITS = ['1号机组', '2号机组'];
const MOCK_BUNKERS = ['A仓', 'B仓', 'C仓', 'D仓', 'E仓', 'F仓'];

const ZONE_PRESETS: { yard: string; zone: string }[] = [
  { yard: '1号煤场', zone: '东一区' },
  { yard: '1号煤场', zone: '东二区' },
  { yard: '1号煤场', zone: '南一区' },
  { yard: '2号煤场', zone: '西一区' },
  { yard: '2号煤场', zone: '西二区' },
  { yard: '3号煤场', zone: '北一区' },
];

const buildMockDetails = (
  prefix: string,
  zones: { yard: string; zone: string }[],
  amountOffset = 0
): LoadingDetail[] => {
  const details: LoadingDetail[] = [];
  let idx = 0;
  for (const { yard, zone } of zones) {
    for (const unit of MOCK_UNITS) {
      for (const bunker of MOCK_BUNKERS) {
        const seed = idx * 13 + bunker.charCodeAt(0) + amountOffset;
        details.push({
          id: `${prefix}-${String(idx).padStart(3, '0')}`,
          yard,
          zone,
          unit,
          bunker,
          amount: 72 + (seed % 108),
        });
        idx += 1;
      }
    }
  }
  return sortDetails(details);
};

const calcTotal = (details: LoadingDetail[]) =>
  details.reduce((sum, item) => sum + item.amount, 0);

const today = dayjs().format('YYYY-MM-DD');
const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
const twoDaysAgo = dayjs().subtract(2, 'day').format('YYYY-MM-DD');

const lb1Details = buildMockDetails('LB1', ZONE_PRESETS.slice(0, 5), 0);
const lb2Details = buildMockDetails('LB2', ZONE_PRESETS.slice(1, 6), 7);
const lb3Details = buildMockDetails('LB3', ZONE_PRESETS.slice(0, 4), 14);
const lb4Details = buildMockDetails('LB4', ZONE_PRESETS, 21);

const initialBills: LoadingBill[] = [
  {
    id: 'LB1',
    feedDate: today,
    loadingTime: `${today} 08:00:00`,
    shiftName: SHIFT_META.A.name,
    shiftCode: 'A',
    batchNo: getBatchNo(today, 'A'),
    totalAmount: calcTotal(lb1Details),
    description: '早班常规上煤，按分区-煤仓聚合统计（1号/2号机组，A-F仓）。',
    status: 'confirmed',
    confirmer: '张工',
    confirmTime: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    shiftEndTime: `${today} 15:59:59`,
    shiftEnded: true,
    details: lb1Details,
  },
  {
    id: 'LB2',
    feedDate: today,
    loadingTime: `${today} 16:00:00`,
    shiftName: SHIFT_META.B.name,
    shiftCode: 'B',
    batchNo: getBatchNo(today, 'B'),
    totalAmount: calcTotal(lb2Details),
    description: '',
    status: 'unconfirmed',
    confirmer: '',
    confirmTime: '',
    shiftEndTime: `${today} 23:59:59`,
    shiftEnded: false,
    details: lb2Details,
  },
  {
    id: 'LB3',
    feedDate: yesterday,
    loadingTime: `${yesterday} 00:00:00`,
    shiftName: SHIFT_META.C.name,
    shiftCode: 'C',
    batchNo: getBatchNo(yesterday, 'C'),
    totalAmount: calcTotal(lb3Details),
    description: '夜班补煤批次，待确认。',
    status: 'unconfirmed',
    confirmer: '',
    confirmTime: '',
    shiftEndTime: `${today} 07:59:59`,
    shiftEnded: true,
    details: lb3Details,
  },
  {
    id: 'LB4',
    feedDate: twoDaysAgo,
    loadingTime: `${twoDaysAgo} 16:00:00`,
    shiftName: SHIFT_META.B.name,
    shiftCode: 'B',
    batchNo: getBatchNo(twoDaysAgo, 'B'),
    totalAmount: calcTotal(lb4Details),
    description: '已完成确认并上传 MIS。',
    status: 'confirmed',
    confirmer: '李工',
    confirmTime: `${twoDaysAgo} 23:50:00`,
    shiftEndTime: `${twoDaysAgo} 23:59:59`,
    shiftEnded: true,
    details: lb4Details,
  },
];

const CONFIRM_HINT =
  '是否确认，确认后，上煤单将自动上传 MIS，对应班次上煤明细将禁止再次维护！';

const detailColumns: ColumnsType<LoadingDetail> = [
  {
    title: '序号',
    width: 60,
    align: 'center',
    render: (_v, _r, index) => index + 1,
  },
  { title: '煤场', dataIndex: 'yard', width: 110 },
  { title: '分区', dataIndex: 'zone', width: 110 },
  { title: '机组', dataIndex: 'unit', width: 110 },
  { title: '煤仓', dataIndex: 'bunker', width: 90 },
  {
    title: '上煤量 t',
    dataIndex: 'amount',
    width: 110,
    align: 'right',
    render: (v: number) => v.toFixed(2),
  },
];

const BillDrawerContent = ({
  bill,
  mode,
  description,
  onDescriptionChange,
}: {
  bill: LoadingBill;
  mode: DrawerMode;
  description: string;
  onDescriptionChange: (value: string) => void;
}) => {
  const descriptionEditable = mode === 'confirm';

  return (
    <div className="clbm-drawer-panel">
      <div className="clbm-form-block">
        <div className="clbm-form-item">
          <label>上煤时间</label>
          <div className="clbm-readonly">{bill.loadingTime}</div>
        </div>
        <div className="clbm-form-item">
          <label>班次</label>
          <div className="clbm-readonly">
            {bill.shiftName}（{bill.shiftCode}）
          </div>
        </div>
        <div className="clbm-form-item">
          <label>批次号</label>
          <div className="clbm-readonly">{bill.batchNo}</div>
        </div>
        <div className="clbm-form-item">
          <label>上煤总量 t</label>
          <div className="clbm-readonly">{bill.totalAmount.toFixed(2)}</div>
        </div>
        <div className="clbm-form-item clbm-span-3">
          <label>上煤描述</label>
          {descriptionEditable ? (
            <TextArea
              rows={3}
              maxLength={500}
              showCount
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="确认时可提交上煤描述"
            />
          ) : (
            <div className="clbm-readonly">{description || '-'}</div>
          )}
        </div>
      </div>

      <div className="clbm-detail-title">
        上煤明细
        <span className="clbm-detail-count">共 {bill.details.length} 条</span>
      </div>
      <Table
        className="clbm-detail-table"
        size="small"
        rowKey="id"
        scroll={{ y: 360 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `共 ${total} 条明细`,
        }}
        dataSource={sortDetails(bill.details)}
        columns={detailColumns}
      />

      {mode === 'confirm' && !bill.shiftEnded && (
        <div className="clbm-drawer-tip">当前班次未结束，禁止确认</div>
      )}
    </div>
  );
};

const Component = () => {
  const [bills, setBills] = useState<LoadingBill[]>(initialBills);
  const [draftDescriptions, setDraftDescriptions] = useState<Record<string, string>>({});
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [drawer, setDrawer] = useState<{
    open: boolean;
    mode: DrawerMode;
    billId: string | null;
  }>({ open: false, mode: 'view', billId: null });

  const [queryBatchNo, setQueryBatchNo] = useState('');
  const [queryConfirmer, setQueryConfirmer] = useState('');
  const [queryDateRange, setQueryDateRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().subtract(2, 'day').startOf('day'),
    dayjs().endOf('day'),
  ]);
  const [querySnapshot, setQuerySnapshot] = useState({
    batchNo: '',
    confirmer: '',
    dateRange: [dayjs().subtract(2, 'day').startOf('day'), dayjs().endOf('day')] as [Dayjs, Dayjs] | null,
  });

  const currentBill = bills.find((item) => item.id === drawer.billId) || null;

  const runQuery = () => {
    setQuerySnapshot({
      batchNo: queryBatchNo.trim(),
      confirmer: queryConfirmer.trim(),
      dateRange: queryDateRange,
    });
  };

  const filteredBills = useMemo(() => {
    return bills
      .filter((item) => {
        const hitBatch = !querySnapshot.batchNo || item.batchNo.includes(querySnapshot.batchNo);
        const hitConfirmer =
          !querySnapshot.confirmer || item.confirmer.includes(querySnapshot.confirmer);
        const hitDate =
          !querySnapshot.dateRange ||
          (dayjs(item.feedDate).isAfter(querySnapshot.dateRange[0].subtract(1, 'day')) &&
            dayjs(item.feedDate).isBefore(querySnapshot.dateRange[1].add(1, 'day')));
        return hitBatch && hitConfirmer && hitDate;
      })
      .sort((a, b) => dayjs(b.feedDate).valueOf() - dayjs(a.feedDate).valueOf());
  }, [bills, querySnapshot]);

  const getDescription = (bill: LoadingBill) =>
    draftDescriptions[bill.id] !== undefined ? draftDescriptions[bill.id] : bill.description;

  const openDrawer = (bill: LoadingBill, mode: DrawerMode) => {
    setDrawer({ open: true, mode, billId: bill.id });
  };

  const closeDrawer = () => {
    setDrawer({ open: false, mode: 'view', billId: null });
  };

  const handleConfirm = (bill: LoadingBill) => {
    if (!bill.shiftEnded) {
      message.warning('未结束班次的上煤单禁止确认');
      return;
    }
    const description = getDescription(bill);
    setBills((prev) =>
      prev.map((item) =>
        item.id === bill.id
          ? {
              ...item,
              status: 'confirmed',
              description,
              confirmer: '当前用户',
              confirmTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            }
          : item
      )
    );
    message.success('确认成功：上煤单已上传 MIS，入炉明细已锁定，煤堆库存已更新。');
    closeDrawer();
  };

  const handleAdjust = (bill: LoadingBill) => {
    const target = `/prototypes/out-storage-in-furnace-confirmation?feedDate=${bill.feedDate}&shiftCode=${bill.shiftCode}`;
    message.info(`跳转煤场出库入炉：上煤日期=${bill.feedDate}，班次=${bill.shiftName}（${bill.shiftCode}）`);
    window.open(target, '_blank');
  };

  const columns: ColumnsType<LoadingBill> = [
    {
      title: '序号',
      width: 60,
      align: 'center',
      fixed: 'left',
      render: (_v, _r, index) => index + 1,
    },
    {
      title: '上煤日期',
      dataIndex: 'feedDate',
      width: 120,
      sorter: (a, b) => dayjs(a.feedDate).valueOf() - dayjs(b.feedDate).valueOf(),
      defaultSortOrder: 'descend',
    },
    {
      title: '班次',
      width: 100,
      render: (_v, row) => `${row.shiftName}（${row.shiftCode}）`,
    },
    { title: '批次号', dataIndex: 'batchNo', width: 150 },
    {
      title: '上煤总量 t',
      dataIndex: 'totalAmount',
      width: 120,
      align: 'right',
      render: (v: number) => v.toFixed(2),
    },
    {
      title: '确认状态',
      width: 110,
      render: (_v, row) => {
        if (row.status === 'confirmed') return <span className="clbm-status-confirmed">已确认</span>;
        if (!row.shiftEnded) return <span className="clbm-status-running">班次进行中</span>;
        return <span className="clbm-status-pending">未确认</span>;
      },
    },
    {
      title: '确认人',
      dataIndex: 'confirmer',
      width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '确认时间',
      dataIndex: 'confirmTime',
      width: 170,
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      fixed: 'right',
      width: 200,
      render: (_v, row) => (
        <Space size={4}>
          <Button
            className="clbm-op-link"
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openDrawer(row, 'view')}
          >
            查看
          </Button>
          {row.status === 'unconfirmed' && (
            <>
              <Button
                className="clbm-op-link"
                type="link"
                size="small"
                icon={<CheckOutlined />}
                disabled={!row.shiftEnded}
                onClick={() => openDrawer(row, 'confirm')}
              >
                确认
              </Button>
              <Button
                className="clbm-op-link"
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleAdjust(row)}
              >
                调整
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider locale={zhCN}>
      <div className="clbm-root">
        <div className="clbm-page-title">
          <span className="clbm-title-icon">+</span>
          <h1>上煤单管理</h1>
        </div>

        <div className="clbm-filter-bar">
          <div className="clbm-filter-row">
            <span className="clbm-filter-label">上煤日期</span>
            <RangePicker
              value={queryDateRange}
              onChange={(v) => setQueryDateRange(v as [Dayjs, Dayjs] | null)}
              style={{ width: 260 }}
            />
            {showAdvancedFilter && (
              <>
                <Input
                  value={queryBatchNo}
                  onChange={(e) => setQueryBatchNo(e.target.value)}
                  placeholder="批次号"
                  style={{ width: 160 }}
                  allowClear
                />
                <Input
                  value={queryConfirmer}
                  onChange={(e) => setQueryConfirmer(e.target.value)}
                  placeholder="确认人"
                  style={{ width: 140 }}
                  allowClear
                />
              </>
            )}
            <div className="clbm-filter-actions">
              <Button type="primary" icon={<SearchOutlined />} onClick={runQuery}>
                查询
              </Button>
              <span
                className="clbm-filter-link"
                onClick={() => setShowAdvancedFilter((v) => !v)}
              >
                <FilterOutlined /> 筛选
              </span>
            </div>
          </div>
        </div>

        <div className="clbm-table-wrap">
          <Table<LoadingBill>
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={filteredBills}
            scroll={{ x: 1280 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total, range) => `共 ${total} 条记录 第 ${range[0]}-${range[1]} 条`,
            }}
          />
        </div>

        <Drawer
          open={drawer.open}
          width={880}
          onClose={closeDrawer}
          title={
            currentBill
              ? `${drawer.mode === 'confirm' ? '确认入炉批次' : '查看上煤单'} - ${currentBill.batchNo}`
              : '上煤单详情'
          }
          extra={
            drawer.mode === 'confirm' && currentBill ? (
              <Space>
                <Button onClick={closeDrawer}>取消</Button>
                <Popconfirm
                  title={CONFIRM_HINT}
                  okText="确认"
                  cancelText="取消"
                  disabled={!currentBill.shiftEnded}
                  onConfirm={() => handleConfirm(currentBill)}
                >
                  <Button type="primary" disabled={!currentBill.shiftEnded}>
                    提交确认
                  </Button>
                </Popconfirm>
              </Space>
            ) : (
              <Button onClick={closeDrawer}>关闭</Button>
            )
          }
        >
          {currentBill && (
            <BillDrawerContent
              bill={currentBill}
              mode={drawer.mode}
              description={getDescription(currentBill)}
              onDescriptionChange={(value) =>
                setDraftDescriptions((prev) => ({ ...prev, [currentBill.id]: value }))
              }
            />
          )}
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default Component;
