/**
 * 选择配置模块：按类型/名称筛选；已配置模块置灰
 */
import React, { useMemo, useState } from 'react';
import { Button, Drawer, Input, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BIZ_MODULES,
  MODULE_TYPES,
  findModuleType,
  type BizModule,
} from '../data';

interface Props {
  open: boolean;
  usedModuleIds: string[];
  onClose: () => void;
  onPick: (mod: BizModule) => void;
}

const ModuleSelectDrawer: React.FC<Props> = ({ open, usedModuleIds, onClose, onPick }) => {
  const [typeId, setTypeId] = useState<string>();
  const [keyword, setKeyword] = useState('');
  const [picked, setPicked] = useState<string>();

  const data = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return BIZ_MODULES.filter((m) => {
      if (typeId && m.moduleTypeId !== typeId) return false;
      if (key && !m.name.toLowerCase().includes(key)) return false;
      return true;
    });
  }, [typeId, keyword]);

  const columns: ColumnsType<BizModule> = [
    {
      title: '',
      width: 48,
      render: (_, row) => {
        const used = usedModuleIds.includes(row.id);
        return (
          <input
            type="radio"
            name="biz-mod"
            disabled={used}
            checked={picked === row.id}
            onChange={() => setPicked(row.id)}
          />
        );
      },
    },
    { title: '模块名称', dataIndex: 'name', width: 180 },
    {
      title: '模块类型',
      width: 140,
      render: (_, row) => {
        const t = findModuleType(row.moduleTypeId);
        return t ? (
          <Space size={4}>
            <Tag>{t.code}</Tag>
            {t.name}
          </Space>
        ) : (
          '—'
        );
      },
    },
    {
      title: '状态',
      width: 90,
      render: (_, row) =>
        usedModuleIds.includes(row.id) ? <Tag>已配置</Tag> : <Tag color="success">可选</Tag>,
    },
  ];

  return (
    <Drawer
      title="选择配置模块"
      open={open}
      onClose={onClose}
      width={640}
      destroyOnHidden
      afterOpenChange={(v) => {
        if (!v) {
          setPicked(undefined);
          setTypeId(undefined);
          setKeyword('');
        }
      }}
      footer={
        <Space style={{ float: 'right' }}>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            disabled={!picked}
            onClick={() => {
              const m = BIZ_MODULES.find((x) => x.id === picked);
              if (m) onPick(m);
            }}
          >
            确定
          </Button>
        </Space>
      }
    >
      <Space style={{ marginBottom: 12 }} wrap>
        <Select
          allowClear
          placeholder="模块类型"
          style={{ width: 160 }}
          value={typeId}
          options={MODULE_TYPES.map((t) => ({ value: t.id, label: t.name }))}
          onChange={setTypeId}
        />
        <Input
          allowClear
          placeholder="按模块名称搜索"
          style={{ width: 200 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </Space>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={data}
        onRow={(row) => ({
          onClick: () => {
            if (!usedModuleIds.includes(row.id)) setPicked(row.id);
          },
          style: {
            cursor: usedModuleIds.includes(row.id) ? 'not-allowed' : 'pointer',
            opacity: usedModuleIds.includes(row.id) ? 0.45 : 1,
          },
        })}
      />
    </Drawer>
  );
};

export default ModuleSelectDrawer;
