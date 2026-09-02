/**
 * 环节消息通知：顶部共享占位符 + 多情景卡片（语音/LED）
 */
import React, { useRef } from 'react';
import { Checkbox, Input } from 'antd';
import { PLACEHOLDERS, type MessageValue, type SpecMessage } from '../data';

interface Props {
  messages: SpecMessage[];
  values: MessageValue[];
  onChange: (messageId: string, patch: Partial<MessageValue>) => void;
}

type FocusTarget = {
  messageId: string;
  field: 'voiceTemplate' | 'ledTemplate';
  start: number;
  end: number;
};

const ActivityMessageSection: React.FC<Props> = ({ messages, values, onChange }) => {
  const focusRef = useRef<FocusTarget | null>(null);

  const remember = (
    messageId: string,
    field: FocusTarget['field'],
    e: React.SyntheticEvent<HTMLInputElement>,
  ) => {
    const t = e.currentTarget;
    focusRef.current = {
      messageId,
      field,
      start: t.selectionStart ?? t.value.length,
      end: t.selectionEnd ?? t.value.length,
    };
  };

  const insertToken = (token: string) => {
    const f = focusRef.current;
    if (!f) {
      // 无焦点时插入到第一条已启用的语音模板
      const first = messages[0];
      if (!first) return;
      const mv = values.find((x) => x.messageId === first.id);
      if (!mv) return;
      onChange(first.id, { voiceTemplate: `${mv.voiceTemplate}${token}` });
      return;
    }
    const mv = values.find((x) => x.messageId === f.messageId);
    if (!mv) return;
    const cur = mv[f.field] || '';
    const s = Math.min(f.start, cur.length);
    const e = Math.min(f.end, cur.length);
    const next = `${cur.slice(0, s)}${token}${cur.slice(e)}`;
    onChange(f.messageId, { [f.field]: next });
    const pos = s + token.length;
    focusRef.current = { ...f, start: pos, end: pos };
  };

  return (
    <div className="apc-msg-section">
      <div className="apc-group-hd">
        <span className="apc-group-dot" />
        <h4>消息通知配置</h4>
      </div>
      <p className="apc-hint">
        配置本流程触发时的语音与 LED 显示；可用顶部按钮在光标处插入占位符。
      </p>
      <div className="apc-placeholder-box apc-placeholder-shared">
        <div className="apc-placeholder-title">插入占位符（光标处点击按钮）</div>
        <div className="apc-placeholder-btns">
          {PLACEHOLDERS.map((p) => (
            <button key={p.key} type="button" className="apc-ph-btn" onClick={() => insertToken(p.token)}>
              {p.key}
            </button>
          ))}
        </div>
      </div>

      <div className="apc-msg-scenario-list">
        {messages.map((m) => {
          const mv = values.find((x) => x.messageId === m.id);
          if (!mv) return null;
          return (
            <div key={m.id} className="apc-msg-scenario-card">
              <div className="apc-msg-scenario-title">{m.name}</div>
              <div className="apc-msg-row">
                <Checkbox
                  checked={mv.voiceEnabled}
                  onChange={(e) => onChange(m.id, { voiceEnabled: e.target.checked })}
                >
                  是否启用语音
                </Checkbox>
                <Input
                  disabled={!mv.voiceEnabled}
                  value={mv.voiceTemplate}
                  placeholder="语音播报内容"
                  onChange={(e) => onChange(m.id, { voiceTemplate: e.target.value })}
                  onFocus={(e) => remember(m.id, 'voiceTemplate', e)}
                  onSelect={(e) => remember(m.id, 'voiceTemplate', e)}
                  onClick={(e) => remember(m.id, 'voiceTemplate', e)}
                  onKeyUp={(e) => remember(m.id, 'voiceTemplate', e)}
                />
              </div>
              <div className="apc-msg-row">
                <Checkbox
                  checked={mv.ledEnabled}
                  onChange={(e) => onChange(m.id, { ledEnabled: e.target.checked })}
                >
                  是否启用LED
                </Checkbox>
                <Input
                  disabled={!mv.ledEnabled}
                  value={mv.ledTemplate}
                  placeholder="LED 显示内容"
                  onChange={(e) => onChange(m.id, { ledTemplate: e.target.value })}
                  onFocus={(e) => remember(m.id, 'ledTemplate', e)}
                  onSelect={(e) => remember(m.id, 'ledTemplate', e)}
                  onClick={(e) => remember(m.id, 'ledTemplate', e)}
                  onKeyUp={(e) => remember(m.id, 'ledTemplate', e)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityMessageSection;
