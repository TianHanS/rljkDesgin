/**
 * 活动新增 / 编辑
 */
import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Switch } from 'antd';
import type { ProcessActivity } from '../data';

interface Props {
  open: boolean;
  editing: ProcessActivity | null;
  defaultSeq: number;
  activities: ProcessActivity[];
  onClose: () => void;
  onSave: (payload: {
    code: string;
    name: string;
    seq: number;
    enabled: boolean;
    remark?: string;
  }) => void;
}

const ActivityFormModal: React.FC<Props> = ({
  open,
  editing,
  defaultSeq,
  activities,
  onClose,
  onSave,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        code: editing.code,
        name: editing.name,
        seq: editing.seq,
        enabled: editing.enabled,
        remark: editing.remark,
      });
    } else {
      form.setFieldsValue({
        code: undefined,
        name: undefined,
        seq: defaultSeq,
        enabled: false,
        remark: undefined,
      });
    }
  }, [open, editing, defaultSeq, form]);

  const submit = async () => {
    const values = await form.validateFields();
    const code = String(values.code).trim();
    const name = String(values.name).trim();
    const seq = Number(values.seq);

    if (activities.some((a) => a.code === code && a.id !== editing?.id)) {
      form.setFields([{ name: 'code', errors: ['活动编码已存在'] }]);
      return;
    }
    if (activities.some((a) => a.name === name && a.id !== editing?.id)) {
      form.setFields([{ name: 'name', errors: ['活动名称已存在'] }]);
      return;
    }
    if (activities.some((a) => a.seq === seq && a.id !== editing?.id)) {
      form.setFields([{ name: 'seq', errors: ['序号已存在'] }]);
      return;
    }

    onSave({
      code,
      name,
      seq,
      enabled: !!values.enabled,
      remark: values.remark?.trim(),
    });
  };

  return (
    <Modal
      title={editing ? '编辑活动' : '新增活动'}
      open={open}
      onCancel={onClose}
      onOk={submit}
      destroyOnHidden
      width={480}
    >
      <Form form={form} layout="vertical" requiredMark>
        <Form.Item
          name="code"
          label="活动编码"
          rules={[{ required: true, message: '请输入活动编码' }]}
        >
          <Input placeholder="如 ENTRY_SCAN" maxLength={40} />
        </Form.Item>
        <Form.Item
          name="name"
          label="活动名称"
          rules={[{ required: true, message: '请输入活动名称' }]}
        >
          <Input placeholder="请输入活动名称" maxLength={40} />
        </Form.Item>
        <Form.Item name="seq" label="序号" rules={[{ required: true, message: '请输入序号' }]}>
          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="enabled" label="活动状态" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
        <Form.Item name="remark" label="说明">
          <Input.TextArea rows={2} maxLength={200} placeholder="选填" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ActivityFormModal;
