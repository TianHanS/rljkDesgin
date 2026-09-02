/**
 * 汽车衡计量流程：多环节规格（参数分属各环节 + 多情景消息）
 */
import type { ActivityDetailConfig, FlowStep, SpecActivity, SpecMessage, SpecParam } from './data';

type Opt = { label: string; value: string | number };

const yn01 = (y = '是', n = '否'): Opt[] => [
  { label: y, value: 1 },
  { label: n, value: 0 },
];

const lockAlarm: Opt[] = [
  { label: '闭锁', value: 1 },
  { label: '报警', value: 2 },
];

const printOpts: Opt[] = [
  { label: '打印', value: 1 },
  { label: '不打印', value: 2 },
];

const enable12: Opt[] = [
  { label: '启用', value: 1 },
  { label: '不启用', value: 2 },
];

const gateOpts: Opt[] = [
  { label: '抬杆', value: 1 },
  { label: '落杆', value: 2 },
  { label: '不控制', value: 3 },
];

function p(
  code: string,
  name: string,
  description: string,
  group: string,
  partial: Partial<SpecParam> & { defaultValue: string | number | boolean },
): SpecParam {
  return {
    id: `w-${code}`,
    code,
    name,
    description,
    group,
    required: false,
    constraint: description,
    dataType:
      partial.dataType ||
      (partial.options ? 'radio' : typeof partial.defaultValue === 'number' ? 'number' : 'string'),
    options: partial.options,
    defaultValue: partial.defaultValue,
  };
}

/** 全部参数表（按编码索引，再分配到各环节） */
const ALL: Record<string, SpecParam> = Object.fromEntries(
  [
    p('10001', '识别超时时间', '单位分钟，超过设定时间后重启流程', '识别设置', {
      dataType: 'number',
      defaultValue: 3,
    }),
    p('10002', '识别时是否检测空磅', '1：检测，0：不检测', '识别设置', {
      dataType: 'radio',
      options: yn01('检测', '不检测'),
      defaultValue: 0,
    }),
    p('10003', '是否允许手输车牌', '1：允许，0：不允许', '识别设置', {
      dataType: 'radio',
      options: yn01('允许', '不允许'),
      defaultValue: 0,
    }),
    p('10004', '磅号', '前端界面显示的磅号配置', '其他设定', {
      dataType: 'string',
      defaultValue: '1号衡',
    }),
    p('10005', '上磅流程', '1：先识别后上磅，2：先上磅后识别', '其他设定', {
      dataType: 'radio',
      options: [
        { label: '先识别后上磅', value: 1 },
        { label: '先上磅后识别', value: 2 },
      ],
      defaultValue: 1,
    }),
    p('10006', '单步结束等待时间', '单位：毫秒，单步流程成功后等待时间', '其他设定', {
      dataType: 'number',
      defaultValue: 1000,
    }),
    p('10007', '计量结束等待时间', '单位：毫秒，计量流程结束后等待设定时间后重启流程', '其他设定', {
      dataType: 'number',
      defaultValue: 10000,
    }),
    p('10008', '图片抓拍失败是否闭锁', '1：闭锁不上传，2：不闭锁上传', '其他设定', {
      dataType: 'radio',
      options: [
        { label: '闭锁不上传', value: 1 },
        { label: '不闭锁上传', value: 2 },
      ],
      defaultValue: 2,
    }),
    p('10009', '计量失败锁车时间', '单位：秒，计量失败的车辆设定时间内不再识别', '其他设定', {
      dataType: 'number',
      defaultValue: 30,
    }),
    p('10010', '空磅默认重量', '单位：吨，小于等于此重量认为是空磅', '空磅检测', {
      dataType: 'number',
      defaultValue: 0,
    }),
    p('10011', '连续检测次数', '连续检测多少次空磅后认为空磅', '空磅检测', {
      dataType: 'number',
      defaultValue: 1,
    }),
    p('10012', '连续检测间隔', '单位：毫秒，多次检测时的检测间隔', '空磅检测', {
      dataType: 'number',
      defaultValue: 500,
    }),
    p('10013', '燃煤重车最小上磅重量', '单位吨，仪表重量大于此值时认为车辆已上磅', '上磅检测', {
      dataType: 'number',
      defaultValue: 40,
    }),
    p('10014', '燃煤轻车最小上磅重量', '单位吨，仪表重量大于此值时认为车辆已上磅', '上磅检测', {
      dataType: 'number',
      defaultValue: 10,
    }),
    p('10015', '物资车重车最小上磅重量', '单位吨，仪表重量大于此值时认为车辆已上磅', '上磅检测', {
      dataType: 'number',
      defaultValue: 20,
    }),
    p('10016', '物资车轻车最小上磅重量', '单位吨，仪表重量大于此值时认为车辆已上磅', '上磅检测', {
      dataType: 'number',
      defaultValue: 5,
    }),
    p('10017', '搬倒煤最小上磅重量', '单位吨，仪表重量大于此值时认为车辆已上磅', '上磅检测', {
      dataType: 'number',
      defaultValue: 3,
    }),
    p('10018', '生物质重车最小上磅重量', '单位吨，仪表重量大于此值时认为车辆已上磅', '上磅检测', {
      dataType: 'number',
      defaultValue: 20,
    }),
    p('10019', '生物质轻车最小上磅重量', '单位吨，仪表重量大于此值时认为车辆已上磅', '上磅检测', {
      dataType: 'number',
      defaultValue: 2,
    }),
    p('10020', '超时未上磅时间', '单位分钟，超过设定时间后重启流程', '上磅检测', {
      dataType: 'number',
      defaultValue: 3,
    }),
    p('10021', '超时未上磅道闸控制', '1：控制来车方向道闸落，2：不控制', '上磅检测', {
      dataType: 'radio',
      options: [
        { label: '控制来车方向道闸落', value: 1 },
        { label: '不控制', value: 2 },
      ],
      defaultValue: 2,
    }),
    p('10022', '搬倒煤分界线', '单位吨，大于此值为过重，小于此值为回皮', '搬倒分界线', {
      dataType: 'number',
      defaultValue: 25,
    }),
    p('10023', '燃煤轻车最小量程', '单位吨，用于检测重量是否超出量程', '最小量程', {
      dataType: 'number',
      defaultValue: 10,
    }),
    p('10024', '燃煤重车最小量程', '单位吨，用于检测重量是否超出量程', '最小量程', {
      dataType: 'number',
      defaultValue: 46,
    }),
    p('10025', '物资车重车最小量程', '单位吨，用于检测重量是否超出量程', '最小量程', {
      dataType: 'number',
      defaultValue: 20,
    }),
    p('10026', '物资车轻车最小量程', '单位吨，用于检测重量是否超出量程', '最小量程', {
      dataType: 'number',
      defaultValue: 5,
    }),
    p('10027', '搬倒煤重车最小量程', '单位吨，用于检测重量是否超出量程', '最小量程', {
      dataType: 'number',
      defaultValue: 30,
    }),
    p('10028', '搬倒煤轻车最小量程', '单位吨，用于检测重量是否超出量程', '最小量程', {
      dataType: 'number',
      defaultValue: 10,
    }),
    p('10029', '生物质重车最小量程', '单位吨，用于检测重量是否超出量程', '最小量程', {
      dataType: 'number',
      defaultValue: 15,
    }),
    p('10030', '生物质轻车最小量程', '单位吨，用于检测重量是否超出量程', '最小量程', {
      dataType: 'number',
      defaultValue: 2,
    }),
    p('10031', '燃煤重车最大量程', '单位吨，用于检测重量是否超出量程', '最大量程', {
      dataType: 'number',
      defaultValue: 46,
    }),
    p('10032', '燃煤轻车最大量程', '单位吨，用于检测重量是否超出量程', '最大量程', {
      dataType: 'number',
      defaultValue: 10,
    }),
    p('10033', '物资车重车最大量程', '单位吨，用于检测重量是否超出量程', '最大量程', {
      dataType: 'number',
      defaultValue: 20,
    }),
    p('10034', '物资车轻车最大量程', '单位吨，用于检测重量是否超出量程', '最大量程', {
      dataType: 'number',
      defaultValue: 5,
    }),
    p('10035', '搬倒煤重车最大量程', '单位吨，用于检测重量是否超出量程', '最大量程', {
      dataType: 'number',
      defaultValue: 50,
    }),
    p('10036', '搬倒煤轻车最大量程', '单位吨，用于检测重量是否超出量程', '最大量程', {
      dataType: 'number',
      defaultValue: 20,
    }),
    p('10037', '生物质重车最大量程', '单位吨，用于检测重量是否超出量程', '最大量程', {
      dataType: 'number',
      defaultValue: 46,
    }),
    p('10038', '生物质轻车最大量程', '单位吨，用于检测重量是否超出量程', '最大量程', {
      dataType: 'number',
      defaultValue: 20,
    }),
    p('10039', '煤车重车超出量程动作', '1：闭锁，2：报警', '超量程动作', {
      dataType: 'radio',
      options: lockAlarm,
      defaultValue: 1,
    }),
    p('10040', '煤车轻车超出量程动作', '1：闭锁，2：报警', '超量程动作', {
      dataType: 'radio',
      options: lockAlarm,
      defaultValue: 1,
    }),
    p('10041', '物资车重车超出量程动作', '1：闭锁，2：报警', '超量程动作', {
      dataType: 'radio',
      options: lockAlarm,
      defaultValue: 1,
    }),
    p('10042', '物资车轻车超出量程动作', '1：闭锁，2：报警', '超量程动作', {
      dataType: 'radio',
      options: lockAlarm,
      defaultValue: 1,
    }),
    p('10043', '搬倒煤重车超出量程动作', '1：闭锁，2：报警', '超量程动作', {
      dataType: 'radio',
      options: lockAlarm,
      defaultValue: 1,
    }),
    p('10044', '搬倒煤轻车超出量程动作', '1：闭锁，2：报警', '超量程动作', {
      dataType: 'radio',
      options: lockAlarm,
      defaultValue: 1,
    }),
    p('10045', '生物质重车超出量程动作', '1：闭锁，2：报警', '超量程动作', {
      dataType: 'radio',
      options: lockAlarm,
      defaultValue: 1,
    }),
    p('10046', '生物质轻车超出量程动作', '1：闭锁，2：报警', '超量程动作', {
      dataType: 'radio',
      options: lockAlarm,
      defaultValue: 1,
    }),
    p('10047', '煤车最小下磅重量', '单位吨，仪表重量小于此值时认为车辆已下磅', '下磅检测', {
      dataType: 'number',
      defaultValue: 0.5,
    }),
    p('10048', '物资车最小下磅重量', '单位吨，仪表重量小于此值时认为车辆已下磅', '下磅检测', {
      dataType: 'number',
      defaultValue: 0.5,
    }),
    p('10049', '搬倒煤最小下磅重量', '单位吨，仪表重量小于此值时认为车辆已下磅', '下磅检测', {
      dataType: 'number',
      defaultValue: 0.01,
    }),
    p('10050', '生物质最小下磅重量', '单位吨，仪表重量小于此值时认为车辆已下磅', '下磅检测', {
      dataType: 'number',
      defaultValue: 0.5,
    }),
    p('10051', '称重稳定时间', '单位：秒，等待设定秒后开始读取仪表重量', '固化取值', {
      dataType: 'number',
      defaultValue: 5,
    }),
    p('10052', '称重采集次数', '单位：次，固化重量时采集重量次数', '固化取值', {
      dataType: 'number',
      defaultValue: 5,
    }),
    p('10053', '称重采集间隔', '单位：毫秒，固化重量时采集重量间隔', '固化取值', {
      dataType: 'number',
      defaultValue: 1000,
    }),
    p('10054', '固化重量超时', '单位：秒，固化重量超时后重启流程', '固化取值', {
      dataType: 'number',
      defaultValue: 30,
    }),
    p('10055', '车卡比对等待时间', '单位：秒，车卡校验等待时间，超时则校验失败', '车卡比对', {
      dataType: 'number',
      defaultValue: 20,
    }),
    p('10056', '车卡比对异常动作', '1：闭锁，2：报警', '车卡比对', {
      dataType: 'radio',
      options: lockAlarm,
      defaultValue: 1,
    }),
    p('10057', '司机重量', '单位：kg，成年人的重量，用于校验司机是否下磅', '检测司机上下磅', {
      dataType: 'number',
      defaultValue: 60,
    }),
    p('10058', '检测司机上下磅等待时间', '单位：秒，超时则校验失败', '检测司机上下磅', {
      dataType: 'number',
      defaultValue: 20,
    }),
    p('10059', '校验司机下磅失败动作', '1：闭锁，2：报警', '检测司机上下磅', {
      dataType: 'radio',
      options: lockAlarm,
      defaultValue: 1,
    }),
    p('10060', '校验司机上磅失败动作', '1：必须要有重量差才能成功，2：报警', '检测司机上下磅', {
      dataType: 'radio',
      options: [
        { label: '必须有重量差才成功', value: 1 },
        { label: '报警', value: 2 },
      ],
      defaultValue: 1,
    }),
    p('10061', '煤车是否打印磅单', '1：打印，2：不打印', '磅单打印', {
      dataType: 'radio',
      options: printOpts,
      defaultValue: 1,
    }),
    p('10062', '出厂物资是否打印磅单', '1：打印，2：不打印', '磅单打印', {
      dataType: 'radio',
      options: printOpts,
      defaultValue: 1,
    }),
    p('10063', '入厂物资是否打印磅单', '1：打印，2：不打印', '磅单打印', {
      dataType: 'radio',
      options: printOpts,
      defaultValue: 1,
    }),
    p('10064', '生物质是否打印磅单', '1：打印，2：不打印', '磅单打印', {
      dataType: 'radio',
      options: printOpts,
      defaultValue: 1,
    }),
    p('10065', '是否启用重轻衡切换', '1：启用，2：不启用', '重轻衡切换', {
      dataType: 'radio',
      options: enable12,
      defaultValue: 2,
    }),
    p('10066', '切换重衡时进道闸状态', '1：抬杆，2：落杆，3：不控制', '重轻衡切换', {
      dataType: 'radio',
      options: gateOpts,
      defaultValue: 1,
    }),
    p('10067', '切换重衡时出道闸状态', '1：抬杆，2：落杆，3：不控制', '重轻衡切换', {
      dataType: 'radio',
      options: gateOpts,
      defaultValue: 1,
    }),
    p('10068', '切换轻衡时进道闸状态', '1：抬杆，2：落杆，3：不控制', '重轻衡切换', {
      dataType: 'radio',
      options: gateOpts,
      defaultValue: 1,
    }),
    p('10069', '切换轻衡时出道闸状态', '1：抬杆，2：落杆，3：不控制', '重轻衡切换', {
      dataType: 'radio',
      options: gateOpts,
      defaultValue: 1,
    }),
    p('10070', '切换衡器后LED发送指令', '重衡发LED2/轻衡发LED1，提示对侧磅已关闭', '重轻衡切换', {
      dataType: 'string',
      defaultValue: '2号磅已关闭',
    }),
    p('10071', '默认切换模式', '1：重衡，2：轻衡；设备加载完成后自动切换', '重轻衡切换', {
      dataType: 'radio',
      options: [
        { label: '重衡', value: 1 },
        { label: '轻衡', value: 2 },
      ],
      defaultValue: 1,
    }),
    p('10072', '是否启用定期启停功能', '1：启用，2：不启用（仅汽车计量有效）', '自动启停', {
      dataType: 'radio',
      options: enable12,
      defaultValue: 2,
    }),
    p('10073', '定期停止时间', '格式：HH:mm，到点正常退出程序', '自动启停', {
      dataType: 'string',
      defaultValue: '07:00',
    }),
    p('10074', '定期启动时间', '格式：HH:mm，停止后到点再拉起', '自动启停', {
      dataType: 'string',
      defaultValue: '08:00',
    }),
    p('10075', '是否二次校验车卡', '1：开启，2：不开启', '二次校验', {
      dataType: 'radio',
      options: [
        { label: '开启', value: 1 },
        { label: '不开启', value: 2 },
      ],
      defaultValue: 2,
    }),
    p('10076', '二次校验车卡等待时间', '单位：秒，二次校验车卡等待时间', '二次校验', {
      dataType: 'number',
      defaultValue: 20,
    }),
    p('10077', '限位检测次数', '连续检测设定次数后都成功则认为设备未遮挡', '限位检测', {
      dataType: 'number',
      defaultValue: 3,
    }),
    p('10078', '限位检测间隔', '单位：毫秒，连续检测间隔等待时间', '限位检测', {
      dataType: 'number',
      defaultValue: 1000,
    }),
    p('10079', '是否自动卸煤确认', '1：自动卸煤，2：否', '自动卸煤', {
      dataType: 'radio',
      options: [
        { label: '自动卸煤', value: 1 },
        { label: '否', value: 2 },
      ],
      defaultValue: 2,
    }),
    p('10080', '自动卸煤监督人', '为空时使用计量软件登录员，否则使用配置值', '自动卸煤', {
      dataType: 'string',
      defaultValue: '管理员',
    }),
    p('10081', '是否自动入厂登记', '1：自动入厂登记，2：不自动入厂登记', '自动入厂', {
      dataType: 'radio',
      options: [
        { label: '自动入厂登记', value: 1 },
        { label: '不自动入厂登记', value: 2 },
      ],
      defaultValue: 2,
    }),
  ].map((x) => [x.code, x]),
);

const pick = (...codes: string[]) => codes.map((c) => ALL[c]).filter(Boolean);

const msg = (
  id: string,
  name: string,
  code: string,
  voice: string,
  led: string,
  enabled = true,
): SpecMessage => ({
  id,
  name,
  code,
  voiceEnabled: enabled,
  voiceTemplate: voice,
  ledEnabled: enabled,
  ledTemplate: led,
});

/** 道闸类环节：开始控制 / 控制成功 */
const gateMsgs = (prefix: string, startText: string, okText: string): SpecMessage[] => [
  msg(`${prefix}-start`, '开始控制', `${prefix}_START`, startText, startText),
  msg(`${prefix}-ok`, '控制成功', `${prefix}_OK`, okText, okText),
];

/** 通用检测类：开始 / 成功 / 失败 */
const checkMsgs = (
  prefix: string,
  start: string,
  ok: string,
  fail: string,
): SpecMessage[] => [
  msg(`${prefix}-start`, '开始检测', `${prefix}_START`, start, start),
  msg(`${prefix}-ok`, '检测成功', `${prefix}_OK`, ok, ok),
  msg(`${prefix}-fail`, '检测失败', `${prefix}_FAIL`, fail, fail),
];

function act(
  id: string,
  code: string,
  name: string,
  remark: string,
  params: SpecParam[],
  messages: SpecMessage[],
): SpecActivity {
  return { id, code, name, remark, params, messages };
}

/** 与业务截图一致的汽车计量可选流程（17 环节） */
export const WEIGH_ACTIVITIES: SpecActivity[] = [
  act(
    'act-w-recognize',
    'WEIGH_RECOGNIZE',
    '识别开启流程',
    '开启车牌/车卡识别，超时与手输等设定',
    pick(
      '10001',
      '10002',
      '10003',
      '10004',
      '10005',
      '10006',
      '10007',
      '10009',
      '10065',
      '10066',
      '10067',
      '10068',
      '10069',
      '10070',
      '10071',
      '10072',
      '10073',
      '10074',
      '10077',
      '10078',
      '10079',
      '10080',
      '10081',
    ),
    [
      msg('wr-start', '开始识别', 'WEIGH_REC_START', '请上磅识别', '请上磅识别'),
      msg('wr-ok', '识别成功', 'WEIGH_REC_OK', '{车牌号}识别成功', '{车牌号}识别成功'),
      msg('wr-fail', '识别失败', 'WEIGH_REC_FAIL', '识别失败请重试', '识别失败请重试'),
      msg('wr-timeout', '识别超时', 'WEIGH_REC_TIMEOUT', '识别超时，流程重启', '识别超时'),
    ],
  ),
  act(
    'act-w-empty',
    'WEIGH_EMPTY',
    '判断是否空磅',
    '按空磅重量与连续检测判定磅台是否空闲',
    pick('10010', '10011', '10012'),
    checkMsgs('we', '正在检测空磅', '空磅检测通过', '空磅检测未通过'),
  ),
  act(
    'act-w-onscale',
    'WEIGH_ON_SCALE',
    '判断是否上磅',
    '按车型最小上磅重量判定车辆是否已上磅',
    pick(
      '10013',
      '10014',
      '10015',
      '10016',
      '10017',
      '10018',
      '10019',
      '10020',
      '10021',
    ),
    [
      ...checkMsgs('wo', '请驶上磅台', '车辆已上磅', '超时未上磅'),
      msg('wo-timeout', '超时未上磅', 'WEIGH_ON_TIMEOUT', '超时未上磅，流程重启', '超时未上磅'),
    ],
  ),
  act(
    'act-w-gate-in-up',
    'WEIGH_GATE_IN_UP',
    '来车方向道闸抬',
    '控制来车方向道闸抬杆放行',
    [],
    gateMsgs('giu', '控制道闸抬', '道闸已抬起'),
  ),
  act(
    'act-w-gate-in-down',
    'WEIGH_GATE_IN_DOWN',
    '来车方向道闸落',
    '控制来车方向道闸落杆闭锁',
    [],
    gateMsgs('gid', '控制道闸落', '道闸已落下'),
  ),
  act(
    'act-w-gate-opp-up',
    'WEIGH_GATE_OPP_UP',
    '来车对向道闸抬',
    '控制来车对向道闸抬杆',
    [],
    gateMsgs('gou', '控制对向道闸抬', '对向道闸已抬起'),
  ),
  act(
    'act-w-gate-opp-down',
    'WEIGH_GATE_OPP_DOWN',
    '来车对向道闸落',
    '控制来车对向道闸落杆',
    [],
    gateMsgs('god', '控制对向道闸落', '对向道闸已落下'),
  ),
  act(
    'act-w-card',
    'WEIGH_CARD_CHECK',
    '车卡识别校验',
    '车卡与车牌比对校验',
    pick('10055', '10056', '10075', '10076'),
    [
      msg('wc-start', '开始校验', 'WEIGH_CARD_START', '请刷车卡', '请刷车卡'),
      msg('wc-ok', '校验成功', 'WEIGH_CARD_OK', '车卡校验通过', '车卡校验通过'),
      msg('wc-fail', '校验失败', 'WEIGH_CARD_FAIL', '车卡校验失败', '车卡校验失败'),
    ],
  ),
  act(
    'act-w-driver-down',
    'WEIGH_DRIVER_DOWN',
    '检测司机下磅',
    '校验司机是否已离开磅台',
    pick('10057', '10058', '10059'),
    checkMsgs('wdd', '请司机下磅', '司机已下磅', '司机下磅检测失败'),
  ),
  act(
    'act-w-solidify',
    'WEIGH_SOLIDIFY',
    '固化计量重量',
    '稳定后多次采集并固化仪表重量',
    pick('10051', '10052', '10053', '10054'),
    [
      msg('ws-start', '开始固化', 'WEIGH_SOL_START', '正在固化重量', '正在固化重量'),
      msg(
        'ws-ok',
        '固化成功',
        'WEIGH_SOL_OK',
        '{车牌号}重量 {重量} 吨',
        '{车牌号}\n重量 {重量} 吨',
      ),
      msg('ws-fail', '固化失败', 'WEIGH_SOL_FAIL', '固化重量失败', '固化重量失败'),
      msg('ws-timeout', '固化超时', 'WEIGH_SOL_TIMEOUT', '固化超时，流程重启', '固化超时'),
    ],
  ),
  act(
    'act-w-overload',
    'WEIGH_OVERLOAD',
    '重量超载检测',
    '搬倒分界、量程上下限与超量程动作',
    pick(
      '10022',
      '10023',
      '10024',
      '10025',
      '10026',
      '10027',
      '10028',
      '10029',
      '10030',
      '10031',
      '10032',
      '10033',
      '10034',
      '10035',
      '10036',
      '10037',
      '10038',
      '10039',
      '10040',
      '10041',
      '10042',
      '10043',
      '10044',
      '10045',
      '10046',
    ),
    [
      msg('wol-ok', '量程正常', 'WEIGH_OL_OK', '重量检测正常', '重量检测正常'),
      msg('wol-alarm', '超量程报警', 'WEIGH_OL_ALARM', '重量超出量程', '重量超出量程'),
      msg('wol-lock', '超量程闭锁', 'WEIGH_OL_LOCK', '超量程已闭锁', '超量程已闭锁'),
    ],
  ),
  act(
    'act-w-capture',
    'WEIGH_CAPTURE',
    '计量图片抓拍',
    '计量过程抓拍；失败是否闭锁上传',
    pick('10008'),
    [
      msg('wcap-start', '开始抓拍', 'WEIGH_CAP_START', '正在抓拍', '正在抓拍'),
      msg('wcap-ok', '抓拍成功', 'WEIGH_CAP_OK', '图片抓拍成功', '图片抓拍成功'),
      msg('wcap-fail', '抓拍失败', 'WEIGH_CAP_FAIL', '图片抓拍失败', '图片抓拍失败'),
    ],
  ),
  act(
    'act-w-upload',
    'WEIGH_UPLOAD',
    '数据上传平台',
    '将计量结果上传至集控平台',
    [],
    [
      msg('wup-start', '开始上传', 'WEIGH_UP_START', '正在上传数据', '正在上传数据'),
      msg('wup-ok', '上传成功', 'WEIGH_UP_OK', '数据上传成功', '数据上传成功'),
      msg('wup-fail', '上传失败', 'WEIGH_UP_FAIL', '数据上传失败', '数据上传失败'),
    ],
  ),
  act(
    'act-w-localsave',
    'WEIGH_LOCAL_SAVE',
    '数据保存本地',
    '计量数据本地落库备份',
    [],
    [
      msg('wls-ok', '保存成功', 'WEIGH_LS_OK', '本地保存成功', '本地保存成功'),
      msg('wls-fail', '保存失败', 'WEIGH_LS_FAIL', '本地保存失败', '本地保存失败'),
    ],
  ),
  act(
    'act-w-print',
    'WEIGH_PRINT',
    '出厂磅单打印',
    '按业务类型决定是否打印磅单',
    pick('10061', '10062', '10063', '10064'),
    [
      msg('wp-start', '开始打印', 'WEIGH_PRT_START', '正在打印磅单', '正在打印磅单'),
      msg('wp-ok', '打印成功', 'WEIGH_PRT_OK', '磅单打印完成', '磅单打印完成'),
      msg('wp-skip', '跳过打印', 'WEIGH_PRT_SKIP', '本车型不打印磅单', '不打印磅单'),
    ],
  ),
  act(
    'act-w-driver-up',
    'WEIGH_DRIVER_UP',
    '检测司机上磅',
    '校验司机是否已回到磅台/车辆',
    pick('10060'),
    checkMsgs('wdu', '请司机上磅', '司机已上磅', '司机上磅检测失败'),
  ),
  act(
    'act-w-offscale',
    'WEIGH_OFF_SCALE',
    '判断是否下磅',
    '按车型最小下磅重量判定车辆是否已驶离',
    pick('10047', '10048', '10049', '10050'),
    [
      ...checkMsgs('woff', '请驶离磅台', '车辆已下磅', '下磅检测未通过'),
      msg(
        'woff-done',
        '计量完成',
        'WEIGH_DONE',
        '{车牌号}计量完成，请下磅',
        '{车牌号} 计量完成\n净重 {重量} 吨',
      ),
    ],
  ),
];

export const WEIGH_DEFAULT_STEPS: FlowStep[] = WEIGH_ACTIVITIES.map((a, i) => ({
  instanceId: `ws-${i + 1}`,
  activityId: a.id,
}));

export const buildWeighDetails = (): ActivityDetailConfig[] =>
  WEIGH_ACTIVITIES.map((a) => ({
    activityId: a.id,
    paramValues: Object.fromEntries(a.params.map((x) => [x.id, x.defaultValue ?? null])),
    messages: a.messages.map((m) => ({
      messageId: m.id,
      ledEnabled: m.ledEnabled,
      ledTemplate: m.ledTemplate,
      voiceEnabled: m.voiceEnabled,
      voiceTemplate: m.voiceTemplate,
    })),
    needsReview: false,
  }));

/** @deprecated 兼容旧引用：聚合默认值 */
export const weighDefaultValues = (): Record<string, string | number | boolean | null> =>
  Object.fromEntries(
    WEIGH_ACTIVITIES.flatMap((a) => a.params.map((x) => [x.id, x.defaultValue ?? null])),
  );
