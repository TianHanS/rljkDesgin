/**
 * @name 地址查询
 * @mode axure
 *
 * 核心功能：
 * 1. 地址列表展示（只读）
 * 2. 地址名称搜索
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /skills/axure-export-workflow/SKILL.md
 */
import React, { useState } from 'react';
import {
  Table,
  Input,
  ConfigProvider,
  theme,
  Space,
} from 'antd';
import {
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './style.css';
import { Monitor, Power } from 'lucide-react';


// --- Mock Data Types ---
interface AddressData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

// --- Mock Data ---
const initialData: AddressData[] = [
  {
    id: 'ADDR-001',
    name: 'A区主入口',
    latitude: 39.9042,
    longitude: 116.4074,
    createdAt: '2023-10-01 10:00:00',
    updatedAt: '2023-10-05 14:30:00',
  },
  {
    id: 'ADDR-002',
    name: 'B区起始位',
    latitude: 39.915,
    longitude: 116.404,
    createdAt: '2023-10-02 09:15:00',
    updatedAt: '2023-10-06 11:20:00',
  },
  {
    id: 'ADDR-003',
    name: 'C区卸料位',
    latitude: 39.9201,
    longitude: 116.412,
    createdAt: '2023-10-03 16:45:00',
    updatedAt: '2023-10-07 08:00:00',
  },
  {
    id: 'ADDR-004',
    name: 'D区车库',
    latitude: 39.9088,
    longitude: 116.397,
    createdAt: '2023-10-04 12:30:00',
    updatedAt: '2023-10-04 12:30:00',
  },
  {
    id: 'ADDR-005',
    name: 'E区检修点',
    latitude: 39.9325,
    longitude: 116.421,
    createdAt: '2023-10-05 08:00:00',
    updatedAt: '2023-10-08 15:10:00',
  },
];

const Component: React.FC = () => {
  const [data] = useState<AddressData[]>(initialData);
  const [searchText, setSearchText] = useState('');

  // --- Filtering Logic ---
  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // --- Columns ---
  const columns: ColumnsType<AddressData> = [
    {
      title: '序号',
      key: 'index',
      width: 80,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '地址名称',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => <span style={{ color: '#fff', fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '纬度',
      dataIndex: 'latitude',
      key: 'latitude',
      width: 150,
    },
    {
      title: '经度',
      dataIndex: 'longitude',
      key: 'longitude',
      width: 150,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 200,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 200,
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
        }
      }}
    >
      <div className="address-management-container">
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


            const isActive = item === '地址查询';


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
                placeholder="地址名称模糊搜索"
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
              size="middle"
            />
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default Component;
