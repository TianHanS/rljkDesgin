/**
 * 服务管理：启用/停用、流程包上传更新、端口配置
 */
import React, { useEffect, useState } from 'react';
import { Button, Drawer, Form, InputNumber, Space, Switch, Tag, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { formatStamp, type ModuleAutoConfig } from '../data';

interface Props {
  open: boolean;
  config: ModuleAutoConfig | null;
  moduleName?: string;
  onClose: () => void;
  onSave: (patch: Partial<ModuleAutoConfig>) => void;
}

const ServiceManageDrawer: React.FC<Props> = ({ open, config, moduleName, onClose, onSave }) => {
  const [running, setRunning] = useState(false);
  const [port, setPort] = useState(9000);
  const [version, setVersion] = useState('');
  const [uploadedAt, setUploadedAt] = useState('');

  useEffect(() => {
    if (!open || !config) return;
    setRunning(config.serviceStatus === 'running');
    setPort(config.servicePort);
    setVersion(config.packageVersion);
    setUploadedAt(config.packageUploadedAt);
  }, [open, config]);

  if (!config) return null;

  const fakeUpload = () => {
    const next = `v1.${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 9)}`;
    setVersion(next);
    setUploadedAt(formatStamp());
    message.success(`流程包已${config.packageVersion ? '更新' : '上传'}：${next}`);
  };

  return (
    <Drawer
      title={`服务管理 · ${moduleName || ''}`}
      open={open}
      onClose={onClose}
      width={480}
      destroyOnHidden
      footer={
        <Space style={{ float: 'right' }}>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            onClick={() => {
              onSave({
                serviceStatus: running ? 'running' : 'stopped',
                servicePort: port,
                packageVersion: version,
                packageUploadedAt: uploadedAt,
              });
            }}
          >
            保存
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item label="服务状态">
          <Space>
            <Switch
              checked={running}
              checkedChildren="启用"
              unCheckedChildren="停用"
              onChange={setRunning}
            />
            <Tag color={running ? 'success' : 'default'}>{running ? '运行中' : '已停用'}</Tag>
          </Space>
        </Form.Item>

        <Form.Item label="流程包">
          <div className="apc-package-box">
            <div>
              <div className="apc-pkg-row">
                <span className="apc-muted">当前版本</span>
                <strong>{version || '—'}</strong>
              </div>
              <div className="apc-pkg-row">
                <span className="apc-muted">上传时间</span>
                <span>{uploadedAt || '—'}</span>
              </div>
            </div>
            <Upload
              beforeUpload={() => {
                fakeUpload();
                return false;
              }}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>{version ? '更新流程包' : '上传流程包'}</Button>
            </Upload>
          </div>
        </Form.Item>

        <Form.Item label="服务端口" required>
          <InputNumber
            min={1024}
            max={65535}
            value={port}
            onChange={(v) => setPort(Number(v) || 9000)}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default ServiceManageDrawer;
