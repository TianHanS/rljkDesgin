/**
 * @name 数据监测
 */
import React, { useState } from 'react';
import { Tooltip } from 'antd';
import { 
  Truck, Video, Settings, Battery, BatteryCharging, Power, 
  AlertTriangle, Box, UploadCloud, DownloadCloud,
  X, Activity, Monitor, Wifi, WifiOff, MapPin, MapPinOff, ShieldAlert, AlertCircle
} from 'lucide-react';
import './style.css';

// --- Mock Data ---

const MOCK_AGVS = [
  {
    id: 'AGV-01',
    name: '01无人车',
    status: '运行', // 就绪、运行、暂停、故障
    flowStatus: '装车中', // 车辆对接中、装车中、卸车中、设备复位中
    mode: '自动',
    charging: false,
    battery: 85,
    gear: 'D', // D, R, P, N
    range: 120, // 剩余续航里程 (km)
    isOnline: true,
    gpsValid: true,
    isAlarming: false,
    needsAssistance: false,
    currentTaskId: 'T-20231024-001',
    taskStatus: '执行中', // 1: 预处理（已读取）, 2: 执行中, 3: 已完成, 4: 已取消（故障）
    lines: [
      { id: 1, capacity: 6, loaded: 0, type: '满桶', target: '1#汽采集样' },
      { id: 2, capacity: 6, loaded: 6, type: '空桶', target: '1#汽采集样' }
    ]
  }
];

const MOCK_LOADERS = [
  {
    id: 'L-01',
    name: '1#汽采集样',
    status: '运行',
    flowStatus: '装车中',
    emptyLine: { capacity: 10, current: 4 },
    workStation: { count: 2, empty: 1, full: 1 },
    fullLine: { capacity: 10, current: 5 }
  },
  {
    id: 'L-02',
    name: '2#汽采集样',
    status: '就绪',
    flowStatus: '设备复位中',
    emptyLine: { capacity: 10, current: 8 },
    workStation: { count: 2, empty: 2, full: 0 },
    fullLine: { capacity: 10, current: 2 }
  },
  {
    id: 'L-03',
    name: '火车采样集样',
    status: '运行',
    flowStatus: '装车中',
    emptyLine: { capacity: 10, current: 4 },
    workStation: { count: 2, empty: 1, full: 1 },
    fullLine: { capacity: 10, current: 5 }
  }
];

const MOCK_UNLOADERS = [
  {
    id: 'U-01',
    name: '1号卸车端(制样间)',
    status: '运行',
    flowStatus: '卸车中',
    emptyStored: 12
  }
];

// --- Components ---

const StatusBadge = ({ status }: { status: string }) => {
  let colorClass = 'text-green-400 border-green-400/30 bg-green-400/10';
  if (status === '故障' || status === '异常' || status === '报警') colorClass = 'text-red-400 border-red-400/30 bg-red-400/10';
  if (status === '暂停') colorClass = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
  if (status === '就绪') colorClass = 'text-gray-400 border-gray-400/30 bg-gray-400/10';
  if (status === '运行') colorClass = 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';

  return (
    <span className={`px-2 py-0.5 text-xs border rounded ${colorClass}`}>
      {status}
    </span>
  );
};

const Component = () => {
  const [activeMenu1, setActiveMenu1] = useState('主界面');
  const [activeMenu2, setActiveMenu2] = useState('数据监测');
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [controlModalOpen, setControlModalOpen] = useState(false);
  const [selectedAgv, setSelectedAgv] = useState<any>(null);

  const openVideo = (agv: any) => {
    setSelectedAgv(agv);
    setVideoModalOpen(true);
  };

  const openControl = (agv: any) => {
    setSelectedAgv(agv);
    setControlModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-gray-200 font-sans overflow-hidden flex flex-col dispatch-workbench-root">
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
        {['工作台', '数据监测', '任务管理', '任务日志查询', '车辆监控', '车辆调试', '报警查询'].map(item => (
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-6 bg-[#0b1120] custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          
          {/* 1. 转运小车区块 */}
          {MOCK_AGVS.map(agv => (
            <div key={agv.id} className="bg-[#1e293b] border border-cyan-900/50 rounded-lg p-5 shadow-lg relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <div className="flex items-center space-x-2">
                    <Truck className="w-5 h-5 text-cyan-400" />
                    <span className="font-medium text-gray-100">{agv.name}</span>
                    <span className="text-xs text-gray-500">{agv.id}</span>
                    <div className="flex items-center space-x-1.5 ml-2">
                      <Tooltip title={agv.isOnline ? "在线" : "离线"} placement="top">
                        <span className="inline-block">
                          {agv.isOnline ? (
                            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <WifiOff className="w-3.5 h-3.5 text-gray-500" />
                          )}
                        </span>
                      </Tooltip>
                      <Tooltip title={agv.gpsValid ? "定位有效" : "定位失效"} placement="top">
                        <span className="inline-block">
                          {agv.gpsValid ? (
                            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <MapPinOff className="w-3.5 h-3.5 text-gray-500" />
                          )}
                        </span>
                      </Tooltip>
                      {agv.isAlarming && (
                        <Tooltip title="报警中" placement="top">
                          <div className="animate-pulse">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                          </div>
                        </Tooltip>
                      )}
                      {agv.needsAssistance && (
                        <Tooltip title="请求人工辅助" placement="top">
                          <div className="animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                          </div>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex space-x-2">
                    <StatusBadge status={agv.status} />
                    <span className="px-2 py-0.5 text-xs border rounded text-blue-400 border-blue-400/30 bg-blue-400/10">
                      {agv.mode}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => openVideo(agv)}
                    className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-900/30 rounded transition-colors"
                    title="实时监控"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => openControl(agv)}
                    className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-900/30 rounded transition-colors"
                    title="控制面板"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2 bg-gray-800/30 p-2 rounded border border-cyan-900/30 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">执行任务</div>
                    <div className="text-sm text-cyan-300 font-mono">{agv.currentTaskId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">任务状态</div>
                    <div className="text-sm text-gray-200">
                      {agv.taskStatus === '预处理（已读取）' && <span className="text-yellow-400">{agv.taskStatus}</span>}
                      {agv.taskStatus === '执行中' && <span className="text-cyan-400">{agv.taskStatus}</span>}
                      {agv.taskStatus === '已完成' && <span className="text-green-400">{agv.taskStatus}</span>}
                      {agv.taskStatus === '已取消（故障）' && <span className="text-red-400">{agv.taskStatus}</span>}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">流程状态</div>
                  <div className="text-sm text-gray-200">{agv.flowStatus}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 flex items-center">
                    电池状态
                    {agv.charging ? (
                      <BatteryCharging className="w-3 h-3 ml-1 text-green-400" />
                    ) : (
                      <Battery className="w-3 h-3 ml-1 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${agv.battery > 20 ? 'bg-green-500' : 'bg-red-500'}`} 
                        style={{ width: `${agv.battery}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-300">{agv.battery}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">当前档位</div>
                  <div className="text-sm text-gray-200 font-mono">{agv.gear} 档</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">剩余续航</div>
                  <div className="text-sm text-gray-200 font-mono">{agv.range} km</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-500 mb-1">滚筒线状态</div>
                {agv.lines.map((line, idx) => (
                  <div key={line.id} className="bg-gray-800/50 rounded p-2 text-xs border border-cyan-900/20">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-400">滚筒线 {idx + 1} ({line.type})</span>
                      <span className="text-cyan-400 font-mono">{line.loaded}/{line.capacity}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-700/50">
                      <span className="text-gray-500">目标端</span>
                      <span className="text-gray-300">{line.target}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 2. 装车端区块 */}
          {MOCK_LOADERS.map(loader => (
            <div key={loader.id} className="bg-[#1e293b] border border-purple-900/50 rounded-lg p-5 shadow-lg relative overflow-hidden group hover:border-purple-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <div className="flex items-center space-x-2">
                    <UploadCloud className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-gray-100">{loader.name}</span>
                    <span className="text-xs text-gray-500">{loader.id}</span>
                  </div>
                  <div className="mt-2 flex space-x-2">
                    <StatusBadge status={loader.status} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">流程状态</div>
                  <div className="text-sm text-purple-300">{loader.flowStatus}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-800/30 border border-purple-900/20 rounded">
                  <div className="text-sm text-gray-400">空桶缓存线</div>
                  <div className="text-sm font-mono">
                    <span className="text-gray-200 text-lg">{loader.emptyLine.current}</span>
                    <span className="text-gray-500 ml-1">/ {loader.emptyLine.capacity}</span>
                  </div>
                </div>
                
                <div className="p-3 bg-gray-800/30 border border-purple-900/20 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-400">集样器工位 (共 {loader.workStation.count} 个)</div>
                  </div>
                  <div className="flex space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <Box className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400">空桶: <span className="text-gray-200 font-mono text-lg ml-1">{loader.workStation.empty}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Box className="w-4 h-4 text-purple-400 fill-purple-400/20" />
                      <span className="text-gray-400">满桶: <span className="text-purple-300 font-mono text-lg ml-1">{loader.workStation.full}</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-800/30 border border-purple-900/20 rounded">
                  <div className="text-sm text-gray-400">满桶缓存线</div>
                  <div className="text-sm font-mono">
                    <span className="text-purple-400 text-lg">{loader.fullLine.current}</span>
                    <span className="text-gray-500 ml-1">/ {loader.fullLine.capacity}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* 3. 卸车端区块 */}
          {MOCK_UNLOADERS.map(unloader => (
            <div key={unloader.id} className="bg-[#1e293b] border border-orange-900/50 rounded-lg p-5 shadow-lg relative overflow-hidden group hover:border-orange-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <div className="flex items-center space-x-2">
                    <DownloadCloud className="w-5 h-5 text-orange-400" />
                    <span className="font-medium text-gray-100">{unloader.name}</span>
                    <span className="text-xs text-gray-500">{unloader.id}</span>
                  </div>
                  <div className="mt-2 flex space-x-2">
                    <StatusBadge status={unloader.status} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">流程状态</div>
                  <div className="text-sm text-orange-300">{unloader.flowStatus}</div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded mt-4">
                <div className="text-sm text-gray-400">暂存空桶数</div>
                <div className="text-xl font-mono text-orange-400">{unloader.emptyStored}</div>
              </div>
            </div>
          ))}

        </div>
      </main>

      {/* Video Modal */}
      {videoModalOpen && selectedAgv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b1120] border border-cyan-900/50 rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-3 bg-gray-900 border-b border-cyan-900/50">
              <div className="flex items-center space-x-2">
                <Video className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-gray-200">{selectedAgv.name} - 实时监控</span>
              </div>
              <button 
                onClick={() => setVideoModalOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black relative flex items-center justify-center group">
              <div className="absolute top-4 left-4 text-xs font-mono text-white/50 z-10 flex flex-col gap-1">
                <span>CAM: AGV-FRONT</span>
                <span>FPS: 30</span>
                <span>RES: 1080P</span>
              </div>
              <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
                <span className="flex items-center text-xs text-red-500 font-mono bg-black/50 px-2 py-1 rounded">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />
                  REC
                </span>
                <span className="text-xs text-white/70 font-mono bg-black/50 px-2 py-1 rounded">
                  {new Date().toISOString().replace('T', ' ').substring(0, 19)}
                </span>
              </div>
              <Video className="w-16 h-16 text-cyan-900/40 opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      )}

      {/* Control Modal */}
      {controlModalOpen && selectedAgv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-cyan-900/50 rounded-lg w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <span className="text-base font-medium text-gray-200">{selectedAgv.name} - 控制台</span>
              </div>
              <button 
                onClick={() => setControlModalOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="bg-gray-800/50 rounded p-3 mb-6 flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500 mb-1">当前状态</div>
                  <StatusBadge status={selectedAgv.status} />
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">电量</div>
                  <div className="text-sm font-mono text-cyan-400">{selectedAgv.battery}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-colors ${
                    selectedAgv.status === '就绪' 
                      ? 'border-cyan-700/50 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400' 
                      : 'border-gray-800 bg-gray-800/20 text-gray-600 cursor-not-allowed'
                  }`}
                  disabled={selectedAgv.status !== '就绪'}
                >
                  <BatteryCharging className="w-6 h-6 mb-2" />
                  <span className="text-sm">前往充电</span>
                </button>
                
                <button className="p-3 rounded-lg border border-cyan-700/50 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 flex flex-col items-center justify-center transition-colors">
                  <Truck className="w-6 h-6 mb-2" />
                  <span className="text-sm">小车回库</span>
                </button>

                <button className="p-3 rounded-lg border border-yellow-700/50 bg-yellow-900/20 hover:bg-yellow-900/40 text-yellow-400 flex flex-col items-center justify-center transition-colors">
                  <Power className="w-6 h-6 mb-2" />
                  <span className="text-sm">开/关舱门</span>
                </button>

                <button className="p-3 rounded-lg border border-purple-700/50 bg-purple-900/20 hover:bg-purple-900/40 text-purple-400 flex flex-col items-center justify-center transition-colors">
                  <Settings className="w-6 h-6 mb-2" />
                  <span className="text-sm">调试操作</span>
                </button>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-800 bg-gray-900/50 rounded-b-lg">
              <div className="text-xs text-gray-500 flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1 text-yellow-500" />
                控制指令将直接下发至设备，请谨慎操作
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Component;
