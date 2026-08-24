/**
 * @name 设备实时监测
 * @mode axure
 *
 * 参考资料：
 * - /rules/development-standards.md
 * - /skills/axure-export-workflow/SKILL.md
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layout, Tree, Input, Tabs, Card, Row, Col, Statistic, DatePicker, Select, Space, Typography, Tag, Empty, Spin, Button, Radio, Table, Tooltip } from 'antd';
import { SearchOutlined, SlidersOutlined, LineChartOutlined, DesktopOutlined, BarChartOutlined, TableOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import './style.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// --- Mock Data ---
const mockTreeData: DataNode[] = [
  {
    title: '国信沙洲电厂',
    key: 'plant-1',
    children: [
      {
        title: '输煤程控',
        key: 'system-1',
        children: [
          {
            title: 'C31AB',
            key: 'area-1',
            children: [
              { title: '1轮头红外探测', key: 'device-1', isLeaf: true },
              { title: '2皮带红外探测', key: 'device-2', isLeaf: true },
              { title: '3皮带红外探测', key: 'device-3', isLeaf: true },
              { title: '4皮带红外探测', key: 'device-4', isLeaf: true },
              { title: '5皮带红外探测', key: 'device-5', isLeaf: true },
              { title: '1#广播', key: 'device-6', isLeaf: true },
              { title: '2#广播', key: 'device-7', isLeaf: true },
            ],
          },
          {
            title: 'C32AB',
            key: 'area-2',
            children: [
              { title: '1#轮尾分布测温', key: 'device-8', isLeaf: true },
              { title: '2#轮尾分布测温', key: 'device-9', isLeaf: true },
            ]
          }
        ],
      },
    ],
  },
];

interface MetricInfo {
  id: string;
  name: string;
  category: string;
  pointType: '遥信' | '遥测';
  unit: string;
  value: number;
}

const mockMetricsTemplate: MetricInfo[] = [
  { id: 'm1', name: '环境温度', category: '温度', pointType: '遥测', unit: '℃', value: 25.4 },
  { id: 'm2', name: '探测器内部温度', category: '温度', pointType: '遥测', unit: '℃', value: 38.2 },
  { id: 'm3', name: '红外线强度', category: '辐射', pointType: '遥测', unit: 'W/m²', value: 105.0 },
  { id: 'm4', name: '工作电压', category: '电气', pointType: '遥测', unit: 'V', value: 24.1 },
  { id: 'm5', name: '工作电流', category: '电气', pointType: '遥测', unit: 'mA', value: 120.5 },
  { id: 'm6', name: '设备在线状态', category: '通讯', pointType: '遥信', unit: '', value: 1 },
  { id: 'm7', name: '报警状态', category: '报警', pointType: '遥信', unit: '', value: 0 },
  { id: 'm8', name: '信号信噪比', category: '未分类', pointType: '遥测', unit: 'dB', value: 45 },
];

const generateMockHistoryData = (metrics: MetricInfo[], startTime: Dayjs, endTime: Dayjs, stepSeconds: number) => {
  const result: Record<string, { time: string, value: number }[]> = {};
  metrics.forEach(m => {
    result[m.id] = [];
    let current = startTime.clone();
    let baseVal = m.value;
    while (current.isBefore(endTime) || current.isSame(endTime)) {
      // Add some random noise
      const noise = (Math.random() - 0.5) * (baseVal * 0.1); 
      result[m.id].push({
        time: current.format('YYYY-MM-DD HH:mm:ss'),
        value: Number((baseVal + noise).toFixed(2))
      });
      current = current.add(stepSeconds, 'second');
    }
  });
  return result;
};


// --- Components ---

// ECharts Wrapper Component
const ReactECharts: React.FC<{
  option: echarts.EChartsOption;
  style?: React.CSSProperties;
}> = ({ option, style }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }
      chartInstance.current.setOption(option);
    }
    
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [option]);

  return <div ref={chartRef} style={{ width: '100%', height: '350px', ...style }} />;
};


// Main Page
const Component = function DeviceRealtimeMonitor() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>('device-1');
  const [deviceTitle, setDeviceTitle] = useState<string>('1轮头红外探测');
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'realtime' | 'curve'>('realtime');
  
  // Real-time Tab State
  const [realtimeMetrics, setRealtimeMetrics] = useState<MetricInfo[]>(mockMetricsTemplate);
  const [realtimeGroupMode, setRealtimeGroupMode] = useState<'category' | 'pointType'>('category');
  const [metricSearchValue, setMetricSearchValue] = useState('');
  
  // Curve Tab State
  const [activeCurveTab, setActiveCurveTab] = useState<string>('');
  const [customSelectedMetrics, setCustomSelectedMetrics] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(2, 'hour'), dayjs()]);
  const [step, setStep] = useState<number>(5);
  const [queryTrigger, setQueryTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [historyData, setHistoryData] = useState<Record<string, { time: string, value: number }[]>>({});
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Search Tree
  const [searchValue, setSearchValue] = useState('');

  // 1. Initial Load & WebSocket Simulation for Real-time Data
  useEffect(() => {
    // In a real app, this would connect to a WebSocket.
    // We simulate it with a setInterval that slightly updates the metric values.
    const timer = setInterval(() => {
      setRealtimeMetrics(prev => prev.map(metric => {
        const noise = (Math.random() - 0.5) * (metric.value * 0.02 || 1); // 2% fluctuation
        return {
          ...metric,
          value: Number((metric.value + noise).toFixed(2))
        };
      }));
    }, 2000);

    return () => clearInterval(timer);
  }, [selectedDevice]);

  // 2. Load History Data
  useEffect(() => {
    if (!selectedDevice) return;
    
    setLoadingHistory(true);
    // Simulate API Call
    setTimeout(() => {
      const data = generateMockHistoryData(mockMetricsTemplate, timeRange[0], timeRange[1], step);
      setHistoryData(data);
      setLoadingHistory(false);
    }, 600);
    
  }, [selectedDevice, queryTrigger]);


  // 3. Tree Selection Handler
  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0 && info.node.isLeaf) {
      setSelectedDevice(selectedKeys[0] as string);
      setDeviceTitle(info.node.title as string);
      
      // Reset metrics base on some random logic to look different per device
      const randomizedMetrics = mockMetricsTemplate.map(m => ({
        ...m,
        value: Number((m.value * (0.8 + Math.random() * 0.4)).toFixed(2))
      }));
      setRealtimeMetrics(randomizedMetrics);
      
      // History data will auto-reload due to useEffect dependency on selectedDevice
    }
  };

  // Group metrics by selected grouping mode and apply search filter
  const realtimeGroupedMetrics = useMemo(() => {
    const groups: Record<string, MetricInfo[]> = {};
    const filteredMetrics = realtimeMetrics.filter(m => 
      m.name.toLowerCase().includes(metricSearchValue.toLowerCase())
    );
    
    filteredMetrics.forEach(m => {
      const groupKey = realtimeGroupMode === 'category' ? (m.category || '未分类') : m.pointType;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(m);
    });
    return groups;
  }, [realtimeMetrics, realtimeGroupMode, metricSearchValue]);

  // Render History Charts
  const renderHistoryCharts = () => {
    if (loadingHistory) {
      return (
        <div className="flex items-center justify-center h-64">
          <Spin size="large" tip="加载历史数据中..." />
        </div>
      );
    }
    
    // Group metrics by category for charts
    const metricGroups: Record<string, MetricInfo[]> = {};
    mockMetricsTemplate.forEach(m => {
      const cat = m.category || '未分类';
      if (!metricGroups[cat]) metricGroups[cat] = [];
      metricGroups[cat].push(m);
    });

    const renderList = (metrics: MetricInfo[]) => {
      const dataSource: any[] = [];
      const timePoints = metrics.length > 0 && historyData[metrics[0].id] ? historyData[metrics[0].id].map(d => d.time) : [];
      
      timePoints.forEach((time, index) => {
        const row: any = { key: time, time };
        metrics.forEach(m => {
           row[m.id] = historyData[m.id]?.[index]?.value ?? '-';
        });
        dataSource.push(row);
      });

      const columns = [
        { title: '时间', dataIndex: 'time', key: 'time', width: 200 },
        ...metrics.map(m => ({
          title: `${m.name}${m.unit ? ` (${m.unit})` : ''}`,
          dataIndex: m.id,
          key: m.id,
        }))
      ];

      return (
        <Table 
          dataSource={dataSource} 
          columns={columns} 
          size="middle" 
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      );
    };

    const renderChart = (metrics: MetricInfo[], title: string) => {
      const series = metrics.map(m => {
        const dataPoints = historyData[m.id] || [];
        return {
          name: m.name,
          type: 'line',
          showSymbol: false,
          smooth: true,
          data: dataPoints.map(dp => [dp.time, dp.value]),
        };
      });

      const option: echarts.EChartsOption = {
        title: {
          text: title,
          textStyle: { fontSize: 16, fontWeight: 500, color: '#262626' }
        },
        tooltip: {
          trigger: 'axis',
        },
        legend: {
          data: metrics.map(m => m.name),
          top: 0,
          right: 0,
          type: 'scroll'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%',
          containLabel: true
        },
        toolbox: {
          feature: {
            dataZoom: { yAxisIndex: 'none' },
            restore: {},
            saveAsImage: {}
          }
        },
        xAxis: {
          type: 'time',
          boundaryGap: false,
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: `{value}`
          }
        },
        dataZoom: [
          {
            type: 'inside',
            start: 0,
            end: 100
          },
          {
            type: 'slider',
            start: 0,
            end: 100,
            bottom: 0
          }
        ],
        series: series as any
      };

      return <ReactECharts option={option} />;
    };

    const chartItems = Object.entries(metricGroups).map(([category, metrics]) => {
      const unit = metrics[0]?.unit || '';
      return {
        key: category,
        label: category,
        children: (
          <Card className="mb-4 shadow-sm border-gray-100">
            {viewMode === 'list' 
              ? renderList(metrics)
              : renderChart(metrics, `${category}参数曲线${unit ? ` (${unit})` : ''}`)}
          </Card>
        )
      };
    });

    const customOptions = mockMetricsTemplate.map(m => ({ label: `${m.name} (${m.category})`, value: m.id }));
    const customMetrics = mockMetricsTemplate.filter(m => customSelectedMetrics.includes(m.id));
    
    chartItems.unshift({
      key: 'custom',
      label: '自定义分析',
      children: (
        <Card className="mb-4 shadow-sm border-gray-100">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <Text className="whitespace-nowrap">选择对比指标：</Text>
            <Select 
              mode="multiple"
              placeholder="请选择需要对比的指标"
              style={{ flex: 1, minWidth: 200 }}
              value={customSelectedMetrics}
              onChange={setCustomSelectedMetrics}
              options={customOptions}
              maxTagCount="responsive"
            />
          </div>
          {customMetrics.length === 0 ? (
             <Empty description="请选择指标以生成对比分析" className="py-10" />
          ) : (
             viewMode === 'list' ? renderList(customMetrics) : renderChart(customMetrics, '自定义对比曲线')
          )}
        </Card>
      )
    });

    const currentTabKey = activeCurveTab || (chartItems.length > 1 ? chartItems[1].key : 'custom');

    return (
      <Tabs
        type="card"
        activeKey={currentTabKey}
        onChange={setActiveCurveTab}
        items={chartItems}
        className="mt-4"
      />
    );
  };

  return (
    <Layout className="device-monitor-layout">
      {/* Sidebar - Device Tree */}
      <Sider width={280} className="device-monitor-sidebar" theme="light">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <Space>
            <DesktopOutlined className="text-blue-500 text-lg" />
            <Text strong className="text-base">设备监测</Text>
          </Space>
        </div>
        <div className="p-3">
          <Input 
            placeholder="请输入设备名称" 
            prefix={<SearchOutlined className="text-gray-400" />} 
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            className="rounded-md"
          />
        </div>
        <div className="device-monitor-tree-container">
          <Tree
            className="device-monitor-tree"
            showIcon
            defaultExpandAll
            defaultSelectedKeys={['device-1']}
            onSelect={handleSelect}
            treeData={mockTreeData}
            titleRender={(node) => {
              const title = node.title as string;
              const index = title.indexOf(searchValue);
              const beforeStr = title.substring(0, index);
              const afterStr = title.slice(index + searchValue.length);
              return index > -1 && searchValue ? (
                <span>
                  {beforeStr}
                  <span className="text-blue-500 bg-blue-50 px-1 rounded">{searchValue}</span>
                  {afterStr}
                </span>
              ) : (
                <span>{title}</span>
              );
            }}
          />
        </div>
      </Sider>

      {/* Main Content */}
      <Content className="device-monitor-content relative">
        {!selectedDevice ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Empty description="请在左侧选择要监控的设备" />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm flex flex-col h-full overflow-hidden">
            {/* Header Area */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <Space size="middle">
                <Title level={4} style={{ margin: 0 }}>{deviceTitle}</Title>
                <Tag color="success" className="rounded-full px-3">实时监控中</Tag>
              </Space>
            </div>

            {/* Tabs Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/30 p-6">
              <Tabs 
                activeKey={activeTab}
                onChange={(k) => setActiveTab(k as 'realtime' | 'curve')}
                size="large"
                items={[
                  {
                    key: 'realtime',
                    label: <span className="flex items-center gap-2"><SlidersOutlined />实时数据</span>,
                    children: (
                      <div className="pt-2 pb-6">
                        <div className="flex justify-between mb-4">
                          <Input
                            placeholder="输入指标名称搜索"
                            prefix={<SearchOutlined className="text-gray-400" />}
                            value={metricSearchValue}
                            onChange={e => setMetricSearchValue(e.target.value)}
                            style={{ width: 250 }}
                            allowClear
                          />
                          <Radio.Group value={realtimeGroupMode} onChange={e => setRealtimeGroupMode(e.target.value)}>
                            <Radio.Button value="category">按参数分类</Radio.Button>
                            <Radio.Button value="pointType">按点位类型</Radio.Button>
                          </Radio.Group>
                        </div>
                        {Object.entries(realtimeGroupedMetrics).map(([groupName, metrics]) => (
                          <div key={groupName} className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-1 h-4 bg-blue-500 rounded"></div>
                              <Text strong className="text-base text-gray-700">{groupName}</Text>
                            </div>
                            <Table
                              dataSource={metrics}
                              rowKey="id"
                              pagination={false}
                              size="middle"
                              bordered
                              columns={[
                                { title: '指标名称', dataIndex: 'name', key: 'name', width: 250 },
                                { title: '分类', dataIndex: 'category', key: 'category', width: 150 },
                                { 
                                  title: '点位类型', 
                                  dataIndex: 'pointType', 
                                  key: 'pointType', 
                                  width: 150,
                                  render: (val) => <Tag color={val === '遥信' ? 'cyan' : 'blue'}>{val}</Tag> 
                                },
                                { 
                                  title: '当前读数', 
                                  key: 'value', 
                                  render: (_, record) => {
                                    if (record.pointType === '遥信') {
                                      const isNormal = record.value === 1 || record.value > 0.5;
                                      return <Tag color={isNormal ? 'success' : 'default'}>{isNormal ? '正常' : '异常'}</Tag>;
                                    }
                                    return <Text strong className="text-blue-500 text-lg">{record.value} <span className="text-gray-400 font-normal text-xs">{record.unit}</span></Text>;
                                  } 
                                },
                                {
                                  title: '操作',
                                  key: 'action',
                                  width: 80,
                                  render: (_, record) => (
                                    <Tooltip title="查看监测曲线">
                                      <Button 
                                        type="text" 
                                        icon={<LineChartOutlined className="text-blue-500" />} 
                                        onClick={() => {
                                          setCustomSelectedMetrics([record.id]);
                                          setActiveCurveTab('custom');
                                          setActiveTab('curve');
                                        }}
                                      />
                                    </Tooltip>
                                  )
                                }
                              ]}
                            />
                          </div>
                        ))}
                      </div>
                    )
                  },
                  {
                    key: 'curve',
                    label: <span className="flex items-center gap-2"><LineChartOutlined />参数曲线</span>,
                    children: (
                      <div className="pt-2 pb-6">
                        <Card className="mb-4 bg-gray-50/50 border-gray-100" bodyStyle={{ padding: '16px' }}>
                          <div className="flex justify-between items-center flex-wrap gap-4">
                            <Space wrap size="large">
                              <Space>
                                <Text className="text-gray-500">时间范围：</Text>
                                <RangePicker 
                                  showTime 
                                  value={timeRange} 
                                  onChange={(dates) => {
                                    if (dates && dates[0] && dates[1]) {
                                      setTimeRange([dates[0], dates[1]]);
                                    }
                                  }}
                                />
                              </Space>
                              <Space>
                                <Text className="text-gray-500">数据步长：</Text>
                                <Select
                                  value={step}
                                  onChange={setStep}
                                  style={{ width: 100 }}
                                  options={[
                                    { value: 1, label: '1s' },
                                    { value: 5, label: '5s' },
                                    { value: 10, label: '10s' },
                                    { value: 30, label: '30s' },
                                    { value: 60, label: '60s' },
                                    { value: 120, label: '120s' },
                                  ]}
                                />
                              </Space>
                              <Button type="primary" onClick={() => setQueryTrigger(prev => prev + 1)}>
                                查询
                              </Button>
                            </Space>
                            <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                              <Radio.Button value="chart"><BarChartOutlined /> 图表</Radio.Button>
                              <Radio.Button value="list"><TableOutlined /> 列表</Radio.Button>
                            </Radio.Group>
                          </div>
                        </Card>
                        
                        {/* Render individual charts grouped by category */}
                        {renderHistoryCharts()}
                      </div>
                    )
                  }
                ]}
              />
            </div>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default Component;
