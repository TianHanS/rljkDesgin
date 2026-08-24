import React, { useState, useMemo } from 'react';
import { Card, Button, Radio, Space, Typography, Tag, Modal, Form, Input, Select, Descriptions, message, Popover, Empty, Divider, Tooltip } from 'antd';
import { InfoCircleOutlined, ExclamationCircleOutlined, EditOutlined, RetweetOutlined, BuildOutlined } from '@ant-design/icons';
import './style.css';

/**
 * @name 存煤结构管理
 */

const { Title, Text } = Typography;

// Mock Data Types
interface CoalLayer {
  id: string;
  batch: string;
  ship: string;
  voyage: string;
  coalType: string;
  calorificValue: number; // 热值
  sulfur: number; // 硫分
  ash: number; // 灰分
  volatile: number; // 挥发分
  moisture: number; // 水分
  volume: number; // 体积
  mass: number; // 煤量
  color: string;
  status: 'normal' | 'unidentified';
}

interface Partition {
  id: string;
  name: string;
  maxVolume: number;
  layers: CoalLayer[];
}

const INITIAL_DATA: Partition[] = [
  {
    id: '1A',
    name: '1A 分区',
    maxVolume: 10000,
    layers: [
      { id: 'l1', batch: 'B20231001', ship: '神华1号', voyage: 'V001', coalType: '神混1', calorificValue: 5500, sulfur: 0.5, ash: 10, volatile: 28, moisture: 8, volume: 4000, mass: 3600, color: '#1677ff', status: 'normal' },
      { id: 'l2', batch: 'B20231002', ship: '伊泰2号', voyage: 'V002', coalType: '伊泰煤', calorificValue: 5000, sulfur: 0.8, ash: 12, volatile: 30, moisture: 10, volume: 3000, mass: 2700, color: '#52c41a', status: 'normal' },
    ]
  },
  {
    id: '1B',
    name: '1B 分区',
    maxVolume: 12000,
    layers: [
      { id: 'l3', batch: 'B20231001', ship: '神华1号', voyage: 'V001', coalType: '神混1', calorificValue: 5500, sulfur: 0.5, ash: 10, volatile: 28, moisture: 8, volume: 6000, mass: 5400, color: '#1677ff', status: 'normal' },
      { id: 'l4', batch: '未识别批次', ship: '未知', voyage: '未知', coalType: '未知', calorificValue: 0, sulfur: 0, ash: 0, volatile: 0, moisture: 0, volume: 2000, mass: 1800, color: '#ff4d4f', status: 'unidentified' },
    ]
  },
  {
    id: '2A',
    name: '2A 分区',
    maxVolume: 15000,
    layers: [
      { id: 'l5', batch: 'B20231003', ship: '大友3号', voyage: 'V003', coalType: '准格尔煤', calorificValue: 4800, sulfur: 1.0, ash: 15, volatile: 35, moisture: 12, volume: 8000, mass: 7200, color: '#faad14', status: 'normal' },
    ]
  },
  {
    id: '2B',
    name: '2B 分区 (空)',
    maxVolume: 10000,
    layers: []
  }
];

export default function CoalStorageStructure() {
  const [partitions, setPartitions] = useState<Partition[]>(INITIAL_DATA);
  const [displayField, setDisplayField] = useState<keyof CoalLayer>('batch');
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<{partitionId: string, layer: CoalLayer} | null>(null);
  const [form] = Form.useForm();

  // Handle Layer Click
  const handleLayerClick = (partitionId: string, layer: CoalLayer) => {
    setSelectedLayer({ partitionId, layer });
    if (layer.status === 'unidentified') {
      form.setFieldsValue({
        batch: '',
        coalType: undefined,
        ship: ''
      });
    } else {
      form.setFieldsValue(layer);
    }
    setIsModalVisible(true);
  };

  // Handle Modal Submit
  const handleModalSubmit = () => {
    form.validateFields().then(values => {
      if (selectedLayer) {
        const newPartitions = partitions.map(p => {
          if (p.id === selectedLayer.partitionId) {
            return {
              ...p,
              layers: p.layers.map(l => {
                if (l.id === selectedLayer.layer.id) {
                  return {
                    ...l,
                    ...values,
                    status: 'normal',
                    color: l.status === 'unidentified' ? '#722ed1' : l.color, // assign new color if it was unidentified
                  };
                }
                return l;
              })
            };
          }
          return p;
        });
        setPartitions(newPartitions);
        setIsModalVisible(false);
        message.success('煤层信息更新成功');
      }
    });
  };

  // Simulate Inventory Update (盘煤比对)
  const simulateInventoryUpdate = () => {
    const newPartitions = [...partitions];
    // Add a new unidentified layer to 2B
    const targetPartition = newPartitions.find(p => p.id === '2B');
    if (targetPartition) {
      targetPartition.layers.push({
        id: `l_${Date.now()}`,
        batch: '新增未识别',
        ship: '未知',
        voyage: '未知',
        coalType: '未知',
        calorificValue: 0,
        sulfur: 0,
        ash: 0,
        volatile: 0,
        moisture: 0,
        volume: 3000,
        mass: 2700,
        color: '#ff4d4f',
        status: 'unidentified'
      });
    }
    setPartitions(newPartitions);
    message.warning('盘煤结束：发现 2B 分区体积增加，已生成未识别煤层，请手动标记。');
  };

  // Render Display Value based on selection
  const renderDisplayValue = (layer: CoalLayer) => {
    const val = layer[displayField];
    if (displayField === 'calorificValue' || displayField === 'volume' || displayField === 'mass') {
       return `${val}`;
    }
    if (['sulfur', 'ash', 'volatile', 'moisture'].includes(displayField as string)) {
       return `${val}%`;
    }
    return val;
  };

  const displayFieldOptions = [
    { label: '批次', value: 'batch' },
    { label: '船名', value: 'ship' },
    { label: '煤种', value: 'coalType' },
    { label: '热值', value: 'calorificValue' },
    { label: '硫分', value: 'sulfur' },
    { label: '体积', value: 'volume' },
  ];

  return (
    <div className="p-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={4} className="!mb-1">存煤结构管理</Title>
          <Text type="secondary">可视化煤场存煤分布，按分区、分层管理煤堆体积与批次</Text>
        </div>
        <Space>
          <Button icon={<RetweetOutlined />} onClick={simulateInventoryUpdate}>模拟盘煤更新</Button>
          <Button type="primary" icon={<BuildOutlined />}>厂外煤场手动维护</Button>
        </Space>
      </div>

      <Card className="mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Space align="center">
            <Text strong>显示参数切换：</Text>
            <Radio.Group 
              optionType="button" 
              buttonStyle="solid"
              value={displayField}
              onChange={e => setDisplayField(e.target.value)}
              options={displayFieldOptions}
            />
          </Space>
          <Space>
            <Tag color="#1677ff">神混1</Tag>
            <Tag color="#52c41a">伊泰煤</Tag>
            <Tag color="#faad14">准格尔煤</Tag>
            <Tag color="#ff4d4f" icon={<ExclamationCircleOutlined />}>未识别异常</Tag>
          </Space>
        </div>

        {/* 煤场可视化区域 */}
        <div className="flex items-end space-x-4 h-[400px] border-b-2 border-gray-300 pb-2 overflow-x-auto relative bg-white bg-[linear-gradient(#f0f0f0_1px,transparent_1px)] bg-[size:100%_40px]">
          
          {/* Y轴刻度示意 */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-400 py-2 border-r border-gray-200 bg-white z-10 items-end pr-2">
            <span>15k</span>
            <span>12k</span>
            <span>9k</span>
            <span>6k</span>
            <span>3k</span>
            <span>0</span>
          </div>

          <div className="pl-16 flex items-end space-x-6 w-full h-full">
            {partitions.map(partition => {
              const currentTotalVolume = partition.layers.reduce((sum, l) => sum + l.volume, 0);
              // Max scale for visualization height (e.g. 15000 = 100%)
              const visualScale = 15000; 

              return (
                <div key={partition.id} className="flex flex-col items-center flex-shrink-0">
                  <div 
                    className="w-32 bg-gray-100 border-l border-r border-t border-gray-300 rounded-t-sm relative flex flex-col justify-end overflow-hidden group cursor-pointer transition-all hover:shadow-md"
                    style={{ height: `${(partition.maxVolume / visualScale) * 350}px` }}
                  >
                    {/* 背景网格线/标尺区 */}
                    <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50/50 flex items-start justify-center pt-2">
                       <Text type="secondary" className="text-xs">上限: {partition.maxVolume}</Text>
                    </div>

                    {/* 煤层区块 (自下而上堆叠，flex-col-reverse) */}
                    <div className="z-10 flex flex-col-reverse w-full relative">
                      {partition.layers.map((layer, index) => {
                        const layerHeight = `${(layer.volume / partition.maxVolume) * 100}%`;
                        const isUnidentified = layer.status === 'unidentified';
                        
                        return (
                          <Tooltip 
                            key={layer.id} 
                            title={`批次: ${layer.batch} | 体积: ${layer.volume} | 煤量: ${layer.mass}t`}
                            placement="right"
                          >
                            <div 
                              onClick={() => handleLayerClick(partition.id, layer)}
                              className={`w-full flex items-center justify-center border-b border-white/20 transition-all hover:brightness-110 relative overflow-hidden`}
                              style={{ 
                                height: layerHeight,
                                backgroundColor: layer.color,
                                // 如果是未识别，加斜纹背景
                                backgroundImage: isUnidentified ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px)' : 'none'
                              }}
                            >
                                <span className={`text-xs font-medium px-1 truncate w-full text-center ${isUnidentified ? 'text-white' : 'text-white drop-shadow-md'}`}>
                                  {isUnidentified && <ExclamationCircleOutlined className="mr-1"/>}
                                  {renderDisplayValue(layer)}
                                </span>
                            </div>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <Text strong className="block">{partition.name}</Text>
                    <Text type="secondary" className="text-xs">{currentTotalVolume} / {partition.maxVolume} m³</Text>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 煤层详情与配置弹窗 */}
      <Modal
        title={selectedLayer?.layer.status === 'unidentified' ? "标记异常煤层" : "煤层详情与调整"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleModalSubmit}
        okText="保存配置"
        width={600}
        destroyOnClose
      >
        {selectedLayer && (
          <div className="pt-4">
            <Descriptions bordered size="small" column={2} className="mb-6">
              <Descriptions.Item label="所属分区">{partitions.find(p => p.id === selectedLayer.partitionId)?.name}</Descriptions.Item>
              <Descriptions.Item label="体积 / 估算煤量">
                <Text type="danger" strong>{selectedLayer.layer.volume} m³</Text> / {selectedLayer.layer.mass} t
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">属性配置</Divider>
            
            <Form form={form} layout="vertical">
              <div className="grid grid-cols-2 gap-4">
                <Form.Item label="入库批次" name="batch" rules={[{ required: true, message: '请输入批次' }]}>
                  <Input placeholder="输入批次号，如 B20231015" />
                </Form.Item>
                <Form.Item label="燃煤煤种" name="coalType" rules={[{ required: true, message: '请选择煤种' }]}>
                  <Select placeholder="选择煤种">
                    <Select.Option value="神混1">神混1</Select.Option>
                    <Select.Option value="伊泰煤">伊泰煤</Select.Option>
                    <Select.Option value="准格尔煤">准格尔煤</Select.Option>
                    <Select.Option value="印尼煤">印尼煤</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="运输船名" name="ship">
                  <Input placeholder="输入船名" />
                </Form.Item>
                <Form.Item label="热值 (kcal/kg)" name="calorificValue">
                  <Input type="number" suffix="kcal" />
                </Form.Item>
              </div>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
