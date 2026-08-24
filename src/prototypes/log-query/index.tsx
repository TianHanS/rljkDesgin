/**
 * @name 日志查询
 * @mode axure
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /skills/axure-export-workflow/SKILL.md
 */
import React, { useState, useMemo } from 'react';
import { 
  Monitor, Power, Search, RefreshCw, ChevronRight, ChevronDown, Clock, MapPin, AlertCircle, CheckCircle2, Info
} from 'lucide-react';
import { Table, Select, DatePicker, Input, Button, Radio, Drawer, Timeline, Tag, ConfigProvider, theme } from 'antd';
import dayjs from 'dayjs';
import locale from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import './style.css';

dayjs.locale('zh-cn');
const { RangePicker } = DatePicker;

// --- Mock Data ---

const MOCK_CARS = [
  { id: '01无人车', name: '01无人车' },
  { id: '02有人车', name: '02有人车' },
];

const MOCK_CAR_LOGS = [
  { id: 1, carId: '01无人车', time: '2023-10-24 10:05:32', type: '正常', content: '到达装车端 1#汽车集样，开始对接' },
  { id: 2, carId: '01无人车', time: '2023-10-24 10:02:15', type: '异常', content: '避障触发，暂停运行' },
  { id: 3, carId: '01无人车', time: '2023-10-24 09:58:10', type: '正常', content: '任务 T-20231024-001 已完成' },
  { id: 4, carId: '01无人车', time: '2023-10-24 09:50:00', type: '正常', content: '系统启动自检完成' },
  { id: 5, carId: '02有人车', time: '2023-10-24 09:45:20', type: '报警', content: '电量低于 20%，请及时充电' },
  { id: 6, carId: '01无人车', time: '2023-10-23 15:30:00', type: '正常', content: '系统关机' },
];

const MOCK_TASKS = [
  { 
    id: 'T-20231024-001', 
    name: '常规转运任务',
    type: '样桶装卸', 
    planTime: '2023-10-24 10:00:00', 
    startTime: '2023-10-24 10:01:00', 
    endTime: '-',
    status: '执行中', 
    carId: '01无人车',
    trigger: '定时自动开始',
    duration: '15',
    confirmUser: '张三',
    confirmTime: '2023-10-24 10:00:30',
    createUser: '张三',
    createTime: '2023-10-24 09:55:00',
    children: [
      { id: 'T-001-1', seq: 1, type: '车辆调度', target: '1#汽车集样', action: '-', emptyCount: '-', duration: '10 min', distance: ' 1200 m' },
      { id: 'T-001-2', seq: 2, type: '样桶装卸', target: '1#汽车集样', action: '31卸空桶装满桶', emptyCount: '4' }
    ]
  },
  { 
    id: 'T-20231024-002', 
    name: '加急调度',
    type: '车辆调度', 
    planTime: '2023-10-24 09:30:00', 
    startTime: '2023-10-24 09:35:00', 
    endTime: '2023-10-24 10:20:00',
    status: '已完成', 
    carId: '02有人车',
    trigger: '人工确认',
    duration: '45',
    confirmUser: '李四',
    confirmTime: '2023-10-24 09:31:00',
    createUser: '李四',
    createTime: '2023-10-24 09:25:00',
    children: [
      { id: 'T-002-1', seq: 1, type: '车辆调度', target: '卸样端', action: '-', emptyCount: '-', duration: '20', distance: '1.5km' },
      { id: 'T-002-2', seq: 2, type: '样桶装卸', target: '卸样端', action: '12卸满桶', emptyCount: '-' }
    ]
  },
  { 
    id: 'T-20231024-003', 
    name: '异常中断任务',
    type: '样桶装卸', 
    planTime: '2023-10-24 09:00:00', 
    startTime: '2023-10-24 09:05:00', 
    endTime: '-',
    status: '异常', 
    carId: '01无人车',
    trigger: '人工确认',
    duration: '-',
    confirmUser: '王五',
    confirmTime: '2023-10-24 09:01:00',
    createUser: '王五',
    createTime: '2023-10-24 08:50:00',
    children: [
      { id: 'T-003-1', seq: 1, type: '车辆调度', target: '制样归批', action: '-', emptyCount: '-', duration: '5', distance: '400m' },
      { id: 'T-003-2', seq: 2, type: '样桶装卸', target: '制样归批', action: '32卸满桶装空桶', emptyCount: '4' }
    ]
  },
];

const MOCK_TASK_LOGS: Record<string, any[]> = {
  'T-20231024-001': [
    { id: 101, time: '2023-10-24 10:05:32', type: '正常', content: '到达装车端 1#汽车集样，开始对接' },
    { id: 102, time: '2023-10-24 10:02:15', type: '异常', content: '避障触发，暂停运行，等待人工干预' },
    { id: 103, time: '2023-10-24 10:01:00', type: '正常', content: '任务开始执行，前往 1#汽车集样' },
  ],
  'T-20231024-002': [
    { id: 201, time: '2023-10-24 09:40:00', type: '正常', content: '任务已完成' },
    { id: 202, time: '2023-10-24 09:35:00', type: '正常', content: '任务开始执行' },
  ],
  'T-20231024-003': [
    { id: 301, time: '2023-10-24 09:15:00', type: '报警', content: '样桶装卸失败，机械臂无响应' },
    { id: 302, time: '2023-10-24 09:05:00', type: '正常', content: '任务开始执行' },
  ]
};

// --- Components ---

const TypeBadge = ({ type }: { type: string }) => {
  let colorClass = 'text-green-400 border-green-400/30 bg-green-400/10';
  if (type === '异常') colorClass = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
  if (type === '报警') colorClass = 'text-red-400 border-red-400/30 bg-red-400/10';

  return (
    <span className={`px-2 py-0.5 text-xs border rounded ${colorClass}`}>
      {type}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  let colorClass = 'text-gray-400 border-gray-400/30 bg-gray-400/10';
  if (status === '执行中') colorClass = 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';
  if (status === '已完成') colorClass = 'text-green-400 border-green-400/30 bg-green-400/10';
  if (status === '异常') colorClass = 'text-red-400 border-red-400/30 bg-red-400/10';

  return (
    <span className={`px-2 py-0.5 text-xs border rounded ${colorClass}`}>
      {status}
    </span>
  );
};

const Component = () => {
  const [activeMenu1, setActiveMenu1] = useState('主界面');
  const [activeMenu2, setActiveMenu2] = useState('日志查询');
  
  const [queryMode, setQueryMode] = useState<'car' | 'task'>('car');

  // Car Query State
  const [selectedCar, setSelectedCar] = useState<string>(MOCK_CARS[0].id);
  const [carTimeRange, setCarTimeRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // Task Query State
  const [taskIdKeyword, setTaskIdKeyword] = useState('');
  const [taskTimeRange, setTaskTimeRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // Drawer State
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState<any>(null);

  // Derived Data: Car Logs
  const filteredCarLogs = useMemo(() => {
    let logs = MOCK_CAR_LOGS.filter(log => log.carId === selectedCar);
    if (carTimeRange && carTimeRange[0] && carTimeRange[1]) {
      const start = carTimeRange[0].valueOf();
      const end = carTimeRange[1].valueOf();
      logs = logs.filter(log => {
        const t = dayjs(log.time).valueOf();
        return t >= start && t <= end;
      });
    }
    // Sort descending by time
    return logs.sort((a, b) => dayjs(b.time).valueOf() - dayjs(a.time).valueOf());
  }, [selectedCar, carTimeRange]);

  // Derived Data: Tasks
  const filteredTasks = useMemo(() => {
    let tasks = [...MOCK_TASKS];
    if (taskIdKeyword) {
      tasks = tasks.filter(t => t.id.toLowerCase().includes(taskIdKeyword.toLowerCase()));
    }
    if (taskTimeRange && taskTimeRange[0] && taskTimeRange[1]) {
      const start = taskTimeRange[0].valueOf();
      const end = taskTimeRange[1].valueOf();
      tasks = tasks.filter(t => {
        const st = dayjs(t.startTime).valueOf();
        return st >= start && st <= end;
      });
    }
    // Sort descending by start time
    return tasks.sort((a, b) => dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf());
  }, [taskIdKeyword, taskTimeRange]);

  // Derived Data: Current Task Logs
  const currentTaskLogs = useMemo(() => {
    if (!currentTask) return [];
    const logs = MOCK_TASK_LOGS[currentTask.id] || [];
    // Timeline is displayed in reverse chronological order
    return [...logs].sort((a, b) => dayjs(b.time).valueOf() - dayjs(a.time).valueOf());
  }, [currentTask]);

  // Columns: Car Logs
  const carLogColumns = [
    { title: '日志时间', dataIndex: 'time', key: 'time', width: 200 },
    { 
      title: '类型', 
      dataIndex: 'type', 
      key: 'type', 
      width: 120,
      render: (type: string) => <TypeBadge type={type} />
    },
    { title: '日志内容', dataIndex: 'content', key: 'content' },
  ];

  // Columns: Tasks
  const taskColumns = [
    { title: '任务编号', dataIndex: 'id', key: 'id', width: 180 },
    { title: '任务类型', dataIndex: 'type', key: 'type', width: 150 },
    { title: '关联车辆', dataIndex: 'carId', key: 'carId', width: 150 },
    { title: '计划时间', dataIndex: 'planTime', key: 'planTime', width: 180 },
    { title: '实际开始时间', dataIndex: 'startTime', key: 'startTime', width: 180 },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      width: 120,
      render: (status: string) => <StatusBadge status={status} />
    },
    { 
      title: '操作', 
      key: 'action', 
      width: 100,
      render: (_: any, record: any) => (
        <Button 
          type="link" 
          className="text-cyan-400 hover:text-cyan-300 p-0"
          onClick={() => {
            setCurrentTask(record);
            setDrawerVisible(true);
          }}
        >
          查看
        </Button>
      )
    },
  ];

  return (
    <ConfigProvider 
      locale={locale}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#22d3ee', // cyan-400
          colorBgBase: '#0b1120',
          colorBgContainer: '#1e293b',
          colorBgElevated: '#0f172a',
          colorBorder: 'rgba(34, 211, 238, 0.2)', // cyan-400 with opacity
          borderRadius: 6,
        },
        components: {
          Table: {
            colorBgContainer: 'transparent',
            headerBg: 'rgba(15, 23, 42, 0.8)',
            headerColor: '#94a3b8',
            borderColor: 'rgba(34, 211, 238, 0.1)',
            rowHoverBg: 'rgba(34, 211, 238, 0.05)',
          },
          Drawer: {
            colorBgElevated: '#0f172a',
          },
          Timeline: {
            tailColor: 'rgba(34, 211, 238, 0.2)',
          }
        }
      }}
    >
      <div className="min-h-screen bg-[#0b1120] text-gray-200 font-sans flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 border-b border-cyan-900/50 bg-[#0f172a]/80 backdrop-blur flex items-center px-6 justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full border border-cyan-400 flex items-center justify-center shadow-[0_0_10px_rgba(0,255,255,0.3)]">
              <Monitor className="w-4 h-4 text-cyan-400" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wider">智慧燃料集控中心</h1>
          </div>

          <nav className="flex space-x-1">
            {['主界面', '采样机', '汽车衡', '气动传输', '自动制样'].map(item => (
              <button
                key={item}
                onClick={() => setActiveMenu1(item)}
                className={`px-6 py-2 text-sm transform skew-x-[-15deg] transition-colors ${
                  activeMenu1 === item 
                    ? 'bg-cyan-900/60 border-b-2 border-cyan-400 text-cyan-300' 
                    : 'hover:bg-cyan-900/30 text-gray-400'
                }`}
              >
                <div className="transform skew-x-[15deg]">{item}</div>
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-cyan-400">2023-10-24 10:05:32</div>
            <button className="p-2 hover:bg-cyan-900/30 rounded-full text-cyan-400 transition-colors">
              <Power className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Level 2 Menu */}
        <div className="h-12 bg-[#0f172a]/50 border-b border-cyan-900/30 flex items-center px-6 space-x-8 shrink-0">
          {['工作台', '任务管理', '日志查询', '车辆监控', '车辆调试', '报警查询'].map(item => (
            <button
              key={item}
              onClick={() => setActiveMenu2(item)}
              className={`text-sm py-3 relative transition-colors ${
                activeMenu2 === item ? 'text-cyan-400 font-medium' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {item}
              {activeMenu2 === item && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
              )}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
          
          <div className="flex justify-between items-center shrink-0">
            <Radio.Group 
              value={queryMode} 
              onChange={e => setQueryMode(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="car">按小车查询</Radio.Button>
              <Radio.Button value="task">按任务查询</Radio.Button>
            </Radio.Group>
          </div>

          {/* Filters & Table container */}
          <div className="bg-[#1e293b]/60 border border-cyan-900/50 rounded-lg p-5 flex flex-col flex-1 overflow-hidden">
            
            {/* Filter Bar */}
            <div className="flex flex-wrap gap-4 mb-5 shrink-0">
              {queryMode === 'car' ? (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">选择小车：</span>
                    <Select 
                      value={selectedCar}
                      onChange={setSelectedCar}
                      style={{ width: 180 }}
                      options={MOCK_CARS.map(c => ({ label: c.name, value: c.id }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">日志时间：</span>
                    <RangePicker 
                      showTime 
                      value={carTimeRange as any}
                      onChange={(val: any) => setCarTimeRange(val)}
                      style={{ width: 320 }}
                    />
                  </div>
                  <Button type="primary" icon={<Search className="w-4 h-4" />} className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500">
                    查询
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">任务编号：</span>
                    <Input 
                      placeholder="输入任务编号" 
                      value={taskIdKeyword}
                      onChange={e => setTaskIdKeyword(e.target.value)}
                      style={{ width: 200 }}
                      allowClear
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">开始时间：</span>
                    <RangePicker 
                      showTime 
                      value={taskTimeRange as any}
                      onChange={(val: any) => setTaskTimeRange(val)}
                      style={{ width: 320 }}
                    />
                  </div>
                  <Button type="primary" icon={<Search className="w-4 h-4" />} className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500">
                    查询
                  </Button>
                </>
              )}
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              {queryMode === 'car' ? (
                <Table 
                  columns={carLogColumns} 
                  dataSource={filteredCarLogs} 
                  rowKey="id"
                  pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                  size="middle"
                />
              ) : (
                <Table 
                  columns={taskColumns} 
                  dataSource={filteredTasks} 
                  rowKey="id"
                  pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                  size="middle"
                />
              )}
            </div>
          </div>
        </main>

        {/* Task Detail Drawer */}
        <Drawer
          title={<span className="text-cyan-400 font-bold">任务详情与日志时间轴</span>}
          placement="right"
          width={1000}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          className="custom-drawer"
          styles={{
            header: { borderBottom: '1px solid rgba(34, 211, 238, 0.2)' },
            body: { padding: '24px' }
          }}
          closeIcon={<span className="text-gray-400 hover:text-white text-lg">×</span>}
        >
          {currentTask && (
            <div className="flex flex-row h-full gap-6">
              {/* Left Side: Task Basic Info & Details */}
              <div className="flex-[3] flex flex-col h-full border-r border-cyan-900/50 pr-6 overflow-auto custom-scrollbar">
                <h3 className="text-cyan-400 font-medium mb-4 flex items-center shrink-0">
                  <Info className="w-4 h-4 mr-2" /> 任务主信息
                </h3>
                <div className="bg-[#1e293b] border border-cyan-900/50 rounded-lg p-4 mb-6 shrink-0">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-white">{currentTask.id}</span>
                    <StatusBadge status={currentTask.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-sm">
                    <div className="col-span-3">
                      <div className="text-gray-500 mb-1">任务名称</div>
                      <div className="text-gray-200">{currentTask.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">任务类型</div>
                      <div className="text-gray-200">{currentTask.type}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">触发方式</div>
                      <div className="text-gray-200">{currentTask.trigger || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">关联车辆</div>
                      <div className="text-gray-200">{currentTask.carId}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">计划时间</div>
                      <div className="text-gray-200">{currentTask.planTime || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">预计耗时 min</div>
                      <div className="text-gray-200">{currentTask.duration || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">实际开始时间</div>
                      <div className="text-cyan-400">{currentTask.startTime || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">结束时间</div>
                      <div className="text-gray-200">{currentTask.endTime || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">确认执行人</div>
                      <div className="text-gray-200">{currentTask.confirmUser || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">确认时间</div>
                      <div className="text-gray-200">{currentTask.confirmTime || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">创建人</div>
                      <div className="text-gray-200">{currentTask.createUser || '-'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-gray-500 mb-1">创建时间</div>
                      <div className="text-gray-200">{currentTask.createTime || '-'}</div>
                    </div>
                  </div>
                </div>

                <h3 className="text-cyan-400 font-medium mb-4 flex items-center shrink-0">
                  <MapPin className="w-4 h-4 mr-2" /> 任务明细子任务
                </h3>
                <div className="border border-cyan-900/50 rounded overflow-hidden shrink-0">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#1e293b]/60 border-b border-cyan-900/50">
                      <tr>
                        <th className="py-2.5 px-3 font-medium text-gray-400">序号</th>
                        <th className="py-2.5 px-3 font-medium text-gray-400">任务类型</th>
                        <th className="py-2.5 px-3 font-medium text-gray-400">装卸端/停靠点</th>
                        <th className="py-2.5 px-3 font-medium text-gray-400">操作类型</th>
                        <th className="py-2.5 px-3 font-medium text-gray-400">空桶数量</th>
                        <th className="py-2.5 px-3 font-medium text-gray-400">行驶距离/耗时</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-900/20 bg-[#0f172a]">
                      {(currentTask.children || []).map((child: any, idx: number) => (
                        <tr key={child.id || idx} className="hover:bg-[#1e293b]/40">
                          <td className="p-3 text-gray-400">[{child.seq}]</td>
                          <td className="p-3 text-gray-300">{child.type}</td>
                          <td className="p-3 text-cyan-300">{child.target}</td>
                          <td className="p-3 text-gray-300">{child.action}</td>
                          <td className="p-3 text-gray-300">{child.emptyCount}</td>
                          <td className="p-3 text-gray-300">
                            {child.type === '车辆调度' ? `${child.duration || '-'}/${child.distance || '-'}` : '-'}
                          </td>
                        </tr>
                      ))}
                      {(!currentTask.children || currentTask.children.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500">暂无明细数据</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Side: Timeline Logs */}
              <div className="flex-[2] flex flex-col h-full">
                <h3 className="text-gray-400 mb-4 text-sm font-medium flex items-center shrink-0">
                  <Clock className="w-4 h-4 mr-2" />
                  任务日志过程 (按时间逆序)
                </h3>
                <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                  {currentTaskLogs.length > 0 ? (
                    <Timeline
                      items={currentTaskLogs.map(log => ({
                        color: log.type === '正常' ? 'cyan' : log.type === '异常' ? 'yellow' : 'red',
                        dot: log.type === '异常' ? <AlertCircle className="w-4 h-4 text-yellow-400" /> : 
                             log.type === '报警' ? <AlertCircle className="w-4 h-4 text-red-400" /> : 
                             <CheckCircle2 className="w-4 h-4 text-cyan-400" />,
                        children: (
                          <div className="mb-4">
                            <div className="text-xs text-gray-500 mb-1">{log.time}</div>
                            <div className="bg-[#1e293b]/50 p-3 rounded border border-cyan-900/30">
                              <div className="flex items-center mb-1">
                                <TypeBadge type={log.type} />
                              </div>
                              <div className="text-sm text-gray-300 mt-2 leading-relaxed">
                                {log.content}
                              </div>
                            </div>
                          </div>
                        )
                      }))}
                    />
                  ) : (
                    <div className="text-center text-gray-500 py-10">暂无关联日志</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default Component;
