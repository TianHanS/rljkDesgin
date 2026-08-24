/**
 * @name 业务消息查询
 *
 * 参考资料：
 * - /src/prototypes/dispatch-task-management/index.tsx（界面风格与任务管理一致）
 * - /rules/development-standards.md
 */
import React, { useMemo, useState } from 'react';
import { Monitor, Power, Search } from 'lucide-react';
import './style.css';

type MessageTypeCode = 1 | 2 | 3 | 4;

const MESSAGE_TYPE_LABEL: Record<MessageTypeCode, string> = {
  1: '成功',
  2: '通知',
  3: '警告',
  4: '错误',
};

const SOURCE_OPTIONS = ['全部', '第三方-LIMS', '第三方-MES', '称重系统', '采样机接口', '制样系统'] as const;

const SECONDARY_MENU = ['设备报警', '业务消息'] as const;
type SecondaryTab = (typeof SECONDARY_MENU)[number];

type Row = {
  id: string;
  pushTime: string;
  source: string;
  messageCode: string;
  type: MessageTypeCode;
  content: string;
  needManualConfirm: boolean;
  confirmUser: string;
  confirmTime: string;
};

const MOCK_ROWS: Row[] = [
  {
    id: '1',
    pushTime: '2023-10-24 11:18:06',
    source: '第三方-LIMS',
    messageCode: 'LIMS_PUSH_RESULT',
    type: 1,
    content: '化验结果回传成功，批次 B-20231024-01 已闭环。',
    needManualConfirm: false,
    confirmUser: '-',
    confirmTime: '-',
  },
  {
    id: '2',
    pushTime: '2023-10-24 11:02:33',
    source: '称重系统',
    messageCode: 'SCALE_WEIGHT_UPLOAD',
    type: 2,
    content: '汽车衡过磅完成，车牌 冀A12345，毛重 48.20t。',
    needManualConfirm: false,
    confirmUser: '-',
    confirmTime: '-',
  },
  {
    id: '3',
    pushTime: '2023-10-24 10:55:01',
    source: '第三方-MES',
    messageCode: 'MES_SAMPLE_DISPATCH',
    type: 3,
    content: 'MES 返回制样节拍延迟，预计延后 12 分钟，请关注下游 AGV。',
    needManualConfirm: true,
    confirmUser: '张三',
    confirmTime: '2023-10-24 10:56:40',
  },
  {
    id: '4',
    pushTime: '2023-10-24 10:40:22',
    source: '采样机接口',
    messageCode: 'SAMPLER_STATUS_SYNC',
    type: 4,
    content: '采样机 2# 通讯中断超过 3 次，推送失败，请检查网络与证书。',
    needManualConfirm: true,
    confirmUser: '李四',
    confirmTime: '2023-10-24 10:42:05',
  },
  {
    id: '5',
    pushTime: '2023-10-24 10:22:00',
    source: '制样系统',
    messageCode: 'PREP_BATCH_READY',
    type: 1,
    content: '归批制样完成，批次 PB-8821 可进入存查柜环节。',
    needManualConfirm: false,
    confirmUser: '-',
    confirmTime: '-',
  },
  {
    id: '6',
    pushTime: '2023-10-24 09:58:17',
    source: '第三方-LIMS',
    messageCode: 'LIMS_QC_EXCEPTION',
    type: 4,
    content: 'LIMS 校验字段「水分」缺失，与本地映射不一致。',
    needManualConfirm: true,
    confirmUser: '-',
    confirmTime: '-',
  },
  {
    id: '7',
    pushTime: '2023-10-24 09:30:45',
    source: '第三方-MES',
    messageCode: 'MES_HEARTBEAT',
    type: 2,
    content: 'MES 心跳正常，队列深度 3。',
    needManualConfirm: false,
    confirmUser: '-',
    confirmTime: '-',
  },
  {
    id: '8',
    pushTime: '2023-10-23 18:05:59',
    source: '称重系统',
    messageCode: 'SCALE_DUP_EVENT',
    type: 3,
    content: '检测到重复过磅事件，已按规约生成幂等键并抑制二次入库。',
    needManualConfirm: true,
    confirmUser: '王五',
    confirmTime: '2023-10-23 18:10:12',
  },
];

function parseDateTime(s: string): number | null {
  const t = s.trim().replace(' ', 'T');
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? null : ms;
}

function normalizeLocalInput(v: string): string | null {
  if (!v) return null;
  const hasSeconds = /:\d{2}:\d{2}$/.test(v);
  const iso = v.replace(' ', 'T');
  const withSeconds = hasSeconds ? iso : `${iso}:00`;
  return withSeconds;
}

const TypeBadge = ({ code }: { code: MessageTypeCode }) => {
  const label = MESSAGE_TYPE_LABEL[code];
  let cls = 'text-cyan-300 border-cyan-400/35 bg-cyan-400/10';
  if (code === 1) cls = 'text-green-300 border-green-400/35 bg-green-400/10';
  if (code === 2) cls = 'text-cyan-300 border-cyan-400/35 bg-cyan-400/10';
  if (code === 3) cls = 'text-yellow-300 border-yellow-400/35 bg-yellow-400/10';
  if (code === 4) cls = 'text-red-300 border-red-400/35 bg-red-400/10';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs border rounded whitespace-nowrap ${cls}`}>
      {code} {label}
    </span>
  );
};

const Component = () => {
  const [activeMenu1, setActiveMenu1] = useState('主界面');
  const [activeMenu2, setActiveMenu2] = useState<SecondaryTab>('业务消息');

  const [pushStart, setPushStart] = useState('');
  const [pushEnd, setPushEnd] = useState('');
  const [source, setSource] = useState<(typeof SOURCE_OPTIONS)[number]>('全部');
  const [messageCode, setMessageCode] = useState('');
  const [typeFilter, setTypeFilter] = useState<'全部' | MessageTypeCode>('全部');
  const [confirmUserQ, setConfirmUserQ] = useState('');

  const [applied, setApplied] = useState({
    pushStart: '',
    pushEnd: '',
    source: '全部' as (typeof SOURCE_OPTIONS)[number],
    messageCode: '',
    typeFilter: '全部' as '全部' | MessageTypeCode,
    confirmUserQ: '',
  });

  const filtered = useMemo(() => {
    const startMs = applied.pushStart ? parseDateTime(normalizeLocalInput(applied.pushStart)!) : null;
    const endMs = applied.pushEnd ? parseDateTime(normalizeLocalInput(applied.pushEnd)!) : null;

    const qUser = applied.confirmUserQ.trim().toLowerCase();

    const list = MOCK_ROWS.filter((row) => {
      const rowMs = parseDateTime(row.pushTime);
      if (rowMs == null) return false;
      if (startMs != null && rowMs < startMs) return false;
      if (endMs != null && rowMs > endMs) return false;

      if (applied.source !== '全部' && row.source !== applied.source) return false;

      const codeQ = applied.messageCode.trim();
      if (codeQ && !row.messageCode.toLowerCase().includes(codeQ.toLowerCase())) return false;

      if (applied.typeFilter !== '全部' && row.type !== applied.typeFilter) return false;

      if (qUser) {
        const u = row.confirmUser === '-' ? '' : row.confirmUser;
        if (!u.toLowerCase().includes(qUser)) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      const ta = parseDateTime(a.pushTime) ?? 0;
      const tb = parseDateTime(b.pushTime) ?? 0;
      return tb - ta;
    });
  }, [applied]);

  const applyQuery = () => {
    setApplied({
      pushStart,
      pushEnd,
      source,
      messageCode,
      typeFilter,
      confirmUserQ,
    });
  };

  const reset = () => {
    setPushStart('');
    setPushEnd('');
    setSource('全部');
    setMessageCode('');
    setTypeFilter('全部');
    setConfirmUserQ('');
    setApplied({
      pushStart: '',
      pushEnd: '',
      source: '全部',
      messageCode: '',
      typeFilter: '全部',
      confirmUserQ: '',
    });
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-gray-200 font-sans overflow-hidden flex flex-col business-message-query-root">
      <header className="h-16 border-b border-cyan-900/50 bg-[#0f172a]/80 backdrop-blur flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full border border-cyan-400 flex items-center justify-center shadow-[0_0_10px_rgba(0,255,255,0.3)]">
            <Monitor className="w-4 h-4 text-cyan-400" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wider">智慧燃料集控中心</h1>
        </div>

        <nav className="flex space-x-1">
          {['主界面', '采样机', '汽车衡', '气动传输', '自动制样'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActiveMenu1(item)}
              className={`px-6 py-2 text-sm transform skew-x-[-15deg] transition-colors ${
                activeMenu1 === item
                  ? 'bg-cyan-900/60 border-b-2 border-cyan-400 text-cyan-300'
                  : 'hover:bg-cyan-900/30 text-gray-400'
              }`}
            >
              <span className="transform skew-x-[15deg] inline-block">{item}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-cyan-400">2023-10-24 11:20:00</div>
          <button
            type="button"
            className="p-2 hover:bg-cyan-900/30 rounded-full text-cyan-400 transition-colors"
            aria-label="电源"
          >
            <Power className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="h-12 bg-[#0f172a]/50 border-b border-cyan-900/30 flex items-center px-6 gap-8 shrink-0 overflow-x-auto custom-scrollbar">
        {SECONDARY_MENU.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setActiveMenu2(item)}
            className={`text-sm py-3 relative transition-colors whitespace-nowrap ${
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

      <main className="flex-1 p-4 flex flex-col gap-4 overflow-hidden min-h-0">
        {activeMenu2 === '设备报警' && (
          <div className="flex-1 flex items-center justify-center bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg text-gray-400 text-sm min-h-[200px]">
            设备报警模块为独立功能入口，本原型仅展示「业务消息」查询；此处为占位说明。
          </div>
        )}

        {activeMenu2 === '业务消息' && (
          <>
        <div className="bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg p-4 shrink-0 flex flex-wrap items-end gap-4">
          <div className="flex flex-col space-y-1.5 min-w-[280px]">
            <label className="text-xs text-gray-400">推送时间</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="datetime-local"
                value={pushStart}
                onChange={(e) => setPushStart(e.target.value)}
                className="bg-[#0b1120] border border-cyan-900/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 min-w-[200px]"
              />
              <span className="text-gray-500">至</span>
              <input
                type="datetime-local"
                value={pushEnd}
                onChange={(e) => setPushEnd(e.target.value)}
                className="bg-[#0b1120] border border-cyan-900/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 min-w-[200px]"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs text-gray-400">消息来源</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as (typeof SOURCE_OPTIONS)[number])}
              className="bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 w-44"
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs text-gray-400">消息码</label>
            <input
              type="text"
              value={messageCode}
              onChange={(e) => setMessageCode(e.target.value)}
              placeholder="支持包含匹配"
              className="bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 w-48"
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs text-gray-400">类型</label>
            <select
              value={typeFilter === '全部' ? '全部' : String(typeFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setTypeFilter(v === '全部' ? '全部' : (Number(v) as MessageTypeCode));
              }}
              className="bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 w-36"
            >
              <option value="全部">全部</option>
              <option value="1">1 成功</option>
              <option value="2">2 通知</option>
              <option value="3">3 警告</option>
              <option value="4">4 错误</option>
            </select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs text-gray-400">确认人</label>
            <input
              type="text"
              value={confirmUserQ}
              onChange={(e) => setConfirmUserQ(e.target.value)}
              placeholder="模糊匹配"
              className="bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 w-40"
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={applyQuery}
              className="bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-800/50 text-cyan-300 px-4 py-1.5 rounded transition-colors text-sm flex items-center gap-1"
            >
              <Search className="w-4 h-4" />
              查询
            </button>
            <button
              type="button"
              onClick={reset}
              className="bg-gray-800/40 hover:bg-gray-700/60 border border-gray-700/50 text-gray-300 px-4 py-1.5 rounded transition-colors text-sm"
            >
              重置
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-max min-w-full text-left border-collapse text-sm">
              <thead className="bg-[#0f172a]/90 text-gray-400 sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">推送时间</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">来源</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">消息码</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">类型</th>
                  <th className="py-3 px-4 font-medium min-w-[280px]">内容</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">需人工确认</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">确认人</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">确认时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-900/20">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-cyan-900/20 transition-colors bg-[#1e293b]/20">
                    <td className="py-3 px-4 text-gray-300 font-mono whitespace-nowrap">{row.pushTime}</td>
                    <td className="py-3 px-4 text-gray-200 whitespace-nowrap">{row.source}</td>
                    <td className="py-3 px-4 text-cyan-200 font-mono whitespace-nowrap">{row.messageCode}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <TypeBadge code={row.type} />
                    </td>
                    <td className="py-3 px-4 text-gray-200 max-w-xl">{row.content}</td>
                    <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{row.needManualConfirm ? '是' : '否'}</td>
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{row.confirmUser}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono whitespace-nowrap">{row.confirmTime}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      暂无数据，请调整查询条件
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="h-12 bg-[#0f172a] border-t border-cyan-900/30 flex items-center justify-between px-4 text-sm text-gray-400 shrink-0">
            <div>共 {filtered.length} 条记录</div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1 rounded border border-cyan-900/50 hover:bg-cyan-900/30 transition-colors disabled:opacity-50"
                disabled
              >
                上一页
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded border border-cyan-500 bg-cyan-900/30 text-cyan-300 transition-colors"
              >
                1
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded border border-cyan-900/50 hover:bg-cyan-900/30 transition-colors disabled:opacity-50"
                disabled
              >
                下一页
              </button>
            </div>
          </div>
        </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Component;
