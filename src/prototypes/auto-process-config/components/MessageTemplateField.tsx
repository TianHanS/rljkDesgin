/**
 * 消息模板：固定占位符按钮，在光标处插入
 */
import React, { useRef } from 'react';
import { Input } from 'antd';
import { PLACEHOLDERS } from '../data';

interface Props {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}

const MessageTemplateField: React.FC<Props> = ({ label, value, disabled, onChange }) => {
  const selRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const remember = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget;
    selRef.current = { start: t.selectionStart, end: t.selectionEnd };
  };

  const insertToken = (token: string) => {
    if (disabled) return;
    const { start, end } = selRef.current;
    const s = Math.min(start, value.length);
    const e = Math.min(end, value.length);
    const next = `${value.slice(0, s)}${token}${value.slice(e)}`;
    onChange(next);
    const pos = s + token.length;
    selRef.current = { start: pos, end: pos };
  };

  return (
    <div className={`apc-msg-field${disabled ? ' is-disabled' : ''}`}>
      <div className="apc-msg-field-label">{label}</div>
      {!disabled && (
        <div className="apc-placeholder-box">
          <div className="apc-placeholder-title">插入占位符（光标处点击按钮）</div>
          <div className="apc-placeholder-btns">
            {PLACEHOLDERS.map((p) => (
              <button key={p.key} type="button" className="apc-ph-btn" onClick={() => insertToken(p.token)}>
                {p.key}
              </button>
            ))}
          </div>
        </div>
      )}
      <Input.TextArea
        rows={3}
        disabled={disabled}
        value={value}
        placeholder={disabled ? '请先启用' : '支持换行；点击上方按钮插入占位符'}
        onChange={(e) => onChange(e.target.value)}
        onSelect={remember}
        onClick={remember}
        onKeyUp={remember}
      />
    </div>
  );
};

export default MessageTemplateField;
