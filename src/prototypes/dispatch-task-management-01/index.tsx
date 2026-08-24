/**
 * @name 任务管理01
 */
import React, { useState } from 'react';
import { Modal, message } from 'antd';
import { 
  Monitor, Power, Search, Plus, Play, Pause, Square, Trash2, 
  RefreshCw, ChevronDown, ChevronRight, AlertCircle, Calendar,
  FileText, X, Settings
} from 'lucide-react';
import './style.css';

// --- Mock Data ---

const MOCK_LOGS = [
  { id: 1, time: '2023-10-24 10:01:00', type: '正常', content: '任务开始执行，系统分配小车 01无人车' },
  { id: 2, time: '2023-10-24 10:02:15', type: '正常', content: '小车到达 1#汽车集样 点位，准备执行装卸任务' },
  { id: 3, time: '2023-10-24 10:05:30', type: '异常', content: '小车网络延迟较高，重新连接中...' },
  { id: 4, time: '2023-10-24 10:06:00', type: '正常', content: '小车网络恢复，继续执行装卸任务' },
  { id: 5, time: '2023-10-24 10:10:00', type: '故障', content: '机械臂抓取样桶失败，需人工干预' },
];

const MOCK_TASKS = [
  {
    id: 'T-20231024-002',
    trigger: '定时自动开始',
    agv: '02有人车',
    planTime: '2023-10-24 10:30:00',
    startTime: '-',
    endTime: '-',
    duration: '20',
    confirmUser: '-',
    confirmTime: '-',
    updateUser: '系统',
    updateTime: '2023-10-24 09:30:00',
    createUser: '系统',
    createTime: '2023-10-24 09:30:00',
    status: '未执行',
    children: [
      { id: 'T-002-1', seq: 1, type: '车辆调度', target: '2#汽采集样', action: '-', emptyCount: '-', duration: '3 min ', distance: ' 200 m', status: '未执行', startTime: '-', endTime: '-' },
      { id: 'T-002-2', seq: 2, type: '样桶装卸', target: '2#汽采集样', action: '31卸空桶装满桶', emptyCount: '6', status: '未执行', startTime: '-', endTime: '-' }
    ]
  },
  {
    id: 'T-20231024-001',
    trigger: '人工确认',
    agv: '01无人车',
    planTime: '2023-10-24 10:00:00',
    startTime: '2023-10-24 10:01:00',
    endTime: '-',
    duration: '15',
    confirmUser: '张三',
    confirmTime: '2023-10-24 10:00:30',
    updateUser: '李四',
    updateTime: '2023-10-24 10:05:00',
    createUser: '张三',
    createTime: '2023-10-24 09:55:00',
    status: '执行中',
    taskType: '调度任务', // 标识任务类型
    children: [
      { id: 'T-001-1', seq: 1, type: '车辆调度', target: '1#汽车集样', action: '-', emptyCount: '-', duration: '10 min', distance: ' 1200 m', status: '已完成', startTime: '2023-10-24 10:01:00', endTime: '2023-10-24 10:11:00' },
      { id: 'T-001-2', seq: 2, type: '样桶装卸', target: '1#汽车集样', action: '31卸空桶装满桶', emptyCount: '4', status: '执行中', startTime: '2023-10-24 10:12:00', endTime: '-' }
    ]
  },
  {
    id: 'T-20231024-005',
    trigger: '人工确认',
    agv: '01无人车',
    planTime: '2023-10-24 10:30:00',
    startTime: '2023-10-24 10:35:00',
    endTime: '-',
    duration: '15',
    confirmUser: '张三',
    confirmTime: '2023-10-24 10:30:30',
    updateUser: '李四',
    updateTime: '2023-10-24 10:35:00',
    createUser: '张三',
    createTime: '2023-10-24 10:25:00',
    status: '执行中',
    taskType: '装卸任务', // 标识任务类型
    children: [
      { id: 'T-005-1', seq: 1, type: '车辆调度', target: '归批制样', action: '-', emptyCount: '-', duration: '5 min', distance: ' 400 m', status: '执行中', startTime: '2023-10-24 10:35:00', endTime: '-' },
      { id: 'T-005-2', seq: 2, type: '样桶装卸', target: '归批制样', action: '31卸空桶装满桶', emptyCount: '4', status: '未执行', startTime: '-', endTime: '-' }
    ]
  },
  {
    id: 'T-20231024-003',
    trigger: '人工确认',
    agv: '01无人车',
    planTime: '-',
    startTime: '2023-10-24 09:00:00',
    endTime: '-',
    duration: '30',
    confirmUser: '王五',
    confirmTime: '2023-10-24 09:01:00',
    updateUser: '王五',
    updateTime: '2023-10-24 09:15:00',
    createUser: '王五',
    createTime: '2023-10-24 08:50:00',
    status: '暂停',
    children: [
      { id: 'T-003-1', seq: 1, type: '车辆调度', target: '制样归批', action: '-', emptyCount: '-', duration: '5', distance: '400m', status: '已完成', startTime: '2023-10-24 09:00:00', endTime: '2023-10-24 09:05:00' },
      { id: 'T-003-2', seq: 2, type: '样桶装卸', target: '制样归批', action: '32卸满桶装空桶', emptyCount: '4', status: '暂停', startTime: '2023-10-24 09:06:00', endTime: '-' }
    ]
  },
  {
    id: 'T-20231024-006',
    trigger: '人工确认',
    agv: '03无人车',
    planTime: '2023-10-24 11:00:00',
    startTime: '-',
    endTime: '-',
    duration: '25',
    confirmUser: '-',
    confirmTime: '-',
    updateUser: '系统',
    updateTime: '2023-10-24 10:50:00',
    createUser: '系统',
    createTime: '2023-10-24 10:50:00',
    status: '未执行',
    taskType: '调度任务',
    children: [
      { id: 'T-006-1', seq: 1, type: '车辆调度', target: '1#汽车集样', action: '-', emptyCount: '-', duration: '5 min', distance: '500 m', status: '未执行', startTime: '-', endTime: '-' },
      { id: 'T-006-2', seq: 2, type: '样桶装卸', target: '1#汽车集样', action: '31卸空桶装满桶', emptyCount: '2', status: '未执行', startTime: '-', endTime: '-' }
    ]
  },
  {
    id: 'T-20231024-004',
    trigger: '人工确认',
    agv: '02有人车',
    planTime: '-',
    startTime: '2023-10-24 08:00:00',
    endTime: '2023-10-24 08:45:00',
    duration: '45',
    confirmUser: '李四',
    confirmTime: '2023-10-24 08:01:00',
    updateUser: '李四',
    updateTime: '2023-10-24 08:45:00',
    createUser: '李四',
    createTime: '2023-10-24 07:50:00',
    status: '已完成',
    children: [
      { id: 'T-004-1', seq: 1, type: '车辆调度', target: '卸样端', action: '-', emptyCount: '-', duration: '20', distance: '1.5km', status: '已完成', startTime: '2023-10-24 08:00:00', endTime: '2023-10-24 08:20:00' },
      { id: 'T-004-2', seq: 2, type: '样桶装卸', target: '卸样端', action: '12卸满桶', emptyCount: '-', status: '已完成', startTime: '2023-10-24 08:21:00', endTime: '2023-10-24 08:45:00' }
    ]
  }
];

const MOCK_TEMPLATES_SELECTION = [
  {
    id: 'default',
    name: '系统内置模板',
    description: '模拟向后端请求，根据装车端空桶需求数量排定优先级并自动计算填充',
    details: [
      { id: 1, type: '车辆调度', target: '卸车端', action: '-', emptyCount: '' },
      { id: 2, type: '样桶装卸', target: '归批制样', action: '21装空桶', emptyCount: 6 },
      { id: 3, type: '车辆调度', target: '1#汽车集样', action: '-', emptyCount: '' },
      { id: 4, type: '样桶装卸', target: '1#汽车集样', action: '31卸空桶装满桶', emptyCount: 6 },
      { id: 5, type: '车辆调度', target: '2#汽采集样', action: '-', emptyCount: '' },
      { id: 6, type: '样桶装卸', target: '2#汽采集样', action: '31卸空桶装满桶', emptyCount: 6 },
      { id: 7, type: '车辆调度', target: '卸车端', action: '-', emptyCount: '' },
      { id: 8, type: '样桶装卸', target: '卸车端', action: '12卸满桶', emptyCount: '' }
    ]
  },
  {
    id: 't1',
    name: '标准卸样流程模板',
    description: '适用于标准卸样流程的固定路线',
    details: [
      { id: 1, type: '车辆调度', target: '卸车端', action: '-', emptyCount: '' },
      { id: 2, type: '样桶装卸', target: '卸车端', action: '12卸满桶', emptyCount: '' }
    ]
  },
  {
    id: 't2',
    name: '制样归批短途模板',
    description: '仅包含归批制样与卸车端的短途路线',
    details: [
      { id: 1, type: '车辆调度', target: '归批制样', action: '-', emptyCount: '' },
      { id: 2, type: '样桶装卸', target: '归批制样', action: '21装空桶', emptyCount: 6 }
    ]
  }
];

const MOCK_TEMPLATES_LIST = [
  { id: 1, name: '标准卸样流程模板', createTime: '2023-10-24 08:00:00', createUser: '系统', updateTime: '2023-10-24 08:00:00', updateUser: '系统' },
  { id: 2, name: '制样归批短途模板', createTime: '2023-10-23 15:30:00', createUser: '张三', updateTime: '2023-10-23 16:00:00', updateUser: '李四' },
];

// --- Components ---

const TaskDetailsEditor = ({ details, onChange }: { details: any[], onChange: (details: any[]) => void }) => {
  return (
    <div className="border border-cyan-900/50 rounded overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#1e293b]/60 border-b border-cyan-900/50">
          <tr>
            <th className="py-2.5 px-3 font-medium text-gray-400 w-16 text-center">序号</th>
            <th className="py-2.5 px-3 font-medium text-gray-400 w-32">任务类型</th>
            <th className="py-2.5 px-3 font-medium text-gray-400 w-32">装卸端/停靠点</th>
            <th className="py-2.5 px-3 font-medium text-gray-400 w-40">操作类型</th>
            <th className="py-2.5 px-3 font-medium text-gray-400 w-28">配送空桶数量</th>
            <th className="py-2.5 px-3 font-medium text-gray-400 w-16 text-center">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cyan-900/20 bg-[#0f172a]">
          {details.map((detail, index) => {
            const isCarDispatch = detail.type === '车辆调度';
            const isLoader = detail.target.includes('装样') || detail.target.includes('集样');
            
            return (
              <tr key={detail.id} className="hover:bg-[#1e293b]/40">
                <td className="p-2 text-center text-gray-500">{index + 1}</td>
                <td className="p-2">
                  <select 
                    value={detail.type}
                    onChange={(e) => {
                      const newDetails = [...details];
                      newDetails[index].type = e.target.value;
                      if (e.target.value === '车辆调度') {
                        newDetails[index].action = '-';
                        newDetails[index].emptyCount = '';
                      }
                      onChange(newDetails);
                    }}
                    className="w-full bg-[#0b1120] border border-cyan-900/50 rounded px-2 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option>车辆调度</option>
                    <option>样桶装卸</option>
                  </select>
                </td>
                <td className="p-2">
                  <select 
                    value={detail.target}
                    onChange={(e) => {
                      const newDetails = [...details];
                      newDetails[index].target = e.target.value;
                      if (!e.target.value.includes('集样') && !e.target.value.includes('装样')) {
                        newDetails[index].emptyCount = '';
                      }
                      onChange(newDetails);
                    }}
                    className="w-full bg-[#0b1120] border border-cyan-900/50 rounded px-2 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="卸车端">卸车端</option>
                    <option value="归批制样">归批制样</option>
                    <option value="1#汽车集样">1#汽车集样(装样端)</option>
                    <option value="2#汽采集样">2#汽采集样(装样端)</option>
                    <option value="卸样端">卸样端</option>
                  </select>
                </td>
                <td className="p-2">
                  <select 
                    disabled={isCarDispatch}
                    value={detail.action}
                    onChange={(e) => {
                      const newDetails = [...details];
                      newDetails[index].action = e.target.value;
                      onChange(newDetails);
                    }}
                    className="w-full bg-[#0b1120] border border-cyan-900/50 rounded px-2 py-1.5 text-white focus:border-cyan-500 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isCarDispatch ? (
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
                <td className="p-2">
                  <input 
                    type="number" 
                    disabled={isCarDispatch || !isLoader}
                    value={detail.emptyCount}
                    placeholder={isCarDispatch || !isLoader ? '-' : '需正整数'}
                    onChange={(e) => {
                      const newDetails = [...details];
                      newDetails[index].emptyCount = e.target.value;
                      onChange(newDetails);
                    }}
                    className="w-full bg-[#0b1120] border border-cyan-900/50 rounded px-2 py-1.5 text-white focus:border-cyan-500 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed" 
                  />
                </td>
                <td className="p-2 text-center">
                  <button 
                    onClick={() => {
                      const newDetails = details.filter(d => d.id !== detail.id);
                      onChange(newDetails);
                    }}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    title="删除此行"
                  >
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button 
        onClick={() => {
          onChange([...details, { id: Date.now() + Math.random(), type: '车辆调度', target: '卸车端', action: '-', emptyCount: '' }]);
        }}
        className="w-full py-3 text-sm text-cyan-400 hover:bg-cyan-900/20 border-t border-cyan-900/50 transition-colors flex items-center justify-center space-x-1"
      >
        <Plus className="w-4 h-4" />
        <span>添加任务明细</span>
      </button>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  let colorClass = 'text-gray-400 border-gray-400/30 bg-gray-400/10';
  if (status === '执行中') colorClass = 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';
  if (status === '暂停') colorClass = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
  if (status === '终止') colorClass = 'text-red-400 border-red-400/30 bg-red-400/10';
  if (status === '已完成') colorClass = 'text-green-400 border-green-400/30 bg-green-400/10';
  
  return (
    <span className={`px-2 py-0.5 text-xs border rounded ${colorClass}`}>
      {status}
    </span>
  );
};

const Component = () => {
  const [activeMenu1, setActiveMenu1] = useState('主界面');
  const [activeMenu2, setActiveMenu2] = useState('任务管理');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(['T-20231024-002', 'T-20231024-001']));
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateListModal, setShowTemplateListModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [showSelectTemplateModal, setShowSelectTemplateModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{show: boolean, title: string, action: () => void}>({show: false, title: '', action: () => {}});
  const [logModal, setLogModal] = useState<{show: boolean, taskId: string}>({show: false, taskId: ''});
  const [logSearch, setLogSearch] = useState('');

  // Create form state
  const getInitialForm = () => ({
    name: '',
    trigger: '人工确认',
    planTime: '',
    agv: '01无人车',
    details: [
      { id: Date.now(), type: '车辆调度', target: '卸车端', action: '-', emptyCount: '' }
    ]
  });
  const [taskForm, setTaskForm] = useState(getInitialForm());

  const getInitialTemplateForm = () => ({
    name: '',
    details: [
      { id: Date.now(), type: '车辆调度', target: '卸车端', action: '-', emptyCount: '' }
    ]
  });
  const [templateForm, setTemplateForm] = useState(getInitialTemplateForm());

  const toggleExpand = (id: string) => {
    const next = new Set(expandedKeys);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedKeys(next);
  };

  const openConfirm = (title: string, action: () => void) => {
    setConfirmModal({ show: true, title, action });
  };

  const checkExecutionConditions = async (taskId: string) => {
    // 模拟后端检查
    return new Promise<{ status: 'success' | 'warning', message?: string }>(resolve => {
      setTimeout(() => {
        // 专门针对 T-20231024-006 任务模拟异常，其他任务80%成功
        if (taskId === 'T-20231024-006') {
          resolve({ status: 'warning', message: '小车电量低于阈值20%，当前电量15%' });
        } else if (Math.random() > 0.2) {
          resolve({ status: 'success' });
        } else {
          resolve({ status: 'warning', message: '系统异常：前置路径被占用' });
        }
      }, 500);
    });
  };

  const handleAction = async (type: string, taskId: string) => {
    switch (type) {
      case 'execute':
        const hideLoading = message.loading('检查执行条件中...', 0);
        try {
          const res = await checkExecutionConditions(taskId);
          hideLoading();
          if (res.status === 'success') {
            Modal.confirm({
              title: '确认执行任务',
              content: `是否确认执行任务 [${taskId}]？`,
              okText: '确认执行',
              cancelText: '取消',
              onOk: () => {
                console.log('execute', taskId);
                message.success('任务已开始执行');
              }
            });
          } else {
            Modal.confirm({
              title: '不具备执行条件',
              content: (
                <div>
                  <div className="text-red-500 mb-2">系统异常：{res.message}</div>
                  <div>是否确认强制执行任务？</div>
                </div>
              ),
              okText: '强制执行',
              okButtonProps: { danger: true },
              cancelText: '取消',
              onOk: () => {
                console.log('force execute', taskId);
                message.success('已强制开始执行任务');
              }
            });
          }
        } catch (error) {
          hideLoading();
          message.error('条件检查失败');
        }
        break;
      case 'pause':
        const taskToPause = MOCK_TASKS.find(t => t.id === taskId);
        if (!taskToPause) return;
        
        Modal.confirm({
          title: '确认暂停任务',
          content: `确定要暂停任务 [${taskId}] 吗？`,
          okText: '确认暂停',
          cancelText: '取消',
          onOk: () => {
            const hidePauseLoading = message.loading('任务暂停下发中...', 0);
            setTimeout(() => {
              hidePauseLoading();
              if (taskToPause.taskType === '装卸任务') {
                message.success(`任务 [${taskId}] 已下发暂停指令，当前装卸子任务完成后将不再继续后续子任务，主任务状态已更新为暂停。`);
                console.log('pause 装卸任务', taskId);
              } else {
                // 模拟调度任务可能成功或失败的概率
                if (Math.random() > 0.3) {
                  message.success(`转运调度任务 [${taskId}] 已成功暂停。`);
                  console.log('pause 调度任务 success', taskId);
                } else {
                  message.error(`转运调度任务 [${taskId}] 暂停指令下发失败，设备响应异常，请重试。`);
                  console.log('pause 调度任务 failed', taskId);
                }
              }
            }, 800);
          }
        });
        break;
      case 'resume':
        const hideResumeLoading = message.loading('检查恢复条件中...', 0);
        try {
          const res = await checkExecutionConditions(taskId); // 复用条件检查逻辑
          hideResumeLoading();
          if (res.status === 'success') {
            Modal.confirm({
              title: '确认恢复任务',
              content: `是否确认恢复执行任务 [${taskId}]？`,
              okText: '确认恢复',
              cancelText: '取消',
              onOk: () => {
                console.log('resume', taskId);
                message.success('任务已恢复执行');
              }
            });
          } else {
            Modal.confirm({
              title: '不具备恢复条件',
              content: (
                <div>
                  <div className="text-red-500 mb-2">系统异常：{res.message}</div>
                  <div>是否确认强制恢复执行任务？</div>
                </div>
              ),
              okText: '强制恢复',
              okButtonProps: { danger: true },
              cancelText: '取消',
              onOk: () => {
                console.log('force resume', taskId);
                message.success('已强制恢复执行任务');
              }
            });
          }
        } catch (error) {
          hideResumeLoading();
          message.error('条件检查失败');
        }
        break;
      case 'terminate':
        const taskToTerminate = MOCK_TASKS.find(t => t.id === taskId);
        if (!taskToTerminate) return;

        Modal.confirm({
          title: '确认终止任务',
          content: `确定要终止任务 [${taskId}] 吗？`,
          okText: '确认终止',
          okButtonProps: { danger: true },
          cancelText: '取消',
          onOk: () => {
            const hideTerminateLoading = message.loading('任务终止下发中...', 0);
            setTimeout(() => {
              hideTerminateLoading();
              if (taskToTerminate.taskType === '装卸任务') {
                message.success(`任务 [${taskId}] 当前装卸子任务完成后将自动终止，并更新所有未执行子任务为终止状态。`);
                console.log('terminate 装卸任务', taskId);
              } else {
                // 模拟调度任务成功
                message.success(`转运调度任务 [${taskId}] 终止指令下发成功，设备已执行靠边停车。`);
                console.log('terminate 调度任务 success', taskId);
              }
            }, 800);
          }
        });
        break;
      case 'delete':
        openConfirm(`确定要删除任务 [${taskId}] 吗？该操作不可恢复。`, () => console.log('delete', taskId));
        break;
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = MOCK_TEMPLATES_SELECTION.find(t => t.id === templateId);
    if (template) {
      setTaskForm(prev => ({
        ...prev,
        details: template.details.map(d => ({...d, id: Date.now() + Math.random()}))
      }));
    }
    setShowSelectTemplateModal(false);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-gray-200 font-sans overflow-hidden flex flex-col dispatch-task-management-root">
      
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

      {/* Main Content */}
      <main className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        
        {/* Search Panel */}
        <div className="bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg p-4 shrink-0 flex flex-wrap items-end gap-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs text-gray-400">任务计划时间</label>
            <div className="flex items-center space-x-2">
              <input type="date" className="bg-[#0b1120] border border-cyan-900/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500" />
              <span className="text-gray-500">-</span>
              <input type="date" className="bg-[#0b1120] border border-cyan-900/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs text-gray-400">实际执行时间</label>
            <div className="flex items-center space-x-2">
              <input type="date" className="bg-[#0b1120] border border-cyan-900/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500" />
              <span className="text-gray-500">-</span>
              <input type="date" className="bg-[#0b1120] border border-cyan-900/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs text-gray-400">任务确认人</label>
            <input type="text" placeholder="请输入姓名模糊匹配" className="bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 w-40" />
          </div>
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs text-gray-400">确认方式</label>
            <select className="bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 w-32">
              <option>全部</option>
              <option>人工确认</option>
              <option>定时自动开始</option>
            </select>
          </div>
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs text-gray-400">任务状态</label>
            <select className="bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 w-32">
              <option>全部</option>
              <option>未执行</option>
              <option>执行中</option>
              <option>暂停</option>
              <option>终止</option>
              <option>已完成</option>
            </select>
          </div>
          <div className="flex items-center space-x-3 ml-auto">
            <button className="bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-800/50 text-cyan-300 px-4 py-1.5 rounded transition-colors text-sm flex items-center space-x-1">
              <Search className="w-4 h-4" />
              <span>查询</span>
            </button>
            <button className="bg-gray-800/40 hover:bg-gray-700/60 border border-gray-700/50 text-gray-300 px-4 py-1.5 rounded transition-colors text-sm">
              重置
            </button>
            <button 
              onClick={() => setShowTemplateListModal(true)}
              className="bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500/50 text-indigo-300 px-4 py-1.5 rounded transition-colors text-sm flex items-center space-x-1"
            >
              <Settings className="w-4 h-4" />
              <span>任务模板维护</span>
            </button>
            <button 
              onClick={() => { setTaskForm(getInitialForm()); setShowCreateModal(true); }}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded transition-colors text-sm flex items-center space-x-1 shadow-[0_0_10px_rgba(0,255,255,0.2)]"
            >
              <Plus className="w-4 h-4" />
              <span>新建任务</span>
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 bg-[#1e293b]/40 border border-cyan-900/30 rounded-lg flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-max min-w-full text-left border-collapse text-sm">
              <thead className="bg-[#0f172a]/90 text-gray-400 sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="py-3 px-4 font-medium w-10 sticky left-0 bg-[#0f172a]"></th>
                  <th className="py-3 px-4 font-medium sticky left-10 bg-[#0f172a] z-30">任务名称</th>
                  <th className="py-3 px-4 font-medium">触发方式</th>
                  <th className="py-3 px-4 font-medium">作业小车</th>
                  <th className="py-3 px-4 font-medium">计划时间</th>
                  <th className="py-3 px-4 font-medium">开始时间</th>
                  <th className="py-3 px-4 font-medium">结束时间</th>
                  <th className="py-3 px-4 font-medium">预计耗时 min</th>
                  <th className="py-3 px-4 font-medium">确认执行人</th>
                  <th className="py-3 px-4 font-medium">确认时间</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">创建人</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">创建时间</th>
                  <th className="py-3 px-4 font-medium sticky right-24 bg-[#0f172a] z-30">任务状态</th>
                  <th className="py-3 px-4 font-medium text-right sticky right-0 bg-[#0f172a] z-30 w-24">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-900/20">
                {MOCK_TASKS.map(task => (
                  <React.Fragment key={task.id}>
                    <tr className="hover:bg-cyan-900/20 transition-colors group bg-[#1e293b]/20">
                      <td className="py-3 px-4 sticky left-0 bg-[#1e293b] group-hover:bg-cyan-900/40 z-10">
                        <button onClick={() => toggleExpand(task.id)} className="text-cyan-500 hover:text-cyan-300 transition-colors">
                          {expandedKeys.has(task.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-300 font-medium sticky left-10 bg-[#1e293b] group-hover:bg-cyan-900/40 z-20 whitespace-nowrap">{task.name || task.id}</td>
                      <td className="py-3 px-4 text-gray-200 whitespace-nowrap">{task.trigger}</td>
                      <td className="py-3 px-4 text-gray-200 whitespace-nowrap">{task.agv}</td>
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{task.planTime || '-'}</td>
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{task.startTime || '-'}</td>
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{task.endTime || '-'}</td>
                      <td className="py-3 px-4 text-gray-300 whitespace-nowrap">{task.duration || '-'}</td>
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{task.confirmUser || '-'}</td>
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{task.confirmTime || '-'}</td>
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{task.createUser}</td>
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{task.createTime}</td>
                      <td className="py-3 px-4 sticky right-24 bg-[#1e293b] group-hover:bg-cyan-900/40 z-20">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="py-3 px-4 text-right space-x-3 sticky right-0 bg-[#1e293b] group-hover:bg-cyan-900/40 z-20 whitespace-nowrap">
                        {task.status !== '未执行' && (
                          <button 
                            onClick={() => { setLogModal({show: true, taskId: task.id}); setLogSearch(''); }} 
                            className="text-cyan-400 hover:text-cyan-300 transition-colors" 
                            title="流程日志"
                          >
                            <FileText className="w-4 h-4 inline" />
                          </button>
                        )}
                        {task.status === '未执行' && (
                          <>
                            <button onClick={() => handleAction('execute', task.id)} className="text-cyan-400 hover:text-cyan-300 transition-colors" title="执行"><Play className="w-4 h-4 inline" /></button>
                            <button onClick={() => handleAction('delete', task.id)} className="text-red-400 hover:text-red-300 transition-colors" title="删除"><Trash2 className="w-4 h-4 inline" /></button>
                          </>
                        )}
                        {task.status === '执行中' && (
                          <>
                            <button onClick={() => handleAction('pause', task.id)} className="text-yellow-400 hover:text-yellow-300 transition-colors" title="暂停"><Pause className="w-4 h-4 inline" /></button>
                            <button onClick={() => handleAction('terminate', task.id)} className="text-red-400 hover:text-red-300 transition-colors" title="终止"><Square className="w-4 h-4 inline" /></button>
                          </>
                        )}
                        {task.status === '暂停' && (
                          <>
                            <button onClick={() => handleAction('resume', task.id)} className="text-green-400 hover:text-green-300 transition-colors" title="恢复"><RefreshCw className="w-4 h-4 inline" /></button>
                            <button onClick={() => handleAction('terminate', task.id)} className="text-red-400 hover:text-red-300 transition-colors" title="终止"><Square className="w-4 h-4 inline" /></button>
                          </>
                        )}
                      </td>
                    </tr>
                    {expandedKeys.has(task.id) && (
                      <tr className="bg-[#0b1120]/60">
                        <td colSpan={14} className="p-0 border-b border-cyan-900/20">
                          <div className="pl-14 pr-4 py-4">
                            <div className="border border-cyan-900/30 rounded overflow-hidden">
                              <table className="w-full text-left border-collapse text-sm bg-[#1e293b]/40">
                                <thead className="bg-[#0f172a]/80 text-cyan-400">
                                  <tr>
                                    <th className="py-2.5 px-4 font-medium w-16">序号</th>
                                    <th className="py-2.5 px-4 font-medium w-32">任务类型</th>
                                    <th className="py-2.5 px-4 font-medium w-40">装卸端/停靠点</th>
                                    <th className="py-2.5 px-4 font-medium w-48">操作类型</th>
                                     <th className="py-2.5 px-4 font-medium w-28">配送空桶数量</th>
                                     <th className="py-2.5 px-4 font-medium w-32">行驶距离/耗时</th>
                                     <th className="py-2.5 px-4 font-medium w-28">任务状态</th>
                                     <th className="py-2.5 px-4 font-medium w-40">开始时间</th>
                                     <th className="py-2.5 px-4 font-medium w-40">结束时间</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-cyan-900/20">
                                   {task.children.map(child => (
                                     <tr key={child.id} className="hover:bg-cyan-900/20 transition-colors">
                                       <td className="py-2.5 px-4 text-gray-400">[{child.seq}]</td>
                                       <td className="py-2.5 px-4 text-gray-300">{child.type}</td>
                                       <td className="py-2.5 px-4 text-cyan-300">{child.target}</td>
                                       <td className="py-2.5 px-4 text-gray-300">{child.action}</td>
                                       <td className="py-2.5 px-4 text-gray-300">{child.emptyCount}</td>
                                       <td className="py-2.5 px-4 text-gray-300">
                                         {child.type === '车辆调度' ? `${child.duration || '-'}/${child.distance || '-'}` : '-'}
                                       </td>
                                       <td className="py-2.5 px-4">
                                         <StatusBadge status={child.status || '未执行'} />
                                       </td>
                                       <td className="py-2.5 px-4 text-gray-400 whitespace-nowrap">{child.startTime || '-'}</td>
                                       <td className="py-2.5 px-4 text-gray-400 whitespace-nowrap">{child.endTime || '-'}</td>
                                     </tr>
                                   ))}
                                   {task.children.length === 0 && (
                                     <tr>
                                       <td colSpan={9} className="py-6 text-center text-gray-500">无明细任务</td>
                                     </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="h-12 bg-[#0f172a] border-t border-cyan-900/30 flex items-center justify-between px-4 text-sm text-gray-400">
            <div>共 4 条记录</div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 rounded border border-cyan-900/50 hover:bg-cyan-900/30 transition-colors disabled:opacity-50" disabled>上一页</button>
              <button className="px-3 py-1 rounded border border-cyan-500 bg-cyan-900/30 text-cyan-300 transition-colors">1</button>
              <button className="px-3 py-1 rounded border border-cyan-900/50 hover:bg-cyan-900/30 transition-colors">下一页</button>
            </div>
          </div>
        </div>
      </main>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.15)] w-[800px] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-cyan-900/50 shrink-0">
              <h3 className="text-white font-medium text-lg flex items-center space-x-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <span>新建调度任务</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <Plus className="w-6 h-6 transform rotate-45" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto custom-scrollbar flex-1 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-cyan-400 flex items-center border-l-2 border-cyan-400 pl-2">主数据</h4>
                <div className="grid grid-cols-2 gap-6 bg-[#1e293b]/30 p-4 rounded border border-cyan-900/30">
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm text-gray-400 block">任务名称 <span className="text-gray-500 text-xs ml-1">(非必填)</span></label>
                    <input 
                      type="text" 
                      value={taskForm.name}
                      onChange={(e) => setTaskForm({...taskForm, name: e.target.value})}
                      placeholder="请输入任务名称"
                      className="w-full bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 block">触发方式 <span className="text-red-500">*</span></label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="trigger" 
                          value="人工确认" 
                          checked={taskForm.trigger === '人工确认'} 
                          onChange={(e) => setTaskForm({...taskForm, trigger: e.target.value})}
                          className="text-cyan-500 bg-[#0b1120] border-cyan-900 focus:ring-cyan-500 focus:ring-offset-[#0b1120]" 
                        />
                        <span className="text-sm text-gray-200">人工确认</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="trigger" 
                          value="定时自动开始" 
                          checked={taskForm.trigger === '定时自动开始'} 
                          onChange={(e) => setTaskForm({...taskForm, trigger: e.target.value})}
                          className="text-cyan-500 bg-[#0b1120] border-cyan-900 focus:ring-cyan-500 focus:ring-offset-[#0b1120]" 
                        />
                        <span className="text-sm text-gray-200">定时自动开始</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 block">
                      计划开始时间 {taskForm.trigger === '定时自动开始' && <span className="text-red-500">*</span>}
                    </label>
                    <input 
                      type="datetime-local" 
                      value={taskForm.planTime}
                      onChange={(e) => setTaskForm({...taskForm, planTime: e.target.value})}
                      disabled={taskForm.trigger !== '定时自动开始'}
                      className="w-full bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <label className="text-sm text-gray-400 block">作业小车 <span className="text-red-500">*</span></label>
                    <div className="flex space-x-4">
                      {['01无人车', '02有人车'].map(agv => (
                        <label key={agv} className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="agv" 
                            value={agv} 
                            checked={taskForm.agv === agv} 
                            onChange={(e) => setTaskForm({...taskForm, agv: e.target.value})}
                            className="text-cyan-500 bg-[#0b1120] border-cyan-900 focus:ring-cyan-500 focus:ring-offset-[#0b1120]" 
                          />
                          <span className="text-sm text-gray-200">{agv}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-cyan-400 flex items-center border-l-2 border-cyan-400 pl-2">任务执行明细</h4>
                  <button 
                    onClick={() => setShowSelectTemplateModal(true)}
                    className="group relative flex items-center space-x-1 text-sm bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-500/50 text-indigo-300 px-3 py-1.5 rounded transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>按模板新建</span>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-[#1e293b] text-gray-300 text-xs p-2 rounded border border-indigo-500/50 shadow-lg z-10 whitespace-nowrap">
                      获取任务模板
                    </div>
                  </button>
                </div>
                
                <TaskDetailsEditor 
                  details={taskForm.details} 
                  onChange={(newDetails) => setTaskForm({...taskForm, details: newDetails})} 
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-cyan-900/50 flex justify-end space-x-3 shrink-0 bg-[#0f172a]">
              <button onClick={() => setShowCreateModal(false)} className="px-6 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm transition-colors">
                取消
              </button>
              <button onClick={() => setShowCreateModal(false)} className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-sm transition-colors shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                确定创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Confirm Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e293b] border border-cyan-900/50 rounded-lg shadow-2xl w-[400px] overflow-hidden transform scale-100 transition-transform">
            <div className="p-6 flex space-x-4">
              <div className="shrink-0 mt-0.5">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-white font-medium text-lg mb-2">二次确认</h3>
                <p className="text-gray-300 text-sm">{confirmModal.title}</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-[#0f172a] border-t border-cyan-900/50 flex justify-end space-x-3">
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="px-4 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  confirmModal.action();
                  setConfirmModal({ ...confirmModal, show: false });
                }}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-sm transition-colors shadow-[0_0_10px_rgba(0,255,255,0.2)]"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Modal */}
      {logModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.15)] w-[700px] max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-cyan-900/50 shrink-0">
              <h3 className="text-white font-medium text-lg flex items-center space-x-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <span>流程日志 - {logModal.taskId}</span>
              </h3>
              <button onClick={() => setLogModal({show: false, taskId: ''})} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col overflow-hidden space-y-4 h-[500px]">
              {/* Search */}
              <div className="flex items-center space-x-2 bg-[#1e293b]/40 border border-cyan-900/30 rounded p-1">
                <Search className="w-4 h-4 text-cyan-500 ml-2" />
                <input 
                  type="text" 
                  placeholder="模糊搜索日志内容..." 
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none text-sm text-gray-200 px-2 py-1.5 focus:outline-none"
                />
              </div>
              
              {/* Log List */}
              <div className="flex-1 overflow-auto custom-scrollbar bg-[#1e293b]/20 border border-cyan-900/30 rounded">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#1e293b]/60 sticky top-0 border-b border-cyan-900/50 z-10">
                    <tr>
                      <th className="py-2.5 px-4 font-medium text-gray-400 w-44">日志时间</th>
                      <th className="py-2.5 px-4 font-medium text-gray-400 w-24">类型</th>
                      <th className="py-2.5 px-4 font-medium text-gray-400">日志内容</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-900/20">
                    {MOCK_LOGS.filter(log => log.content.includes(logSearch)).map((log, index) => {
                      let typeColor = 'text-gray-300';
                      let badgeClass = 'border-gray-500/30 bg-gray-500/10 text-gray-400';
                      if (log.type === '异常') {
                        typeColor = 'text-yellow-400';
                        badgeClass = 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
                      } else if (log.type === '故障') {
                        typeColor = 'text-red-400';
                        badgeClass = 'border-red-500/30 bg-red-500/10 text-red-400';
                      } else if (log.type === '正常') {
                        badgeClass = 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400';
                      }
                      
                      return (
                        <tr key={index} className="hover:bg-cyan-900/10 transition-colors">
                          <td className="py-3 px-4 text-gray-400 font-mono whitespace-nowrap">{log.time}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 text-xs border rounded ${badgeClass}`}>
                              {log.type}
                            </span>
                          </td>
                          <td className={`py-3 px-4 ${typeColor}`}>{log.content}</td>
                        </tr>
                      );
                    })}
                    {MOCK_LOGS.filter(log => log.content.includes(logSearch)).length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-gray-500">
                          暂无日志数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template List Modal */}
      {showTemplateListModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.15)] w-[900px] max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-cyan-900/50 shrink-0">
              <h3 className="text-white font-medium text-lg flex items-center space-x-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <span>任务模板维护</span>
              </h3>
              <button onClick={() => setShowTemplateListModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col overflow-hidden space-y-4 h-[500px]">
              <div className="flex justify-between items-center shrink-0">
                <div className="text-sm text-gray-400">管理调度任务常用的模板配置</div>
                <button 
                  onClick={() => { setTemplateForm(getInitialTemplateForm()); setShowCreateTemplateModal(true); }}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded transition-colors text-sm flex items-center space-x-1 shadow-[0_0_10px_rgba(0,255,255,0.2)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增模板</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-auto custom-scrollbar bg-[#1e293b]/20 border border-cyan-900/30 rounded">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#1e293b]/60 sticky top-0 border-b border-cyan-900/50 z-10">
                    <tr>
                      <th className="py-3 px-4 font-medium text-gray-400">模板名称</th>
                      <th className="py-3 px-4 font-medium text-gray-400 w-40">创建时间</th>
                      <th className="py-3 px-4 font-medium text-gray-400 w-24">创建人</th>
                      <th className="py-3 px-4 font-medium text-gray-400 w-40">更新时间</th>
                      <th className="py-3 px-4 font-medium text-gray-400 w-24">更新人</th>
                      <th className="py-3 px-4 font-medium text-gray-400 w-24 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-900/20">
                    {MOCK_TEMPLATES_LIST.map((template) => (
                      <tr key={template.id} className="hover:bg-cyan-900/10 transition-colors">
                        <td className="py-3 px-4 text-gray-200">{template.name}</td>
                        <td className="py-3 px-4 text-gray-400 font-mono">{template.createTime}</td>
                        <td className="py-3 px-4 text-gray-400">{template.createUser}</td>
                        <td className="py-3 px-4 text-gray-400 font-mono">{template.updateTime}</td>
                        <td className="py-3 px-4 text-gray-400">{template.updateUser}</td>
                        <td className="py-3 px-4 text-right">
                          <button 
                            className="text-red-400 hover:text-red-300 transition-colors" 
                            title="删除"
                            onClick={() => openConfirm(`确定要删除模板 [${template.name}] 吗？`, () => console.log('delete template', template.id))}
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateTemplateModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.15)] w-[800px] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-cyan-900/50 shrink-0">
              <h3 className="text-white font-medium text-lg flex items-center space-x-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <span>新增任务模板</span>
              </h3>
              <button onClick={() => setShowCreateTemplateModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto custom-scrollbar flex-1 space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-cyan-400 flex items-center border-l-2 border-cyan-400 pl-2">基本信息</h4>
                <div className="bg-[#1e293b]/30 p-4 rounded border border-cyan-900/30">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 block">模板名称 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                      placeholder="请输入模板名称"
                      className="w-full bg-[#0b1120] border border-cyan-900/50 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-cyan-400 flex items-center border-l-2 border-cyan-400 pl-2">任务明细编辑</h4>
                <TaskDetailsEditor 
                  details={templateForm.details} 
                  onChange={(newDetails) => setTemplateForm({...templateForm, details: newDetails})} 
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-cyan-900/50 flex justify-end space-x-3 shrink-0 bg-[#0f172a]">
              <button onClick={() => setShowCreateTemplateModal(false)} className="px-6 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 text-sm transition-colors">
                取消
              </button>
              <button onClick={() => setShowCreateTemplateModal(false)} className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-sm transition-colors shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                保存模板
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Template Modal */}
      {showSelectTemplateModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.15)] w-[600px] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-cyan-900/50 shrink-0">
              <h3 className="text-white font-medium text-lg flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-cyan-400" />
                <span>选择任务模板</span>
              </h3>
              <button onClick={() => setShowSelectTemplateModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-auto custom-scrollbar space-y-3">
              {MOCK_TEMPLATES_SELECTION.map(template => (
                <div 
                  key={template.id}
                  onClick={() => handleSelectTemplate(template.id)}
                  className="bg-[#1e293b]/40 border border-cyan-900/30 hover:border-cyan-500/50 hover:bg-cyan-900/20 p-4 rounded cursor-pointer transition-colors group flex flex-col gap-1"
                >
                  <div className="text-cyan-300 font-medium flex items-center space-x-2">
                    <span>{template.name}</span>
                    {template.id === 'default' && (
                      <span className="px-1.5 py-0.5 text-[10px] border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 rounded">系统内置</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                    {template.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Component;