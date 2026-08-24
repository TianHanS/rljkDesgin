import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tree, Input, Button, Modal, Radio, InputNumber, Switch, message, Tooltip } from 'antd';
import type { TreeDataNode } from 'antd';
import { SearchOutlined, PlayCircleOutlined, PauseCircleOutlined, ExpandOutlined, CloseOutlined, CameraOutlined, AudioMutedOutlined } from '@ant-design/icons';
import './style.css';

/**
 * @name 视频监控
 */

const initialTreeData: TreeDataNode[] = [
  {
    title: '江苏国信沙洲发电有限公司',
    key: 'root',
    children: [
      {
        title: '弘冉测温',
        key: 'hr',
        children: [
          {
            title: 'C35A',
            key: 'C35A',
            children: [
              { title: 'C35A头部驱动', key: 'C35A-1', isLeaf: true },
              { title: 'C35A尾部滚筒', key: 'C35A-2', isLeaf: true },
            ]
          },
          {
            title: 'C35AB',
            key: 'C35AB',
            children: [
              { title: 'C35AB小车导料槽出口', key: 'C35AB-1', isLeaf: true },
            ]
          },
          {
            title: 'C35B',
            key: 'C35B',
            children: [
               { title: 'C35B头部驱动', key: 'C35B-1', isLeaf: true },
            ]
          },
        ]
      },
      {
        title: '海康监控',
        key: 'hk',
        children: [
          {
            title: 'C35A',
            key: 'hk-C35A',
            children: [
              { title: 'C35A头部', key: 'hk-C35A-1', isLeaf: true },
              { title: 'C35A事故料斗导料槽出口', key: 'hk-C35A-2', isLeaf: true },
              { title: 'C35A中心柱导料槽出口', key: 'hk-C35A-3', isLeaf: true },
            ]
          },
          {
            title: 'C35B',
            key: 'hk-C35B',
            children: [
              { title: 'C35B头部', key: 'hk-C35B-1', isLeaf: true },
              { title: 'C35B中心柱导料槽出口', key: 'hk-C35B-2', isLeaf: true },
              { title: 'C35B事故料斗导料槽出口', key: 'hk-C35B-3', isLeaf: true },
            ]
          },
          {
            title: 'C36AB',
            key: 'hk-C36AB',
            children: [
              { title: 'C36AB尾部导料槽出口', key: 'hk-C36AB-1', isLeaf: true },
              { title: 'C36AB头部', key: 'hk-C36AB-2', isLeaf: true },
            ]
          }
        ]
      }
    ]
  }
];

const dataList: { key: React.Key; title: string }[] = [];
const generateList = (data: TreeDataNode[]) => {
  for (let i = 0; i < data.length; i++) {
    const node = data[i];
    const { key, title } = node;
    dataList.push({ key, title: title as string });
    if (node.children) {
      generateList(node.children);
    }
  }
};
generateList(initialTreeData);

const getParentKey = (key: React.Key, tree: TreeDataNode[]): React.Key => {
  let parentKey: React.Key;
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    if (node.children) {
      if (node.children.some((item) => item.key === key)) {
        parentKey = node.key;
      } else if (getParentKey(key, node.children)) {
        parentKey = getParentKey(key, node.children);
      }
    }
  }
  return parentKey!;
};

interface VideoWindow {
  id: number;
  cameraId: string | null;
  cameraName: string | null;
  isPlaying: boolean;
}

export default function Component() {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['root', 'hk', 'hk-C35A']);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  const [splitMode, setSplitMode] = useState<1 | 4 | 9>(4);
  const [videoWindows, setVideoWindows] = useState<VideoWindow[]>(
    Array.from({ length: 4 }).map((_, i) => ({ id: i + 1, cameraId: null, cameraName: null, isPlaying: false }))
  );

  const [isCarouselModalOpen, setIsCarouselModalOpen] = useState(false);
  const [carouselConfig, setCarouselConfig] = useState({ split: 9, interval: 30, autoLocate: true });
  const [isCarouselActive, setIsCarouselActive] = useState(false);
  const [hasAlarm, setHasAlarm] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  
  const carouselTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const alarmTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      // Force render to update time if needed, but here we just use static layout or simple clock
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
    setAutoExpandParent(false);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const newExpandedKeys = dataList
      .map((item) => {
        if (item.title.indexOf(value) > -1) {
          return getParentKey(item.key, initialTreeData);
        }
        return null;
      })
      .filter((item, i, self) => item && self.indexOf(item) === i);
    setExpandedKeys(newExpandedKeys as React.Key[]);
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  const treeData = useMemo(() => {
    const loop = (data: TreeDataNode[]): TreeDataNode[] =>
      data.map((item) => {
        const strTitle = item.title as string;
        const index = strTitle.indexOf(searchValue);
        const beforeStr = strTitle.substring(0, index);
        const afterStr = strTitle.slice(index + searchValue.length);
        const title =
          index > -1 ? (
            <span>
              {beforeStr}
              <span className="text-cyan-400 font-bold">{searchValue}</span>
              {afterStr}
            </span>
          ) : (
            <span>{strTitle}</span>
          );
        if (item.children) {
          return { title, key: item.key, children: loop(item.children), isLeaf: item.isLeaf };
        }
        return { title, key: item.key, isLeaf: item.isLeaf };
      });
    return loop(initialTreeData);
  }, [searchValue]);

  const onSelect = (keys: React.Key[], info: any) => {
    if (!info.node.isLeaf) return;
    setSelectedKeys(keys);
    
    const cameraId = info.node.key as string;
    const cameraName = dataList.find(d => d.key === cameraId)?.title || '';

    // Check if already playing
    if (videoWindows.some(w => w.cameraId === cameraId)) {
      message.warning('监控画面已存在！');
      return;
    }

    // Find first empty window
    const emptyIndex = videoWindows.findIndex(w => w.cameraId === null);
    if (emptyIndex !== -1) {
      const newWindows = [...videoWindows];
      newWindows[emptyIndex] = { ...newWindows[emptyIndex], cameraId, cameraName, isPlaying: true };
      setVideoWindows(newWindows);
    } else {
      // If full, replace the first one
      const newWindows = [...videoWindows];
      newWindows[0] = { ...newWindows[0], cameraId, cameraName, isPlaying: true };
      setVideoWindows(newWindows);
    }
  };

  const changeSplitMode = (mode: 1 | 4 | 9) => {
    setSplitMode(mode);
    setVideoWindows(prev => {
      const newWindows = Array.from({ length: mode }).map((_, i) => {
        if (i < prev.length) return prev[i];
        return { id: i + 1, cameraId: null, cameraName: null, isPlaying: false };
      });
      // Clear out cameras that no longer fit
      return newWindows;
    });
  };

  const closeWindow = (id: number) => {
    setVideoWindows(prev => prev.map(w => w.id === id ? { ...w, cameraId: null, cameraName: null, isPlaying: false } : w));
  };

  const closeAll = () => {
    setVideoWindows(prev => prev.map(w => ({ ...w, cameraId: null, cameraName: null, isPlaying: false })));
  };

  const togglePlay = (id: number) => {
    setVideoWindows(prev => prev.map(w => w.id === id ? { ...w, isPlaying: !w.isPlaying } : w));
  };

  const startCarousel = () => {
    setIsCarouselModalOpen(false);
    setIsCarouselActive(true);
    changeSplitMode(carouselConfig.split as 1 | 4 | 9);
    
    message.info({ content: '按【Esc】可退出轮播', duration: 3 });

    // Simulate finding all cameras
    const allCameras = dataList.filter(d => {
      const node = findNode(initialTreeData, d.key);
      return node?.isLeaf;
    });

    let currentIndex = 0;
    
    const loadCameras = () => {
      setVideoWindows(prev => {
        return prev.map((w, i) => {
          const cam = allCameras[(currentIndex + i) % allCameras.length];
          return { ...w, cameraId: cam.key as string, cameraName: cam.title, isPlaying: true };
        });
      });
      currentIndex = (currentIndex + carouselConfig.split) % allCameras.length;
      setCountdown(carouselConfig.interval);
    };

    loadCameras();
    
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          loadCameras();
          return carouselConfig.interval;
        }
        return prev - 1;
      });
    }, 1000);

    if (carouselConfig.autoLocate) {
      // Simulate alarm after 5 seconds
      alarmTimerRef.current = setTimeout(() => {
        setHasAlarm(true);
        const alarmCam = allCameras[1]; // Pick a random camera
        message.error({
          content: `03-30 15:22:23，C35A，${alarmCam.title}，发生 火灾报警！`,
          duration: 0,
          key: 'alarm'
        });
        
        // Force display alarm camera in first window
        setVideoWindows(prev => {
          const newWindows = [...prev];
          newWindows[0] = { ...newWindows[0], cameraId: alarmCam.key as string, cameraName: alarmCam.title, isPlaying: true };
          return newWindows;
        });

      }, 5000);
    }
  };

  const stopCarousel = () => {
    setIsCarouselActive(false);
    setHasAlarm(false);
    if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current);
    message.destroy('alarm');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCarouselActive) {
        stopCarousel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCarouselActive]);

  const findNode = (data: TreeDataNode[], key: React.Key): TreeDataNode | null => {
    for (const node of data) {
      if (node.key === key) return node;
      if (node.children) {
        const found = findNode(node.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <div className={`flex flex-col h-screen bg-[#061125] text-white font-sans ${isCarouselActive ? (hasAlarm ? 'fixed inset-0 z-50 border-4 border-red-600' : 'fixed inset-0 z-50') : ''}`}>
      {/* Header */}
      {!isCarouselActive && (
        <div className="flex items-center justify-between px-6 py-4 bg-[#0a1930] border-b border-[#1c3a66]">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-wider m-0">输煤安全监测</h1>
            <span className="text-xs text-blue-300">Coal transportation safety monitoring</span>
          </div>
          <div className="flex space-x-2">
            {['输煤总况', '区域监测', '设备监控', '视频监控', '事件查询'].map(tab => (
              <div 
                key={tab} 
                className={`px-4 py-1 cursor-pointer ${tab === '视频监控' ? 'bg-[#1890ff] text-white rounded-full' : 'text-blue-200 hover:text-white'}`}
              >
                {tab}
              </div>
            ))}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold">15:22:23</span>
            <span className="text-xs text-gray-400">30/03/2026 星期一</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden p-4 space-x-4">
        {/* Left Sidebar */}
        {!isCarouselActive && (
          <div className="w-[280px] flex flex-col bg-[#0a1930] border border-[#1c3a66] rounded">
            <div className="p-3 border-b border-[#1c3a66]">
              <h2 className="text-sm font-bold text-blue-200 m-0 border-l-2 border-[#1890ff] pl-2">视频监控</h2>
            </div>
            <div className="p-3">
              <Input
                placeholder="摄像头名称"
                prefix={<SearchOutlined className="text-gray-400" />}
                onChange={onChange}
                className="bg-[#0f2546] border-[#1c3a66] text-white placeholder-gray-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-tree-wrapper">
              <Tree
                onExpand={onExpand}
                expandedKeys={expandedKeys}
                autoExpandParent={autoExpandParent}
                onSelect={onSelect}
                selectedKeys={selectedKeys}
                treeData={treeData}
                className="bg-transparent text-gray-300"
              />
            </div>
          </div>
        )}

        {/* Right Content */}
        <div className="flex-1 flex flex-col space-y-4 relative">
          {/* Controls */}
          {!isCarouselActive && (
            <div className="flex justify-between items-center bg-[#0a1930] p-2 border border-[#1c3a66] rounded">
              <div className="flex border border-[#1c3a66] rounded overflow-hidden">
                {[1, 4, 9].map(num => (
                  <div
                    key={num}
                    className={`px-6 py-1 cursor-pointer text-sm ${splitMode === num ? 'bg-[#1890ff] text-white' : 'text-blue-200 hover:bg-[#1c3a66]'}`}
                    onClick={() => changeSplitMode(num as 1 | 4 | 9)}
                  >
                    {num === 1 ? '单视频' : `${num}视频`}
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <Tooltip title="全屏多分屏轮播测温区域，并自动定位报警输煤段。">
                  <Button type="primary" onClick={() => setIsCarouselModalOpen(true)}>自动轮播</Button>
                </Tooltip>
                <Button onClick={closeAll} className="bg-[#1c3a66] border-none text-white hover:text-white hover:bg-[#2c5282]">全部关闭</Button>
              </div>
            </div>
          )}

          {/* Video Grid */}
          <div className={`flex-1 grid gap-2 ${splitMode === 1 ? 'grid-cols-1' : splitMode === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {videoWindows.map((window) => (
              <div key={window.id} className={`relative bg-[#000] border ${window.cameraId === 'hk-C35A-1' && hasAlarm ? 'border-red-500' : 'border-[#1c3a66]'} rounded flex items-center justify-center overflow-hidden`}>
                {window.cameraId ? (
                  <>
                    {/* Simulated Video Content */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#112] to-[#224] opacity-50"></div>
                    <div className="z-10 flex flex-col items-center">
                      <CameraOutlined className="text-4xl text-gray-500 mb-2" />
                      <span className="text-gray-300 text-sm">{window.cameraName}</span>
                      {!window.isPlaying && <span className="text-red-400 text-xs mt-1">已暂停</span>}
                    </div>
                    
                    {/* Video Overlay Info */}
                    <div className="absolute top-2 left-2 text-xs text-white opacity-70">
                      2026-03-30 15:22:23
                    </div>
                    
                    {/* Bottom Controls */}
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-black bg-opacity-60 flex items-center justify-between px-2">
                      <span className="text-xs text-white">86.60KB/s</span>
                      <div className="flex space-x-3 text-white">
                        <span className="cursor-pointer hover:text-[#1890ff]" onClick={() => togglePlay(window.id)}>
                          {window.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                        </span>
                        <AudioMutedOutlined className="cursor-pointer hover:text-[#1890ff]" />
                        <CameraOutlined className="cursor-pointer hover:text-[#1890ff]" />
                        <ExpandOutlined className="cursor-pointer hover:text-[#1890ff]" />
                        <CloseOutlined className="cursor-pointer hover:text-red-500" onClick={() => closeWindow(window.id)} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-cyan-600 text-lg">{window.id}号视频窗口</div>
                )}
              </div>
            ))}
          </div>

          {/* Carousel Countdown Overlay */}
          {isCarouselActive && (
            <div className="absolute top-4 right-4 bg-black bg-opacity-70 px-4 py-2 rounded-lg border border-[#1890ff] shadow-[0_0_10px_rgba(24,144,255,0.5)] z-50 pointer-events-none">
              <span className="text-[#1890ff] font-bold text-lg">{countdown}</span>
              <span className="text-gray-300 text-sm ml-1">s 后切换</span>
            </div>
          )}
        </div>
      </div>

      <Modal
        title="自动轮播"
        open={isCarouselModalOpen}
        onOk={startCarousel}
        onCancel={() => setIsCarouselModalOpen(false)}
        okText="确认"
        cancelText="取消"
        wrapClassName="dark-modal"
      >
        <div className="text-gray-800 mb-4">确认进行自动轮播？</div>
        <div className="space-y-4">
          <div className="flex items-center">
            <span className="w-24 text-right mr-4 text-gray-700">轮播分屏:</span>
            <Radio.Group value={carouselConfig.split} onChange={e => setCarouselConfig({...carouselConfig, split: e.target.value})}>
              <Radio value={4}>4分屏</Radio>
              <Radio value={9}>9分屏</Radio>
              <Radio value={16}>16分屏</Radio>
            </Radio.Group>
          </div>
          <div className="flex items-center">
            <span className="w-24 text-right mr-4 text-gray-700">轮播定时(秒):</span>
            <InputNumber 
              min={1} 
              value={carouselConfig.interval} 
              onChange={val => setCarouselConfig({...carouselConfig, interval: val || 30})} 
            />
          </div>
          <div className="flex items-center">
            <span className="w-24 text-right mr-4 text-gray-700">报警自动定位:</span>
            <Switch 
              checked={carouselConfig.autoLocate} 
              onChange={val => setCarouselConfig({...carouselConfig, autoLocate: val})} 
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 pl-28">
            当发生火灾预警、报警时，自动按报警等级优先级，定位报警区域画面监控！
          </div>
        </div>
      </Modal>
    </div>
  );
}
