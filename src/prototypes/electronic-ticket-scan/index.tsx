/**
 * @name 电子磅单司机扫描
 */
import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Button, Descriptions, Table, Modal, QRCode, Space, Typography, Tag, message } from 'antd';
import { QrCode, Search, Save, Eye, MapPin } from 'lucide-react';
import './style.css';

const { Title, Text } = Typography;
const { Option } = Select;

// --- Mock Data ---
const LOCATIONS_LIGHT_SCALE = ['1号轻衡', '2号轻衡', '3号轻衡'];
const LOCATIONS_EXIT = ['北门出厂点', '东门出厂点', '南门出厂点'];

const MOCK_TICKETS = [
  {
    id: '25080400088',
    plate: '豫E06655D',
    entryTime: '2025/8/4 13:09:55',
    coalType: '原煤',
    mine: '邯郸某祥(贫瘦)',
    grossWeight: 53.45,
    tareWeight: 16.64,
    netWeight: 36.81,
    deductRock: 0.5,
    deductImpurity: 0.2,
    deductWater: 1.1,
    shipper: '山西能源发运一部',
    position: '1号轻衡',
    status: '已过轻',
    updateTime: '2025/8/4 13:15:22'
  },
  {
    id: '25080400087',
    plate: '晋A88992',
    entryTime: '2025/8/4 12:45:10',
    coalType: '精煤',
    mine: '大同焦煤集团',
    grossWeight: 48.20,
    tareWeight: 15.10,
    netWeight: 33.10,
    deductRock: 0.0,
    deductImpurity: 0.0,
    deductWater: 0.8,
    shipper: '山西焦煤',
    position: '北门出厂点',
    status: '已出厂',
    updateTime: '2025/8/4 13:00:15'
  },
  {
    id: '25080400086',
    plate: '冀D7721A',
    entryTime: '2025/8/4 12:30:05',
    coalType: '原煤',
    mine: '邯郸某祥(贫瘦)',
    grossWeight: 55.10,
    tareWeight: 17.00,
    netWeight: 38.10,
    deductRock: 0.8,
    deductImpurity: 0.3,
    deductWater: 1.5,
    shipper: '河北物流',
    position: '2号轻衡',
    status: '已过轻',
    updateTime: '2025/8/4 12:55:40'
  }
];

const Component = () => {
  const [form] = Form.useForm();
  const [config, setConfig] = useState({ scale: undefined, exit: undefined });
  const [latestTicket, setLatestTicket] = useState(MOCK_TICKETS[0]);
  const [recordList, setRecordList] = useState(MOCK_TICKETS);
  
  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalTicket, setModalTicket] = useState<any>(null);

  // Handle save configuration
  const handleSaveConfig = () => {
    const values = form.getFieldsValue();
    setConfig({ scale: values.scale, exit: values.exit });
    
    // Filter logic simulation
    let filtered = [...MOCK_TICKETS];
    if (values.scale) filtered = filtered.filter(t => t.position === values.scale);
    else if (values.exit) filtered = filtered.filter(t => t.position === values.exit);
    
    setRecordList(filtered);
    if (filtered.length > 0) {
      setLatestTicket(filtered[0]);
    } else {
      setLatestTicket(null as any);
    }
    
    message.success('终端位置配置已保存，实时数据已更新');
  };

  const handleViewTicket = (record: any) => {
    setModalTicket(record);
    setIsModalVisible(true);
  };

  const columns = [
    { title: '序号', dataIndex: 'index', key: 'index', render: (_: any, __: any, idx: number) => idx + 1, width: 60 },
    { title: '流水号', dataIndex: 'id', key: 'id', width: 120 },
    { title: '车牌号', dataIndex: 'plate', key: 'plate', width: 100 },
    { title: '供应商矿点', dataIndex: 'mine', key: 'mine', ellipsis: true },
    { title: '煤种', dataIndex: 'coalType', key: 'coalType', width: 80 },
    { title: '入厂时间', dataIndex: 'entryTime', key: 'entryTime', width: 150 },
    { title: '毛重(t)', dataIndex: 'grossWeight', key: 'grossWeight', width: 80, align: 'right' as const },
    { title: '皮重(t)', dataIndex: 'tareWeight', key: 'tareWeight', width: 80, align: 'right' as const },
    { 
      title: '净重(t)', 
      dataIndex: 'netWeight', 
      key: 'netWeight', 
      width: 90, 
      align: 'right' as const,
      render: (val: number) => <span className="font-bold text-blue-600">{val.toFixed(2)}</span>
    },
    { 
      title: '扣吨(t)', 
      key: 'deductTotal', 
      width: 80,
      align: 'right' as const,
      render: (_: any, record: any) => (record.deductRock + record.deductImpurity + record.deductWater).toFixed(2)
    },
    { title: '过衡位', dataIndex: 'position', key: 'position', width: 100 },
    { 
      title: '在厂状态', 
      dataIndex: 'status', 
      key: 'status', 
      width: 100,
      render: (status: string) => {
        let color = 'default';
        if (status === '已过轻') color = 'processing';
        if (status === '已出厂') color = 'success';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button type="link" size="small" icon={<Eye size={14} />} onClick={() => handleViewTicket(record)}>
          查看磅单
        </Button>
      )
    }
  ];

  const TicketInfoDisplay = ({ ticket, showTitle = true }: { ticket: any, showTitle?: boolean }) => {
    if (!ticket) return <div className="p-8 text-center text-gray-400">暂无当前位置的磅单信息</div>;
    
    return (
      <div className="flex flex-col h-full">
        {showTitle && (
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
            <Space>
              <Text type="secondary">更新时间：</Text>
              <Text strong>{ticket.updateTime}</Text>
            </Space>
            <Tag color="blue" icon={<MapPin size={12} className="mr-1 inline" />}>
              {ticket.position}
            </Tag>
          </div>
        )}
        
        <Descriptions bordered size="middle" column={{ xxl: 3, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} className="flex-1 bg-white">
          <Descriptions.Item label="流水号" span={1}>{ticket.id}</Descriptions.Item>
          <Descriptions.Item label="车牌号" span={1}><Text strong className="text-lg">{ticket.plate}</Text></Descriptions.Item>
          <Descriptions.Item label="入厂时间" span={1}>{ticket.entryTime}</Descriptions.Item>
          
          <Descriptions.Item label="煤种" span={1}>{ticket.coalType}</Descriptions.Item>
          <Descriptions.Item label="供应商/矿点" span={2}>{ticket.mine}</Descriptions.Item>
          <Descriptions.Item label="发货单位" span={3}>{ticket.shipper}</Descriptions.Item>
          
          <Descriptions.Item label="毛重 (t)" span={1}>{ticket.grossWeight.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="皮重 (t)" span={1}>{ticket.tareWeight.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="净重 (t)" span={1}>
            <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded font-bold text-xl inline-block border border-blue-100">
              {ticket.netWeight.toFixed(2)}
            </div>
          </Descriptions.Item>
          
          <Descriptions.Item label="扣研 (t)" span={1}>{ticket.deductRock.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="扣杂 (t)" span={1}>{ticket.deductImpurity.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="扣水 (t)" span={1}>{ticket.deductWater.toFixed(2)}</Descriptions.Item>
        </Descriptions>
      </div>
    );
  };

  const QrCodeDisplay = ({ ticket }: { ticket: any }) => {
    if (!ticket) return <div className="p-8 text-center text-gray-400 h-full flex items-center justify-center border border-dashed border-gray-200 rounded bg-gray-50">暂无二维码</div>;
    
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Title level={4} className="mb-6 flex items-center gap-2">
          <QrCode size={24} className="text-blue-600" />
          司机手机扫码获取磅单
        </Title>
        
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <QRCode 
            value={`ticket://${ticket.id}`} 
            size={240}
            color="#1e293b"
            bordered={false}
          />
        </div>
        
        <Space direction="vertical" align="center" size="small">
          <Text type="secondary" className="text-base">车号: <Text strong className="text-lg text-gray-800">{ticket.plate}</Text></Text>
          <Text type="secondary">更新时间: {ticket.updateTime}</Text>
        </Space>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col gap-4 font-sans text-gray-800">
      
      {/* 顶部位置配置 */}
      <Card className="shadow-sm border-gray-200" bodyStyle={{ padding: '16px 24px' }}>
        <Form form={form} layout="inline" className="flex items-center">
          <Form.Item label="终端位置配置" className="font-medium mr-6 mb-0" />
          
          <Form.Item name="scale" label="汽车轻衡" className="mb-0">
            <Select placeholder="请选择" style={{ width: 160 }} allowClear>
              {LOCATIONS_LIGHT_SCALE.map(loc => <Option key={loc} value={loc}>{loc}</Option>)}
            </Select>
          </Form.Item>
          
          <Form.Item name="exit" label="出厂点" className="mb-0">
            <Select placeholder="请选择" style={{ width: 160 }} allowClear>
              {LOCATIONS_EXIT.map(loc => <Option key={loc} value={loc}>{loc}</Option>)}
            </Select>
          </Form.Item>
          
          <Form.Item className="mb-0 ml-auto mr-0">
            <Button type="primary" icon={<Save size={16} />} onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-500">
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 核心监控区域 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-auto xl:h-[480px]">
        {/* 左侧：车辆计量信息 */}
        <Card 
          title="最新车辆计量信息" 
          className="xl:col-span-2 shadow-sm border-gray-200 flex flex-col"
          headStyle={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
          bodyStyle={{ padding: '24px', flex: 1, overflowY: 'auto' }}
        >
          <TicketInfoDisplay ticket={latestTicket} />
        </Card>

        {/* 右侧：磅单二维码 */}
        <Card 
          title="电子磅单二维码" 
          className="shadow-sm border-gray-200 flex flex-col"
          headStyle={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
          bodyStyle={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          <QrCodeDisplay ticket={latestTicket} />
        </Card>
      </div>

      {/* 底部记录列表 */}
      <Card 
        title="车辆出厂记录" 
        className="flex-1 shadow-sm border-gray-200"
        headStyle={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
        bodyStyle={{ padding: 0 }}
      >
        <Table 
          columns={columns} 
          dataSource={recordList} 
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条记录` }}
          size="middle"
          className="w-full"
        />
      </Card>

      {/* 查看磅单弹窗 */}
      <Modal
        title="磅单详情与二维码"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={900}
        centered
        destroyOnClose
      >
        {modalTicket && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 pt-4">
            <div className="md:col-span-3">
              <TicketInfoDisplay ticket={modalTicket} showTitle={false} />
            </div>
            <div className="md:col-span-2">
              <QrCodeDisplay ticket={modalTicket} />
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Component;