/**
 * @name 工作台
 */
import React, { useState } from 'react';
import { 
  Search, LayoutGrid, List, AlertCircle, ChevronRight, Activity, Cpu, Wind, Bell, MoreHorizontal
} from 'lucide-react';
import * as echarts from 'echarts';
import './style.css';

// --- Sub-components ---
const StatusDot = ({ status, size = 'md' }: { status: string, size?: 'sm' | 'md' | 'lg' }) => {
  let bgColor = 'bg-gray-300';
  if (status === '正常' || status.includes('运行')) bgColor = 'bg-[#52C41A]';
  if (status === '通讯异常' || status === '警告') bgColor = 'bg-[#FAAD14]';
  if (status === '报警' || status === '故障') bgColor = 'bg-[#F5222D]';
  
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return <span className={`inline-block rounded-full ${bgColor} ${sizeClasses[size]}`}></span>;
};

const NodeCard = ({ title, subTitle, vehicle, status, badge, dotStatus }: any) => {
  const badgeColors: Record<string, string> = {
    '远程控制': 'bg-[#FFF7E6] text-[#FA8C16] border-[#FFD591]',
    '远程监测': 'bg-[#E6F7FF] text-[#1890FF] border-[#91D5FF]',
  };
  const bColor = badgeColors[badge] || 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <div className="bg-white border border-gray-200 rounded p-3 shadow-sm hover:shadow-md transition-shadow relative">
      {badge && (
        <div className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded border ${bColor}`}>
          {badge}
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-xs text-gray-500 text-center leading-tight">
          {title}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <StatusDot status={dotStatus} size="sm" />
            <span className="text-sm font-medium text-gray-800 truncate">{subTitle}</span>
          </div>
          {vehicle && <div className="text-xs text-gray-500 truncate mb-0.5">{vehicle}</div>}
          <div className="text-xs text-gray-500 truncate">{status}</div>
        </div>
      </div>
    </div>
  );
};

const AlarmItem = ({ level, device, time, desc }: any) => {
  const levelColors: Record<string, string> = {
    '严重': 'bg-[#FFF1F0] text-[#F5222D] border-[#FFA39E]',
    '普通': 'bg-[#FFF7E6] text-[#FA8C16] border-[#FFD591]',
    '控制流程': 'bg-[#F5F5F5] text-[#595959] border-[#D9D9D9]',
  };
  const colorClass = levelColors[level] || 'bg-gray-100 text-gray-600';

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
      <div className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${colorClass}`}>
        {level}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-800 flex justify-between">
          <span className="truncate">{device}</span>
          <span className="text-xs text-gray-400 shrink-0">{time}</span>
        </div>
        <div className="text-xs text-gray-500 truncate">{desc}</div>
      </div>
    </div>
  );
};

// --- ECharts Components ---
const DonutChart = () => {
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (chartRef.current) {
      const chart = echarts.init(chartRef.current);
      chart.setOption({
        tooltip: { trigger: 'item' },
        series: [
          {
            name: '运行情况',
            type: 'pie',
            radius: ['55%', '80%'],
            avoidLabelOverlap: false,
            label: { show: false, position: 'center' },
            labelLine: { show: false },
            data: [
              { value: 25, name: '正常', itemStyle: { color: '#52C41A' } },
              { value: 5, name: '通讯异常', itemStyle: { color: '#FAAD14' } },
              { value: 0, name: '报警', itemStyle: { color: '#F5222D' } }
            ]
          }
        ]
      });
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }
  }, []);

  return <div ref={chartRef} className="w-full h-32" />;
};

const BarChart = () => {
  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (chartRef.current) {
      const chart = echarts.init(chartRef.current);
      chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
        xAxis: {
          type: 'category',
          data: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'],
          axisTick: { alignWithLabel: true },
          axisLabel: { color: '#8C8C8C', fontSize: 10 },
          axisLine: { lineStyle: { color: '#E8E8E8' } }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { type: 'dashed', color: '#E8E8E8' } },
          axisLabel: { color: '#8C8C8C', fontSize: 10 }
        },
        series: [
          {
            name: '紧急',
            type: 'bar',
            stack: 'total',
            barWidth: '60%',
            data: Array(24).fill(0).map(() => Math.floor(Math.random() * 5)),
            itemStyle: { color: '#F5222D' }
          },
          {
            name: '严重',
            type: 'bar',
            stack: 'total',
            data: Array(24).fill(0).map(() => Math.floor(Math.random() * 15)),
            itemStyle: { color: '#FAAD14' }
          },
          {
            name: '普通',
            type: 'bar',
            stack: 'total',
            data: Array(24).fill(0).map(() => Math.floor(Math.random() * 40) + 10),
            itemStyle: { color: '#1890FF' }
          }
        ]
      });
      const handleResize = () => chart.resize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose();
      };
    }
  }, []);

  return <div ref={chartRef} className="w-full h-40" />;
};

// --- Main Page ---
const Component = () => {
  const [activeMenu, setActiveMenu] = useState('工作台');
  const [activeNodeTab, setActiveNodeTab] = useState('全部');
  const [timeTab, setTimeTab] = useState('今日');
  const [workloadTimeTab, setWorkloadTimeTab] = useState('今日');

  const navItems = ['工作台', '设备监控', '数据查询', '视频门禁', '卸煤管控', '报警'];
  const nodeTabs = ['全部', '出入厂', '采样', '计量', '制样化验'];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#333] font-sans flex flex-col dashboard-main-root">
      
      {/* Top Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-[#1890FF] leading-tight">智慧燃料集控中心</h1>
            <span className="text-[10px] text-gray-500 leading-tight tracking-wider">大唐雷州发耳电厂</span>
          </div>
          
          <nav className="flex ml-8 space-x-1 h-full pt-2">
            {navItems.map(item => (
              <button
                key={item}
                onClick={() => setActiveMenu(item)}
                className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
                  activeMenu === item 
                    ? 'bg-[#FFF1F0] text-[#CF1322] border-b-2 border-[#CF1322]' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-xs">
              刘
            </div>
            <span className="text-gray-700">刘焱</span>
          </div>
          <div className="text-gray-500 font-mono flex items-center gap-2">
            <span>17:00:00</span>
            <span className="text-xs">2026/01/28 星期三</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
        
        {/* Title */}
        <div className="font-bold text-gray-800 text-lg">工作台</div>

        {/* Top Modules: 作业模块 */}
        <div className="bg-white rounded shadow-sm p-4 border border-gray-100 flex items-center gap-8">
          <div className="flex flex-col gap-3 w-32 shrink-0 border-r border-gray-100 pr-4">
            <div className="flex justify-between items-end">
              <span className="text-xl font-bold text-gray-800">12</span>
              <span className="text-xs text-gray-500 mb-1">个</span>
            </div>
            <div className="text-xs text-gray-500">模块总数</div>
            <div className="flex justify-between text-xs mt-2">
              <span className="text-gray-500">控制接入</span>
              <span className="font-medium">5 个</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">监测接入</span>
              <span className="font-medium">7 个</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-5 gap-4">
            {[
              { name: '机械采样', color: 'bg-green-50 border-green-200 text-green-700' },
              { name: '皮带采样', color: 'bg-blue-50 border-blue-200 text-blue-700' },
              { name: '制样模块', color: 'bg-orange-50 border-orange-200 text-orange-700' },
              { name: '化验模块', color: 'bg-purple-50 border-purple-200 text-purple-700' },
              { name: '存样模块', color: 'bg-pink-50 border-pink-200 text-pink-700' }
            ].map((mod, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className={`w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center ${mod.color}`}>
                  <span className="text-lg font-bold">12</span>
                  <span className="text-[10px]">个</span>
                </div>
                <div className="text-sm font-medium text-gray-800">{mod.name}</div>
                <div className="text-[10px] text-gray-500 whitespace-nowrap">
                  紧急 <span className="text-gray-800">0</span> | 严重 <span className="text-gray-800">1</span> | 普通 <span className="text-gray-800">10</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-12 gap-4 h-[400px]">
          
          {/* Left Column: 运行情况 & 报警 */}
          <div className="col-span-3 flex flex-col gap-4">
            <div className="bg-white rounded shadow-sm p-4 border border-gray-100 flex flex-col h-48">
              <div className="font-bold text-sm text-gray-800 mb-2 pb-2 border-b border-gray-100">运行情况</div>
              <div className="flex-1 flex items-center">
                <div className="w-1/2">
                  <DonutChart />
                </div>
                <div className="w-1/2 flex flex-col gap-2 pl-2">
                  <div className="flex items-center gap-2 text-xs">
                    <StatusDot status="正常" />
                    <span className="text-gray-600">正常: 25台</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <StatusDot status="警告" />
                    <span className="text-gray-600">通讯异常: 5台</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <StatusDot status="报警" />
                    <span className="text-gray-600">报警: 0台</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-right text-gray-500 mt-2">今日已恢复报警 <span className="font-bold text-gray-800">892</span> 条</div>
            </div>

            <div className="bg-white rounded shadow-sm p-4 border border-gray-100 flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <AlarmItem level="严重" device="1#汽车采样机" time="14:26:58" desc="采样急停" />
                <AlarmItem level="严重" device="1#汽车采样机" time="14:26:58" desc="采样异常" />
                <AlarmItem level="普通" device="1#汽车采样机" time="14:26:58" desc="采样急停" />
                <AlarmItem level="控制流程" device="1#汽车采样机" time="14:26:58" desc="采样异常，无空罐，请及时配送空罐" />
              </div>
              <div className="pt-2 mt-2 border-t border-gray-100 text-right">
                <button className="text-xs text-blue-600 hover:text-blue-500">更多详情</button>
              </div>
            </div>
          </div>

          {/* Right Column: 节点卡片 */}
          <div className="col-span-9 bg-white rounded shadow-sm p-4 border border-gray-100 flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
              <div className="flex space-x-6">
                {nodeTabs.map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveNodeTab(tab)}
                    className={`text-sm pb-2 -mb-[9px] font-medium transition-colors ${
                      activeNodeTab === tab ? 'text-[#1890FF] border-b-2 border-[#1890FF]' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1.5"><StatusDot status="正常" />正常 25</div>
                <div className="flex items-center gap-1.5"><StatusDot status="警告" />通讯异常 5</div>
                <div className="flex items-center gap-1.5"><StatusDot status="报警" />报警 0</div>
                <div className="relative">
                  <input type="text" placeholder="名称" className="border border-gray-300 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:border-blue-500" />
                  <Search size={12} className="absolute right-2 top-1.5 text-gray-400" />
                </div>
                <div className="flex border border-gray-300 rounded overflow-hidden">
                  <button className="p-1 bg-gray-100 hover:bg-gray-200"><LayoutGrid size={14} className="text-gray-600"/></button>
                  <button className="p-1 hover:bg-gray-100 border-l border-gray-300"><List size={14} className="text-gray-400"/></button>
                </div>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-4 gap-3 content-start">
              <NodeCard title="汽车机械采样机" subTitle="1#汽车采样机" vehicle="在采车辆 湘A98992" status="全自动采样运行中" badge="远程控制" dotStatus="正常" />
              <NodeCard title="汽车自动入厂" subTitle="南门自动入厂" vehicle="正在登记 湘A98992" status="自动入厂运行中" badge="远程控制" dotStatus="正常" />
              <NodeCard title="人工登记入厂" subTitle="南门人工登记" status="人工登记入厂" badge="远程监测" dotStatus="正常" />
              <NodeCard title="入炉皮采" subTitle="C37A入炉皮采" vehicle="当前班次 晚班" status="自动入厂运行中" badge="远程控制" dotStatus="正常" />
              
              <NodeCard title="船运皮采" subTitle="C37A皮采" vehicle="在采船号 长江宏盛" status="全自动采样运行中" badge="远程控制" dotStatus="正常" />
              <NodeCard title="火车皮采" subTitle="C37A皮采" vehicle="在采车次 Z9091" status="全自动采样运行中" badge="远程控制" dotStatus="正常" />
              <NodeCard title="合样归批" subTitle="合样归批" vehicle="待制样批次 2" status="待制样批次 2" badge="远程监测" dotStatus="正常" />
              <NodeCard title="白动制样" subTitle="1#自动制样" vehicle="正在制备批次 2" status="自动制样运行中" badge="远程监测" dotStatus="正常" />
              
              <NodeCard title="无人化验" subTitle="无人化验" vehicle="系统状态 空闲中" status="空闲中" badge="远程监测" dotStatus="正常" />
              <NodeCard title="存样柜" subTitle="1#无人化验" vehicle="系统状态 空闲中" status="剩余容量 87%" badge="远程监测" dotStatus="正常" />
              <NodeCard title="其他设备(通用设备图标)" subTitle="通用设备" status="其他设备状态" dotStatus="正常" />
            </div>
          </div>

        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Trend Chart */}
          <div className="bg-white rounded shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-sm text-gray-800">报警故障趋势</div>
              <div className="flex bg-gray-100 rounded text-xs p-0.5">
                {['今日', '本周', '本月'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setTimeTab(t)}
                    className={`px-3 py-1 rounded-sm ${timeTab === t ? 'bg-[#1890FF] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <BarChart />
          </div>

          {/* Workload Stats */}
          <div className="bg-white rounded shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="font-bold text-sm text-gray-800">模块作业量统计</div>
              <div className="flex bg-gray-100 rounded text-xs p-0.5">
                {['今日', '本周', '本月'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setWorkloadTimeTab(t)}
                    className={`px-3 py-1 rounded-sm ${workloadTimeTab === t ? 'bg-[#1890FF] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between px-8 relative h-32">
              <div className="absolute top-1/2 left-16 right-16 h-px bg-gray-200 -z-10 -translate-y-6"></div>
              
              {[
                { name: '汽车入厂', label: '已入厂', val: '230', unit: '车' },
                { name: '计量', label: '计量车数', val: '520', unit: '车' },
                { name: '采样', label: '已采样', val: '128', unit: '车' },
                { name: '制样', label: '已制样', val: '2', unit: '批' },
                { name: '化验', label: '已化验', val: '2', unit: '批' }
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col items-center bg-white z-10 gap-4">
                  <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm font-medium text-gray-600 bg-white shadow-sm hover:border-[#1890FF] hover:text-[#1890FF] transition-colors cursor-default">
                    {step.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {step.label} <span className="font-bold text-gray-800">{step.val}</span> {step.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default Component;
