/**
 * @name 小车监控
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, Video, Play, Pause, Maximize, VolumeX, Volume2, Camera,
  Battery, BatteryCharging, Zap, AlertTriangle, Info, Clock, CheckCircle2,
  Truck, ShieldAlert, Cpu, Wifi, WifiOff, PowerOff, StopCircle, RefreshCw,
  ChevronDown, Square
} from 'lucide-react';
import { Modal, message, Table, Tag, Tooltip } from 'antd';
import 'tailwindcss';
import './style.css'; // Using the standard style.css reference

// --- Mock Data ---
const MOCK_AGVS = [
  {
    id: 'AGV-01',
    name: '01无人车',
    basicInfo: {
      online: true,
      positioningStatus: '有效',
      currentTaskId: 'T-20231025-001',
      taskStatusValue: '2-执行中',
      gear: '3-D',
      speed: '15.5 km/h',
      taskStatus: '正在执行'
    },
    operationInfo: {
      runningStatus: '运行',
      flowStatus: '装车中',
      operationMode: '自动',
      cabinetDoor: '关闭',
      rollers: [
        { id: 1, capacity: 6, loaded: 2, type: '空桶', target: '1#汽车集样' },
        { id: 2, capacity: 6, loaded: 6, type: '满桶', target: '制样归批' }
      ]
    },
    monitorParams: {
      commsStatus: '正常',
      battery: {
        level: 85,
        isCharging: false,
        range: '120 km',
        totalMileage: '5400 km',
        temp: '35°C',
        current: '15A',
        voltage: '72V'
      },
      assistRequests: [
        { type: '1-防撞触发', time: '10:05:22' },
        { type: '33-车端按钮急停', time: '10:04:15' }
      ],
      faults: [
        { name: '激光雷达遮挡', type: '0-传感器', time: '09:50:00', status: '1-已解除' }
      ]
    },
    tasks: [
      {
        id: 'T-20231025-001',
        name: '前往1#汽车集样',
        type: '车辆调度',
        target: '1#汽车集样',
        status: '正在执行',
        createTime: '2023-10-25 10:00:00',
        subTasks: [
          { id: 'ST-01', name: '行驶至目标点', status: '正在执行' },
          { id: 'ST-02', name: '靠边对接', status: '未执行' }
        ]
      },
      {
        id: 'T-20231025-002',
        name: '装载空桶',
        type: '样桶装卸',
        target: '1#汽车集样',
        status: '未执行',
        createTime: '2023-10-25 10:05:00',
        subTasks: [
          { id: 'ST-03', name: '打开柜门', status: '未执行' },
          { id: 'ST-04', name: '滚筒线输送', status: '未执行' }
        ]
      }
    ],
    logs: [
      { id: 1, time: '10:00:05', type: 'info', content: '接收到新任务 T-20231025-001' },
      { id: 2, time: '10:01:00', type: 'info', content: '开始执行任务：前往1#汽车集样' },
      { id: 3, time: '10:05:22', type: 'warning', content: '防撞触发，减速行驶' },
      { id: 4, time: '10:06:10', type: 'info', content: '恢复正常行驶' },
    ],
    streams: {
      surround: 'surround-stream-url',
      rear: 'rear-stream-url'
    }
  },
  {
    id: 'AGV-02',
    name: '02无人车',
    basicInfo: {
      online: true,
      positioningStatus: '有效',
      currentTaskId: '-',
      taskStatusValue: '-',
      gear: '1-P',
      speed: '0 km/h',
      taskStatus: '未执行任务'
    },
    operationInfo: {
      runningStatus: '就绪',
      flowStatus: '待命',
      operationMode: '自动',
      cabinetDoor: '关闭',
      rollers: [
        { id: 1, capacity: 6, loaded: 0, type: '空桶', target: '-' },
        { id: 2, capacity: 6, loaded: 0, type: '空桶', target: '-' }
      ]
    },
    monitorParams: {
      battery: { level: 20, isCharging: true, voltage: '49.1V', current: '-20.0A', temp: '38℃', totalMileage: '850km', range: '充电中' },
      assistRequests: [
        { type: '0-无路通行', time: '09:15:22' },
        { type: '17-主驱异常', time: '09:10:05' }
      ],
      faults: [
        { id: 'F001', name: '驱动器温度过高', type: '警告', status: '2-未解除', time: '10:00:15' }
      ],
      commsStatus: '异常'
    },
    tasks: [
      {
        id: 'T-20231025-003',
        name: '前往充电桩',
        type: '车辆调度',
        target: '1#充电区',
        status: '未执行',
        createTime: '2023-10-25 09:30:00',
        subTasks: [
          { id: 'ST-05', name: '行驶至充电区', status: '未执行' },
          { id: 'ST-06', name: '对接充电口', status: '未执行' }
        ]
      }
    ],
    logs: [
      { id: 1, time: '09:20:00', type: 'info', content: '完成上一任务，设备复位中' },
      { id: 2, time: '09:25:00', type: 'info', content: '设备复位完成，处于就绪状态' },
      { id: 3, time: '09:30:00', type: 'info', content: '接收到新任务 T-20231025-003' },
    ],
    streams: {
      surround: 'surround-stream-url-2',
      rear: 'rear-stream-url-2'
    }
  }
];

// --- Sub-components ---

const StatusBadge = ({ status }: { status: string }) => {
  let colorClass = 'text-gray-400 border-gray-400/30 bg-gray-400/10';
  if (status === '正在执行' || status === '运行' || status === '有效' || status === '正常') {
    colorClass = 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';
  } else if (status === '未执行任务' || status === '未执行' || status === '就绪' || status === '关闭') {
    colorClass = 'text-gray-400 border-gray-400/30 bg-gray-400/10';
  } else if (status === '暂停' || status === '报警' || status?.includes('急停') || status === '无效') {
    colorClass = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
  } else if (status === '异常' || status === '故障' || status === '终止') {
    colorClass = 'text-red-400 border-red-400/30 bg-red-400/10';
  }

  return (
    <span className={`px-2 py-0.5 text-xs border rounded whitespace-nowrap ${colorClass}`}>
      {status}
    </span>
  );
};

const VideoPlayer = ({ title, src }: { title: string, src: string }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleScreenshot = () => {
    message.success(`${title} 截图已保存`);
  };

  return (
    <div ref={containerRef} className="relative bg-[#0f172a] rounded-lg overflow-hidden border border-cyan-900/30 flex flex-col h-full min-h-[240px] group">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-3 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 text-gray-200">
          <Video size={16} className="text-cyan-400" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-xs text-red-400 font-medium">LIVE</span>
        </div>
      </div>

      {/* Video Content Placeholder */}
      <div className="flex-1 flex items-center justify-center bg-black/40">
        {isPlaying ? (
          <div className="text-gray-500 flex flex-col items-center gap-2">
            <Camera size={32} className="animate-pulse" />
            <span className="text-xs">接收视频流: {src}</span>
          </div>
        ) : (
          <div className="text-gray-600">已暂停</div>
        )}
      </div>

      {/* Bottom Controls (Hover) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsPlaying(!isPlaying)} className="text-gray-300 hover:text-cyan-400 transition-colors">
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button onClick={() => setIsMuted(!isMuted)} className="text-gray-300 hover:text-cyan-400 transition-colors">
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleScreenshot} className="text-gray-300 hover:text-cyan-400 transition-colors" title="截图">
            <Camera size={18} />
          </button>
          <button onClick={toggleFullscreen} className="text-gray-300 hover:text-cyan-400 transition-colors" title="全屏">
            <Maximize size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---
const Component = () => {
  const [activeMenu1, setActiveMenu1] = useState('主界面');
  const [activeMenu2, setActiveMenu2] = useState('车辆监控');
  const [activeAgvId, setActiveAgvId] = useState(MOCK_AGVS[0].id);
  const [agvData, setAgvData] = useState(MOCK_AGVS[0]);
  const [globalVideoPlaying, setGlobalVideoPlaying] = useState(true);

  useEffect(() => {
    const agv = MOCK_AGVS.find(a => a.id === activeAgvId) || MOCK_AGVS[0];
    setAgvData(agv);
  }, [activeAgvId]);

  const handleTaskAction = (action: string, task: any) => {
    Modal.confirm({
      title: `确认${action}任务?`,
      content: `您正在对任务【${task.name}】执行${action}操作，是否确认？`,
      okText: '确认',
      cancelText: '取消',
      centered: true,
      className: 'dark-modal', // Custom class for dark theme overrides if needed
      onOk: () => {
        message.success(`已${action}任务: ${task.name}`);
        // In a real app, update state or call API here
      }
    });
  };

  const taskColumns = [
    { title: '任务名称', dataIndex: 'name', key: 'name', className: 'text-gray-300' },
    { title: '类型', dataIndex: 'type', key: 'type', className: 'text-gray-400' },
    { title: '目标端', dataIndex: 'target', key: 'target', className: 'text-gray-400' },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: any) => {
        return (
          <div className="flex gap-2">
            {record.status === '未执行' && (
              <button onClick={() => handleTaskAction('执行', record)} className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors flex items-center gap-1">
                <Play size={14} /> 执行
              </button>
            )}
            {record.status === '正在执行' && (
              <>
                <button onClick={() => handleTaskAction('暂停', record)} className="text-yellow-400 hover:text-yellow-300 text-xs transition-colors flex items-center gap-1">
                  <Pause size={14} /> 暂停
                </button>
                <button onClick={() => handleTaskAction('终止', record)} className="text-red-400 hover:text-red-300 text-xs transition-colors flex items-center gap-1">
                  <StopCircle size={14} /> 终止
                </button>
              </>
            )}
            {record.status === '暂停' && (
              <button onClick={() => handleTaskAction('恢复', record)} className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors flex items-center gap-1">
                <RefreshCw size={14} /> 恢复
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="min-h-screen bg-[#0b1120] text-gray-200 font-sans overflow-hidden flex flex-col agv-monitoring-root">
      
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
            <PowerOff className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Level 2 Menu */}
      <div className="h-12 bg-[#0f172a]/50 border-b border-cyan-900/30 flex items-center px-6 space-x-8 shrink-0">
        {['工作台', '任务管理', '任务日志查询', '车辆监控', '车辆调试', '报警查询'].map(item => (
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
      <main className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg px-4 py-2 shrink-0">
          {/* AGV Switcher */}
          <div className="flex bg-[#0f172a]/80 p-1 rounded border border-cyan-900/30">
            {MOCK_AGVS.map(agv => (
              <button
                key={agv.id}
                onClick={() => setActiveAgvId(agv.id)}
                className={`px-4 py-1 text-sm rounded transition-all duration-200 flex items-center gap-2 ${
                  activeAgvId === agv.id 
                    ? 'bg-cyan-900/60 text-cyan-300 shadow-sm border border-cyan-500/30' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-cyan-900/20 border border-transparent'
                }`}
              >
                <Truck size={14} />
                {agv.name}
                <span className={`w-2 h-2 rounded-full ${agv.basicInfo.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </button>
            ))}
          </div>

          {/* Global Video Controls */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">全局视频控制</span>
            <button 
              onClick={() => setGlobalVideoPlaying(!globalVideoPlaying)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a]/80 hover:bg-cyan-900/40 text-gray-200 rounded border border-cyan-900/50 transition-colors text-sm"
            >
              {globalVideoPlaying ? <Pause size={14} className="text-yellow-400"/> : <Play size={14} className="text-cyan-400"/>}
              {globalVideoPlaying ? '全部暂停' : '全部播放'}
            </button>
          </div>
        </div>

        {/* Top Row: Info & Videos (4 columns) */}
        <div className="grid grid-cols-4 gap-4 shrink-0 h-[280px]">
          
          {/* Column 1: Vehicle Info */}
          <div className="bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg p-3 h-full flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-cyan-900/30 text-white font-medium shrink-0">
              <Info size={14} className="text-cyan-400" />
              <span className="text-sm">车辆信息</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                <div className="flex justify-between items-center col-span-2">
                  <span className="text-gray-500">当前执行任务编号</span>
                  <span className="text-cyan-400 font-medium">{agvData.basicInfo.currentTaskId}</span>
                </div>
                <div className="flex justify-between items-center col-span-2">
                  <span className="text-gray-500">任务状态</span>
                  <span className="text-gray-200">{agvData.basicInfo.taskStatusValue}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">小车编号</span>
                  <span className="text-gray-200 font-medium">{agvData.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">在线状态</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${agvData.basicInfo.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-gray-200">{agvData.basicInfo.online ? '在线' : '离线'}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">任务执行状态</span>
                  <StatusBadge status={agvData.basicInfo.taskStatus} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">定位状态</span>
                  <StatusBadge status={agvData.basicInfo.positioningStatus} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">当前档位</span>
                  <span className="text-gray-200">{agvData.basicInfo.gear}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">运行速度</span>
                  <span className="text-cyan-400 font-mono">{agvData.basicInfo.speed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">运行状态</span>
                  <StatusBadge status={agvData.operationInfo.runningStatus} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">操作模式</span>
                  <span className="text-gray-200">{agvData.operationInfo.operationMode}</span>
                </div>
                <div className="flex justify-between items-center col-span-2">
                  <span className="text-gray-500">柜门状态</span>
                  <StatusBadge status={agvData.operationInfo.cabinetDoor} />
                </div>
              </div>

              {/* Rollers Info */}
              <div className="mt-2 pt-2 border-t border-cyan-900/30">
                <h4 className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider">滚筒线状态</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {agvData.operationInfo.rollers.map(roller => (
                    <div key={roller.id} className="bg-[#0f172a]/60 rounded border border-cyan-900/30 p-1.5 flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded bg-cyan-900/40 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">{roller.id}</span>
                        <span className="text-gray-300 text-[10px] truncate" title={roller.target}>{roller.target}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-gray-200 font-mono text-[10px]">{roller.loaded}<span className="text-gray-600">/</span>{roller.capacity}</span>
                        <span className={`text-[10px] font-medium ${roller.type === '满桶' ? 'text-yellow-400' : 'text-cyan-400'}`}>{roller.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Monitor Params */}
          <div className="bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg p-3 h-full flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between pb-1.5 border-b border-cyan-900/30 shrink-0">
              <div className="flex items-center gap-2 text-white font-medium">
                <Cpu size={14} className="text-cyan-400" />
                <span className="text-sm">监控参数</span>
              </div>
              {agvData.monitorParams.commsStatus === '正常' ? (
                <div className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded border border-green-400/20">
                  <Wifi size={12} /> 通讯正常
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20">
                  <WifiOff size={12} /> 通讯异常
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
              {/* Battery Section */}
              <div className="bg-[#0f172a]/60 rounded border border-cyan-900/30 p-2.5 shrink-0">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-1.5">
                    {agvData.monitorParams.battery.isCharging ? (
                      <BatteryCharging size={18} className="text-green-400" />
                    ) : (
                      <Battery size={18} className={agvData.monitorParams.battery.level > 20 ? 'text-cyan-400' : 'text-red-400'} />
                    )}
                    <span className="text-lg font-bold text-white font-mono leading-none">
                      {agvData.monitorParams.battery.level}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 block leading-tight">续航里程</span>
                    <span className="text-xs text-gray-200 font-mono leading-tight">{agvData.monitorParams.battery.range}</span>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden mb-2.5">
                  <div 
                    className={`h-full rounded-full ${
                      agvData.monitorParams.battery.isCharging ? 'bg-green-400 animate-pulse' : 
                      agvData.monitorParams.battery.level > 20 ? 'bg-cyan-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${agvData.monitorParams.battery.level}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                  <div className="bg-[#1e293b]/40 rounded p-1 border border-cyan-900/30">
                    <span className="text-gray-500 block mb-0.5 leading-tight">电压</span>
                    <span className="text-gray-300 font-mono leading-tight">{agvData.monitorParams.battery.voltage}</span>
                  </div>
                  <div className="bg-[#1e293b]/40 rounded p-1 border border-cyan-900/30">
                    <span className="text-gray-500 block mb-0.5 leading-tight">电流</span>
                    <span className="text-gray-300 font-mono leading-tight">{agvData.monitorParams.battery.current}</span>
                  </div>
                  <div className="bg-[#1e293b]/40 rounded p-1 border border-cyan-900/30">
                    <span className="text-gray-500 block mb-0.5 leading-tight">温度</span>
                    <span className="text-gray-300 font-mono leading-tight">{agvData.monitorParams.battery.temp}</span>
                  </div>
                  <div className="bg-[#1e293b]/40 rounded p-1 border border-cyan-900/30">
                    <span className="text-gray-500 block mb-0.5 leading-tight">总里程</span>
                    <span className="text-gray-300 font-mono leading-tight">{agvData.monitorParams.battery.totalMileage}</span>
                  </div>
                </div>
              </div>

              {/* Faults & Requests */}
              <div className="flex-1 grid grid-cols-2 gap-2 min-h-[120px]">
                <div className="bg-[#0f172a]/60 rounded border border-cyan-900/30 p-2 flex flex-col gap-1.5 h-full">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 shrink-0">
                    <AlertTriangle size={10} className="text-yellow-400" />
                    辅助请求 ({agvData.monitorParams.assistRequests.length})
                  </span>
                  <div className="flex-1 overflow-y-auto mb-1">
                    {agvData.monitorParams.assistRequests.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {agvData.monitorParams.assistRequests.map((req, i) => (
                          <div key={i} className="text-[10px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded p-1 flex justify-between leading-tight">
                            <span className="truncate w-16" title={req.type}>{req.type.split('-')[1] || req.type}</span>
                            <span className="font-mono opacity-70 shrink-0">{req.time}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-gray-600">无请求</div>
                    )}
                  </div>
                </div>
                  
                <div className="bg-[#0f172a]/60 rounded border border-cyan-900/30 p-2 flex flex-col gap-1.5 h-full">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 shrink-0">
                    <ShieldAlert size={10} className="text-red-400" />
                    实时故障 ({agvData.monitorParams.faults.length})
                  </span>
                  <div className="flex-1 overflow-y-auto">
                    {agvData.monitorParams.faults.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {agvData.monitorParams.faults.map((fault, i) => (
                          <div key={i} className={`text-[10px] rounded p-1 flex flex-col gap-0.5 border leading-tight ${
                            fault.status === '1-已解除' 
                              ? 'bg-gray-800/50 text-gray-400 border-gray-700' 
                              : 'bg-red-400/10 text-red-400 border-red-400/20'
                          }`}>
                            <div className="flex justify-between font-medium">
                              <span className="truncate w-16" title={fault.name}>{fault.name}</span>
                              <span className="font-mono opacity-70 shrink-0">{fault.time}</span>
                            </div>
                            <div className="flex justify-between opacity-80 text-[9px]">
                              <span>{fault.type}</span>
                              <span>{fault.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-gray-600">无故障</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Surround Video */}
          <div className="h-[280px]">
            <VideoPlayer 
              title="环视视角监控" 
              src={agvData.streams.surround} 
            />
          </div>

          {/* Column 4: Rear Video */}
          <div className="h-[280px]">
            <VideoPlayer 
              title="后视视角监控" 
              src={agvData.streams.rear} 
            />
          </div>
        </div>

        {/* Bottom Row: Tasks & Logs */}
        <div className="flex-1 flex gap-4 min-h-[300px]">
          {/* Tasks Panel */}
          <div className="flex-1 bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-cyan-900/30 text-white font-medium shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-cyan-400" />
                <span>任务信息</span>
              </div>
              <span className="text-xs text-gray-500">优先展示正在执行的任务</span>
            </div>
            
            <div className="flex-1 bg-[#0f172a]/80 border border-cyan-900/50 rounded overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-max min-w-full text-left border-collapse text-sm">
                  <thead className="bg-[#1e293b]/60 text-gray-400 sticky top-0 z-20 shadow-md">
                    <tr>
                      <th className="py-2.5 px-4 font-medium w-10 sticky left-0 bg-[#1e293b]/60"></th>
                      <th className="py-2.5 px-4 font-medium sticky left-10 bg-[#1e293b]/60 z-30">任务编号 / 序号</th>
                      <th className="py-2.5 px-4 font-medium">触发方式 / 任务类型</th>
                      <th className="py-2.5 px-4 font-medium">作业小车 / 装卸端</th>
                      <th className="py-2.5 px-4 font-medium">计划时间 / 操作类型</th>
                      <th className="py-2.5 px-4 font-medium">开始时间 / 空桶数</th>
                      <th className="py-2.5 px-4 font-medium">结束时间</th>
                      <th className="py-2.5 px-4 font-medium">确认执行人</th>
                      <th className="py-2.5 px-4 font-medium sticky right-24 bg-[#1e293b]/60 z-30">任务状态</th>
                      <th className="py-2.5 px-4 font-medium text-right sticky right-0 bg-[#1e293b]/60 z-30 w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-900/20">
                    {/* Only show the first task to save space */}
                    {agvData.tasks.slice(0, 1).map(task => (
                      <React.Fragment key={task.id}>
                        <tr className="hover:bg-cyan-900/20 transition-colors group bg-[#1e293b]/20">
                          <td className="py-2.5 px-4 sticky left-0 bg-[#1e293b] group-hover:bg-cyan-900/40 z-10">
                            <button className="text-cyan-500 hover:text-cyan-300 transition-colors">
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-cyan-300 font-medium sticky left-10 bg-[#1e293b] group-hover:bg-cyan-900/40 z-20 whitespace-nowrap">
                            T-{new Date().getFullYear()}{new Date().getMonth()+1}{new Date().getDate()}-{task.id.split('-')[1]}
                          </td>
                          <td className="py-2.5 px-4 text-gray-200 whitespace-nowrap">自动下发</td>
                          <td className="py-2.5 px-4 text-gray-200 whitespace-nowrap">{agvData.name}</td>
                          <td className="py-2.5 px-4 text-gray-400 whitespace-nowrap">-</td>
                          <td className="py-2.5 px-4 text-gray-400 whitespace-nowrap">10:01:00</td>
                          <td className="py-2.5 px-4 text-gray-400 whitespace-nowrap">-</td>
                          <td className="py-2.5 px-4 text-gray-400 whitespace-nowrap">系统</td>
                          <td className="py-2.5 px-4 sticky right-24 bg-[#1e293b] group-hover:bg-cyan-900/40 z-20">
                            <StatusBadge status={task.status} />
                          </td>
                          <td className="py-2.5 px-4 text-right space-x-3 sticky right-0 bg-[#1e293b] group-hover:bg-cyan-900/40 z-20 whitespace-nowrap">
                            {task.status === '正在执行' && (
                              <>
                                <button onClick={() => handleTaskAction('暂停', task)} className="text-yellow-400 hover:text-yellow-300 transition-colors" title="暂停"><Pause className="w-4 h-4 inline" /></button>
                                <button onClick={() => handleTaskAction('终止', task)} className="text-red-400 hover:text-red-300 transition-colors" title="终止"><Square className="w-4 h-4 inline" /></button>
                              </>
                            )}
                          </td>
                        </tr>
                        {/* Sub Tasks */}
                        {task.subTasks.map((child: any, idx: number) => (
                          <tr key={child.id} className="hover:bg-cyan-900/10 transition-colors bg-[#0b1120]/40">
                            <td className="sticky left-0 bg-[#0b1120] group-hover:bg-cyan-900/20 z-10"></td>
                            <td className="py-2 px-4 pl-12 border-l-2 border-cyan-900/30 text-gray-400 relative sticky left-10 bg-[#0b1120] group-hover:bg-cyan-900/20 z-20 whitespace-nowrap text-xs">
                              <span className="absolute left-0 top-1/2 w-8 border-t-2 border-cyan-900/30 -mt-[1px]"></span>
                              [序号 {idx + 1}]
                            </td>
                            <td className="py-2 px-4 text-gray-300 whitespace-nowrap text-xs">{child.name.includes('调度') ? '车辆调度' : '样桶装卸'}</td>
                            <td className="py-2 px-4 text-cyan-300 whitespace-nowrap text-xs">{task.target}</td>
                            <td className="py-2 px-4 text-gray-300 whitespace-nowrap text-xs">{child.name.includes('调度') ? '-' : '31卸空桶装满桶'}</td>
                            <td className="py-2 px-4 text-gray-300 whitespace-nowrap text-xs">{child.name.includes('调度') ? '-' : '4'}</td>
                            <td className="py-2 px-4" colSpan={2}></td>
                            <td className="py-2 px-4 sticky right-24 bg-[#0b1120] group-hover:bg-cyan-900/20 z-20 text-xs">
                              <span className={child.status === '已完成' ? 'text-green-500' : child.status === '正在执行' ? 'text-cyan-400' : 'text-gray-500'}>
                                {child.status}
                              </span>
                            </td>
                            <td className="sticky right-0 bg-[#0b1120] group-hover:bg-cyan-900/20 z-20"></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Running Logs */}
          <div className="w-[400px] shrink-0 bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-cyan-900/30 shrink-0">
              <div className="flex items-center gap-2 text-white font-medium">
                <Clock size={16} className="text-cyan-400" />
                <span>运行日志</span>
              </div>
              <span className="text-xs text-gray-500">实时滚动</span>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex flex-col gap-3">
                {agvData.logs.map(log => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <span className="text-gray-500 shrink-0 font-mono">{log.time}</span>
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      log.type === 'info' ? 'bg-cyan-500' :
                      log.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></span>
                    <span className="text-gray-300 leading-snug">{log.content}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Component;
