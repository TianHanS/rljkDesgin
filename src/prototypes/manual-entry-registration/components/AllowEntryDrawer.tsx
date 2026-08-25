/**
 * 人工允许入厂：按车牌查询预入厂信息，将禁止入厂更新为允许入厂。
 */
import React, { useState } from 'react';
import { Alert, Button, Descriptions, Drawer, Input, Space, Tag, message } from 'antd';
import { findPlan, findPreEntry, type PreEntryVehicle } from '../data';

interface Props {
  open: boolean;
  vehicles: PreEntryVehicle[];
  onClose: () => void;
  onAllow: (plate: string) => void;
  onFill: (plate: string) => void;
}

const AllowEntryDrawer: React.FC<Props> = ({ open, vehicles, onClose, onAllow, onFill }) => {
  const [plate, setPlate] = useState('');
  const [hit, setHit] = useState<PreEntryVehicle | null | undefined>(undefined);

  const query = () => {
    const key = plate.trim().toUpperCase();
    if (!key) {
      message.warning('请输入车牌号码');
      return;
    }
    const found = vehicles.find((v) => v.plate.replace(/\s/g, '') === key.replace(/\s/g, ''))
      ?? findPreEntry(key)
      ?? null;
    setHit(found);
    if (!found) message.info('未查到该车预入厂信息');
  };

  const plan = hit ? findPlan(hit.planId) : undefined;

  return (
    <Drawer
      title="人工允许入厂"
      open={open}
      onClose={onClose}
      width={520}
      destroyOnHidden
      afterOpenChange={(v) => {
        if (!v) {
          setPlate('');
          setHit(undefined);
        }
      }}
    >
      <p className="mer-scan-hint">
        部分车辆完成预入厂后仍为「禁止入厂登记」。录入车牌查询预入厂信息，确认后更新为允许入厂，再办理入厂登记。
      </p>
      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <Input
          placeholder="请输入车牌，如 蒙A90005"
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          onPressEnter={query}
        />
        <Button type="primary" onClick={query}>
          查询预入厂
        </Button>
      </Space.Compact>

      {hit === null ? <Alert type="warning" showIcon message="该车牌无预入厂记录" /> : null}

      {hit ? (
        <div className="mer-permit">
          <Alert
            type={hit.permit === 'allowed' ? 'success' : 'error'}
            showIcon
            message={hit.permit === 'allowed' ? '当前允许入厂登记' : '当前禁止入厂登记'}
            description={
              hit.permit === 'forbidden'
                ? '需人工确认后更新为允许入厂，否则无法提交入厂登记。'
                : '可直接填入登记表单并确认登记。'
            }
          />
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="车牌">{hit.plate}</Descriptions.Item>
            <Descriptions.Item label="许可">
              <Tag color={hit.permit === 'allowed' ? 'success' : 'error'}>
                {hit.permit === 'allowed' ? '允许入厂' : '禁止入厂登记'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="预入厂时间">{hit.preEntryAt}</Descriptions.Item>
            <Descriptions.Item label="供应商">{plan?.supplier ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="矿点">{plan?.mine ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="煤种">{plan?.coalType ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="矿发净重 t">{plan?.net ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="车辆卡号">{hit.vehicleCard || '—'}</Descriptions.Item>
          </Descriptions>
          <Space>
            {hit.permit === 'forbidden' ? (
              <Button
                type="primary"
                onClick={() => {
                  onAllow(hit.plate);
                  setHit({ ...hit, permit: 'allowed' });
                }}
              >
                更新为允许入厂
              </Button>
            ) : (
              <Button type="primary" onClick={() => onFill(hit.plate)}>
                填入登记表单
              </Button>
            )}
          </Space>
        </div>
      ) : null}
    </Drawer>
  );
};

export default AllowEntryDrawer;
