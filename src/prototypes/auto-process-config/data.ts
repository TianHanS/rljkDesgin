/**
 * 自动化流程配置 · Mock（依赖流程管理规格概念）
 */

export interface ModuleType {
  id: string;
  code: string;
  name: string;
}

/** 可选业务模块（实例） */
export interface BizModule {
  id: string;
  name: string;
  moduleTypeId: string;
}

export interface SpecParamOption {
  label: string;
  value: string | number | boolean;
}

export interface SpecParam {
  id: string;
  code: string;
  name: string;
  dataType: 'string' | 'number' | 'boolean' | 'select' | 'radio';
  required: boolean;
  constraint: string;
  description: string;
  /** 分组标题（详细参数分区展示） */
  group?: string;
  options?: Array<string | SpecParamOption>;
  defaultValue?: string | number | boolean | null;
}

export interface SpecMessage {
  id: string;
  name: string;
  code: string;
  ledEnabled: boolean;
  ledTemplate: string;
  voiceEnabled: boolean;
  voiceTemplate: string;
  /** LED/语音快捷输入文案 */
  ledQuickOptions?: string[];
  voiceQuickOptions?: string[];
}

export interface SpecActivity {
  id: string;
  code: string;
  name: string;
  remark: string;
  params: SpecParam[];
  messages: SpecMessage[];
}

export type ServiceStatus = 'running' | 'stopped';

export interface FlowStep {
  /** 流水线实例 id */
  instanceId: string;
  activityId: string;
}

export interface ParamValueMap {
  [paramId: string]: string | number | boolean | null;
}

export interface MessageValue {
  messageId: string;
  ledEnabled: boolean;
  ledTemplate: string;
  voiceEnabled: boolean;
  voiceTemplate: string;
}

export interface ActivityDetailConfig {
  activityId: string;
  paramValues: ParamValueMap;
  messages: MessageValue[];
  /** 环节变更后是否待复核 */
  needsReview: boolean;
}

export interface ModuleAutoConfig {
  id: string;
  moduleId: string;
  createdAt: string;
  updatedAt: string;
  steps: FlowStep[];
  details: ActivityDetailConfig[];
  paramsDirty: boolean;
  serviceStatus: ServiceStatus;
  packageVersion: string;
  packageUploadedAt: string;
  servicePort: number;
}

export const MODULE_TYPES: ModuleType[] = [
  { id: 'mt-entry', code: 'MEOR', name: '入厂登记' },
  { id: 'mt-sample', code: 'SAMP', name: '汽车采样' },
  { id: 'mt-weigh', code: 'WEIGH', name: '汽车过衡' },
  { id: 'mt-unload', code: 'UNLD', name: '卸煤管理' },
  { id: 'mt-exit', code: 'EXIT', name: '出厂登记' },
];

export const BIZ_MODULES: BizModule[] = [
  { id: 'mod-south', name: '南门入厂点', moduleTypeId: 'mt-entry' },
  { id: 'mod-north', name: '北门入厂点', moduleTypeId: 'mt-entry' },
  { id: 'mod-samp1', name: '1#汽车采样机', moduleTypeId: 'mt-sample' },
  { id: 'mod-samp2', name: '2#汽车采样机', moduleTypeId: 'mt-sample' },
  { id: 'mod-weigh1', name: '1#汽车衡', moduleTypeId: 'mt-weigh' },
  { id: 'mod-unload1', name: '#1圆形煤场卸煤', moduleTypeId: 'mt-unload' },
  { id: 'mod-exit-s', name: '南门出厂点', moduleTypeId: 'mt-exit' },
];

/** 消息模板固定占位符（光标处插入） */
export const PLACEHOLDERS = [
  { key: '日期', token: '{日期}' },
  { key: '车牌号', token: '{车牌号}' },
  { key: '流水号', token: '{流水号}' },
  { key: '卸煤区', token: '{卸煤区}' },
  { key: '采样位', token: '{采样位}' },
  { key: '抽检样', token: '{抽检样}' },
  { key: '重量', token: '{重量}' },
  { key: '平台消息', token: '{平台消息}' },
] as const;

/** 消息快捷整句输入 */
export const MSG_QUICK_LED = [
  '禁用',
  '{车牌号} 登记成功',
  '近10辆成功登记车辆',
  '当前登记车辆信息',
  '{车牌号} 计量完成\n净重 {重量} 吨',
  '2号磅已关闭',
];

export const MSG_QUICK_VOICE = [
  '禁用',
  '车辆登记成功',
  '{车牌号}请入厂',
  '{车牌号}计量完成，请下磅',
  '采样完成请前往过衡',
];

export const normalizeOptions = (
  options?: Array<string | SpecParamOption>,
): SpecParamOption[] => {
  if (!options?.length) return [];
  return options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
};

const entryActivities: SpecActivity[] = [
  {
    id: 'act-scan',
    code: 'ENTRY_SCAN',
    name: '扫码识别',
    remark: '云驿/计划码扫码识别车辆与计划信息',
    params: [
      {
        id: 'ep1',
        code: 'OPERATION_yunYiCode',
        name: '启用云驿扫码',
        dataType: 'boolean',
        required: true,
        constraint: '布尔；默认开启',
        description: '是否允许扫描司机手机运单二维码完成入厂信息获取',
      },
      {
        id: 'ep2',
        code: 'OPERATION_planCode',
        name: '启用计划码扫码',
        dataType: 'boolean',
        required: false,
        constraint: '布尔',
        description: '是否允许扫描计划二维码回填来煤计划',
      },
      {
        id: 'ep3',
        code: 'FIELD_qrTimeout',
        name: '二维码有效时长(分钟)',
        dataType: 'number',
        required: true,
        constraint: '1～60，整数',
        description: '超过该时长判定二维码失效',
      },
    ],
    messages: [
      {
        id: 'em1',
        name: '扫码成功提示',
        code: 'ENTRY_SCAN_OK',
        ledEnabled: true,
        ledTemplate: '{车牌号} 扫码成功',
        voiceEnabled: true,
        voiceTemplate: '{车牌号}请入厂',
        ledQuickOptions: ['{车牌号} 扫码成功', '近10辆成功登记车辆', '当前登记车辆信息'],
        voiceQuickOptions: ['{车牌号}请入厂', '车辆登记成功'],
      },
    ],
  },
  {
    id: 'act-reg',
    code: 'ENTRY_REGISTER',
    name: '确认登记',
    remark: '校验必填项并提交入厂登记',
    params: [
      {
        id: 'ep4',
        code: 'FIELD_vehicleNo',
        name: '车牌必填校验',
        dataType: 'boolean',
        required: true,
        constraint: '布尔；建议开启',
        description: '登记前是否强制校验车牌号码',
      },
      {
        id: 'ep5',
        code: 'FIELD_netWeight',
        name: '矿发净重上限(t)',
        dataType: 'number',
        required: true,
        constraint: '0～200，保留两位小数',
        description: '超过上限时阻断登记并提示',
      },
    ],
    messages: [
      {
        id: 'em2',
        name: '登记成功提示',
        code: 'ENTRY_REG_OK',
        ledEnabled: true,
        ledTemplate: '{车牌号} 登记成功\n请前往{采样位}',
        voiceEnabled: false,
        voiceTemplate: '',
        ledQuickOptions: ['{车牌号} 登记成功', '{车牌号} 登记成功\n请前往{采样位}', '近10辆成功登记车辆'],
        voiceQuickOptions: ['车辆登记成功', '{车牌号}请入厂'],
      },
    ],
  },
  {
    id: 'act-dispatch',
    code: 'ENTRY_DISPATCH',
    name: '分配采样过衡位',
    remark: '按规则分配采样位与过衡位',
    params: [
      {
        id: 'ep6',
        code: 'FIELD_simplingName',
        name: '默认采样位',
        dataType: 'select',
        required: true,
        constraint: '下拉单选',
        description: '登记成功后默认推荐的采样机',
        options: ['1#机械采样机', '2#机械采样机', '人工采样棚'],
      },
      {
        id: 'ep7',
        code: 'FIELD_poundName',
        name: '默认过衡位',
        dataType: 'select',
        required: true,
        constraint: '下拉单选',
        description: '登记成功后默认推荐的汽车衡',
        options: ['1#汽车衡', '2#汽车衡', '3#汽车衡'],
      },
    ],
    messages: [],
  },
];

const sampleActivities: SpecActivity[] = [
  {
    id: 'act-samp-ready',
    code: 'SAMP_READY',
    name: '采样就绪校验',
    remark: '校验车辆到位与采样机空闲',
    params: [
      {
        id: 'sp1',
        code: 'FIELD_sampleDevice',
        name: '采样机编号',
        dataType: 'string',
        required: true,
        constraint: '非空文本',
        description: '本模块绑定的采样机设备编号',
      },
    ],
    messages: [],
  },
  {
    id: 'act-samp-exec',
    code: 'SAMP_EXEC',
    name: '执行采样',
    remark: '启动机械/人工采样流程',
    params: [
      {
        id: 'sp2',
        code: 'FIELD_sampleMode',
        name: '采样方式',
        dataType: 'select',
        required: true,
        constraint: '机械采样 / 人工采样',
        description: '本模块默认采样方式',
        options: ['机械采样', '人工采样'],
      },
      {
        id: 'sp3',
        code: 'OPERATION_autoSample',
        name: '自动采样启用',
        dataType: 'boolean',
        required: true,
        constraint: '布尔',
        description: '到位后是否自动启动采样',
      },
    ],
    messages: [
      {
        id: 'sm1',
        name: '采样完成提示',
        code: 'SAMP_DONE',
        ledEnabled: true,
        ledTemplate: '采样完成，请前往过衡',
        voiceEnabled: true,
        voiceTemplate: '采样完成请前往过衡',
      },
    ],
  },
];

import { WEIGH_ACTIVITIES, weighDefaultValues } from './weighSpec';

export const SPEC_BY_TYPE: Record<string, SpecActivity[]> = {
  'mt-entry': entryActivities,
  'mt-sample': sampleActivities,
  'mt-weigh': WEIGH_ACTIVITIES,
  'mt-unload': [
    {
      id: 'act-unload',
      code: 'UNLOAD_GATE',
      name: '卸煤放行',
      remark: '分配卸煤区并控制道闸',
      params: [
        {
          id: 'up1',
          code: 'FIELD_unloadArea',
          name: '默认卸煤区域',
          dataType: 'select',
          required: true,
          constraint: '下拉单选',
          description: '车辆默认卸煤区域',
          options: ['#1 圆形煤场', '#2 圆形煤场', '厂外中转煤场'],
          group: '卸煤调度',
        },
      ],
      messages: [],
    },
  ],
  'mt-exit': [
    {
      id: 'act-exit',
      code: 'EXIT_CONFIRM',
      name: '出厂确认',
      remark: '核验出厂条件并抬杆',
      params: [],
      messages: [
        {
          id: 'xm1',
          name: '出厂提示',
          code: 'EXIT_OK',
          ledEnabled: true,
          ledTemplate: '{车牌号} 请出厂',
          voiceEnabled: true,
          voiceTemplate: '{车牌号}请出厂',
          ledQuickOptions: ['{车牌号} 请出厂', '当前登记车辆信息'],
          voiceQuickOptions: ['{车牌号}请出厂', '车辆登记成功'],
        },
      ],
    },
  ],
};

export const findModule = (id: string) => BIZ_MODULES.find((m) => m.id === id);
export const findModuleType = (id: string) => MODULE_TYPES.find((t) => t.id === id);
export const findActivity = (typeId: string, activityId: string) =>
  (SPEC_BY_TYPE[typeId] || []).find((a) => a.id === activityId);

/** 流程配置未完成：无环节 / 参数待检查 / 有环节但未落详细参数 */
export const isFlowConfigIncomplete = (cfg: ModuleAutoConfig) => {
  if (!cfg.steps.length) return true;
  if (cfg.paramsDirty) return true;
  if (cfg.details.some((d) => d.needsReview)) return true;
  if (!cfg.details.length) return true;
  return false;
};

/** 服务配置未完成：未上传流程包 */
export const isServiceConfigIncomplete = (cfg: ModuleAutoConfig) => !cfg.packageVersion;

export const formatStamp = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}`;
};

export const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 999)}`;

export const INITIAL_CONFIGS: ModuleAutoConfig[] = [
  {
    id: 'cfg-1',
    moduleId: 'mod-south',
    createdAt: '2026-08-28 14:20:00',
    updatedAt: '2026-08-30 09:10:00',
    steps: [
      { instanceId: 's1', activityId: 'act-scan' },
      { instanceId: 's2', activityId: 'act-reg' },
      { instanceId: 's3', activityId: 'act-dispatch' },
    ],
    details: [
      {
        activityId: 'act-scan',
        paramValues: { ep1: true, ep2: true, ep3: 15 },
        messages: [
          {
            messageId: 'em1',
            ledEnabled: true,
            ledTemplate: '{车牌号} 扫码成功',
            voiceEnabled: true,
            voiceTemplate: '{车牌号}请入厂',
          },
        ],
        needsReview: false,
      },
      {
        activityId: 'act-reg',
        paramValues: { ep4: true, ep5: 100 },
        messages: [
          {
            messageId: 'em2',
            ledEnabled: true,
            ledTemplate: '{车牌号} 登记成功\n请前往{采样位}',
            voiceEnabled: false,
            voiceTemplate: '',
          },
        ],
        needsReview: false,
      },
      {
        activityId: 'act-dispatch',
        paramValues: { ep6: '1#机械采样机', ep7: '1#汽车衡' },
        messages: [],
        needsReview: false,
      },
    ],
    paramsDirty: false,
    serviceStatus: 'running',
    packageVersion: 'v1.2.0',
    packageUploadedAt: '2026-08-25 11:00:00',
    servicePort: 9101,
  },
  {
    id: 'cfg-2',
    moduleId: 'mod-samp1',
    createdAt: '2026-08-26 10:05:00',
    updatedAt: '2026-08-29 16:40:00',
    steps: [
      { instanceId: 's4', activityId: 'act-samp-ready' },
      { instanceId: 's5', activityId: 'act-samp-exec' },
    ],
    details: [
      {
        activityId: 'act-samp-ready',
        paramValues: { sp1: 'SAMP-01' },
        messages: [],
        needsReview: true,
      },
      {
        activityId: 'act-samp-exec',
        paramValues: { sp2: '机械采样', sp3: true },
        messages: [
          {
            messageId: 'sm1',
            ledEnabled: true,
            ledTemplate: '采样完成，请前往过衡',
            voiceEnabled: true,
            voiceTemplate: '采样完成请前往过衡',
          },
        ],
        needsReview: true,
      },
    ],
    paramsDirty: true,
    serviceStatus: 'stopped',
    packageVersion: 'v1.0.3',
    packageUploadedAt: '2026-08-20 08:30:00',
    servicePort: 9201,
  },
  {
    id: 'cfg-3',
    moduleId: 'mod-weigh1',
    createdAt: '2026-08-31 09:00:00',
    updatedAt: '2026-08-31 15:20:00',
    steps: [{ instanceId: 's6', activityId: 'act-weigh-main' }],
    details: [
      {
        activityId: 'act-weigh-main',
        paramValues: weighDefaultValues(),
        messages: [
          {
            messageId: 'wm-led',
            ledEnabled: true,
            ledTemplate: '{车牌号} 计量完成\n净重 {重量} 吨',
            voiceEnabled: false,
            voiceTemplate: '',
          },
          {
            messageId: 'wm-voice',
            ledEnabled: false,
            ledTemplate: '',
            voiceEnabled: true,
            voiceTemplate: '{车牌号}计量完成，请下磅',
          },
        ],
        needsReview: false,
      },
    ],
    paramsDirty: false,
    serviceStatus: 'running',
    packageVersion: 'v2.1.0',
    packageUploadedAt: '2026-08-28 18:00:00',
    servicePort: 9301,
  },
];
