/**
 * 活动管理：列表拖拽排序、状态切换、参数/消息入口
 */
import React, { useMemo, useState } from 'react';
import { Button, Drawer, Popconfirm, Space, Switch, Table, Tag, message } from 'antd';
import { HolderOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ActivityFormModal from './ActivityFormModal';
import ParamBindDrawer from './ParamBindDrawer';
import MessageConfigDrawer from './MessageConfigDrawer';
import {
  findModuleType,
  formatStamp,
  uid,
  type ActivityParamRef,
  type MessageConfig,
  type ProcessActivity,
  type ProcessConfig,
} from '../data';

interface Props {
  open: boolean;
  process: ProcessConfig | null;
  onClose: () => void;
  onUpdateProcess: (next: ProcessConfig) => void;
}

const ActivityManageDrawer: React.FC<Props> = ({ open, process, onClose, onUpdateProcess }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProcessActivity | null>(null);
  const [paramAct, setParamAct] = useState<ProcessActivity | null>(null);
  const [msgAct, setMsgAct] = useState<ProcessActivity | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const activities = useMemo(
    () => (process ? [...process.activities].sort((a, b) => a.seq - b.seq) : []),
    [process],
  );

  const defaultSeq = activities.length ? Math.max(...activities.map((a) => a.seq)) + 1 : 1;

  if (!process) return null;

  const patchActivities = (nextActs: ProcessActivity[]) => {
    onUpdateProcess({ ...process, activities: nextActs, updatedAt: formatStamp() });
  };

  const renumber = (list: ProcessActivity[]) =>
    list.map((a, i) => ({ ...a, seq: i + 1 }));

  const onDragStart = (id: string) => setDragId(id);
  const onDragEnd = () => setDragId(null);
  const onDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    const from = activities.findIndex((a) => a.id === dragId);
    const to = activities.findIndex((a) => a.id === overId);
    if (from < 0 || to < 0) return;
    const next = [...activities];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    patchActivities(renumber(next));
  };

  const toggleEnabled = (id: string, enabled: boolean) => {
    patchActivities(activities.map((a) => (a.id === id ? { ...a, enabled } : a)));
  };

  const removeAct = (id: string) => {
    patchActivities(renumber(activities.filter((a) => a.id !== id)));
    message.success('活动已删除');
  };

  const saveActivity = (payload: {
    code: string;
    name: string;
    seq: number;
    enabled: boolean;
    remark?: string;
  }) => {
    if (editing) {
      const next = activities.map((a) =>
        a.id === editing.id ? { ...a, ...payload } : a,
      );
      patchActivities([...next].sort((a, b) => a.seq - b.seq));
      message.success('活动已更新');
    } else {
      const act: ProcessActivity = {
        id: uid('act'),
        processId: process.id,
        ...payload,
        paramRefs: [],
        messages: [],
      };
      patchActivities([...activities, act].sort((a, b) => a.seq - b.seq));
      message.success('活动已新增');
    }
    setFormOpen(false);
    setEditing(null);
  };

  const saveParams = (refs: ActivityParamRef[]) => {
    if (!paramAct) return;
    patchActivities(
      activities.map((a) => (a.id === paramAct.id ? { ...a, paramRefs: refs } : a)),
    );
    message.success('参数关联已保存');
    setParamAct(null);
  };

  const saveMessages = (messages: MessageConfig[]) => {
    if (!msgAct) return;
    const nextActs = activities.map((a) =>
      a.id === msgAct.id ? { ...a, messages } : a,
    );
    patchActivities(nextActs);
    setMsgAct(nextActs.find((a) => a.id === msgAct.id) ?? null);
  };

  const liveProcess: ProcessConfig = { ...process, activities };

  const columns: ColumnsType<ProcessActivity> = [
    {
      title: '',
      width: 40,
      render: (_, row) => (
        <HolderOutlined
          className="apm-drag-handle"
          title="拖拽排序"
          draggable
          onDragStart={() => onDragStart(row.id)}
          onDragEnd={onDragEnd}
        />
      ),
    },
    { title: '序号', dataIndex: 'seq', width: 64 },
    { title: '活动编码', dataIndex: 'code', width: 140 },
    { title: '活动名称', dataIndex: 'name', width: 140 },
    {
      title: '状态',
      width: 100,
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.enabled}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          onChange={(v) => toggleEnabled(row.id, v)}
        />
      ),
    },
    {
      title: '参数数',
      width: 72,
      render: (_, row) => row.paramRefs.length,
    },
    {
      title: '消息数',
      width: 72,
      render: (_, row) => row.messages.length,
    },
    { title: '说明', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作',
      width: 260,
      fixed: 'right',
      render: (_, row) => (
        <Space size={0} wrap>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setEditing(row);
              setFormOpen(true);
            }}
          >
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => setParamAct(row)}>
            参数关联
          </Button>
          <Button type="link" size="small" onClick={() => setMsgAct(row)}>
            消息配置
          </Button>
          <Popconfirm title="确认删除该活动？" onConfirm={() => removeAct(row.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const mt = findModuleType(process.moduleTypeId);

  return (
    <>
      <Drawer
        title={
          <span>
            活动管理
            <Tag color="processing" style={{ marginLeft: 8 }}>
              {mt?.name}
            </Tag>
            <span className="apm-drawer-sub">{process.name}</span>
          </span>
        }
        open={open}
        onClose={onClose}
        width={960}
        destroyOnHidden
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            新增活动
          </Button>
        }
      >
        <p className="apm-hint">拖拽左侧手柄可调整活动顺序，序号将自动重排。</p>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={activities}
          scroll={{ x: 900 }}
          onRow={(row) => ({
            onDragOver: (e) => onDragOver(e, row.id),
            className: dragId === row.id ? 'apm-row-dragging' : undefined,
          })}
        />
      </Drawer>

      <ActivityFormModal
        open={formOpen}
        editing={editing}
        defaultSeq={defaultSeq}
        activities={activities}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={saveActivity}
      />

      {paramAct && (
        <ParamBindDrawer
          open={!!paramAct}
          process={liveProcess}
          activity={paramAct}
          onClose={() => setParamAct(null)}
          onSave={saveParams}
        />
      )}

      {msgAct && (
        <MessageConfigDrawer
          open={!!msgAct}
          process={liveProcess}
          activity={msgAct}
          onClose={() => setMsgAct(null)}
          onChange={saveMessages}
        />
      )}
    </>
  );
};

export default ActivityManageDrawer;
