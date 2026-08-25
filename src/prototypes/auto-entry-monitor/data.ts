/**
 * 自动入厂监测 · 通道、发卡点、排队与日志 Mock
 *
 * 参考资料：
 * - /src/prototypes/auto-entry-monitor/spec.md
 * - /src/prototypes/manual-entry-registration/data.ts
 */

export type DeviceStatus = 'online' | 'offline';
export type LogLevel = 'normal' | 'exception';
export type LogKind =
  | 'recognize'
  | 'register-ok'
  | 'register-fail'
  | 'abnormal'
  | 'inspect'
  | 'cut-in'
  | 'service'
  | 'offline';

export type QueueStatus = 'waiting' | 'approaching' | 'overtime';

export interface ChannelInfo {
  id: string;
  name: string;
  gateIds: string[];
}

export interface GatePoint {
  id: string;
  channelId: string;
  name: string;
  cameraName: string;
  recognizer: DeviceStatus;
  led: DeviceStatus;
  serviceEnabled: boolean;
  ledText: string;
  currentPlate: string;
}

export interface RunLog {
  id: string;
  gateId: string;
  time: string;
  level: LogLevel;
  kind: LogKind;
  message: string;
  plate?: string;
}

export interface EntryRecord {
  id: string;
  gateId: string;
  plate: string;
  enterAt: string;
  samplePos: string;
  weighPos: string;
}

export interface QueueVehicle {
  id: string;
  channelId: string;
  seq: number;
  plate: string;
  cargo: string;
  supplier: string;
  waitMin: number;
  status: QueueStatus;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatClock(d: Date): string {
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${formatDateTime(d)} 星期${week}`;
}

function minutesAgo(base: Date, min: number, sec = 0): string {
  return formatDateTime(new Date(base.getTime() - min * 60_000 - sec * 1000));
}

export const LOG_KIND_LABEL: Record<LogKind, string> = {
  recognize: '识别车辆',
  'register-ok': '登记成功',
  'register-fail': '登记失败',
  abnormal: '车辆异常',
  inspect: '车辆抽检',
  'cut-in': '车辆插队',
  service: '服务启停',
  offline: '设备离线',
};

export const QUEUE_STATUS_LABEL: Record<QueueStatus, string> = {
  waiting: '排队中',
  approaching: '即将入厂',
  overtime: '等待超时',
};

export const SAMPLE_POS = ['1#机械采样', '2#机械采样', '3#人工采样', '4#机械采样'];
export const WEIGH_POS = ['1#汽车衡', '2#汽车衡', '3#汽车衡', '4#汽车衡'];

export const CHANNELS: ChannelInfo[] = [
  { id: 'south', name: '南门通道', gateIds: ['south-1', 'south-2'] },
  { id: 'north', name: '北门通道', gateIds: ['north-1', 'north-2'] },
  { id: 'east', name: '东门通道', gateIds: ['east-1', 'east-2', 'east-3'] },
];

export function createInitialGates(): GatePoint[] {
  return [
    {
      id: 'south-1',
      channelId: 'south',
      name: '南门 1#发卡点',
      cameraName: 'CAM-S1 车号识别',
      recognizer: 'online',
      led: 'online',
      serviceEnabled: true,
      ledText: '欢迎入厂  鲁B·8G267  请驶入 1#车道',
      currentPlate: '鲁B8G267',
    },
    {
      id: 'south-2',
      channelId: 'south',
      name: '南门 2#发卡点',
      cameraName: 'CAM-S2 车号识别',
      recognizer: 'online',
      led: 'online',
      serviceEnabled: true,
      ledText: '请排队等候  下一位 豫C·19086',
      currentPlate: '豫C19086',
    },
    {
      id: 'north-1',
      channelId: 'north',
      name: '北门 1#发卡点',
      cameraName: 'CAM-N1 车号识别',
      recognizer: 'online',
      led: 'online',
      serviceEnabled: true,
      ledText: '欢迎入厂  晋M·66521  请驶入采样',
      currentPlate: '晋M66521',
    },
    {
      id: 'north-2',
      channelId: 'north',
      name: '北门 2#发卡点',
      cameraName: 'CAM-N2 车号识别',
      recognizer: 'offline',
      led: 'offline',
      serviceEnabled: true,
      ledText: '设备离线  暂停自动入厂',
      currentPlate: '',
    },
    {
      id: 'east-1',
      channelId: 'east',
      name: '东门 1#发卡点',
      cameraName: 'CAM-E1 车号识别',
      recognizer: 'online',
      led: 'online',
      serviceEnabled: true,
      ledText: '欢迎入厂  蒙K·32817',
      currentPlate: '蒙K32817',
    },
    {
      id: 'east-2',
      channelId: 'east',
      name: '东门 2#发卡点',
      cameraName: 'CAM-E2 车号识别',
      recognizer: 'online',
      led: 'online',
      serviceEnabled: true,
      ledText: '抽检车辆  请停靠抽检区  陕A·77209',
      currentPlate: '陕A77209',
    },
    {
      id: 'east-3',
      channelId: 'east',
      name: '东门 3#发卡点',
      cameraName: 'CAM-E3 车号识别',
      recognizer: 'online',
      led: 'online',
      serviceEnabled: false,
      ledText: '自动入厂已关闭  请转人工通道',
      currentPlate: '冀J44108',
    },
  ];
}

export function createInitialLogs(now: Date): RunLog[] {
  return [
    { id: 'ls1', gateId: 'south-1', time: minutesAgo(now, 0, 18), level: 'normal', kind: 'register-ok', plate: '鲁B8G267', message: '登记成功 鲁B8G267，采样位 1#机械采样，过衡位 1#汽车衡' },
    { id: 'ls2', gateId: 'south-1', time: minutesAgo(now, 0, 22), level: 'normal', kind: 'recognize', plate: '鲁B8G267', message: '识别车辆 鲁B8G267，置信度 98%' },
    { id: 'ls3', gateId: 'south-1', time: minutesAgo(now, 4, 10), level: 'normal', kind: 'inspect', plate: '皖S22901', message: '车辆抽检 皖S22901，已引导至抽检区' },
    { id: 'ls4', gateId: 'south-1', time: minutesAgo(now, 8, 40), level: 'exception', kind: 'abnormal', plate: '黑H77320', message: '车辆异常 黑H77320：预入厂状态为禁止入厂登记' },
    { id: 'ls5', gateId: 'south-1', time: minutesAgo(now, 12, 5), level: 'normal', kind: 'register-ok', plate: '豫A66102', message: '登记成功 豫A66102，采样位 2#机械采样，过衡位 2#汽车衡' },
    { id: 'ls6', gateId: 'south-1', time: minutesAgo(now, 12, 12), level: 'normal', kind: 'recognize', plate: '豫A66102', message: '识别车辆 豫A66102，置信度 97%' },
    { id: 'ls7', gateId: 'south-1', time: minutesAgo(now, 18, 33), level: 'exception', kind: 'cut-in', plate: '鲁N44018', message: '车辆插队 鲁N44018：未按排队序号驶入识别区' },
    { id: 'ls8', gateId: 'south-1', time: minutesAgo(now, 25, 2), level: 'normal', kind: 'register-ok', plate: '晋D90811', message: '登记成功 晋D90811，采样位 1#机械采样，过衡位 1#汽车衡' },

    { id: 'lt1', gateId: 'south-2', time: minutesAgo(now, 1, 5), level: 'normal', kind: 'recognize', plate: '豫C19086', message: '识别车辆 豫C19086，正在核验计划' },
    { id: 'lt2', gateId: 'south-2', time: minutesAgo(now, 3, 20), level: 'normal', kind: 'register-ok', plate: '鲁Q33560', message: '登记成功 鲁Q33560，采样位 3#人工采样，过衡位 2#汽车衡' },
    { id: 'lt3', gateId: 'south-2', time: minutesAgo(now, 6, 48), level: 'exception', kind: 'register-fail', plate: '豫P21044', message: '登记失败 豫P21044：未匹配到来煤计划' },
    { id: 'lt4', gateId: 'south-2', time: minutesAgo(now, 6, 52), level: 'normal', kind: 'recognize', plate: '豫P21044', message: '识别车辆 豫P21044，置信度 95%' },
    { id: 'lt5', gateId: 'south-2', time: minutesAgo(now, 11, 16), level: 'normal', kind: 'register-ok', plate: '冀H88217', message: '登记成功 冀H88217，采样位 2#机械采样，过衡位 1#汽车衡' },
    { id: 'lt6', gateId: 'south-2', time: minutesAgo(now, 16, 9), level: 'exception', kind: 'abnormal', plate: '苏E19002', message: '车辆异常 苏E19002：车号识别与运单车牌不一致' },
    { id: 'lt7', gateId: 'south-2', time: minutesAgo(now, 22, 41), level: 'normal', kind: 'inspect', plate: '鲁A77831', message: '车辆抽检 鲁A77831，已下发 LED 抽检提示' },

    { id: 'ln1', gateId: 'north-1', time: minutesAgo(now, 2, 8), level: 'normal', kind: 'register-ok', plate: '晋M66521', message: '登记成功 晋M66521，采样位 1#机械采样，过衡位 3#汽车衡' },
    { id: 'ln2', gateId: 'north-1', time: minutesAgo(now, 2, 14), level: 'normal', kind: 'recognize', plate: '晋M66521', message: '识别车辆 晋M66521，置信度 99%' },
    { id: 'ln3', gateId: 'north-1', time: minutesAgo(now, 9, 30), level: 'normal', kind: 'register-ok', plate: '蒙B44190', message: '登记成功 蒙B44190，采样位 2#机械采样，过衡位 3#汽车衡' },
    { id: 'ln4', gateId: 'north-1', time: minutesAgo(now, 15, 11), level: 'exception', kind: 'cut-in', plate: '晋C22018', message: '车辆插队 晋C22018：绕行识别杆进入车道' },

    { id: 'lo1', gateId: 'north-2', time: minutesAgo(now, 7, 0), level: 'exception', kind: 'offline', message: '车号识别器离线，自动入厂暂停' },
    { id: 'lo2', gateId: 'north-2', time: minutesAgo(now, 7, 2), level: 'exception', kind: 'offline', message: 'LED 大屏通讯中断' },
    { id: 'lo3', gateId: 'north-2', time: minutesAgo(now, 41, 20), level: 'normal', kind: 'register-ok', plate: '冀F10228', message: '登记成功 冀F10228，采样位 4#机械采样，过衡位 4#汽车衡' },

    { id: 'le1', gateId: 'east-1', time: minutesAgo(now, 1, 40), level: 'normal', kind: 'register-ok', plate: '蒙K32817', message: '登记成功 蒙K32817，采样位 1#机械采样，过衡位 2#汽车衡' },
    { id: 'le2', gateId: 'east-1', time: minutesAgo(now, 5, 22), level: 'normal', kind: 'recognize', plate: '辽H90912', message: '识别车辆 辽H90912，置信度 96%' },
    { id: 'le3', gateId: 'east-1', time: minutesAgo(now, 14, 3), level: 'normal', kind: 'register-ok', plate: '吉A55108', message: '登记成功 吉A55108，采样位 2#机械采样，过衡位 1#汽车衡' },

    { id: 'lf1', gateId: 'east-2', time: minutesAgo(now, 0, 50), level: 'normal', kind: 'inspect', plate: '陕A77209', message: '车辆抽检 陕A77209，请停靠抽检区' },
    { id: 'lf2', gateId: 'east-2', time: minutesAgo(now, 0, 55), level: 'normal', kind: 'recognize', plate: '陕A77209', message: '识别车辆 陕A77209，置信度 97%' },
    { id: 'lf3', gateId: 'east-2', time: minutesAgo(now, 10, 18), level: 'exception', kind: 'register-fail', plate: '宁D33021', message: '登记失败 宁D33021：运单二维码已失效' },
    { id: 'lf4', gateId: 'east-2', time: minutesAgo(now, 19, 44), level: 'normal', kind: 'register-ok', plate: '甘A88264', message: '登记成功 甘A88264，采样位 3#人工采样，过衡位 4#汽车衡' },

    { id: 'lg1', gateId: 'east-3', time: minutesAgo(now, 21, 0), level: 'normal', kind: 'service', message: '已停用自动入厂登记服务，请转人工通道' },
    { id: 'lg2', gateId: 'east-3', time: minutesAgo(now, 28, 16), level: 'normal', kind: 'register-ok', plate: '冀J44108', message: '登记成功 冀J44108，采样位 4#机械采样，过衡位 3#汽车衡' },
    { id: 'lg3', gateId: 'east-3', time: minutesAgo(now, 36, 9), level: 'exception', kind: 'abnormal', plate: '京A90011', message: '车辆异常 京A90011：不在本日来煤计划名单' },
  ];
}

export function createInitialRecords(now: Date): EntryRecord[] {
  return [
    { id: 'rs1', gateId: 'south-1', plate: '鲁B8G267', enterAt: minutesAgo(now, 0, 18), samplePos: '1#机械采样', weighPos: '1#汽车衡' },
    { id: 'rs2', gateId: 'south-1', plate: '豫A66102', enterAt: minutesAgo(now, 12, 5), samplePos: '2#机械采样', weighPos: '2#汽车衡' },
    { id: 'rs3', gateId: 'south-1', plate: '晋D90811', enterAt: minutesAgo(now, 25, 2), samplePos: '1#机械采样', weighPos: '1#汽车衡' },
    { id: 'rs4', gateId: 'south-1', plate: '鲁H22019', enterAt: minutesAgo(now, 41, 30), samplePos: '2#机械采样', weighPos: '2#汽车衡' },
    { id: 'rs5', gateId: 'south-1', plate: '豫N44100', enterAt: minutesAgo(now, 58, 12), samplePos: '1#机械采样', weighPos: '1#汽车衡' },

    { id: 'rt1', gateId: 'south-2', plate: '鲁Q33560', enterAt: minutesAgo(now, 3, 20), samplePos: '3#人工采样', weighPos: '2#汽车衡' },
    { id: 'rt2', gateId: 'south-2', plate: '冀H88217', enterAt: minutesAgo(now, 11, 16), samplePos: '2#机械采样', weighPos: '1#汽车衡' },
    { id: 'rt3', gateId: 'south-2', plate: '皖B10933', enterAt: minutesAgo(now, 33, 8), samplePos: '1#机械采样', weighPos: '2#汽车衡' },
    { id: 'rt4', gateId: 'south-2', plate: '豫S77218', enterAt: minutesAgo(now, 49, 41), samplePos: '4#机械采样', weighPos: '1#汽车衡' },

    { id: 'rn1', gateId: 'north-1', plate: '晋M66521', enterAt: minutesAgo(now, 2, 8), samplePos: '1#机械采样', weighPos: '3#汽车衡' },
    { id: 'rn2', gateId: 'north-1', plate: '蒙B44190', enterAt: minutesAgo(now, 9, 30), samplePos: '2#机械采样', weighPos: '3#汽车衡' },
    { id: 'rn3', gateId: 'north-1', plate: '陕C11820', enterAt: minutesAgo(now, 27, 55), samplePos: '1#机械采样', weighPos: '4#汽车衡' },

    { id: 'ro1', gateId: 'north-2', plate: '冀F10228', enterAt: minutesAgo(now, 41, 20), samplePos: '4#机械采样', weighPos: '4#汽车衡' },

    { id: 're1', gateId: 'east-1', plate: '蒙K32817', enterAt: minutesAgo(now, 1, 40), samplePos: '1#机械采样', weighPos: '2#汽车衡' },
    { id: 're2', gateId: 'east-1', plate: '吉A55108', enterAt: minutesAgo(now, 14, 3), samplePos: '2#机械采样', weighPos: '1#汽车衡' },
    { id: 're3', gateId: 'east-1', plate: '辽B33007', enterAt: minutesAgo(now, 38, 21), samplePos: '1#机械采样', weighPos: '2#汽车衡' },

    { id: 'rf1', gateId: 'east-2', plate: '甘A88264', enterAt: minutesAgo(now, 19, 44), samplePos: '3#人工采样', weighPos: '4#汽车衡' },
    { id: 'rf2', gateId: 'east-2', plate: '陕B20918', enterAt: minutesAgo(now, 44, 6), samplePos: '2#机械采样', weighPos: '3#汽车衡' },

    { id: 'rg1', gateId: 'east-3', plate: '冀J44108', enterAt: minutesAgo(now, 28, 16), samplePos: '4#机械采样', weighPos: '3#汽车衡' },
  ];
}

export const QUEUE_VEHICLES: QueueVehicle[] = [
  { id: 'qs1', channelId: 'south', seq: 1, plate: '豫C19086', cargo: '烟煤', supplier: '兖矿物流', waitMin: 4, status: 'approaching' },
  { id: 'qs2', channelId: 'south', seq: 2, plate: '鲁L55201', cargo: '混煤', supplier: '枣庄矿业', waitMin: 11, status: 'waiting' },
  { id: 'qs3', channelId: 'south', seq: 3, plate: '晋E90822', cargo: '贫瘦煤', supplier: '同煤集团', waitMin: 18, status: 'waiting' },
  { id: 'qs4', channelId: 'south', seq: 4, plate: '冀D44119', cargo: '褐煤', supplier: '开滦股份', waitMin: 26, status: 'waiting' },
  { id: 'qs5', channelId: 'south', seq: 5, plate: '豫H22076', cargo: '烟煤', supplier: '永煤物流', waitMin: 34, status: 'overtime' },
  { id: 'qs6', channelId: 'south', seq: 6, plate: '皖S11804', cargo: '洗中煤', supplier: '淮北矿业', waitMin: 41, status: 'overtime' },

  { id: 'qn1', channelId: 'north', seq: 1, plate: '蒙C77210', cargo: '褐煤', supplier: '伊泰煤炭', waitMin: 7, status: 'approaching' },
  { id: 'qn2', channelId: 'north', seq: 2, plate: '晋K33045', cargo: '贫煤', supplier: '阳煤集团', waitMin: 16, status: 'waiting' },
  { id: 'qn3', channelId: 'north', seq: 3, plate: '陕F10928', cargo: '烟煤', supplier: '陕煤运销', waitMin: 22, status: 'waiting' },
  { id: 'qn4', channelId: 'north', seq: 4, plate: '宁A44103', cargo: '混煤', supplier: '神华宁煤', waitMin: 31, status: 'overtime' },

  { id: 'qe1', channelId: 'east', seq: 1, plate: '辽H90912', cargo: '褐煤', supplier: '平庄煤业', waitMin: 6, status: 'approaching' },
  { id: 'qe2', channelId: 'east', seq: 2, plate: '吉B22019', cargo: '长焰煤', supplier: '通化矿业', waitMin: 13, status: 'waiting' },
  { id: 'qe3', channelId: 'east', seq: 3, plate: '黑A77102', cargo: '褐煤', supplier: '龙煤物流', waitMin: 21, status: 'waiting' },
  { id: 'qe4', channelId: 'east', seq: 4, plate: '蒙E44820', cargo: '烟煤', supplier: '准格尔运销', waitMin: 29, status: 'waiting' },
  { id: 'qe5', channelId: 'east', seq: 5, plate: '冀J19005', cargo: '混煤', supplier: '冀中能源', waitMin: 38, status: 'overtime' },
];

export const LIVE_PLATES = [
  '鲁K22817', '豫B44109', '晋A90833', '冀C77201', '蒙D33018',
  '陕H11920', '皖Q55264', '苏L20811', '辽M44107', '甘N99021',
];

export function gateDeviceStatus(gate: GatePoint): DeviceStatus {
  return gate.recognizer === 'online' ? 'online' : 'offline';
}

export function pairWindows(gateIds: string[]): Array<[string, string]> {
  if (gateIds.length < 2) return [];
  const windows: Array<[string, string]> = [];
  for (let i = 0; i <= gateIds.length - 2; i += 1) {
    windows.push([gateIds[i], gateIds[i + 1]]);
  }
  return windows;
}

export function nextLogId(): string {
  return `lg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
