/**
 * 活动消息配置：流程下名称/编码唯一
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { uid, type MessageConfig, type ProcessActivity, type ProcessConfig } from '../data';

interface Props {
  open: boolean;
  process: ProcessConfig;
  activity: ProcessActivity;
  onClose: () => void;
  onChange: (messages: MessageConfig[]) => void;
}

const MessageConfigDrawer: React.FC<Props> = ({
  open,
  process,
  activity,
  onClose,
  onChange,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MessageConfig | null>(null);
  const [form] = Form.useForm();
  const ledEnabled = Form.useWatch('ledEnabled', form);
  const voiceEnabled = Form.useWatch('voiceEnabled', form);

  const messages = activity.messages;

  /** 流程下全部消息（跨活动） */
  const allProcessMessages = useMemo(
    () => process.activities.flatMap((a) => a.messages),
    [process.activities],
  );

  useEffect(() => {
    if (!formOpen) return;
    if (editing) {
      form.setFieldsValue(editing);
    } else {
      form.resetFields();
      form.setFieldsValue({ ledEnabled: false, voiceEnabled: false });
    }
  }, [formOpen, editing, form]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: MessageConfig) => {
    setEditing(row);
    setFormOpen(true);
  };

  const remove = (id: string) => {
    onChange(messages.filter((m) => m.id !== id));
    message.success('已删除消息配置');
  };

  const submit = async () => {
    const values = await form.validateFields();
    const name = String(values.name).trim();
    const code = String(values.code).trim();

    const conflictName = allProcessMessages.some(
      (m) => m.name === name && m.id !== editing?.id,
    );
    const conflictCode = allProcessMessages.some(
      (m) => m.code === code && m.id !== editing?.id,
    );
    if (conflictName) {
      form.setFields([{ name: 'name', errors: ['消息名称在流程下已存在'] }]);
      return;
    }
    if (conflictCode) {
      form.setFields([{ name: 'code', errors: ['消息编码在流程下已存在'] }]);
      return;
    }

    const payload: MessageConfig = {
      id: editing?.id ?? uid('msg'),
      activityId: activity.id,
      name,
      code,
      ledEnabled: !!values.ledEnabled,
      ledTemplate: values.ledEnabled ? String(values.ledTemplate || '').trim() : '',
      voiceEnabled: !!values.voiceEnabled,
      voiceTemplate: values.voiceEnabled ? String(values.voiceTemplate || '').trim() : '',
      remark: values.remark?.trim(),
    };

    if (editing) {
      onChange(messages.map((m) => (m.id === editing.id ? payload : m)));
      message.success('消息已更新');
    } else {
      onChange([...messages, payload]);
      message.success('消息已新增');
    }
    setFormOpen(false);
  };

  const columns: ColumnsType<MessageConfig> = [
    { title: '消息名称', dataIndex: 'name', width: 140 },
    { title: '编码', dataIndex: 'code', width: 140 },
    {
      title: 'LED',
      width: 70,
      render: (_, r) => (r.ledEnabled ? '启用' : '关闭'),
    },
    {
      title: '语音',
      width: 70,
      render: (_, r) => (r.voiceEnabled ? '启用' : '关闭'),
    },
    { title: '说明', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作',
      width: 120,
      render: (_, row) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该消息？" onConfirm={() => remove(row.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Drawer
        title={`消息配置 · ${activity.name}`}
        open={open}
        onClose={onClose}
        width={720}
        destroyOnHidden
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增消息
          </Button>
        }
      >
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={messages}
          locale={{ emptyText: '暂无消息配置' }}
        />
      </Drawer>

      <Modal
        title={editing ? '编辑消息' : '新增消息'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={submit}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical" requiredMark>
          <Form.Item
            name="name"
            label="消息名称"
            rules={[{ required: true, message: '请输入消息名称' }]}
          >
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item
            name="code"
            label="消息编码"
            rules={[{ required: true, message: '请输入消息编码' }]}
          >
            <Input maxLength={40} placeholder="流程下唯一" />
          </Form.Item>
          <Form.Item name="ledEnabled" label="LED 是否启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="关闭" />
          </Form.Item>
          <Form.Item name="ledTemplate" label="LED 默认模板">
            <Input.TextArea rows={2} disabled={!ledEnabled} placeholder="启用 LED 后填写模板" />
          </Form.Item>
          <Form.Item name="voiceEnabled" label="语音是否启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="关闭" />
          </Form.Item>
          <Form.Item name="voiceTemplate" label="语音默认模板">
            <Input.TextArea rows={2} disabled={!voiceEnabled} placeholder="启用语音后填写模板" />
          </Form.Item>
          <Form.Item name="remark" label="说明">
            <Input.TextArea rows={2} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default MessageConfigDrawer;
