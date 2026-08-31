/**
 * 活动参数关联：多选、搜索、已关联拖拽排序
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Input, Space, Table, message } from 'antd';
import { DeleteOutlined, HolderOutlined, SearchOutlined } from '@ant-design/icons';
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
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bound, setBound] = useState<ActivityParamRef[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!open) return;
    setKeyword('');
    const refs = [...activity.paramRefs].sort((a, b) => a.sort - b.sort);
    setBound(refs);
    setSelectedIds(refs.map((r) => r.paramId));
  }, [open, activity]);

  const filtered = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return allParams;
    return allParams.filter(
      (p) => p.name.toLowerCase().includes(key) || p.code.toLowerCase().includes(key),
    );
  }, [allParams, keyword]);

  const applySelection = () => {
    const next: ActivityParamRef[] = [];
    let sort = 1;
    // keep existing order for already bound
    for (const ref of bound) {
      if (selectedIds.includes(ref.paramId)) {
        next.push({ paramId: ref.paramId, sort: sort++ });
      }
    }
    for (const id of selectedIds) {
      if (!next.some((r) => r.paramId === id)) {
        next.push({ paramId: id, sort: sort++ });
      }
    }
    setBound(next);
    message.success('已更新选中参数，请在下方调整顺序后保存');
  };

  const removeBound = (paramId: string) => {
    setBound((list) =>
      list.filter((r) => r.paramId !== paramId).map((r, i) => ({ ...r, sort: i + 1 })),
    );
    setSelectedIds((ids) => ids.filter((id) => id !== paramId));
  };

  const onDragStart = (paramId: string) => setDragId(paramId);
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
  const onDragEnd = () => setDragId(null);

  const paramMap = useMemo(() => {
    const m = new Map<string, ConfigParam>();
    allParams.forEach((p) => m.set(p.id, p));
    return m;
  }, [allParams]);

  const pickColumns: ColumnsType<ConfigParam> = [
    { title: '参数编码', dataIndex: 'code', width: 180 },
    { title: '参数名称', dataIndex: 'name', width: 140 },
    { title: '类型', dataIndex: 'dataType', width: 80 },
  ];

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
      title: '操作',
      width: 72,
      render: (_, row) => (
        <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => removeBound(row.paramId)}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <Drawer
      title={`参数关联 · ${activity.name}`}
      open={open}
      onClose={onClose}
      width={720}
      destroyOnHidden
      footer={
        <Space style={{ float: 'right' }}>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            onClick={() => {
              onSave(bound.map((r, i) => ({ ...r, sort: i + 1 })));
            }}
          >
            保存关联
          </Button>
        </Space>
      }
    >
      <div className="apm-param-section">
        <div className="apm-section-hd">
          <span>可选配置参数</span>
          <Space>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="按名称 / 编码搜索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 220 }}
            />
            <Button type="primary" ghost onClick={applySelection}>
              确认选择
            </Button>
          </Space>
        </div>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          columns={pickColumns}
          dataSource={filtered}
          scroll={{ y: 220 }}
          rowSelection={{
            selectedRowKeys: selectedIds,
            getCheckboxProps: (row) => ({
              disabled: occupiedIds.has(row.id),
            }),
            onChange: (keys) => {
              const next = keys as string[];
              // prevent selecting occupied
              setSelectedIds(next.filter((id) => !occupiedIds.has(id)));
            },
          }}
          rowClassName={(row) => (occupiedIds.has(row.id) ? 'apm-row-disabled' : '')}
          onRow={(row) => ({
            style: occupiedIds.has(row.id) ? { opacity: 0.45 } : undefined,
          })}
        />
        <p className="apm-hint">灰色行为其他活动已关联，不可重复选择。</p>
      </div>

      <div className="apm-param-section">
        <div className="apm-section-hd">
          <span>已关联参数（拖拽调整顺序）</span>
        </div>
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
          locale={{ emptyText: '暂无关联参数' }}
        />
      </div>
    </Drawer>
  );
};

export default ParamBindDrawer;
