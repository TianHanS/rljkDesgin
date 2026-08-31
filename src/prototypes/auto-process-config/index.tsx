/**
 * @name 自动化流程配置
 *
 * 参考资料：
 * - /rules/design-guide.md
 * - /rules/development-standards.md
 * - /src/themes/antd-new/DESIGN-SPEC.md
 * - /skills/default-design-guide-minimal/SKILL.md
 * - /skills/third-party/interface-design/SKILL.md
 * - 用户确认的自动化流程配置业务规约与占位符截图
 */
import React, { useMemo, useState } from 'react';
import { Button, ConfigProvider, Popconfirm, Space, Tag, message } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  PlusOutlined,
  SettingOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import './style.css';
import ConfigFormDrawer from './components/ConfigFormDrawer';
import FlowConfigDrawer from './components/FlowConfigDrawer';
import ServiceManageDrawer from './components/ServiceManageDrawer';
import {
  INITIAL_CONFIGS,
  findModule,
  findModuleType,
  formatStamp,
  uid,
  type ModuleAutoConfig,
} from './data';

const AutoProcessConfig: React.FC = () => {
  const [configs, setConfigs] = useState<ModuleAutoConfig[]>(() =>
    INITIAL_CONFIGS.map((c) => ({
      ...c,
      steps: c.steps.map((s) => ({ ...s })),
      details: c.details.map((d) => ({
        ...d,
        paramValues: { ...d.paramValues },
        messages: d.messages.map((m) => ({ ...m })),
      })),
    })),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ModuleAutoConfig | null>(null);
  const [flowCfg, setFlowCfg] = useState<ModuleAutoConfig | null>(null);
  const [svcCfg, setSvcCfg] = useState<ModuleAutoConfig | null>(null);

  const sorted = useMemo(
    () =>
      [...configs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [configs],
  );

  const liveFlow = flowCfg ? configs.find((c) => c.id === flowCfg.id) ?? null : null;
  const liveSvc = svcCfg ? configs.find((c) => c.id === svcCfg.id) ?? null : null;

  const saveModule = (moduleId: string) => {
    if (editing) {
      setConfigs((list) =>
        list.map((c) =>
          c.id === editing.id ? { ...c, updatedAt: formatStamp() } : c,
        ),
      );
      message.success('配置已更新');
    } else {
      const row: ModuleAutoConfig = {
        id: uid('cfg'),
        moduleId,
        createdAt: formatStamp(),
        updatedAt: formatStamp(),
        steps: [],
        details: [],
        paramsDirty: false,
        serviceStatus: 'stopped',
        packageVersion: '',
        packageUploadedAt: '',
        servicePort: 9000,
      };
      setConfigs((list) => [row, ...list]);
      message.success('配置已创建，请继续完成流程配置');
    }
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <ConfigProvider locale={zhCN} componentSize="small">
      <div className="apc-root">
        <header className="apc-hd">
          <div>
            <h1>自动化流程配置</h1>
            <p>按模块实例组装流程环节、填写详细参数，并管理流程包与服务</p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            新增配置
          </Button>
        </header>

        <div className="apc-card-grid">
          {sorted.map((cfg) => {
            const mod = findModule(cfg.moduleId);
            const type = mod ? findModuleType(mod.moduleTypeId) : undefined;
            return (
              <article key={cfg.id} className="apc-card">
                <div className="apc-card-top">
                  <div className="apc-card-title">
                    <h2>{mod?.name ?? '未知模块'}</h2>
                    {cfg.paramsDirty && (
                      <Tag icon={<ExclamationCircleFilled />} color="warning">
                        待检查参数
                      </Tag>
                    )}
                  </div>
                  <Tag color={cfg.serviceStatus === 'running' ? 'success' : 'default'}>
                    {cfg.serviceStatus === 'running' ? '服务运行中' : '服务已停用'}
                  </Tag>
                </div>

                <dl className="apc-card-meta">
                  <div>
                    <dt>模块类型</dt>
                    <dd>
                      {type ? (
                        <Space size={4}>
                          <Tag>{type.code}</Tag>
                          {type.name}
                        </Space>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>流程环节</dt>
                    <dd>{cfg.steps.length} 步</dd>
                  </div>
                  <div>
                    <dt>创建时间</dt>
                    <dd>{cfg.createdAt}</dd>
                  </div>
                  <div>
                    <dt>流程包</dt>
                    <dd>{cfg.packageVersion || '未上传'}</dd>
                  </div>
                </dl>

                <div className="apc-card-actions">
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditing(cfg);
                      setFormOpen(true);
                    }}
                  >
                    编辑
                  </Button>
                  <Button
                    type="primary"
                    ghost
                    icon={<ClusterOutlined />}
                    onClick={() => setFlowCfg(cfg)}
                  >
                    流程配置
                  </Button>
                  <Button icon={<SettingOutlined />} onClick={() => setSvcCfg(cfg)}>
                    服务管理
                  </Button>
                  <Popconfirm
                    title="确认删除该模块配置？"
                    description="将清除环节与参数配置，不可恢复"
                    onConfirm={() => {
                      setConfigs((list) => list.filter((c) => c.id !== cfg.id));
                      message.success('已删除');
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

        <ConfigFormDrawer
          open={formOpen}
          editing={editing}
          configs={configs}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSave={saveModule}
        />

        <FlowConfigDrawer
          open={!!liveFlow}
          config={liveFlow}
          onClose={() => setFlowCfg(null)}
          onSave={(patch) => {
            if (!liveFlow) return;
            setConfigs((list) =>
              list.map((c) =>
                c.id === liveFlow.id ? { ...c, ...patch, updatedAt: formatStamp() } : c,
              ),
            );
          }}
        />

        <ServiceManageDrawer
          open={!!liveSvc}
          config={liveSvc}
          moduleName={liveSvc ? findModule(liveSvc.moduleId)?.name : undefined}
          onClose={() => setSvcCfg(null)}
          onSave={(patch) => {
            if (!liveSvc) return;
            setConfigs((list) =>
              list.map((c) =>
                c.id === liveSvc.id ? { ...c, ...patch, updatedAt: formatStamp() } : c,
              ),
            );
            message.success('服务配置已保存');
            setSvcCfg(null);
          }}
        />
      </div>
    </ConfigProvider>
  );
};

export default AutoProcessConfig;
