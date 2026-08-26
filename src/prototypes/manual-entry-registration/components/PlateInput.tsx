/**
 * 车牌号码编辑框：输入三位及以上自动联想匹配车牌
 */
import React, { useMemo, useRef, useState } from 'react';
import { AutoComplete } from 'antd';
import { searchPlates, isKnownPlate } from '../data';

interface Props {
  value?: string;
  onChange: (plate: string) => void;
  onSelect: (plate: string) => void;
  onQuery: (plate: string) => void;
}

const PlateInput: React.FC<Props> = ({ value, onChange, onSelect, onQuery }) => {
  const [open, setOpen] = useState(false);
  const selectingRef = useRef(false);

  const options = useMemo(() => {
    const key = (value || '').trim();
    if (key.length < 3) return [];
    return searchPlates(key).map((plate) => ({ value: plate, label: plate }));
  }, [value]);

  const tryQuery = (plate: string) => {
    const key = plate.trim();
    if (key.length < 3 || !isKnownPlate(key)) return;
    onQuery(key);
  };

  return (
    <div className="mer-plate-input mer-ufield-req">
      <span className="mer-ufield-label">车牌号码</span>
      <AutoComplete
        className="mer-plate-ac"
        value={value}
        open={open && options.length > 0}
        options={options}
        placeholder="请输入车牌，三位起自动联想"
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            if (selectingRef.current) {
              selectingRef.current = false;
              return;
            }
            tryQuery(value || '');
          }, 150);
        }}
        onSearch={(next) => {
          onChange(next.toUpperCase());
          setOpen(next.trim().length >= 3);
        }}
        onSelect={(plate) => {
          selectingRef.current = true;
          onSelect(String(plate));
          setOpen(false);
        }}
        onChange={(next) => onChange(String(next).toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            tryQuery(value || '');
          }
        }}
      />
    </div>
  );
};

export default PlateInput;
