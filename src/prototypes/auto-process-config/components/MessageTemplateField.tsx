/**
 * 消息模板：占位符插入 + 快捷整句输入
 */
import React, { useRef } from 'react';
import { Input } from 'antd';
import { MSG_QUICK_LED, MSG_QUICK_VOICE, PLACEHOLDERS } from '../data';

interface Props {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  kind?: 'led' | 'voice';
  quickOptions?: string[];
}

const MessageTemplateField: React.FC<Props> = ({
  label,
  value,
  disabled,
  onChange,
  kind = 'led',
  quickOptions,
}) => {
  const selRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const presets = quickOptions?.length
    ? quickOptions
    : kind === 'voice'
      ? [...MSG_QUICK_VOICE]
      : [...MSG_QUICK_LED];

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
        <>
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
          <div className="apc-quick-box">
            <div className="apc-placeholder-title">快捷输入</div>
            <div className="apc-placeholder-btns">
              {presets.map((text) => (
                <button
                  key={text}
                  type="button"
                  className={`apc-ph-btn${value === text ? ' is-active' : ''}`}
                  onClick={() => onChange(text === '禁用' ? '' : text)}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <Input.TextArea
        rows={2}
        disabled={disabled}
        value={value}
        placeholder={disabled ? '请先启用' : '支持换行；可用占位符或快捷输入'}
        onChange={(e) => onChange(e.target.value)}
        onSelect={remember}
        onClick={remember}
        onKeyUp={remember}
      />
    </div>
  );
};

export default MessageTemplateField;
