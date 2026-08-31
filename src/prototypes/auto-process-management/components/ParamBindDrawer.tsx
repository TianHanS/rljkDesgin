/**
 * 活动参数关联：
 * 二级抽屉仅展示本活动已关联参数（排序/删除/保存）；
 * 需新增时打开三级抽屉选择其他可关联参数。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Empty, Input, Space, Table, message } from 'antd';
import { DeleteOutlined, HolderOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  paramsByModule,
  type ActivityParamRef,
  type ConfigParam,
  type ProcessActivity,
  type ProcessConfig,
} from '../data';

interface Props {
  open: boolean;
  process: ProcessConfig;
  activity: ProcessActivity;
  onClose: () => void;
  onSave: (refs: ActivityParamRef[]) => void;
}

const ParamBindDrawer: React.FC<Props> = ({ open, process, activity, onClose, onSave }) => {
  const [bound, setBound] = useState<ActivityParamRef[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  const allParams = useMemo(() => paramsByModule(process.moduleTypeId), [process.moduleTypeId]);

  /** 已被本流程其他活动占用的参数 */
  const occupiedIds = useMemo(() => {
    const set = new Set<string>();
    for (const act of process.activities) {
      if (act.id === activity.id) continue;
      for (const ref of act.paramRefs) set.add(ref.paramId);
    }
    return set;
  }, [process.activities, activity.id]);

  const boundIdSet = useMemo(() => new Set(bound.map((r) => r.paramId)), [bound]);

  useEffect(() => {
    if (!open) {
      setPickOpen(false);
      return;
    }
    setBound([...activity.paramRefs].sort((a, b) => a.sort - b.sort));
  }, [open, activity]);

  const paramMap = useMemo(() => {
    const m = new Map<string, ConfigParam>();
    allParams.forEach((p) => m.set(p.id, p));
    return m;
  }, [allParams]);

  /** 三级抽屉可选：未关联到本活动的参数（他活动已占用的仍展示但置灰） */
  const pickCandidates = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return allParams.filter((p) => {
      if (boundIdSet.has(p.id)) return false;
      if (!key) return true;
      return p.name.toLowerCase().includes(key) || p.code.toLowerCase().includes(key);
    });
  }, [allParams, boundIdSet, keyword]);

  const openPick = () => {
    setKeyword('');
    setPickedIds([]);
    setPickOpen(true);
  };

  const confirmPick = () => {
    const addable = pickedIds.filter((id) => !occupiedIds.has(id) && !boundIdSet.has(id));
    if (!addable.length) {
      message.warning('请选择可关联的参数');
      return;
    }
    setBound((list) => {
      let sort = list.length + 1;
      const next = [...list];
      for (const id of addable) {
        next.push({ paramId: id, sort: sort++ });
      }
      return next;
    });
    setPickOpen(false);
    message.success(`已添加 ${addable.length} 个参数，可调整顺序后保存`);
  };

  const removeBound = (paramId: string) => {
    setBound((list) =>
      list.filter((r) => r.paramId !== paramId).map((r, i) => ({ ...r, sort: i + 1 })),
    );
  };

  const onDragStart = (paramId: string) => setDragId(paramId);
  const onDragEnd = () => setDragId(null);
  const onDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setBound((list) => {
      const from = list.findIndex((r) => r.paramId === dragId);
      const to = list.findIndex((r) => r.paramId === overId);
      if (from < 0 || to < 0) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((r, i) => ({ ...r, sort: i + 1 }));
    });
  };

  const boundColumns: ColumnsType<ActivityParamRef> = [
    {
      title: '',
      width: 36,
      render: (_, row) => (
        <HolderOutlined
          className="apm-drag-handle"
          draggable
          onDragStart={() => onDragStart(row.paramId)}
          onDragEnd={onDragEnd}
        />
      ),
    },
    { title: '顺序', dataIndex: 'sort', width: 56 },
    {
      title: '参数编码',
      render: (_, row) => paramMap.get(row.paramId)?.code ?? row.paramId,
    },
    {
      title: '参数名称',
      render: (_, row) => paramMap.get(row.paramId)?.name ?? '—',
    },
    {
      title: '类型',
      width: 80,
      render: (_, row) => paramMap.get(row.paramId)?.dataType ?? '—',
    },
    {
      title: '操作',
      width: 72,
      render: (_, row) => (
        <Button
          type="link"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeBound(row.paramId)}
        >
          删除
        </Button>
      ),
    },
  ];

  const pickColumns: ColumnsType<ConfigParam> = [
    { title: '参数编码', dataIndex: 'code', width: 180 },
    { title: '参数名称', dataIndex: 'name', width: 140 },
    { title: '类型', dataIndex: 'dataType', width: 80 },
    {
      title: '状态',
      width: 100,
      render: (_, row) => (occupiedIds.has(row.id) ? '他活动已关联' : '可选'),
    },
  ];

  return (
    <>
      <Drawer
        title={`参数关联 · ${activity.name}`}
        open={open}
        onClose={onClose}
        width={640}
        destroyOnHidden
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openPick}>
            添加参数
          </Button>
        }
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              onClick={() => onSave(bound.map((r, i) => ({ ...r, sort: i + 1 })))}
            >
              保存关联
            </Button>
          </Space>
        }
      >
        <p className="apm-hint">以下为本活动已关联参数。拖拽调整顺序，或点击「添加参数」选择其他配置项。</p>
        {bound.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无关联参数"
            style={{ marginTop: 48 }}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={openPick}>
              添加参数
            </Button>
          </Empty>
        ) : (
          <Table
            rowKey="paramId"
            size="small"
            pagination={false}
            columns={boundColumns}
            dataSource={bound}
            onRow={(row) => ({
              onDragOver: (e) => onDragOver(e, row.paramId),
              className: dragId === row.paramId ? 'apm-row-dragging' : undefined,
            })}
          />
        )}
      </Drawer>

      <Drawer
        title="选择配置参数"
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        width={560}
        destroyOnHidden
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setPickOpen(false)}>取消</Button>
            <Button type="primary" disabled={!pickedIds.length} onClick={confirmPick}>
              确认添加
            </Button>
          </Space>
        }
      >
        <div className="apm-section-hd" style={{ marginBottom: 12 }}>
          <span>模块类型可关联参数</span>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="按名称 / 编码搜索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 220 }}
          />
        </div>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          columns={pickColumns}
          dataSource={pickCandidates}
          scroll={{ y: 'calc(100vh - 220px)' }}
          rowSelection={{
            selectedRowKeys: pickedIds,
            getCheckboxProps: (row) => ({ disabled: occupiedIds.has(row.id) }),
            onChange: (keys) => {
              setPickedIds((keys as string[]).filter((id) => !occupiedIds.has(id)));
            },
          }}
          onRow={(row) => ({
            style: occupiedIds.has(row.id) ? { opacity: 0.45 } : undefined,
          })}
          locale={{ emptyText: '暂无可添加参数' }}
        />
        <p className="apm-hint" style={{ marginTop: 10 }}>
          已被其他活动关联的参数置灰不可选；本活动已关联参数不在此列表展示。
        </p>
      </Drawer>
    </>
  );
};

export default ParamBindDrawer;
