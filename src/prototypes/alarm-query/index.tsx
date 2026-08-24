/**
 * @name 报警查询
 */
import React, { useState, useMemo } from 'react';
import { 
  Monitor, Power, Search, RefreshCw, AlertTriangle, 
  Info, Calendar, X, Check, Clock, User
} from 'lucide-react';
import './style.css';

// --- Mock Data ---
const INITIAL_ALARMS = [
  { id: 'AL-20231024-001', object: '01无人车', level: '严重', type: '故障', content: '前激光雷达避障触发，车辆急停', time: '2023-10-24 10:05:00', endTime: '-', status: '报警中', operator: '-', operateTime: '-' },
  { id: 'AL-20231024-002', object: '2#汽采集样', level: '严重', type: '-', content: '设备通讯中断，离线报警', time: '2023-10-24 09:50:12', endTime: '-', status: '-', operator: '-', operateTime: '-' },
  { id: 'AL-20231024-003', object: '02有人车', level: '普通', type: '辅助请求', content: '电量低于20%，请求回充', time: '2023-10-24 09:30:00', endTime: '2023-10-24 09:35:00', status: '已解除', operator: '系统自动', operateTime: '2023-10-24 09:35:00' },
  { id: 'AL-20231024-004', object: '制样归批', level: '普通', type: '-', content: '卸样端空桶数量不足预警', time: '2023-10-24 08:15:22', endTime: '2023-10-24 08:45:00', status: '-', operator: '张三', operateTime: '2023-10-24 08:45:00' },
  { id: 'AL-20231023-005', object: '01无人车', level: '严重', type: '故障', content: '驱动电机过载报警', time: '2023-10-23 15:20:00', endTime: '2023-10-23 16:00:00', status: '已解除', operator: '系统自动', operateTime: '2023-10-23 16:00:00' },
  { id: 'AL-20231023-006', object: '1#汽车集样', level: '普通', type: '-', content: '滚筒线皮带跑偏预警', time: '2023-10-23 10:10:00', endTime: '-', status: '-', operator: '-', operateTime: '-' },
  { id: 'AL-20231022-007', object: '03无人车', level: '严重', type: '故障', content: '通讯模块无响应，连接丢失', time: '2023-10-22 08:00:00', endTime: '2023-10-22 08:30:00', status: '已解除', operator: '李四', operateTime: '2023-10-22 08:30:00' },
];

const StatusBadge = ({ status, level }: { status: string, level?: string }) => {
  if (status === '报警中' || level === '严重') {
    return <span className="px-2 py-0.5 text-xs border rounded text-red-400 border-red-400/30 bg-red-400/10">{status !== '-' ? status : level}</span>;
  }
  if (status === '已解除') {
    return <span className="px-2 py-0.5 text-xs border rounded text-green-400 border-green-400/30 bg-green-400/10">{status}</span>;
  }
  if (level === '普通') {
    return <span className="px-2 py-0.5 text-xs border rounded text-yellow-400 border-yellow-400/30 bg-yellow-400/10">{level}</span>;
  }
  return <span className="text-gray-500">-</span>;
};

const Component = () => {
  const [activeMenu1, setActiveMenu1] = useState('主界面');
  const [activeMenu2, setActiveMenu2] = useState('报警查询');
  
  const [alarms, setAlarms] = useState(INITIAL_ALARMS);
  
  // Search States
  const [searchObject, setSearchObject] = useState('');
  const [searchContent, setSearchContent] = useState('');
  const [searchStartTime, setSearchStartTime] = useState('');
  const [searchEndTime, setSearchEndTime] = useState('');

  // Modals
  const [detailModalData, setDetailModalData] = useState<any>(null);
  const [resetModalData, setResetModalData] = useState<any>(null);

  // Filtered Data
  const filteredAlarms = useMemo(() => {
    return alarms.filter(alarm => {
      const matchObject = alarm.object.toLowerCase().includes(searchObject.toLowerCase());
      const matchContent = alarm.content.toLowerCase().includes(searchContent.toLowerCase());
      
      let matchTime = true;
      if (searchStartTime) {
        matchTime = matchTime && new Date(alarm.time) >= new Date(searchStartTime);
      }
      if (searchEndTime) {
        matchTime = matchTime && new Date(alarm.time) <= new Date(searchEndTime);
      }

      return matchObject && matchContent && matchTime;
    }).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()); // Sort by time desc
  }, [alarms, searchObject, searchContent, searchStartTime, searchEndTime]);

  // Handlers
  const handleResetSearch = () => {
    setSearchObject('');
    setSearchContent('');
    setSearchStartTime('');
    setSearchEndTime('');
  };

  const handleConfirmReset = () => {
    if (!resetModalData) return;
    
    const now = new Date();
    const formattedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    setAlarms(prev => prev.map(a => {
      if (a.id === resetModalData.id) {
        return {
          ...a,
          endTime: formattedTime,
          status: a.status === '报警中' ? '已解除' : a.status,
          operator: '当前调度员', // Simulated current user
          operateTime: formattedTime
        };
      }
      return a;
    }));
    
    setResetModalData(null);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-gray-200 font-sans overflow-hidden flex flex-col dispatch-workbench-root">
      
      {/* Top Header (Consistent with Workbench) */}
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

      {/* Main Content Area */}
      <main className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        
        {/* Search & Filter Bar */}
        <div className="bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg p-4 shrink-0 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs text-gray-400">报警对象</label>
            <input 
              type="text" 
              placeholder="请输入设备或小车编号" 
              value={searchObject}
              onChange={e => setSearchObject(e.target.value)}
              className="w-48 bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs text-gray-400">报警内容</label>
            <input 
              type="text" 
              placeholder="请输入报警内容关键字" 
              value={searchContent}
              onChange={e => setSearchContent(e.target.value)}
              className="w-64 bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs text-gray-400">报警发生时间范围</label>
            <div className="flex items-center space-x-2">
              <input 
                type="datetime-local" 
                value={searchStartTime}
                onChange={e => setSearchStartTime(e.target.value)}
                className="w-48 bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
              />
              <span className="text-gray-500">-</span>
              <input 
                type="datetime-local" 
                value={searchEndTime}
                onChange={e => setSearchEndTime(e.target.value)}
                className="w-48 bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 ml-auto">
            <button 
              onClick={handleResetSearch}
              className="px-4 py-1.5 rounded border border-cyan-900/50 text-cyan-400 hover:bg-cyan-900/30 text-sm transition-colors flex items-center space-x-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span>重置</span>
            </button>
            <button 
              className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-sm transition-colors shadow-[0_0_10px_rgba(0,255,255,0.2)] flex items-center space-x-1"
            >
              <Search className="w-4 h-4" />
              <span>查询</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg flex flex-col overflow-hidden relative">
          <div className="h-12 bg-[#0f172a]/80 px-4 flex items-center justify-between border-b border-cyan-900/30 shrink-0">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-cyan-400" />
              <h2 className="text-white font-medium">报警数据列表</h2>
            </div>
            <span className="text-xs text-gray-400">共找到 {filteredAlarms.length} 条记录</span>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-[#0f172a]/90 text-gray-400 sticky top-0 z-10 shadow-md">
                <tr>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">报警对象</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">报警等级</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">报警类型</th>
                  <th className="py-3 px-4 font-medium w-1/4">报警内容</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">报警发生时间</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">报警结束时间</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">报警状态</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-900/20">
                {filteredAlarms.length > 0 ? filteredAlarms.map((alarm) => (
                  <tr key={alarm.id} className="hover:bg-cyan-900/20 transition-colors group bg-[#1e293b]/20">
                    <td className="py-3 px-4 text-cyan-300 font-medium whitespace-nowrap">{alarm.object}</td>
                    <td className="py-3 px-4 whitespace-nowrap"><StatusBadge level={alarm.level} status="-" /></td>
                    <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{alarm.type}</td>
                    <td className="py-3 px-4 text-gray-200 max-w-xs truncate" title={alarm.content}>{alarm.content}</td>
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap font-mono text-xs">{alarm.time}</td>
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap font-mono text-xs">{alarm.endTime}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {alarm.status !== '-' ? <StatusBadge status={alarm.status} /> : <span className="text-gray-500">-</span>}
                    </td>
                    <td className="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                      {/* 如果 endTime 是 '-' 说明该报警还未解除，提供复位功能 */}
                      {alarm.endTime === '-' && (
                        <button 
                          onClick={() => setResetModalData(alarm)}
                          className="text-yellow-400 hover:text-yellow-300 transition-colors text-xs flex items-center inline-flex space-x-1" 
                          title="人工复位"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>复位</span>
                        </button>
                      )}
                      <button 
                        onClick={() => setDetailModalData(alarm)}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors text-xs flex items-center inline-flex space-x-1" 
                        title="查看详情"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>详情</span>
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <AlertTriangle className="w-8 h-8 mb-2 opacity-20" />
                        <span>暂无报警数据</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Simulated Pagination */}
          <div className="h-12 bg-[#0f172a]/80 px-4 flex items-center justify-end border-t border-cyan-900/30 shrink-0 text-sm text-gray-400">
            <div className="flex items-center space-x-4">
              <span>每页 10 条</span>
              <div className="flex space-x-1">
                <button className="px-2 py-1 bg-[#1e293b] border border-cyan-900/50 rounded hover:bg-cyan-900/30 transition-colors disabled:opacity-50">上一页</button>
                <button className="px-3 py-1 bg-cyan-900/60 border border-cyan-500/50 text-cyan-300 rounded">1</button>
                <button className="px-2 py-1 bg-[#1e293b] border border-cyan-900/50 rounded hover:bg-cyan-900/30 transition-colors">下一页</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {detailModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.15)] w-[500px] flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b border-cyan-900/50">
              <h3 className="text-white font-medium text-lg flex items-center space-x-2">
                <Info className="w-5 h-5 text-cyan-400" />
                <span>报警详情 - {detailModalData.id}</span>
              </h3>
              <button onClick={() => setDetailModalData(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <span className="text-xs text-gray-500">报警对象</span>
                  <span className="text-sm text-white font-medium">{detailModalData.object}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-xs text-gray-500">报警等级</span>
                  <div><StatusBadge level={detailModalData.level} status="-" /></div>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-xs text-gray-500">报警类型</span>
                  <span className="text-sm text-gray-300">{detailModalData.type}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-xs text-gray-500">报警状态</span>
                  <div>
                    {detailModalData.status !== '-' ? <StatusBadge status={detailModalData.status} /> : <span className="text-gray-500">-</span>}
                  </div>
                </div>
                <div className="col-span-2 flex flex-col space-y-1 bg-[#1e293b]/40 p-3 rounded border border-cyan-900/30">
                  <span className="text-xs text-gray-500">报警内容</span>
                  <span className="text-sm text-red-300 font-medium">{detailModalData.content}</span>
                </div>
                
                <div className="col-span-2 border-t border-cyan-900/30 pt-4 mt-2">
                  <h4 className="text-xs font-medium text-cyan-400 mb-3">时间与操作信息</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500">发生时间</span>
                        <span className="text-xs text-gray-300 font-mono">{detailModalData.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500">结束时间</span>
                        <span className="text-xs text-gray-300 font-mono">{detailModalData.endTime}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500">复位操作人</span>
                        <span className="text-xs text-gray-300">{detailModalData.operator}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500">复位操作时间</span>
                        <span className="text-xs text-gray-300 font-mono">{detailModalData.operateTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-cyan-900/50 flex justify-end bg-[#0f172a] rounded-b-lg">
              <button onClick={() => setDetailModalData(null)} className="px-6 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-sm transition-colors shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetModalData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-yellow-500/50 rounded-lg shadow-[0_0_30px_rgba(234,179,8,0.15)] w-[400px] flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b border-yellow-900/50 bg-yellow-900/10">
              <h3 className="text-yellow-400 font-medium text-lg flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>人工复位确认</span>
              </h3>
              <button onClick={() => setResetModalData(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5">
              <p className="text-gray-300 text-sm mb-4">
                确定要对 <span className="text-cyan-400 font-bold">{resetModalData.object}</span> 的异常报警进行人工复位操作吗？
              </p>
              <div className="bg-[#1e293b]/50 p-3 rounded border border-gray-700/50 text-xs text-gray-400 space-y-1">
                <p>报警内容：<span className="text-gray-200">{resetModalData.content}</span></p>
                <p>发生时间：<span className="font-mono">{resetModalData.time}</span></p>
              </div>
              <p className="text-xs text-yellow-500 mt-4 flex items-center">
                <Info className="w-3.5 h-3.5 mr-1" />
                复位操作将被系统记录（包括当前操作人与时间）。
              </p>
            </div>

            <div className="px-4 py-3 border-t border-yellow-900/50 flex justify-end space-x-3 bg-[#0f172a] rounded-b-lg">
              <button 
                onClick={() => setResetModalData(null)} 
                className="px-4 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleConfirmReset} 
                className="px-4 py-1.5 rounded bg-yellow-600 hover:bg-yellow-500 text-white text-sm transition-colors shadow-[0_0_10px_rgba(234,179,8,0.2)]"
              >
                确认复位
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default Component;
