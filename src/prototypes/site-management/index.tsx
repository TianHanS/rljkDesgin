/**
 * @name 站点查询
 *
 * 核心功能：
 * 1. 站点列表展示
 * 2. 站点详情查看
 * 3. 站点数据同步（模拟异步过程）
 */
import React, { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Modal,
  Space,
  Tag,
  Tooltip,
  ConfigProvider,
  theme,
  message,
  Typography,
  Descriptions,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  SyncOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Monitor, Power } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import './style.css'; // Custom styles for dark theme overrides

const { Title } = Typography;
const { confirm } = Modal;

// --- Mock Data Types ---
interface SiteData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  dockCount: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  remark: string;
}

// --- Mock Data ---
const initialData: SiteData[] = [
  {
    id: '1',
    name: '一号煤场站',
    latitude: 39.9042,
    longitude: 116.4074,
    dockCount: 5,
    createdAt: '2023-10-01 10:00:00',
    updatedAt: '2023-10-05 14:30:00',
    updatedBy: 'admin',
    remark: '主站点，负责主要转运任务',
  },
  {
    id: '2',
    name: '二号卸料站',
    latitude: 39.915,
    longitude: 116.404,
    dockCount: 3,
    createdAt: '2023-10-02 09:15:00',
    updatedAt: '2023-10-06 11:20:00',
    updatedBy: 'system',
    remark: '夜班专用',
  },
  {
    id: '3',
    name: '三号检修站',
    latitude: 39.9201,
    longitude: 116.412,
    dockCount: 2,
    createdAt: '2023-10-03 16:45:00',
    updatedAt: '2023-10-07 08:00:00',
    updatedBy: 'user1',
    remark: '车辆检修与维护',
  },
  {
    id: '4',
    name: '临时停靠点A',
    latitude: 39.9088,
    longitude: 116.397,
    dockCount: 1,
    createdAt: '2023-10-04 12:30:00',
    updatedAt: '2023-10-04 12:30:00',
    updatedBy: 'admin',
    remark: '临时调度使用',
  },
  {
    id: '5',
    name: '四号装载站',
    latitude: 39.9325,
    longitude: 116.421,
    dockCount: 8,
    createdAt: '2023-10-05 08:00:00',
    updatedAt: '2023-10-08 15:10:00',
    updatedBy: 'admin',
    remark: '高吞吐量装载区域',
  },
];

const Component: React.FC = () => {
  const [data, setData] = useState<SiteData[]>(initialData);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentSite, setCurrentSite] = useState<SiteData | null>(null);

  // --- Search Handler ---
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const filteredData = data.filter((item) =>
    item.name.includes(searchText)
  );

  // --- Sync Handler ---
  const handleSync = () => {
    confirm({
      title: '确认同步？',
      icon: <ExclamationCircleOutlined style={{ color: '#00e5ff' }} />,
      content: '即将同步最新无人转运站点、停靠点、地址、车辆等基础数据。',
      okText: '确认同步',
      cancelText: '取消',
      className: 'site-management-modal',
      onOk: async () => {
        setSyncLoading(true);
        try {
          // Simulate async steps
          message.loading({ content: '正在同步无人转运站点...', key: 'sync' });
          await new Promise((resolve) => setTimeout(resolve, 800));
          message.success({ content: '无人转运站点同步成功', key: 'sync', duration: 1 });
          
          await new Promise((resolve) => setTimeout(resolve, 500));
          message.loading({ content: '正在同步停靠点数据...', key: 'sync' });
          await new Promise((resolve) => setTimeout(resolve, 800));
          message.success({ content: '停靠点数据同步成功', key: 'sync', duration: 1 });
          
          await new Promise((resolve) => setTimeout(resolve, 500));
          message.loading({ content: '正在同步地址信息...', key: 'sync' });
          await new Promise((resolve) => setTimeout(resolve, 800));
          message.success({ content: '地址信息同步成功', key: 'sync', duration: 1 });
          
          await new Promise((resolve) => setTimeout(resolve, 500));
          message.loading({ content: '正在同步车辆信息...', key: 'sync' });
          await new Promise((resolve) => setTimeout(resolve, 800));
          message.success({ content: '车辆信息同步成功', key: 'sync', duration: 1 });

          await new Promise((resolve) => setTimeout(resolve, 500));
          
          // Update timestamp and user for all records (mocking the effect)
          const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
          const newData = data.map(item => ({
            ...item,
            updatedAt: now,
            updatedBy: 'admin', // Mock user
          }));
          setData(newData);

          message.success({ content: '所有基础数据同步完成！数据已更新。', key: 'sync' });
        } catch (error) {
          message.error({ content: '同步失败：车辆信息接口异常', key: 'sync' });
        } finally {
          setSyncLoading(false);
        }
      },
    });
  };

  // --- View Detail Handler ---
  const handleView = (record: SiteData) => {
    setCurrentSite(record);
    setDetailVisible(true);
  };

  // --- Columns Definition ---
  const columns: ColumnsType<SiteData> = [
    {
      title: '站点名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ color: '#fff', fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '站点纬度',
      dataIndex: 'latitude',
      key: 'latitude',
    },
    {
      title: '站点经度',
      dataIndex: 'longitude',
      key: 'longitude',
    },
    {
      title: '停靠点数量',
      dataIndex: 'dockCount',
      key: 'dockCount',
      align: 'center',
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
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => handleView(record)}
          style={{ color: '#00e5ff' }}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#00e5ff', // Cyan highlight
          colorBgContainer: '#0a1929', // Dark blue container
          colorBgElevated: '#0f2744', // Slightly lighter for dropdowns/modals
          colorText: '#e0f7fa', // Light cyan text
          colorTextSecondary: '#b2ebf2',
          borderRadius: 4,
          colorBorder: '#1e3a5f',
        },
        components: {
          Table: {
            colorBgContainer: 'transparent',
            headerBg: 'rgba(0, 229, 255, 0.1)', // Cyan tint for header
            headerColor: '#00e5ff',
            rowHoverBg: 'rgba(0, 229, 255, 0.05)',
            borderColor: '#1e3a5f',
          },
          Modal: {
            headerBg: '#0f2744',
            contentBg: '#0f2744',
            titleColor: '#00e5ff',
          },
          Button: {
            colorPrimary: '#00e5ff',
            colorPrimaryHover: '#4dd0e1',
            colorPrimaryActive: '#00acc1',
          }
        }
      }}
    >
      <div className="site-management-container">
        {/* Background Overlay for Stars effect */}
        <div className="background-stars"></div>

        {/* Header */}
        <div className="page-header">
          <div className="header-title">
            <span className="logo-icon">🏭</span>
            智慧燃料集控中心 - 站点管理
          </div>
          <div className="header-nav">
            {/* Mock Nav Items */}
            {['主页面', '采样间', '汽车衡', '气粉传输', '自动化控', '站点管理'].map(item => (
              <div 
                key={item} 
                className={`nav-item ${item === '站点管理' ? 'active' : ''}`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
          {/* Toolbar */}
          <div className="toolbar">
            <Space>
              <Input
                placeholder="请输入站点名称"
                prefix={<SearchOutlined style={{ color: '#00e5ff' }} />}
                allowClear
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: 240, backgroundColor: 'rgba(10, 25, 41, 0.8)', borderColor: '#00e5ff' }}
              />
              <Button type="primary" ghost>查询</Button>
            </Space>
            
            <Tooltip title="同步最新无人转运站点、停靠点、地址、车辆等基础数据">
              <Button 
                type="primary" 
                icon={<SyncOutlined spin={syncLoading} />} 
                onClick={handleSync}
                loading={syncLoading}
                className="sync-button"
              >
                同步站点数据
              </Button>
            </Tooltip>
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
              scroll={{ x: 1300 }}
              size="middle"
            />
          </div>
        </div>

        {/* Detail Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Badge status="processing" color="#00e5ff" />
              <span>站点详情</span>
            </div>
          }
          open={detailVisible}
          onCancel={() => setDetailVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailVisible(false)}>
              关闭
            </Button>
          ]}
          centered
          width={700}
          className="site-management-modal"
        >
          {currentSite && (
            <Descriptions bordered column={2} size="middle" labelStyle={{ color: '#b2ebf2', width: '120px' }} contentStyle={{ color: '#fff' }}>
              <Descriptions.Item label="站点名称">{currentSite.name}</Descriptions.Item>
              <Descriptions.Item label="站点类型">
                <Tag color={currentSite.type === '正常模式站点' ? 'cyan' : 'blue'}>{currentSite.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="纬度">{currentSite.latitude}</Descriptions.Item>
              <Descriptions.Item label="经度">{currentSite.longitude}</Descriptions.Item>
              <Descriptions.Item label="停靠点数量">{currentSite.dockCount}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{currentSite.createdAt}</Descriptions.Item>
              <Descriptions.Item label="更新人">{currentSite.updatedBy}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{currentSite.updatedAt}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{currentSite.remark || '-'}</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default Component;
