/**
 * 厂外调度 · 通道、设备、识别日志与排队队列
 *
 * 参考资料：
 * - 用户提供的厂外调度（厂外排队监控）需求
 * - /rules/design-guide.md
 */

export type QueueStatus = 'normal' | 'frozen' | 'priority';
export type DeviceKind = 'anpr' | 'led' | 'barrier' | 'terminal';
export type DeviceHealth = 'online' | 'alarm' | 'offline';

export interface EntryPointRef {
  id: string;
  name: string;
}

export interface QueueChannel {
  id: string;
  name: string;
  ticketPrefix: string;
  entryPoints: EntryPointRef[];
}

export interface ChannelDevice {
  id: string;
  channelId: string;
  kind: DeviceKind;
  name: string;
  health: DeviceHealth;
  remark: string;
}

export interface RecognizeLog {
  id: string;
  channelId: string;
  plate: string;
  recognizedAt: string;
}

export interface QueueVehicle {
  id: string;
  channelId: string;
  seq: number;
  ticketNo: string;
  plate: string;
  queuedAt: string;
  status: QueueStatus;
  allowEntry: boolean;
}

export const CHANNELS: QueueChannel[] = [
  {
    id: 'south',
    name: '南入厂通道',
    ticketPrefix: 'S',
    entryPoints: [
      { id: 'south-gate', name: '南门入厂点' },
      { id: 'west-gate', name: '西门入厂点' },
    ],
  },
  {
    id: 'north',
    name: '北入厂通道',
    ticketPrefix: 'N',
    entryPoints: [{ id: 'north-gate', name: '北门入厂点' }],
  },
  {
    id: 'east',
    name: '东入厂通道',
    ticketPrefix: 'E',
    entryPoints: [{ id: 'east-gate', name: '东门入厂点' }],
  },
];

export const DEVICES: ChannelDevice[] = [
  { id: 'd-s-anpr', channelId: 'south', kind: 'anpr', name: '南通道车号识别相机', health: 'online', remark: '车道 1 抓拍正常' },
  { id: 'd-s-led', channelId: 'south', kind: 'led', name: '南通道 LED 诱导屏', health: 'online', remark: '屏显随队首更新' },
  { id: 'd-s-gate', channelId: 'south', kind: 'barrier', name: '南通道道闸', health: 'online', remark: '落杆待命' },
  { id: 'd-s-term', channelId: 'south', kind: 'terminal', name: '南通道排队终端', health: 'online', remark: '自动取号可用' },
  { id: 'd-n-anpr', channelId: 'north', kind: 'anpr', name: '北通道车号识别相机', health: 'online', remark: '车道 1 抓拍正常' },
  { id: 'd-n-led', channelId: 'north', kind: 'led', name: '北通道 LED 诱导屏', health: 'alarm', remark: '通信不稳定，已降级本地缓存' },
  { id: 'd-n-gate', channelId: 'north', kind: 'barrier', name: '北通道道闸', health: 'online', remark: '落杆待命' },
  { id: 'd-n-term', channelId: 'north', kind: 'terminal', name: '北通道排队终端', health: 'online', remark: '自动取号可用' },
  { id: 'd-e-anpr', channelId: 'east', kind: 'anpr', name: '东通道车号识别相机', health: 'online', remark: '车道 1 抓拍正常' },
  { id: 'd-e-led', channelId: 'east', kind: 'led', name: '东通道 LED 诱导屏', health: 'online', remark: '屏显随队首更新' },
  { id: 'd-e-gate', channelId: 'east', kind: 'barrier', name: '东通道道闸', health: 'offline', remark: '控制回路断开' },
  { id: 'd-e-term', channelId: 'east', kind: 'terminal', name: '东通道排队终端', health: 'online', remark: '自动取号可用' },
];

export const KIND_LABEL: Record<DeviceKind, string> = {
  anpr: '车号识别',
  led: 'LED 诱导屏',
  barrier: '道闸',
  terminal: '排队终端',
};

export const HEALTH_LABEL: Record<DeviceHealth, string> = {
  online: '在线',
  alarm: '告警',
  offline: '离线',
};

export const STATUS_LABEL: Record<QueueStatus, string> = {
  normal: '正常',
  frozen: '冻结',
  priority: '优先',
};

export const PASSING_PLATES = [
  '蒙A90005',
  '湘C92223',
  '桂A8T216',
  '鲁B12876',
  '豫E33211',
  '晋M77821',
  '皖B55190',
  '陕A66208',
  '冀J41930',
  '宁C20817',
];

export const INITIAL_LOGS: RecognizeLog[] = [
  { id: 'l-s-6', channelId: 'south', plate: '晋M77821', recognizedAt: '2026-08-25 11:48:22' },
  { id: 'l-s-5', channelId: 'south', plate: '豫E33211', recognizedAt: '2026-08-25 11:46:05' },
  { id: 'l-s-4', channelId: 'south', plate: '蒙A90005', recognizedAt: '2026-08-25 11:41:18' },
  { id: 'l-s-3', channelId: 'south', plate: '鲁B12876', recognizedAt: '2026-08-25 11:36:40' },
  { id: 'l-s-2', channelId: 'south', plate: '桂A8T216', recognizedAt: '2026-08-25 11:28:11' },
  { id: 'l-s-1', channelId: 'south', plate: '湘C92223', recognizedAt: '2026-08-25 11:12:09' },
  { id: 'l-n-3', channelId: 'north', plate: '宁C20817', recognizedAt: '2026-08-25 11:44:51' },
  { id: 'l-n-2', channelId: 'north', plate: '冀J41930', recognizedAt: '2026-08-25 11:31:07' },
  { id: 'l-n-1', channelId: 'north', plate: '陕A66208', recognizedAt: '2026-08-25 11:18:33' },
  { id: 'l-e-2', channelId: 'east', plate: '皖B55190', recognizedAt: '2026-08-25 11:22:14' },
  { id: 'l-e-1', channelId: 'east', plate: '晋M77821', recognizedAt: '2026-08-25 10:58:02' },
];

export const INITIAL_QUEUE: QueueVehicle[] = [
  {
    id: 'q-s-1',
    channelId: 'south',
    seq: 1,
    ticketNo: 'S20260825018',
    plate: '桂A8T216',
    queuedAt: '2026-08-25 11:28:11',
    status: 'priority',
    allowEntry: true,
  },
  {
    id: 'q-s-2',
    channelId: 'south',
    seq: 2,
    ticketNo: 'S20260825019',
    plate: '鲁B12876',
    queuedAt: '2026-08-25 11:36:40',
    status: 'normal',
    allowEntry: true,
  },
  {
    id: 'q-s-3',
    channelId: 'south',
    seq: 3,
    ticketNo: 'S20260825020',
    plate: '蒙A90005',
    queuedAt: '2026-08-25 11:41:18',
    status: 'normal',
    allowEntry: true,
  },
  {
    id: 'q-s-4',
    channelId: 'south',
    seq: 4,
    ticketNo: 'S20260825021',
    plate: '豫E33211',
    queuedAt: '2026-08-25 11:46:05',
    status: 'normal',
    allowEntry: true,
  },
  {
    id: 'q-s-5',
    channelId: 'south',
    seq: 5,
    ticketNo: 'S20260825022',
    plate: '晋M77821',
    queuedAt: '2026-08-25 11:48:22',
    status: 'normal',
    allowEntry: true,
  },
  {
    id: 'q-s-6',
    channelId: 'south',
    seq: 6,
    ticketNo: 'S20260825012',
    plate: '湘C92223',
    queuedAt: '2026-08-25 11:12:09',
    status: 'frozen',
    allowEntry: false,
  },
  {
    id: 'q-s-7',
    channelId: 'south',
    seq: 7,
    ticketNo: 'S20260825008',
    plate: '皖B55190',
    queuedAt: '2026-08-25 10:54:33',
    status: 'frozen',
    allowEntry: false,
  },
  {
    id: 'q-n-1',
    channelId: 'north',
    seq: 1,
    ticketNo: 'N20260825006',
    plate: '陕A66208',
    queuedAt: '2026-08-25 11:18:33',
    status: 'normal',
    allowEntry: true,
  },
  {
    id: 'q-n-2',
    channelId: 'north',
    seq: 2,
    ticketNo: 'N20260825007',
    plate: '冀J41930',
    queuedAt: '2026-08-25 11:31:07',
    status: 'normal',
    allowEntry: true,
  },
  {
    id: 'q-n-3',
    channelId: 'north',
    seq: 3,
    ticketNo: 'N20260825008',
    plate: '宁C20817',
    queuedAt: '2026-08-25 11:44:51',
    status: 'frozen',
    allowEntry: false,
  },
  {
    id: 'q-e-1',
    channelId: 'east',
    seq: 1,
    ticketNo: 'E20260825003',
    plate: '晋M77821',
    queuedAt: '2026-08-25 10:58:02',
    status: 'normal',
    allowEntry: true,
  },
];

export const nextTicket = (channel: QueueChannel, vehicles: QueueVehicle[]) => {
  const seq = vehicles.filter((v) => v.channelId === channel.id).length + 30;
  return `${channel.ticketPrefix}20260825${String(seq).padStart(3, '0')}`;
};

export const formatNow = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}`;
};

export const plateSvgDataUri = (plate: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="88" viewBox="0 0 280 88">
    <rect width="280" height="88" rx="8" fill="#1657b8"/>
    <rect x="6" y="6" width="268" height="76" rx="5" fill="#1c6ad6" stroke="#d6e4ff" stroke-width="2"/>
    <text x="140" y="56" text-anchor="middle" font-size="36" font-family="Arial, 'Microsoft YaHei', sans-serif" font-weight="700" fill="#fff" letter-spacing="4">${plate}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const ledText = (
  plantQueueOn: boolean,
  yunyiOn: boolean,
  head?: QueueVehicle,
) => {
  if (yunyiOn) return '请使用云驿 APP 取号';
  if (!plantQueueOn) return '排队程序已停用';
  if (!head) return '暂无排队车辆';
  return `请 ${head.plate} 入厂  当前叫号 ${head.ticketNo}`;
};
