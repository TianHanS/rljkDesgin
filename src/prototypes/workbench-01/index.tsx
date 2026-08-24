/**
 * @name 工作台01
 */
import React, { useState, useRef, useEffect } from 'react';
import { 
  Monitor, Power, Bell, Plus, Pause, Square, AlertTriangle, 
  MapPin, Truck, Box, X, Battery, Navigation, ShieldAlert,
  Wifi, WifiOff, Navigation2, NavigationOff, Video, Camera, Maximize, Volume2, VolumeX, Play, PlayCircle, Info, Check,
  TrafficCone, Minus
} from 'lucide-react';
import './style.css';

// --- Mock Data ---

const MOCK_STATIONS = [
  {
    id: 'S-01',
    name: '1#汽采集样',
    type: 'loading', // loading: 装车端, unloading: 卸车端, normal: 普通停靠点
    x: 25,
    y: 35,
    comm: '在线',
    deviceStatus: '运行', // 就绪、运行、暂停、故障
    flowStatus: '装车中', // 车辆对接中、装车中、卸车中、设备复位中
    emptyLine: { cap: 10, current: 4, req: 6 },
    workStation: { empty: 1, full: 1 },
    fullLine: { cap: 10, current: 5 },
    approaching: { name: '01无人车', eta: '2分钟' }
  },
  {
    id: 'S-02',
    name: '2#汽采集样',
    type: 'loading',
    x: 25,
    y: 65,
    comm: '离线',
    deviceStatus: '故障',
    flowStatus: '-',
    emptyLine: { cap: 10, current: 8, req: 2 },
    workStation: { empty: 0, full: 0 },
    fullLine: { cap: 10, current: 0 },
    approaching: null
  },
  {
    id: 'S-03',
    name: '归批制样',
    type: 'unloading',
    x: 75,
    y: 50,
    comm: '在线',
    deviceStatus: '就绪',
    flowStatus: '设备复位中',
    emptyStored: 12,
    approaching: { name: '02有人车', eta: '5分钟' }
  },
  {
    id: 'S-04',
    name: '充电桩A',
    type: 'normal',
    x: 50,
    y: 85,
    comm: '在线',
    deviceStatus: '就绪',
    flowStatus: '-',
    approaching: null
  }
];

const MOCK_AGVS = [
  {
    id: 'A-01',
    name: '01无人车',
    x: 40,
    y: 40,
    heading: 45, // 行进方向角度，null表示无方向数据
    comm: '在线',
    gps: '定位有效',
    assist: '无',
    alarm: false,
    deviceStatus: '运行',
    flowStatus: '前往停靠点',
    gear: '3-D',
    speed: '1.2 m/s',
    taskStatus: '正在执行',
    mode: '自动',
    door: '关闭',
    targetStation: '1#汽采集样',
    eta: '2分钟',
    lines: [
      { id: 1, cap: 6, loaded: 0, type: '空桶', target: '1#汽采集样' },
      { id: 2, cap: 6, loaded: 6, type: '满桶', target: '归批制样' }
    ],
    battery: { remain: 85, charging: false, range: '45km', total: '1250km', temp: '35℃', cur: '12A', vol: '48.5V' },
    faults: [],
    task: {
      id: 'T-20231024-001',
      name: '日常采样调运',
      trigger: '定时自动',
      status: '执行中',
      confirmUser: '张三',
      startTime: '10:00:00',
      details: [
        { id: 1, type: '车辆调度', target: '1#汽采集样', action: '-', emptyCount: '-', status: '已完成' },
        { id: 2, type: '样桶装卸', target: '1#汽采集样', action: '卸空桶装满桶', emptyCount: 6, status: '执行中' }
      ]
    },
    logs: [
      { time: '10:05:22', content: '01无人车 距离 1#汽采集样 还有50米', type: 'info' },
      { time: '10:02:15', content: '开始前往 1#汽采集样', type: 'info' },
      { time: '10:00:00', content: '接收到任务 T-20231024-001', type: 'info' }
    ]
  },
  {
    id: 'A-02',
    name: '02有人车',
    x: 65,
    y: 55,
    heading: null, // 无方向数据
    comm: '在线',
    gps: '定位有效',
    assist: '防撞触发',
    alarm: true,
    deviceStatus: '暂停',
    flowStatus: '车辆对接中',
    gear: '1-P',
    speed: '0 m/s',
    taskStatus: '正在执行',
    mode: '手动',
    door: '开启',
    targetStation: '归批制样',
    eta: '5分钟',
    lines: [
      { id: 1, cap: 4, loaded: 4, type: '满桶', target: '归批制样' },
      { id: 2, cap: 4, loaded: 0, type: '空桶', target: '-' }
    ],
    battery: { remain: 35, charging: false, range: '15km', total: '850km', temp: '38℃', cur: '0A', vol: '46.2V' },
    faults: [
      { name: '前置雷达遮挡', type: '0-传感器', time: '10:15:00', status: '触发' }
    ],
    task: {
      id: 'T-20231024-002',
      name: '紧急卸样',
      trigger: '人工确认',
      status: '暂停',
      confirmUser: '李四',
      startTime: '10:10:00',
      details: [
        { id: 1, type: '车辆调度', target: '归批制样', action: '-', emptyCount: '-', status: '暂停' }
      ]
    },
    logs: [
      { time: '10:15:00', content: '防撞触发，车辆紧急暂停', type: 'error' },
      { time: '10:12:30', content: '切换为手动模式', type: 'warn' },
      { time: '10:10:00', content: '接收到任务 T-20231024-002', type: 'info' }
    ]
  }
];

const MOCK_ALARMS = [
  { id: 1, time: '10:15:00', source: '02有人车', msg: '前置雷达遮挡防撞触发', level: 'high' },
  { id: 2, time: '09:55:20', source: '2#汽采集样', msg: '设备通信中断', level: 'critical' }
];

const YELLOW_TRANSITION_SEC = 3;
const BLINK_LAST_SEC = 5;

type TrafficLightMode = 0 | 1 | 2 | 3 | 4;
type LampColor = 'red' | 'yellow' | 'green';

interface TrafficLightItem {
  id: string;
  name: string;
  x: number;
  y: number;
  offline: boolean;
  mode: TrafficLightMode;
  interval: number;
  phaseColor: LampColor;
  countdown: number;
}

const TRAFFIC_LIGHT_MODE_OPTIONS: { value: TrafficLightMode; label: string; shortLabel: string }[] = [
  { value: 0, label: '0 熄灭', shortLabel: '熄灭' },
  { value: 1, label: '1 常绿', shortLabel: '常绿' },
  { value: 2, label: '2 黄灯闪烁', shortLabel: '黄闪' },
  { value: 3, label: '3 常红', shortLabel: '常红' },
  { value: 4, label: '4 定时循环', shortLabel: '定时循环' },
];

// 厂内交通信号灯（地图固定位置）
const MOCK_TRAFFIC_LIGHTS: TrafficLightItem[] = [
  { id: 'TL-01', name: '1#路口信号灯', x: 50, y: 28, offline: false, mode: 4, interval: 30, phaseColor: 'red', countdown: 18 },
  { id: 'TL-02', name: '2#路口信号灯', x: 62, y: 72, offline: false, mode: 4, interval: 25, phaseColor: 'green', countdown: 12 },
  { id: 'TL-03', name: '3#路口信号灯', x: 14, y: 50, offline: true, mode: 0, interval: 30, phaseColor: 'red', countdown: 0 },
];

const getLampState = (light: TrafficLightItem) => {
  const off = { redOn: false, yellowOn: false, greenOn: false, redBlink: false, yellowBlink: false, greenBlink: false };
  if (light.offline || light.mode === 0) return off;
  if (light.mode === 1) return { ...off, greenOn: true };
  if (light.mode === 2) return { ...off, yellowOn: true, yellowBlink: true };
  if (light.mode === 3) return { ...off, redOn: true };
  const blinkEnd = light.countdown <= BLINK_LAST_SEC;
  if (light.phaseColor === 'red') return { ...off, redOn: true, redBlink: blinkEnd };
  if (light.phaseColor === 'yellow') return { ...off, yellowOn: true, yellowBlink: true };
  return { ...off, greenOn: true, greenBlink: blinkEnd };
};

const tickTrafficLight = (light: TrafficLightItem): TrafficLightItem => {
  if (light.offline || light.mode !== 4) return light;
  if (light.countdown <= 1) {
    if (light.phaseColor === 'red') {
      return { ...light, phaseColor: 'yellow', countdown: YELLOW_TRANSITION_SEC };
    }
    if (light.phaseColor === 'yellow') {
      return { ...light, phaseColor: 'green', countdown: light.interval };
    }
    return { ...light, phaseColor: 'red', countdown: light.interval };
  }
  return { ...light, countdown: light.countdown - 1 };
};

const getPhaseLabel = (light: TrafficLightItem) => {
  if (light.offline) return '设备离线';
  if (light.mode === 0) return '熄灭';
  if (light.mode === 1) return '常绿';
  if (light.mode === 2) return '黄灯闪烁';
  if (light.mode === 3) return '常红';
  const map: Record<LampColor, string> = { red: '红灯', yellow: '黄灯过渡', green: '绿灯' };
  return map[light.phaseColor];
};

const TrafficLightLamps = ({
  lamps,
  size = 'md',
  vertical = false,
  compact = false,
  showLabels = false,
  showReadings = false,
  phaseColor,
  countdown,
  offline = false,
}: {
  lamps: ReturnType<typeof getLampState>;
  size?: 'sm' | 'md';
  vertical?: boolean;
  compact?: boolean;
  showLabels?: boolean;
  showReadings?: boolean;
  phaseColor?: LampColor;
  countdown?: number;
  offline?: boolean;
}) => {
  const bulb = compact
    ? 'wb01-traffic-bulb wb01-traffic-bulb--compact'
    : size === 'sm'
      ? 'wb01-traffic-bulb wb01-traffic-bulb--sm'
      : 'wb01-traffic-bulb wb01-traffic-bulb--md';
  const cols: { color: LampColor; label: string; on: boolean; blink: boolean }[] = [
    { color: 'red', label: '红', on: lamps.redOn, blink: lamps.redBlink },
    { color: 'yellow', label: '黄', on: lamps.yellowOn, blink: lamps.yellowBlink },
    { color: 'green', label: '绿', on: lamps.greenOn, blink: lamps.greenBlink },
  ];

  const renderBulb = (on: boolean, blink: boolean, color: LampColor) => {
    if (offline) {
      return <span className={`${bulb} rounded-full bg-gray-600`} />;
    }
    const activeClass =
      color === 'red'
        ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]'
        : color === 'yellow'
          ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.9)]'
          : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.9)]';
    const dimClass =
      color === 'red' ? 'bg-red-900/40' : color === 'yellow' ? 'bg-yellow-900/30' : 'bg-green-900/40';
    return (
      <span
        className={`${bulb} rounded-full transition-colors ${on ? activeClass : dimClass} ${on && blink ? 'wb01-lamp-blink' : ''}`}
      />
    );
  };

  const readingClass = (color: LampColor) =>
    color === 'red' ? 'text-red-400' : color === 'yellow' ? 'text-yellow-400' : 'text-green-400';

  if (vertical) {
    return (
      <div className="flex flex-col gap-1">
        {cols.map((col) => (
          <div key={col.color} className="flex items-center gap-1.5">
            {renderBulb(col.on, col.blink, col.color)}
            {showLabels && <span className="text-[10px] text-gray-400">{col.label}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (compact) {
    const showCountdown = showReadings && !offline && phaseColor && countdown != null;
    return (
      <div className="wb01-traffic-h wb01-traffic-h--compact">
        <div className="wb01-traffic-h__bulbs">
          {cols.map((col) => (
            <span key={col.color} className="wb01-traffic-h__bulb-slot">
              {renderBulb(col.on, col.blink, col.color)}
            </span>
          ))}
        </div>
        <span
          className={`wb01-traffic-h__countdown ${showCountdown ? readingClass(phaseColor!) : 'wb01-traffic-h__countdown--empty'}`}
          aria-hidden={!showCountdown}
        >
          {showCountdown ? countdown : '\u00a0'}
        </span>
      </div>
    );
  }

  return (
    <div className="wb01-traffic-h">
      <div className="wb01-traffic-h__row">
        {cols.map((col) => (
          <div key={col.color} className="wb01-traffic-h__col">
            {renderBulb(col.on, col.blink, col.color)}
            {showLabels && <span className="wb01-traffic-h__label">{col.label}</span>}
          </div>
        ))}
      </div>
      {showReadings && (
        <div className="wb01-traffic-h__row wb01-traffic-h__readings">
          {cols.map((col) => {
            const active = !offline && phaseColor === col.color && countdown != null;
            return (
              <span
                key={col.color}
                className={`wb01-traffic-h__reading ${active ? readingClass(col.color) : 'text-gray-600'}`}
              >
                {active ? countdown : '--'}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** 图例专用：带灯罩外壳的三色灯预览 */
const TrafficLightLegendPreview = () => (
  <div className="wb01-legend-housing" aria-hidden>
    <div className="wb01-legend-lens wb01-legend-lens--red" />
    <div className="wb01-legend-lens wb01-legend-lens--yellow" />
    <div className="wb01-legend-lens wb01-legend-lens--green" />
  </div>
);

// --- Components ---

const StatusBadge = ({ status }: { status: string }) => {
  let colorClass = 'text-green-400 border-green-400/30 bg-green-400/10';
  if (status === '故障' || status === '异常' || status === '报警' || status === '触发') colorClass = 'text-red-400 border-red-400/30 bg-red-400/10';
  if (status === '暂停' || status === '离线') colorClass = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
  if (status === '就绪' || status === '未执行' || status === '-') colorClass = 'text-gray-400 border-gray-400/30 bg-gray-400/10';
  if (status === '执行中' || status === '运行' || status === '在线') colorClass = 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';

  return (
    <span className={`px-1.5 py-0.5 text-xs border rounded ${colorClass}`}>
      {status}
    </span>
  );
};

const VideoPlayer = ({ title, url }: { title: string, url: string }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden border border-cyan-900/50 group flex flex-col ${isFullscreen ? 'fixed inset-4 z-[60] shadow-[0_0_50px_rgba(0,0,0,0.8)]' : 'h-[280px]'}`}>
      {/* Video Header */}
      <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-white text-sm font-medium flex items-center"><Video className="w-3 h-3 mr-1.5 text-cyan-400" />{title}</span>
        <span className="text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded border border-green-400/20 flex items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse"></span>LIVE
        </span>
      </div>

      {/* Video Content Placeholder */}
      <div className="flex-1 relative flex items-center justify-center bg-[#0b1120]">
        {isPlaying ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-cyan-900/40">
            <Video className="w-16 h-16 mb-2 opacity-50" />
            <span className="text-sm font-mono tracking-widest opacity-50">STREAMING...</span>
            <div className="absolute bottom-4 right-4 text-[10px] text-gray-500 font-mono">
              URL: {url}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
            <Play className="w-12 h-12 text-white/50" />
          </div>
        )}
      </div>

      {/* Video Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsPlaying(!isPlaying)} className="p-1.5 text-gray-300 hover:text-white transition-colors" title={isPlaying ? "暂停" : "播放"}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 text-gray-300 hover:text-white transition-colors" title={isMuted ? "取消静音" : "静音"}>
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1.5 text-gray-300 hover:text-white transition-colors" title="截图">
            <Camera className="w-4 h-4" />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 text-gray-300 hover:text-white transition-colors" title={isFullscreen ? "退出全屏" : "全屏"}>
            {isFullscreen ? <X className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

const Component = () => {
  const [activeMenu1, setActiveMenu1] = useState('主界面');
  const [activeMenu2, setActiveMenu2] = useState('工作台01');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAlarmList, setShowAlarmList] = useState(false);
  const [selectedAgvId, setSelectedAgvId] = useState(MOCK_AGVS[0].id);
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [hoveredAgv, setHoveredAgv] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoTargetAgv, setVideoTargetAgv] = useState<any>(null);

  // Task Control Modal State
  const [taskConfirmModal, setTaskConfirmModal] = useState<{
    show: boolean;
    action: 'pause' | 'resume' | 'terminate' | null;
    agvId: string | null;
    taskId: string | null;
  }>({ show: false, action: null, agvId: null, taskId: null });

  const [agvsData, setAgvsData] = useState(MOCK_AGVS);

  // Traffic lights state
  const [trafficLights, setTrafficLights] = useState(MOCK_TRAFFIC_LIGHTS);
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);
  const [intervalInput, setIntervalInput] = useState<number>(30);
  const [modeInput, setModeInput] = useState<TrafficLightMode>(4);

  // 信号灯倒计时与变灯逻辑（模式4：红→黄3s闪烁→绿→循环，红/绿末5s闪烁）
  useEffect(() => {
    const timer = setInterval(() => {
      setTrafficLights((prev) => prev.map(tickTrafficLight));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const openLightConfig = (light: TrafficLightItem) => {
    setSelectedLightId(light.id);
    setIntervalInput(light.interval);
    setModeInput(light.mode);
  };

  const saveLightConfig = () => {
    if (!selectedLightId) return;
    const interval = Math.max(1, Math.floor(intervalInput || 1));
    setTrafficLights((prev) =>
      prev.map((light) => {
        if (light.id !== selectedLightId) return light;
        if (light.offline) return { ...light, interval };
        const mode = modeInput;
        let phaseColor: LampColor = 'red';
        let countdown = 0;
        if (mode === 4) {
          phaseColor = 'red';
          countdown = interval;
        }
        return { ...light, mode, interval, phaseColor, countdown };
      })
    );
    setSelectedLightId(null);
  };

  const selectedLight = trafficLights.find(l => l.id === selectedLightId) || null;

  const [taskDetailModal, setTaskDetailModal] = useState<{
    show: boolean;
    agvId: string | null;
  }>({ show: false, agvId: null });

  // Task creation form state
  const getInitialTaskForm = () => ({
    name: '',
    trigger: '人工确认',
    planTime: '',
    agv: '01无人车',
    details: [
      { id: Date.now() + 1, type: '车辆调度', target: '制样归批', action: '-', emptyCount: '' },
      { id: Date.now() + 2, type: '样桶装卸', target: '制样归批', action: '21装空桶', emptyCount: 6 },
    ]
  });

  const [taskForm, setTaskForm] = useState(getInitialTaskForm());

  // Map transform state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapTransform, setMapTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!mapContainerRef.current) return;

    const scaleAdjust = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(1, Math.min(mapTransform.scale * scaleAdjust, 5)); // Min scale 1, Max scale 5

    if (newScale === mapTransform.scale) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate new position to zoom towards mouse cursor
    const newX = mouseX - (mouseX - mapTransform.x) * (newScale / mapTransform.scale);
    const newY = mouseY - (mouseY - mapTransform.y) * (newScale / mapTransform.scale);

    // Bounding box logic to keep map within view when zoomed
    let boundedX = newX;
    let boundedY = newY;
    if (newScale === 1) {
      boundedX = 0;
      boundedY = 0;
    } else {
      const maxX = 0;
      const maxY = 0;
      // Allow dragging but keep at least some part of the map visible
      const minX = rect.width - rect.width * newScale;
      const minY = rect.height - rect.height * newScale;
      boundedX = Math.max(minX, Math.min(maxX, newX));
      boundedY = Math.max(minY, Math.min(maxY, newY));
    }

    setMapTransform({ scale: newScale, x: boundedX, y: boundedY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mapTransform.scale === 1) return; // Don't drag if not zoomed
    setIsDragging(true);
    setDragStart({ x: e.clientX - mapTransform.x, y: e.clientY - mapTransform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    const maxX = 0;
    const maxY = 0;
    const minX = rect.width - rect.width * mapTransform.scale;
    const minY = rect.height - rect.height * mapTransform.scale;

    const boundedX = Math.max(minX, Math.min(maxX, newX));
    const boundedY = Math.max(minY, Math.min(maxY, newY));

    setMapTransform(prev => ({ ...prev, x: boundedX, y: boundedY }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeaveMap = () => {
    setIsDragging(false);
  };

  // Prevent default scrolling on map container
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelNative);
    };
  }, []);

  const handleMouseEnterStation = (id: string) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoveredStation(id);
  };

  const handleMouseLeaveStation = () => {
    const timeout = setTimeout(() => {
      setHoveredStation(null);
    }, 300);
    setHoverTimeout(timeout);
  };

  const handleMouseEnterAgv = (id: string) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoveredAgv(id);
  };

  const handleMouseLeaveAgv = () => {
    const timeout = setTimeout(() => {
      setHoveredAgv(null);
    }, 300);
    setHoverTimeout(timeout);
  };

  const handleTaskAction = (action: 'pause' | 'resume' | 'terminate', agvId: string, taskId: string) => {
    setTaskConfirmModal({ show: true, action, agvId, taskId });
  };

  const confirmTaskAction = () => {
    if (!taskConfirmModal.action || !taskConfirmModal.agvId) return;

    setAgvsData(prev => prev.map(agv => {
      if (agv.id === taskConfirmModal.agvId && agv.task) {
        let newTaskStatus = agv.task.status;
        let newDetails = [...agv.task.details];

        if (taskConfirmModal.action === 'pause') {
          newTaskStatus = '暂停';
          newDetails = newDetails.map(d => d.status === '执行中' || d.status === '未执行' ? { ...d, status: '暂停' } : d);
        } else if (taskConfirmModal.action === 'resume') {
          newTaskStatus = '执行中';
          newDetails = newDetails.map(d => d.status === '暂停' ? { ...d, status: '执行中' } : d);
        } else if (taskConfirmModal.action === 'terminate') {
          newTaskStatus = '终止';
          newDetails = newDetails.map(d => d.status === '执行中' || d.status === '暂停' || d.status === '未执行' ? { ...d, status: '异常终止' } : d);
        }

        return {
          ...agv,
          taskStatus: newTaskStatus,
          task: {
            ...agv.task,
            status: newTaskStatus,
            details: newDetails
          }
        };
      }
      return agv;
    }));

    setTaskConfirmModal({ show: false, action: null, agvId: null, taskId: null });
  };

  const selectedAgv = agvsData.find(a => a.id === selectedAgvId) || agvsData[0];
  const hasAlarms = MOCK_ALARMS.length > 0;

  return (
    <div className="min-h-screen bg-[#0b1120] text-gray-200 font-sans overflow-hidden flex flex-col workbench-01-root">
      
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

        <div className="flex items-center space-x-6">
          <div className="text-sm text-cyan-400 font-mono">2023-10-24 10:15:32</div>
          <button className="p-2 hover:bg-cyan-900/30 rounded-full text-cyan-400 transition-colors">
            <Power className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Level 2 Menu */}
      <div className="h-12 bg-[#0f172a]/50 border-b border-cyan-900/30 flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center space-x-8">
          {['工作台', '工作台01', '任务管理', '任务日志查询', '车辆监控', '报警查询'].map(item => (
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
        
        {/* Global Alarm Icon (Level 2) */}
        {hasAlarms && (
          <div className="relative">
            <button 
              onClick={() => setShowAlarmList(!showAlarmList)}
              className="relative p-1.5 rounded text-red-400 hover:bg-red-900/30 transition-colors animate-pulse-ring flex items-center space-x-1"
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="text-xs font-medium">报警信息</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#0f172a]"></span>
            </button>
            
            {showAlarmList && (
              <div className="absolute right-0 mt-2 w-80 bg-[#1e293b] border border-red-900/50 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="bg-red-900/40 px-4 py-2 border-b border-red-900/50 flex justify-between items-center">
                  <span className="text-red-400 font-medium text-sm flex items-center"><ShieldAlert className="w-4 h-4 mr-1" /> 实时报警信息</span>
                  <button onClick={() => setShowAlarmList(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="max-h-64 overflow-auto custom-scrollbar p-2 space-y-2">
                  {MOCK_ALARMS.map(alarm => (
                    <div key={alarm.id} className="bg-[#0f172a]/60 p-2 rounded border-l-2 border-red-500 text-xs">
                      <div className="flex justify-between text-gray-400 mb-1">
                        <span>{alarm.source}</span>
                        <span>{alarm.time}</span>
                      </div>
                      <div className="text-red-300">{alarm.msg}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 flex gap-4 overflow-hidden relative">
        
        {/* Left: Map Area */}
        <div className="flex-1 bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg overflow-hidden relative flex flex-col">
          <div className="absolute top-4 left-4 z-10 bg-[#0f172a]/80 backdrop-blur px-3 py-1.5 rounded border border-cyan-900/50 text-sm text-cyan-400 flex items-center shadow-lg">
            <MapPin className="w-4 h-4 mr-2" />
            厂区调运区域平面图
          </div>

          {/* Map Placeholder */}
          <div 
            ref={mapContainerRef}
            className="flex-1 bg-[#2a3241]/30 relative overflow-hidden pattern-grid cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeaveMap}
          >
            <div 
              className="absolute inset-0 transition-transform duration-100 ease-out origin-top-left"
              style={{ transform: `translate(${mapTransform.x}px, ${mapTransform.y}px) scale(${mapTransform.scale})` }}
            >
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.8)_0,transparent_100%)]"></div>
              
              {/* Render Stations */}
            {MOCK_STATIONS.map(station => (
              <div 
                key={station.id} 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 group"
                style={{ left: `${station.x}%`, top: `${station.y}%` }}
                onMouseEnter={() => handleMouseEnterStation(station.id)}
                onMouseLeave={handleMouseLeaveStation}
              >
                {/* Station Marker */}
                <div className="relative">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center bg-[#0f172a] cursor-pointer
                    ${station.type === 'loading' ? 'border-indigo-400 text-indigo-400' : 
                      station.type === 'unloading' ? 'border-purple-400 text-purple-400' : 'border-gray-400 text-gray-400'}
                  `}>
                    <Box className="w-3 h-3" />
                  </div>
                  
                  {/* Side Panel (Always visible next to marker) */}
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 bg-[#0f172a]/90 border border-cyan-900/50 rounded px-2 py-1.5 text-xs whitespace-nowrap shadow-lg flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5 border-r border-cyan-900/50 pr-2">
                      <span className="font-medium text-gray-200">{station.name}</span>
                      {station.comm === '在线' ? (
                        <Wifi className="w-3 h-3 text-green-400" title="通讯在线" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-gray-500" title="通讯离线" />
                      )}
                    </div>
                    {station.type !== 'normal' && (
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-500 scale-90">设备:</span>
                          <StatusBadge status={station.deviceStatus} />
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-500 scale-90">流程:</span>
                          <span className="text-gray-300 bg-[#1e293b] px-1.5 py-0.5 rounded">{station.flowStatus}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover Popover */}
                {hoveredStation === station.id && station.type !== 'normal' && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.15)] z-50 pointer-events-auto cursor-default text-sm">
                    <div className="px-3 py-2 border-b border-cyan-900/50 flex justify-between items-center bg-[#1e293b]/50">
                      <div className="font-medium text-cyan-300 flex items-center"><Box className="w-4 h-4 mr-1" /> {station.name} ({station.id})</div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowTaskModal(true); }}
                        className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded transition-colors flex items-center"
                      >
                        <Plus className="w-3 h-3 mr-1" /> 创建任务
                      </button>
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="flex space-x-2">
                        <StatusBadge status={station.deviceStatus} />
                        <span className="text-xs text-gray-300 bg-gray-800 px-2 py-0.5 rounded">{station.flowStatus}</span>
                      </div>
                      
                      {station.type === 'loading' && station.emptyLine && (
                        <div className="space-y-2 text-xs bg-[#1e293b]/30 p-2 rounded">
                          <div className="flex justify-between">
                            <span className="text-gray-400">空桶缓存线:</span>
                            <span>{station.emptyLine.current}/{station.emptyLine.cap} <span className="text-red-400 ml-1">(需:{station.emptyLine.req})</span></span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">集样器工位:</span>
                            <span>空:{station.workStation?.empty} 满:{station.workStation?.full}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">满桶缓存线:</span>
                            <span>{station.fullLine?.current}/{station.fullLine?.cap}</span>
                          </div>
                        </div>
                      )}

                      {station.type === 'unloading' && (
                        <div className="space-y-2 text-xs bg-[#1e293b]/30 p-2 rounded flex justify-between items-center">
                          <span className="text-gray-400">暂存空桶数:</span>
                          <span className="text-lg font-bold text-white">{station.emptyStored}</span>
                        </div>
                      )}

                      {station.approaching && (
                        <div className="text-xs border-t border-cyan-900/30 pt-2 flex items-center text-cyan-400">
                          <Navigation className="w-3 h-3 mr-1" />
                          {station.approaching.name} 正在前往，预计 {station.approaching.eta} 到达
                        </div>
                      )}
                    </div>
                    {/* Arrow */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0f172a] border-b border-r border-cyan-500/50 transform rotate-45"></div>
                  </div>
                )}
              </div>
            ))}

            {/* Render AGVs */}
            {agvsData.map(agv => (
              <div 
                key={agv.id} 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 group"
                style={{ left: `${agv.x}%`, top: `${agv.y}%` }}
                onMouseEnter={() => handleMouseEnterAgv(agv.id)}
                onMouseLeave={handleMouseLeaveAgv}
              >
                {/* AGV Marker */}
                <div className="relative">
                  <div className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.4)]
                    ${agv.alarm ? 'border-red-500 bg-red-900/80 animate-pulse' : 'border-cyan-400 bg-[#0f172a] text-cyan-400'}
                  `}>
                    <Truck className={`w-4 h-4 z-10 ${agv.alarm ? 'text-red-100' : ''}`} />
                    
                    {/* Direction Arrow */}
                    {agv.heading !== null && (
                      <div 
                        className="absolute inset-0 pointer-events-none flex items-center justify-center"
                        style={{ transform: `rotate(${agv.heading}deg)` }}
                      >
                        <div className="absolute -top-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-cyan-400"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Side Panel (Always visible) */}
                  <div className="absolute left-10 top-1/2 -translate-y-1/2 bg-[#0f172a]/90 border border-cyan-900/50 rounded px-2 py-1.5 text-xs whitespace-nowrap shadow-lg flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5 border-r border-cyan-900/50 pr-2">
                      <span className="font-bold text-cyan-300">{agv.name}</span>
                      {agv.comm === '在线' ? (
                        <Wifi className="w-3 h-3 text-green-400" title="通讯在线" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-gray-500" title="通讯离线" />
                      )}
                      {agv.gps === '定位有效' ? (
                        <Navigation2 className="w-3 h-3 text-green-400" title="定位有效" />
                      ) : (
                        <NavigationOff className="w-3 h-3 text-red-400" title="定位无效" />
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {agv.assist !== '无' && <span className="text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/30">辅助:{agv.assist}</span>}
                      {agv.alarm && (
                        <div className="flex items-center justify-center bg-red-500/20 p-1 rounded-full border border-red-500/50 animate-pulse">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-400" title="报警中" />
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-1 border-l border-cyan-900/50 pl-2">
                        <span className="text-gray-500 scale-90">设备:</span>
                        <StatusBadge status={agv.deviceStatus} />
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-500 scale-90">流程:</span>
                        <span className="text-gray-300 bg-[#1e293b] px-1.5 py-0.5 rounded">{agv.flowStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Popover */}
                {hoveredAgv === agv.id && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[420px] bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.2)] z-50 pointer-events-auto cursor-default text-sm flex flex-col">
                    <div className="px-3 py-2 border-b border-cyan-900/50 flex justify-between items-center bg-[#1e293b]/50">
                      <div className="font-medium text-cyan-300 flex items-center"><Truck className="w-4 h-4 mr-1" /> {agv.name} ({agv.id})</div>
                      <div className="flex items-center space-x-3">
                        <div className="text-xs text-gray-400">{agv.mode} | {agv.taskStatus}</div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setVideoTargetAgv(agv); setShowVideoModal(true); setHoveredAgv(null); }}
                          className="p-1 text-cyan-400 hover:text-white hover:bg-cyan-900/50 rounded transition-colors"
                          title="实时监控"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-3 space-y-3">
                      {/* Destination */}
                      {agv.targetStation !== '-' && (
                        <div className="flex items-center text-xs text-cyan-400 bg-cyan-900/20 p-2 rounded">
                          <Navigation className="w-4 h-4 mr-2" />
                          <span>前往: <span className="font-bold text-white">{agv.targetStation}</span>，预计 {agv.eta} 到达</span>
                        </div>
                      )}

                      {/* Basic & Operation */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-gray-400">定位状态: <span className="text-gray-200">{agv.gps}</span></div>
                        <div className="text-gray-400">当前档位: <span className="text-gray-200">{agv.gear}</span></div>
                        <div className="text-gray-400">运行速度: <span className="text-gray-200">{agv.speed}</span></div>
                        <div className="text-gray-400">柜门状态: <span className="text-gray-200">{agv.door}</span></div>
                      </div>

                      {/* Lines */}
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500 border-b border-cyan-900/30 pb-0.5">滚筒线状态</div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {agv.lines.map(line => (
                            <div key={line.id} className="bg-[#1e293b]/50 p-1.5 rounded flex items-center justify-between text-xs">
                              <span className="text-gray-400">线{line.id}:</span>
                              <span className="text-cyan-300">{line.loaded}/{line.cap}</span>
                              <span className={line.type === '满桶' ? 'text-yellow-400' : 'text-blue-400'}>{line.type}</span>
                              <span className="text-gray-400 w-16 text-right truncate" title={line.target}>{line.target}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Monitoring */}
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500 border-b border-cyan-900/30 pb-0.5">监控参数</div>
                        <div className="grid grid-cols-3 gap-1.5 text-xs bg-[#1e293b]/30 p-1.5 rounded">
                          <div className="col-span-3 flex justify-between items-center text-gray-300 pb-1 border-b border-cyan-900/20">
                            <span className="flex items-center"><Battery className={`w-3 h-3 mr-1 ${agv.battery.remain > 20 ? 'text-green-400' : 'text-red-400'}`} /> 电量: {agv.battery.remain}%</span>
                            <span>续航: {agv.battery.range}</span>
                            <span>总里程: {agv.battery.total}</span>
                          </div>
                          <div className="text-gray-400 pt-0.5">温度: <span className="text-gray-200">{agv.battery.temp}</span></div>
                          <div className="text-gray-400 pt-0.5">电流: <span className="text-gray-200">{agv.battery.cur}</span></div>
                          <div className="text-gray-400 pt-0.5">电压: <span className="text-gray-200">{agv.battery.vol}</span></div>
                        </div>
                        {agv.faults.length > 0 && (
                          <div className="mt-1 space-y-1">
                            <div className="text-xs text-red-400 mb-0.5">实时故障:</div>
                            {agv.faults.map((f, i) => (
                              <div key={i} className="text-xs bg-red-900/20 text-red-300 p-1.5 rounded flex justify-between">
                                <span>{f.name} ({f.type})</span>
                                <span>{f.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    {/* Task Info Mini */}
                      {(agv.taskStatus === '正在执行' || agv.taskStatus === '暂停') && agv.task ? (
                        <div className="space-y-1">
                          <div className="text-xs text-cyan-400 border-b border-cyan-900/30 pb-0.5 flex justify-between">
                            <span>当前执行任务: {agv.task.id}</span>
                            <StatusBadge status={agv.task.status} />
                          </div>
                          <div className="text-xs text-gray-400">任务名称: <span className="text-gray-200">{agv.task.name}</span></div>
                          <div className="text-xs text-gray-400">开始时间: <span className="text-gray-200">{agv.task.startTime}</span></div>
                          
                          <div className="text-xs text-cyan-400 border-b border-cyan-900/30 pb-0.5 mt-2">任务明细</div>
                          <div className="space-y-1">
                            {agv.task.details.map((detail, idx) => (
                              <div key={detail.id} className={`bg-[#0f172a]/30 p-1.5 rounded border text-xs relative transition-colors ${
                                detail.status === '执行中' 
                                  ? 'border-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.2)] bg-cyan-900/20' 
                                  : 'border-cyan-900/20'
                              }`}>
                                <div className="flex justify-between mb-1">
                                  <span className={`font-medium ${detail.status === '执行中' ? 'text-cyan-300' : 'text-gray-300'}`}>
                                    {idx + 1}. {detail.type}
                                  </span>
                                  <StatusBadge status={detail.status} />
                                </div>
                                <div className="flex justify-between text-gray-400">
                                  <span>{detail.target} - {detail.action}</span>
                                  {detail.emptyCount !== '-' && <span>空桶: {detail.emptyCount}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="pt-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setTaskDetailModal({ show: true, agvId: agv.id }); setHoveredAgv(null); }}
                              className="w-full py-1.5 bg-[#1e293b] hover:bg-[#2a3a50] border border-cyan-900/50 rounded text-cyan-400 text-xs transition-colors"
                            >
                              查看任务详情
                            </button>
                          </div>

                          <div className="flex space-x-2 pt-1 mt-2">
                          {agv.task.status === '执行中' && (
                            <button onClick={(e) => { e.stopPropagation(); handleTaskAction('pause', agv.id, agv.task!.id); }} className="flex-1 bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 text-xs py-1 rounded transition-colors flex items-center justify-center"><Pause className="w-3 h-3 mr-1" />暂停</button>
                          )}
                          {agv.task.status === '暂停' && (
                            <button onClick={(e) => { e.stopPropagation(); handleTaskAction('resume', agv.id, agv.task!.id); }} className="flex-1 bg-green-900/40 hover:bg-green-800/60 text-green-300 text-xs py-1 rounded transition-colors flex items-center justify-center"><PlayCircle className="w-3 h-3 mr-1" />恢复</button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleTaskAction('terminate', agv.id, agv.task!.id); }} className="flex-1 bg-red-900/40 hover:bg-red-800/60 text-red-300 text-xs py-1 rounded transition-colors flex items-center justify-center"><Square className="w-3 h-3 mr-1" />终止</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-xs flex flex-col items-center justify-center py-4 bg-[#1e293b]/20 rounded border border-cyan-900/20">
                        <Box className="w-6 h-6 mb-1 opacity-20" />
                        小车当前无正在执行任务
                      </div>
                    )}
                    </div>
                    {/* Arrow */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0f172a] border-b border-r border-cyan-500/50 transform rotate-45"></div>
                  </div>
                )}
              </div>
            ))}

            {/* Render Traffic Lights */}
            {trafficLights.map((light) => {
              const lamps = light.offline
                ? { redOn: false, yellowOn: false, greenOn: false, redBlink: false, yellowBlink: false, greenBlink: false }
                : getLampState(light);
              const showCountdown = !light.offline && light.mode === 4;
              return (
                <div
                  key={light.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 group"
                  style={{ left: `${light.x}%`, top: `${light.y}%` }}
                >
                  <div
                    className={`wb01-traffic-marker relative flex items-center px-1 py-1 rounded bg-[#0b1120] border-2 shadow-lg cursor-pointer overflow-hidden
                      ${light.offline ? 'border-gray-600' : lamps.redOn ? 'border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.4)]' : lamps.greenOn ? 'border-green-500/60 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : lamps.yellowOn ? 'border-yellow-500/60 shadow-[0_0_12px_rgba(250,204,21,0.35)]' : 'border-gray-600'}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      openLightConfig(light);
                    }}
                    title={`${light.name} - 点击下发配置`}
                  >
                    <TrafficLightLamps
                      lamps={lamps}
                      offline={light.offline}
                      compact
                      showReadings={showCountdown}
                      phaseColor={light.phaseColor}
                      countdown={light.countdown}
                    />
                  </div>
                </div>
              );
            })}
            </div>

            {/* 信号灯图例（点击下发配置） */}
            <div
              className="wb01-light-legend group absolute bottom-6 left-6 z-30"
              onClick={(e) => {
                e.stopPropagation();
                const target = trafficLights.find((l) => l.id === selectedLightId) || trafficLights[0];
                if (target) openLightConfig(target);
              }}
              title="点击下发信号灯配置"
            >
              <div className="wb01-light-legend__inner">
                <TrafficLightLegendPreview />
                <div className="wb01-light-legend__text">
                  <span className="wb01-light-legend__title">厂内信号灯</span>
                  <span className="wb01-light-legend__hint">红 · 黄 · 绿 · 点击下发配置</span>
                </div>
                <TrafficCone className="w-4 h-4 shrink-0 text-cyan-600/50 group-hover:text-cyan-400 transition-colors" />
              </div>
            </div>
          </div>
          {/* Floating Task Panel (Top Right) */}
          <div className="absolute top-8 right-8 z-30 w-[560px] flex flex-col gap-3 pointer-events-none">
            {agvsData.map(agv => (
              <div key={agv.id} className="bg-[#0f172a]/90 backdrop-blur-md border border-cyan-900/50 rounded-lg shadow-[0_4px_20px_rgba(0,255,255,0.1)] pointer-events-auto flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-4 py-2 border-b border-cyan-900/30 flex justify-between items-center bg-[#1e293b]/50">
                  <div className="flex items-center">
                    <Truck className="w-4 h-4 mr-2 text-cyan-400" />
                    <span className="text-white font-medium text-sm">{agv.name}</span>
                    {agv.taskStatus === '正在执行' && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>}
                    {agv.task && <span className="ml-3 text-xs text-cyan-300 font-mono bg-cyan-900/30 px-2 py-0.5 rounded border border-cyan-900/50">{agv.task.id}</span>}
                  </div>
                  <div className="flex items-center space-x-2">
                    {agv.task && (
                      <div className="flex space-x-1 border-r border-cyan-900/50 pr-2">
                        {agv.task.status === '执行中' && (
                          <button onClick={() => handleTaskAction('pause', agv.id, agv.task!.id)} className="p-1 text-cyan-400 hover:bg-cyan-900/50 rounded" title="暂停"><Pause className="w-3.5 h-3.5" /></button>
                        )}
                        {agv.task.status === '暂停' && (
                          <button onClick={() => handleTaskAction('resume', agv.id, agv.task!.id)} className="p-1 text-green-400 hover:bg-green-900/50 rounded" title="恢复"><PlayCircle className="w-3.5 h-3.5" /></button>
                        )}
                        <button onClick={() => handleTaskAction('terminate', agv.id, agv.task!.id)} className="p-1 text-red-400 hover:bg-red-900/50 rounded" title="终止"><Square className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                    {agv.task && (
                      <button 
                        onClick={() => { setTaskDetailModal({ show: true, agvId: agv.id }); }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        详情
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Timeline Content */}
                <div className="p-3">
                  {agv.task && (agv.taskStatus === '正在执行' || agv.taskStatus === '暂停') ? (
                    <div className="flex items-center overflow-x-auto custom-scrollbar pb-2 pt-1 px-1">
                      {agv.task.details.map((detail, idx) => (
                        <div key={detail.id} className="flex items-center shrink-0">
                          {/* Node */}
                          <div className={`relative flex flex-col items-center justify-center w-[120px] h-16 rounded border transition-all duration-300 ${
                            detail.status === '执行中' ? 'bg-cyan-900/40 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' :
                            detail.status === '已完成' ? 'bg-[#1e293b]/60 border-green-500/50' :
                            'bg-[#0f172a]/40 border-gray-700 opacity-60'
                          }`}>
                            {detail.status === '已完成' && <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                            {detail.status === '执行中' && <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center animate-pulse"><PlayCircle className="w-3 h-3 text-[#0f172a]" /></div>}
                            
                            <span className={`text-xs font-medium mb-1 ${detail.status === '执行中' ? 'text-cyan-300' : detail.status === '已完成' ? 'text-green-400' : 'text-gray-400'}`}>{detail.type}</span>
                            <span className="text-[10px] text-gray-500 truncate w-full px-2 text-center" title={`${detail.target}-${detail.action}`}>{detail.target}</span>
                          </div>
                          
                          {/* Line */}
                          {idx < agv.task!.details.length - 1 && (
                            <div className={`w-8 h-0.5 mx-1 transition-colors duration-300 ${
                              detail.status === '已完成' ? 'bg-green-500/50' : 'bg-gray-700'
                            }`}></div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-xs flex flex-col items-center justify-center py-2">
                      <Box className="w-5 h-5 mb-1 opacity-20" />
                      无正在执行任务
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

      </main>

      {/* Video Monitoring Modal */}
      {showVideoModal && videoTargetAgv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(0,255,255,0.15)] w-[1000px] flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-4 py-3 border-b border-cyan-900/50 bg-[#1e293b]/50">
              <h3 className="text-white font-medium text-lg flex items-center">
                <Video className="w-5 h-5 mr-2 text-cyan-400" />
                {videoTargetAgv.name} - 实时监控
              </h3>
              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-400 bg-[#0b1120] px-2 py-1 rounded border border-cyan-900/30">推流地址获取成功</span>
                <button onClick={() => { setShowVideoModal(false); setVideoTargetAgv(null); }} className="text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-700/50 p-1.5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 grid grid-cols-2 gap-4 flex-1 overflow-hidden">
              <div className="flex flex-col space-y-2">
                <h4 className="text-cyan-300 text-sm font-medium border-l-2 border-cyan-400 pl-2">环视视角</h4>
                <VideoPlayer 
                  title="CAM-01 环视摄像头" 
                  url={`rtsp://10.0.0.15:554/cam/surround/${videoTargetAgv.id.toLowerCase()}`} 
                />
              </div>
              <div className="flex flex-col space-y-2">
                <h4 className="text-cyan-300 text-sm font-medium border-l-2 border-cyan-400 pl-2">后视视角</h4>
                <VideoPlayer 
                  title="CAM-02 后视摄像头" 
                  url={`rtsp://10.0.0.15:554/cam/rear/${videoTargetAgv.id.toLowerCase()}`} 
                />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-cyan-900/50 flex justify-between items-center bg-[#0b1120]">
              <div className="text-xs text-gray-500 flex items-center">
                <ShieldAlert className="w-4 h-4 mr-1 text-gray-600" />
                监控画面可能存在 1-2 秒延迟
              </div>
              <button onClick={() => { setShowVideoModal(false); setVideoTargetAgv(null); }} className="px-6 py-1.5 rounded bg-[#1e293b] border border-gray-600 hover:bg-gray-800 text-gray-300 text-sm transition-colors">
                关闭监控
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {taskDetailModal.show && taskDetailModal.agvId && (() => {
        const agv = agvsData.find(a => a.id === taskDetailModal.agvId);
        if (!agv || !agv.task) return null;
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.15)] w-[800px] flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center px-6 py-4 border-b border-cyan-900/50 bg-[#1e293b]/50">
                <h3 className="text-white font-medium text-lg flex items-center">
                  <Box className="w-5 h-5 mr-2 text-cyan-400" />
                  任务详情 - {agv.task.id}
                </h3>
                <button onClick={() => setTaskDetailModal({ show: false, agvId: null })} className="text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-700/50 p-1.5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6">
                {/* 1. 任务主要信息 */}
                <div>
                  <h4 className="text-sm font-medium text-cyan-400 mb-3 flex items-center border-l-2 border-cyan-400 pl-2">主要信息</h4>
                  <div className="bg-[#1e293b]/40 rounded border border-cyan-900/30 p-4 grid grid-cols-3 gap-y-4 gap-x-6">
                    <div><span className="text-gray-500 text-sm block mb-1">任务编号</span><span className="text-gray-200 font-mono">{agv.task.id}</span></div>
                    <div><span className="text-gray-500 text-sm block mb-1">任务名称</span><span className="text-gray-200">{agv.task.name}</span></div>
                    <div><span className="text-gray-500 text-sm block mb-1">状态</span><StatusBadge status={agv.task.status} /></div>
                    <div><span className="text-gray-500 text-sm block mb-1">作业小车</span><span className="text-gray-200">{agv.name}</span></div>
                    <div><span className="text-gray-500 text-sm block mb-1">触发方式</span><span className="text-gray-200">{agv.task.trigger}</span></div>
                    <div><span className="text-gray-500 text-sm block mb-1">确认人</span><span className="text-gray-200">{agv.task.confirmUser}</span></div>
                    <div><span className="text-gray-500 text-sm block mb-1">开始时间</span><span className="text-gray-200">{agv.task.startTime}</span></div>
                  </div>
                </div>

                {/* 2. 任务明细子任务信息 */}
                <div>
                  <h4 className="text-sm font-medium text-cyan-400 mb-3 flex items-center border-l-2 border-cyan-400 pl-2">明细子任务</h4>
                  <div className="space-y-3">
                    {agv.task.details.map((detail, idx) => (
                      <div key={detail.id} className={`bg-[#1e293b]/40 rounded border p-4 ${
                        detail.status === '执行中' 
                          ? 'border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
                          : 'border-cyan-900/30'
                      }`}>
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-cyan-900/30">
                          <span className={`font-medium ${detail.status === '执行中' ? 'text-cyan-300' : 'text-gray-200'}`}>
                            子任务 {idx + 1}：{detail.type}
                          </span>
                          <StatusBadge status={detail.status} />
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div><span className="text-gray-500 mr-2">装卸端</span><span className="text-gray-300">{detail.target}</span></div>
                          <div><span className="text-gray-500 mr-2">操作类型</span><span className="text-gray-300">{detail.action}</span></div>
                          <div><span className="text-gray-500 mr-2">配送空桶数量</span><span className="text-gray-300">{detail.emptyCount}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. 实时过程日志信息 */}
                <div className="flex-1 flex flex-col min-h-[200px]">
                  <h4 className="text-sm font-medium text-cyan-400 mb-3 flex items-center border-l-2 border-cyan-400 pl-2">实时过程日志</h4>
                  <div className="flex-1 bg-[#0f172a]/80 rounded border border-cyan-900/30 p-3 overflow-y-auto custom-scrollbar">
                    {agv.logs.map((log, idx) => (
                      <div key={idx} className="flex space-x-3 text-sm p-2 hover:bg-[#1e293b]/50 rounded transition-colors border-l-2 border-transparent" style={{
                        borderLeftColor: log.type === 'error' ? '#ef4444' : log.type === 'warn' ? '#eab308' : '#3b82f6'
                      }}>
                        <div className="text-gray-500 font-mono w-20 shrink-0">{log.time}</div>
                        <div className={`flex-1 ${
                          log.type === 'error' ? 'text-red-400' : 
                          log.type === 'warn' ? 'text-yellow-400' : 'text-gray-300'
                        }`}>{log.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.15)] w-[600px] flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-4 py-3 border-b border-cyan-900/50">
              <h3 className="text-white font-medium text-lg">创建调度任务</h3>
              <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <Plus className="w-5 h-5 transform rotate-45" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">任务名称 <span className="text-gray-500 text-xs ml-1">(非必填)</span></label>
                  <input 
                    type="text" 
                    value={taskForm.name}
                    onChange={(e) => setTaskForm({...taskForm, name: e.target.value})}
                    placeholder="请输入任务名称"
                    className="w-full bg-[#1e293b] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">触发方式</label>
                  <select 
                    value={taskForm.trigger}
                    onChange={(e) => setTaskForm({...taskForm, trigger: e.target.value})}
                    className="w-full bg-[#1e293b] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option>人工确认</option>
                    <option>定时自动开始</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    计划开始时间 {taskForm.trigger === '定时自动开始' && <span className="text-red-500">*</span>}
                  </label>
                  <input 
                    type="datetime-local" 
                    disabled={taskForm.trigger !== '定时自动开始'}
                    className="w-full bg-[#1e293b] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">作业小车</label>
                  <select 
                    value={taskForm.agv}
                    onChange={(e) => setTaskForm({...taskForm, agv: e.target.value})}
                    className="w-full bg-[#1e293b] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option>01无人车</option>
                    <option>02有人车</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-2">任务明细</label>
                <div className="border border-cyan-900/50 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1e293b]">
                      <tr>
                        <th className="py-2 px-2 font-medium text-gray-300 w-12">序号</th>
                        <th className="py-2 px-2 font-medium text-gray-300 w-24">任务类型</th>
                        <th className="py-2 px-2 font-medium text-gray-300 w-24">装卸端</th>
                        <th className="py-2 px-2 font-medium text-gray-300 w-32">操作类型</th>
                        <th className="py-2 px-2 font-medium text-gray-300 w-20">空桶数</th>
                        <th className="py-2 px-2 font-medium text-gray-300 w-10">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskForm.details.map((detail, index) => (
                        <tr key={detail.id} className="border-b border-cyan-900/20 last:border-0">
                          <td className="p-1 text-center text-gray-400">{index + 1}</td>
                          <td className="p-1">
                            <select 
                              value={detail.type}
                              onChange={(e) => {
                                const newDetails = [...taskForm.details];
                                newDetails[index].type = e.target.value;
                                setTaskForm({...taskForm, details: newDetails});
                              }}
                              className="w-full bg-[#0b1120] border border-cyan-900/50 rounded px-1 py-1 text-white"
                            >
                              <option>样桶装卸</option>
                              <option>车辆调度</option>
                            </select>
                          </td>
                          <td className="p-1">
                            <select 
                              value={detail.target}
                              onChange={(e) => {
                                const newDetails = [...taskForm.details];
                                newDetails[index].target = e.target.value;
                                setTaskForm({...taskForm, details: newDetails});
                              }}
                              className="w-full bg-[#0b1120] border border-cyan-900/50 rounded px-1 py-1 text-white"
                            >
                              <option value="1#汽车集样">1#汽采集样</option>
                              <option value="2#汽采集样">2#汽采集样</option>
                              <option value="火采集样">火采集样</option>
                              <option value="卸样端">卸样端</option>
                              <option value="制样归批">归批制样</option>
                              <option value="充电处">充电处</option>
                            </select>
                          </td>
                          <td className="p-1">
                            <select 
                              disabled={detail.type === '车辆调度'}
                              value={detail.action}
                              onChange={(e) => {
                                const newDetails = [...taskForm.details];
                                newDetails[index].action = e.target.value;
                                setTaskForm({...taskForm, details: newDetails});
                              }}
                              className="w-full bg-[#0b1120] border border-cyan-900/50 rounded px-1 py-1 text-white disabled:opacity-50"
                            >
                              {detail.type === '车辆调度' ? (
                                <option>-</option>
                              ) : (
                                <>
                                  <option>11卸空桶</option>
                                  <option>22装满桶</option>
                                  <option>31卸空桶装满桶</option>
                                  <option>12卸满桶</option>
                                  <option>21装空桶</option>
                                  <option>32卸满桶装空桶</option>
                                </>
                              )}
                            </select>
                          </td>
                          <td className="p-1">
                            <input 
                              type="number" 
                              disabled={detail.type === '车辆调度' || detail.target.startsWith('XS')}
                              value={detail.emptyCount}
                              onChange={(e) => {
                                const newDetails = [...taskForm.details];
                                newDetails[index].emptyCount = e.target.value;
                                setTaskForm({...taskForm, details: newDetails});
                              }}
                              className="w-full bg-[#0b1120] border border-cyan-900/50 rounded px-2 py-1 text-white disabled:opacity-50" 
                            />
                          </td>
                          <td className="p-1 text-center">
                            <button 
                              onClick={() => {
                                const newDetails = taskForm.details.filter(d => d.id !== detail.id);
                                setTaskForm({...taskForm, details: newDetails});
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Plus className="w-4 h-4 transform rotate-45 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button 
                    onClick={() => {
                      setTaskForm({
                        ...taskForm, 
                        details: [...taskForm.details, { id: Date.now(), type: '样桶装卸', target: '1#汽车集样', action: '11卸空桶', emptyCount: '6' }]
                      })
                    }}
                    className="w-full py-1.5 text-xs text-cyan-400 hover:bg-cyan-900/20 border-t border-cyan-900/50 transition-colors flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>添加明细</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-cyan-900/50 flex justify-end space-x-3 bg-[#1e293b]/50">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm transition-colors">
                取消
              </button>
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-sm transition-colors shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                确定创建
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Traffic Light Config Modal */}
      {selectedLight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.15)] w-[480px] flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b border-cyan-900/50 bg-[#1e293b]/50">
              <h3 className="text-white font-medium text-lg flex items-center">
                <TrafficCone className="w-5 h-5 mr-2 text-cyan-400" />
                信号灯配置 - {selectedLight.name}
              </h3>
              <button onClick={() => setSelectedLightId(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* 选择信号灯 */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">选择信号灯</label>
                <select
                  value={selectedLight.id}
                  onChange={(e) => {
                    const light = trafficLights.find((l) => l.id === e.target.value);
                    if (light) openLightConfig(light);
                  }}
                  className="w-full h-10 px-3 bg-[#0b1120] border border-cyan-900/50 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  {trafficLights.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 三灯预览 */}
              <div className="flex items-center justify-between bg-[#1e293b]/40 rounded border border-cyan-900/30 px-4 py-3">
                <span className="text-sm text-gray-400">灯体预览</span>
                <div className="flex items-center gap-3">
                  <TrafficLightLamps
                    lamps={getLampState(selectedLight)}
                    offline={selectedLight.offline}
                    compact
                    showReadings={!selectedLight.offline && selectedLight.mode === 4}
                    phaseColor={selectedLight.phaseColor}
                    countdown={selectedLight.countdown}
                  />
                  <span className="text-sm text-gray-300">{getPhaseLabel(selectedLight)}</span>
                </div>
              </div>

              {/* 信号灯模式 - 分段单选 */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  <span className="text-red-500 mr-1">*</span>信号灯模式
                </label>
                <div
                  role="radiogroup"
                  aria-label="信号灯模式"
                  className={`inline-flex flex-wrap gap-1 p-1 rounded-lg bg-[#0b1120] border border-cyan-900/50 w-full ${selectedLight.offline ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {TRAFFIC_LIGHT_MODE_OPTIONS.map((opt) => {
                    const selected = modeInput === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        title={opt.label}
                        onClick={() => setModeInput(opt.value)}
                        className={`flex-1 min-w-[72px] px-2 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap
                          ${selected
                            ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e293b]/60'}
                        `}
                      >
                        {opt.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 变灯时间间隔 - 仅定时循环可编辑 */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  <span className="text-red-500 mr-1">*</span>变灯时间间隔（秒）
                </label>
                <div className={`flex items-center ${modeInput !== 4 || selectedLight.offline ? 'opacity-50 pointer-events-none' : ''}`}>
                  <button
                    onClick={() => setIntervalInput((v) => Math.max(1, Math.floor((v || 1) - 1)))}
                    className="w-10 h-10 flex items-center justify-center bg-[#1e293b] border border-cyan-900/50 rounded-l text-cyan-400 hover:bg-cyan-900/40 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={intervalInput}
                    disabled={modeInput !== 4 || selectedLight.offline}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setIntervalInput(0);
                        return;
                      }
                      const num = Math.floor(Number(raw));
                      if (!Number.isNaN(num)) setIntervalInput(num < 0 ? 0 : num);
                    }}
                    className="w-full h-10 text-center bg-[#0b1120] border-y border-cyan-900/50 text-white text-base focus:outline-none focus:border-cyan-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setIntervalInput((v) => Math.floor((v || 0) + 1))}
                    className="w-10 h-10 flex items-center justify-center bg-[#1e293b] border border-cyan-900/50 rounded-r text-cyan-400 hover:bg-cyan-900/40 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                  <Info className="w-3 h-3 mr-1" />
                  {modeInput === 4
                    ? '红/绿相持续时间；黄灯固定 3s 闪烁过渡；红/绿末 5s 闪烁'
                    : '仅「4 定时循环」模式下可编辑变灯时间间隔'}
                </p>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-cyan-900/50 flex justify-end space-x-3 bg-[#1e293b]/50">
              <button onClick={() => setSelectedLightId(null)} className="px-4 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm transition-colors">
                取消
              </button>
              <button
                onClick={saveLightConfig}
                disabled={selectedLight.offline || (modeInput === 4 && (!intervalInput || intervalInput < 1))}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-sm transition-colors shadow-[0_0_10px_rgba(0,255,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                下发配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Action Confirmation Modal */}
      {taskConfirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.15)] w-[400px] flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b border-cyan-900/50">
              <h3 className="text-white font-medium text-lg flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
                确认操作
              </h3>
              <button onClick={() => setTaskConfirmModal({ show: false, action: null, agvId: null, taskId: null })} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-gray-300 text-sm">
              {taskConfirmModal.action === 'pause' && "您确定要暂停当前任务吗？未执行的样桶装卸和车辆调度子任务将被暂停。"}
              {taskConfirmModal.action === 'resume' && "您确定要恢复执行当前暂停的任务吗？"}
              {taskConfirmModal.action === 'terminate' && (
                <div>
                  <span className="text-red-400 block mb-2">警告：当前任务正在执行。</span>
                  确认强行终止结束任务？
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-cyan-900/50 flex justify-end space-x-3 bg-[#1e293b]/50">
              <button onClick={() => setTaskConfirmModal({ show: false, action: null, agvId: null, taskId: null })} className="px-4 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm transition-colors">
                取消
              </button>
              <button onClick={confirmTaskAction} className={`px-4 py-1.5 rounded text-white text-sm transition-colors shadow-lg ${
                taskConfirmModal.action === 'terminate' ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'
              }`}>
                确认{taskConfirmModal.action === 'pause' ? '暂停' : taskConfirmModal.action === 'resume' ? '恢复' : '终止'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Component;
