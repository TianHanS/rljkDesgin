/**
 * @name 流程规格配置
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-standards.md
 * - /src/themes/antd-new/DESIGN-SPEC.md
 * - /skills/default-design-guide-minimal/SKILL.md
 * - /skills/third-party/interface-design/SKILL.md
 * - 用户确认：主列表改卡片、活动提示、抽屉内仍用列表、页面更名
 */
import React, { useMemo, useState } from 'react';
import { Badge, Button, ConfigProvider, Popconfirm, Tag, message } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  PlusOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
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

  const sorted = useMemo(
    () =>
      [...processes].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [processes],
  );

  const liveManage = useMemo(() => {
    if (!manageProc) return null;
    return processes.find((p) => p.id === manageProc.id) ?? null;
  }, [manageProc, processes]);

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
          <div>
            <h1>流程规格配置</h1>
            <p>按模块类型维护活动库、参数关联与消息模板，供模块实例配置引用</p>
          </div>
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

        <div className="apm-card-grid">
          {sorted.map((row) => {
            const mt = findModuleType(row.moduleTypeId);
            const enabledCount = row.activities.filter((a) => a.enabled).length;
            const noActivity = row.activities.length === 0;
            const sortedActs = [...row.activities].sort((a, b) => a.seq - b.seq);

            return (
              <article key={row.id} className="apm-card">
                <div className="apm-card-top">
                  <div className="apm-card-title">
                    <h2>{row.name}</h2>
                    {noActivity && (
                      <Tag icon={<ExclamationCircleFilled />} color="error">
                        暂无活动，请完善
                      </Tag>
                    )}
                  </div>
                  {mt ? <Tag>{mt.code}</Tag> : null}
                </div>

                <dl className="apm-card-meta">
                  <div>
                    <dt>模块类型</dt>
                    <dd>{mt?.name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>活动 / 启用</dt>
                    <dd>
                      {row.activities.length} /{' '}
                      {enabledCount > 0 ? (
                        <Tag color="processing">{enabledCount}</Tag>
                      ) : (
                        <Tag>0</Tag>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>更新时间</dt>
                    <dd>{row.updatedAt}</dd>
                  </div>
                  <div>
                    <dt>备注</dt>
                    <dd className="apm-card-remark">{row.remark || '—'}</dd>
                  </div>
                </dl>

                <div className="apm-card-acts">
                  <div className="apm-card-acts-label">活动提示</div>
                  {noActivity ? (
                    <span className="apm-muted">尚未配置业务环节</span>
                  ) : (
                    <div className="apm-act-tags">
                      {sortedActs.map((a) => (
                        <Tag key={a.id} color={a.enabled ? 'blue' : 'default'}>
                          {a.seq}. {a.name}
                          {!a.enabled ? '（禁用）' : ''}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>

                <div className="apm-card-actions">
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditing(row);
                      setFormOpen(true);
                    }}
                  >
                    流程编辑
                  </Button>
                  <Badge dot={noActivity} offset={[-2, 2]}>
                    <Button
                      type="primary"
                      ghost
                      icon={<ClusterOutlined />}
                      onClick={() => setManageProc(row)}
                    >
                      活动管理
                    </Button>
                  </Badge>
                  <Popconfirm
                    title="确认删除该流程配置？"
                    description="将同时删除其下活动、参数关联与消息配置"
                    onConfirm={() => {
                      setProcesses((list) => list.filter((p) => p.id !== row.id));
                      message.success('流程已删除');
                    }}
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </div>
              </article>
            );
          })}
        </div>

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
