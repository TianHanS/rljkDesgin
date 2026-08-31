/**
 * 新建 / 编辑流程配置抽屉
 */
import React, { useEffect, useState } from 'react';
import { Button, Drawer, Form, Input, Space, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import ModuleTypeModal from './ModuleTypeModal';
import { findModuleType, type ProcessConfig } from '../data';

interface Props {
  open: boolean;
  editing: ProcessConfig | null;
  processes: ProcessConfig[];
  onClose: () => void;
  onSave: (payload: { moduleTypeId: string; name: string; remark?: string }) => void;
}

const ProcessFormDrawer: React.FC<Props> = ({ open, editing, processes, onClose, onSave }) => {
  const [form] = Form.useForm();
  const [moduleTypeId, setModuleTypeId] = useState<string>();
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const isEdit = !!editing;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const name = findModuleType(editing.moduleTypeId)?.name ?? '';
      setModuleTypeId(editing.moduleTypeId);
      form.setFieldsValue({
        moduleTypeName: name,
        name: editing.name,
        remark: editing.remark,
      });
    } else {
      setModuleTypeId(undefined);
      form.resetFields();
    }
  }, [open, editing, form]);

  const usedIds = processes
    .filter((p) => !editing || p.id !== editing.id)
    .map((p) => p.moduleTypeId);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      if (!moduleTypeId) {
        message.error('请选择模块类型');
        return;
      }
      const name = String(values.name).trim();
      if (
        processes.some(
          (p) => p.name === name && (!editing || p.id !== editing.id),
        )
      ) {
        message.error('流程名称已存在');
        return;
      }
      if (!isEdit && usedIds.includes(moduleTypeId)) {
        message.error('该模块类型已配置流程');
        return;
      }
      onSave({ moduleTypeId, name, remark: values.remark?.trim() });
    } catch {
      /* validate */
    }
  };

  return (
    <>
      <Drawer
        title={isEdit ? '编辑流程配置' : '新建流程配置'}
        open={open}
        onClose={onClose}
        width={480}
        destroyOnHidden
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" onClick={submit}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark>
          <Form.Item
            name="moduleTypeName"
            label="模块类型"
            rules={[{ required: true, message: '请选择模块类型' }]}
          >
            <Input
              readOnly
              placeholder="点击选择模块类型"
              suffix={<SearchOutlined />}
              disabled={isEdit}
              onClick={() => {
                if (!isEdit) setTypeModalOpen(true);
              }}
              style={{ cursor: isEdit ? 'not-allowed' : 'pointer' }}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="流程名称"
            rules={[{ required: true, message: '请输入流程名称' }]}
          >
            <Input maxLength={50} placeholder="请输入流程名称" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} maxLength={200} placeholder="选填" />
          </Form.Item>
        </Form>
      </Drawer>

      <ModuleTypeModal
        open={typeModalOpen}
        usedModuleTypeIds={usedIds}
        onClose={() => setTypeModalOpen(false)}
        onPick={(mt) => {
          setModuleTypeId(mt.id);
          form.setFieldsValue({ moduleTypeName: mt.name });
          setTypeModalOpen(false);
        }}
      />
    </>
  );
};

export default ProcessFormDrawer;
