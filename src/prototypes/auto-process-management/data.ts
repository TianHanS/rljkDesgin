/**
 * 自动化流程管理 · Mock 数据与类型
 */

export interface ModuleType {
  id: string;
  code: string;
  name: string;
}

export interface ConfigParam {
  id: string;
  moduleTypeId: string;
  code: string;
  name: string;
  dataType: string;
  remark?: string;
}

export interface MessageConfig {
  id: string;
  activityId: string;
  name: string;
  code: string;
  ledEnabled: boolean;
  ledTemplate: string;
  voiceEnabled: boolean;
  voiceTemplate: string;
  remark?: string;
}

export interface ActivityParamRef {
  paramId: string;
  sort: number;
}

export interface ProcessActivity {
  id: string;
  processId: string;
  code: string;
  name: string;
  seq: number;
  enabled: boolean;
  remark?: string;
  paramRefs: ActivityParamRef[];
  messages: MessageConfig[];
}

export interface ProcessConfig {
  id: string;
  moduleTypeId: string;
  name: string;
  remark?: string;
  updatedAt: string;
  activities: ProcessActivity[];
}

export const MODULE_TYPES: ModuleType[] = [
  { id: 'mt-entry', code: 'MEOR', name: '入厂登记' },
  { id: 'mt-sample', code: 'SAMP', name: '汽车采样' },
  { id: 'mt-weigh', code: 'WEIGH', name: '汽车过衡' },
  { id: 'mt-unload', code: 'UNLD', name: '卸煤管理' },
  { id: 'mt-exit', code: 'EXIT', name: '出厂登记' },
  { id: 'mt-lab', code: 'LAB', name: '化验管理' },
];

export const CONFIG_PARAMS: ConfigParam[] = [
  { id: 'p1', moduleTypeId: 'mt-entry', code: 'FIELD_vehicleNo', name: '车牌号码', dataType: 'string' },
  { id: 'p2', moduleTypeId: 'mt-entry', code: 'FIELD_cardNo', name: '车辆卡号', dataType: 'string' },
  { id: 'p3', moduleTypeId: 'mt-entry', code: 'FIELD_ticketHeight', name: '矿发净重', dataType: 'number' },
  { id: 'p4', moduleTypeId: 'mt-entry', code: 'OPERATION_yunYiCode', name: '云驿扫码', dataType: 'boolean' },
  { id: 'p5', moduleTypeId: 'mt-entry', code: 'OPERATION_planCode', name: '计划码扫码', dataType: 'boolean' },
  { id: 'p6', moduleTypeId: 'mt-entry', code: 'FIELD_simplingName', name: '采样位', dataType: 'string' },
  { id: 'p7', moduleTypeId: 'mt-entry', code: 'FIELD_poundName', name: '过衡位', dataType: 'string' },
  { id: 'p8', moduleTypeId: 'mt-sample', code: 'FIELD_sampleMode', name: '采样方式', dataType: 'string' },
  { id: 'p9', moduleTypeId: 'mt-sample', code: 'FIELD_sampleDevice', name: '采样机编号', dataType: 'string' },
  { id: 'p10', moduleTypeId: 'mt-sample', code: 'OPERATION_autoSample', name: '自动采样启用', dataType: 'boolean' },
  { id: 'p11', moduleTypeId: 'mt-weigh', code: 'FIELD_grossWeight', name: '毛重', dataType: 'number' },
  { id: 'p12', moduleTypeId: 'mt-weigh', code: 'FIELD_tareWeight', name: '皮重', dataType: 'number' },
  { id: 'p13', moduleTypeId: 'mt-weigh', code: 'OPERATION_printTicket', name: '打印过磅单', dataType: 'boolean' },
  { id: 'p14', moduleTypeId: 'mt-unload', code: 'FIELD_unloadArea', name: '卸煤区域', dataType: 'string' },
  { id: 'p15', moduleTypeId: 'mt-unload', code: 'OPERATION_gateOpen', name: '道闸抬杆', dataType: 'boolean' },
];

const now = () => '2026-08-28 10:20:00';

export const INITIAL_PROCESSES: ProcessConfig[] = [
  {
    id: 'proc-1',
    moduleTypeId: 'mt-entry',
    name: '入厂登记全自动流程',
    remark: '南门/北门通用入厂自动化',
    updatedAt: '2026-08-27 16:40:00',
    activities: [
      {
        id: 'act-1',
        processId: 'proc-1',
        code: 'ENTRY_SCAN',
        name: '扫码识别',
        seq: 1,
        enabled: true,
        remark: '云驿/计划码扫码',
        paramRefs: [
          { paramId: 'p4', sort: 1 },
          { paramId: 'p5', sort: 2 },
        ],
        messages: [
          {
            id: 'msg-1',
            activityId: 'act-1',
            name: '扫码成功提示',
            code: 'ENTRY_SCAN_OK',
            ledEnabled: true,
            ledTemplate: '{plate} 扫码成功，请通行',
            voiceEnabled: true,
            voiceTemplate: '{plate}请入厂',
            remark: '',
          },
        ],
      },
      {
        id: 'act-2',
        processId: 'proc-1',
        code: 'ENTRY_REGISTER',
        name: '确认登记',
        seq: 2,
        enabled: true,
        remark: '',
        paramRefs: [
          { paramId: 'p1', sort: 1 },
          { paramId: 'p3', sort: 2 },
        ],
        messages: [
          {
            id: 'msg-2',
            activityId: 'act-2',
            name: '登记成功提示',
            code: 'ENTRY_REG_OK',
            ledEnabled: true,
            ledTemplate: '{plate} 登记成功',
            voiceEnabled: false,
            voiceTemplate: '',
          },
        ],
      },
      {
        id: 'act-3',
        processId: 'proc-1',
        code: 'ENTRY_DISPATCH',
        name: '分配采样过衡位',
        seq: 3,
        enabled: false,
        remark: '默认禁用，按需启用',
        paramRefs: [
          { paramId: 'p6', sort: 1 },
          { paramId: 'p7', sort: 2 },
        ],
        messages: [],
      },
    ],
  },
  {
    id: 'proc-2',
    moduleTypeId: 'mt-sample',
    name: '汽车采样自动流程',
    remark: '',
    updatedAt: '2026-08-26 09:12:00',
    activities: [
      {
        id: 'act-4',
        processId: 'proc-2',
        code: 'SAMP_READY',
        name: '采样就绪校验',
        seq: 1,
        enabled: true,
        paramRefs: [{ paramId: 'p9', sort: 1 }],
        messages: [],
      },
      {
        id: 'act-5',
        processId: 'proc-2',
        code: 'SAMP_EXEC',
        name: '执行采样',
        seq: 2,
        enabled: true,
        paramRefs: [
          { paramId: 'p8', sort: 1 },
          { paramId: 'p10', sort: 2 },
        ],
        messages: [
          {
            id: 'msg-3',
            activityId: 'act-5',
            name: '采样完成提示',
            code: 'SAMP_DONE',
            ledEnabled: true,
            ledTemplate: '采样完成，请前往过衡',
            voiceEnabled: true,
            voiceTemplate: '采样完成请前往过衡',
          },
        ],
      },
    ],
  },
];

export const findModuleType = (id: string) => MODULE_TYPES.find((m) => m.id === id);

export const paramsByModule = (moduleTypeId: string) =>
  CONFIG_PARAMS.filter((p) => p.moduleTypeId === moduleTypeId);

export const formatStamp = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}`;
};

export const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export { now };
