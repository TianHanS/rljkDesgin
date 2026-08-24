/**
 * @name 停靠点查询
 * @mode axure
 *
 * 核心功能：
 * 1. 停靠点列表展示
 * 2. 多条件筛选
 * 3. 关联装卸端操作
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /skills/axure-export-workflow/SKILL.md
 */
import React, { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  ConfigProvider,
  theme,
  Space,
  Drawer,
  Form,
  Descriptions,
  message,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  EditOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './style.css';
import { Monitor, Power } from 'lucide-react';

interface TerminalData {
  id: string;
  name: string;
  type: '卸车端（归批）' | '装车端（集样）';
}

interface ParkPointData {
  id: string;
  name: string;
  value: string;
  siteId: string;
  siteName: string;
  terminalId?: string;
  terminalName?: string;
  isChargingPoint: boolean;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  remark: string;
}

// --- Mock Data ---
const mockTerminals: TerminalData[] = [
  { id: 'T001', name: '1号卸车端', type: '卸车端（归批）' },
  { id: 'T002', name: '2号装车端', type: '装车端（集样）' },
  { id: 'T003', name: '3号卸车端', type: '卸车端（归批）' },
];

const initialData: ParkPointData[] = [
  {
    id: 'PP001',
    name: 'A区停靠点1',
    value: 'P-A-01',
    siteId: 'SITE-01',
    siteName: '一号煤场站',
    terminalId: 'T001',
    terminalName: '1号卸车端',
    isChargingPoint: false,
    latitude: 39.901,
    longitude: 116.401,
    createdAt: '2023-10-01 09:00:00',
    updatedAt: '2023-10-02 10:00:00',
    updatedBy: 'admin',
    remark: '主要入口',
  },
  {
    id: 'PP002',
    name: 'B区任务起点',
    value: 'P-B-01',
    siteId: 'SITE-01',
    siteName: '一号煤场站',
    isChargingPoint: true,
    latitude: 39.902,
    longitude: 116.402,
    createdAt: '2023-10-01 09:30:00',
    updatedAt: '2023-10-01 09:30:00',
    updatedBy: 'system',
    remark: '自动任务起始位置',
  },
  {
    id: 'PP003',
    name: 'C区终点站',
    value: 'P-C-01',
    siteId: 'SITE-02',
    siteName: '二号卸料站',
    terminalId: 'T002',
    terminalName: '2号装车端',
    isChargingPoint: false,
    latitude: 39.903,
    longitude: 116.403,
    createdAt: '2023-10-03 14:00:00',
    updatedAt: '2023-10-04 11:20:00',
    updatedBy: 'user1',
    remark: '',
  },
  {
    id: 'PP004',
    name: 'D区车辆存放',
    value: 'P-D-01',
    siteId: 'SITE-02',
    siteName: '二号卸料站',
    isChargingPoint: false,
    latitude: 39.904,
    longitude: 116.404,
    createdAt: '2023-10-05 16:00:00',
    updatedAt: '2023-10-05 16:00:00',
    updatedBy: 'admin',
    remark: '夜间存放',
  },
];

const Component: React.FC = () => {
  const [data, setData] = useState<ParkPointData[]>(initialData);
  const [loading, setLoading] = useState(false);
  
  // Filter States
  const [searchText, setSearchText] = useState('');

  // Drawer States
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentPoint, setCurrentPoint] = useState<ParkPointData | null>(null);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | undefined>(undefined);

  // --- Filtering Logic ---
  const filteredData = data.filter((item) => {
    return item.name.toLowerCase().includes(searchText.toLowerCase());
  });

  // --- Handlers ---
  const handleEdit = (record: ParkPointData) => {
    setCurrentPoint(record);
    setSelectedTerminalId(record.terminalId);
    setDrawerVisible(true);
  };

  const handleSave = () => {
    if (!currentPoint) return;
    
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const selectedTerminal = mockTerminals.find(t => t.id === selectedTerminalId);
      const newData = data.map(item => 
        item.id === currentPoint.id 
          ? { 
              ...item, 
              terminalId: selectedTerminalId,
              terminalName: selectedTerminal?.name, 
              updatedAt: new Date().toLocaleString() 
            } 
          : item
      );
      setData(newData);
      setLoading(false);
      setDrawerVisible(false);
      message.success('关联装卸端更新成功');
    }, 500);
  };

  const selectedTerminalInfo = mockTerminals.find(t => t.id === selectedTerminalId);
  const availableTerminalOptions = mockTerminals.map(t => {
    const isUsedByOther = data.some(p => p.id !== currentPoint?.id && p.terminalId === t.id);
    return {
      label: isUsedByOther ? `${t.name} (已关联)` : t.name,
      value: t.id,
      disabled: isUsedByOther
    };
  });

  // --- Columns ---
  const columns: ColumnsType<ParkPointData> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      fixed: 'left',
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '停靠点名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      sorter: (a, b) => a.name.localeCompare(b.name),
      defaultSortOrder: 'ascend',
      render: (text) => <span style={{ color: '#fff', fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '停靠点值',
      dataIndex: 'value',
      key: 'value',
      width: 120,
    },
    {
      title: '站点名称',
      dataIndex: 'siteName',
      key: 'siteName',
      width: 140,
      ellipsis: true,
    },
    {
      title: '关联站点 ID',
      dataIndex: 'siteId',
      key: 'siteId',
      width: 120,
    },
    {
      title: '关联装卸端',
      dataIndex: 'terminalName',
      key: 'terminalName',
      width: 140,
      render: (text) => text || <span style={{ color: '#ffffff40' }}>-</span>,
    },
    {
      title: '是否充电点',
      dataIndex: 'isChargingPoint',
      key: 'isChargingPoint',
      width: 100,
      render: (val: boolean) => (
        <Tag color={val ? 'green' : 'default'}>{val ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '纬度',
      dataIndex: 'latitude',
      key: 'latitude',
      width: 100,
    },
    {
      title: '经度',
      dataIndex: 'longitude',
      key: 'longitude',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
    },
    {
      title: '更新人',
      dataIndex: 'updatedBy',
      key: 'updatedBy',
      width: 100,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      width: 150,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 120,
      className: 'action-column',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EditOutlined />} 
          onClick={() => handleEdit(record)}
          style={{ color: '#00e5ff' }}
        >
          关联装卸端
        </Button>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#00e5ff',
          colorBgContainer: '#0a1929',
          colorBgElevated: '#0f2744',
          colorText: '#e0f7fa',
          colorTextSecondary: '#b2ebf2',
          borderRadius: 4,
          colorBorder: '#1e3a5f',
        },
        components: {
          Table: {
            colorBgContainer: 'transparent',
            headerBg: 'rgba(0, 229, 255, 0.1)',
            headerColor: '#00e5ff',
            rowHoverBg: 'rgba(0, 229, 255, 0.05)',
            borderColor: '#1e3a5f',
          },
          Drawer: {
            colorBgElevated: '#0a1929',
          },
          Button: {
            colorPrimary: '#00e5ff',
            colorPrimaryHover: '#4dd0e1',
            colorPrimaryActive: '#00acc1',
          }
        }
      }}
    >
      <div className="park-point-container">
        {/* Background Overlay */}
        <div className="background-stars"></div>

        {/* Header - 统一使用工作台一级菜单 */}
        <header className="h-16 border-b border-cyan-900/50 bg-[#0f172a]/80 backdrop-blur flex items-center px-6 justify-between shrink-0" style={{ borderBottom: '1px solid rgba(22, 78, 99, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '64px' }}>
          <div className="flex items-center space-x-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="w-8 h-8 rounded-full border border-cyan-400 flex items-center justify-center shadow-[0_0_10px_rgba(0,255,255,0.3)]" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(0,255,255,0.3)' }}>
              <Monitor className="w-4 h-4 text-cyan-400" size={16} color="#22d3ee" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wider" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', letterSpacing: '0.05em', margin: 0 }}>智慧燃料集控中心</h1>
          </div>
        
          <nav className="flex space-x-1" style={{ display: 'flex', gap: '4px' }}>
            {['主界面', '采样机', '汽车衡', '气动传输', '自动制样'].map(item => (
              <button
                key={item}
                className={`px-6 py-2 text-sm transform skew-x-[-15deg] transition-colors ${
                  item === '主界面' 
                    ? 'bg-cyan-900/60 border-b-2 border-cyan-400 text-cyan-300' 
                    : 'hover:bg-cyan-900/30 text-gray-400'
                }`}
                style={item === '主界面' 
                  ? { padding: '8px 24px', fontSize: '14px', transform: 'skewX(-15deg)', backgroundColor: 'rgba(22, 78, 99, 0.6)', borderBottom: '2px solid #22d3ee', color: '#67e8f9', border: 'none', cursor: 'pointer' }
                  : { padding: '8px 24px', fontSize: '14px', transform: 'skewX(-15deg)', backgroundColor: 'transparent', color: '#9ca3af', border: 'none', cursor: 'pointer' }
                }
              >
                <div className="transform skew-x-[15deg]" style={{ transform: 'skewX(15deg)' }}>{item}</div>
              </button>
            ))}
          </nav>
        
          <div className="flex items-center space-x-4" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="text-sm text-cyan-400" style={{ fontSize: '14px', color: '#22d3ee' }}>2023-10-24 10:05:32</div>
            <button className="p-2 hover:bg-cyan-900/30 rounded-full text-cyan-400 transition-colors" style={{ padding: '8px', borderRadius: '50%', color: '#22d3ee', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <Power className="w-5 h-5" size={20} />
            </button>
          </div>
        </header>
        
        {/* Level 2 Menu */}
        <div className="h-12 bg-[#0f172a]/50 border-b border-cyan-900/30 flex items-center px-6 space-x-8 shrink-0" style={{ height: '48px', backgroundColor: 'rgba(15, 23, 42, 0.5)', borderBottom: '1px solid rgba(22, 78, 99, 0.3)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '32px', marginBottom: '24px' }}>
          {['站点查询', '停靠点查询', '装卸端管理', '地址查询', '车辆管理'].map(item => {
            const isActive = item === '停靠点查询';
            return (
              <button
                key={item}
                className={`text-sm py-3 relative transition-colors ${
                  isActive ? 'text-cyan-400 font-medium' : 'text-gray-400 hover:text-gray-200'
                }`}
                style={{ 
                  fontSize: '14px', 
                  padding: '12px 0', 
                  position: 'relative', 
                  color: isActive ? '#22d3ee' : '#9ca3af', 
                  fontWeight: isActive ? 500 : 'normal',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {item}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.8)]" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '2px', backgroundColor: '#22d3ee', boxShadow: '0 0 8px rgba(0,255,255,0.8)' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="content-area">
          {/* Filters */}
          <div className="filter-bar">
            <Space wrap>
              <Input
                placeholder="停靠点名称模糊搜索"
                prefix={<SearchOutlined style={{ color: '#00e5ff' }} />}
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 240, backgroundColor: 'rgba(10, 25, 41, 0.8)', borderColor: '#1e3a5f' }}
              />
            </Space>
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <Table
              columns={columns}
              dataSource={filteredData}
              rowKey="id"
              pagination={{ 
                pageSize: 10, 
                showTotal: (total) => `共 ${total} 条`,
                style: { color: '#b2ebf2' }
              }}
              loading={loading}
              scroll={{ x: 1600 }}
              size="middle"
            />
          </div>
        </div>

        {/* Edit Drawer */}
        <Drawer
          title={
            <Space>
              <Badge status="processing" color="#00e5ff" />
              <span style={{ color: '#00e5ff' }}>关联装卸端</span>
            </Space>
          }
          width={500}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          styles={{
            body: { paddingBottom: 80, backgroundColor: '#0a1929' },
            header: { borderBottom: '1px solid #1e3a5f', backgroundColor: '#0f2744' },
            mask: { backgroundColor: 'rgba(0, 0, 0, 0.6)' },
          }}
          extra={
            <Space>
              <Button onClick={() => setDrawerVisible(false)}>取消</Button>
              <Button type="primary" onClick={handleSave} loading={loading}>
                保存
              </Button>
            </Space>
          }
        >
          {currentPoint && (
            <div className="drawer-content">
              <Descriptions 
                title={<span style={{ color: '#e0f7fa', fontSize: '14px' }}>停靠点基础信息</span>} 
                column={1} 
                bordered 
                size="small"
                labelStyle={{ width: '120px', backgroundColor: 'rgba(0, 229, 255, 0.05)', color: '#b2ebf2' }}
                contentStyle={{ color: '#fff' }}
              >
                <Descriptions.Item label="停靠点名称">{currentPoint.name}</Descriptions.Item>
                <Descriptions.Item label="停靠点值">{currentPoint.value}</Descriptions.Item>
                <Descriptions.Item label="关联站点">{currentPoint.siteName}</Descriptions.Item>
                <Descriptions.Item label="关联站点 ID">{currentPoint.siteId}</Descriptions.Item>
                <Descriptions.Item label="是否充电点">{currentPoint.isChargingPoint ? '是' : '否'}</Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 24 }}>
                <div style={{ color: '#e0f7fa', fontSize: '14px', marginBottom: 12, fontWeight: 500 }}>
                  配置装卸端
                </div>
                <Form layout="vertical">
                  <Form.Item label={<span style={{ color: '#b2ebf2' }}>关联装卸端 (同一装卸端不可重复关联)</span>}>
                    <Select
                      placeholder="请选择关联装卸端"
                      allowClear
                      style={{ width: '100%' }}
                      value={selectedTerminalId}
                      onChange={setSelectedTerminalId}
                      options={availableTerminalOptions}
                    />
                  </Form.Item>
                </Form>

                {selectedTerminalInfo && (
                  <div style={{ marginTop: 16, padding: 12, background: 'rgba(0, 229, 255, 0.05)', borderRadius: 4, border: '1px solid #1e3a5f' }}>
                    <Descriptions column={1} size="small" title={<span style={{ fontSize: '12px', color: '#00e5ff' }}>选中装卸端信息</span>}>
                      <Descriptions.Item label="装卸端名称">{selectedTerminalInfo.name}</Descriptions.Item>
                      <Descriptions.Item label="装卸端类型">{selectedTerminalInfo.type}</Descriptions.Item>
                    </Descriptions>
                  </div>
                )}
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default Component;
