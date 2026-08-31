/**
 * 模块类型选择弹窗：已配置类型置灰不可选
 */
import React, { useState } from 'react';
import { Modal, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { MODULE_TYPES, type ModuleType } from '../data';

interface Props {
  open: boolean;
  usedModuleTypeIds: string[];
  onClose: () => void;
  onPick: (mt: ModuleType) => void;
}

const ModuleTypeModal: React.FC<Props> = ({ open, usedModuleTypeIds, onClose, onPick }) => {
  const [picked, setPicked] = useState<string>();

  const columns: ColumnsType<ModuleType> = [
    {
      title: '选择',
      width: 64,
      render: (_, row) => {
        const used = usedModuleTypeIds.includes(row.id);
        return (
          <input
            type="radio"
            name="module-type"
            disabled={used}
            checked={picked === row.id}
            onChange={() => setPicked(row.id)}
          />
        );
      },
    },
    { title: '类型编码', dataIndex: 'code', width: 120 },
    { title: '类型名称', dataIndex: 'name', width: 160 },
    {
      title: '状态',
      width: 100,
      render: (_, row) =>
        usedModuleTypeIds.includes(row.id) ? (
          <Tag>已配置</Tag>
        ) : (
          <Tag color="success">可选</Tag>
        ),
    },
  ];

  return (
    <Modal
      title="选择模块类型"
      open={open}
      onCancel={onClose}
      okText="确定"
      okButtonProps={{ disabled: !picked }}
      onOk={() => {
        const mt = MODULE_TYPES.find((m) => m.id === picked);
        if (mt) onPick(mt);
      }}
      destroyOnHidden
      afterOpenChange={(v) => {
        if (!v) setPicked(undefined);
      }}
      width={560}
    >
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={MODULE_TYPES}
        rowClassName={(row) => (usedModuleTypeIds.includes(row.id) ? 'apm-row-disabled' : '')}
        onRow={(row) => ({
          onClick: () => {
            if (!usedModuleTypeIds.includes(row.id)) setPicked(row.id);
          },
          style: {
            cursor: usedModuleTypeIds.includes(row.id) ? 'not-allowed' : 'pointer',
            opacity: usedModuleTypeIds.includes(row.id) ? 0.45 : 1,
          },
        })}
      />
    </Modal>
  );
};

export default ModuleTypeModal;
