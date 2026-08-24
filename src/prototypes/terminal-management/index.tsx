/**
 * @name 装卸端管理
 * @mode axure
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /skills/axure-export-workflow/SKILL.md
 */
import React, { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  ConfigProvider,
  Form,
  Input,
  InputNumber,
  Modal,
  Drawer, // Add Drawer
  Select,
  Space,
  Table,
  Tag,
  theme,
  Tooltip,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './style.css';
import { Monitor, Power } from 'lucide-react';


type TerminalType = '归批卸车端' | '采样装车端';

type SamplerOption = {
  deviceCode: string;
  samplerName: string;
};

type DockPointOption = {
  id: string;
  name: string;
  type: string; // Add type
  envType: string; // Add envType
  siteId: string;
  siteName: string;
};

type TerminalRecord = {
  id: string;
  code: number;
  name: string;
  type: TerminalType;
  deviceCode?: string;
  samplerName?: string;
  emptyLineCapacity?: number;
  fullLineCapacity?: number;
  siteId: string;
  siteName: string;
  dockPointId: string;
  dockPointName: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

type FormValues = {
  type: TerminalType;
  code: number;
  name: string;
  samplerDeviceCode?: string;
  emptyLineCapacity?: number;
  fullLineCapacity?: number;
  dockPointId: string;
};

const nowText = () => {
  const text = new Date().toLocaleString('zh-CN', { hour12: false });
  return text.replace(/\//g, '-');
};

const Component: React.FC = () => {
  const [form] = Form.useForm<FormValues>();

  const samplerOptions: SamplerOption[] = useMemo(
    () => [
      { deviceCode: 'DEV-S-001', samplerName: '采样机-A' },
      { deviceCode: 'DEV-S-002', samplerName: '采样机-B' },
      { deviceCode: 'DEV-S-003', samplerName: '采样机-C' },
    ],
    [],
  );

  const dockPointOptions: DockPointOption[] = useMemo(
    () => [
      { id: 'PP001', name: 'A区停靠点1', type: '停靠点', envType: '室外', siteId: 'SITE-01', siteName: '一号煤场站' },
      { id: 'PP002', name: 'B区任务起点', type: '任务起点', envType: '室内', siteId: 'SITE-01', siteName: '一号煤场站' },
      { id: 'PP003', name: 'C区终点站', type: '任务终点', envType: '室外', siteId: 'SITE-02', siteName: '二号卸料站' },
      { id: 'PP004', name: 'D区车辆存放', type: '车辆存放点', envType: '室内', siteId: 'SITE-02', siteName: '二号卸料站' },
    ],
    [],
  );

  const [records, setRecords] = useState<TerminalRecord[]>(() => {
    const t = nowText();
    return [
      {
        id: 'TERM-001',
        code: 0,
        name: '归批卸车端-01',
        type: '归批卸车端',
        siteId: 'SITE-01',
        siteName: '一号煤场站',
        dockPointId: 'PP001',
        dockPointName: 'A区停靠点1',
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin',
      },
      {
        id: 'TERM-002',
        code: 1,
        name: '采样装车端-01',
        type: '采样装车端',
        deviceCode: 'DEV-S-001',
        samplerName: '采样机-A',
        emptyLineCapacity: 20,
        fullLineCapacity: 20,
        siteId: 'SITE-02',
        siteName: '二号卸料站',
        dockPointId: 'PP003',
        dockPointName: 'C区终点站',
        createdAt: t,
        updatedAt: t,
        updatedBy: 'admin',
      },
    ].sort((a, b) => a.code - b.code);
  });

  const [searchName, setSearchName] = useState('');
  const [filterType, setFilterType] = useState<TerminalType | undefined>(undefined);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentType = Form.useWatch('type', form) as TerminalType | undefined;
  const currentDockPointId = Form.useWatch('dockPointId', form) as string | undefined;

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const nameOk = r.name.toLowerCase().includes(searchName.trim().toLowerCase());
        const typeOk = !filterType || r.type === filterType;
        return nameOk && typeOk;
      })
      .slice()
      .sort((a, b) => a.code - b.code);
  }, [filterType, records, searchName]);

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: TerminalRecord) => {
    setEditingId(record.id);
    form.setFieldsValue({
      type: record.type,
      code: record.code,
      name: record.name,
      samplerDeviceCode: record.deviceCode,
      emptyLineCapacity: record.emptyLineCapacity,
      fullLineCapacity: record.fullLineCapacity,
      dockPointId: record.dockPointId,
    });
    setDrawerOpen(true);
  };

  const onDockChange = (dockPointId: string) => {
    form.setFieldsValue({ dockPointId });
  };

  const onTypeChange = (t: TerminalType) => {
    form.setFieldsValue({ type: t });
    if (t === '归批卸车端') {
      form.setFieldsValue({ samplerDeviceCode: undefined });
    }
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const dock = dockPointOptions.find((d) => d.id === values.dockPointId);
      if (!dock) {
        message.error('关联停靠点不存在');
        return;
      }

      const sampler = samplerOptions.find((s) => s.deviceCode === values.samplerDeviceCode);

      const base = {
        code: values.code,
        name: values.name,
        type: values.type,
        deviceCode: sampler?.deviceCode,
        samplerName: sampler?.samplerName,
        emptyLineCapacity: values.emptyLineCapacity,
        fullLineCapacity: values.fullLineCapacity,
        siteId: dock.siteId,
        siteName: dock.siteName,
        dockPointId: dock.id,
        dockPointName: dock.name,
        updatedAt: nowText(),
        updatedBy: '当前操作员',
      };

      setTimeout(() => {
        setRecords((prev) => {
          if (editingId) {
            return prev
              .map((p) => (p.id === editingId ? { ...p, ...base } : p))
              .slice()
              .sort((a, b) => a.code - b.code);
          }
          const createdAt = nowText();
          const id = `TERM-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
          return prev
            .concat({
              id,
              createdAt,
              ...base,
            })
            .slice()
            .sort((a, b) => a.code - b.code);
        });
        setSaving(false);
        setDrawerOpen(false);
        message.success(editingId ? '编辑成功' : '新增成功');
      }, 450);
    } catch {
      return;
    }
  };

  const confirmDelete = (record: TerminalRecord) => {
    Modal.confirm({
      title: '确认删除？',
      icon: <ExclamationCircleOutlined style={{ color: '#00e5ff' }} />,
      content: `将删除装卸端「${record.name}」（编码 ${record.code}）。`,
      okText: '删除',
      cancelText: '取消',
      className: 'terminal-management-confirm',
      onOk: async () => {
        setRecords((prev) => prev.filter((p) => p.id !== record.id));
        message.success('删除成功');
      },
    });
  };

  const columns: ColumnsType<TerminalRecord> = [
    {
      title: '装卸端编码',
      dataIndex: 'code',
      key: 'code',
      width: 110,
      sorter: (a, b) => a.code - b.code,
      defaultSortOrder: 'ascend',
    },
    {
      title: '装卸端名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      ellipsis: true,
      render: (text) => <span style={{ color: '#fff', fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '装卸端类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (t: TerminalType) => (
        <Tag color={t === '归批卸车端' ? 'cyan' : 'blue'} bordered={false}>
          {t}
        </Tag>
      ),
    },
    {
      title: '关联设备编码',
      dataIndex: 'deviceCode',
      key: 'deviceCode',
      width: 140,
      render: (v) => v || <span style={{ color: '#ffffff40' }}>-</span>,
    },
    {
      title: '采样机名称',
      dataIndex: 'samplerName',
      key: 'samplerName',
      width: 140,
      render: (v) => v || <span style={{ color: '#ffffff40' }}>-</span>,
    },
    {
      title: '空桶线容量',
      dataIndex: 'emptyLineCapacity',
      key: 'emptyLineCapacity',
      width: 120,
      align: 'center',
      render: (v) => (typeof v === 'number' ? v : <span style={{ color: '#ffffff40' }}>-</span>),
    },
    {
      title: '满桶线容量',
      dataIndex: 'fullLineCapacity',
      key: 'fullLineCapacity',
      width: 120,
      align: 'center',
      render: (v) => (typeof v === 'number' ? v : <span style={{ color: '#ffffff40' }}>-</span>),
    },
    {
      title: '关联站点ID',
      dataIndex: 'siteId',
      key: 'siteId',
      width: 130,
    },
    {
      title: '站点名称',
      dataIndex: 'siteName',
      key: 'siteName',
      width: 140,
      ellipsis: true,
    },
    {
      title: '关联停靠点ID',
      dataIndex: 'dockPointId',
      key: 'dockPointId',
      width: 140,
    },
    {
      title: '停靠点名称',
      dataIndex: 'dockPointName',
      key: 'dockPointName',
      width: 160,
      ellipsis: true,
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
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      className: 'action-column',
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" icon={<EditOutlined />} style={{ color: '#00e5ff' }} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" icon={<DeleteOutlined />} danger onClick={() => confirmDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const selectedDock = dockPointOptions.find((d) => d.id === currentDockPointId);

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
          borderRadius: 6,
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
        },
      }}
    >
      <div className="terminal-management-container">
        <div className="background-stars" />

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


            const isActive = item === '装卸端管理';


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

        <div className="content-area">
          <div className="toolbar">
            <Space wrap size={12}>
              <Input
                placeholder="装卸端名称模糊搜索"
                prefix={<SearchOutlined style={{ color: '#00e5ff' }} />}
                allowClear
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                style={{ width: 240, backgroundColor: 'rgba(10, 25, 41, 0.8)', borderColor: '#1e3a5f' }}
              />
              <Select
                placeholder="装卸端类型"
                allowClear
                style={{ width: 220 }}
                value={filterType}
                onChange={(v) => setFilterType(v)}
                options={[
                  { label: '归批卸车端', value: '归批卸车端' },
                  { label: '采样装车端', value: '采样装车端' },
                ]}
              />
            </Space>

            <Tooltip title="新增装卸端">
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新增
              </Button>
            </Tooltip>
          </div>

          <div className="table-wrapper">
            <Table
              columns={columns}
              dataSource={filteredRecords}
              rowKey="id"
              pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条`, style: { color: '#b2ebf2' } }}
              scroll={{ x: 2100 }}
              size="middle"
            />
          </div>
        </div>

        <Drawer
          title={
            <Space>
              <Badge status="processing" color="#00e5ff" />
              <span style={{ color: '#00e5ff' }}>{editingId ? '编辑装卸端' : '新增装卸端'}</span>
            </Space>
          }
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={720}
          className="terminal-management-drawer"
          destroyOnClose
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setDrawerOpen(false)}>取消</Button>
              <Button type="primary" loading={saving} onClick={save}>
                保存
              </Button>
            </div>
          }
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{ type: '采样装车端' as TerminalType }}
            preserve={false}
          >
            <div className="form-grid">
              <Form.Item
                label="装卸端类型"
                name="type"
                rules={[
                  { required: true, message: '请选择装卸端类型' },
                  {
                    validator: async (_, value: TerminalType) => {
                      if (!value) return;
                      if (value === '归批卸车端') {
                        const exists = records.some((r) => r.type === '归批卸车端' && r.id !== editingId);
                        if (exists) throw new Error('归批卸车端全局唯一，当前已存在');
                      }
                    },
                  },
                ]}
              >
                <Select
                  onChange={onTypeChange}
                  options={[
                    { label: '归批卸车端', value: '归批卸车端' },
                    { label: '采样装车端', value: '采样装车端' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                label="装卸端编码"
                name="code"
                validateTrigger={['onBlur', 'onChange']}
                rules={[
                  { required: true, message: '请选择装卸端编码' },
                  {
                    validator: async (_, value: number) => {
                      if (value === undefined || value === null) return;
                      const exists = records.some((r) => r.code === value && r.id !== editingId);
                      if (exists) throw new Error('装卸端编码已存在');
                    },
                  },
                ]}
              >
                <Select
                  placeholder="0-9"
                  options={Array.from({ length: 10 }).map((_, i) => ({ label: String(i), value: i }))}
                />
              </Form.Item>

              <Form.Item
                label="装卸端名称"
                name="name"
                rules={[{ required: true, message: '请输入装卸端名称' }]}
              >
                <Input placeholder="请输入" maxLength={50} />
              </Form.Item>

              <Form.Item
                label="关联采样机"
                name="samplerDeviceCode"
                rules={[
                  {
                    validator: async (_, value?: string) => {
                      if (currentType === '采样装车端' && !value) throw new Error('采样装车端必须关联采样机');
                      if (!value) return;
                      const exists = records.some((r) => r.deviceCode === value && r.id !== editingId);
                      if (exists) throw new Error('采样机不允许重复关联');
                    },
                  },
                ]}
              >
                <Select
                  placeholder={currentType === '归批卸车端' ? '归批卸车端无需关联采样机' : '请选择'}
                  allowClear
                  disabled={currentType === '归批卸车端'}
                  options={samplerOptions.map((s) => ({
                    label: `${s.samplerName}（${s.deviceCode}）`,
                    value: s.deviceCode,
                  }))}
                />
              </Form.Item>

              <Form.Item label="空桶线容量" name="emptyLineCapacity">
                <InputNumber min={0} step={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item label="满桶线容量" name="fullLineCapacity">
                <InputNumber min={0} step={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                label="关联停靠点"
                name="dockPointId"
                rules={[
                  { required: true, message: '请选择关联停靠点' },
                  {
                    validator: async (_, value: string) => {
                      if (!value) return;
                      const exists = records.some((r) => r.dockPointId === value && r.id !== editingId);
                      if (exists) throw new Error('停靠点与装卸端一一对应，不允许重复关联');
                    },
                  },
                ]}
              >
                <Select
                  placeholder="请选择"
                  showSearch
                  optionFilterProp="label"
                  onChange={onDockChange}
                  options={dockPointOptions.map((d) => ({
                    label: `${d.name}（${d.id}）`,
                    value: d.id,
                  }))}
                />
              </Form.Item>
            </div>

            {selectedDock && (
              <div className="readonly-panel">
                <div className="readonly-title">停靠点信息（随选择回填）</div>
                <div className="readonly-grid">
                  <div className="readonly-item">
                    <div className="readonly-label">停靠点名称</div>
                    <div className="readonly-value">{selectedDock.name}</div>
                  </div>
                  <div className="readonly-item">
                    <div className="readonly-label">停靠点类型</div>
                    <div className="readonly-value">{selectedDock.type}</div>
                  </div>
                  <div className="readonly-item">
                    <div className="readonly-label">停靠点场合</div>
                    <div className="readonly-value">{selectedDock.envType}</div>
                  </div>
                </div>
              </div>
            )}
          </Form>
        </Drawer>
      </div>
    </ConfigProvider>
  );
};

export default Component;
