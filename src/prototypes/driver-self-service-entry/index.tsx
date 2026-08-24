/**
 * @name 司机自助入厂登记
 * @mode axure
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /skills/axure-export-workflow/SKILL.md
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Input, Typography, Space, Spin, message, Row, Col, Modal, Tag, Descriptions, QRCode, Empty } from 'antd';
import { UserOutlined, LockOutlined, ScanOutlined, FileTextOutlined, HomeOutlined, CheckCircleFilled, LeftOutlined, RightOutlined, LogoutOutlined, ReloadOutlined, InfoCircleOutlined, SearchOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './style.css';

const { Title, Text } = Typography;

const WEEK_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

// --- Mock Data & Helpers ---

const MOCK_SLIPS = Array.from({ length: 20 }).map((_, i) => {
  const isCoal = Math.random() > 0.3;
  return {
    id: `slip-${i}`,
    plateNo: `苏A${Math.floor(10000 + Math.random() * 90000)}`,
    type: isCoal ? '运煤车' : '物资车',
    entryTime: dayjs().subtract(i * 15, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    grossWeight: (40 + Math.random() * 10).toFixed(2),
    tareWeight: (15 + Math.random() * 2).toFixed(2),
    netWeight: (25 + Math.random() * 8).toFixed(2),
    qrCode: `https://example.com/slip/${i}`,
    supplier: isCoal ? '神东煤炭集团' : undefined,
    mine: isCoal ? '上湾煤矿' : undefined,
    coalType: isCoal ? '动力煤' : undefined,
    materialType: !isCoal ? '石灰石' : undefined,
  };
});

interface DecodedInfo {
  plateNo: string;
  supplier?: string;
  mine?: string;
  coalType?: string;
  transportUnit?: string;
  materialType?: string;
  taskOrderNo?: string;
  dispatchTime?: string;
  driverName?: string;
  driverPhone?: string;
  netWeight: string;
  grossWeight: string;
  tareWeight: string;
  isCoal: boolean;
  taskType?: number;
}

const generateMockQRData = () => {
  const data = {
    plateNo: "苏A88888",
    supplier: "神东煤炭集团",
    mine: "上湾煤矿",
    coalType: "动力煤",
    transportUnit: "远达物流有限公司",
    netWeight: "33.50",
    grossWeight: "49.00",
    tareWeight: "15.50",
    isCoal: true,
    taskType: 0
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
};

const generateMockMaterialQRData = () => {
  const data = {
    plateNo: "鲁H99999",
    materialType: "石灰石",
    taskOrderNo: "RW20260610001",
    dispatchTime: "2026-06-10 08:30:00",
    netWeight: "30.00",
    grossWeight: "45.00",
    tareWeight: "15.00",
    driverName: "张三",
    driverPhone: "13800138000",
    isCoal: false,
    taskType: 3
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
};

// 表单字段：标签 + 下划线值
const Field: React.FC<{
  label: string;
  value?: React.ReactNode;
  editable?: boolean;
  highlight?: boolean;
}> = ({ label, value, editable, highlight }) => (
  <div className="field-row">
    <span className="field-label">{label}</span>
    <span className={`field-value ${highlight ? 'text-blue-600' : ''}`}>{value ?? '—'}</span>
    {editable && <EditOutlined className="text-blue-500 text-lg" />}
  </div>
);

// 蓝点分组标题
const SectionTitle: React.FC<{ text: string }> = ({ text }) => (
  <div className="section-title">
    <span className="dot" />
    <span className="txt">{text}</span>
  </div>
);

// --- Main Component ---

const Component = function DriverSelfServiceEntry() {
  const [view, setView] = useState<'login' | 'home' | 'registration' | 'query'>('login');
  const [currentTime, setCurrentTime] = useState(dayjs());

  // Timer effect for clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Login ---
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const handleLogin = () => {
    if (loginUser.trim() && loginPass.trim()) {
      message.success('登录成功', 2);
      setView('home');
      setLoginPass('');
    } else {
      message.warning('请输入4A账号与密码');
    }
  };

  const renderLogin = () => (
    <div className="flex-1 relative z-10 flex flex-col justify-center px-[12%]">
      <Title style={{ fontSize: '46px', marginBottom: '8px', color: '#111827' }}>欢迎使用出入厂自助登记系统</Title>
      <Text className="text-xl text-gray-500">大唐郓城电厂</Text>
      <div className="mt-14 flex flex-col gap-8">
        <div className="login-underline">
          <UserOutlined className="text-blue-400 text-xl" />
          <Input
            variant="borderless"
            placeholder="请输入4A账号"
            value={loginUser}
            onChange={e => setLoginUser(e.target.value)}
          />
        </div>
        <div className="login-underline">
          <LockOutlined className="text-blue-400 text-xl" />
          <Input.Password
            variant="borderless"
            placeholder="请输入密码"
            value={loginPass}
            onChange={e => setLoginPass(e.target.value)}
            onPressEnter={handleLogin}
          />
        </div>
      </div>
      <Button type="primary" size="large" className="mt-12 h-14 w-52 text-xl rounded-lg shadow-md" onClick={handleLogin}>
        登 录
      </Button>
    </div>
  );

  // --- Logout (admin verify) ---
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [logoutPassword, setLogoutPassword] = useState('');

  const handleLogout = () => {
    if (logoutPassword === 'admin') {
      message.success('已安全退出');
      setView('login');
      setLogoutModalVisible(false);
      setLogoutPassword('');
    } else {
      message.error('密码错误，非管理员或当前用户无法退出');
    }
  };

  // --- Home View ---
  const renderHome = () => (
    <div className="flex-1 relative z-10 flex flex-col justify-center px-[12%]">
      <Title style={{ fontSize: '44px', marginBottom: '8px', color: '#111827' }}>欢迎使用出入厂自助登记系统</Title>
      <Text className="text-xl text-gray-500">大唐郓城电厂 · 请选择您需要的自助服务</Text>
      <Space size={48} className="mt-16">
        <button className="big-action-btn primary" onClick={() => setView('registration')}>
          <ScanOutlined />
          云驿APP入厂登记
        </button>
        <button className="big-action-btn" onClick={() => setView('query')}>
          <FileTextOutlined />
          磅单查询
        </button>
      </Space>
    </div>
  );

  // --- Registration View ---
  const [regTimeLeft, setRegTimeLeft] = useState(120);
  const [regStatus, setRegStatus] = useState<'waiting' | 'registering' | 'success'>('waiting');
  const [decodedInfo, setDecodedInfo] = useState<DecodedInfo | null>(null);
  const scannerInputRef = useRef<any>(null);
  const [scanBuffer, setScanBuffer] = useState('');

  // Setup Registration Timer & Focus
  useEffect(() => {
    if (view === 'registration') {
      setRegTimeLeft(120);
      setRegStatus('waiting');
      setDecodedInfo(null);
      setScanBuffer('');

      const timer = setInterval(() => {
        setRegTimeLeft((prev) => {
          if (prev <= 1) {
            setView('home');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto focus scanner input
      setTimeout(() => scannerInputRef.current?.focus(), 100);

      return () => clearInterval(timer);
    }
  }, [view]);

  // Handle Scan Input
  const handleScanInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      processScanData(scanBuffer);
      setScanBuffer('');
    }
  };

  const processScanData = (data: string) => {
    try {
      const decodedStr = decodeURIComponent(escape(atob(data)));
      const info = JSON.parse(decodedStr) as DecodedInfo;
      setDecodedInfo(info);
      setRegStatus('registering');

      // Simulate API registration delay
      setTimeout(() => {
        setRegStatus('success');
        setRegTimeLeft(20); // 20s auto back
      }, 2000);

    } catch (err) {
      message.error('二维码解析失败，请检查二维码是否有效', 3);
      scannerInputRef.current?.focus();
    }
  };

  const renderRegistration = () => (
    <div className="flex-1 relative z-10 flex flex-col px-10 pb-8 pt-2 min-h-0">
      {/* Hidden input to capture scanner hardware strokes */}
      <Input
        className="hidden-scanner-input"
        ref={scannerInputRef}
        value={scanBuffer}
        onChange={e => setScanBuffer(e.target.value)}
        onKeyDown={handleScanInput}
        onBlur={() => {
          if (regStatus === 'waiting' && view === 'registration') {
            scannerInputRef.current?.focus();
          }
        }}
      />

      <div className="flex justify-end mb-3">
        <span className="text-lg font-mono text-gray-500 bg-white/80 px-5 py-1 rounded-full shadow-sm">
          {regTimeLeft}s 后自动返回
        </span>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* 左侧：入厂自助登记信息 */}
        <div className="panel-card flex-[2] px-10 py-8 overflow-y-auto">
          <Title level={3} style={{ marginBottom: '20px' }}>入厂自助登记</Title>

          <Field
            label="*车牌号码"
            value={decodedInfo?.plateNo ?? <span className="text-gray-400 text-base font-normal">待扫码获取</span>}
            editable={!!decodedInfo}
          />

          {decodedInfo ? (
            <>
              <div className="flex items-center justify-between">
                <SectionTitle text="计划信息" />
                {decodedInfo.isCoal ? (
                  <Tag color="volcano" className="text-lg px-3 py-1 rounded-md">运煤车</Tag>
                ) : (
                  <Tag color="blue" className="text-lg px-3 py-1 rounded-md">非煤车</Tag>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-12">
                {decodedInfo.isCoal ? (
                  <>
                    <Field label="供应商" value={decodedInfo.supplier} />
                    <Field label="矿点" value={decodedInfo.mine} />
                    <Field label="煤种" value={decodedInfo.coalType} />
                    <Field label="运输单位" value={decodedInfo.transportUnit} />
                  </>
                ) : (
                  <>
                    <Field label="物资类型" value={decodedInfo.materialType} />
                    <Field label="任务单号" value={decodedInfo.taskOrderNo} />
                    <Field label="发货时间" value={decodedInfo.dispatchTime} />
                    <Field label="司机及电话" value={`${decodedInfo.driverName} / ${decodedInfo.driverPhone}`} />
                  </>
                )}
                <Field label="矿发净重" value={`${decodedInfo.netWeight} 吨`} editable highlight />
                <Field label="矿发毛重" value={`${decodedInfo.grossWeight} 吨`} />
                <Field label="矿发皮重" value={`${decodedInfo.tareWeight} 吨`} />
              </div>

              {regStatus === 'success' && decodedInfo.isCoal && (
                <>
                  <SectionTitle text="入厂引导" />
                  <div className="grid grid-cols-2 gap-x-12">
                    <Field label="采样位" value="1号采样机" />
                    <Field label="过磅位" value="2号衡器" />
                    <Field label="卸煤区域" value="一期C2区" />
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="py-20">
              <Empty description={<span className="text-gray-400 text-lg">完成扫码后将自动展示运单计划信息</span>} />
            </div>
          )}
        </div>

        {/* 右侧：计划信息获取状态 */}
        <div className="panel-card w-[400px] px-8 py-8 flex flex-col">
          <Title level={3} style={{ marginBottom: 0 }}>计划信息获取</Title>

          <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
            {regStatus === 'waiting' && (
              <>
                <div className="scan-illustration">
                  <ScanOutlined />
                </div>
                <Text className="text-xl text-gray-600 px-4">请将二维码放置在扫码窗口下扫描</Text>
                <div className="bg-blue-50 px-5 py-2 rounded-full flex items-center gap-2 border border-blue-100">
                  <span className="text-xl">🔊</span>
                  <Text className="text-lg text-blue-700 font-medium">请将二维码对准扫码窗口</Text>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <Button type="dashed" onClick={() => processScanData(generateMockQRData())}>
                    [调试] 模拟扫码(运煤车)
                  </Button>
                  <Button type="dashed" onClick={() => processScanData(generateMockMaterialQRData())}>
                    [调试] 模拟扫码(物资车)
                  </Button>
                </div>
              </>
            )}

            {regStatus === 'registering' && (
              <>
                <Spin size="large" style={{ transform: 'scale(1.4)' }} />
                <Text className="text-2xl text-blue-600 font-medium mt-4">正在进行登记…</Text>
                <Text type="secondary" className="text-base">请勿离开，登记完成后将自动提示</Text>
              </>
            )}

            {regStatus === 'success' && (
              <>
                <CheckCircleFilled style={{ fontSize: '96px', color: '#52c41a' }} />
                <Title level={2} style={{ color: '#52c41a', margin: 0 }}>登记成功！</Title>
                <div className="bg-green-50 px-5 py-2 rounded-full flex items-center gap-2 border border-green-100">
                  <span className="text-xl">🔊</span>
                  <Text className="text-lg text-green-700 font-medium">登记成功，请通行</Text>
                </div>
                <Text type="secondary" className="text-lg">{regTimeLeft}s 后自动返回首页</Text>
              </>
            )}
          </div>

          <Button
            size="large"
            shape="round"
            className="self-end px-12 h-12 text-lg text-blue-600 border-blue-400"
            onClick={() => setView('home')}
          >
            返回
          </Button>
        </div>
      </div>
    </div>
  );

  // --- Query View ---
  const [queryTimeLeft, setQueryTimeLeft] = useState(60);
  const [currentPage, setCurrentPage] = useState(1);
  const [plateSearch, setPlateSearch] = useState('');
  const pageSize = 6;
  const [expandedCard, setExpandedCard] = useState<any>(null);

  // Setup Query Timer
  useEffect(() => {
    if (view === 'query') {
      setQueryTimeLeft(60);
      setCurrentPage(1);
      setPlateSearch('');

      const timer = setInterval(() => {
        setQueryTimeLeft((prev) => {
          if (prev <= 1) {
            setView('home');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [view]);

  // Reset timer on user interaction
  const resetQueryTimer = useCallback(() => {
    if (view === 'query') setQueryTimeLeft(60);
  }, [view]);

  const renderQuery = () => {
    const filteredSlips = plateSearch
      ? MOCK_SLIPS.filter(s => s.plateNo.includes(plateSearch))
      : MOCK_SLIPS;

    const totalPages = Math.max(1, Math.ceil(filteredSlips.length / pageSize));
    const currentData = filteredSlips.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
      <div className="flex-1 relative z-10 flex flex-col px-10 pb-6 pt-2 h-full min-h-0" onClick={resetQueryTimer}>
        <div className="flex justify-between items-center mb-4">
          <Space size="large" align="center">
            <Title level={2} style={{ margin: 0, color: '#111827' }}>电子磅单查询</Title>
            <Input
              size="large"
              placeholder="请输入车牌号模糊查询"
              prefix={<SearchOutlined className="text-gray-400" />}
              value={plateSearch}
              onChange={e => {
                setPlateSearch(e.target.value);
                setCurrentPage(1);
                resetQueryTimer();
              }}
              style={{ width: 300, borderRadius: '8px' }}
              allowClear
            />
          </Space>
          <div className="text-xl font-mono text-gray-500 bg-white/80 px-6 py-2 rounded-full shadow-sm">
            {queryTimeLeft}s
          </div>
        </div>

        <div className="panel-card border border-blue-100 px-5 py-3 rounded-xl mb-4 flex items-center justify-between">
          <Text className="text-blue-800 text-lg">
            <InfoCircleOutlined className="mr-2" />
            若您刚完成回皮计量，未找到对应磅单请手动刷新获取最新信息
          </Text>
          <Button
            size="large"
            type="primary"
            ghost
            icon={<ReloadOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              message.success('已刷新为最新车辆磅单信息');
              resetQueryTimer();
            }}
          >
            手动刷新
          </Button>
        </div>

        <div className="flex-1 min-h-0">
          <Row gutter={[24, 24]} className="h-full">
            {currentData.map(slip => (
              <Col span={8} key={slip.id} className="h-1/2 pb-4">
                <div className="slip-card" onClick={() => setExpandedCard(slip)}>
                  <div className="slip-card-header">
                    <Text className="text-3xl font-bold text-gray-800">{slip.plateNo}</Text>
                    <Tag color={slip.type === '运煤车' ? 'volcano' : 'blue'} className="text-2xl px-5 py-2 m-0 rounded-md font-bold">
                      {slip.type}
                    </Tag>
                  </div>
                  <div className="slip-card-body flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                       <div className="flex-1 flex flex-col gap-2 pt-1 pr-2">
                         <div className="flex items-center gap-2">
                           <Text type="secondary" className="text-base w-20">入厂时间</Text>
                           <Text className="text-lg font-medium">{slip.entryTime}</Text>
                         </div>
                         {slip.type === '运煤车' ? (
                           <>
                             <div className="flex items-start gap-2">
                               <Text type="secondary" className="text-base w-20">矿点/煤种</Text>
                               <Text className="text-lg font-medium whitespace-normal leading-tight">{slip.mine} / {slip.coalType}</Text>
                             </div>
                             <div className="flex items-start gap-2">
                               <Text type="secondary" className="text-base w-20">供应商</Text>
                               <Text className="text-lg font-medium whitespace-normal leading-tight">{slip.supplier}</Text>
                             </div>
                           </>
                         ) : (
                           <div className="flex items-start gap-2">
                             <Text type="secondary" className="text-base w-20">物资类型</Text>
                             <Text className="text-lg font-medium whitespace-normal leading-tight">{slip.materialType}</Text>
                           </div>
                         )}
                       </div>
                       <div className="ml-2 flex flex-col items-center justify-center bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                         <QRCode value={slip.qrCode} size={90} bordered={false} />
                         <Text type="secondary" className="text-xs mt-1 text-blue-600 font-medium">点击放大</Text>
                       </div>
                     </div>
                     <div className="grid grid-cols-3 gap-2 mt-3 bg-gray-50 p-3 rounded-lg">
                       <div>
                         <div className="text-gray-400 text-sm">毛重(t)</div>
                         <div className="text-lg font-semibold">{slip.grossWeight}</div>
                       </div>
                       <div>
                         <div className="text-gray-400 text-sm">皮重(t)</div>
                         <div className="text-lg font-semibold">{slip.tareWeight}</div>
                       </div>
                       <div>
                         <div className="text-blue-500 text-sm">净重(t)</div>
                         <div className="text-xl font-bold text-blue-600">{slip.netWeight}</div>
                       </div>
                     </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>

        <div className="panel-card flex justify-between items-center mt-4 p-4">
           <Button
            size="large"
            type="primary"
            icon={<HomeOutlined />}
            className="h-16 px-10 text-xl rounded-full shadow-md"
            onClick={(e) => { e.stopPropagation(); setView('home'); }}
          >
            返回首页
          </Button>

          <Space size="large">
             <Text className="text-xl text-gray-500 font-medium mr-4">第 {currentPage} / {totalPages} 页</Text>
             <Button
               icon={<LeftOutlined />}
               className="pagination-btn"
               disabled={currentPage === 1}
               onClick={(e) => { e.stopPropagation(); setCurrentPage(p => p - 1); resetQueryTimer(); }}
             >
               上一页
             </Button>
             <Button
               className="pagination-btn flex flex-row-reverse items-center justify-center gap-2"
               disabled={currentPage === totalPages}
               onClick={(e) => { e.stopPropagation(); setCurrentPage(p => p + 1); resetQueryTimer(); }}
             >
               下一页 <RightOutlined style={{ margin: 0 }} />
             </Button>
          </Space>
        </div>

        <Modal
          open={!!expandedCard}
          footer={null}
          centered
          width={700}
          onCancel={() => setExpandedCard(null)}
          className="expanded-card-modal"
          closeIcon={null}
        >
          {expandedCard && (
            <div className="bg-white rounded-2xl p-0 overflow-hidden" onClick={() => setExpandedCard(null)}>
              <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                 <Title level={2} style={{ color: 'white', margin: 0 }}>{expandedCard.plateNo}</Title>
                 <Tag color="white" className="text-blue-600 text-lg border-0">{expandedCard.type}</Tag>
              </div>
              <div className="p-8 flex gap-8">
                 <div className="flex-1">
                    <Descriptions column={1} size="middle" labelStyle={{ color: '#8c8c8c', fontSize: '18px', width: '100px' }} contentStyle={{ fontSize: '20px', fontWeight: 500 }}>
                      <Descriptions.Item label="入厂时间">{expandedCard.entryTime}</Descriptions.Item>
                      <Descriptions.Item label="毛重">{expandedCard.grossWeight} 吨</Descriptions.Item>
                      <Descriptions.Item label="皮重">{expandedCard.tareWeight} 吨</Descriptions.Item>
                      <Descriptions.Item label="净重">
                        <span className="text-blue-600 font-bold text-2xl">{expandedCard.netWeight} 吨</span>
                      </Descriptions.Item>
                    </Descriptions>
                 </div>
                 <div className="w-48 flex flex-col items-center justify-center border-l border-gray-100 pl-8">
                    <QRCode value={expandedCard.qrCode} size={150} bordered={false} />
                    <Text type="secondary" className="mt-2 text-sm text-center">系统电子磅单<br/>扫码验证真伪</Text>
                 </div>
              </div>
              <div className="bg-gray-50 p-4 text-center text-gray-400">
                点击任意区域关闭
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  };

  // --- Main Layout Render ---
  return (
    <div className="touch-screen-layout">
      <div className="bg-decor" />

      {/* 顶部信息条：日期时间 + 退出 */}
      <div className="top-bar">
        <div className="text-lg font-semibold text-gray-600">
          {view !== 'login' && '大唐郓城电厂 · 出入厂自助登记系统'}
        </div>
        <div className="flex items-center gap-6 text-gray-500 text-lg">
          <span className="font-mono tracking-wide">
            {currentTime.format('YYYY-MM-DD HH:mm')} 星期{WEEK_NAMES[currentTime.day()]}
          </span>
          {view !== 'login' && (
            <Button type="text" className="text-gray-500" icon={<LogoutOutlined />} onClick={() => setLogoutModalVisible(true)}>
              退出
            </Button>
          )}
        </div>
      </div>

      {view === 'login' && renderLogin()}
      {view === 'home' && renderHome()}
      {view === 'registration' && renderRegistration()}
      {view === 'query' && renderQuery()}

      <Modal
        title={<span className="text-xl">退出系统</span>}
        open={logoutModalVisible}
        onCancel={() => {
          setLogoutModalVisible(false);
          setLogoutPassword('');
        }}
        onOk={handleLogout}
        okText="确认退出"
        cancelText="取消"
        okButtonProps={{ size: 'large', danger: true }}
        cancelButtonProps={{ size: 'large' }}
        width={400}
        centered
      >
        <div className="py-6">
          <Text className="block mb-4 text-base">仅允许管理员或当前登录用户退出系统，请输入验证密码：</Text>
          <Input.Password
            size="large"
            placeholder="请输入密码"
            prefix={<LockOutlined />}
            value={logoutPassword}
            onChange={e => setLogoutPassword(e.target.value)}
            onPressEnter={handleLogout}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default Component;
