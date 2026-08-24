/**
 * @name 车辆管理
 *
 * 核心功能：
 * 1. 车辆列表展示（部分只读）
 * 2. 编辑小车编号、滚筒线容量
 */
import React, { useState } from 'react';
import {
  Table,
  Button,
  Input,
  InputNumber,
  Select,
  ConfigProvider,
  theme,
  Space,
  Drawer,
  Form,
  message,
  Descriptions,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './style.css';
import { Monitor, Power } from 'lucide-react';


// --- Mock Data Types ---
interface VehicleData {
  id: string; // id
  vehicle_no: number; // 小车编号 1-9
  capacity_resource_id: string;
  Capacity_resource_object_name: string;
  Capacity_resource_object_id: string;
  Capacity_resource_object_type: string; // 0-无人车、1-柜子、2-地图
  vehicle_name: string;
  site_name: string;
  site_id: string;
  Execute_task_id: string;
  dev_code: string;
  status: number; // 0.未开始,101.任务进行中,102.任务暂停,30.配送结束完成,40.配送完成并拿取完滞留件,50.取消完成,60.故障取消
  Line1_capacity: number;
  Line2_capacity: number;
  create_time: string;
  update_time: string;
  update_person: string;
  attr: string;
  attr1: string;
}

// --- Mock Data ---
const initialData: VehicleData[] = [
  {
    id: 'v-001',
    vehicle_no: 1,
    capacity_resource_id: 'cr-001',
    Capacity_resource_object_name: '无人车资源-01',
    Capacity_resource_object_id: 'obj-v-001',
    Capacity_resource_object_type: '0-无人车',
    vehicle_name: '1号小车',
    site_name: '一号煤场站',
    site_id: 'site-001',
    Execute_task_id: 'T-20231024-001',
    dev_code: 'DEV-V-001',
    status: 101, // 任务进行中
    Line1_capacity: 10,
    Line2_capacity: 10,
    create_time: '2023-10-01 10:00:00',
    update_time: '2023-10-05 14:30:00',
    update_person: 'admin',
    attr: '测试数据1',
    attr1: '备用数据1',
  },
  {
    id: 'v-002',
    vehicle_no: 2,
    capacity_resource_id: 'cr-002',
    Capacity_resource_object_name: '无人车资源-02',
    Capacity_resource_object_id: 'obj-v-002',
    Capacity_resource_object_type: '0-无人车',
    vehicle_name: '2号小车',
    site_name: '一号煤场站',
    site_id: 'site-001',
    Execute_task_id: '',
    dev_code: 'DEV-V-002',
    status: 0, // 未开始
    Line1_capacity: 12,
    Line2_capacity: 12,
    create_time: '2023-10-02 09:15:00',
    update_time: '2023-10-06 11:20:00',
    update_person: 'system',
    attr: '测试数据2',
    attr1: '备用数据2',
  },
  {
    id: 'v-003',
    vehicle_no: 3,
    capacity_resource_id: 'cr-003',
    Capacity_resource_object_name: '无人车资源-03',
    Capacity_resource_object_id: 'obj-v-003',
    Capacity_resource_object_type: '0-无人车',
    vehicle_name: '3号小车',
    site_name: '二号卸料站',
    site_id: 'site-002',
    Execute_task_id: 'T-20231024-002',
    dev_code: 'DEV-V-003',
    status: 102, // 任务暂停
    Line1_capacity: 8,
    Line2_capacity: 8,
    create_time: '2023-10-03 16:45:00',
    update_time: '2023-10-07 08:00:00',
    update_person: 'user1',
    attr: '测试数据3',
    attr1: '备用数据3',
  },
];

const Component: React.FC = () => {
  const [data, setData] = useState<VehicleData[]>(initialData);
  const [searchText, setSearchText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // --- Filtering Logic ---
  const filteredData = data.filter((item) =>
    item.vehicle_name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.Capacity_resource_object_id.toLowerCase().includes(searchText.toLowerCase())
  ).sort((a, b) => (a.id.localeCompare(b.id)));

  // --- Handlers ---
  const handleEdit = (record: VehicleData) => {
    setCurrentVehicle(record);
    form.setFieldsValue({
      vehicle_no: record.vehicle_no,
      Line1_capacity: record.Line1_capacity,
      Line2_capacity: record.Line2_capacity,
    });
    setDrawerVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Simulate API call
      setTimeout(() => {
        const newData = data.map(item => 
          item.id === currentVehicle?.id 
            ? { 
                ...item, 
                ...values, 
                update_time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
                update_person: '当前操作员'
              } 
            : item
        );
        setData(newData);
        setLoading(false);
        setDrawerVisible(false);
        message.success('车辆信息更新成功');
      }, 500);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // --- Columns ---
  const columns: ColumnsType<VehicleData> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      fixed: 'left',
    },
    {
      title: '小车编号',
      dataIndex: 'vehicle_no',
      key: 'vehicle_no',
      width: 100,
      fixed: 'left',
      align: 'center',
      render: (val) => <span style={{ color: '#00e5ff', fontWeight: 'bold', fontSize: '16px', textShadow: '0 0 8px rgba(0,229,255,0.6)' }}>{val}</span>,
    },
    {
      title: '车辆名称',
      dataIndex: 'vehicle_name',
      key: 'vehicle_name',
      width: 120,
      fixed: 'left',
      render: (text) => <span style={{ color: '#fff', fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '运力单元ID',
      dataIndex: 'capacity_resource_id',
      key: 'capacity_resource_id',
      width: 120,
    },
    {
      title: '运力资源对象名称',
      dataIndex: 'Capacity_resource_object_name',
      key: 'Capacity_resource_object_name',
      width: 160,
    },
    {
      title: '车辆ObjectId',
      dataIndex: 'Capacity_resource_object_id',
      key: 'Capacity_resource_object_id',
      width: 140,
    },
    {
      title: '对象类型',
      dataIndex: 'Capacity_resource_object_type',
      key: 'Capacity_resource_object_type',
      width: 120,
    },
    {
      title: '站点名称',
      dataIndex: 'site_name',
      key: 'site_name',
      width: 140,
    },
    {
      title: '关联站点 ID',
      dataIndex: 'site_id',
      key: 'site_id',
      width: 120,
    },
    {
      title: '正在执行任务ID',
      dataIndex: 'Execute_task_id',
      key: 'Execute_task_id',
      width: 160,
      render: (text) => text || <span style={{ color: '#666' }}>暂无任务</span>
    },
    {
      title: '设备编码',
      dataIndex: 'dev_code',
      key: 'dev_code',
      width: 140,
    },
    {
      title: '任务状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const statusMap: Record<number, { text: string, color: string }> = {
          0: { text: '未开始', color: 'default' },
          101: { text: '任务进行中', color: 'processing' },
          102: { text: '任务暂停', color: 'warning' },
          30: { text: '配送结束完成', color: 'success' },
          40: { text: '配送完成并拿取完滞留件', color: 'success' },
          50: { text: '取消完成', color: 'error' },
          60: { text: '故障取消', color: 'error' },
        };
        const mapped = statusMap[status] || { text: '未知', color: 'default' };
        return <Badge status={mapped.color as any} text={<span style={{ color: '#e0f7fa' }}>{mapped.text}</span>} />;
      }
    },
    {
      title: '滚筒线1容量',
      dataIndex: 'Line1_capacity',
      key: 'Line1_capacity',
      width: 110,
      align: 'center',
    },
    {
      title: '滚筒线2容量',
      dataIndex: 'Line2_capacity',
      key: 'Line2_capacity',
      width: 110,
      align: 'center',
    },
    {
      title: '备用1',
      dataIndex: 'attr',
      key: 'attr',
      width: 100,
    },
    {
      title: '备用2',
      dataIndex: 'attr1',
      key: 'attr1',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      key: 'create_time',
      width: 160,
    },
    {
      title: '更新时间',
      dataIndex: 'update_time',
      key: 'update_time',
      width: 160,
    },
    {
      title: '更新人',
      dataIndex: 'update_person',
      key: 'update_person',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 90,
      className: 'action-column',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EditOutlined />} 
          onClick={() => handleEdit(record)}
          style={{ color: '#00e5ff' }}
        >
          编辑
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
            colorBgElevated: '#0f2744',
            colorText: '#e0f7fa',
          },
        }
      }}
    >
      <div className="vehicle-management-container">
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


            const isActive = item === '车辆管理';


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
          {/* Toolbar */}
          <div className="toolbar">
            <Space>
              <Input
                placeholder="车辆名称/标识符搜索"
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
              <span style={{ color: '#00e5ff' }}>编辑车辆信息</span>
            </Space>
          }
          width={500}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          className="vehicle-management-drawer"
          extra={
            <Space>
              <Button onClick={() => setDrawerVisible(false)}>取消</Button>
              <Button type="primary" onClick={handleSave} loading={loading}>
                保存
              </Button>
            </Space>
          }
        >
          {currentVehicle && (
            <div className="drawer-content">
              <Descriptions 
                title={<span style={{ color: '#e0f7fa', fontSize: '14px' }}>车辆基础信息 (只读)</span>} 
                column={1} 
                bordered 
                size="small"
                labelStyle={{ width: '160px', backgroundColor: 'rgba(0, 229, 255, 0.05)', color: '#b2ebf2' }}
                contentStyle={{ color: '#fff' }}
              >
                <Descriptions.Item label="车辆名称">{currentVehicle.vehicle_name}</Descriptions.Item>
                <Descriptions.Item label="运力资源对象名称">{currentVehicle.Capacity_resource_object_name}</Descriptions.Item>
                <Descriptions.Item label="车辆ObjectId">{currentVehicle.Capacity_resource_object_id}</Descriptions.Item>
                <Descriptions.Item label="运力单元ID">{currentVehicle.capacity_resource_id}</Descriptions.Item>
                <Descriptions.Item label="对象类型">{currentVehicle.Capacity_resource_object_type}</Descriptions.Item>
                <Descriptions.Item label="关联站点">{currentVehicle.site_name}</Descriptions.Item>
                <Descriptions.Item label="站点ID">{currentVehicle.site_id}</Descriptions.Item>
                <Descriptions.Item label="设备编码">{currentVehicle.dev_code}</Descriptions.Item>
                <Descriptions.Item label="任务状态">{currentVehicle.status}</Descriptions.Item>
                <Descriptions.Item label="执行任务ID">{currentVehicle.Execute_task_id || '无'}</Descriptions.Item>
                <Descriptions.Item label="备用1">{currentVehicle.attr}</Descriptions.Item>
                <Descriptions.Item label="备用2">{currentVehicle.attr1}</Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 24 }}>
                <div style={{ color: '#e0f7fa', fontSize: '14px', marginBottom: 12, fontWeight: 500 }}>
                  配置参数
                </div>
                <Form 
                  form={form} 
                  layout="vertical"
                >
                  <Form.Item 
                    label="小车编号 (全局唯一)" 
                    name="vehicle_no"
                    rules={[
                      { required: true, message: '请选择小车编号' },
                      {
                        validator: async (_, value) => {
                          if (!value) return;
                          const exists = data.some(item => 
                            item.vehicle_no === value && item.id !== currentVehicle.id
                          );
                          if (exists) throw new Error('该编号已被其他车辆使用，请重新选择');
                        }
                      }
                    ]}
                  >
                    <Select
                      placeholder="请选择 1-9"
                      options={Array.from({ length: 9 }).map((_, i) => ({ label: `${i + 1}`, value: i + 1 }))}
                    />
                  </Form.Item>

                  <Form.Item 
                    label="滚筒线1容量" 
                    name="Line1_capacity"
                    rules={[{ required: true, message: '请输入容量' }]}
                  >
                    <InputNumber min={0} step={1} precision={0} style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item 
                    label="滚筒线2容量" 
                    name="Line2_capacity"
                    rules={[{ required: true, message: '请输入容量' }]}
                  >
                    <InputNumber min={0} step={1} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Form>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default Component;
