/**
 * 新建 / 编辑模块自动化配置
 */
import React, { useEffect, useState } from 'react';
import { Button, Drawer, Form, Input, Space, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import ModuleSelectDrawer from './ModuleSelectDrawer';
import { findModule, findModuleType, type BizModule, type ModuleAutoConfig } from '../data';

interface Props {
  open: boolean;
  editing: ModuleAutoConfig | null;
  configs: ModuleAutoConfig[];
  onClose: () => void;
  onSave: (moduleId: string) => void;
}

const ConfigFormDrawer: React.FC<Props> = ({ open, editing, configs, onClose, onSave }) => {
  const [form] = Form.useForm();
  const [moduleId, setModuleId] = useState<string>();
  const [pickOpen, setPickOpen] = useState(false);
  const isEdit = !!editing;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const mod = findModule(editing.moduleId);
      const type = mod ? findModuleType(mod.moduleTypeId) : undefined;
      setModuleId(editing.moduleId);
      form.setFieldsValue({
        moduleName: mod?.name,
        moduleTypeName: type ? `${type.code} · ${type.name}` : '',
      });
    } else {
      setModuleId(undefined);
      form.resetFields();
    }
  }, [open, editing, form]);

  const usedIds = configs
    .filter((c) => !editing || c.id !== editing.id)
    .map((c) => c.moduleId);

  const onPick = (mod: BizModule) => {
    const type = findModuleType(mod.moduleTypeId);
    setModuleId(mod.id);
    form.setFieldsValue({
      moduleName: mod.name,
      moduleTypeName: type ? `${type.code} · ${type.name}` : '',
    });
    setPickOpen(false);
  };

  const submit = async () => {
    await form.validateFields();
    if (!moduleId) {
      message.error('请选择配置模块');
      return;
    }
    onSave(moduleId);
  };

  return (
    <>
      <Drawer
        title={isEdit ? '编辑模块配置' : '新建模块配置'}
        open={open}
        onClose={onClose}
        width={460}
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
            name="moduleName"
            label="配置模块"
            rules={[{ required: true, message: '请选择配置模块' }]}
          >
            <Input
              readOnly
              placeholder="点击选择模块"
              suffix={<SearchOutlined />}
              disabled={isEdit}
              onClick={() => {
                if (!isEdit) setPickOpen(true);
              }}
              style={{ cursor: isEdit ? 'not-allowed' : 'pointer' }}
            />
          </Form.Item>
          <Form.Item name="moduleTypeName" label="模块类型">
            <Input readOnly placeholder="选择模块后自动回显" disabled />
          </Form.Item>
          {isEdit && (
            <p className="apc-form-hint">编辑时不可更换模块；流程环节与参数请通过「流程配置」维护。</p>
          )}
        </Form>
      </Drawer>

      <ModuleSelectDrawer
        open={pickOpen}
        usedModuleIds={usedIds}
        onClose={() => setPickOpen(false)}
        onPick={onPick}
      />
    </>
  );
};

export default ConfigFormDrawer;
