/**
 * 云驿二维码扫描：请扫码动画 → 识别成功回填车辆信息
 */
import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal, Spin } from 'antd';
import { CheckCircleFilled, ScanOutlined } from '@ant-design/icons';
import { yunyiSample } from '../data';

type Phase = 'scanning' | 'success';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (raw: string) => void;
}

const YunyiScanModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [phase, setPhase] = useState<Phase>('scanning');
  const inputRef = useRef<HTMLInputElement>(null);
  const [buffer, setBuffer] = useState('');

  useEffect(() => {
    if (!open) {
      setPhase('scanning');
      setBuffer('');
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  const finish = (raw: string) => {
    setPhase('success');
    window.setTimeout(() => {
      onSuccess(raw);
      onClose();
    }, 650);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && buffer.trim()) {
      finish(buffer.trim());
      setBuffer('');
    }
  };

  const simulate = () => finish(yunyiSample());

  return (
    <Modal
      title="扫描云驿二维码"
      open={open}
      onCancel={onClose}
      footer={null}
      width={460}
      destroyOnHidden
      centered
    >
      <input
        ref={inputRef}
        className="mer-hidden-scan-input"
        value={buffer}
        aria-label="扫码枪输入"
        onChange={(e) => setBuffer(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {phase === 'scanning' ? (
        <div className="mer-yunyi-scan">
          <div className="mer-yunyi-scan-frame">
            <span className="mer-yunyi-scan-corner tl" />
            <span className="mer-yunyi-scan-corner tr" />
            <span className="mer-yunyi-scan-corner bl" />
            <span className="mer-yunyi-scan-corner br" />
            <span className="mer-yunyi-scan-line" />
            <ScanOutlined className="mer-yunyi-scan-icon" />
          </div>
          <p className="mer-yunyi-scan-title">请将二维码对准扫码窗口</p>
          <p className="mer-yunyi-scan-desc">扫码枪识别成功后将自动加载车辆与矿发信息</p>
          <Spin size="small" />
          <Button type="dashed" size="small" className="mer-yunyi-scan-demo" onClick={simulate}>
            模拟扫码成功（蒙A90005）
          </Button>
        </div>
      ) : (
        <div className="mer-yunyi-scan mer-yunyi-scan-ok">
          <CheckCircleFilled className="mer-yunyi-scan-ok-icon" />
          <p>扫码识别成功，正在加载车辆信息…</p>
        </div>
      )}
    </Modal>
  );
};

export default YunyiScanModal;
