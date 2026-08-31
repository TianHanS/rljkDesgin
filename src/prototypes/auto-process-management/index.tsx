/**
 * @name 自动化流程管理
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-standards.md
 * - /src/themes/antd-new/DESIGN-SPEC.md
 * - 用户确认的自动化流程管理业务规约
 */
import React, { useMemo, useState } from 'react';
import {
  Button,
  ConfigProvider,
  Popconfirm,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import type { ColumnsType } from 'antd/es/table';
import './style.css';
import ProcessFormDrawer from './components/ProcessFormDrawer';
import ActivityManageDrawer from './components/ActivityManageDrawer';
import {
  INITIAL_PROCESSES,
  findModuleType,
  formatStamp,
  uid,
  type ProcessConfig,
} from './data';

const AutoProcessManagement: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessConfig[]>(() =>
    INITIAL_PROCESSES.map((p) => ({
      ...p,
      activities: p.activities.map((a) => ({
        ...a,
        paramRefs: [...a.paramRefs],
        messages: a.messages.map((m) => ({ ...m })),
      })),
    })),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProcessConfig | null>(null);
  const [manageProc, setManageProc] = useState<ProcessConfig | null>(null);

  const liveManage = useMemo(() => {
    if (!manageProc) return null;
    return processes.find((p) => p.id === manageProc.id) ?? null;
  }, [manageProc, processes]);

  const columns: ColumnsType<ProcessConfig> = [
    {
      title: '模块类型',
      width: 140,
      render: (_, row) => {
        const mt = findModuleType(row.moduleTypeId);
        return mt ? (
          <Space size={4}>
            <Tag>{mt.code}</Tag>
            {mt.name}
          </Space>
        ) : (
          '—'
        );
      },
    },
    { title: '流程名称', dataIndex: 'name', width: 200 },
    {
      title: '活动数',
      width: 80,
      render: (_, row) => row.activities.length,
    },
    {
      title: '启用活动',
      width: 90,
      render: (_, row) => {
        const n = row.activities.filter((a) => a.enabled).length;
        return n > 0 ? <Tag color="processing">{n}</Tag> : <Tag>0</Tag>;
      },
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '更新时间', dataIndex: 'updatedAt', width: 170 },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_, row) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setEditing(row);
              setFormOpen(true);
            }}
          >
            流程编辑
          </Button>
          <Button type="link" size="small" onClick={() => setManageProc(row)}>
            活动管理
          </Button>
          <Popconfirm
            title="确认删除该流程配置？"
            description="将同时删除其下活动、参数关联与消息配置"
            onConfirm={() => {
              setProcesses((list) => list.filter((p) => p.id !== row.id));
              message.success('流程已删除');
            }}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const saveProcess = (payload: { moduleTypeId: string; name: string; remark?: string }) => {
    if (editing) {
      setProcesses((list) =>
        list.map((p) =>
          p.id === editing.id
            ? { ...p, name: payload.name, remark: payload.remark, updatedAt: formatStamp() }
            : p,
        ),
      );
      message.success('流程已更新');
    } else {
      const row: ProcessConfig = {
        id: uid('proc'),
        moduleTypeId: payload.moduleTypeId,
        name: payload.name,
        remark: payload.remark,
        updatedAt: formatStamp(),
        activities: [],
      };
      setProcesses((list) => [row, ...list]);
      message.success('流程已创建');
    }
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <ConfigProvider locale={zhCN} componentSize="small">
      <div className="apm-root">
        <header className="apm-hd">
          <h1>自动化流程管理</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            新建流程配置
          </Button>
        </header>

        <section className="apm-card">
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={processes}
            pagination={false}
            scroll={{ x: 1000, y: 'calc(100vh - 120px)' }}
          />
        </section>

        <ProcessFormDrawer
          open={formOpen}
          editing={editing}
          processes={processes}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSave={saveProcess}
        />

        <ActivityManageDrawer
          open={!!liveManage}
          process={liveManage}
          onClose={() => setManageProc(null)}
          onUpdateProcess={(next) => {
            setProcesses((list) =>
              list.map((p) => (p.id === next.id ? { ...next, updatedAt: formatStamp() } : p)),
            );
          }}
        />
      </div>
    </ConfigProvider>
  );
};

export default AutoProcessManagement;
