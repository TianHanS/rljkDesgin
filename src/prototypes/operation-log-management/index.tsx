/**
 * @name 运行日志管理
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /assets/templates/spec-template.md
 * - 用户提供：燃料质检集控中心日志列表 + 质检运行日志填报表单截图
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  App,
  Button,
  ConfigProvider,
  DatePicker,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tooltip,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import zhCN from 'antd/locale/zh_CN';
import dayjs, { Dayjs } from 'dayjs';
import { Monitor, Plus, Power, Search } from 'lucide-react';
import './style.css';

dayjs.locale('zh-cn');

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const SHIFT_OPTIONS = ['后夜班', '白班', '前夜班'] as const;
type ShiftName = (typeof SHIFT_OPTIONS)[number];

type AbnormalRow = {
  id: string;
  module: string;
  description: string;
  method: string;
};

export type OperationLog = {
  id: string;
  logDate: string;
  shift: ShiftName;
  startTime: string;
  endTime: string;
  handoverPersonnel: string;
  successorPersonnel: string;
  workStatus: string;
  equipmentStatus: string;
  abnormalities: AbnormalRow[];
  other: string;
};

type AlarmRecord = {
  id: string;
  name: string;
  level: '严重' | '一般' | '提示';
  moduleName: string;
  deviceName: string;
  content: string;
  startTime: string;
  endTime: string;
};

type FormMode = 'create' | 'edit' | 'copy' | 'view';

const NAV_ITEMS = [
  '主界面',
  '采样机',
  '汽车衡',
  '气动传输',
  '存查柜',
  '自动制样',
  '报警',
  '日志管理',
] as const;

const MOCK_ALARMS: AlarmRecord[] = [
  {
    id: 'a1',
    name: '采样小车坐标异常',
    level: '严重',
    moduleName: '1#汽车采样',
    deviceName: '汽车采样机',
    content: '采样小车坐标异常，触发安全保护',
    startTime: '2026-01-06 08:12:33',
    endTime: '2026-01-06 08:25:10',
  },
  {
    id: 'a2',
    name: '制样设备通讯中断',
    level: '严重',
    moduleName: '自动制样',
    deviceName: '制样系统',
    content: '与上位机通讯超时',
    startTime: '2026-01-06 10:05:00',
    endTime: '2026-01-06 10:18:22',
  },
  {
    id: 'a3',
    name: '样桶数量不足',
    level: '一般',
    moduleName: '气动传输',
    deviceName: '气动传输',
    content: '空桶缓存低于阈值',
    startTime: '2026-01-05 22:40:11',
    endTime: '2026-01-05 23:02:00',
  },
];

const today = dayjs();
const yesterday = today.subtract(1, 'day');
const threeDaysAgo = today.subtract(3, 'day');

const INITIAL_LOGS: OperationLog[] = [
  {
    id: 'log-1',
    logDate: today.format('YYYY-MM-DD'),
    shift: '白班',
    startTime: `${today.format('YYYY-MM-DD')} 08:00:00`,
    endTime: `${today.format('YYYY-MM-DD')} 16:00:00`,
    handoverPersonnel: '张三, 李四',
    successorPersonnel: '王五, 赵六',
    workStatus: '1) 汽车采样 3 批次完成\n2) 制样任务 2 单下发\n3) 气动传输巡检正常',
    equipmentStatus: '1) 采样化设备运行正常\n2) 消防设备运行正常',
    abnormalities: [
      { id: 'ab1', module: '1#汽车采样', description: '小车坐标偶发跳变', method: '重启驱动模块后恢复' },
    ],
    other: '无',
  },
  {
    id: 'log-2',
    logDate: yesterday.format('YYYY-MM-DD'),
    shift: '前夜班',
    startTime: `${yesterday.format('YYYY-MM-DD')} 16:00:00`,
    endTime: `${yesterday.format('YYYY-MM-DD')} 23:59:59`,
    handoverPersonnel: '钱七, 孙八',
    successorPersonnel: '张三, 李四',
    workStatus: '1) 夜班例行巡检完成\n2) 存查柜样桶核对无误',
    equipmentStatus: '1) 各模块运行平稳\n2) UPS 自检通过',
    abnormalities: [],
    other: '交接班工具齐全',
  },
  {
    id: 'log-3',
    logDate: threeDaysAgo.format('YYYY-MM-DD'),
    shift: '白班',
    startTime: `${threeDaysAgo.format('YYYY-MM-DD')} 08:00:00`,
    endTime: `${threeDaysAgo.format('YYYY-MM-DD')} 16:00:00`,
    handoverPersonnel: '周九',
    successorPersonnel: '吴十',
    workStatus: '1) 历史归档日志补录\n2) 设备保养配合完成',
    equipmentStatus: '1) 采样机润滑保养\n2) 衡器零点校验',
    abnormalities: [],
    other: '—',
  },
];

/** 近 2 日：日志日期为今日或昨日 */
export function isWithinLastTwoDays(logDate: string, ref = dayjs()): boolean {
  const d = dayjs(logDate).startOf('day');
  const todayStart = ref.startOf('day');
  const diff = todayStart.diff(d, 'day');
  return diff >= 0 && diff <= 1;
}

export function getDefaultShiftByTime(now = dayjs()): {
  shift: ShiftName;
  logDate: string;
  startTime: string;
  endTime: string;
} {
  const hour = now.hour();
  const dateStr = now.format('YYYY-MM-DD');
  if (hour >= 16) {
    return {
      shift: '前夜班',
      logDate: dateStr,
      startTime: `${dateStr} 16:00:00`,
      endTime: `${dateStr} 23:59:59`,
    };
  }
  if (hour >= 8) {
    return {
      shift: '白班',
      logDate: dateStr,
      startTime: `${dateStr} 08:00:00`,
      endTime: `${dateStr} 16:00:00`,
    };
  }
  return {
    shift: '后夜班',
    logDate: dateStr,
    startTime: `${dateStr} 00:00:00`,
    endTime: `${dateStr} 08:00:00`,
  };
}

function shiftTimeRange(shift: ShiftName, logDate: Dayjs): { start: string; end: string } {
  const d = logDate.format('YYYY-MM-DD');
  if (shift === '前夜班') return { start: `${d} 16:00:00`, end: `${d} 23:59:59` };
  if (shift === '白班') return { start: `${d} 08:00:00`, end: `${d} 16:00:00` };
  return { start: `${d} 00:00:00`, end: `${d} 08:00:00` };
}

function logToFormValues(log: OperationLog) {
  return {
    logDate: dayjs(log.logDate),
    shift: log.shift,
    startTime: dayjs(log.startTime),
    endTime: dayjs(log.endTime),
    handoverPersonnel: log.handoverPersonnel,
    successorPersonnel: log.successorPersonnel,
    workStatus: log.workStatus,
    equipmentStatus: log.equipmentStatus,
    other: log.other,
    abnormalities: log.abnormalities.map((a) => ({ ...a })),
  };
}

const ComponentInner: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [logs, setLogs] = useState<OperationLog[]>(INITIAL_LOGS);
  const [filterWork, setFilterWork] = useState('');
  const [filterEquip, setFilterEquip] = useState('');
  const [filterRange, setFilterRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);
  const [applied, setApplied] = useState({
    work: '',
    equip: '',
    range: [dayjs().subtract(7, 'day'), dayjs()] as [Dayjs, Dayjs],
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    const qWork = applied.work.trim();
    const qEquip = applied.equip.trim();
    return logs
      .filter((l) => {
        if (qWork && !l.workStatus.includes(qWork)) return false;
        if (qEquip && !l.equipmentStatus.includes(qEquip)) return false;
        const d = dayjs(l.logDate);
        if (d.isBefore(applied.range[0].startOf('day'))) return false;
        if (d.isAfter(applied.range[1].endOf('day'))) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.logDate !== b.logDate) return a.logDate < b.logDate ? 1 : -1;
        return a.startTime < b.startTime ? 1 : -1;
      });
  }, [logs, applied]);

  const drawerReadonly = formMode === 'view';

  const relatedAlarms = useMemo(() => {
    const start = form.getFieldValue('startTime') as Dayjs | undefined;
    const end = form.getFieldValue('endTime') as Dayjs | undefined;
    if (!start || !end) return MOCK_ALARMS.slice(0, 2);
    return MOCK_ALARMS.filter((a) => {
      const t = dayjs(a.startTime);
      return !t.isBefore(start) && !t.isAfter(end);
    });
  }, [form, drawerOpen, formMode]);

  const openCreate = () => {
    const def = getDefaultShiftByTime();
    setFormMode('create');
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({
      logDate: dayjs(def.logDate),
      shift: def.shift,
      startTime: dayjs(def.startTime),
      endTime: dayjs(def.endTime),
      handoverPersonnel: '',
      successorPersonnel: '',
      workStatus: '',
      equipmentStatus: '',
      other: '',
      abnormalities: [],
    });
    setDrawerOpen(true);
  };

  const openForm = (mode: FormMode, record: OperationLog) => {
    if (mode === 'edit' && !isWithinLastTwoDays(record.logDate)) {
      message.warning('仅近 2 日（今日、昨日）的日志允许编辑');
      return;
    }
    setFormMode(mode);
    setEditingId(mode === 'edit' ? record.id : null);
    const values = logToFormValues(record);
    if (mode === 'copy') {
      const todayDate = dayjs().startOf('day');
      const { start, end } = shiftTimeRange(record.shift, todayDate);
      values.logDate = todayDate;
      values.startTime = dayjs(start);
      values.endTime = dayjs(end);
    }
    form.setFieldsValue(values);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleShiftChange = (shift: ShiftName) => {
    const logDate = form.getFieldValue('logDate') as Dayjs | undefined;
    if (!logDate) return;
    const { start, end } = shiftTimeRange(shift, logDate);
    form.setFieldsValue({ startTime: dayjs(start), endTime: dayjs(end) });
  };

  const handleLogDateChange = (d: Dayjs | null) => {
    if (!d) return;
    const shift = form.getFieldValue('shift') as ShiftName;
    if (shift) {
      const { start, end } = shiftTimeRange(shift, d);
      form.setFieldsValue({ startTime: dayjs(start), endTime: dayjs(end) });
    }
  };

  const addAbnormalRow = useCallback(() => {
    const rows: AbnormalRow[] = form.getFieldValue('abnormalities') ?? [];
    form.setFieldsValue({
      abnormalities: [...rows, { id: `ab-${Date.now()}`, module: '', description: '', method: '' }],
    });
  }, [form]);

  const handleSave = async () => {
    if (drawerReadonly) return;
    try {
      const v = await form.validateFields();
      const payload: OperationLog = {
        id: editingId ?? `log-${Date.now()}`,
        logDate: (v.logDate as Dayjs).format('YYYY-MM-DD'),
        shift: v.shift as ShiftName,
        startTime: (v.startTime as Dayjs).format('YYYY-MM-DD HH:mm:ss'),
        endTime: (v.endTime as Dayjs).format('YYYY-MM-DD HH:mm:ss'),
        handoverPersonnel: (v.handoverPersonnel as string).trim(),
        successorPersonnel: (v.successorPersonnel as string).trim(),
        workStatus: v.workStatus as string,
        equipmentStatus: v.equipmentStatus as string,
        abnormalities: (v.abnormalities as AbnormalRow[]) ?? [],
        other: (v.other as string) ?? '',
      };

      if (formMode === 'edit' && editingId) {
        if (!isWithinLastTwoDays(payload.logDate)) {
          message.error('仅近 2 日的日志允许保存编辑');
          return;
        }
        setLogs((prev) => prev.map((l) => (l.id === editingId ? payload : l)));
        message.success('日志已更新');
      } else {
        setLogs((prev) => [payload, ...prev]);
        message.success(formMode === 'copy' ? '已复制并保存为新日志' : '日志已保存');
      }
      closeDrawer();
    } catch {
      /* 校验失败 */
    }
  };

  const handleDelete = (record: OperationLog) => {
    if (!isWithinLastTwoDays(record.logDate)) {
      message.warning('仅近 2 日（今日、昨日）的日志允许删除');
      return;
    }
    setLogs((prev) => prev.filter((l) => l.id !== record.id));
    message.success('已删除');
  };

  const applyFilters = () => {
    setApplied({ work: filterWork, equip: filterEquip, range: filterRange });
  };

  const resetFilters = () => {
    const range: [Dayjs, Dayjs] = [dayjs().subtract(7, 'day'), dayjs()];
    setFilterWork('');
    setFilterEquip('');
    setFilterRange(range);
    setApplied({ work: '', equip: '', range });
  };

  const columns: ColumnsType<OperationLog> = [
    {
      title: '序号',
      width: 64,
      align: 'center',
      render: (_, __, i) => i + 1,
    },
    { title: '日志日期', dataIndex: 'logDate', width: 110 },
    { title: '开始时间', dataIndex: 'startTime', width: 170 },
    { title: '结束时间', dataIndex: 'endTime', width: 170 },
    {
      title: '工作情况(记事内容)',
      dataIndex: 'workStatus',
      ellipsis: true,
      render: (t: string) => <span className="whitespace-pre-line line-clamp-2">{t}</span>,
    },
    {
      title: '设备情况',
      dataIndex: 'equipmentStatus',
      ellipsis: true,
      render: (t: string) => <span className="whitespace-pre-line line-clamp-2">{t}</span>,
    },
    { title: '其他事项', dataIndex: 'other', width: 100, ellipsis: true },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, record) => {
        const canModify = isWithinLastTwoDays(record.logDate);
        return (
          <Space size={4} wrap>
            <Button type="link" size="small" onClick={() => openForm('view', record)}>
              查看
            </Button>
            <Button
              type="link"
              size="small"
              disabled={!canModify}
              onClick={() => openForm('edit', record)}
            >
              编辑
            </Button>
            <Tooltip title="复制新增一条日志">
              <Button type="link" size="small" onClick={() => openForm('copy', record)}>
                复制
              </Button>
            </Tooltip>
            <Popconfirm
              title="确认删除该条日志？"
              description="删除后不可恢复"
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              disabled={!canModify}
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger disabled={!canModify}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const drawerTitle =
    formMode === 'create'
      ? '新增运行日志'
      : formMode === 'edit'
        ? '编辑运行日志'
        : formMode === 'copy'
          ? '复制运行日志'
          : '查看运行日志';

  return (
    <div className="operation-log-management-root min-h-screen bg-[#0b1120] text-gray-200 flex flex-col overflow-hidden">
      <header className="h-14 border-b border-cyan-900/50 bg-[#0f172a]/90 backdrop-blur flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-full border border-cyan-400/60 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-cyan-400" />
          </div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-wide whitespace-nowrap">
            燃料质检集控中心
          </h1>
        </div>
        <nav className="hidden lg:flex flex-1 justify-center gap-0.5 overflow-x-auto custom-scrollbar px-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              type="button"
              className={`px-2 py-1 text-xs whitespace-nowrap rounded transition-colors cursor-pointer ${
                item === '日志管理'
                  ? 'bg-cyan-600/80 text-white border border-cyan-400/50'
                  : 'text-gray-400 hover:text-cyan-200 hover:bg-cyan-900/20'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 shrink-0 text-xs text-cyan-400/80">
          <span className="hidden sm:inline font-mono tabular-nums">{dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
          <button type="button" className="p-1.5 hover:bg-cyan-900/30 rounded" aria-label="电源">
            <Power className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col p-4 gap-3 overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 shrink-0 border border-cyan-900/40 bg-[#0f172a]/60 px-4 py-3 rounded">
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            工作情况
            <Input
              placeholder="模糊匹配记事内容"
              value={filterWork}
              onChange={(e) => setFilterWork(e.target.value)}
              className="w-[160px] bg-[#0b1120] border-cyan-900/50 text-gray-200"
              allowClear
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            设备情况
            <Input
              placeholder="模糊匹配设备情况"
              value={filterEquip}
              onChange={(e) => setFilterEquip(e.target.value)}
              className="w-[160px] bg-[#0b1120] border-cyan-900/50 text-gray-200"
              allowClear
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            日志日期
            <RangePicker
              value={filterRange}
              onChange={(v) => v && setFilterRange(v as [Dayjs, Dayjs])}
              className="bg-[#0b1120] border-cyan-900/50"
            />
          </label>
          <Space wrap>
            <Button
              type="primary"
              icon={<Search className="w-3.5 h-3.5" />}
              onClick={applyFilters}
              className="bg-cyan-600 hover:bg-cyan-500 border-cyan-500"
            >
              查询
            </Button>
            <Button onClick={resetFilters} className="border-cyan-800/60 text-gray-300 bg-transparent">
              重置
            </Button>
            <Button
              onClick={() => message.info('导出功能原型模拟')}
              className="border-cyan-800/60 text-gray-300 bg-transparent"
            >
              导出
            </Button>
            <Button
              type="primary"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={openCreate}
              className="bg-cyan-600 hover:bg-cyan-500 border-cyan-500"
            >
              新增
            </Button>
          </Space>
        </div>

        <div className="flex-1 min-h-0 rounded border border-cyan-900/40 bg-[#0f172a]/40 overflow-hidden">
          <Table<OperationLog>
            rowKey="id"
            columns={columns}
            dataSource={filteredLogs}
            size="small"
            scroll={{ x: 1200, y: 'calc(100vh - 280px)' }}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
            className="custom-scrollbar"
          />
        </div>
      </main>

      <Drawer
        title={drawerTitle}
        placement="right"
        width={Math.min(920, typeof window !== 'undefined' ? window.innerWidth - 24 : 920)}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
        className="olm-drawer"
        footer={
          drawerReadonly ? (
            <Button onClick={closeDrawer}>关闭</Button>
          ) : (
            <Space>
              <Button onClick={closeDrawer}>取消</Button>
              <Button type="primary" onClick={handleSave} className="bg-cyan-600 border-cyan-500">
                保存日志
              </Button>
            </Space>
          )
        }
      >
        <Form form={form} layout="vertical" disabled={drawerReadonly} requiredMark className="text-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4">
            <Form.Item label="值班日期" name="logDate" rules={[{ required: true, message: '请选择值班日期' }]}>
              <DatePicker className="w-full" onChange={handleLogDateChange} />
            </Form.Item>
            <Form.Item label="值班班次" name="shift" rules={[{ required: true, message: '请选择班次' }]}>
              <Select
                options={SHIFT_OPTIONS.map((s) => ({ value: s, label: s }))}
                onChange={handleShiftChange}
              />
            </Form.Item>
            <Form.Item label="开始时间" name="startTime" rules={[{ required: true, message: '请选择开始时间' }]}>
              <DatePicker showTime className="w-full" format="YYYY-MM-DD HH:mm:ss" />
            </Form.Item>
            <Form.Item label="结束时间" name="endTime" rules={[{ required: true, message: '请选择结束时间' }]}>
              <DatePicker showTime className="w-full" format="YYYY-MM-DD HH:mm:ss" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              label="交班人员"
              name="handoverPersonnel"
              rules={[{ required: true, message: '请输入交班人员' }]}
            >
              <Input placeholder="多人以逗号分隔" />
            </Form.Item>
            <Form.Item
              label="接班人员"
              name="successorPersonnel"
              rules={[{ required: true, message: '请输入接班人员' }]}
            >
              <Input placeholder="多人以逗号分隔" />
            </Form.Item>
          </div>

          <Form.Item
            label="工作情况"
            name="workStatus"
            rules={[{ required: true, message: '请填写工作情况' }]}
          >
            <TextArea rows={4} placeholder="1) …&#10;2) …" />
          </Form.Item>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Form.Item
              label="设备总体情况"
              name="equipmentStatus"
              rules={[{ required: true, message: '请填写设备总体情况' }]}
            >
              <TextArea rows={4} placeholder="1) 采样化设备运行正常…" />
            </Form.Item>

            <div className="border border-cyan-900/40 rounded p-3 bg-[#0f172a]/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-cyan-100/90 olm-form-label-required">异常处理录入</span>
                {!drawerReadonly && (
                  <Button size="small" type="primary" ghost onClick={addAbnormalRow} className="border-cyan-600">
                    异常处理录入
                  </Button>
                )}
              </div>
              <Form.List name="abnormalities">
                {(fields, { remove }) => (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                    {fields.length === 0 && (
                      <p className="text-xs text-gray-500 py-4 text-center">暂无异常记录，可点击上方按钮录入</p>
                    )}
                    {fields.map(({ key, name, ...rest }) => (
                      <div
                        key={key}
                        className="grid grid-cols-[32px_1fr_1fr_1fr_auto] gap-1 items-start text-xs border-b border-cyan-900/30 pb-2"
                      >
                        <span className="text-gray-500 pt-1">{name + 1}</span>
                        <Form.Item {...rest} name={[name, 'module']} className="mb-0">
                          <Input placeholder="模块" size="small" />
                        </Form.Item>
                        <Form.Item {...rest} name={[name, 'description']} className="mb-0">
                          <Input placeholder="异常说明" size="small" />
                        </Form.Item>
                        <Form.Item {...rest} name={[name, 'method']} className="mb-0">
                          <Input placeholder="处理方法" size="small" />
                        </Form.Item>
                        {!drawerReadonly && (
                          <Button
                            type="link"
                            size="small"
                            danger
                            className="px-0"
                            onClick={() => remove(name)}
                          >
                            删
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Form.List>
            </div>
          </div>

          <Form.Item label="其他" name="other" rules={[{ required: true, message: '请填写其他事项' }]}>
            <TextArea rows={2} placeholder="无则填「无」" />
          </Form.Item>
        </Form>

        <section className="mt-6 border-t border-cyan-900/40 pt-4">
          <h3 className="text-sm font-medium text-cyan-100/90 mb-3">相关报警记录</h3>
          <Table<AlarmRecord>
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 900 }}
            dataSource={relatedAlarms.length ? relatedAlarms : MOCK_ALARMS.slice(0, 2)}
            columns={[
              { title: '序号', width: 56, render: (_, __, i) => i + 1 },
              { title: '报警名称', dataIndex: 'name', width: 140, ellipsis: true },
              {
                title: '报警等级',
                dataIndex: 'level',
                width: 80,
                render: (lv: string) => (
                  <span className="text-red-400 border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 rounded text-xs">
                    {lv}
                  </span>
                ),
              },
              { title: '模块名称', dataIndex: 'moduleName', width: 110, ellipsis: true },
              { title: '设备名称', dataIndex: 'deviceName', width: 100, ellipsis: true },
              { title: '报警内容', dataIndex: 'content', ellipsis: true },
              { title: '发生时间', dataIndex: 'startTime', width: 155 },
              { title: '结束时间', dataIndex: 'endTime', width: 155 },
              {
                title: '操作',
                width: 64,
                render: () => (
                  <Button type="link" size="small">
                    查看
                  </Button>
                ),
              },
            ]}
          />
        </section>
      </Drawer>
    </div>
  );
};

const Component: React.FC = () => (
  <ConfigProvider
    locale={zhCN}
    theme={{
      algorithm: theme.darkAlgorithm,
      token: { colorPrimary: '#0891b2', colorBgContainer: '#0f172a', colorBorder: '#164e63' },
    }}
  >
    <App>
      <ComponentInner />
    </App>
  </ConfigProvider>
);

export default Component;
