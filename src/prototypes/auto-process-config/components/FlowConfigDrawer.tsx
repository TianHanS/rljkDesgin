/**
 * 流程配置工作台：Tab1 环节组装 / Tab2 详细参数（活动去重）
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Radio,
  Select,
  Tabs,
  Tag,
  message,
} from 'antd';
import {
  DeleteOutlined,
  ExclamationCircleFilled,
  HolderOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import ActivityMessageSection from './ActivityMessageSection';
import {
  SPEC_BY_TYPE,
  findActivity,
  findModule,
  findModuleType,
  normalizeOptions,
  uid,
  type ActivityDetailConfig,
  type FlowStep,
  type ModuleAutoConfig,
  type SpecActivity,
  type SpecParam,
} from '../data';

interface Props {
  open: boolean;
  config: ModuleAutoConfig | null;
  onClose: () => void;
  onSave: (patch: Pick<ModuleAutoConfig, 'steps' | 'details' | 'paramsDirty'>) => void;
}

const FlowConfigDrawer: React.FC<Props> = ({ open, config, onClose, onSave }) => {
  const [tab, setTab] = useState('steps');
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [details, setDetails] = useState<ActivityDetailConfig[]>([]);
  const [paramsDirty, setParamsDirty] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const mod = config ? findModule(config.moduleId) : undefined;
  const typeId = mod?.moduleTypeId ?? '';
  const type = typeId ? findModuleType(typeId) : undefined;
  const catalog = useMemo(() => SPEC_BY_TYPE[typeId] || [], [typeId]);

  useEffect(() => {
    if (!open || !config) return;
    setTab('steps');
    setSteps(config.steps.map((s) => ({ ...s })));
    setDetails(config.details.map((d) => ({
      ...d,
      paramValues: { ...d.paramValues },
      messages: d.messages.map((m) => ({ ...m })),
    })));
    setParamsDirty(config.paramsDirty);
  }, [open, config]);

  /** 详细参数：按活动 id 去重，顺序按首次出现 */
  const uniqueActivityIds = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of steps) {
      if (!seen.has(s.activityId)) {
        seen.add(s.activityId);
        list.push(s.activityId);
      }
    }
    return list;
  }, [steps]);

  const addStep = (act: SpecActivity) => {
    setSteps((list) => [...list, { instanceId: uid('step'), activityId: act.id }]);
  };

  const removeStep = (instanceId: string) => {
    setSteps((list) => list.filter((s) => s.instanceId !== instanceId));
  };

  const onDragStart = (id: string) => setDragId(id);
  const onDragEnd = () => setDragId(null);
  const onDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setSteps((list) => {
      const from = list.findIndex((s) => s.instanceId === dragId);
      const to = list.findIndex((s) => s.instanceId === overId);
      if (from < 0 || to < 0) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const buildDetailsFromSteps = (
    nextSteps: FlowStep[],
    prev: ActivityDetailConfig[],
    markReview: boolean,
  ): ActivityDetailConfig[] => {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const s of nextSteps) {
      if (!seen.has(s.activityId)) {
        seen.add(s.activityId);
        ids.push(s.activityId);
      }
    }
    return ids.map((activityId) => {
      const old = prev.find((d) => d.activityId === activityId);
      const spec = findActivity(typeId, activityId);
      if (old) {
        return { ...old, needsReview: markReview || old.needsReview };
      }
      return {
        activityId,
        paramValues: Object.fromEntries(
          (spec?.params || []).map((p) => [
            p.id,
            p.defaultValue !== undefined
              ? p.defaultValue
              : p.dataType === 'boolean'
                ? false
                : p.dataType === 'number'
                  ? null
                  : normalizeOptions(p.options)[0]?.value ?? '',
          ]),
        ),
        messages: (spec?.messages || []).map((m) => ({
          messageId: m.id,
          ledEnabled: m.ledEnabled,
          ledTemplate: m.ledTemplate,
          voiceEnabled: m.voiceEnabled,
          voiceTemplate: m.voiceTemplate,
        })),
        needsReview: true,
      };
    });
  };

  const saveSteps = () => {
    if (!steps.length) {
      message.error('请至少选择一个流程环节');
      return;
    }
    const nextDetails = buildDetailsFromSteps(steps, details, true);
    setDetails(nextDetails);
    setParamsDirty(true);
    onSave({ steps, details: nextDetails, paramsDirty: true });
    message.success('环节已保存，请检查并更新详细参数');
    setTab('params');
  };

  const saveParams = () => {
    // basic required check
    for (const actId of uniqueActivityIds) {
      const spec = findActivity(typeId, actId);
      const detail = details.find((d) => d.activityId === actId);
      if (!spec || !detail) continue;
      for (const p of spec.params) {
        if (!p.required) continue;
        const v = detail.paramValues[p.id];
        if (v === undefined || v === null || v === '') {
          message.error(`请完善「${spec.name}」中的必填参数：${p.name}`);
          return;
        }
      }
    }
    const cleared = details.map((d) => ({ ...d, needsReview: false }));
    setDetails(cleared);
    setParamsDirty(false);
    onSave({ steps, details: cleared, paramsDirty: false });
    message.success('详细参数已保存');
  };

  const patchParam = (activityId: string, paramId: string, value: string | number | boolean | null) => {
    setDetails((list) =>
      list.map((d) =>
        d.activityId === activityId
          ? { ...d, paramValues: { ...d.paramValues, [paramId]: value } }
          : d,
      ),
    );
  };

  const patchMessage = (
    activityId: string,
    messageId: string,
    patch: Partial<ActivityDetailConfig['messages'][0]>,
  ) => {
    setDetails((list) =>
      list.map((d) =>
        d.activityId === activityId
          ? {
              ...d,
              messages: d.messages.map((m) => (m.messageId === messageId ? { ...m, ...patch } : m)),
            }
          : d,
      ),
    );
  };

  const renderParamControl = (activityId: string, p: SpecParam, value: unknown) => {
    const opts = normalizeOptions(p.options);
    if (p.dataType === 'radio' || (p.dataType === 'boolean' && opts.length)) {
      const radioOpts =
        p.dataType === 'boolean' && !opts.length
          ? [
              { label: '启用', value: true },
              { label: '禁用', value: false },
            ]
          : opts;
      return (
        <Radio.Group
          size="small"
          value={value as string | number | boolean}
          options={radioOpts.map((o) => ({ label: o.label, value: o.value }))}
          onChange={(e) => patchParam(activityId, p.id, e.target.value)}
        />
      );
    }
    if (p.dataType === 'boolean') {
      return (
        <Radio.Group
          size="small"
          value={!!value}
          options={[
            { label: '启用', value: true },
            { label: '禁用', value: false },
          ]}
          onChange={(e) => patchParam(activityId, p.id, e.target.value)}
        />
      );
    }
    if (p.dataType === 'number') {
      return (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          value={typeof value === 'number' ? value : null}
          onChange={(v) => patchParam(activityId, p.id, v == null ? null : Number(v))}
        />
      );
    }
    if (p.dataType === 'select') {
      return (
        <Select
          size="small"
          style={{ width: '100%' }}
          value={value as string | number | undefined}
          options={opts.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(v) => patchParam(activityId, p.id, v)}
        />
      );
    }
    return (
      <Input
        size="small"
        value={String(value ?? '')}
        onChange={(e) => patchParam(activityId, p.id, e.target.value)}
      />
    );
  };

  const renderParamGroups = (activityId: string, spec: SpecActivity, detail: ActivityDetailConfig) => {
    const groups: { title: string; params: SpecParam[] }[] = [];
    const map = new Map<string, SpecParam[]>();
    for (const param of spec.params) {
      const g = param.group || '参数配置';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(param);
    }
    map.forEach((params, title) => groups.push({ title, params }));

    return groups.map((g) => (
      <div key={g.title} className="apc-param-group">
        <div className="apc-group-hd">
          <span className="apc-group-dot" />
          <h4>{g.title}</h4>
        </div>
        <div className="apc-param-grid">
          {g.params.map((param) => (
            <div key={param.id} className="apc-param-card">
              <div className="apc-param-name">
                {param.required && <span className="apc-req">*</span>}
                {param.name}
                <code>{param.code}</code>
              </div>
              <p className="apc-param-desc">{param.description}</p>
              <div className="apc-param-ctrl">
                {renderParamControl(activityId, param, detail.paramValues[param.id])}
              </div>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  if (!config) return null;

  const stepsTab = (
    <div className="apc-flow-layout">
      <div className="apc-flow-pane">
        <div className="apc-pane-hd">
          <span>可选流程</span>
          <Tag>{type?.name}</Tag>
        </div>
        <p className="apc-hint">点击「添加」将环节加入右侧流水线；同一活动可重复添加。</p>
        <div className="apc-flow-scroll">
          <div className="apc-catalog">
            {catalog.map((act) => (
              <div key={act.id} className="apc-catalog-item">
                <div className="apc-catalog-main">
                  <strong>{act.name}</strong>
                  <span className="apc-muted">{act.code}</span>
                  <p>{act.remark || '—'}</p>
                </div>
                <Button size="small" icon={<PlusOutlined />} onClick={() => addStep(act)}>
                  添加
                </Button>
              </div>
            ))}
            {!catalog.length && <Empty description="该类型暂无规格活动" />}
          </div>
        </div>
      </div>

      <div className="apc-flow-pane">
        <div className="apc-pane-hd">
          <span>已选流程环节</span>
          <span className="apc-muted">共 {steps.length} 步 · 可拖拽排序</span>
        </div>
        <div className="apc-flow-scroll">
          {!steps.length ? (
            <Empty description="请从左侧添加环节" style={{ marginTop: 48 }} />
          ) : (
            <ul className="apc-step-list">
              {steps.map((step, idx) => {
                const act = findActivity(typeId, step.activityId);
                return (
                  <li
                    key={step.instanceId}
                    className={`apc-step-item${dragId === step.instanceId ? ' is-dragging' : ''}`}
                    onDragOver={(e) => onDragOver(e, step.instanceId)}
                  >
                    <HolderOutlined
                      className="apc-drag-handle"
                      draggable
                      onDragStart={() => onDragStart(step.instanceId)}
                      onDragEnd={onDragEnd}
                    />
                    <span className="apc-step-idx">{idx + 1}</span>
                    <div className="apc-step-body">
                      <strong>{act?.name ?? step.activityId}</strong>
                      <span className="apc-muted">{act?.remark}</span>
                    </div>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeStep(step.instanceId)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="apc-pane-ft">
          <Button type="primary" onClick={saveSteps}>
            保存环节配置
          </Button>
        </div>
      </div>
    </div>
  );

  const paramsTab = (
    <div className="apc-params-pane">
      {paramsDirty && (
        <div className="apc-alert">
          <ExclamationCircleFilled />
          流程环节已调整，请逐项检查并更新详细参数后保存。
        </div>
      )}
      {!uniqueActivityIds.length ? (
        <Empty description="请先在「流程环节配置」中保存环节" style={{ marginTop: 64 }} />
      ) : (
        uniqueActivityIds.map((activityId, actIdx) => {
          const spec = findActivity(typeId, activityId);
          const detail = details.find((d) => d.activityId === activityId);
          if (!spec || !detail) return null;
          const dupCount = steps.filter((s) => s.activityId === activityId).length;
          const firstStepIdx = steps.findIndex((s) => s.activityId === activityId);
          const stepNo = firstStepIdx >= 0 ? firstStepIdx + 1 : actIdx + 1;
          return (
            <section key={activityId} className="apc-act-card">
              <header className="apc-act-hd">
                <div className="apc-act-hd-main">
                  <span className="apc-act-step-no">{stepNo}</span>
                  <div>
                    <h3>{spec.name}</h3>
                    <span className="apc-muted">{spec.code}</span>
                    {dupCount > 1 && (
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        流水线出现 {dupCount} 次 · 参数共用一份
                      </Tag>
                    )}
                    <p className="apc-act-desc">{spec.remark}</p>
                  </div>
                </div>
                {detail.needsReview && (
                  <Tag icon={<ExclamationCircleFilled />} color="warning">
                    待检查
                  </Tag>
                )}
              </header>

              {!!spec.params.length && (
                <div className="apc-act-inner">
                  <div className="apc-group-hd">
                    <span className="apc-group-dot" />
                    <h4>详细参数</h4>
                  </div>
                  {renderParamGroups(activityId, spec, detail)}
                </div>
              )}

              {!!spec.messages.length && (
                <div className="apc-act-inner">
                  <ActivityMessageSection
                    messages={spec.messages}
                    values={detail.messages}
                    onChange={(messageId, patch) => patchMessage(activityId, messageId, patch)}
                  />
                </div>
              )}

              {!spec.params.length && !spec.messages.length && (
                <p className="apc-muted">该活动规格未关联参数与消息。</p>
              )}
            </section>
          );
        })
      )}
      {!!uniqueActivityIds.length && (
        <div className="apc-pane-ft sticky">
          <Button type="primary" onClick={saveParams}>
            保存详细参数
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Drawer
      title={
        <span>
          流程配置
          <Tag color="processing" style={{ marginLeft: 8 }}>
            {mod?.name}
          </Tag>
          <span className="apc-drawer-sub">{type?.name}</span>
        </span>
      }
      open={open}
      onClose={onClose}
      width={1180}
      destroyOnHidden
      className="apc-flow-drawer"
      styles={{
        body: {
          paddingTop: 8,
          paddingBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100% - 55px)',
          overflow: 'hidden',
        },
      }}
    >
      <Tabs
        className="apc-flow-tabs"
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'steps', label: '流程环节配置', children: stepsTab },
          {
            key: 'params',
            label: (
              <Badge dot={paramsDirty} offset={[4, 0]}>
                详细参数配置
              </Badge>
            ),
            children: paramsTab,
          },
        ]}
      />
    </Drawer>
  );
};

export default FlowConfigDrawer;
