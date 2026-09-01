/**
 * 汽车衡规格活动与详细参数（演示数据）
 */
import type { SpecActivity, SpecParam } from './data';

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
    dataType: partial.dataType || (partial.options ? 'radio' : typeof partial.defaultValue === 'number' ? 'number' : 'string'),
    options: partial.options,
    defaultValue: partial.defaultValue,
  };
}

const weighParams: SpecParam[] = [
  // 识别设置
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
  // 其他设定
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
  // 空磅检测
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
  // 上磅检测
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
  // 搬倒分界线
  p('10022', '搬倒煤分界线', '单位吨，大于此值为过重，小于此值为回皮', '搬倒分界线', {
    dataType: 'number',
    defaultValue: 25,
  }),
  // 最小量程
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
  // 最大量程
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
  // 超量程动作
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
  // 下磅检测
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
  // 固化取值
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
  // 车卡比对
  p('10055', '车卡比对等待时间', '单位：秒，车卡校验等待时间，超时则校验失败', '车卡比对', {
    dataType: 'number',
    defaultValue: 20,
  }),
  p('10056', '车卡比对异常动作', '1：闭锁，2：报警', '车卡比对', {
    dataType: 'radio',
    options: lockAlarm,
    defaultValue: 1,
  }),
  // 检测司机上下磅
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
  // 磅单打印
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
  // 重轻衡切换
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
  // 自动启停
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
  // 二次校验
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
  // 限位检测
  p('10077', '限位检测次数', '连续检测设定次数后都成功则认为设备未遮挡', '限位检测', {
    dataType: 'number',
    defaultValue: 3,
  }),
  p('10078', '限位检测间隔', '单位：毫秒，连续检测间隔等待时间', '限位检测', {
    dataType: 'number',
    defaultValue: 1000,
  }),
  // 自动卸煤
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
  // 自动入厂
  p('10081', '是否自动入厂登记', '1：自动入厂登记，2：不自动入厂登记', '自动入厂', {
    dataType: 'radio',
    options: [
      { label: '自动入厂登记', value: 1 },
      { label: '不自动入厂登记', value: 2 },
    ],
    defaultValue: 2,
  }),
];

export const WEIGH_ACTIVITIES: SpecActivity[] = [
  {
    id: 'act-weigh-main',
    code: 'WEIGH_MAIN',
    name: '汽车衡计量流程',
    remark: '识别、上磅、固化、下磅及道闸/打印等全流程参数',
    params: weighParams,
    messages: [
      {
        id: 'wm-led',
        name: '计量 LED 提示',
        code: 'WEIGH_LED',
        ledEnabled: true,
        ledTemplate: '{车牌号} 计量完成\n净重 {重量} 吨',
        voiceEnabled: false,
        voiceTemplate: '',
      },
      {
        id: 'wm-voice',
        name: '计量语音播报',
        code: 'WEIGH_VOICE',
        ledEnabled: false,
        ledTemplate: '',
        voiceEnabled: true,
        voiceTemplate: '{车牌号}计量完成，请下磅',
      },
    ],
  },
];

export const weighDefaultValues = (): Record<string, string | number | boolean | null> =>
  Object.fromEntries(weighParams.map((x) => [x.id, x.defaultValue ?? null]));
