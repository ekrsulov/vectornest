import React from 'react';
import { JoinedButtonGroup } from './JoinedButtonGroup';

interface LinecapSelectorProps {
  value: 'butt' | 'round' | 'square';
  onChange: (value: 'butt' | 'round' | 'square') => void;
  title?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export const LinecapSelector: React.FC<LinecapSelectorProps> = ({
  value,
  onChange,
  title: _title = "Stroke Linecap",
  size,
  fullWidth
}) => {
  const linecapOptions: Array<{
    value: 'butt' | 'round' | 'square';
    label: string;
    description: string;
  }> = [
      { value: 'butt', label: 'Butt', description: 'Butt Cap - Flat end exactly at line end' },
      { value: 'square', label: 'Square', description: 'Square Cap - Square end extending beyond line end' },
      { value: 'round', label: 'Round', description: 'Round Cap - Rounded end extending beyond line end' }
    ];

  return (
    <JoinedButtonGroup
      options={linecapOptions}
      value={value}
      onChange={onChange}
      title={_title}
      size={size}
      fullWidth={fullWidth}
    />
  );
};
